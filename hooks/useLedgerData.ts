'use client'

import { useEffect } from 'react'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useAccountsStore } from '@/features/accounts/store'
import { useCategoryStore } from '@/features/categories/store'
import { useTagsStore } from '@/features/tags/store'
import { useUserManagementStore } from '@/features/user-management/store'
import { useSettingsStore } from '@/stores/settings'
import { useI18nStore } from '@/features/i18n/store'
import { useTransactionsStore } from '@/stores/transactions'

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
  const otherAccounts = useAccountsStore((s) => s.others)
  const loadOthers = useAccountsStore((s) => s.loadOthers)
  const revision = useTransactionsStore((s) => s.revision)
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

  // Shared categories can bring in others' transactions (and their accounts' labels).
  useEffect(() => {
    if (ledgerId && revision > 0) void loadOthers(ledgerId)
  }, [ledgerId, revision, loadOthers])

  useEffect(() => {
    if (ledgerId) void fetchCategories(ledgerId)
  }, [ledgerId, lang, textsLoaded, fetchCategories])

  /** Any account a visible transaction points at: yours, or another person's label. */
  const accountOf = (id: string | null | undefined) =>
    id ? accounts.find((a) => a.id === id) ?? otherAccounts.find((a) => a.id === id) : undefined

  return { ledger, accounts, otherAccounts, accountOf, categories, tags, members }
}
