import { useId, useState, type FormEvent } from 'react'
import { FormRow } from './FormRow'

/** The fields of a form's values that are held as text. */
type TextField<V> = {
  [K in keyof V]: V[K] extends string ? K : never
}[keyof V] &
  string

/**
 * State and labelled controls for an edit form. Text controls hold strings;
 * the form turns them into stored fields on save. A failed save shows the
 * data layer's error in `errorMessage`.
 */
export function useEditForm<V extends object>(
  initial: () => V,
  onSave: (values: V) => Promise<void>,
) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const idPrefix = useId()
  const idFor = (field: keyof V & string) => `${idPrefix}-${field}`

  function set<K extends keyof V>(field: K, value: V[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await onSave(values)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const setText = (field: TextField<V>, value: string) =>
    set(field, value as V[TextField<V>])

  const textInput = (
    field: TextField<V>,
    label: string,
    {
      type = 'text',
      hint,
      required = false,
    }: { type?: string; hint?: string; required?: boolean } = {},
  ) => (
    <FormRow id={idFor(field)} label={label} hint={hint}>
      <input
        id={idFor(field)}
        type={type}
        required={required}
        value={values[field] as string}
        onChange={(event) => setText(field, event.target.value)}
        aria-describedby={hint && `${idFor(field)}-hint`}
        {...(type === 'number' ? { min: 0, step: 'any' } : {})}
      />
    </FormRow>
  )

  const textArea = (field: TextField<V>, label: string) => (
    <FormRow id={idFor(field)} label={label}>
      <textarea
        id={idFor(field)}
        rows={4}
        value={values[field] as string}
        onChange={(event) => setText(field, event.target.value)}
      />
    </FormRow>
  )

  const select = (
    field: TextField<V>,
    label: string,
    emptyLabel: string,
    options: Array<[value: string, label: string]>,
  ) => (
    <FormRow id={idFor(field)} label={label}>
      <select
        id={idFor(field)}
        value={values[field] as string}
        onChange={(event) => setText(field, event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </FormRow>
  )

  const errorMessage = error && (
    <p role="alert" className="form-error">
      {error}
    </p>
  )

  return {
    values,
    set,
    idFor,
    submit,
    errorMessage,
    textInput,
    textArea,
    select,
  }
}
