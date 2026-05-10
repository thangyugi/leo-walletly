'use client'

import { motion } from 'framer-motion'
import { Rocket, Construction, Clock } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface ComingSoonProps {
  title: string
  description?: string
  icon?: 'rocket' | 'construction' | 'clock'
}

export function ComingSoon({ 
  title, 
  description,
  icon = 'construction'
}: ComingSoonProps) {
  const { t } = useTranslation()
  
  const Icon = {
    rocket: Rocket,
    construction: Construction,
    clock: Clock
  }[icon]

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-20 h-20 rounded-3xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] flex items-center justify-center mb-6"
      >
        <Icon className="w-10 h-10 text-[var(--color-interactive-primary)]" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h2>
        <p className="text-[var(--color-text-tertiary)] mt-2 max-w-md mx-auto">
          {description || t.placeholders.devSub}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 1 }}
        className="mt-12 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-status-info-bg)] border border-[var(--color-status-info-text)]/20"
      >
        <div className="w-2 h-2 rounded-full bg-[var(--color-status-info-text)] animate-pulse" />
        <span className="text-[10px] font-bold text-[var(--color-status-info-text)] uppercase tracking-widest">
          {t.placeholders.devTitle}
        </span>
      </motion.div>
    </div>
  )
}
