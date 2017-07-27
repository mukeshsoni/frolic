/* golbal ravel*/
import { render } from 'react-dom'
import './app.global.css'
import App from './components/App.js'
import ErrorBoundary from './components/ErrorBoundary'

import React from 'react'

render(
    <ErrorBoundary>
  <App /></ErrorBoundary>,
  document.getElementById('root')
)
