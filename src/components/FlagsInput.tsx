import { useId, useState, type KeyboardEvent } from 'react'
import { sameFlag } from '../data/dataLayer'

/** Edits a list of Flags, suggesting Flags used before. */
export function FlagsInput({
  flags,
  suggestions,
  hint,
  onChange,
}: {
  flags: string[]
  suggestions: string[]
  hint: string
  onChange: (flags: string[]) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const offered = suggestions.filter(
    (suggestion) => !flags.some((flag) => sameFlag(flag, suggestion)),
  )

  function add() {
    const flag = draft.trim()
    if (flag && !flags.some((existing) => sameFlag(existing, flag))) {
      onChange([...flags, flag])
    }
    setDraft('')
  }

  function addOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      // Enter adds the Flag rather than submitting the form.
      event.preventDefault()
      add()
    }
  }

  return (
    <fieldset className="flags-input">
      <legend>Flags</legend>
      {flags.length > 0 && (
        <ul className="flag-chips">
          {flags.map((flag) => (
            <li key={flag}>
              {flag}
              <button
                type="button"
                className="secondary"
                aria-label={`Remove Flag ${flag}`}
                onClick={() => onChange(flags.filter((f) => f !== flag))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="form-row">
        <label htmlFor={`${id}-input`}>Add a Flag</label>
        <div className="flag-add">
          <input
            id={`${id}-input`}
            list={`${id}-suggestions`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={addOnEnter}
            aria-describedby={`${id}-hint`}
          />
          <button type="button" className="secondary" onClick={add}>
            Add Flag
          </button>
        </div>
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      </div>
      <datalist id={`${id}-suggestions`}>
        {offered.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </fieldset>
  )
}
