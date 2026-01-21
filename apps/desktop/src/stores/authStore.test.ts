import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
    })
  })

  describe('setAuth', () => {
    it('should set user and token correctly', () => {
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
      const mockToken = 'test-jwt-token'

      useAuthStore.getState().setAuth(mockUser, mockToken)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.token).toBe(mockToken)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear user and token', () => {
      // First set auth
      useAuthStore.getState().setAuth(
        {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: null,
          plan: 'free',
          is_trial_active: true,
          days_left_trial: 7,
          has_premium_access: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        'test-token'
      )

      // Then logout
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('updateUser', () => {
    it('should update user properties', () => {
      // Set initial user
      useAuthStore.getState().setAuth(
        {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: null,
          plan: 'free',
          is_trial_active: true,
          days_left_trial: 7,
          has_premium_access: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        'test-token'
      )

      // Update user
      useAuthStore.getState().updateUser({
        name: 'Updated Name',
        plan: 'pro',
      })

      const state = useAuthStore.getState()
      expect(state.user?.name).toBe('Updated Name')
      expect(state.user?.plan).toBe('pro')
      // Other properties should remain unchanged
      expect(state.user?.email).toBe('test@example.com')
    })

    it('should not update if no user exists', () => {
      useAuthStore.getState().updateUser({ name: 'New Name' })

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })
  })

  describe('setLoading', () => {
    it('should set loading state', () => {
      useAuthStore.getState().setLoading(true)
      expect(useAuthStore.getState().isLoading).toBe(true)

      useAuthStore.getState().setLoading(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('premium access', () => {
    it('should correctly reflect trial user premium access', () => {
      useAuthStore.getState().setAuth(
        {
          id: 1,
          email: 'test@example.com',
          name: 'Trial User',
          avatar_url: null,
          plan: 'free',
          is_trial_active: true,
          days_left_trial: 5,
          has_premium_access: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        'test-token'
      )

      const state = useAuthStore.getState()
      expect(state.user?.has_premium_access).toBe(true)
      expect(state.user?.is_trial_active).toBe(true)
    })

    it('should correctly reflect expired trial user', () => {
      useAuthStore.getState().setAuth(
        {
          id: 1,
          email: 'test@example.com',
          name: 'Expired User',
          avatar_url: null,
          plan: 'free',
          is_trial_active: false,
          days_left_trial: 0,
          has_premium_access: false,
          created_at: '2024-01-01T00:00:00Z',
        },
        'test-token'
      )

      const state = useAuthStore.getState()
      expect(state.user?.has_premium_access).toBe(false)
      expect(state.user?.is_trial_active).toBe(false)
    })
  })
})
