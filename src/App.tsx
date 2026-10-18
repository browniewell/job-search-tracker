import { HashRouter, NavLink, Route, Routes } from 'react-router'
import { CompaniesPage } from './companies/CompaniesPage'
import { CompanyDetailPage } from './companies/CompanyDetailPage'
import type { DataLayer } from './data/dataLayer'
import { DataLayerContext } from './dataContext'
import { RoleDetailPage } from './roles/RoleDetailPage'
import { RolesPage } from './roles/RolesPage'

export function App({ data }: { data: DataLayer }) {
  return (
    <DataLayerContext value={data}>
      <HashRouter>
        <header className="app-header">
          <h1>Job Search Tracker</h1>
          <nav aria-label="Main">
            <NavLink to="/" end>
              Roles
            </NavLink>
            <NavLink to="/companies">Companies</NavLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<RolesPage />} />
            <Route path="/roles/:roleId" element={<RoleDetailPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route
              path="/companies/:companyId"
              element={<CompanyDetailPage />}
            />
          </Routes>
        </main>
      </HashRouter>
    </DataLayerContext>
  )
}
