import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Ends every delete confirmation's message. */
const cannotBeUndone = 'This can’t be undone.'

/**
 * An inline delete confirmation that focuses Cancel, the safe choice. Its
 * message says what will be deleted, and it adds that this can’t be undone.
 */
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
  // Unique, as a page may hold more than one confirmation.
  const id = useId()

  // Focus the safe choice so Enter doesn't delete by accident.
  useEffect(() => cancelRef.current?.focus(), [])

  return (
    // Escape closes a dialog (ARIA dialog pattern); the rule counts
    // alertdialog as non-interactive.
    // eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions
    <div
      role="alertdialog"
      aria-labelledby={`${id}-heading`}
      aria-describedby={`${id}-description`}
      className="confirm"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <h3 id={`${id}-heading`}>{heading}</h3>
      <p id={`${id}-description`}>
        {children} {cannotBeUndone}
      </p>
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
