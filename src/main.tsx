import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/manrope'
import '@fontsource-variable/newsreader'
import { ProviderProvider } from './context/ProviderContext'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProviderProvider>
        <App />
      </ProviderProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
