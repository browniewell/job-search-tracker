import { useEffect, useState } from 'react'
import { useDataLayer } from '../dataContext'

type Pace = { applications: number; dailyTarget: number }

// Encouraging at every count: falling short of the Daily target is never
// shown as a failure.
function paceMessage({ applications, dailyTarget }: Pace): string {
  const cheer =
    applications === 0
      ? 'a fresh start'
      : applications < dailyTarget
        ? 'good going'
        : applications === dailyTarget
          ? 'nice work'
          : 'above and beyond'
  return `${applications} of ${dailyTarget} today, ${cheer}`
}

/**
 * Today's Applications against the Daily target. Counted again whenever
 * `roles` changes, so a page that moves Roles passes them in.
 */
export function DailyPace({ roles }: { roles?: unknown }) {
  const data = useDataLayer()
  const [pace, setPace] = useState<Pace | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([data.countApplicationsToday(), data.getDailyTarget()]).then(
      ([applications, dailyTarget]) => {
        if (!cancelled) setPace({ applications, dailyTarget })
      },
    )
    return () => {
      cancelled = true
    }
  }, [data, roles])

  if (pace === null) return null
  return <p className="daily-pace">{paceMessage(pace)}</p>
}
