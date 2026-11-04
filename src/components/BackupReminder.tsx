import { useEffect, useState } from 'react'
import { useDataLayer } from '../dataContext'
import { download } from './download'

// Encouraging at every age: an old backup is a nudge, never a warning.
function reminderMessage(days: number | null): string {
  if (days === null) {
    return 'No backup yet. Saving one keeps your search safe if browser storage is ever cleared.'
  }
  if (days === 0) return "Last backup: today. You're all set."
  if (days === 1) return 'Last backup: 1 day ago. Nicely kept.'
  return `Last backup: ${days} days ago. A fresh one only takes a moment.`
}

/** When you last backed up, with a button to export a backup now. */
export function BackupReminder() {
  const data = useDataLayer()
  // Undefined until loaded; null means there hasn't been a backup.
  const [days, setDays] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    data.daysSinceLastBackup().then((loaded) => {
      if (!cancelled) setDays(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  async function exportBackup() {
    const { fileName, json } = await data.exportBackup()
    download(fileName, json, 'application/json')
    setDays(await data.daysSinceLastBackup())
  }

  if (days === undefined) return null
  return (
    <div className="backup-reminder">
      <p>{reminderMessage(days)}</p>
      <button type="button" className="secondary" onClick={exportBackup}>
        Export backup
      </button>
    </div>
  )
}
