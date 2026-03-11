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

    if (response.status === 401) {
      // Try refresh
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
  getAllTemplates() { return this.request<any[]>('/forms/templates/all'); }
  getTemplate(id: number) { return this.request<any>(`/forms/templates/${id}`); }
  getTemplatesByJourney(type: string) { return this.request<any[]>(`/forms/templates/journey/${type}`); }
  createTemplate(data: any) { return this.request<any>('/forms/templates', { method: 'POST', body: JSON.stringify(data) }); }
  updateTemplate(id: number, data: any) { return this.request<any>(`/forms/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  publishTemplate(id: number) { return this.request<any>(`/forms/templates/${id}/publish`, { method: 'POST' }); }

  // ── Form Instances ──
  submitForm(data: any) { return this.request<any>('/forms/submit', { method: 'POST', body: JSON.stringify(data) }); }
  saveDraft(data: any) { return this.request<any>('/forms/draft', { method: 'POST', body: JSON.stringify(data) }); }
  getForm(id: number) { return this.request<any>(`/forms/${id}`); }
  getMyForms(page = 0, size = 20) { return this.request<any>(`/forms/my?page=${page}&size=${size}`); }
  getBranchForms(status?: string, page = 0, size = 20) {
    const params = status ? `&status=${status}` : '';
    return this.request<any>(`/forms/branch?page=${page}&size=${size}${params}`);
  }
  getApprovalHistory(formId: number) { return this.request<any[]>(`/forms/${formId}/approvals`); }

  // ── Workflows ──
  approveForm(formId: number, data: any) { return this.request<any>(`/workflows/${formId}/approve`, { method: 'PUT', body: JSON.stringify(data) }); }
  rejectForm(formId: number, data: any) { return this.request<any>(`/workflows/${formId}/reject`, { method: 'PUT', body: JSON.stringify(data) }); }
  returnForm(formId: number, data: any) { return this.request<any>(`/workflows/${formId}/return`, { method: 'PUT', body: JSON.stringify(data) }); }
  getPendingQueue() { return this.request<any[]>('/workflows/queue'); }

  // ── Workflow Rules ──
  getWorkflowRules() { return this.request<any[]>('/workflows/rules'); }
  getAllWorkflowRules() { return this.request<any[]>('/workflows/rules/all'); }
  createWorkflowRule(data: any) { return this.request<any>('/workflows/rules', { method: 'POST', body: JSON.stringify(data) }); }
  updateWorkflowRule(id: number, data: any) { return this.request<any>(`/workflows/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteWorkflowRule(id: number) { return this.request<void>(`/workflows/rules/${id}`, { method: 'DELETE' }); }

  // ── Admin ──
  getUsers() { return this.request<any[]>('/admin/users'); }
  getRoles() { return this.request<any[]>('/admin/roles'); }
  updateRole(id: number, data: any) { return this.request<any>(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  getThemes() { return this.request<any[]>('/admin/themes'); }
  getActiveTheme() { return this.request<any>('/admin/themes/active'); }
  createTheme(data: any) { return this.request<any>('/admin/themes', { method: 'POST', body: JSON.stringify(data) }); }
  activateTheme(id: number) { return this.request<any>(`/admin/themes/${id}/activate`, { method: 'PUT' }); }
  getDashboard() { return this.request<any>('/admin/dashboard'); }

  // ── Audit ──
  getAuditLogs(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/audit?${query}`);
  }
}

export const api = new ApiClient();
export default api;
