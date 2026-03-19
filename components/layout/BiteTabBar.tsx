'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, BookOpen, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/bite',          icon: Home,        label: 'Today'    },
  { href: '/bite/log',      icon: PlusCircle,  label: 'Log'      },
  { href: '/bite/library',  icon: BookOpen,    label: 'Library'  },
  { href: '/bite/progress', icon: TrendingUp,  label: 'Progress' },
]

export default function BiteTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(247, 246, 243, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTopColor: '#E8E5DE',
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/bite' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-150 active:scale-90',
                active ? 'text-bite' : 'text-ink-tertiary'
              )}
            >
              <Icon
                className={cn('w-[22px] h-[22px]', active && 'stroke-[2.5px]')}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className={cn(
                'text-[10px] leading-tight font-medium',
                active ? 'text-bite' : 'text-ink-tertiary'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
