import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import '@xyflow/react/dist/base.css'
import {App} from './App'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Pulse dashboard root element was not found.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
