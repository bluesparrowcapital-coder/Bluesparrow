import api from './api';

// ─── Types ────────────────────────────────────────────────

export interface Sip {
  id:                  string;
  userId:              string;
  fundId:              string;
  amount:              number;
  frequency:           string;
  sipDate:             number;
  startDate:           string;
  endDate:             string | null;
  nextExecutionDate:   string | null;
  nextDateFormatted:   string | null;
  installmentsDone:    number;
  totalInstallments:   number | null;
  totalInvested:       number;
  status:              'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
  createdAt:           string;
  fund: {
    schemeName: string;
    fundHouse:  string;
    category:   string;
    nav:        number | null;
  };
}

export interface Goal {
  id:            string;
  userId:        string;
  goalName:      string;
  targetAmount:  number;
  currentAmount: number;
  targetDate:    string;
  isCompleted:   boolean;
  linkedSipIds:  string[];
  progressPct:   number;
  daysLeft:      number;
  sipStats:      { activeSips: number; totalMonthly: number; totalInvested: number };
  createdAt:     string;
}

export interface AllocationItem {
  category: string;
  value:    number;
  pct:      number;
}

export interface PortfolioReturns {
  totalInvested:    number;
  totalCurrentVal:  number;
  absoluteReturn:   number;
  absoluteReturnPct: number;
  cagrPct:          number;
  chartData:        { month: string; value: number }[];
}

export interface Notification {
  id:        string;
  userId:    string;
  title:     string;
  body:      string;
  type:      string;
  isRead:    boolean;
  readAt:    string | null;
  createdAt: string;
}

// ─── SIP API ──────────────────────────────────────────────

export const sipService = {
  list: async (): Promise<Sip[]> => {
    const { data } = await api.get('/sip');
    return data.sips;
  },

  get: async (id: string): Promise<Sip> => {
    const { data } = await api.get(`/sip/${id}`);
    return data.sip;
  },

  create: async (payload: {
    fundId: string;
    amount: number;
    sipDate: number;
    startDate: string;
    frequency?: string;
    totalInstallments?: number;
    goalId?: string;
  }): Promise<Sip> => {
    const { data } = await api.post('/sip', payload);
    return data.sip;
  },

  pause:  async (id: string): Promise<Sip> => { const { data } = await api.patch(`/sip/${id}/pause`);  return data.sip; },
  resume: async (id: string): Promise<Sip> => { const { data } = await api.patch(`/sip/${id}/resume`); return data.sip; },
  cancel: async (id: string): Promise<Sip> => { const { data } = await api.patch(`/sip/${id}/cancel`); return data.sip; },
};

// ─── Goal API ─────────────────────────────────────────────

export const goalService = {
  list: async (): Promise<Goal[]> => {
    const { data } = await api.get('/goals');
    return data.goals;
  },

  get: async (id: string): Promise<Goal> => {
    const { data } = await api.get(`/goals/${id}`);
    return data.goal;
  },

  create: async (payload: { goalName: string; targetAmount: number; targetDate: string }): Promise<Goal> => {
    const { data } = await api.post('/goals', payload);
    return data.goal;
  },

  update: async (id: string, payload: Partial<{ goalName: string; targetAmount: number; targetDate: string }>): Promise<Goal> => {
    const { data } = await api.put(`/goals/${id}`, payload);
    return data.goal;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/goals/${id}`);
  },

  linkSip: async (goalId: string, sipId: string): Promise<Goal> => {
    const { data } = await api.post(`/goals/${goalId}/link-sip`, { sipId });
    return data.goal;
  },

  calculate: async (targetAmount: number, targetDate: string, expectedReturn = 12): Promise<{ monthlySip: number; months: number }> => {
    const { data } = await api.get('/goals/calculator', { params: { targetAmount, targetDate, expectedReturn } });
    return data;
  },
};

// ─── Analytics API ────────────────────────────────────────

export const analyticsService = {
  allocation: async (): Promise<{ allocation: AllocationItem[]; totalValue: number }> => {
    const { data } = await api.get('/analytics/allocation');
    return data;
  },

  returns: async (): Promise<PortfolioReturns> => {
    const { data } = await api.get('/analytics/returns');
    return data;
  },

  benchmarks: async (): Promise<{ benchmarks: any[] }> => {
    const { data } = await api.get('/analytics/benchmarks');
    return data;
  },

  sipSummary: async (): Promise<{
    total: number; active: number; paused: number; cancelled: number;
    monthlyCommitment: number; totalInstalled: number;
  }> => {
    const { data } = await api.get('/analytics/sip-summary');
    return data;
  },
};

// ─── Notifications API ────────────────────────────────────

export const notificationService = {
  list: async (page = 1, limit = 20): Promise<{ notifications: Notification[]; unread: number; pagination: any }> => {
    const { data } = await api.get('/notifications', { params: { page, limit } });
    return data;
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};
