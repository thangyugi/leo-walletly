import * as React from 'react'
import {
  // Original 16
  Folder, Wallet, Pizza, Home, Car, Lightbulb, ShoppingBag, Gamepad,
  Pill, Book, Building, Plane, Gift, Smartphone, Shirt, Wrench,
  // Added 32 more
  Coffee, Utensils, Music, Camera, Dumbbell, Heart, Star, Globe,
  Train, Bike, Bus, Ship, Hotel, MapPin, TreePine, Sun,
  Baby, PawPrint, Scissors, Hammer, Zap, Wifi, Monitor, Tv,
  CreditCard, PiggyBank, TrendingUp, BarChart3, ShoppingCart, Package, Box, Briefcase,
} from 'lucide-react'

const LUCIDE_ICONS: Record<string, React.ElementType> = {
  // Living & Food
  Folder, Wallet, Pizza, Home, Car, Lightbulb, ShoppingBag, Gamepad,
  Pill, Book, Building, Plane, Gift, Smartphone, Shirt, Wrench,
  // Extended set
  Coffee, Utensils, Music, Camera, Dumbbell, Heart, Star, Globe,
  Train, Bike, Bus, Ship, Hotel, MapPin, TreePine, Sun,
  Baby, PawPrint, Scissors, Hammer, Zap, Wifi, Monitor, Tv,
  CreditCard, PiggyBank, TrendingUp, BarChart3, ShoppingCart, Package, Box, Briefcase,
}

export const PRESET_ICONS = Object.keys(LUCIDE_ICONS)

export function CategoryIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = LUCIDE_ICONS[name]
  if (!Icon) {
    return <span className={className} style={{ display: 'inline-block', lineHeight: 1, ...style }}>{name || '📁'}</span>
  }
  return <Icon className={className} style={style} />
}

// Compatibility alias for legacy imports
export const GroupIcon = CategoryIcon
