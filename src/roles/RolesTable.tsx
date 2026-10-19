import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  functionalUpdate,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { FlagBadge } from '../components/FlagBadge'
import {
  flagsShownOnRole,
  type Company,
  type Role,
  type ShownFlag,
  type Status,
  type WorkArrangement,
} from '../data/dataLayer'
import { CompanyNotDisclosed } from './CompanyNotDisclosed'
import { formatCalendarDate } from '../format'
import {
  companyNotDisclosed,
  formatPostedSalary,
  workArrangementLabels,
} from './format'
import { fromRolesList } from './rolesListLocation'

/** A Role with what the table shows of its Company and Status. */
interface RoleRow {
  role: Role
  company: Company | undefined
  status: Status | undefined
  flags: ShownFlag[]
}

const features = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
})

const helper = createColumnHelper<typeof features, RoleRow>()

// From on-site to remote, as the labels list them, rather than by name.
const workArrangements = Object.keys(workArrangementLabels) as WorkArrangement[]

// A full-time year, so hourly and yearly Posted salaries compare.
const hoursPerYear = 40 * 52

/** The top of a Role's Posted salary range, per year. */
function yearlyPostedSalary(role: Role): number | undefined {
  const top = role.salaryMax ?? role.salaryMin
  if (top === null) return undefined
  return role.salaryPeriod === 'hourly' ? top * hoursPerYear : top
}

const calendarDateCell = (date: string | undefined) =>
  date && formatCalendarDate(date)

/** The Company filter's value for Roles with no Company linked. */
const noCompany = 'none'

/** Calendar dates, YYYY-MM-DD; either end may be open. */
interface DateRange {
  from: string | null
  to: string | null
}

// Filters match on the Role's stored values, not on what the column sorts by.
// Empty values read as undefined so they sort last in either direction.
// Columns where more is better sort highest first.
const columns = helper.columns([
  helper.accessor((row) => row.role.title, {
    id: 'title',
    header: 'Role title',
    sortFn: 'text',
    cell: ({ row }) => <RoleTitleLink role={row.original.role} />,
  }),
  helper.accessor((row) => row.company?.name, {
    id: 'company',
    header: 'Company',
    sortFn: 'text',
    sortUndefined: 'last',
    filterFn: (row, _columnId, companyId: string) =>
      (row.original.role.companyId ?? noCompany) === companyId,
    cell: ({ row }) => row.original.company?.name ?? <CompanyNotDisclosed />,
  }),
  // Statuses sort in pipeline order, not by name.
  helper.accessor((row) => row.status?.order, {
    id: 'status',
    header: 'Status',
    sortFn: 'basic',
    sortUndefined: 'last',
    filterFn: (row, _columnId, statusId: string) =>
      row.original.role.statusId === statusId,
    cell: ({ row }) => row.original.status?.name,
  }),
  helper.accessor(
    (row) =>
      row.role.workArrangement === null
        ? undefined
        : workArrangements.indexOf(row.role.workArrangement),
    {
      id: 'workArrangement',
      header: 'Work arrangement',
      sortFn: 'basic',
      sortUndefined: 'last',
      filterFn: (row, _columnId, arrangement: WorkArrangement) =>
        row.original.role.workArrangement === arrangement,
      cell: ({ row }) =>
        row.original.role.workArrangement &&
        workArrangementLabels[row.original.role.workArrangement],
    },
  ),
  helper.accessor((row) => yearlyPostedSalary(row.role), {
    id: 'salary',
    header: 'Posted salary',
    sortFn: 'basic',
    sortUndefined: 'last',
    sortDescFirst: true,
    cell: ({ row }) => formatPostedSalary(row.original.role),
  }),
  helper.accessor((row) => row.role.fitRating ?? undefined, {
    id: 'fitRating',
    header: 'Fit rating',
    sortFn: 'basic',
    sortUndefined: 'last',
    sortDescFirst: true,
  }),
  helper.accessor((row) => row.role.postingDate ?? undefined, {
    id: 'postingDate',
    header: 'Posting date',
    sortFn: 'text',
    sortUndefined: 'last',
    // Inclusive; a Role with no Posting date is outside every range.
    filterFn: (row, _columnId, { from, to }: DateRange) => {
      const date = row.original.role.postingDate
      return (
        date !== null &&
        (from === null || date >= from) &&
        (to === null || date <= to)
      )
    },
    cell: ({ getValue }) => calendarDateCell(getValue()),
  }),
  helper.accessor((row) => row.role.nextActionDate ?? undefined, {
    id: 'nextActionDate',
    header: 'Next action date',
    sortFn: 'text',
    sortUndefined: 'last',
    cell: ({ getValue }) => calendarDateCell(getValue()),
  }),
  helper.accessor((row) => row.flags.length || undefined, {
    id: 'flags',
    header: 'Flags',
    sortFn: 'basic',
    sortUndefined: 'last',
    sortDescFirst: true,
    cell: ({ row }) => <FlagBadge flags={row.original.flags} />,
  }),
])

// The table's filters and sort live in the URL's search, so going back to the
// Roles list, or reloading it, shows it as it was left.
const sortParam = 'sort'
const selectFilterParams = ['status', 'company', 'workArrangement']
const postingDateParams = { from: 'postingDateFrom', to: 'postingDateTo' }
const columnIds = new Set(columns.map((column) => column.id))

/** Sorts as `sort=postingDate.desc`, one parameter per column, in order. */
function sortingFromSearch(search: URLSearchParams): SortingState {
  return search.getAll(sortParam).flatMap((value) => {
    const [id, direction] = value.split('.')
    return columnIds.has(id) && (direction === 'asc' || direction === 'desc')
      ? [{ id, desc: direction === 'desc' }]
      : []
  })
}

