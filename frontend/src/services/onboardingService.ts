import api from './api';

// ─── Client Profile ───────────────────────────────────────

export const onboardingService = {
  getStatus: () =>
    api.get('/onboarding/status').then((r) => r.data.data),

  saveProfile: (data: Record<string, unknown>) =>
    api.post('/onboarding/profile', data).then((r) => r.data),

  getProfile: () =>
    api.get('/onboarding/profile').then((r) => r.data.data),

  saveAddress: (data: Record<string, unknown>) =>
    api.post('/onboarding/address', data).then((r) => r.data),

  getAddresses: () =>
    api.get('/onboarding/address').then((r) => r.data.data),

  saveNominees: (nominees: unknown[]) =>
    api.post('/onboarding/nominees', { nominees }).then((r) => r.data),

  submitToNse: () =>
    api.post('/onboarding/nse-submit').then((r) => r.data),
};

// ─── KYC ──────────────────────────────────────────────────

export const kycService = {
  getStatus: () =>
    api.get('/onboarding/kyc/status').then((r) => r.data.data),

  checkKra: () =>
    api.post('/onboarding/kyc/check-kra').then((r) => r.data.data),

  submit: () =>
    api.post('/onboarding/kyc/submit').then((r) => r.data),
};

// ─── Bank Account ─────────────────────────────────────────

export const bankService = {
  getAccounts: () =>
    api.get('/bank').then((r) => r.data.data),

  addAccount: (data: {
    accountNumber: string
    ifscCode:      string
    bankName:      string
    accountHolder: string
    isDefault?:    boolean
  }) => api.post('/bank', data).then((r) => r.data),

  setDefault: (id: string) =>
    api.patch(`/bank/${id}/default`).then((r) => r.data),

  deleteAccount: (id: string) =>
    api.delete(`/bank/${id}`).then((r) => r.data),
};
