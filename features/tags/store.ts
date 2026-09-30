'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface Tag {
  id: string
  name: string
  color: string | null
}

interface TagsState {
  tags: Tag[]
  load: (ledgerId: string) => Promise<void>
  ensure: (ledgerId: string, name: string) => Promise<Tag>
}

export const useTagsStore = create<TagsState>((set, get) => ({
  tags: [],

  load: async (ledgerId) => {
    const { data } = await supabase.from('tags').select('id, name, color').eq('ledger_id', ledgerId).is('deleted_at', null).order('name')
    set({ tags: data ?? [] })
  },

  ensure: async (ledgerId, name) => {
    const clean = name.trim()
    const existing = get().tags.find((t) => t.name.toLowerCase() === clean.toLowerCase())
    if (existing) return existing
    const { data, error } = await supabase.from('tags').insert({ ledger_id: ledgerId, name: clean }).select('id, name, color').single()
    if (error) throw new Error(error.message)
    set((s) => ({ tags: [...s.tags, data].sort((a, b) => a.name.localeCompare(b.name)) }))
    return data
  },
}))
