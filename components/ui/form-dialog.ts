/**
 * Layout of data-entry dialogs (add / edit forms).
 * Phones: a full-screen page that starts at the top — a bottom sheet would be
 * pushed up by the on-screen keyboard and hide its own first fields. Larger
 * screens: a centred dialog.
 */
export const FORM_OVERLAY = 'fixed inset-0 z-[9100] flex items-stretch sm:items-center justify-center p-0 sm:p-4'

export const FORM_PANEL =
  'relative flex flex-col w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-y-auto overscroll-contain ' +
  'bg-[var(--color-bg-surface)] sm:rounded-2xl sm:border border-[var(--color-border-default)] shadow-2xl ' +
  'pt-[env(safe-area-inset-top)] sm:pt-0 animate-sheet-up sm:animate-none'

/** Title row: stays at the top while the form scrolls. */
export const FORM_HEADER =
  'sticky top-0 z-10 flex items-center justify-between gap-2 px-5 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]'
