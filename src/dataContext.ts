import { createContext, useContext } from 'react'
import type { DataLayer } from './data/dataLayer'

export const DataLayerContext = createContext<DataLayer | null>(null)

export function useDataLayer(): DataLayer {
  const data = useContext(DataLayerContext)
  if (!data) throw new Error('useDataLayer must be used inside <App>')
  return data
}
