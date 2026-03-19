import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SmartNavBar from '@/components/layout/SmartNavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Each page manages its own bottom padding via pb-tab-bar or pb-bite-bar */}
      <main className="flex-1 pt-safe">
        {children}
      </main>

      {/* Smart nav: renders Cellar tab bar, Bite tab bar, or nothing (hub) */}
      <SmartNavBar />
    </div>
  )
}
