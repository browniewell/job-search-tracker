import { useId, useState, type FormEvent } from 'react'

/**
 * A one-field form that adds something by name, shows the data layer's
 * error if it refuses, and clears once added. An `onAdd` that shows errors
 * itself resolves false when nothing was added, keeping the name to fix.
 */
export function AddByNameForm({
  label,
  buttonLabel,
  onAdd,
}: {
  label: string
  buttonLabel: string
  onAdd: (name: string) => Promise<boolean | void>
}) {
  const id = useId()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    try {
      if ((await onAdd(name)) === false) return
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      return
    }
    setError(null)
    setName('')
  }

  return (
    <>
      <form className="add-form" onSubmit={add}>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
        />
        <button type="submit">{buttonLabel}</button>
      </form>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  )
}
