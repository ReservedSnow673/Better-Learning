import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useProvider } from '../context/ProviderContext'
import { db } from '../lib/db'

export function MediaRecovery() {
  const { falKey } = useProvider()
  const pending = useLiveQuery(() => db.mediaJobs.where('status').anyOf('queued', 'running').toArray(), []) ?? []

  useEffect(() => {
    if (!falKey || !pending.length) return
    const timer = window.setTimeout(() => { void import('../lib/media').then(({ pollMediaJob }) => Promise.all(pending.map((job) => pollMediaJob(falKey, job)))) }, 3500)
    return () => window.clearTimeout(timer)
  }, [falKey, pending])
  return null
}
