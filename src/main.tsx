import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { CursoProvider } from './data/CursoContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CursoProvider>
        <App />
      </CursoProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
