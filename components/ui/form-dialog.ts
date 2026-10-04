/**
 * Layout of data-entry dialogs (add / edit forms).
 * Phones: a tall sheet with rounded top corners and a grab handle, anchored a
 * little below the top edge (not at the bottom — a bottom sheet would be pushed
 * up by the on-screen keyboard and hide its own first fields). Drag the title
 * row down to close (useSwipeToClose). Larger screens: a centred dialog.
 */
export const FORM_OVERLAY =
  'fixed inset-0 z-[9100] flex items-stretch sm:items-center justify-center p-0 pt-[max(12px,env(safe-area-inset-top))] sm:p-4'

export const FORM_PANEL =
  'relative flex flex-col w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto overscroll-contain ' +
  'bg-[var(--color-bg-surface)] rounded-t-[22px] sm:rounded-2xl sm:border border-[var(--color-border-default)] shadow-2xl ' +
  'animate-sheet-up sm:animate-none'

/** Title row: stays at the top while the form scrolls; on phones it is also the grab area. */
export const FORM_HEADER =
  'sticky top-0 z-10 flex items-center justify-between gap-2 px-5 pt-6 sm:pt-4 pb-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]'
