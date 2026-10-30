type MessageProps = {
  title: string
  message: string
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="state-panel" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorPanel({ title, message }: MessageProps) {
  return (
    <div className="banner banner--error" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

export function EmptyPanel({ title, message }: MessageProps) {
  return (
    <div className="state-panel state-panel--empty">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}
