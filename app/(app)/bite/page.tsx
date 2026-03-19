export const dynamic = 'force-dynamic'

import { getDaySummary } from '@/lib/actions/nutrition'
import BiteClient from './BiteClient'

export default async function BiteTodayPage() {
  const today = new Date().toISOString().split('T')[0]
  const summary = await getDaySummary(today)

  return <BiteClient initialSummary={summary} initialDate={today} />
}
