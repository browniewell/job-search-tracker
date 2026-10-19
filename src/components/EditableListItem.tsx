import type { ReactNode } from 'react'
import { ConfirmDelete } from './ConfirmDelete'
import type { EditableList } from './useEditableList'

/**
 * One item of an inline-editable list: its edit form while it is being
 * edited, otherwise its view with Edit and Delete buttons (after any
 * `actions` of its own) and, once Delete is pressed, a delete confirmation.
 */
export function EditableListItem({
  list,
  id,
  name,
  form,
  deleteHeading,
  deleteMessage,
  onDelete,
  actions,
  children,
}: {
  list: EditableList
  id: string
  /** How the Edit and Delete buttons name the item. */
  name: string
  form: ReactNode
  deleteHeading: string
  deleteMessage: ReactNode
  onDelete: () => Promise<unknown>
  actions?: ReactNode
  children: ReactNode
}) {
  if (list.isEditing(id)) return <li className="stacked">{form}</li>

  return (
    <li className="stacked">
      {children}
      <div className="page-actions">
        {actions}
        <button
          type="button"
          className="secondary"
          aria-label={`Edit ${name}`}
          onClick={() => list.startEditing(id)}
        >
          Edit
        </button>
        <button
          type="button"
          className="danger"
          aria-label={`Delete ${name}`}
          onClick={() => list.startDeleting(id)}
        >
          Delete
        </button>
      </div>
      {list.isConfirmingDelete(id) && (
        <ConfirmDelete
          heading={deleteHeading}
          onConfirm={() => list.save(onDelete)}
          onCancel={list.cancel}
        >
          {deleteMessage}
        </ConfirmDelete>
      )}
    </li>
  )
}
