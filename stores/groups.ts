'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomGroup } from '@/types'
import { generateId } from '@/lib/utils'

/** Normalize description for keyword matching.
 * Converts fullwidth ASCII → halfwidth, lowercase */
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

/** Extract a short keyword from a description for auto-matching */
function extractKeyword(description: string): string {
  const norm = normalizeText(description)
  // Split by separators, take first segment with 3+ chars
  const parts = norm.split(/[\/\s・｜|,，]+/)
  const sig = parts.find((p) => p.length >= 3) ?? norm.slice(0, 12)
  return sig.trim()
}

interface Assignment {
  groupId: string
  auto: boolean // true = auto-matched by keyword, false = manually assigned
}

interface GroupsState {
  groups: CustomGroup[]
  assignments: Record<string, Assignment> // txnId → assignment
  addGroup: (g: Omit<CustomGroup, 'id'>) => CustomGroup
  updateGroup: (id: string, update: Partial<Omit<CustomGroup, 'id'>>) => void
  removeGroup: (id: string) => void
  assignTransaction: (txnId: string, groupId: string, description: string) => void
  unassignTransaction: (txnId: string) => void
  addKeyword: (groupId: string, keyword: string) => void
  removeKeyword: (groupId: string, keyword: string) => void
  /** Auto-match: find group by keywords. Returns groupId or null. */
  findGroupForDescription: (description: string) => string | null
  getAssignment: (txnId: string) => Assignment | null
}

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      groups: [],
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
        // Learn keyword for this group
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

      unassignTransaction: (txnId) =>
        set((s) => {
          const next = { ...s.assignments }
          delete next[txnId]
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
            g.id === groupId
              ? { ...g, keywords: g.keywords.filter((k) => k !== keyword) }
              : g
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

      getAssignment: (txnId) => get().assignments[txnId] ?? null,
    }),
    { name: 'leo-walletly-groups' }
  )
)
