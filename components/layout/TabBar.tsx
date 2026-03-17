'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Camera, Sparkles, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/',           icon: Home,     label: 'Home'       },
  { href: '/collection', icon: BookOpen, label: 'Collection' },
  { href: '/scan',       icon: Camera,   label: 'Scan',       center: true },
  { href: '/profile',    icon: Sparkles, label: 'Palate'     },
  { href: '/shelf',      icon: Store,    label: 'Shelf'      },
]

export default function TabBar() {
  const pathname = usePathname()

  return (
    <nav className="tab-bar">
      <div className="flex items-center justify-around h-[72px] px-2">
        {tabs.map((tab) => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href)

          if (tab.center) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                {/* Elevated scan button */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center shadow-wine transition-all duration-150 active:scale-90',
                    isActive
                      ? 'gradient-wine shadow-lg'
                      : 'gradient-wine opacity-90'
                  )}
                >
                  <tab.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-medium text-text-secondary mt-1">
                  {tab.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 rounded-xl transition-colors duration-150 active:bg-bg-elevated',
                'select-none'
              )}
            >
              <tab.icon
                className={cn(
                  'w-6 h-6 transition-colors duration-150',
                  isActive ? 'text-wine-light' : 'text-text-tertiary'
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors duration-150',
                  isActive ? 'text-wine-light' : 'text-text-tertiary'
                )}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
