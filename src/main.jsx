import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { globalCSS } from './theme'

// Inject global styles once
const style = document.createElement('style')
style.textContent = globalCSS
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
