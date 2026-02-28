import React from 'react'
import ReactDOM from 'react-dom/client'
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/700.css";
import "@fontsource/outfit/900.css";
import { Web3Provider } from './providers/Web3Provider'
import { YieldProvider } from '@yo-protocol/react'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3Provider>
      <YieldProvider>
        <App />
      </YieldProvider>
    </Web3Provider>
  </React.StrictMode>,
)
