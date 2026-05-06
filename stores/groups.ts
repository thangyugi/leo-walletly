'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, CustomGroup, Transaction } from '@/types'
import { DEFAULT_GROUPS } from '@/lib/constants'
import { generateId } from '@/lib/utils'

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

  addGroup: (g: Omit<CustomGroup, 'id'>) => CustomGroup
  updateGroup: (id: string, update: Partial<Omit<CustomGroup, 'id'>>) => void
  removeGroup: (id: string) => void

  assignTransaction: (txnId: string, groupId: string, description: string) => void
  assignByDescription: (description: string, groupId: string, allTxns: Transaction[]) => void
  unassignTransaction: (txnId: string) => void
  unassignByDescription: (description: string, allTxns: Transaction[]) => void

  addKeyword: (groupId: string, keyword: string) => void
  removeKeyword: (groupId: string, keyword: string) => void

  findGroupForDescription: (description: string) => string | null
  /** Resolve effective groupId: explicit assignment > keyword match > category default group */
  resolveGroup: (txnId: string, description: string, category?: Category) => string | null

  getAssignment: (txnId: string) => Assignment | null
}

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      groups: DEFAULT_GROUPS,
      assignments: {},

      addGroup: (g) => {
        const group: CustomGroup = { ...g, id: generateId() }
        set((s) => ({ groups: [...s.groups, group] }))
        return group
      },

      updateGroup: (id, update) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? { ...g, ...update } : g)),
        })),

      removeGroup: (id) =>
        set((s) => {
          const next = { ...s.assignments }
          for (const [txnId, a] of Object.entries(next)) {
            if (a.groupId === id) delete next[txnId]
          }
          return { groups: s.groups.filter((g) => g.id !== id), assignments: next }
        }),

      assignTransaction: (txnId, groupId, description) => {
        const keyword = extractKeyword(description)
        set((s) => {
          const group = s.groups.find((g) => g.id === groupId)
          let updatedGroups = s.groups
          if (group && keyword && !group.keywords.includes(keyword)) {
            updatedGroups = s.groups.map((g) =>
              g.id === groupId ? { ...g, keywords: [...g.keywords, keyword] } : g
            )
          }
          return {
            groups: updatedGroups,
            assignments: { ...s.assignments, [txnId]: { groupId, auto: false } },
          }
        })
      },

      assignByDescription: (description, groupId, allTxns) => {
        const keyword = extractKeyword(description)
        set((s) => {
          const next = { ...s.assignments }
          for (const txn of allTxns) {
            if (txn.description === description) {
              next[txn.id] = { groupId, auto: false }
            }
          }
          const group = s.groups.find((g) => g.id === groupId)
          let updatedGroups = s.groups
          if (group && keyword && !group.keywords.includes(keyword)) {
            updatedGroups = s.groups.map((g) =>
              g.id === groupId ? { ...g, keywords: [...g.keywords, keyword] } : g
            )
          }
          return { groups: updatedGroups, assignments: next }
        })
      },

      unassignTransaction: (txnId) =>
        set((s) => {
          const next = { ...s.assignments }
          delete next[txnId]
          return { assignments: next }
        }),

      unassignByDescription: (description, allTxns) =>
        set((s) => {
          const next = { ...s.assignments }
          for (const txn of allTxns) {
            if (txn.description === description) delete next[txn.id]
          }
          return { assignments: next }
        }),

      addKeyword: (groupId, keyword) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId && !g.keywords.includes(keyword)
              ? { ...g, keywords: [...g.keywords, keyword] }
              : g
          ),
        })),

      removeKeyword: (groupId, keyword) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, keywords: g.keywords.filter((k) => k !== keyword) } : g
          ),
        })),

      findGroupForDescription: (description) => {
        const { groups } = get()
        const norm = normalizeText(description)
        for (const g of groups) {
          if (g.keywords.some((kw) => norm.includes(kw))) return g.id
        }
        return null
      },

      resolveGroup: (txnId, description, category?) => {
        const { assignments, findGroupForDescription, groups } = get()
        const explicit = assignments[txnId]
        if (explicit) return explicit.groupId
        const fromKeyword = findGroupForDescription(description)
        if (fromKeyword) return fromKeyword
        if (category) {
          const defaultGroup = groups.find((g) => g.isDefault && g.categoryKey === category)
          if (defaultGroup) return defaultGroup.id
        }
        return null
      },

      getAssignment: (txnId) => get().assignments[txnId] ?? null,
    }),
    {
      name: 'leo-walletly-groups',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as {
          groups: CustomGroup[]
          assignments: Record<string, Assignment>
        }
        if (version < 2) {
          const existingIds = new Set((state.groups ?? []).map((g) => g.id))
          const missingDefaults = DEFAULT_GROUPS.filter((g) => !existingIds.has(g.id))
          return { ...state, groups: [...missingDefaults, ...(state.groups ?? [])] }
        }
        return state
      },
    }
  )
)
