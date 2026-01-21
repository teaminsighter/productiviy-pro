import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/authStore'

// Note: Full component rendering tests are skipped due to heavy dependency tree.
// These tests focus on the auth logic that AuthGuard depends on.

describe('AuthGuard Logic', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
    })
    vi.clearAllMocks()
  })

  it('should start with unauthenticated state', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
  })

  it('should handle auth state correctly', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: null,
      plan: 'free' as const,
      is_trial_active: true,
      days_left_trial: 7,
      has_premium_access: true,
      created_at: '2024-01-01T00:00:00Z',
    }

    useAuthStore.getState().setAuth(mockUser, 'valid-token')

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('valid-token')
    expect(state.user?.email).toBe('test@example.com')
  })

  it('should clear auth on logout', () => {
    // Set auth first
    useAuthStore.getState().setAuth(
      {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        avatar_url: null,
        plan: 'free',
        is_trial_active: true,
        days_left_trial: 7,
        has_premium_access: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      'token'
    )

    // Logout
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })

  it('should set loading state correctly', () => {
    useAuthStore.getState().setLoading(true)
    expect(useAuthStore.getState().isLoading).toBe(true)

    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})
