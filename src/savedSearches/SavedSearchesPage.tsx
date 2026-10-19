import { useEffect, useState } from 'react'
import { EditableListItem } from '../components/EditableListItem'
import { ExternalLink } from '../components/Fields'
import { useEditableList } from '../components/useEditableList'
import type { SavedSearch } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { formatTimestampDate } from '../format'
import { SavedSearchForm } from './SavedSearchForm'

/** Your Saved searches, with forms to add, edit and delete them, and to mark them checked. */
export function SavedSearchesPage() {
  const data = useDataLayer()
  const [searches, setSearches] = useState<SavedSearch[] | null>(null)
  const refresh = async () => setSearches(await data.listSavedSearches())
  const list = useEditableList(refresh)

  useEffect(() => {
    let cancelled = false
    data.listSavedSearches().then((listed) => {
      if (!cancelled) setSearches(listed)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  async function markChecked(id: string) {
    await data.markSavedSearchChecked(id)
    await refresh()
  }

  return (
    <section aria-labelledby="saved-searches-heading">
      <h2 id="saved-searches-heading">Saved searches</h2>
      {searches === null ? null : searches.length === 0 ? (
        <p>No Saved searches yet. Add the first one below.</p>
      ) : (
        <ul aria-label="Saved searches" className="item-list">
          {searches.map((search) => (
            <EditableListItem
              key={search.id}
              list={list}
              id={search.id}
              name={search.name}
              form={
                <SavedSearchForm
                  search={search}
                  onSave={(fields) =>
                    list.save(() => data.updateSavedSearch(search.id, fields))
                  }
                  onCancel={list.cancel}
                />
              }
              deleteHeading="Delete this Saved search?"
              deleteMessage={`${search.name} will be deleted.`}
              onDelete={() => data.deleteSavedSearch(search.id)}
              actions={
                <button
                  type="button"
                  aria-label={`Mark ${search.name} checked`}
                  onClick={() => markChecked(search.id)}
                >
                  Mark checked
                </button>
              }
            >
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
            </EditableListItem>
          ))}
        </ul>
      )}
      {list.adding ? (
        <SavedSearchForm
          onSave={(fields) => list.save(() => data.createSavedSearch(fields))}
          onCancel={list.cancel}
        />
      ) : (
        <div className="page-actions">
          <button type="button" onClick={list.startAdding}>
            Add a Saved search
          </button>
        </div>
      )}
    </section>
  )
}
