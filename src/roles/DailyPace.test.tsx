import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { openTestDataLayer } from '../test/dataLayers'

describe('Daily target', () => {
  it.each([
    [0, '0 of 2 today, a fresh start'],
    [1, '1 of 2 today, good going'],
    [2, '2 of 2 today, nice work'],
    [3, '3 of 2 today, above and beyond'],
  ])(
    'Given %i Applications today and a Daily target of 2, when I open Roles, then I see "%s"',
    async (applications, message) => {
      const data = await openTestDataLayer()
      const applied = (await data.listStatuses()).find((s) => s.isApplied)!
      for (let i = 0; i < applications; i++) {
        const role = await data.createRole({ title: `Role ${i + 1}` })
        await data.changeStatus(role.id, applied.id)
      }

      render(<App data={data} />)

      expect(await screen.findByText(message)).toBeVisible()
    },
  )
})
