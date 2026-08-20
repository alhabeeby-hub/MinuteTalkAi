import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * MinuteTalk AI - Main Application Component
 * 
 * An impromptu speaking trainer where users:
 * 1. Select an interest area (category)
 * 2. Receive an AI-generated topic with a 60-second countdown timer
 * 3. Can reveal quick talking points if they get stuck
 * 
 * API Integration:
 * - Topics are fetched from the backend API at /api/topic
 * - Hints are fetched from the backend API at /api/hint
 * - Environment variables: VITE_API_URL for the API endpoint
 */

// Category definitions for the topic generator
const CATEGORIES = [
  { id: 'tech', name: 'Technology', icon: '💻', color: 'from-blue-500 to-cyan-400' },
  { id: 'science', name: 'Science', icon: '🔬', color: 'from-green-500 to-emerald-400' },
  { id: 'business', name: 'Business', icon: '💼', color: 'from-yellow-500 to-orange-400' },
  { id: 'sports', name: 'Sports', icon: '⚽', color: 'from-red-500 to-pink-400' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: 'from-purple-500 to-violet-400' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🌿', color: 'from-teal-500 to-green-400' },
  { id: 'history', name: 'History', icon: '📜', color: 'from-amber-500 to-yellow-400' },
  { id: 'society', name: 'Society', icon: '🌍', color: 'from-indigo-500 to-blue-400' },
]

// Timer duration in seconds
const TIMER_DURATION = 60

/**
 * Main App Component
 */
function App() {
  // State management
  const [view, setView] = useState('select') // 'select' | 'topic' | 'result'
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [topic, setTopic] = useState('')
  const [hints, setHints] = useState([])
  const [showHints, setShowHints] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [isExplaining, setIsExplaining] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  // Refs
  const timerRef = useRef(null)

  // Get API URL from environment variable or use window override for tests
  let API_URL = process.env.VITE_API_URL || ''
  // Check for window-based env override (used in tests)
  if (typeof window !== 'undefined' && window.__VITE_API_URL__) {
    API_URL = window.__VITE_API_URL__
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false)
            clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isTimerRunning, timeLeft])

  /**
   * Fetch a new topic from the API
   */
  const fetchTopic = async (category) => {
    setIsLoading(true)
    setError(null)
    setExplanation('')
    setShowExplanation(false)

    try {
      const response = await fetch(`${API_URL}/api/topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch topic: ${response.status}`)
      }

      const data = await response.json()
      setTopic(data.topic)
      setHints(data.hints || [])
      setShowHints(false)
      setTimeLeft(TIMER_DURATION)
      setIsTimerRunning(false)
      setView('topic')
    } catch (err) {
      console.error('Error fetching topic:', err)
      setError(err.message || 'Failed to generate topic. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Fetch explanation for the topic from the API
   */
  const handleExplainTopic = async () => {
    if (!topic) return
    setIsExplaining(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          category: selectedCategory?.id || '',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to explain topic: ${response.status}`)
      }

      const data = await response.json()
      setExplanation(data.explanation)
      setShowExplanation(true)
    } catch (err) {
      console.error('Error explaining topic:', err)
      setError(err.message || 'Failed to get explanation. Please try again.')
    } finally {
      setIsExplaining(false)
    }
  }

  /**
   * Handle category selection
   */
  const handleCategorySelect = (category) => {
    setSelectedCategory(category)
    fetchTopic(category.id)
  }

  /**
   * Start the timer
   */
  const handleStartTimer = () => {
    setIsTimerRunning(true)
  }

  /**
   * Stop/pause the timer
   */
  const handleStopTimer = () => {
    setIsTimerRunning(false)
  }

  /**
   * Reset to category selection
   */
  const handleReset = () => {
    setView('select')
    setSelectedCategory(null)
    setTopic('')
    setHints([])
    setShowHints(false)
    setTimeLeft(TIMER_DURATION)
    setIsTimerRunning(false)
    setError(null)
    setExplanation('')
    setShowExplanation(false)
  }

  /**
   * Generate a new topic in the same category
   */
  const handleNewTopic = () => {
    if (selectedCategory) {
      fetchTopic(selectedCategory.id)
    }
  }

  /**
   * Toggle hint visibility
   */
  const handleToggleHints = () => {
    setShowHints(!showHints)
  }

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Determine timer color class
  const getTimerClass = () => {
    if (timeLeft <= 10) return 'timer-display warning'
    return 'timer-display'
  }

  // ==================== RENDER HELPERS ====================

  /**
   * Render the category selection view
   */
  const renderCategorySelect = () => (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
          MinuteTalk AI
        </h1>
        <p className="text-slate-400 text-lg md:text-xl">
          Master the art of impromptu speaking
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-slate-800/50 rounded-xl p-6 mb-8 border border-slate-700/50">
        <h2 className="text-xl font-semibold mb-3 text-white">How it works</h2>
        <ol className="text-slate-300 space-y-2">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-bold">1</span>
            <span>Choose a topic category that interests you</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-bold">2</span>
            <span>You'll receive a random speaking prompt</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-bold">3</span>
            <span>Speak for 60 seconds on the topic (use hints if needed!)</span>
          </li>
        </ol>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategorySelect(category)}
            disabled={isLoading}
            className="category-card text-left group"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
              {category.icon}
            </div>
            <h3 className="text-lg font-semibold text-white">{category.name}</h3>
            <p className="text-sm text-slate-400 mt-1">Tap to start</p>
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-300">Generating your topic...</p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md border border-red-500/50">
            <div className="text-red-400 text-xl mb-4">⚠️ Error</div>
            <p className="text-slate-300 mb-4">{error}</p>
            <div className="flex gap-3">
              <button onClick={() => setError(null)} className="btn-secondary">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  /**
   * Render the topic/timer view
   */
  const renderTopic = () => (
    <div className="max-w-3xl mx-auto">
      {/* Header with category */}
      <div className="text-center mb-8">
        <button 
          onClick={handleReset}
          className="text-slate-400 hover:text-white transition-colors text-sm mb-4"
        >
          ← Back to categories
        </button>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${selectedCategory?.color} bg-opacity-20 text-white font-medium`}>
          <span>{selectedCategory?.icon}</span>
          <span>{selectedCategory?.name}</span>
        </div>
      </div>

      {/* Topic Display */}
      <div className="bg-slate-800/50 rounded-2xl p-8 mb-8 border border-slate-700/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm uppercase tracking-wider text-slate-400">Your Topic</h2>
          <button
            onClick={handleExplainTopic}
            disabled={isExplaining}
            className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {isExplaining ? (
              <>
                <span className="w-3 h-3 border-2 border-slate-200 border-t-transparent rounded-full animate-spin"></span>
                Analyzing...
              </>
            ) : (
              '🧠 Explain Topic'
            )}
          </button>
        </div>
        <p className="topic-display">{topic}</p>
      </div>

      {/* Explanation Section */}
      {showExplanation && explanation && (
        <div className="bg-slate-800/80 rounded-xl p-6 mb-8 border border-primary-500/30 animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-md font-semibold text-primary-400 flex items-center gap-2">
              💡 AI Speaking Coach Explanation
            </h3>
            <button 
              onClick={() => setShowExplanation(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Close
            </button>
          </div>
          <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed">
            {explanation}
          </p>
        </div>
      )}

      {/* Timer */}
      <div className="text-center mb-8">
        <div className={getTimerClass()}>
          {formatTime(timeLeft)}
        </div>
        <p className="text-slate-400 mt-2">
          {isTimerRunning ? 'Speaking in progress...' : timeLeft === 0 ? "Time's up!" : 'Ready to speak?'}
        </p>
      </div>

      {/* Timer Controls */}
      <div className="flex justify-center gap-4 mb-8">
        {!isTimerRunning && timeLeft > 0 && timeLeft === TIMER_DURATION && (
          <button onClick={handleStartTimer} className="btn-primary text-lg px-8">
            🎤 Start Speaking
          </button>
        )}
        {isTimerRunning && (
          <button onClick={handleStopTimer} className="btn-secondary text-lg">
            ⏸️ Pause
          </button>
        )}
        {!isTimerRunning && timeLeft > 0 && timeLeft < TIMER_DURATION && (
          <button onClick={handleStartTimer} className="btn-primary text-lg">
            ▶️ Resume
          </button>
        )}
      </div>

      {/* Hints Section */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">💡 Talking Points</h3>
          <button 
            onClick={handleToggleHints}
            className="text-primary-400 hover:text-primary-300 text-sm font-medium"
          >
            {showHints ? 'Hide' : 'Show'} hints
          </button>
        </div>
        
        {showHints ? (
          <ul className="space-y-2">
            {hints.map((hint, index) => (
              <li key={index} className="hint-card flex items-start gap-2">
                <span className="text-accent-400 font-bold">{index + 1}.</span>
                <span className="text-slate-200">{hint}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-sm">
            Stuck? Click "Show hints" to get some talking points.
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-8">
        <button onClick={handleNewTopic} className="btn-secondary">
          🔄 New Topic
        </button>
        <button onClick={handleReset} className="btn-secondary">
          🏠 Choose Category
        </button>
      </div>

      {/* Time's up message */}
      {timeLeft === 0 && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">Great job!</h2>
            <p className="text-slate-400 mb-6">You completed 60 seconds of impromptu speaking!</p>
            <div className="flex gap-4 justify-center">
              <button onClick={handleNewTopic} className="btn-primary">
                🎤 Speak Again
              </button>
              <button onClick={handleReset} className="btn-secondary">
                🏠 Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Main render
  return (
    <div className="min-h-screen py-8 px-4">
      {view === 'select' && renderCategorySelect()}
      {view === 'topic' && renderTopic()}
    </div>
  )
}

export default App