function filtersFromSearch(search: URLSearchParams): ColumnFiltersState {
  const filters: ColumnFiltersState = selectFilterParams.flatMap((id) => {
    const value = search.get(id)
    return value ? [{ id, value }] : []
  })
  const range: DateRange = {
    from: search.get(postingDateParams.from) || null,
    to: search.get(postingDateParams.to) || null,
  }
  if (range.from !== null || range.to !== null) {
    filters.push({ id: 'postingDate', value: range })
  }
  return filters
}

function searchFromView(
  sorting: SortingState,
  filters: ColumnFiltersState,
): URLSearchParams {
  const search = new URLSearchParams()
  for (const filter of filters) {
    if (filter.id === 'postingDate') {
      const { from, to } = filter.value as DateRange
      if (from !== null) search.set(postingDateParams.from, from)
      if (to !== null) search.set(postingDateParams.to, to)
    } else {
      search.set(filter.id, filter.value as string)
    }
  }
  for (const sort of sorting) {
    search.append(sortParam, `${sort.id}.${sort.desc ? 'desc' : 'asc'}`)
  }
  return search
}

/** A row's link to its Role, remembering the list's filters and sort. */
function RoleTitleLink({ role }: { role: Role }) {
  const { search } = useLocation()
  return (
    <Link to={`/roles/${role.id}`} state={fromRolesList(search)}>
      {role.title}
    </Link>
  )
}

const ariaSort = {
  asc: 'ascending',
  desc: 'descending',
  none: undefined,
} as const

export function RolesTable({
  roles,
  companies,
  statuses,
}: {
  roles: Role[]
  companies: Company[]
  statuses: Status[]
}) {
  // Until a column is sorted: the order Roles are listed in.
  const data = useMemo(
    () =>
      roles.map((role): RoleRow => {
        const company = companies.find((c) => c.id === role.companyId)
        return {
          role,
          company,
          status: statuses.find((s) => s.id === role.statusId),
          flags: flagsShownOnRole(role, company),
        }
      }),
    [roles, companies, statuses],
  )
  const [search, setSearch] = useSearchParams()
  const sorting = useMemo(() => sortingFromSearch(search), [search])
  const columnFilters = useMemo(() => filtersFromSearch(search), [search])
  // Replacing, so Back leaves the list rather than undoing each change.
  function setView(nextSorting: SortingState, nextFilters: ColumnFiltersState) {
    setSearch(searchFromView(nextSorting, nextFilters), { replace: true })
  }
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.role.id,
    // Rather than descending first for any column of numbers.
    sortDescFirst: false,
    state: { sorting, columnFilters },
    onSortingChange: (updater) =>
      setView(functionalUpdate(updater, sorting), columnFilters),
    onColumnFiltersChange: (updater) =>
      setView(sorting, functionalUpdate(updater, columnFilters)),
  })

  const statusColumn = table.getColumn('status')
  const companyColumn = table.getColumn('company')
  const workArrangementColumn = table.getColumn('workArrangement')
  const postingDateColumn = table.getColumn('postingDate')
  const postingDates = (postingDateColumn?.getFilterValue() as
    DateRange | undefined) ?? { from: null, to: null }
  function setPostingDates(changes: Partial<DateRange>) {
    const range = { ...postingDates, ...changes }
    postingDateColumn?.setFilterValue(
      range.from === null && range.to === null ? undefined : range,
    )
  }
  const rows = table.getRowModel().rows

  return (
    <>
      <fieldset className="table-filters">
        <legend>Filter Roles</legend>
        <FilterSelect
          id="filter-status"
          label="Status"
          value={statusColumn?.getFilterValue() as string | undefined}
          onChange={(value) => statusColumn?.setFilterValue(value)}
          options={statuses.map((s) => ({ value: s.id, label: s.name }))}
        />
        <FilterSelect
          id="filter-company"
          label="Company"
          value={companyColumn?.getFilterValue() as string | undefined}
          onChange={(value) => companyColumn?.setFilterValue(value)}
          options={[
            ...companies.map((c) => ({ value: c.id, label: c.name })),
            { value: noCompany, label: companyNotDisclosed },
          ]}
        />
        <FilterSelect
          id="filter-work-arrangement"
          label="Work arrangement"
          value={workArrangementColumn?.getFilterValue() as string | undefined}
          onChange={(value) => workArrangementColumn?.setFilterValue(value)}
          options={workArrangements.map((value) => ({
            value,
            label: workArrangementLabels[value],
          }))}
        />
        <div className="table-filter">
          <label htmlFor="filter-posted-from">Posting date from</label>
          <input
            id="filter-posted-from"
            type="date"
            value={postingDates.from ?? ''}
            onChange={(event) =>
              setPostingDates({ from: event.target.value || null })
            }
          />
        </div>
        <div className="table-filter">
          <label htmlFor="filter-posted-to">Posting date to</label>
          <input
            id="filter-posted-to"
            type="date"
            value={postingDates.to ?? ''}
            onChange={(event) =>
              setPostingDates({ to: event.target.value || null })
            }
          />
        </div>
      </fieldset>
      <div className="table-scroll">
        <table aria-label="Roles" className="roles-table">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={ariaSort[header.column.getIsSorted() || 'none']}
                  >
                    <button
                      type="button"
                      className="sort-button"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p>No Roles match these filters.</p>}
    </>
  )
}

/** The option that turns a filter off. */
const anyOption = 'Any'

/** A filter on one column: its value, or undefined for any. */
function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="table-filter">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">{anyOption}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
