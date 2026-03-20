import Link from 'next/link'
import { ArrowRight, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/lib/actions/profile'

function getGreetingTime(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function HubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const myProfile = await getMyProfile()

  const displayName = myProfile?.display_name
    ?? user?.email?.split('@')[0]
    ?? 'there'

  // Quick counts — non-blocking
  const [wineRes] = await Promise.all([
    supabase
      .from('tastings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user?.id ?? ''),
  ])
  const wineCount = wineRes.count ?? 0

  return (
    <div className="min-h-screen bg-bg flex flex-col select-none">
      {/* ── Header ── */}
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-5 flex items-center justify-between">
        <div>
          <p className="text-text-tertiary text-xs uppercase tracking-widest font-medium">
            {getGreetingTime()}
          </p>
          <h1 className="font-display text-2xl font-medium text-cream mt-0.5">
            {displayName}
          </h1>
        </div>
        <Link
          href="/settings"
          className="w-9 h-9 rounded-full bg-bg-elevated border border-border flex items-center justify-center active:scale-95 transition-transform"
        >
          <Settings className="w-4 h-4 text-text-tertiary" />
        </Link>
      </header>

      {/* ── Product cards ── */}
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4">

        {/* ── Cellar card ── */}
        <Link href="/cellar" className="flex-1 block">
          <div className="relative rounded-[28px] overflow-hidden h-full min-h-[220px] border border-wine/20 active:scale-[0.98] transition-transform duration-150"
            style={{ background: 'linear-gradient(145deg, #100808 0%, #180A0A 45%, #1C0E0E 100%)' }}>

            {/* decorative orbs */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #8B1A1A 0%, transparent 70%)' }} />
            <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #A52020 0%, transparent 70%)' }} />
            <div className="absolute top-1/2 right-6 -translate-y-1/2 text-[90px] leading-none opacity-10 select-none">
              🍷
            </div>

            {/* content */}
            <div className="relative p-6 h-full flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-wine/20 border border-wine/30 flex items-center justify-center">
                    <span className="text-base leading-none">🍷</span>
                  </div>
                  <span className="text-wine-light/60 text-xs uppercase tracking-widest font-medium">Wine</span>
                </div>
              </div>

              <div className="mt-auto pt-8">
                <h2 className="font-display text-[44px] leading-none font-medium text-cream tracking-tight">
                  Cellar
                </h2>
                <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                  Your personal wine memory
                </p>
                {wineCount > 0 && (
                  <p className="text-text-tertiary text-xs mt-1.5">
                    {wineCount} tasting{wineCount !== 1 ? 's' : ''} in memory
                  </p>
                )}
                <div className="mt-4 inline-flex items-center gap-2 text-wine-light text-sm font-medium group">
                  Open Cellar
                  <ArrowRight className="w-4 h-4 group-active:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* ── Bite card ── */}
        <Link href="/bite" className="flex-1 block">
          <div
            className="relative rounded-[28px] overflow-hidden h-full min-h-[220px] active:scale-[0.98] transition-transform duration-150"
            style={{ background: 'linear-gradient(145deg, #F4F1EB 0%, #EAE5DC 100%)', border: '1px solid #DDD8CE' }}
          >
            {/* Subtle warm glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }} />
            <div className="absolute top-1/2 right-5 -translate-y-1/2 text-[88px] leading-none opacity-[0.12] select-none">
              🍏
            </div>

            {/* content */}
            <div className="relative p-6 h-full flex flex-col justify-between">
              {/* App icon mark */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #12C78A 0%, #059669 100%)' }}
                  >
                    {/* Simple fork/leaf SVG mark */}
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="11" cy="11" r="4.5" stroke="white" strokeWidth="2" fill="none" />
                      <circle cx="11" cy="11" r="1.5" fill="white" />
                      <line x1="11" y1="3" x2="11" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      <line x1="11" y1="16" x2="11" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      <line x1="3" y1="11" x2="6" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      <line x1="16" y1="11" x2="19" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#6B7968' }}>Nutrition</span>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <h2 className="text-[44px] leading-none font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
                  Bite
                </h2>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: '#5A5A4A' }}>
                  Track every bite, effortlessly
                </p>
                <p className="text-xs mt-1.5" style={{ color: '#8A8A7A' }}>
                  AI · Macros · Goals · Progress
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold group" style={{ color: '#059669' }}>
                  Start tracking
                  <ArrowRight className="w-4 h-4 group-active:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Footer strip ── */}
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] flex items-center justify-center gap-6">
        <p className="text-text-tertiary text-xs">
          Private · AI-assisted · Mobile-first
        </p>
      </div>
    </div>
  )
}
