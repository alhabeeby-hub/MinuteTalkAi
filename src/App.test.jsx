import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import App from './App.jsx'

// Mock the global fetch
global.fetch = jest.fn()

// Set test environment variable on window object
// This is used by App.jsx to get the API URL in test environment
window.__VITE_API_URL__ = 'http://localhost:8000'

describe('MinuteTalk AI App', () => {
  const mockApiUrl = 'http://localhost:8000'
  
  beforeEach(() => {
    fetch.mockClear()
    // Mock environment variable
    process.env.VITE_API_URL = mockApiUrl
    // Set window-based env override
    window.__VITE_API_URL__ = mockApiUrl
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('Initial Render', () => {
    test('renders the app title', () => {
      render(<App />)
      expect(screen.getByText('MinuteTalk AI')).toBeInTheDocument()
    })

    test('renders category selection grid', () => {
      render(<App />)
      expect(screen.getByText('How it works')).toBeInTheDocument()
    })

    test('displays instructions', () => {
      render(<App />)
      const instructions = [
        'Choose a topic category that interests you',
        'You\'ll receive a random speaking prompt',
        'Speak for 60 seconds on the topic (use hints if needed!)'
      ]
      instructions.forEach(text => {
        expect(screen.getByText(text)).toBeInTheDocument()
      })
    })
  })

  describe('Category Selection', () => {
    test('renders all categories with correct names', () => {
      render(<App />)
      
      const categories = [
        'Technology', 'Science', 'Business', 'Sports',
        'Entertainment', 'Lifestyle', 'History', 'Society'
      ]
      
      categories.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument()
      })
    })

    test('renders all category icons', () => {
      render(<App />)
      
      const icons = ['💻', '🔬', '💼', '⚽', '🎬', '🌿', '📜', '🌍']
      
      icons.forEach(icon => {
        expect(screen.getAllByText(icon).length).toBeGreaterThan(0)
      })
    })
  })

  describe('Topic Generation', () => {
    test('fetches topic when category is selected', async () => {
      const mockTopic = {
        topic: 'The impact of AI on daily life',
        hints: ['Start with a personal example', 'Discuss benefits and risks'],
        category: 'tech'
      }
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTopic
      })

      render(<App />)
      
      // Click the Technology category
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      // Wait for fetch to be called
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/api/topic`,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'tech' })
          })
        )
      })
    })

    test('shows loading state when fetching topic', async () => {
      render(<App />)
      
      fetch.mockImplementation(() => new Promise(() => {}))
      
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      await waitFor(() => {
        expect(screen.getByText('Generating your topic...')).toBeInTheDocument()
      })
    })

    test('displays error when API fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      render(<App />)
      
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Error/)).toBeInTheDocument()
      })
    })
  })

  describe('Explanation Feature', () => {
    test('renders Explain Topic button and fetches explanation', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          topic: 'AI copyright',
          hints: ['Hint 1'],
          category: 'tech'
        })
      })

      render(<App />)
      
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      await waitFor(() => {
        expect(screen.getByText('AI copyright')).toBeInTheDocument()
      })

      const explainBtn = screen.getByText('🧠 Explain Topic')
      expect(explainBtn).toBeInTheDocument()

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          explanation: 'AI copyright explained details here'
        })
      })

      fireEvent.click(explainBtn)

      await waitFor(() => {
        expect(screen.getByText('AI copyright explained details here')).toBeInTheDocument()
      })
    })
  })

  describe('Timer Functionality', () => {
    beforeEach(() => {
      // Mock the API response
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          topic: 'Test topic',
          hints: ['Hint 1', 'Hint 2'],
          category: 'tech'
        })
      })
    })

    test('starts timer countdown when user clicks Start Speaking', async () => {
      jest.useFakeTimers()
      
      render(<App />)
      
      // Select a category
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      // Wait for topic to load
      await waitFor(() => {
        expect(screen.getByText('Test topic')).toBeInTheDocument()
      })
      
      // Click start speaking
      const startButton = screen.getByText('🎤 Start Speaking')
      expect(startButton).toBeInTheDocument()
      fireEvent.click(startButton)
      
      // Check that timer starts
      expect(screen.getByText('Speaking in progress...')).toBeInTheDocument()
      
      // Advance timer by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000)
      })
      
      await waitFor(() => {
        expect(screen.getByText('0:55')).toBeInTheDocument()
      })
    })

    test('timer shows warning at 10 seconds', async () => {
      jest.useFakeTimers()
      
      render(<App />)
      
      // Select category and start timer
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test topic')).toBeInTheDocument()
      })
      
      const startButton = screen.getByText('🎤 Start Speaking')
      fireEvent.click(startButton)
      
      // Advance to 10 seconds remaining
      act(() => {
        jest.advanceTimersByTime(51000)
      })
      
      await waitFor(() => {
        const timer = screen.getByText('0:09')
        expect(timer).toHaveClass('warning')
      })
    })

    test('shows completion message when timer reaches 0', async () => {
      jest.useFakeTimers()
      
      render(<App />)
      
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test topic')).toBeInTheDocument()
      })
      
      const startButton = screen.getByText('🎤 Start Speaking')
      fireEvent.click(startButton)
      
      // Advance timer to 0
      act(() => {
        jest.advanceTimersByTime(61000)
      })
      
      await waitFor(() => {
        expect(screen.getByText("Time's up!")).toBeInTheDocument()
      })
      
      // Check completion modal
      await waitFor(() => {
        expect(screen.getByText('🎉')).toBeInTheDocument()
        expect(screen.getByText('Great job!')).toBeInTheDocument()
      })
    })
  })

  describe('Hints Display', () => {
    test('hides hints by default', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          topic: 'Test topic',
          hints: ['Hint 1', 'Hint 2', 'Hint 3'],
          category: 'tech'
        })
      })
      
      render(<App />)
      
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test topic')).toBeInTheDocument()
      })
      
      // Hints section should exist but hints should be hidden
      expect(screen.getByText('💡 Talking Points')).toBeInTheDocument()
      expect(screen.getByText('Show hints')).toBeInTheDocument()
    })

    test('shows hints when toggle is clicked', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          topic: 'Test topic',
          hints: ['Hint 1', 'Hint 2', 'Hint 3'],
          category: 'tech'
        })
      })
      
      render(<App />)
      
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test topic')).toBeInTheDocument()
      })
      
      // Click to show hints
      const showHintsButton = screen.getByText('Show hints')
      fireEvent.click(showHintsButton)
      
      // Hints should now be visible
      await waitFor(() => {
        expect(screen.getByText('Hint 1')).toBeInTheDocument()
        expect(screen.getByText('Hint 2')).toBeInTheDocument()
        expect(screen.getByText('Hint 3')).toBeInTheDocument()
      })
      
      // Toggle should now say "Hide"
      expect(screen.getByText('Hide hints')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    test('back to categories button works', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          topic: 'Test topic',
          hints: ['Hint 1'],
          category: 'tech'
        })
      })
      
      render(<App />)
      
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test topic')).toBeInTheDocument()
      })
      
      // Click back to categories
      const backButton = screen.getByText('← Back to categories')
      fireEvent.click(backButton)
      
      // Should be back at category selection
      expect(screen.getByText('MinuteTalk AI')).toBeInTheDocument()
    })

    test('reset button returns to category selection', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          topic: 'Test topic',
          hints: ['Hint 1'],
          category: 'tech'
        })
      })
      
      render(<App />)
      
      const techButton = screen.getByText('Technology').closest('button')
      fireEvent.click(techButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test topic')).toBeInTheDocument()
      })
      
      const resetButton = screen.getByText('🏠 Choose Category')
      fireEvent.click(resetButton)
      
      expect(screen.getByText('MinuteTalk AI')).toBeInTheDocument()
    })
  })
})
