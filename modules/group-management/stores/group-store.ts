import { create } from 'zustand'
import { Group, GroupId, GroupMembership, AsyncState } from '../domain/types'
import { supabase } from '@/lib/supabase'

interface GroupStore {
  groups: Record<GroupId, Group>
  tree: GroupId[] // Root level IDs
  memberships: Record<string, GroupMembership>
  
  status: AsyncState
  error: string | null
  
  selectedGroupId: GroupId | null
  
  // Actions
  fetchGroups: (workspaceId: string) => Promise<void>
  subscribeToGroups: (workspaceId: string) => () => void
  selectGroup: (id: GroupId | null) => void
  
  // Optimistic Actions
  moveGroup: (id: GroupId, newParentId: GroupId | null) => Promise<void>
  updateGroup: (id: GroupId, data: Partial<Group>) => Promise<void>
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: {},
  tree: [],
  memberships: {},
  status: 'idle',
  error: null,
  selectedGroupId: null,

  selectGroup: (id) => set({ selectedGroupId: id }),

  fetchGroups: async (workspaceId) => {
    set({ status: 'loading' })
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('path')

      if (error) throw error

      const groupsMap: Record<GroupId, Group> = {}
      const roots: GroupId[] = []

      data?.forEach((g: any) => {
        groupsMap[g.id] = {
          ...g,
          parentGroupId: g.parent_id,
          organizationId: g.organization_id,
          workspaceId: g.workspace_id,
          groupType: g.group_type,
          reconciliationMode: g.reconciliation_mode,
          currencyPolicy: g.currency_policy,
          createdAt: g.created_at,
          updatedAt: g.updated_at,
        }
        if (!g.parent_id) roots.push(g.id)
      })

      set({ groups: groupsMap, tree: roots, status: 'success' })
    } catch (err: any) {
      set({ status: 'error', error: err.message })
    }
  },

  subscribeToGroups: (workspaceId) => {
    const channel = supabase
      .channel(`groups_realtime_${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            set((state) => {
              const g = newRecord as any
              const updatedGroup: Group = {
                ...g,
                parentGroupId: g.parent_id,
                organizationId: g.organization_id,
                workspaceId: g.workspace_id,
                groupType: g.group_type,
                reconciliationMode: g.reconciliation_mode,
                currencyPolicy: g.currency_policy,
                createdAt: g.created_at,
                updatedAt: g.updated_at,
              }
              
              const nextGroups = { ...state.groups, [g.id]: updatedGroup }
              const nextRoots = (Object.values(nextGroups) as Group[])
                .filter(node => !node.parentGroupId)
                .map(node => node.id)
                
              return { groups: nextGroups, tree: nextRoots }
            })
          } else if (eventType === 'DELETE') {
            set((state) => {
              const { [oldRecord.id]: deleted, ...nextGroups } = state.groups
              const nextRoots = state.tree.filter(id => id !== oldRecord.id)
              return { groups: nextGroups, tree: nextRoots }
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  moveGroup: async (id, newParentId) => {
    const originalGroups = { ...get().groups }
    const group = originalGroups[id]
    if (!group) return

    // Optimistic Update
    set((state) => ({
      groups: {
        ...state.groups,
        [id]: { ...group, parentGroupId: newParentId }
      },
      status: 'syncing'
    }))

    try {
      const { error } = await supabase
        .from('groups')
        .update({ parent_id: newParentId })
        .eq('id', id)

      if (error) throw error
      set({ status: 'success' })
    } catch (err: any) {
      // Rollback
      set({ groups: originalGroups, status: 'error', error: err.message })
    }
  },

  updateGroup: async (id, data) => {
    const originalGroups = { ...get().groups }
    const group = originalGroups[id]
    if (!group) return

    // Optimistic Update
    set((state) => ({
      groups: {
        ...state.groups,
        [id]: { ...group, ...data }
      }
    }))

    try {
      const { error } = await supabase
        .from('groups')
        .update(data as any)
        .eq('id', id)

      if (error) throw error
    } catch (err: any) {
      set({ groups: originalGroups, error: err.message })
    }
  }
}))
