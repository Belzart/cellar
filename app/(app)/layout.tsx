import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TabBar from '@/components/layout/TabBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Main content — padded to account for bottom tab bar */}
      <main className="flex-1 pb-tab-bar pt-safe">
        {children}
      </main>

      {/* Persistent bottom navigation */}
      <TabBar />
    </div>
  )
}
