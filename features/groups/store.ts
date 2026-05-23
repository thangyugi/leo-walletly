import { create } from 'zustand'
import { Category, CategoryTreeNode, CategoryBalance } from './types'
import { supabase } from '@/lib/supabase'

export function getCleanCategoryPath(category: Category, allCategories: Category[]): string {
  const parts: string[] = [category.categoryCode || category.metadata?.category_code || '']
  let curr = category
  while (curr.parent_id) {
    const parent = allCategories.find(g => g.id === curr.parent_id)
    if (parent) {
      parts.unshift(parent.categoryCode || parent.metadata?.category_code || '')
      curr = parent
    } else {
      break
    }
  }
  return '/' + parts.filter(Boolean).join('/')
}

export function getSubtreeHeight(cat: Category, allCats: Category[]): number {
  const children = allCats.filter(c => c.parent_id === cat.id)
  if (children.length === 0) return 1
  return 1 + Math.max(...children.map(c => getSubtreeHeight(c, allCats)))
}

export function getCategoryDepth(cat: Category, allCats: Category[]): number {
  let depth = 1
  let curr = cat
  while (curr.parent_id) {
    const parent = allCats.find(g => g.id === curr.parent_id)
    if (parent) {
      depth++
      curr = parent
    } else {
      break
    }
  }
  return depth
}

interface CategoryState {
  categories: Category[]
  balances: CategoryBalance[]
  isLoading: boolean
  error: string | null
  selectedCategoryId: string | null
  
