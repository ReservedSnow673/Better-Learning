export function ProgressRing({ value, size = 42 }: { value: number; size?: number }) {
  const normalized = Math.max(0, Math.min(100, value))
  const radius = 16
  const circumference = 2 * Math.PI * radius
  return (
    <div className="progress-ring" style={{ width: size, height: size }} aria-label={`${Math.round(normalized)}% complete`} role="img">
      <svg viewBox="0 0 38 38" aria-hidden="true">
        <circle className="progress-ring__track" cx="19" cy="19" r={radius} />
        <circle className="progress-ring__value" cx="19" cy="19" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - normalized / 100)} />
      </svg>
      <span>{Math.round(normalized)}%</span>
    </div>
  )
}
