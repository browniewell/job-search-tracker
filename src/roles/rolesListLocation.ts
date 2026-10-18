import type { To } from 'react-router'

/** Link state from a Roles table row: the list's search, with its filters and sort. */
interface FromRolesList {
  rolesListSearch: string
}

export function fromRolesList(search: string): FromRolesList {
  return { rolesListSearch: search }
}

/** The Roles list as a Role was opened from it, or as it starts. */
export function rolesListPath(state: unknown): To {
  const search =
    typeof state === 'object' &&
    state !== null &&
    'rolesListSearch' in state &&
    typeof state.rolesListSearch === 'string'
      ? state.rolesListSearch
      : ''
  return { pathname: '/', search }
}
