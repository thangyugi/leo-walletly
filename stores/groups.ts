'use client'

import { create } from 'zustand'
import type { Category, CustomGroup, Transaction, GroupBudget, GroupKeyword } from '@/types'
import { DEFAULT_GROUPS } from '@/lib/constants'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

/** Normalize for keyword matching: fullwidth ASCII → halfwidth, lowercase */
export function normalizeText(s: string): string {
  return s
    .replace(/[Ａ-Ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[／]/g, '/')
    .replace(/[　]/g, ' ')
    .toLowerCase()
    .trim()
}

function extractKeyword(description: string): string {
  const norm = normalizeText(description)
  const parts = norm.split(/[\/\s・｜|,，]+/)
  return (parts.find((p) => p.length >= 3) ?? norm.slice(0, 12)).trim()
}

export interface Assignment {
  groupId: string
  auto: boolean
}

interface GroupsState {
  groups: CustomGroup[]
  assignments: Record<string, Assignment>
  descAssignments: Record<string, Assignment>

  addGroup: (g: Omit<CustomGroup, 'id'>) => CustomGroup
  updateGroup: (id: string, update: Partial<Omit<CustomGroup, 'id'>>) => void
  removeGroup: (id: string) => void

  assignTransaction: (txnId: string, groupId: string, description: string) => void
  assignByDescription: (description: string, groupId: string, allTxns: Transaction[]) => void
  unassignTransaction: (txnId: string) => void
  unassignByDescription: (description: string, allTxns: Transaction[]) => void

  syncGroups: () => Promise<void>
  
  findGroupForDescription: (description: string) => string | null
  /** Resolve effective groupId: explicit assignment > keyword match > category default group */
  resolveGroup: (txnId: string, description: string, category?: Category, txn?: Transaction) => string | null

  getAssignment: (txnId: string) => Assignment | null

  // Budget management
  setBudget: (groupId: string, budget: Omit<GroupBudget, 'id' | 'groupId'>) => Promise<void>
  removeBudget: (budgetId: string) => Promise<void>
  
  // Keyword management (New system)
  addKeyword: (groupId: string, keyword: string) => Promise<void>
  removeKeyword: (keywordId: string) => Promise<void>
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: DEFAULT_GROUPS,
  assignments: {},
  descAssignments: {},

  syncGroups: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch groups
    const { data: dbGroups } = await supabase
      .from('custom_groups')
      .select('*')
      .order('created_at', { ascending: true })

    if (dbGroups) {
      const mapped: CustomGroup[] = dbGroups.map(g => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        color: g.color,
        isDefault: g.is_default,
        categoryKey: g.category_key,
        keywords: g.keywords || [],
        parentId: g.parent_id,
        budgetLimit: g.budget_limit,
        warningThreshold: g.warning_threshold,
      }))
      
      // If no groups in DB, seed defaults
      if (mapped.length === 0) {
        const toSeed = DEFAULT_GROUPS.map(g => ({
          id: g.id,
          user_id: user.id,
          name: g.name,
          emoji: g.emoji,
          color: g.color,
          is_default: g.isDefault,
          category_key: g.categoryKey,
          keywords: g.keywords,
        }))
        await supabase.from('custom_groups').insert(toSeed)
        set({ groups: DEFAULT_GROUPS })
      } else {
        // Merge: DB groups + any defaults not yet in DB (though seeding should cover it)
        const existingIds = new Set(mapped.map(m => m.id))
        const defaults = DEFAULT_GROUPS.filter(d => !existingIds.has(d.id))
        set({ groups: [...defaults, ...mapped] })
      }
    }

    // Fetch assignments
    const { data: dbAssignments } = await supabase
      .from('group_assignments')
      .select('*')

    if (dbAssignments) {
      const assMap: Record<string, Assignment> = {}
      dbAssignments.forEach(a => {
        assMap[a.description] = { groupId: a.group_id, auto: a.is_auto }
      })
      set({ descAssignments: assMap })
    }

    // Fetch Keywords
    const { data: dbKeywords } = await supabase
      .from('group_keywords')
      .select('*')

    // Fetch Budgets
    const { data: dbBudgets } = await supabase
      .from('group_budgets')
      .select('*')

    set((s) => ({
      groups: s.groups.map(g => ({
        ...g,
        keywords_list: dbKeywords?.filter(k => k.group_id === g.id).map(k => ({ id: k.id, groupId: k.group_id, keyword: k.keyword })),
        budgets: dbBudgets?.filter(b => b.group_id === g.id).map(b => ({
          id: b.id,
          groupId: b.group_id,
          amount: Number(b.amount),
          periodType: b.period_type,
          startDay: b.start_day,
          startDate: b.start_date,
          endDate: b.end_date,
          isActive: b.is_active
        }))
      }))
    }))
  },

  addGroup: (g) => {
    const group: CustomGroup = { ...g, id: generateId() }
    set((s) => ({ groups: [...s.groups, group] }))
    
    // Async push to Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('custom_groups').insert({
          id: group.id,
          user_id: user.id,
          name: group.name,
          emoji: group.emoji,
          color: group.color,
          is_default: group.isDefault,
          category_key: group.categoryKey,
          parent_id: group.parentId,
          keywords: group.keywords,
          budget_limit: group.budgetLimit,
          warning_threshold: group.warningThreshold,
        }).then(({ error }) => {
          if (error) console.error('Error syncing group to Supabase:', error)
        })
      }
    })
    
    return group
  },

  updateGroup: (id, update) => {
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...update } : g)),
    }))

    const group = get().groups.find(g => g.id === id)
    if (!group) return

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('custom_groups')
          .upsert({
            id: id,
            user_id: user.id,
            name: update.name ?? group.name,
            emoji: update.emoji ?? group.emoji,
            color: update.color ?? group.color,
            is_default: group.isDefault,
            category_key: group.categoryKey,
            parent_id: update.parentId ?? group.parentId,
            keywords: update.keywords ?? group.keywords,
            budget_limit: update.budgetLimit ?? group.budgetLimit,
            warning_threshold: update.warningThreshold ?? group.warningThreshold,
          })
          .then(({ error }) => {
            if (error) console.error('Error upserting group to Supabase:', error)
          })
      }
    })
  },

  removeGroup: (id) => {
    set((s) => {
      const next = { ...s.assignments }
      for (const [txnId, a] of Object.entries(next)) {
        if (a.groupId === id) delete next[txnId]
      }
      return { groups: s.groups.filter((g) => g.id !== id), assignments: next }
    })

    supabase.from('custom_groups').delete().eq('id', id).then()
  },

  assignTransaction: (txnId, groupId, description) => {
    const keyword = extractKeyword(description)
    set((s) => {
      const group = s.groups.find((g) => g.id === groupId)
      let updatedGroups = s.groups
      if (group && keyword && !group.keywords.includes(keyword)) {
        updatedGroups = s.groups.map((g) =>
          g.id === groupId ? { ...g, keywords: [...g.keywords, keyword] } : g
        )
        // Sync keyword to Supabase
        supabase.from('custom_groups').update({ keywords: [...group.keywords, keyword] }).eq('id', groupId).then()
      }

      // Update the transaction object itself if possible
      try {
        const { useTransactionsStore } = require('./transactions')
        useTransactionsStore.getState().updateTransaction(txnId, { groupId })
      } catch (e) {}

      return {
        groups: updatedGroups,
        assignments: { ...s.assignments, [txnId]: { groupId, auto: false } },
      }
    })
    
    // Assignments in DB are description-based to persist across imports
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('group_assignments').upsert({
          user_id: user.id,
          description: description,
          group_id: groupId,
          is_auto: false
        }).then()
      }
    })
  },

  assignByDescription: (description, groupId, allTxns) => {
    const keyword = extractKeyword(description)
    set((s) => {
      const next = { ...s.assignments }
      const firstTxn = allTxns.find(txn => txn.description === description)
      const oldGroupId = firstTxn ? (s.assignments[firstTxn.id]?.groupId ?? null) : null

      for (const txn of allTxns) {
        if (txn.description === description) {
          next[txn.id] = { groupId, auto: false }
          // Update the transaction object itself for consistency
          try {
            const { useTransactionsStore } = require('./transactions')
            useTransactionsStore.getState().updateTransaction(txn.id, { groupId })
          } catch (e) {}
        }
      }

      let updatedGroups = s.groups
      if (oldGroupId && oldGroupId !== groupId && keyword) {
        const oldGroupStillHasKeyword = allTxns.some(txn =>
          txn.description !== description &&
          next[txn.id]?.groupId === oldGroupId &&
          extractKeyword(txn.description) === keyword
        )
        if (!oldGroupStillHasKeyword) {
          updatedGroups = updatedGroups.map((g) =>
            g.id === oldGroupId
              ? { ...g, keywords: g.keywords.filter(k => k !== keyword) }
              : g
          )
          // Sync keywords removal
          const oldG = updatedGroups.find(g => g.id === oldGroupId)
          if (oldG) supabase.from('custom_groups').update({ keywords: oldG.keywords }).eq('id', oldGroupId).then()
        }
      }

      const newGroup = updatedGroups.find((g) => g.id === groupId)
      if (newGroup && keyword && !newGroup.keywords.includes(keyword)) {
        updatedGroups = updatedGroups.map((g) =>
          g.id === groupId ? { ...g, keywords: [...g.keywords, keyword] } : g
        )
        supabase.from('custom_groups').update({ keywords: [...newGroup.keywords, keyword] }).eq('id', groupId).then()
      }

      return { groups: updatedGroups, assignments: next }
    })

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('group_assignments').upsert({
          user_id: user.id,
          description: description,
          group_id: groupId,
          is_auto: false
        }).then()
      }
    })
  },

  unassignTransaction: (txnId) =>
    set((s) => {
      const next = { ...s.assignments }
      delete next[txnId]
      return { assignments: next }
    }),

  unassignByDescription: (description, allTxns) => {
    set((s) => {
      const next = { ...s.assignments }
      for (const txn of allTxns) {
        if (txn.description === description) delete next[txn.id]
      }
      return { assignments: next }
    })
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('group_assignments').delete().eq('user_id', user.id).eq('description', description).then()
      }
    })
  },

  addKeyword: async (groupId, keyword) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('group_keywords').insert({
      user_id: user.id,
      group_id: groupId,
      keyword: keyword
    }).select().single()
    
    if (data) {
      set(s => ({
        groups: s.groups.map(g => g.id === groupId ? {
          ...g,
          keywords_list: [...(g.keywords_list || []), { id: data.id, groupId: data.group_id, keyword: data.keyword }]
        } : g)
      }))
    }
  },

  removeKeyword: async (keywordId) => {
    const { error } = await supabase.from('group_keywords').delete().eq('id', keywordId)
    if (!error) {
      set(s => ({
        groups: s.groups.map(g => ({
          ...g,
          keywords_list: g.keywords_list?.filter(k => k.id !== keywordId)
        }))
      }))
    }
  },

  setBudget: async (groupId, budget) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Deactivate old budgets for this group
    await supabase.from('group_budgets').update({ is_active: false }).eq('group_id', groupId)

    const { data, error } = await supabase.from('group_budgets').insert({
      user_id: user.id,
      group_id: groupId,
      amount: budget.amount,
      period_type: budget.periodType,
      start_day: budget.startDay,
      start_date: budget.startDate,
      end_date: budget.endDate,
      is_active: true
    }).select().single()

    if (data) {
      set(s => ({
        groups: s.groups.map(g => g.id === groupId ? {
          ...g,
          budgets: [...(g.budgets?.map(b => ({ ...b, isActive: false })) || []), {
            id: data.id,
            groupId: data.group_id,
            amount: Number(data.amount),
            periodType: data.period_type,
            startDay: data.start_day,
            startDate: data.start_date,
            endDate: data.end_date,
            isActive: data.is_active
          }]
        } : g)
      }))
    }
  },

  removeBudget: async (budgetId) => {
    const { error } = await supabase.from('group_budgets').delete().eq('id', budgetId)
    if (!error) {
      set(s => ({
        groups: s.groups.map(g => ({
          ...g,
          budgets: g.budgets?.filter(b => b.id !== budgetId)
        }))
      }))
    }
  },

  findGroupForDescription: (description) => {
    const { groups } = get()
    const norm = normalizeText(description)
    for (const g of groups) {
      // Check old static keywords
      if (g.keywords.some((kw) => norm.includes(normalizeText(kw)))) return g.id
      // Check new managed keywords
      if (g.keywords_list?.some((kw) => norm.includes(normalizeText(kw.keyword)))) return g.id
    }
    return null
  },

  resolveGroup: (txnId, description, category?, txn?) => {
    const { assignments, descAssignments, findGroupForDescription, groups } = get()
    
    // 1. Check groupId on the transaction object itself (if provided)
    if (txn?.groupId) return txn.groupId

    // 2. Explicit txnId assignment
    const explicit = assignments[txnId]
    if (explicit) return explicit.groupId
    
    // 3. Explicit description assignment (from Supabase)
    const descMatch = descAssignments[description]
    if (descMatch) return descMatch.groupId

    // 4. Keyword match
    const fromKeyword = findGroupForDescription(description)
    if (fromKeyword) return fromKeyword
    
    // 5. Category default
    if (category) {
      const defaultGroup = groups.find((g) => g.isDefault && g.categoryKey === category)
      if (defaultGroup) return defaultGroup.id
    }
    return null
  },

  getAssignment: (txnId) => get().assignments[txnId] ?? null,
}))
