import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse } from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

class ApiClient {
  private token: string | null = null;

  async init() {
    this.token = await AsyncStorage.getItem('accessToken');
  }

  setToken(token: string) {
    this.token = token;
    AsyncStorage.setItem('accessToken', token);
  }

  clearToken() {
    this.token = null;
    AsyncStorage.removeItem('accessToken');
    AsyncStorage.removeItem('refreshToken');
    AsyncStorage.removeItem('user');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      // Try refresh — some backends return 403 on token expiry
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResp = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshResp.ok) {
            const data: AuthResponse = await refreshResp.json();
            this.setToken(data.accessToken);
            await AsyncStorage.setItem('refreshToken', data.refreshToken);
            headers['Authorization'] = `Bearer ${data.accessToken}`;
            const retryResp = await fetch(`${API_BASE}${path}`, { ...options, headers });
            if (!retryResp.ok) throw new Error(`API Error: ${retryResp.status}`);
            return retryResp.json();
          }
        } catch { /* fall through */ }
      }
      this.clearToken();
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // ── Auth ──
  login(username: string, password: string) {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // ── Form Templates ──
  getTemplates() { return this.request<any[]>('/forms/templates'); }
  getAllTemplates(page = 0, size = 50) { return this.request<any>(`/forms/templates/all?page=${page}&size=${size}`); }
  getTemplate(id: number) { return this.request<any>(`/forms/templates/${id}`); }
  getTemplatesByJourney(type: string) { return this.request<any[]>(`/forms/templates/journey/${type}`); }
  createTemplate(data: any) { return this.request<any>('/forms/templates', { method: 'POST', body: JSON.stringify(data) }); }
  updateTemplate(id: number, data: any) { return this.request<any>(`/forms/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  publishTemplate(id: number) { return this.request<any>(`/forms/templates/${id}/publish`, { method: 'POST' }); }
  setTemplateExpiry(id: number, expiresAt: string | null) { return this.request<any>(`/forms/templates/${id}/expire`, { method: 'POST', body: JSON.stringify({ expiresAt }) }); }
  getTemplateVersions(formCode: string) { return this.request<any[]>(`/forms/templates/versions/${formCode}`); }
  archiveTemplate(id: number) { return this.request<any>(`/forms/templates/${id}/archive`, { method: 'POST' }); }

  // ── Form Instances ──
  submitForm(data: any) { return this.request<any>('/forms/submit', { method: 'POST', body: JSON.stringify(data) }); }
  saveDraft(data: any) { return this.request<any>('/forms/draft', { method: 'POST', body: JSON.stringify(data) }); }
  getForm(id: number) { return this.request<any>(`/forms/${id}`); }
  getMyForms(page = 0, size = 20, status?: string) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    if (status) params.set('status', status);
    return this.request<any>(`/forms/my?${params.toString()}`);
  }
  getBranchForms(status?: string, page = 0, size = 20) {
    const params = status ? `&status=${status}` : '';
    return this.request<any>(`/forms/branch?page=${page}&size=${size}${params}`);
  }
  getApprovalHistory(formId: number) { return this.request<any[]>(`/forms/${formId}/approvals`); }

  // ── Workflows ──
  approveForm(formId: number, data: any) { return this.request<any>(`/workflows/${formId}/approve`, { method: 'PUT', body: JSON.stringify(data) }); }
  rejectForm(formId: number, data: any) { return this.request<any>(`/workflows/${formId}/reject`, { method: 'PUT', body: JSON.stringify(data) }); }
  returnForm(formId: number, data: any) { return this.request<any>(`/workflows/${formId}/return`, { method: 'PUT', body: JSON.stringify(data) }); }
  resubmitForm(formId: number, formData?: any) { return this.request<any>(`/workflows/${formId}/resubmit`, { method: 'POST', body: JSON.stringify(formData ? { formData } : {}) }); }
  getResubmissionInfo(formId: number) { return this.request<any>(`/workflows/${formId}/resubmission-info`); }
  getRejectionConfig(journeyType: string, amount?: number) {
    const params = new URLSearchParams({ journeyType });
    if (amount != null) params.set('amount', String(amount));
    return this.request<any>(`/workflows/rejection-config?${params.toString()}`);
  }
  getPendingQueue(role?: string, page = 0, size = 20) {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    params.set('page', String(page));
    params.set('size', String(size));
    return this.request<any>(`/workflows/queue?${params.toString()}`);
  }
  bulkApprove(formInstanceIds: number[], comments: string = '') { return this.request<any>('/workflows/bulk-approve', { method: 'POST', body: JSON.stringify({ formInstanceIds, comments }) }); }
  getWorkflowByForm(formId: number) { return this.request<any>(`/workflows/by-form/${formId}`); }
  claimForm(formId: number) { return this.request<any>(`/workflows/${formId}/claim`, { method: 'PUT' }); }
  releaseForm(formId: number) { return this.request<any>(`/workflows/${formId}/release`, { method: 'PUT' }); }
  getMyItems(page = 0, size = 20) { return this.request<any>(`/workflows/my-items?page=${page}&size=${size}`); }
  searchForms(params: { q?: string; journeyType?: string; status?: string; dateFrom?: string; dateTo?: string; page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.journeyType) query.set('journeyType', params.journeyType);
    if (params.status) query.set('status', params.status);
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    query.set('page', String(params.page || 0));
    query.set('size', String(params.size || 20));
    return this.request<any>(`/forms/search?${query.toString()}`);
  }

  // ── Workflow Rules ──
  getWorkflowRules(page = 0, size = 50) { return this.request<any>(`/workflows/rules?page=${page}&size=${size}`); }
  getAllWorkflowRules(page = 0, size = 50) { return this.request<any>(`/workflows/rules/all?page=${page}&size=${size}`); }
  createWorkflowRule(data: any) { return this.request<any>('/workflows/rules', { method: 'POST', body: JSON.stringify(data) }); }
  updateWorkflowRule(id: number, data: any) { return this.request<any>(`/workflows/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteWorkflowRule(id: number) { return this.request<void>(`/workflows/rules/${id}`, { method: 'DELETE' }); }

  // ── Admin ──
  getUsers(page = 0, size = 50) { return this.request<any>(`/admin/users?page=${page}&size=${size}`); }
  getRoles(page = 0, size = 50) { return this.request<any>(`/admin/roles?page=${page}&size=${size}`); }
  updateRole(id: number, data: any) { return this.request<any>(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  getThemes(page = 0, size = 50) { return this.request<any>(`/admin/themes?page=${page}&size=${size}`); }
  getActiveTheme() { return this.request<any>('/admin/themes/active'); }
  createTheme(data: any) { return this.request<any>('/admin/themes', { method: 'POST', body: JSON.stringify(data) }); }
  activateTheme(id: number) { return this.request<any>(`/admin/themes/${id}/activate`, { method: 'PUT' }); }
  getDashboard() { return this.request<any>('/admin/dashboard'); }

  // ── Audit ──
  getAuditLogs(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/audit?${query}`);
  }

  // ── Receipts ──
  getReceipt(formInstanceId: number) { return this.request<any>(`/receipts/${formInstanceId}`); }
}

export const api = new ApiClient();
export default api;
