// Dates and money are shown US-style: the spec assumes USD.
export const locale = 'en-US'

const mediumDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

/** A date picked by the user, YYYY-MM-DD or YYYY-MM-DDTHH:mm, as that moment in local time. */
function localMoment(picked: string): Date {
  const [date, time = '00:00'] = picked.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

/** A calendar date (YYYY-MM-DD), shown as written: no time zone shift. */
export function formatCalendarDate(date: string): string {
  return mediumDate.format(localMoment(date))
}

const mediumDateTime = new Intl.DateTimeFormat(locale, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** A clock timestamp, shown as its date and time in local time. */
export function formatTimestamp(timestamp: string): string {
  return mediumDateTime.format(new Date(timestamp))
}

/** A clock timestamp, shown as its date in local time. */
export function formatTimestampDate(timestamp: string): string {
  return mediumDate.format(new Date(timestamp))
}

/** A local date and time (YYYY-MM-DDTHH:mm), shown as written: no time zone shift. */
export function formatLocalDateTime(dateTime: string): string {
  return mediumDateTime.format(localMoment(dateTime))
}
