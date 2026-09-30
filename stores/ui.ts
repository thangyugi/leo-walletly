'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const today = new Date()

interface UIState {
  // Calendar
  calendarYear: number
  calendarMonth: number
  calendarSelectedDay: string | null
  setCalendarMonth: (year: number, month: number) => void
  setCalendarDay: (day: string | null) => void

  // Groups navigation
  groupsSelectedId: string | null
  setGroupsSelected: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      calendarYear: today.getFullYear(),
      calendarMonth: today.getMonth(),
      calendarSelectedDay: null,
      setCalendarMonth: (year, month) => set({ calendarYear: year, calendarMonth: month, calendarSelectedDay: null }),
      setCalendarDay: (day) => set({ calendarSelectedDay: day }),

      groupsSelectedId: null,
      setGroupsSelected: (id) => set({ groupsSelectedId: id }),
    }),
    { name: 'leo-walletly-ui' }
  )
)
