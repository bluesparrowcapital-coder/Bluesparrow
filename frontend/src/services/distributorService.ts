import api from './api';

// ─── Types ────────────────────────────────────────────────

export interface DistributorProfile {
  id:          string;
  userId:      string;
  arnNumber:   string;
  euinNumber:  string | null;
  firmName:    string;
  isActive:    boolean;
  createdAt:   string;
  user: { fullName: string; email: string; phone: string; createdAt: string };
}

export interface DashboardStats {
  totalClients:        number;
  newClientsThisMonth: number;
  activeSipCount:      number;
  sipBookMonthlyValue: number;
  totalAUM:            number;
  totalInvested:       number;
  absoluteReturn:      number;
  returnPct:           number;
}

export interface DistributorClient {
  id:             string;
  fullName:       string;
  email:          string;
  phone:          string;
  panNumber:      string | null;
  kycStatus:      string;
  onboardingStep: string;
  createdAt:      string;
  aum:            number;
  invested:       number;
}

export interface CreatedDistributorClient {
  user: DistributorClient;
  tempPassword: string;
  nseResult?: {
    status?: string;
    message?: string;
    clientCode?: string | null;
    ekycLink?: string;
  } | null;
}

export interface DistributorClientDocuments {
  panDocument?: File | null;
  aadhaarDocument?: File | null;
  photoDocument?: File | null;
  signatureDocument?: File | null;
  bankProofDocument?: File | null;
}

export interface DistributorUccPayload {
  fullName: string;
  email: string;
  phone: string;
  panNumber: string;
  mobileDeclaration?: 'SELF' | 'FAMILY' | 'OTHER';
  mailDeclaration?: 'SELF' | 'FAMILY' | 'OTHER';
  profile: {
    fullNameAsPan: string;
    dob: string;
    gender: 'M' | 'F' | 'T';
    pepCategory?: 'NOT_EXPOSED' | 'PEP' | 'RELATED_PEP';
    countryOfBirth?: string;
    cityOfBirth?: string;
    fatherOrSpouseName: string;
    motherName?: string;
    placeOfBirth?: string;
    maritalStatus?: 'SINGLE' | 'MARRIED' | 'WIDOWED' | 'DIVORCED';
    holdingType?: 'SINGLE' | 'JOINT' | 'ANYONE_OR_SURVIVOR';
    occupation: 'BUSINESS' | 'SERVICE' | 'PROFESSIONAL' | 'AGRICULTURIST' | 'RETIRED' | 'HOUSEWIFE' | 'STUDENT' | 'OTHER';
    taxStatus: 'INDIVIDUAL' | 'NRI' | 'PIO' | 'HUF' | 'COMPANY' | 'PARTNERSHIP';
    annualIncome?: 'BELOW_1L' | '1L_TO_5L' | '5L_TO_10L' | '10L_TO_25L' | '25L_TO_50L' | '50L_TO_1CR' | 'ABOVE_1CR' | 'ABOVE_25L';
    isPep?: boolean;
    isRelatedToPep?: boolean;
  };
  address: {
    addressLine1: string;
    addressLine2?: string;
    addressLine3?: string;
    city: string;
    district?: string;
    state: string;
    pincode: string;
    country?: string;
    sourceOfWealth?: string;
  };
  banks: Array<{
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolder: string;
    accountType?: 'SB' | 'CA' | 'NRE' | 'NRO';
    isDefault?: boolean;
  }>;
  nominees: Array<{
    fullName: string;
    relationship: string;
    percentage: number;
    dob?: string;
    guardianName?: string;
    guardianRel?: string;
    docType?: 'AADHAAR' | 'PAN' | 'PASSPORT' | 'VOTER_ID' | 'DRIVING_LICENSE';
    docNumber?: string;
    email?: string;
    phone?: string;
  }>;
  verification?: {
    source?: string;
    sourceDetails?: string;
    termsAccepted?: boolean;
  };
}

export interface ClientDetail {
  user:       DistributorClient & { clientProfile: any; bankAccounts: any[] };
  portfolios: Array<{
    id: string; fundId: string; unitsHeld: number; avgNav: number;
    investedAmount: number; currentValue: number; folioNumber: string | null;
    fund: { schemeName: string; fundHouse: string; category: string; nav: number | null };
  }>;
  sips: Array<{
    id: string; amount: number; frequency: string; sipDate: number;
    status: string; installmentsDone: number;
    fund: { schemeName: string; category: string };
  }>;
  transactions: Array<{
    id: string; type: string; status: string; amount: number; units: number | null;
    txnDate: string;
    fund: { schemeName: string; fundHouse: string };
  }>;
  goals: Array<{ id: string; goalName: string; targetAmount: number; currentAmount: number; isCompleted: boolean }>;
  summary: { totalAUM: number; totalInvested: number; returnPct: number; activeSips: number };
}

