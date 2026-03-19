'use client'

import { usePathname } from 'next/navigation'
import TabBar from './TabBar'
import BiteTabBar from './BiteTabBar'

export default function SmartNavBar() {
  const pathname = usePathname()

  // Hub page — no tab bar
  if (pathname === '/') return null

  // Bite app routes
  if (pathname.startsWith('/bite')) return <BiteTabBar />

  // All Cellar / wine routes
  return <TabBar />
}
