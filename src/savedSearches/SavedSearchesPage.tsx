import { useEffect, useState } from 'react'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { ExternalLink } from '../components/Fields'
import type { SavedSearch, SavedSearchFields } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { formatTimestampDate } from '../roles/format'
import { SavedSearchForm } from './SavedSearchForm'

type Mode =
  | { kind: 'view' }
  | { kind: 'add' }
  | { kind: 'edit'; id: string }
  | { kind: 'confirm-delete'; id: string }

/** Your Saved searches, with forms to add, edit and delete them, and to mark them checked. */
export function SavedSearchesPage() {
  const data = useDataLayer()
  const [searches, setSearches] = useState<SavedSearch[] | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'view' })

  useEffect(() => {
    let cancelled = false
    data.listSavedSearches().then((listed) => {
      if (!cancelled) setSearches(listed)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  async function reload() {
    setSearches(await data.listSavedSearches())
    setMode({ kind: 'view' })
  }

  async function add(fields: SavedSearchFields) {
    await data.createSavedSearch(fields)
    await reload()
  }

  async function edit(id: string, fields: SavedSearchFields) {
    await data.updateSavedSearch(id, fields)
    await reload()
  }

  async function remove(id: string) {
    await data.deleteSavedSearch(id)
    await reload()
  }

  async function markChecked(id: string) {
    await data.markSavedSearchChecked(id)
    setSearches(await data.listSavedSearches())
  }

  const cancel = () => setMode({ kind: 'view' })

  return (
    <section aria-labelledby="saved-searches-heading">
      <h2 id="saved-searches-heading">Saved searches</h2>
      {searches === null ? null : searches.length === 0 ? (
        <p>No Saved searches yet. Add the first one below.</p>
      ) : (
        <ul aria-label="Saved searches" className="item-list">
          {searches.map((search) =>
            mode.kind === 'edit' && mode.id === search.id ? (
              <li key={search.id} className="stacked">
                <SavedSearchForm
                  search={search}
                  onSave={(fields) => edit(search.id, fields)}
                  onCancel={cancel}
                />
              </li>
            ) : (
              <li key={search.id} className="stacked">
                <h3>{search.name}</h3>
                {search.site !== null && (
                  <p className="secondary-text">{search.site}</p>
                )}
                {search.link !== null && (
                  <p>
                    <ExternalLink url={search.link} />
                  </p>
                )}
                <p>
                  {search.lastCheckedAt === null
                    ? 'Not checked yet'
                    : `Last checked ${formatTimestampDate(search.lastCheckedAt)}`}
                </p>
                <div className="page-actions">
                  <button
                    type="button"
                    aria-label={`Mark ${search.name} checked`}
                    onClick={() => markChecked(search.id)}
                  >
                    Mark checked
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    aria-label={`Edit ${search.name}`}
                    onClick={() => setMode({ kind: 'edit', id: search.id })}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    aria-label={`Delete ${search.name}`}
                    onClick={() =>
                      setMode({ kind: 'confirm-delete', id: search.id })
                    }
                  >
                    Delete
                  </button>
                </div>
                {mode.kind === 'confirm-delete' && mode.id === search.id && (
                  <ConfirmDelete
                    heading="Delete this Saved search?"
                    onConfirm={() => remove(search.id)}
                    onCancel={cancel}
                  >
                    {search.name} will be deleted. This can’t be undone.
                  </ConfirmDelete>
                )}
              </li>
            ),
          )}
        </ul>
      )}
      {mode.kind === 'add' ? (
        <SavedSearchForm onSave={add} onCancel={cancel} />
      ) : (
        <div className="page-actions">
          <button type="button" onClick={() => setMode({ kind: 'add' })}>
            Add a Saved search
          </button>
        </div>
      )}
    </section>
  )
}
