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
        type: g.category_type || g.type || 'cost_center'
      }))

      set({ groups: normalizedGroups, balances, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createGroup: async (group) => {
    try {
      const { data: ledger } = await supabase.from('ledgers').select('workspace_id').eq('id', group.ledger_id).single()
      
      const payload = {
        ...group,
        workspace_id: ledger?.workspace_id,
        name_en: group.name,
        name_vi: group.name,
        name_ja: group.name,
      }
      delete (payload as any).ledger_id
      delete (payload as any).name

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
          .insert(group)
          .select()
          .single()
        if (lError) throw lError
        set((state) => ({ groups: [...state.groups, { ...lData, name: lData.name }] }))
      } else {
        set((state) => ({ groups: [...state.groups, { ...data, name: data.name_en }] }))
      }
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  updateGroup: async (id, group) => {
    try {
      const payload = {
        ...group,
        name_en: group.name,
        name_vi: group.name,
        name_ja: group.name,
      }
      delete (payload as any).ledger_id
      delete (payload as any).name

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
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...lData, name: lData.name } : g)),
        }))
      } else {
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...data, name: data.name_en } : g)),
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
