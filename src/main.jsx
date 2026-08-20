import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/**
 * MinuteTalk AI - Entry Point
 * 
 * This is the main entry point for the React application.
 * It initializes React and renders the App component into the DOM.
 * 
 * The app uses:
 * - React 18 with concurrent features
 * - Vite for fast development and optimized production builds
 * - Tailwind CSS for styling
 */

// Error boundary for catching React errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('MinuteTalk AI Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
            <p className="text-slate-400 mb-4">{this.state.error?.message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Render the app with error boundary
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
