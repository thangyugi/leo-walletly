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
      const { data: groups, error: gError } = await supabase
        .from('groups')
        .select('*')
        .eq('ledger_id', ledgerId)
        .order('name')

      if (gError) throw gError

      const { data: balances, error: bError } = await supabase
        .from('group_balances')
        .select('*')
        .eq('ledger_id', ledgerId)

      if (bError) throw bError

      set({ groups: groups || [], balances: balances || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createGroup: async (group) => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert(group)
        .select()
        .single()

      if (error) throw error
      set((state) => ({ groups: [...state.groups, data] }))
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  updateGroup: async (id, group) => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .update(group)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        groups: state.groups.map((g) => (g.id === id ? data : g)),
      }))
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  deleteGroup: async (id) => {
    try {
      const { error } = await supabase.from('groups').delete().eq('id', id)
      if (error) throw error
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
      }))
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },
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
