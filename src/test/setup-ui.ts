import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  // Hash routing keeps the route in the URL; start each test at the Roles list.
  window.location.hash = ''
})
