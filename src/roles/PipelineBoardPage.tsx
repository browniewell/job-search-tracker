import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { FlagBadge } from '../components/FlagBadge'
import {
  flagsShownOnRole,
  type Company,
  type Role,
  type Status,
} from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { CompanyNotDisclosed } from './CompanyNotDisclosed'
import { DailyPace } from './DailyPace'
import { formatCalendarDate } from '../format'
import { errorMessage } from '../errorMessage'

/** What the board shows: every Role, with the Companies and Statuses they link to. */
type BoardData = { roles: Role[]; companies: Company[]; statuses: Status[] }

// A mouse must move a little before a drag starts, so clicking a card's link
// still opens the Role. A finger must press and hold, so swiping over cards
// still scrolls the page.
const mouseActivation = { distance: 5 }
const touchActivation = { delay: 250, tolerance: 5 }

const arrowSteps: Partial<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
}

// Each arrow press moves a picked-up card to the previous or next column, in
// reading order as the columns wrap.
const nextColumnCoordinates: KeyboardCoordinateGetter = (
  event,
  { context },
) => {
  const step = arrowSteps[event.code]
  if (step === undefined) return undefined
  event.preventDefault()
  const columns = [...context.droppableRects.entries()].sort(
    ([, a], [, b]) => a.top - b.top || a.left - b.left,
  )
  const current: UniqueIdentifier | undefined =
    context.over?.id ?? context.active?.data.current?.statusId
  const next = columns[columns.findIndex(([id]) => id === current) + step]
  return next && { x: next[1].left, y: next[1].top }
}

// The column under the pointer; for the keyboard, which has none, the column
// under the card's top-left corner, where an arrow press puts it.
const columnUnderCard: CollisionDetection = (args) =>
  pointerWithin(
    args.pointerCoordinates
      ? args
      : {
          ...args,
          pointerCoordinates: {
            x: args.collisionRect.left + 1,
            y: args.collisionRect.top + 1,
          },
        },
  )

const screenReaderInstructions = {
  draggable:
    'To move a Role to another Status, press Space. Use the arrow keys to choose the Status, then press Space again to drop it there, or Escape to cancel.',
}

export function PipelineBoardPage() {
  const data = useDataLayer()
  const [loaded, setLoaded] = useState<BoardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showClosed, setShowClosed] = useState(false)
  const showClosedId = useId()
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: mouseActivation }),
    useSensor(TouchSensor, { activationConstraint: touchActivation }),
    useSensor(KeyboardSensor, { coordinateGetter: nextColumnCoordinates }),
  )

  useEffect(() => {
    let cancelled = false
    Promise.all([
      data.listRoles(),
      data.listCompanies(),
      data.listStatuses(),
    ]).then(([roles, companies, statuses]) => {
      if (!cancelled) setLoaded({ roles, companies, statuses })
    })
    return () => {
      cancelled = true
    }
  }, [data])

  if (loaded === null) return null
  const { roles, companies, statuses } = loaded
  const columns = statuses.filter((status) => showClosed || !status.closed)
  const roleTitle = (id: UniqueIdentifier) =>
    roles.find((role) => role.id === id)?.title ?? 'The Role'
  const statusName = (id: UniqueIdentifier) =>
    statuses.find((status) => status.id === id)?.name ?? 'that Status'

  const setRoles = (update: (roles: Role[]) => Role[]) =>
    setLoaded(
      (current) => current && { ...current, roles: update(current.roles) },
    )
  const replaceRole = (replacement: Role) =>
    setRoles((current) =>
      current.map((r) => (r.id === replacement.id ? replacement : r)),
    )

  // The card moves at once; the Status change, with its Status history
  // entry, is the same operation as on the Role's page.
  async function moveRole({ active, over }: DragEndEvent) {
    const role = roles.find((r) => r.id === active.id)
    if (!role || !over || over.id === role.statusId) return
    const statusId = String(over.id)
    replaceRole({ ...role, statusId })
    try {
      replaceRole(await data.changeStatus(role.id, statusId))
      setError(null)
    } catch (cause) {
      setError(errorMessage(cause))
      const saved = await data.listRoles()
      setRoles(() => saved)
    }
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${roleTitle(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${roleTitle(active.id)} is over ${statusName(over.id)}.`
        : `${roleTitle(active.id)} is not over a Status.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${roleTitle(active.id)} was dropped in ${statusName(over.id)}.`
        : `${roleTitle(active.id)} was dropped where it was.`,
    onDragCancel: ({ active }) =>
      `Moving ${roleTitle(active.id)} was cancelled.`,
  }

  return (
    <section aria-labelledby="board-heading">
      <h2 id="board-heading">Pipeline board</h2>
      <DailyPace recountWhen={roles} />
      <div className="board-options">
        <input
          id={showClosedId}
          type="checkbox"
          checked={showClosed}
          onChange={(event) => setShowClosed(event.target.checked)}
        />
        <label htmlFor={showClosedId}>Show Closed statuses</label>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={columnUnderCard}
        onDragEnd={moveRole}
        // The hidden announcements go on the page's body, outside the layout.
        accessibility={{
          announcements,
          screenReaderInstructions,
          container: document.body,
        }}
      >
        <div className="board">
          {columns.map((status) => (
            <BoardColumn
              key={status.id}
              status={status}
              roles={roles.filter((role) => role.statusId === status.id)}
              companies={companies}
            />
          ))}
        </div>
      </DndContext>
    </section>
  )
}

function BoardColumn({
  status,
  roles,
  companies,
}: {
  status: Status
  roles: Role[]
  companies: Company[]
}) {
  const headingId = useId()
  const { setNodeRef, isOver } = useDroppable({ id: status.id })
  return (
    <section
      ref={setNodeRef}
      className={isOver ? 'board-column over' : 'board-column'}
      aria-labelledby={headingId}
    >
      <h3 id={headingId}>{status.name}</h3>
      <ul className="board-cards">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            company={companies.find((c) => c.id === role.companyId)}
          />
        ))}
      </ul>
    </section>
  )
}

function RoleCard({
  role,
  company,
}: {
  role: Role
  company: Company | undefined
}) {
  const data = useDataLayer()
  const due = data.isNextActionDue(role)
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    isDragging,
  } = useDraggable({ id: role.id, data: { statusId: role.statusId } })
  return (
    // The whole card drags by mouse; the keyboard picks it up by its handle.
    <li
      ref={setNodeRef}
      className={isDragging ? 'board-card dragging' : 'board-card'}
      aria-label={role.title}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      {...listeners}
    >
      <div className="board-card-heading">
        <Link to={`/roles/${role.id}`}>{role.title}</Link>
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="drag-handle"
          {...attributes}
          aria-label={`Move ${role.title}`}
        >
          <span aria-hidden="true">⠿</span>
        </button>
      </div>
      <span>{company?.name ?? <CompanyNotDisclosed />}</span>
      <FlagBadge flags={flagsShownOnRole(role, company)} />
      {role.nextActionDate && (
        <span className={due ? 'next-action due' : 'next-action'}>
          Next action date: {formatCalendarDate(role.nextActionDate)}
          {due && ' (due)'}
        </span>
      )}
    </li>
  )
}