export interface AumRow {
  category?: string; fundName?: string; fundHouse?: string;
  aum: number; invested: number; count?: number; folioCount?: number;
}

export interface SipReportSummary {
  active: number; paused: number; cancelled: number; completed: number; totalMonthly: number;
}

export interface ModelPortfolio {
  id:           string;
  distributorId: string;
  name:         string;
  description:  string | null;
  isActive:     boolean;
  createdAt:    string;
  _count:       { assignments: number };
  funds: Array<{
    id:            string;
    allocationPct: number;
    fund: { schemeName: string; fundHouse: string; category: string; nav: number | null };
  }>;
}

export interface AuditLog {
  id:           string;
  action:       string;
  entityType:   string;
  entityId:     string | null;
  details:      any;
  ipAddress:    string | null;
  createdAt:    string;
}

// ─── Distributor API ──────────────────────────────────────

export const distributorService = {
  // Profile
  getProfile: async (): Promise<DistributorProfile | null> => {
    const { data } = await api.get('/distributor/profile');
    return data.profile;
  },
  upsertProfile: async (payload: { arnNumber: string; euinNumber?: string; firmName: string }): Promise<DistributorProfile> => {
    const { data } = await api.post('/distributor/profile', payload);
    return data.profile;
  },

  // Dashboard
  getDashboard: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/distributor/dashboard');
    return data.stats;
  },

  // Clients
  listClients: async (search?: string, page = 1, limit = 20): Promise<{ clients: DistributorClient[]; total: number }> => {
    const { data } = await api.get('/distributor/clients', { params: { search, page, limit } });
    return { clients: data.clients, total: data.total };
  },
  createClient: async (payload: DistributorUccPayload, documents?: DistributorClientDocuments): Promise<CreatedDistributorClient> => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));

    Object.entries(documents ?? {}).forEach(([field, file]) => {
      if (file) formData.append(field, file);
    });

    const { data } = await api.post('/distributor/clients', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { user: data.user, tempPassword: data.tempPassword, nseResult: data.nseResult };
  },
  getClientDetail: async (clientId: string): Promise<ClientDetail> => {
    const { data } = await api.get(`/distributor/clients/${clientId}`);
    return data;
  },

  // Reports
  getAumReport: async (groupBy: 'category' | 'fund' = 'category'): Promise<AumRow[]> => {
    const { data } = await api.get('/distributor/reports/aum', { params: { groupBy } });
    return data.data;
  },
  getSipReport: async (status?: string): Promise<{ sips: any[]; summary: SipReportSummary }> => {
    const { data } = await api.get('/distributor/reports/sip', { params: { status } });
    return { sips: data.sips, summary: data.summary };
  },
  getMonthlySummary: async (): Promise<any> => {
    const { data } = await api.get('/distributor/reports/monthly');
    return data;
  },

  // Model Portfolios
  listModelPortfolios: async (): Promise<ModelPortfolio[]> => {
    const { data } = await api.get('/distributor/model-portfolios');
    return data.portfolios;
  },
  createModelPortfolio: async (payload: {
    name: string; description?: string;
    funds: { fundId: string; allocationPct: number }[];
  }): Promise<ModelPortfolio> => {
    const { data } = await api.post('/distributor/model-portfolios', payload);
    return data.portfolio;
  },
  updateModelPortfolio: async (id: string, payload: { name?: string; description?: string; isActive?: boolean }): Promise<ModelPortfolio> => {
    const { data } = await api.put(`/distributor/model-portfolios/${id}`, payload);
    return data.portfolio;
  },
  deleteModelPortfolio: async (id: string): Promise<void> => {
    await api.delete(`/distributor/model-portfolios/${id}`);
  },
  assignModelPortfolio: async (id: string, userId: string): Promise<void> => {
    await api.post(`/distributor/model-portfolios/${id}/assign`, { userId });
  },

  // Audit Logs
  getAuditLogs: async (page = 1, limit = 50): Promise<{ logs: AuditLog[]; total: number }> => {
    const { data } = await api.get('/distributor/audit-logs', { params: { page, limit } });
    return { logs: data.logs, total: data.total };
  },

  // KYC Utilities
  checkPanKyc: async (pan: string): Promise<{
    serviceDown: boolean;
    pan?: string; name?: string;
    kycStatus: 'S' | 'F' | null;
    kycStatusRemark?: string;
    kraName?: string;
    isVerified: boolean;
  }> => {
    const { data } = await api.post('/distributor/kyc/check-pan', { pan_no: pan });
    return { serviceDown: data.serviceDown ?? false, ...data.data };
  },
};
