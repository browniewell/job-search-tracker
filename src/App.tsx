import { HashRouter, Route, Routes } from 'react-router'
import type { DataLayer } from './data/dataLayer'
import { DataLayerContext } from './dataContext'
import { RolesPage } from './roles/RolesPage'

export function App({ data }: { data: DataLayer }) {
  return (
    <DataLayerContext value={data}>
      <HashRouter>
        <header className="app-header">
          <h1>Job Search Tracker</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<RolesPage />} />
          </Routes>
        </main>
      </HashRouter>
    </DataLayerContext>
  )
}
