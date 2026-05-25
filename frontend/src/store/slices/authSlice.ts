import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  user: {
    userId: string
    phone: string
    email?: string
    fullName?: string
    onboardingStep?: string
    role?: string
  } | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  loading: boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.isAuthenticated = true
      localStorage.setItem('accessToken', action.payload.accessToken)
      localStorage.setItem('refreshToken', action.payload.refreshToken)
    },
    setUser(state, action: PayloadAction<AuthState['user']>) {
      state.user = action.payload
    },
    updateOnboardingStep(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.onboardingStep = action.payload
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    logout(state) {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    },
  },
})

export const { setTokens, setUser, updateOnboardingStep, setLoading, logout } = authSlice.actions
export default authSlice.reducer
