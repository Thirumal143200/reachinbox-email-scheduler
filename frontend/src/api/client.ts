import { User, EmailRecord, SlackStatus, SchedulePayload } from '../types/index.js';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
      if (data.message) errorMsg = data.message;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  auth: {
    getMe: () => request<{ user: User | null }>('/auth/me'),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  },
  emails: {
    schedule: (payload: SchedulePayload) =>
      request<{ message: string; count: number; emails: any[] }>('/emails/schedule', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getScheduled: () => request<{ emails: EmailRecord[] }>('/emails/scheduled'),
    getSent: () => request<{ emails: EmailRecord[] }>('/emails/sent'),
    search: (query: string, status?: string) => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (status) params.set('status', status);
      return request<{ total: number; results: EmailRecord[]; source: string }>(`/emails/search?${params.toString()}`);
    },
  },
  slack: {
    getStatus: () => request<SlackStatus>('/slack/status'),
    disconnect: () => request<{ message: string; connected: boolean }>('/slack/disconnect', { method: 'POST' }),
  },
};
