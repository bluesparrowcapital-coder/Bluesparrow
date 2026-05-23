import api from './api'

export const authService = {
  register: (data: { fullName: string; email: string; phone: string; panNumber?: string }) =>
    api.post('/auth/register', data).then((r) => r.data),

  setPin: (data: { pin: string; confirmPin: string }) =>
    api.post('/auth/pin/set', data).then((r) => r.data),

  loginWithPin: (data: { phone: string; pin: string }) =>
    api.post('/auth/pin/login', data).then((r) => r.data),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),

  // WebAuthn / Fingerprint
  getBiometricRegisterOptions: () =>
    api.get('/auth/biometric/register-options').then((r) => r.data.data),

  registerBiometric: (credential: unknown) =>
    api.post('/auth/biometric/register', { credential }).then((r) => r.data),

  getBiometricAuthOptions: (phone: string) =>
    api.post('/auth/biometric/auth-options', { phone }).then((r) => r.data.data),

  verifyBiometric: (phone: string, credential: unknown) =>
    api.post('/auth/biometric/verify', { phone, credential }).then((r) => r.data),
}
