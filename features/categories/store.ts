import { create } from 'zustand'
import { Category, CategoryTreeNode, CategoryBalance } from './types'
import { supabase } from '@/lib/supabase'

// ─── Vietnamese/CJK diacritic stripper for acronym generation ───────────────
function stripDiacritics(str: string): string {
  return str
    .replace(/[àáâãäåāăą]/gi, 'a')
    .replace(/[èéêëēĕęě]/gi, 'e')
    .replace(/[ìíîïīĭįı]/gi, 'i')
    .replace(/[òóôõöōŏő]/gi, 'o')
    .replace(/[ùúûüūŭůű]/gi, 'u')
    .replace(/[ýÿ]/gi, 'y')
    .replace(/[ñ]/gi, 'n')
    .replace(/[çć]/gi, 'c')
    .replace(/[đ]/gi, 'd')
    .replace(/[Đ]/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Extract 2-uppercase-letter acronym from a display name */
export function extractNameAcronym(name: string): string {
  const clean = stripDiacritics(name).replace(/[^a-zA-Z0-9\s]/g, '').trim()
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase().padEnd(2, 'X')
}

/** Strip trailing digits from a category code to get its letter prefix */
function getLetterPrefix(code: string): string {
  return code.replace(/\d+$/, '')
}

/**
 * Generate a unique category_code based on depth + name.
 * Format:
 *   depth 0 (root):      {2-letter-acronym}{6 digits}     → MS000001
 *   depth 1:             {parent-letters}{2-acronym}{4 digits} → MSDC0001
 *   depth 2:             {parent-letters}{2-acronym}{2 digits} → MSDCCP01
 *   depth 3+ (deepest):  {parent-6-letters}{2 digits}      → MSDCCP01
 *
 * All codes are exactly 8 characters.
 */
export function generateCategoryCode(
  name: string,
  depth: number,
  parentCode: string | undefined,
  existingCodes: Set<string>,
): string {
  const acronym = extractNameAcronym(name)
  const parentLetters = parentCode ? getLetterPrefix(parentCode) : ''

  if (depth === 0) {
    // acronym(2) + digits(6) = 8 chars
    for (let i = 1; i <= 999999; i++) {
      const c = `${acronym}${String(i).padStart(6, '0')}`
      if (!existingCodes.has(c)) return c
    }
  } else if (depth === 1) {
    // parent_letters(2) + acronym(2) + digits(4) = 8 chars
    const prefix = parentLetters.slice(0, 2)
    for (let i = 1; i <= 9999; i++) {
      const c = `${prefix}${acronym}${String(i).padStart(4, '0')}`
      if (!existingCodes.has(c)) return c
    }
  } else if (depth === 2) {
    // parent_letters(4) + acronym(2) + digits(2) = 8 chars
    const prefix = parentLetters.slice(0, 4)
    for (let i = 1; i <= 99; i++) {
      const c = `${prefix}${acronym}${String(i).padStart(2, '0')}`
      if (!existingCodes.has(c)) return c
    }
  } else {
    // depth 3+: parent_letters(6) + digits(2) = 8 chars
    const prefix = parentLetters.slice(0, 6)
    for (let i = 1; i <= 99; i++) {
      const c = `${prefix}${String(i).padStart(2, '0')}`
      if (!existingCodes.has(c)) return c
    }
  }
  // Fallback: always 8 chars
  return `${(acronym + parentLetters).slice(0, 6)}${String(Date.now()).slice(-2)}`
}

// ─── Path helpers ────────────────────────────────────────────────────────────

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

// ─── Normalizer: raw DB row → Category ──────────────────────────────────────

function normalizeCategory(g: any, rawCategories: any[]): Category {
  const code = g.category_code || g.metadata?.category_code || ''
  let cleanPath = g.path || g.metadata?.path || ''

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
    // Direct columns take priority, fall back to metadata for legacy rows
    budget_limit: g.budget_limit ?? g.metadata?.budget_limit ?? 0,
    keywords: Array.isArray(g.keywords) && g.keywords.length > 0
      ? g.keywords
      : (g.metadata?.keywords ?? []),
    is_shared:    g.is_shared    ?? g.metadata?.is_shared    ?? false,
    is_recurring: g.is_recurring ?? g.metadata?.is_recurring ?? false,
    categoryCode: code,
    path: cleanPath,
  }
}

// ─── Store definition ────────────────────────────────────────────────────────

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
      const { data: ledgerRow } = await supabase
        .from('ledgers')
        .select('workspace_id')
        .eq('id', ledgerId)
        .single()

      const { data: categories, error: gError } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', ledgerRow?.workspace_id)
        .order('sort_order')

      if (gError) throw gError

      const rawCategories = categories || []
      const normalizedCategories = rawCategories.map(g => normalizeCategory(g, rawCategories))

      // Fetch balances from category_balances view
      let balances: CategoryBalance[] = []
      try {
        const { data: bData, error: bError } = await supabase
          .from('category_balances')
          .select('*')
          .eq('ledger_id', ledgerId)
        if (!bError && bData) balances = bData
      } catch {
        // View may not exist yet on older deployments — safe to ignore
      }

      set({ categories: normalizedCategories, balances, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createCategory: async (category) => {
    try {
      const { data: ledger } = await supabase
        .from('ledgers')
        .select('workspace_id')
        .eq('id', category.ledger_id)
        .single()

      const newId = crypto.randomUUID()
      const allCategories = get().categories
      const allCodes = new Set(allCategories.map(g => g.categoryCode || g.metadata?.category_code || '').filter(Boolean))

      let depth = 0
      let parentCode: string | undefined
      let parentPath = ''

      if (category.parent_id) {
        const parentCategory = allCategories.find(g => g.id === category.parent_id)
        if (parentCategory) {
          parentCode = parentCategory.categoryCode || parentCategory.metadata?.category_code
          parentPath = getCleanCategoryPath(parentCategory, allCategories)
          depth = getCategoryDepth(parentCategory, allCategories)

          if (depth >= 4) {
            throw new Error('Không thể tạo thêm danh mục con. Hệ thống chỉ cho phép tối đa 4 tầng danh mục.')
          }
        }
      }

      const newCode = generateCategoryCode(category.name || '', depth, parentCode, allCodes)
      const pathStr = parentPath ? `${parentPath}/${newCode}` : `/${newCode}`

      const siblings = allCategories.filter(g => g.parent_id === (category.parent_id || null))
      const maxSortOrder = siblings.reduce((max, s) => Math.max(max, s.sort_order || 0), -1)

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
        sort_order: maxSortOrder + 1,
        is_active: true,
        // Direct columns
        budget_limit: category.budget_limit ?? 0,
        keywords: category.keywords ?? [],
        is_shared: category.is_shared ?? false,
        is_recurring: category.is_recurring ?? false,
        metadata: {
          // Keep metadata in sync for any legacy readers
          budget_limit: category.budget_limit ?? 0,
          keywords: category.keywords ?? [],
          is_shared: category.is_shared ?? false,
          is_recurring: category.is_recurring ?? false,
          category_code: newCode,
          path: pathStr,
          ...(category.metadata || {}),
        },
      }

      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      const norm = normalizeCategory(data, [...get().categories, data])
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

      let newPath = existing.path || ''
      const code = existing.categoryCode || ''

      if (parentId !== existing.parent_id) {
        let parentPath = ''
        if (parentId) {
          const parentCategory = allCategories.find(g => g.id === parentId)
          if (parentCategory) {
            parentPath = getCleanCategoryPath(parentCategory, allCategories)
            const parentDepth = getCategoryDepth(parentCategory, allCategories)
            const subtreeHeight = getSubtreeHeight(existing, allCategories)
            if (parentDepth + subtreeHeight > 4) {
              throw new Error('Không thể di chuyển danh mục. Sẽ vượt quá giới hạn 4 tầng.')
            }
          }
        }
        newPath = parentPath ? `${parentPath}/${code}` : `/${code}`
      }

      const currentMetadata = existing.metadata || {}
      // Resolve updated values, preferring explicit update over existing
      const budgetLimit = 'budget_limit' in category ? (category.budget_limit ?? 0) : existing.budget_limit
      const keywords    = 'keywords'     in category ? (category.keywords    ?? []) : existing.keywords
      const isShared    = 'is_shared'    in category ? (category.is_shared   ?? false) : existing.is_shared
      const isRecurring = 'is_recurring' in category ? (category.is_recurring ?? false) : existing.is_recurring

      const mergedMetadata = {
        ...currentMetadata,
        budget_limit: budgetLimit,
        keywords,
        is_shared: isShared,
        is_recurring: isRecurring,
        category_code: code,
        path: newPath,
        ...(category.metadata || {}),
      }

      const payload: any = {
        metadata: mergedMetadata,
        budget_limit: budgetLimit,
        keywords,
        is_shared: isShared,
        is_recurring: isRecurring,
      }

      if (hasParentIdUpdate) payload.parent_id = parentId
      if ('name' in category) {
        payload.name_en = category.name
        payload.name_vi = category.name
        payload.name_ja = category.name
      }
      if ('type' in category) payload.category_type = category.type
      if ('color' in category) payload.color = category.color
      if ('emoji' in category) payload.emoji = category.emoji
      if (newPath !== existing.path) payload.path = newPath

      const { data, error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const norm = normalizeCategory(data, allCategories)

      // Cascade path update to descendants
      let updatedDescendants: Category[] = []
      if (newPath !== existing.path) {
        const descendants = allCategories.filter(c => c.path && c.path.startsWith((existing.path || '') + '/'))
        for (const desc of descendants) {
          const relativePart = desc.path!.substring(existing.path!.length)
          const descNewPath = newPath + relativePart
          await supabase
            .from('categories')
            .update({ path: descNewPath, metadata: { ...desc.metadata, path: descNewPath } })
            .eq('id', desc.id)
          updatedDescendants.push({ ...desc, path: descNewPath, metadata: { ...desc.metadata, path: descNewPath } })
        }
      }

      set((state) => ({
        categories: state.categories.map((g) => {
          if (g.id === id) return norm
          const matchDesc = updatedDescendants.find(d => d.id === g.id)
          return matchDesc ?? g
        }),
      }))
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  deleteCategory: async (id) => {
    try {
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
      { name: 'Food & Drinks', emoji: 'Pizza',       color: '#f97316', type: 'cost_center' },
      { name: 'Shopping',      emoji: 'ShoppingBag', color: '#ec4899', type: 'cost_center' },
      { name: 'Transport',     emoji: 'Car',         color: '#3b82f6', type: 'cost_center' },
      { name: 'Housing',       emoji: 'Home',        color: '#6366f1', type: 'cost_center' },
      { name: 'Health',        emoji: 'Pill',        color: '#ef4444', type: 'cost_center' },
      { name: 'Entertainment', emoji: 'Gamepad',     color: '#8b5cf6', type: 'cost_center' },
    ]

    const existingCodes = new Set(get().categories.map(g => g.categoryCode || '').filter(Boolean))

    const payload = defaults.map((d, index) => {
      const code = generateCategoryCode(d.name, 0, undefined, existingCodes)
      existingCodes.add(code)
      const path = `/${code}`
      return {
        workspace_id: ledger.workspace_id,
        name_en: d.name, name_vi: d.name, name_ja: d.name,
        emoji: d.emoji, color: d.color,
        category_type: d.type,
        category_code: code, path,
        sort_order: index,
        is_active: true,
        budget_limit: 0,
        keywords: [d.name.toLowerCase()],
        is_shared: false,
        is_recurring: false,
        metadata: { budget_limit: 0, keywords: [d.name.toLowerCase()], category_code: code, path },
      }
    })

    try {
      const { error } = await supabase.from('categories').insert(payload)
      if (error) throw error
      await get().fetchCategories(ledgerId)
    } catch (err: any) {
      set({ error: err.message })
    }
  },
}))

// ─── Tree builder ────────────────────────────────────────────────────────────

export function buildCategoryTree(categories: Category[], parentId: string | null = null, depth = 0): CategoryTreeNode[] {
  return categories
    .filter((g) => g.parent_id === parentId)
    .map((g) => ({
      ...g,
      depth,
      children: buildCategoryTree(categories, g.id, depth + 1),
    }))
}

// ─── Compatibility aliases ────────────────────────────────────────────────────

export const useGroupStore = () => {
  const store = useCategoryStore()
  return {
    groups:           store.categories,
    balances:         store.balances,
    isLoading:        store.isLoading,
    error:            store.error,
    selectedGroupId:  store.selectedCategoryId,
    setSelectedGroupId: store.setSelectedCategoryId,
    fetchGroups:      store.fetchCategories,
    createGroup:      store.createCategory,
    updateGroup:      store.updateCategory,
    deleteGroup:      store.deleteCategory,
    seedGroups:       store.seedCategories,
  }
}

export function buildGroupTree(groups: Category[], parentId: string | null = null, depth = 0): CategoryTreeNode[] {
  return buildCategoryTree(groups, parentId, depth)
}
