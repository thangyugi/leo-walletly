import { create } from 'zustand'
import { Group, GroupTreeNode, GroupBalance } from './types'
import { supabase } from '@/lib/supabase'

interface GroupState {
  groups: Group[]
  balances: GroupBalance[]
  isLoading: boolean
  error: string | null
  selectedGroupId: string | null
  
  fetchGroups: (ledgerId: string) => Promise<void>
  setSelectedGroupId: (id: string | null) => void
  createGroup: (group: Partial<Group>) => Promise<void>
  updateGroup: (id: string, group: Partial<Group>) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  seedGroups: (ledgerId: string) => Promise<void>
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  balances: [],
  isLoading: false,
  error: null,
  selectedGroupId: null,

  setSelectedGroupId: (id) => set({ selectedGroupId: id }),

  fetchGroups: async (ledgerId) => {
    set({ isLoading: true, error: null })
    try {
      // Try fetching from 'categories' (V3) first, fallback to 'groups'
      let { data: groups, error: gError } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', (await supabase.from('ledgers').select('workspace_id').eq('id', ledgerId).single()).data?.workspace_id)
        .order('name_en')

      if (gError) {
        // Fallback to legacy 'groups' table
        const { data: legacyGroups, error: lgError } = await supabase
          .from('groups')
          .select('*')
          .eq('ledger_id', ledgerId)
          .order('name')
        
        if (lgError) throw lgError
        groups = legacyGroups
      }

      // Try fetching balances, but don't crash if view is missing
      let balances: any[] = []
      try {
        const { data: bData, error: bError } = await supabase
          .from('group_balances')
          .select('*')
          .eq('ledger_id', ledgerId)
        
        if (!bError) balances = bData || []
      } catch (e) {
        console.warn('group_balances view not found, showing empty balances')
      }

      const normalizedGroups = (groups || []).map(g => ({
        ...g,
        name: g.name_en || g.name_vi || g.name_ja || g.name || 'Unnamed',
        type: g.category_type || g.type || 'cost_center',
        budget_limit: g.metadata?.budget_limit || g.budget_limit || 0,
        keywords: g.metadata?.keywords || g.keywords || [],
        categoryCode: g.metadata?.category_code || g.category_code || '',
      }))

      set({ groups: normalizedGroups, balances, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createGroup: async (group) => {
    try {
      const { data: ledger } = await supabase.from('ledgers').select('workspace_id').eq('id', group.ledger_id).single()
      
      const newId = crypto.randomUUID()
      
      // Determine depth and generate code
      let depth = 0
      let parentCode = ''
      let parentPath = ''
      if (group.parent_id) {
        const parentGroup = get().groups.find(g => g.id === group.parent_id)
        if (parentGroup) {
          parentCode = parentGroup.categoryCode || parentGroup.metadata?.category_code || ''
          parentPath = parentGroup.path || parentGroup.metadata?.path || ''
          depth = parentPath ? parentPath.split('/').filter(Boolean).length : 1
        }
      }

      let newCode = ''
      const allGroups = get().groups
      const allCodes = allGroups.map(g => g.categoryCode || g.metadata?.category_code || '')
      
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

      const siblings = allGroups.filter(g => g.parent_id === (group.parent_id || null))
      const maxSortOrder = siblings.reduce((max, s) => Math.max(max, s.sort_order || 0), -1)
      const newSortOrder = maxSortOrder + 1

      const payload = {
        id: newId,
        workspace_id: ledger?.workspace_id,
        parent_id: group.parent_id || null,
        name_en: group.name,
        name_vi: group.name,
        name_ja: group.name,
        category_type: group.type,
        color: group.color,
        emoji: group.emoji,
        path: pathStr,
        category_code: newCode,
        sort_order: newSortOrder,
        is_active: true,
        metadata: {
          budget_limit: group.budget_limit,
          keywords: group.keywords,
          category_code: newCode,
          path: pathStr,
          ...group.metadata
        }
      }

      // Try categories first
      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select()
        .single()

      if (error) {
        // Fallback to legacy groups
        const { data: lData, error: lError } = await supabase
          .from('groups')
          .insert({ ...group, id: newId })
          .select()
          .single()
        if (lError) throw lError
        const norm = {
          ...lData,
          name: lData.name_en || lData.name || 'Unnamed',
          type: lData.category_type || lData.type || 'cost_center',
          budget_limit: lData.metadata?.budget_limit || lData.budget_limit || 0,
          keywords: lData.metadata?.keywords || lData.keywords || [],
          categoryCode: lData.metadata?.category_code || lData.category_code || '',
          path: lData.path || lData.metadata?.path || '',
        }
        set((state) => ({ groups: [...state.groups, norm] }))
      } else {
        const norm = {
          ...data,
          name: data.name_en || data.name || 'Unnamed',
          type: data.category_type || data.type || 'cost_center',
          budget_limit: data.metadata?.budget_limit || data.budget_limit || 0,
          keywords: data.metadata?.keywords || data.keywords || [],
          categoryCode: data.metadata?.category_code || data.category_code || '',
          path: data.path || data.metadata?.path || '',
        }
        set((state) => ({ groups: [...state.groups, norm] }))
      }
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  updateGroup: async (id, group) => {
    try {
      const payload = {
        parent_id: group.parent_id || null,
        name_en: group.name,
        name_vi: group.name,
        name_ja: group.name,
        category_type: group.type,
        color: group.color,
        emoji: group.emoji,
        metadata: {
          budget_limit: group.budget_limit,
          keywords: group.keywords,
          ...group.metadata
        }
      }

      const { data, error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        const { data: lData, error: lError } = await supabase
          .from('groups')
          .update(group)
          .eq('id', id)
          .select()
          .single()
        if (lError) throw lError
        const norm = {
          ...lData,
          name: lData.name_en || lData.name || 'Unnamed',
          type: lData.category_type || lData.type || 'cost_center',
          budget_limit: lData.metadata?.budget_limit || lData.budget_limit || 0,
          keywords: lData.metadata?.keywords || lData.keywords || [],
          categoryCode: lData.metadata?.category_code || lData.category_code || '',
          path: lData.path || lData.metadata?.path || '',
        }
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? norm : g)),
        }))
      } else {
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
          groups: state.groups.map((g) => (g.id === id ? norm : g)),
        }))
      }
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  deleteGroup: async (id) => {
    try {
      // Try categories first
      const { error } = await supabase.from('categories').delete().eq('id', id)
      
      if (error) {
        // Fallback to groups
        const { error: lError } = await supabase.from('groups').delete().eq('id', id)
        if (lError) throw lError
      }

      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
      }))
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  seedGroups: async (ledgerId) => {
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

    const payload = defaults.map(d => ({
      workspace_id: ledger.workspace_id,
      name_en: d.name,
      name_vi: d.name, // Will need actual translations later
      name_ja: d.name,
      emoji: d.emoji,
      color: d.color,
      category_type: d.type,
      is_active: true
    }))

    try {
      const { error } = await supabase.from('categories').insert(payload)
      if (error) throw error
      await get().fetchGroups(ledgerId)
    } catch (err: any) {
      set({ error: err.message })
    }
  }
}))

/**
 * Utility to transform flat groups into a tree structure
 */
export function buildGroupTree(groups: Group[], parentId: string | null = null, depth = 0): GroupTreeNode[] {
  return groups
    .filter((g) => g.parent_id === parentId)
    .map((g) => ({
      ...g,
      depth,
      children: buildGroupTree(groups, g.id, depth + 1),
    }))
}
