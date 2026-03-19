import { getMyProfile } from '@/lib/actions/profile'
import ProfileSettings from '@/components/profile/ProfileSettings'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function SettingsPage() {
  const profile = await getMyProfile()

  return (
    <div className="min-h-screen animate-fade-in pb-8">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-bg-elevated border border-border flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4 text-cream" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-medium text-cream tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="px-4">
        <ProfileSettings
          initialDisplayName={profile?.display_name ?? ''}
          initialCellarName={profile?.cellar_name ?? ''}
          email={profile?.email ?? ''}
        />
      </div>
    </div>
  )
}
