import axios from 'axios';
import type { 
  CalendarMatrixRequest, 
  CalendarMatrixResponse,
  Payment,
  PaymentCreate,
  Project,
  Contractor,
  BudgetCategory 
} from '@/types';

const api = axios.create({
  baseURL: '/api/v1',
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },
};

export const calendarApi = {
  getMatrix: async (request: CalendarMatrixRequest): Promise<CalendarMatrixResponse> => {
    const response = await api.post<CalendarMatrixResponse>('/calendar/matrix', request);
    return response.data;
  },

  createPlan: async (payment: PaymentCreate): Promise<Payment> => {
    const response = await api.post<Payment>('/calendar/plan', payment);
    return response.data;
  },

  updatePlan: async (paymentId: number, data: Partial<Payment>): Promise<Payment> => {
    const response = await api.patch<Payment>(`/calendar/plan/${paymentId}`, data);
    return response.data;
  },

  updateFact: async (paymentId: number, amount_fact: number): Promise<Payment> => {
    const response = await api.patch<Payment>(`/calendar/fact/${paymentId}`, { amount_fact });
    return response.data;
  },

  rollover: async (paymentId: number, target_period_start: string): Promise<Payment> => {
    const response = await api.post<Payment>('/calendar/rollover', {
      payment_id: paymentId,
      target_period_start,
    });
    return response.data;
  },

  lockPeriod: async (period_end: string): Promise<any> => {
    const response = await api.post('/calendar/lock-period', null, {
      params: { period_end },
    });
    return response.data;
  },
};

export const dictionaryApi = {
  getProjects: async (): Promise<Project[]> => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  },

  getContractors: async (): Promise<Contractor[]> => {
    const response = await api.get<Contractor[]>('/contractors');
    return response.data;
  },

  getCategories: async (): Promise<BudgetCategory[]> => {
    const response = await api.get<BudgetCategory[]>('/categories');
    return response.data;
  },
};

export default api;
