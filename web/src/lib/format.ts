const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const dayAndTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDay(iso: string) {
  return day.format(new Date(iso))
}

export function formatDayAndTime(iso: string) {
  return dayAndTime.format(new Date(iso))
}

export function plural(count: number, word: string, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`
}
