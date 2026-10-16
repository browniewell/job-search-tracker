import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { openDataLayer } from './data/dataLayer'
import './index.css'

const data = await openDataLayer({ clock: () => new Date() })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App data={data} />
  </StrictMode>,
)
