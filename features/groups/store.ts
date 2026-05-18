import { create } from 'zustand'
import { Category, CategoryTreeNode, CategoryBalance } from './types'
import { supabase } from '@/lib/supabase'

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

      const normalizedCategories = (categories || []).map(g => ({
        ...g,
        name: g.name_en || g.name_vi || g.name_ja || g.name || 'Unnamed',
        type: g.category_type || g.type || 'cost_center',
        budget_limit: g.metadata?.budget_limit || g.budget_limit || 0,
        keywords: g.metadata?.keywords || g.keywords || [],
        categoryCode: g.metadata?.category_code || g.category_code || '',
        path: g.path || g.metadata?.path || '',
      }))

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
          parentPath = parentCategory.path || parentCategory.metadata?.path || ''
          depth = parentPath ? parentPath.split('/').filter(Boolean).length : 1
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
        name: data.name_en || data.name || 'Unnamed',
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
      const payload = {
        parent_id: category.parent_id || null,
        name_en: category.name,
        name_vi: category.name,
        name_ja: category.name,
        category_type: category.type,
        color: category.color,
        emoji: category.emoji,
        metadata: {
          budget_limit: category.budget_limit,
          keywords: category.keywords,
          ...category.metadata
        }
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
        name: data.name_en || data.name || 'Unnamed',
        type: data.category_type || data.type || 'cost_center',
        budget_limit: data.metadata?.budget_limit || data.budget_limit || 0,
        keywords: data.metadata?.keywords || data.keywords || [],
        categoryCode: data.metadata?.category_code || data.category_code || '',
        path: data.path || data.metadata?.path || '',
      }
      set((state) => ({
        categories: state.categories.map((g) => (g.id === id ? norm : g)),
      }))
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

