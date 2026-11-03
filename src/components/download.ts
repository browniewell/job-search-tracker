/** Saves text as a file through the browser's download. */
export function download(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Revoked once the click is handled: some browsers cancel the download
  // when the URL goes away first.
  setTimeout(() => URL.revokeObjectURL(url))
}
