import '@testing-library/jest-dom'

// Define import.meta.env for Jest environment (mimicking Vite)
// This needs to be done before any module imports
if (typeof global.import === 'undefined') {
  global.import = {}
}
global.import.meta = {
  env: {
    VITE_API_URL: 'http://localhost:8000',
  },
}

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver for tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock scrollTo for tests
window.scrollTo = jest.fn()
