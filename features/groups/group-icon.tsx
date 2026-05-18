import * as React from 'react'
import { Folder, Wallet, Pizza, Home, Car, Lightbulb, ShoppingBag, Gamepad, Pill, Book, Building, Plane, Gift, Smartphone, Shirt, Wrench } from 'lucide-react'

const LUCIDE_ICONS: Record<string, React.ElementType> = {
  Folder, Wallet, Pizza, Home, Car, Lightbulb, ShoppingBag, Gamepad, Pill, Book, Building, Plane, Gift, Smartphone, Shirt, Wrench
}

export const PRESET_ICONS = Object.keys(LUCIDE_ICONS)

export function GroupIcon({ name, className }: { name: string; className?: string }) {
  const Icon = LUCIDE_ICONS[name]
  if (!Icon) {
    // Fallback if it's an old emoji
    return <span className={className} style={{ display: 'inline-block', lineHeight: 1 }}>{name || '📁'}</span>
  }
  return <Icon className={className} />
}
