import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a test query client with default options
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

interface WrapperProps {
  children: React.ReactNode
}

// All providers wrapper for testing
const AllProviders = ({ children }: WrapperProps) => {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

// Custom render function that includes all providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options })

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }

// Mock user data
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  plan: 'free',
  is_trial_active: true,
  days_left_trial: 7,
  has_premium_access: true,
  is_verified: true,
  is_admin: false,
  is_super_admin: false,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockPremiumUser = {
  ...mockUser,
  plan: 'pro',
  is_trial_active: false,
  days_left_trial: 0,
  has_premium_access: true,
}

export const mockAdminUser = {
  ...mockUser,
  is_admin: true,
  plan: 'pro',
  has_premium_access: true,
}

// Mock API responses
export const mockAuthResponse = {
  access_token: 'test-jwt-token',
  token_type: 'bearer',
  user: mockUser,
}

// Helper to mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key])
    },
  }
}
