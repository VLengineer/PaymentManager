export interface User {
  id: number;
  username: string;
  email: string;
  role: 'RP' | 'FIN_DIRECTOR' | 'ADMIN';
  is_active: boolean;
}

export interface Project {
  id: number;
  cfo_code: string;
  name: string;
  is_active: boolean;
}

export interface Contractor {
  id: number;
  name: string;
  inn?: string;
  is_active: boolean;
}

export interface BudgetCategory {
  id: number;
  name: string;
  category_type: 'INCOME' | 'EXPENSE';
  parent_id?: number;
  is_active: boolean;
}

export type PaymentStatus = 'DRAFT' | 'APPROVED' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export interface Payment {
  id: number;
  project_id: number;
  contractor_id: number;
  category_id: number;
  period_start: string;
  period_end?: string;
  amount_plan: number;
  amount_fact: number;
  amount_rollover: number;
  status: PaymentStatus;
  is_locked: boolean;
  parent_payment_id?: number;
  comment?: string;
  created_by?: number;
  updated_by?: number;
}

export interface PaymentCreate {
  project_id: number;
  contractor_id: number;
  category_id: number;
  period_start: string;
  amount_plan: number;
  comment?: string;
}

export interface CalendarMatrixCell {
  payment_id?: number;
  project_id: number;
  project_name: string;
  contractor_id: number;
  contractor_name: string;
  category_id: number;
  category_name: string;
  period_start: string;
  amount_plan: number;
  amount_fact: number;
  amount_rollover: number;
  status: PaymentStatus;
  is_locked: boolean;
}

export interface CalendarMatrixResponse {
  rows: CalendarMatrixCell[];
  columns: string[];
  totals: {
    by_column: Record<string, number>;
    by_row: Record<string, any>;
  };
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}