  fetchCategories: (ledgerId: string) => Promise<void>
  setSelectedCategoryId: (id: string | null) => void
  createCategory: (category: Partial<Category>) => Promise<void>
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  seedCategories: (ledgerId: string) => Promise<void>
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  balances: [],
  isLoading: false,
  error: null,
  selectedCategoryId: null,

  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),

  fetchCategories: async (ledgerId) => {
    set({ isLoading: true, error: null })
    try {
      // Fetch strictly from 'categories' (V3)
      const { data: categories, error: gError } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', (await supabase.from('ledgers').select('workspace_id').eq('id', ledgerId).single()).data?.workspace_id)
        .order('name_en')

      if (gError) throw gError

      // Fetch balances from category_balances view, or fallback to group_balances
      let balances: any[] = []
      try {
        const { data: bData, error: bError } = await supabase
          .from('category_balances')
          .select('*')
          .eq('ledger_id', ledgerId)
        
        if (bError) throw bError
        balances = bData || []
      } catch (e) {
        // Fallback to legacy group_balances view for backwards compatibility
        try {
          const { data: bData, error: bError } = await supabase
            .from('group_balances')
            .select('*')
            .eq('ledger_id', ledgerId)
          if (!bError) balances = bData || []
        } catch (inner) {
          console.warn('category_balances and group_balances views not found, showing empty balances')
        }
      }

      const rawCategories = categories || []
      const normalizedCategories = rawCategories.map(g => {
        const code = g.category_code || g.metadata?.category_code || ''
        let cleanPath = g.path || g.metadata?.path || ''
        
        // Rebuild clean path recursively if it contains legacy underscores/UUIDs or dashes
        if (cleanPath.includes('_') || cleanPath.includes('-') || !cleanPath.startsWith('/')) {
          const parts: string[] = [code]
          let curr = g
          while (curr.parent_id) {
            const parent = rawCategories.find(p => p.id === curr.parent_id)
            if (parent) {
              parts.unshift(parent.category_code || parent.metadata?.category_code || '')
              curr = parent
            } else {
              break
            }
          }
          cleanPath = '/' + parts.filter(Boolean).join('/')
        }

        return {
          ...g,
          name: g.name_i18n?.en || g.name_en || g.name_vi || g.name_ja || g.name || 'Unnamed',
          type: g.category_type || g.type || 'cost_center',
          budget_limit: g.metadata?.budget_limit || g.budget_limit || 0,
          keywords: g.metadata?.keywords || g.keywords || [],
          categoryCode: code,
          path: cleanPath,
        }
      })

      set({ categories: normalizedCategories, balances, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createCategory: async (category) => {
    try {
      const { data: ledger } = await supabase.from('ledgers').select('workspace_id').eq('id', category.ledger_id).single()
      
      const newId = crypto.randomUUID()
      
      // Determine depth and generate code
      let depth = 0
      let parentCode = ''
      let parentPath = ''
      if (category.parent_id) {
        const parentCategory = get().categories.find(g => g.id === category.parent_id)
        if (parentCategory) {
          parentCode = parentCategory.categoryCode || parentCategory.metadata?.category_code || ''
          parentPath = getCleanCategoryPath(parentCategory, get().categories)
          depth = getCategoryDepth(parentCategory, get().categories)
          
          if (depth >= 4) {
            throw new Error("Không thể tạo thêm danh mục con. Hệ thống chỉ cho phép tối đa 4 tầng danh mục (Nhóm cha > Nhóm con > Cháu > Chắt).")
          }
        }
      }

      let newCode = ''
      const allCategories = get().categories
      const allCodes = allCategories.map(g => g.categoryCode || g.metadata?.category_code || '')
      
      if (depth === 0) {
        // Level 1: A001, A002...
        const l1Codes = allCodes.filter(c => /^A\d{3}$/.test(c))
        const maxNum = l1Codes.reduce((max, c) => Math.max(max, parseInt(c.substring(1))), 0)
        newCode = `A${(maxNum + 1).toString().padStart(3, '0')}`
      } else if (depth === 1) {
        // Level 2: AA01, AB01...
        const prefix = parentCode.charAt(0) || 'A'
        for (let i = 0; i < 26; i++) {
          const char = String.fromCharCode(65 + i)
          const candidate = `${prefix}${char}01`
          if (!allCodes.includes(candidate)) {
            newCode = candidate
            break
          }
        }
        if (!newCode) newCode = `${prefix}Z01` // Fallback
      } else if (depth === 2) {
        // Level 3: AAA1, AAB1...
        const prefix = parentCode.substring(0, 2) || 'AA'
        for (let i = 0; i < 26; i++) {
          const char = String.fromCharCode(65 + i)
          const candidate = `${prefix}${char}1`
          if (!allCodes.includes(candidate)) {
            newCode = candidate
            break
          }
        }
        if (!newCode) newCode = `${prefix}Z1` // Fallback
      } else {
        // Level 4 (and beyond): 0001, 0002...
        const l4Codes = allCodes.filter(c => /^\d{4}$/.test(c))
        const maxNum = l4Codes.reduce((max, c) => Math.max(max, parseInt(c)), 0)
        newCode = (maxNum + 1).toString().padStart(4, '0')
      }

      const pathStr = parentPath ? `${parentPath}/${newCode}` : `/${newCode}`

      const siblings = allCategories.filter(g => g.parent_id === (category.parent_id || null))
      const maxSortOrder = siblings.reduce((max, s) => Math.max(max, s.sort_order || 0), -1)
      const newSortOrder = maxSortOrder + 1

      const payload = {
        id: newId,
        workspace_id: ledger?.workspace_id,
        parent_id: category.parent_id || null,
        name_en: category.name,
        name_vi: category.name,
        name_ja: category.name,
        category_type: category.type,
        color: category.color,
        emoji: category.emoji,
        path: pathStr,
        category_code: newCode,
        sort_order: newSortOrder,
        is_active: true,
        metadata: {
          budget_limit: category.budget_limit,
          keywords: category.keywords,
          category_code: newCode,
          path: pathStr,
          ...category.metadata
        }
      }

      // Strictly insert into categories table
      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      const norm = {
        ...data,
        name: data.name_i18n?.en || data.name_en || data.name || 'Unnamed',
        type: data.category_type || data.type || 'cost_center',
        budget_limit: data.metadata?.budget_limit || data.budget_limit || 0,
        keywords: data.metadata?.keywords || data.keywords || [],
        categoryCode: data.metadata?.category_code || data.category_code || '',
        path: data.path || data.metadata?.path || '',
      }
      set((state) => ({ categories: [...state.categories, norm] }))
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  updateCategory: async (id, category) => {
    try {
      const allCategories = get().categories
      const existing = allCategories.find(g => g.id === id)
      if (!existing) throw new Error('Category not found')

      const hasParentIdUpdate = 'parent_id' in category
      const parentId = hasParentIdUpdate
        ? (category.parent_id === '' || category.parent_id === null ? null : category.parent_id)
        : existing.parent_id
      
      // Calculate new path if parent changed
      let newPath = existing.path || ''
      const code = existing.categoryCode || ''
      
      if (parentId !== existing.parent_id) {
        let parentPath = ''
        if (parentId) {
          const parentCategory = allCategories.find(g => g.id === parentId)
          if (parentCategory) {
            parentPath = getCleanCategoryPath(parentCategory, allCategories)
            const parentDepth = getCategoryDepth(parentCategory, allCategories)
            
            // Calculate subtree height
            const subtreeHeight = getSubtreeHeight(existing, allCategories)
            if (parentDepth + subtreeHeight > 4) {
              throw new Error("Không thể di chuyển danh mục. Việc di chuyển này sẽ làm vượt quá giới hạn tối đa 4 tầng danh mục.")
            }
          }
        }
        newPath = parentPath ? `${parentPath}/${code}` : `/${code}`
      }

      const currentMetadata = existing.metadata || {}
      const budgetLimit = 'budget_limit' in category ? category.budget_limit : (existing.budget_limit ?? currentMetadata.budget_limit)
      const keywords = 'keywords' in category ? category.keywords : (existing.keywords ?? currentMetadata.keywords)
      const meta = category.metadata || {}

      const mergedMetadata = {
        ...currentMetadata,
        budget_limit: budgetLimit,
        keywords: keywords,
        category_code: code,
        path: newPath,
        ...meta
      }

      const payload: any = {
        metadata: mergedMetadata
      }

      if (hasParentIdUpdate) {
        payload.parent_id = parentId
      }
      if ('name' in category) {
        payload.name_en = category.name
        payload.name_vi = category.name
        payload.name_ja = category.name
      }
      if ('type' in category) {
        payload.category_type = category.type
      }
      if ('color' in category) {
        payload.color = category.color
      }
      if ('emoji' in category) {
        payload.emoji = category.emoji
      }
      if (newPath !== existing.path) {
        payload.path = newPath
      }

      // Strictly update categories table
      const { data, error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const norm = {
        ...data,
        name: data.name_i18n?.en || data.name_en || data.name || 'Unnamed',
        type: data.category_type || data.type || 'cost_center',
        budget_limit: data.metadata?.budget_limit || data.budget_limit || 0,
        keywords: data.metadata?.keywords || data.keywords || [],
        categoryCode: data.metadata?.category_code || data.category_code || '',
        path: data.path || data.metadata?.path || '',
      }

      // If path changed, update all descendants in memory and database
      let updatedDescendants: Category[] = []
      if (newPath !== existing.path) {
        const descendants = allCategories.filter(c => c.path && c.path.startsWith(existing.path + '/'))
        for (const desc of descendants) {
          const relativePart = desc.path!.substring(existing.path!.length)
          const descNewPath = newPath + relativePart
          
          await supabase
            .from('categories')
            .update({
              path: descNewPath,
              metadata: {
                ...desc.metadata,
                path: descNewPath
              }
            })
            .eq('id', desc.id)
            
          updatedDescendants.push({
            ...desc,
            path: descNewPath,
            metadata: {
              ...desc.metadata,
              path: descNewPath
            }
          })
        }
      }

      set((state) => {
        const updatedCats = state.categories.map((g) => {
          if (g.id === id) return norm
          const matchDesc = updatedDescendants.find(d => d.id === g.id)
          if (matchDesc) return matchDesc
          return g
        })
        return { categories: updatedCats }
      })
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  deleteCategory: async (id) => {
    try {
      // Strictly delete from categories table
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error

      set((state) => ({
        categories: state.categories.filter((g) => g.id !== id),
        selectedCategoryId: state.selectedCategoryId === id ? null : state.selectedCategoryId,
      }))
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  seedCategories: async (ledgerId) => {
    const { data: ledger } = await supabase.from('ledgers').select('workspace_id').eq('id', ledgerId).single()
    if (!ledger?.workspace_id) return

    const defaults = [
      { name: 'Food & Drinks', emoji: '🍕', color: '#f97316', type: 'cost_center' },
      { name: 'Shopping', emoji: '🛍️', color: '#ec4899', type: 'cost_center' },
      { name: 'Transport', emoji: '🚗', color: '#3b82f6', type: 'cost_center' },
      { name: 'Housing', emoji: '🏠', color: '#6366f1', type: 'cost_center' },
      { name: 'Health', emoji: '💊', color: '#ef4444', type: 'cost_center' },
      { name: 'Entertainment', emoji: '🎮', color: '#8b5cf6', type: 'cost_center' },
    ]

    const payload = defaults.map((d, index) => {
      const code = `A${(index + 1).toString().padStart(3, '0')}`
      const path = `/${code}`
      return {
        workspace_id: ledger.workspace_id,
        name_en: d.name,
        name_vi: d.name,
        name_ja: d.name,
        emoji: d.emoji,
        color: d.color,
        category_type: d.type,
        category_code: code,
        path: path,
        sort_order: index,
        is_active: true,
        metadata: {
          budget_limit: 0,
          keywords: [d.name.toLowerCase()],
          category_code: code,
          path: path
        }
      }
    })

    try {
      const { error } = await supabase.from('categories').insert(payload)
      if (error) throw error
      await get().fetchCategories(ledgerId)
    } catch (err: any) {
      set({ error: err.message })
    }
  }
}))

/**
 * Utility to transform flat categories into a tree structure
 */
export function buildCategoryTree(categories: Category[], parentId: string | null = null, depth = 0): CategoryTreeNode[] {
  return categories
    .filter((g) => g.parent_id === parentId)
    .map((g) => ({
      ...g,
      depth,
      children: buildCategoryTree(categories, g.id, depth + 1),
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPATIBILITY ALIASES: Maps Category concepts to Group terms for UI Layer
// ─────────────────────────────────────────────────────────────────────────────
export const useGroupStore = () => {
  const store = useCategoryStore()
  return {
    groups: store.categories,
    balances: store.balances,
    isLoading: store.isLoading,
    error: store.error,
    selectedGroupId: store.selectedCategoryId,
    setSelectedGroupId: store.setSelectedCategoryId,
    fetchGroups: store.fetchCategories,
    createGroup: store.createCategory,
    updateGroup: store.updateCategory,
    deleteGroup: store.deleteCategory,
    seedGroups: store.seedCategories,
  }
}

export function buildGroupTree(groups: Category[], parentId: string | null = null, depth = 0): CategoryTreeNode[] {
  return buildCategoryTree(groups, parentId, depth)
}

