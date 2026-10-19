import { HashRouter, NavLink, Route, Routes } from 'react-router'
import { CompaniesPage } from './companies/CompaniesPage'
import { CompanyDetailPage } from './companies/CompanyDetailPage'
import { ContactDetailPage } from './contacts/ContactDetailPage'
import { ContactsPage } from './contacts/ContactsPage'
import type { DataLayer } from './data/dataLayer'
import { DataLayerContext } from './dataContext'
import { PipelineBoardPage } from './roles/PipelineBoardPage'
import { RoleDetailPage } from './roles/RoleDetailPage'
import { RolesPage } from './roles/RolesPage'
import { SettingsPage } from './settings/SettingsPage'

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
            <NavLink to="/board">Pipeline board</NavLink>
            <NavLink to="/companies">Companies</NavLink>
            <NavLink to="/contacts">Contacts</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<RolesPage />} />
            <Route path="/board" element={<PipelineBoardPage />} />
            <Route path="/roles/:roleId" element={<RoleDetailPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route
              path="/companies/:companyId"
              element={<CompanyDetailPage />}
            />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route
              path="/contacts/:contactId"
              element={<ContactDetailPage />}
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </HashRouter>
    </DataLayerContext>
  )
}
