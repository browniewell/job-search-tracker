import { useState } from 'react'

type Mode =
  | { kind: 'view' }
  | { kind: 'add' }
  | { kind: 'edit'; id: string }
  | { kind: 'confirm-delete'; id: string }

/**
 * Which form an inline-editable list shows: the add form, one item's edit
 * form or delete confirmation, or none. `save` runs an add, edit or delete,
 * then `refresh`es the list and closes the form.
 */
export function useEditableList(refresh: () => Promise<void>) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const cancel = () => setMode({ kind: 'view' })

  return {
    adding: mode.kind === 'add',
    isEditing: (id: string) => mode.kind === 'edit' && mode.id === id,
    isConfirmingDelete: (id: string) =>
      mode.kind === 'confirm-delete' && mode.id === id,
    startAdding: () => setMode({ kind: 'add' }),
    startEditing: (id: string) => setMode({ kind: 'edit', id }),
    startDeleting: (id: string) => setMode({ kind: 'confirm-delete', id }),
    cancel,
    async save(change: () => Promise<unknown>) {
      await change()
      await refresh()
      cancel()
    },
  }
}

export type EditableList = ReturnType<typeof useEditableList>
