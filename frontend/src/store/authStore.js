import { create } from 'zustand'
import { authService } from '../services/auth'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,

  login: async (credentials) => {
    set({ isLoading: true })
    try {
      const { data } = await authService.login(credentials)
      const { token, refresh_token, user } = data.data
      localStorage.setItem('token', token)
      localStorage.setItem('refresh_token', refresh_token)
      set({ user, token, isAuthenticated: true, isLoading: false })
      return user
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (userData) => {
    set({ isLoading: true })
    try {
      const { data } = await authService.register(userData)
      const { token, refresh_token, user } = data.data
      localStorage.setItem('token', token)
      localStorage.setItem('refresh_token', refresh_token)
      set({ user, token, isAuthenticated: true, isLoading: false })
      return user
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  fetchProfile: async () => {
    try {
      const { data } = await authService.getProfile()
      set({ user: data.data, isAuthenticated: true })
    } catch {
      set({ user: null, isAuthenticated: false })
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))

export default useAuthStore
