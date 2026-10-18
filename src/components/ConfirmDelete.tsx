import { useEffect, useRef, type ReactNode } from 'react'

/** An inline delete confirmation that focuses Cancel, the safe choice. */
export function ConfirmDelete({
  heading,
  children,
  onConfirm,
  onCancel,
}: {
  heading: string
  children: ReactNode
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus the safe choice so Enter doesn't delete by accident.
  useEffect(() => cancelRef.current?.focus(), [])

  return (
    <div
      role="alertdialog"
      aria-labelledby="confirm-delete-heading"
      aria-describedby="confirm-delete-description"
      className="confirm"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <h3 id="confirm-delete-heading">{heading}</h3>
      <p id="confirm-delete-description">{children}</p>
      <div className="form-actions">
        <button type="button" className="danger" onClick={onConfirm}>
          Delete
        </button>
        <button
          type="button"
          className="secondary"
          ref={cancelRef}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
