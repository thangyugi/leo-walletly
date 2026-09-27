'use client'

import { useEffect } from 'react'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useAccountsStore } from '@/features/accounts/store'
import { useCategoryStore } from '@/features/categories/store'
import { useTagsStore } from '@/features/tags/store'
import { useUserManagementStore } from '@/features/user-management/store'
import { useSettingsStore } from '@/stores/settings'
import { useI18nStore } from '@/features/i18n/store'

/**
 * Loads the open ledger's lookup data (accounts, categories, tags, members)
 * once per ledger and returns it. Categories reload when the language or UI
 * texts change so seeded names follow the selected language.
 */
export function useLedgerData() {
  const ledger = useLedgerStore((s) => s.current)
  const lang = useSettingsStore((s) => s.lang)
  const textsLoaded = useI18nStore((s) => s.loadedKey)
  const accounts = useAccountsStore((s) => s.accounts)
  const accountsLedger = useAccountsStore((s) => s.ledgerId)
  const loadAccounts = useAccountsStore((s) => s.load)
  const categories = useCategoryStore((s) => s.categories)
  const fetchCategories = useCategoryStore((s) => s.fetchCategories)
  const tags = useTagsStore((s) => s.tags)
  const loadTags = useTagsStore((s) => s.load)
  const members = useUserManagementStore((s) => s.members)
  const membersLedger = useUserManagementStore((s) => s.ledgerId)
  const loadMembers = useUserManagementStore((s) => s.load)

  const ledgerId = ledger?.id

  useEffect(() => {
    if (!ledgerId) return
    if (accountsLedger !== ledgerId) void loadAccounts(ledgerId)
    if (membersLedger !== ledgerId) void loadMembers(ledgerId)
    void loadTags(ledgerId)
  }, [ledgerId, accountsLedger, membersLedger, loadAccounts, loadMembers, loadTags])

  useEffect(() => {
    if (ledgerId) void fetchCategories(ledgerId)
  }, [ledgerId, lang, textsLoaded, fetchCategories])

  return { ledger, accounts, categories, tags, members }
}
