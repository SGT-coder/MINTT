const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
  };
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  last_login: string;
  phone?: string;
  department?: string;
}

export interface SignupData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirm: string;
  company?: string;
  role?: string;
}

export interface Case {
  id: number;
  case_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  source: string;
  customer: string;
  company?: string;
  assigned_to?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  created_by: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  due_date?: string;
  sla_hours: number;
  first_response_time?: string;
  resolution_time?: string;
  tags: string[];
  email_thread_id?: string;
  last_email_sent?: string;
  responses: CaseResponse[];
  attachments: CaseAttachment[];
  is_overdue: boolean;
  priority_score: number;
  sla_breach: boolean;
  response_count: number;
}

export interface NotificationResponse {
  email_sent: boolean;
  sms_sent: boolean;
}

export interface CaseResponse {
  id: number;
  case: number;
  author: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  response_type: string;
  content: string;
  is_internal: boolean;
  email_message_id?: string;
  email_subject?: string;
  email_from?: string;
  email_to?: string;
  email_cc?: string;
  email_sent: boolean;
  created_at: string;
  updated_at: string;
  attachments: CaseAttachment[];
}

export interface CaseAttachment {
  id: number;
  file: string;
  filename: string;
  file_size: number;
  mime_type: string;
  uploaded_by: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  uploaded_at: string;
}

export interface CreateCaseData {
  title: string;
  description: string;
  category: string;
  priority: string;
  source?: string;
  customer: number; // Contact ID
  company?: number; // Company ID
  assigned_to?: number; // User ID
  due_date?: string;
  sla_hours?: number;
  tags?: string[];
}

export interface CreateCaseResponseData {
  case: number;
  response_type: string;
  content: string;
  is_internal: boolean;
  email_subject?: string;
  email_to?: string;
  email_cc?: string;
}

export interface UpdateCaseData {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  source?: string;
  assigned_to?: number;
  due_date?: string;
  sla_hours?: number;
  tags?: string[];
}

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile?: string;
  company?: {
    id: number;
    name: string;
  };
  job_title: string;
  department: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  notes?: string;
  is_customer: boolean;
  is_prospect: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: number;
  name: string;
  industry: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  is_customer: boolean;
  created_at: string;
  updated_at: string;
}

export interface Email {
  id: number;
  email_type: 'inbound' | 'outbound' | 'system';
  status: 'draft' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
  subject: string;
  from_email: string;
  to_email: string;
  cc_emails: string;
  bcc_emails: string;
  html_content: string;
  text_content: string;
  template?: {
    id: number;
    name: string;
    template_type: string;
  };
  case?: string;
  user?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  message_id: string;
  thread_id: string;
  reply_to: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error_message: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  attachments: EmailAttachment[];
  logs: EmailLog[];
  is_sent: boolean;
  is_failed: boolean;
  can_retry: boolean;
  // Frontend-specific fields
  starred?: boolean;
  archived?: boolean;
  read?: boolean;
  priority?: string;
}

export interface EmailAttachment {
  id: number;
  file: string;
  filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

export interface EmailLog {
  id: number;
  email: number;
  event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  data: any;
}

export interface EmailTemplate {
  id: number;
  name: string;
  template_type: string;
  subject: string;
  html_content: string;
  text_content: string;
  variables: any;
  is_active: boolean;
  created_by: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateEmailData {
  subject: string;
  to_email: string;
  cc_emails?: string;
  bcc_emails?: string;
  html_content?: string;
  text_content?: string;
  template_id?: number;
  case_id?: number;
  context?: any;
  from_email?: string; // <-- add this line
}

export interface SendEmailData {
  template_id?: number;
  subject: string;
  to_email: string;
  cc_emails?: string;
  bcc_emails?: string;
  html_content?: string;
  text_content?: string;
  case_id?: number;
  context?: any;
}

export interface EmailStats {
  total_emails: number;
  sent_emails: number;
  delivered_emails: number;
  failed_emails: number;
  bounced_emails: number;
  by_type: Array<{ email_type: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
}

export interface UserEmailConfig {
  id: number;
  user: User;
  provider: string;
  provider_display: string;
  email_address: string;
  display_name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  use_tls: boolean;
  use_ssl: boolean;
  imap_host: string;
  imap_port: number;
  imap_username: string;
  imap_password: string;
  use_imap_ssl: boolean;
  oauth_access_token: string;
  oauth_refresh_token: string;
  oauth_expires_at: string;
  is_active: boolean;
  is_verified: boolean;
  last_sync: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserEmailConfigData {
  provider: string;
  email_address: string;
  display_name?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  use_tls: boolean;
  use_ssl: boolean;
  imap_host?: string;
  imap_port?: number;
  imap_username?: string;
  imap_password?: string;
  use_imap_ssl?: boolean;
}

export interface EmailProvider {
  value: string;
  label: string;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
  use_tls: boolean;
  use_ssl: boolean;
}

export interface SMS {
  id: number;
  sms_type: 'inbound' | 'outbound' | 'system';
  status: 'draft' | 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  message: string;
  from_number: string;
  to_number: string;
  template?: {
    id: number;
    name: string;
    template_type: string;
  };
  case?: string;
  user?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  contact?: string;
  message_id: string;
  conversation_id: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  logs: SMSLog[];
  is_sent: boolean;
  is_failed: boolean;
  can_retry: boolean;
  // Frontend-specific fields
  starred?: boolean;
  archived?: boolean;
  read?: boolean;
}

export interface SMSLog {
  id: number;
  sms: number;
  event: 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered';
  timestamp: string;
  data: any;
}

export interface SMSTemplate {
  id: number;
  name: string;
  template_type: string;
  message: string;
  variables: any;
  is_active: boolean;
  created_by: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateSMSData {
  message: string;
  to_number: string;
  from_number?: string;
  template_id?: number;
  case_id?: number;
  contact_id?: number;
}

export interface SendSMSData {
  template_id?: number;
  message: string;
  to_number: string;
  from_number?: string;
  case_id?: number;
  contact_id?: number;
  context?: any;
}

export interface SMSStats {
  total_sms: number;
  sent_sms: number;
  delivered_sms: number;
  failed_sms: number;
  undelivered_sms: number;
  by_type: Array<{ sms_type: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
}

export interface UserSMSConfig {
  id: number;
  user: User;
  provider: string;
  provider_display: string;
  account_sid: string;
  auth_token: string;
  api_key: string;
  api_secret: string;
  from_number: string;
  webhook_url: string;
  is_active: boolean;
  is_verified: boolean;
  last_sync: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserSMSConfigData {
  provider: string;
  account_sid?: string;
  auth_token?: string;
  api_key?: string;
  api_secret?: string;
  from_number?: string;
  webhook_url?: string;
}

export interface SMSProvider {
  value: string;
  label: string;
  fields: any[];
}

// Meeting Types
export interface Meeting {
  id: number;
  title: string;
  description: string;
  meeting_type: 'internal' | 'client' | 'sales' | 'support' | 'training' | 'review' | 'other';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_time: string;
  end_time: string;
  timezone: string;
  all_day: boolean;
  location: string;
  location_type: 'physical' | 'virtual' | 'hybrid';
  meeting_url: string;
  organizer: User;
  attendees: User[];
  category: MeetingCategory | null;
  case: string | null;
  contact: string | null;
  company: string | null;
  is_recurring: boolean;
  recurrence_rule: any;
  parent_meeting: number | null;
  reminder_minutes: number;
  send_reminders: boolean;
  agenda: string;
  notes: string;
  outcome: string;
  is_active: boolean;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  attendances: MeetingAttendance[];
  reminders: MeetingReminder[];
  duration_minutes: number;
  is_past: boolean;
  is_ongoing: boolean;
  is_upcoming: boolean;
  is_today: boolean;
}

export interface MeetingCategory {
  id: number;
  name: string;
  color: string;
  description: string;
  is_active: boolean;
  created_by: User;
  created_at: string;
}

export interface MeetingAttendance {
  id: number;
  meeting: number;
  user: User;
  status: 'invited' | 'accepted' | 'declined' | 'tentative' | 'attended' | 'no_show';
  responded_at: string | null;
  response_notes: string;
  joined_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingReminder {
  id: number;
  meeting: number;
  user: User;
  reminder_type: 'email' | 'sms' | 'push' | 'calendar';
  scheduled_for: string;
  sent_at: string | null;
  is_sent: boolean;
  created_at: string;
}

export interface MeetingTemplate {
  id: number;
  name: string;
  description: string;
  meeting_type: string;
  duration_minutes: number;
  category: MeetingCategory | null;
  default_title: string;
  default_description: string;
  default_agenda: string;
  default_reminder_minutes: number;
  default_location_type: string;
  created_by: User;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarIntegration {
  id: number;
  user: User;
  provider: 'google' | 'outlook' | 'ical' | 'other';
  provider_display: string;
  is_active: boolean;
  sync_meetings: boolean;
  sync_availability: boolean;
  last_sync: string | null;
  sync_errors: any[];
  created_at: string;
  updated_at: string;
}

export interface MeetingStats {
  total_meetings: number;
  upcoming_meetings: number;
  today_meetings: number;
  past_meetings: number;
  by_status: Array<{ status: string; count: number }>;
  by_type: Array<{ meeting_type: string; count: number }>;
  by_priority: Array<{ priority: string; count: number }>;
}

export interface MeetingSearchParams {
  search?: string;
  start_date?: string;
  end_date?: string;
  meeting_type?: string;
  status?: string;
  priority?: string;
  organizer?: number;
  attendee?: number;
  category?: number;
  case?: number;
  contact?: number;
  company?: number;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const isFormData = options.body instanceof FormData;
    const config: RequestInit = {
      headers: {
        ...options.headers,
      },
      ...options,
    };
    if (!isFormData) {
      config.headers = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
    }

    // Add auth token if available
    const token = this.getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      // Handle empty responses first
      const text = await response.text();
      
      if (!response.ok) {
        console.error(`API Error ${response.status}: ${text}`);
        // Try to parse error as JSON for better error messages
        let errorMessage = `API Error ${response.status}: ${response.statusText}`;
        try {
          if (text) {
            const errorData = JSON.parse(text);
            if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else if (typeof errorData === 'object') {
              // Handle field-specific errors
              const fieldErrors = Object.entries(errorData)
                .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                .join('; ');
              errorMessage = fieldErrors || errorMessage;
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, use the text as is
          errorMessage = text || errorMessage;
        }
        // Provide more user-friendly error messages for common HTTP status codes
        if (response.status === 401) {
          errorMessage = "Authentication required. Please log in again.";
        } else if (response.status === 403) {
          errorMessage = "You don't have permission to perform this action.";
        } else if (response.status === 404) {
          errorMessage = "The requested resource was not found.";
        } else if (response.status === 422) {
          errorMessage = "Invalid data provided. Please check your input.";
        } else if (response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (response.status === 502 || response.status === 503 || response.status === 504) {
          errorMessage = "Service temporarily unavailable. Please try again later.";
        }
        throw new Error(errorMessage);
      }

      // Only parse as JSON if content-type is application/json
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        if (!text) return {} as T;
        return JSON.parse(text);
      } else {
        // For uploads or non-JSON, just return an empty object or the text
        return {} as T;
      }
    } catch (error) {
      console.error('API Request failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/token/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store tokens
    this.setToken(response.access);
    this.setRefreshToken(response.refresh);

    return response;
  }

  async logout(): Promise<void> {
    this.removeToken();
    this.removeRefreshToken();
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/users/me/');
  }

  async refreshToken(): Promise<{ access: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<{ access: string }>('/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });

    this.setToken(response.access);
    return response;
  }

  async signup(data: SignupData): Promise<any> {
    // Use the dedicated signup endpoint
    return this.request('/users/signup/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Token management
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  private setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  }

  private removeRefreshToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refresh_token');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Get token for external use
  getAuthToken(): string | null {
    return this.getToken();
  }

  // Case Management Methods
  async getCases(params?: {
    status?: string;
    priority?: string;
    category?: string;
    assigned_to?: number;
    search?: string;
    ordering?: string;
  }): Promise<{ results: Case[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
    }
    
    const endpoint = `/cases/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getCase(caseId: number): Promise<Case> {
    return this.request(`/cases/${caseId}/`);
  }

  async createCase(data: CreateCaseData): Promise<Case> {
    return this.request('/cases/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCase(caseId: number, data: UpdateCaseData): Promise<Case> {
    return this.request(`/cases/${caseId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCase(caseId: number): Promise<void> {
    return this.request(`/cases/${caseId}/`, {
      method: 'DELETE',
    });
  }

  async assignCase(caseId: number, assignedTo: number, reason?: string): Promise<Case & { notifications?: NotificationResponse }> {
    return this.request(`/cases/${caseId}/assign/`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to: assignedTo, reason }),
    });
  }

  async updateCasePriority(caseId: number, priority: string, reason?: string): Promise<Case> {
    return this.request(`/cases/${caseId}/update_priority/`, {
      method: 'POST',
      body: JSON.stringify({ priority, reason }),
    });
  }

  async updateCaseStatus(caseId: number, status: string, note?: string): Promise<Case & { notifications?: NotificationResponse }> {
    return this.request(`/cases/${caseId}/update_status/`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    });
  }

  async escalateCase(caseId: number): Promise<Case & { notifications?: NotificationResponse }> {
    return this.request(`/cases/${caseId}/escalate/`, {
      method: 'POST',
    });
  }

  async getCaseResponses(caseId: number): Promise<CaseResponse[]> {
    return this.request(`/case-responses/?case=${caseId}`);
  }

  async createCaseResponse(data: CreateCaseResponseData): Promise<CaseResponse> {
    return this.request('/case-responses/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCaseStats(params?: { days?: number }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.days) queryParams.append('days', params.days.toString());
    
    const endpoint = `/cases/dashboard_stats/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getMyCases(): Promise<{ results: Case[]; count: number }> {
    return this.request('/cases/my_cases/');
  }

  async getUrgentCases(): Promise<Case[]> {
    return this.request('/cases/urgent_cases/');
  }

  // Contact Management Methods
  async getContacts(params?: {
    search?: string;
    is_customer?: boolean;
    company?: number;
  }): Promise<{ results: Contact[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const endpoint = `/contacts/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getContact(contactId: number): Promise<Contact> {
    return this.request(`/contacts/${contactId}/`);
  }

  async createContact(data: Partial<Contact>): Promise<Contact> {
    return this.request('/contacts/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContact(contactId: number, data: Partial<Contact>): Promise<Contact> {
    return this.request(`/contacts/${contactId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteContact(contactId: number): Promise<void> {
    return this.request(`/contacts/${contactId}/`, {
      method: 'DELETE',
    });
  }

  // Company Management Methods
  async getCompanies(params?: {
    search?: string;
    is_customer?: boolean;
    industry?: string;
  }): Promise<{ results: Company[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const endpoint = `/companies/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getCompany(companyId: number): Promise<Company> {
    return this.request(`/companies/${companyId}/`);
  }

  async createCompany(data: Partial<Company>): Promise<Company> {
    return this.request('/companies/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(companyId: number, data: Partial<Company>): Promise<Company> {
    return this.request(`/companies/${companyId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(companyId: number): Promise<void> {
    return this.request(`/companies/${companyId}/`, {
      method: 'DELETE',
    });
  }

  // Email Management Methods
  async getEmails(params?: {
    email_type?: string;
    status?: string;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: Email[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
    }
    
    const endpoint = `/emails/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getEmail(emailId: number): Promise<Email> {
    return this.request(`/emails/${emailId}/`);
  }

  async createEmail(data: CreateEmailData): Promise<Email> {
    return this.request('/emails/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmail(emailId: number, data: Partial<CreateEmailData>): Promise<Email> {
    return this.request(`/emails/${emailId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async sendEmail(data: SendEmailData): Promise<{ message: string; email: Email }> {
    return this.request('/emails/send_email/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async retryEmail(emailId: number): Promise<{ message: string }> {
    return this.request(`/emails/${emailId}/retry/`, {
      method: 'POST',
    });
  }

  async getEmailStats(params?: { days?: number }): Promise<EmailStats> {
    const queryParams = new URLSearchParams();
    if (params?.days) queryParams.append('days', params.days.toString());
    
    const endpoint = `/emails/stats/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Email Template Management Methods
  async getEmailTemplates(params?: {
    template_type?: string;
    is_active?: boolean;
    search?: string;
    ordering?: string;
  }): Promise<{ results: EmailTemplate[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const endpoint = `/email-templates/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getEmailTemplate(templateId: number): Promise<EmailTemplate> {
    return this.request(`/email-templates/${templateId}/`);
  }

  async createEmailTemplate(data: {
    name: string;
    template_type: string;
    subject: string;
    html_content: string;
    text_content: string;
    variables?: any;
    is_active?: boolean;
  }): Promise<EmailTemplate> {
    return this.request('/email-templates/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmailTemplate(templateId: number, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    return this.request(`/email-templates/${templateId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmailTemplate(templateId: number): Promise<void> {
    return this.request(`/email-templates/${templateId}/`, {
      method: 'DELETE',
    });
  }

  async renderEmailTemplate(templateId: number, context: any): Promise<{
    subject: string;
    html_content: string;
    text_content: string;
  }> {
    return this.request(`/email-templates/${templateId}/render/`, {
      method: 'POST',
      body: JSON.stringify({ context }),
    });
  }

  async sendTestEmail(templateId: number, context: any, testEmail?: string): Promise<{
    message: string;
    email: Email;
  }> {
    return this.request(`/email-templates/${templateId}/send_test/`, {
      method: 'POST',
      body: JSON.stringify({ context, test_email: testEmail }),
    });
  }

  async getEmailTemplatesByType(templateType?: string): Promise<Array<{ template_type: string; count: number }>> {
    const queryParams = new URLSearchParams();
    if (templateType) queryParams.append('type', templateType);
    
    const endpoint = `/email-templates/by_type/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Inbox-specific methods
  async getInboxEmails(params?: {
    search?: string;
    filter?: 'all' | 'unread' | 'starred' | 'high';
    ordering?: string;
  }): Promise<{ results: Email[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
    }
    
    // Filter for inbound emails by default
    queryParams.append('email_type', 'inbound');
    
    const endpoint = `/emails/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getSentEmails(params?: {
    search?: string;
    ordering?: string;
  }): Promise<{ results: Email[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
    }
    
    // Filter for outbound emails
    queryParams.append('email_type', 'outbound');
    
    const endpoint = `/emails/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getDraftEmails(): Promise<{ results: Email[]; count: number }> {
    return this.request('/emails/?status=draft&email_type=outbound');
  }

  async markEmailAsRead(emailId: number): Promise<Email> {
    return this.request(`/emails/${emailId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'read' }),
    });
  }

  async markEmailAsUnread(emailId: number): Promise<Email> {
    return this.request(`/emails/${emailId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'unread' }),
    });
  }

  async starEmail(emailId: number): Promise<Email> {
    return this.request(`/emails/${emailId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ starred: true }),
    });
  }

  async unstarEmail(emailId: number): Promise<Email> {
    return this.request(`/emails/${emailId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ starred: false }),
    });
  }

  async archiveEmail(emailId: number): Promise<Email> {
    return this.request(`/emails/${emailId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: true }),
    });
  }

  async deleteEmail(emailId: number): Promise<void> {
    return this.request(`/emails/${emailId}/`, {
      method: 'DELETE',
    });
  }

  async replyToEmail(emailId: number, replyData: {
    subject: string;
    content: string;
    html_content?: string;
    cc_emails?: string;
    bcc_emails?: string;
  }): Promise<{ message: string; email: Email }> {
    return this.request(`/emails/${emailId}/reply/`, {
      method: 'POST',
      body: JSON.stringify(replyData),
    });
  }

  async forwardEmail(emailId: number, forwardData: {
    to_email: string;
    subject: string;
    message?: string;
    cc_emails?: string;
    bcc_emails?: string;
  }): Promise<{ message: string; email: Email }> {
    return this.request(`/emails/${emailId}/forward/`, {
      method: 'POST',
      body: JSON.stringify(forwardData),
    });
  }

  async createCaseFromEmail(emailId: number, caseData: {
    title: string;
    description: string;
    category: string;
    priority: string;
    customer: number;
    company?: number;
    assigned_to?: number;
  }): Promise<{ message: string; case: Case; email: Email }> {
    return this.request(`/emails/${emailId}/create_case/`, {
      method: 'POST',
      body: JSON.stringify(caseData),
    });
  }

  async getUsers(params?: {
    search?: string;
    role?: string;
    page?: number;
    ordering?: string;
  }): Promise<{ results: User[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") queryParams.append(key, value.toString());
      });
    }
    const endpoint = `/users/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return this.request(endpoint);
  }

  async updateUser(userId: number, data: Partial<User>): Promise<User> {
    return this.request(`/users/${userId}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: number): Promise<void> {
    return this.request(`/users/${userId}/`, {
      method: "DELETE" });
  }

  // User Email Configuration methods
  async getUserEmailConfigs(): Promise<{ results: UserEmailConfig[]; count: number }> {
    return this.request<{ results: UserEmailConfig[]; count: number }>('/email-configs/');
  }

  async getUserEmailConfig(configId: number): Promise<UserEmailConfig> {
    return this.request<UserEmailConfig>(`/email-configs/${configId}/`);
  }

  async createUserEmailConfig(data: CreateUserEmailConfigData): Promise<UserEmailConfig> {
    return this.request<UserEmailConfig>('/email-configs/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async updateUserEmailConfig(configId: number, data: Partial<CreateUserEmailConfigData>): Promise<UserEmailConfig> {
    return this.request<UserEmailConfig>(`/email-configs/${configId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async deleteUserEmailConfig(configId: number): Promise<void> {
    return this.request<void>(`/email-configs/${configId}/`, {
      method: 'DELETE',
    });
  }

  async testEmailConfig(configId: number, testType: 'smtp' | 'imap' | 'both'): Promise<{
    message: string;
    results: Record<string, { status: string; message: string }>;
  }> {
    return this.request<{
      message: string;
      results: Record<string, { status: string; message: string }>;
    }>(`/email-configs/${configId}/test_connection/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test_type: testType }),
    });
  }

  async verifyEmailConfig(configId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/email-configs/${configId}/verify/`, {
      method: 'POST',
    });
  }

  async getEmailProviders(): Promise<EmailProvider[]> {
    return this.request<EmailProvider[]>('/email-configs/providers/');
  }

  // SMS methods
  async getSMS(params?: {
    sms_type?: string;
    status?: string;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: SMS[]; count: number }> {
    const queryParams = new URLSearchParams()
    
    if (params?.sms_type) queryParams.append('sms_type', params.sms_type)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.ordering) queryParams.append('ordering', params.ordering)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    
    return this.request<{ results: SMS[]; count: number }>(`/sms/?${queryParams.toString()}`)
  }

  async getSMSMessage(smsId: number): Promise<SMS> {
    return this.request<SMS>(`/sms/${smsId}/`)
  }

  async createSMS(data: CreateSMSData): Promise<SMS> {
    return this.request<SMS>('/sms/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  async sendSMS(data: SendSMSData): Promise<{ message: string; sms: SMS }> {
    return this.request<{ message: string; sms: SMS }>('/sms/send_sms/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  async retrySMS(smsId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/sms/${smsId}/retry/`, {
      method: 'POST',
    })
  }

  async getSMSStats(params?: { days?: number }): Promise<SMSStats> {
    const queryParams = new URLSearchParams()
    if (params?.days) queryParams.append('days', params.days.toString())
    
    return this.request<SMSStats>(`/sms/stats/?${queryParams.toString()}`)
  }

  async getSMSTemplates(params?: {
    template_type?: string;
    is_active?: boolean;
    search?: string;
    ordering?: string;
  }): Promise<{ results: SMSTemplate[]; count: number }> {
    const queryParams = new URLSearchParams()
    
    if (params?.template_type) queryParams.append('template_type', params.template_type)
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.ordering) queryParams.append('ordering', params.ordering)
    
    return this.request<{ results: SMSTemplate[]; count: number }>(`/sms-templates/?${queryParams.toString()}`)
  }

  async getSMSTemplate(templateId: number): Promise<SMSTemplate> {
    return this.request<SMSTemplate>(`/sms-templates/${templateId}/`)
  }

  async createSMSTemplate(data: {
    name: string;
    template_type: string;
    message: string;
    variables?: any;
    is_active?: boolean;
  }): Promise<SMSTemplate> {
    return this.request<SMSTemplate>('/sms-templates/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  async updateSMSTemplate(templateId: number, data: Partial<SMSTemplate>): Promise<SMSTemplate> {
    return this.request<SMSTemplate>(`/sms-templates/${templateId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  async deleteSMSTemplate(templateId: number): Promise<void> {
    return this.request<void>(`/sms-templates/${templateId}/`, {
      method: 'DELETE',
    })
  }

  async renderSMSTemplate(templateId: number, context: any): Promise<{
    message: string;
    template: SMSTemplate;
  }> {
    return this.request<{
      message: string;
      template: SMSTemplate;
    }>(`/sms-templates/${templateId}/render/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context }),
    })
  }

  async sendTestSMS(templateId: number, context: any, testNumber: string): Promise<{
    message: string;
    sms: SMS;
  }> {
    return this.request<{
      message: string;
      sms: SMS;
    }>(`/sms-templates/${templateId}/send_test/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context, test_number: testNumber }),
    })
  }

  async getSMSTemplatesByType(templateType?: string): Promise<Array<{ template_type: string; count: number }>> {
    const queryParams = new URLSearchParams()
    if (templateType) queryParams.append('template_type', templateType)
    
    return this.request<Array<{ template_type: string; count: number }>>(`/sms-templates/by_type/?${queryParams.toString()}`)
  }

  // User SMS Configuration methods
  async getUserSMSConfigs(): Promise<{ results: UserSMSConfig[]; count: number }> {
    return this.request<{ results: UserSMSConfig[]; count: number }>('/sms-configs/');
  }

  async getUserSMSConfig(configId: number): Promise<UserSMSConfig> {
    return this.request<UserSMSConfig>(`/sms-configs/${configId}/`);
  }

  async createUserSMSConfig(data: CreateUserSMSConfigData): Promise<UserSMSConfig> {
    return this.request<UserSMSConfig>('/sms-configs/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  async updateUserSMSConfig(configId: number, data: Partial<CreateUserSMSConfigData>): Promise<UserSMSConfig> {
    return this.request<UserSMSConfig>(`/sms-configs/${configId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  async deleteUserSMSConfig(configId: number): Promise<void> {
    return this.request<void>(`/sms-configs/${configId}/`, {
      method: 'DELETE',
    })
  }

  async testSMSConfig(configId: number, testNumber: string): Promise<{
    message: string;
    test_sms: SMS;
  }> {
    return this.request<{
      message: string;
      test_sms: SMS;
    }>(`/sms-configs/${configId}/test_connection/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test_number: testNumber }),
    })
  }

  async verifySMSConfig(configId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/sms-configs/${configId}/verify/`, {
      method: 'POST',
    })
  }

  async getSMSProviders(): Promise<SMSProvider[]> {
    return this.request<SMSProvider[]>('/sms-configs/providers/');
  }

  // Meeting API Methods
  async getMeetings(params?: any): Promise<{ results: Meeting[]; count: number }> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<{ results: Meeting[]; count: number }>(`/meetings/${queryString}`);
    return response;
  }

  async getMeeting(id: number): Promise<Meeting> {
    const response = await this.request<Meeting>(`/meetings/${id}/`);
    return response;
  }

  async createMeeting(data: any): Promise<Meeting> {
    const response = await this.request<Meeting>('/meetings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateMeeting(id: number, data: any): Promise<Meeting> {
    const response = await this.request<Meeting>(`/meetings/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteMeeting(id: number): Promise<void> {
    await this.request(`/meetings/${id}/`, {
      method: 'DELETE',
    });
  }

  // Meeting actions
  async joinMeeting(id: number): Promise<any> {
    const response = await this.request<any>(`/meetings/${id}/join/`);
    return response;
  }

  async leaveMeeting(id: number): Promise<any> {
    const response = await this.request<any>(`/meetings/${id}/leave/`);
    return response;
  }

  async completeMeeting(id: number): Promise<any> {
    const response = await this.request<any>(`/meetings/${id}/complete/`);
    return response;
  }

  async cancelMeeting(id: number): Promise<any> {
    const response = await this.request<any>(`/meetings/${id}/cancel/`);
    return response;
  }

  // Get today's meetings
  async getTodayMeetings(): Promise<Meeting[]> {
    const response = await this.request<Meeting[]>(`/meetings/today/`);
    return response;
  }

  // Get upcoming meetings
  async getUpcomingMeetings(): Promise<Meeting[]> {
    const response = await this.request<Meeting[]>(`/meetings/upcoming/`);
    return response;
  }

  // Get past meetings
  async getPastMeetings(): Promise<Meeting[]> {
    const response = await this.request<Meeting[]>(`/meetings/past/`);
    return response;
  }

  // Get meeting statistics
  async getMeetingStats(): Promise<MeetingStats> {
    const response = await this.request<MeetingStats>(`/meetings/stats/`);
    return response;
  }

  // Search meetings
  async searchMeetings(params: MeetingSearchParams): Promise<{ results: Meeting[]; count: number }> {
    const response = await this.request<{ results: Meeting[]; count: number }>(`/meetings/search/`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response;
  }

  // Meeting Category API Methods
  async getCategories(params?: any): Promise<{ results: MeetingCategory[]; count: number }> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<{ results: MeetingCategory[]; count: number }>(`/meeting-categories/${queryString}`);
    return response;
  }

  async getCategory(id: number): Promise<MeetingCategory> {
    const response = await this.request<MeetingCategory>(`/meeting-categories/${id}/`);
    return response;
  }

  async createCategory(data: any): Promise<MeetingCategory> {
    const response = await this.request<MeetingCategory>('/meeting-categories/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateCategory(id: number, data: any): Promise<MeetingCategory> {
    const response = await this.request<MeetingCategory>(`/meeting-categories/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteCategory(id: number): Promise<void> {
    await this.request(`/meeting-categories/${id}/`, {
      method: 'DELETE',
    });
  }

  // Get active categories
  async getActiveCategories(): Promise<MeetingCategory[]> {
    const response = await this.request<MeetingCategory[]>(`/meeting-categories/active/`);
    return response;
  }

  // Meeting Attendance API Methods
  async getAttendances(params?: any): Promise<{ results: MeetingAttendance[]; count: number }> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<{ results: MeetingAttendance[]; count: number }>(`/meeting-attendance/${queryString}`);
    return response;
  }

  async getAttendance(id: number): Promise<MeetingAttendance> {
    const response = await this.request<MeetingAttendance>(`/meeting-attendance/${id}/`);
    return response;
  }

  async createAttendance(data: any): Promise<MeetingAttendance> {
    const response = await this.request<MeetingAttendance>('/meeting-attendance/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateAttendance(id: number, data: any): Promise<MeetingAttendance> {
    const response = await this.request<MeetingAttendance>(`/meeting-attendance/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteAttendance(id: number): Promise<void> {
    await this.request(`/meeting-attendance/${id}/`, {
      method: 'DELETE',
    });
  }

  // Respond to meeting invitation
  async respondToInvitation(id: number, status: string, notes?: string): Promise<any> {
    const response = await this.request<any>(`/meeting-attendance/${id}/respond/`, {
      method: 'POST',
      body: JSON.stringify({ status, response_notes: notes }),
    });
    return response;
  }

  // Meeting Reminder API Methods
  async getReminders(params?: any): Promise<{ results: MeetingReminder[]; count: number }> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<{ results: MeetingReminder[]; count: number }>(`/meeting-reminders/${queryString}`);
    return response;
  }

  async getReminder(id: number): Promise<MeetingReminder> {
    const response = await this.request<MeetingReminder>(`/meeting-reminders/${id}/`);
    return response;
  }

  async createReminder(data: any): Promise<MeetingReminder> {
    const response = await this.request<MeetingReminder>('/meeting-reminders/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateReminder(id: number, data: any): Promise<MeetingReminder> {
    const response = await this.request<MeetingReminder>(`/meeting-reminders/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteReminder(id: number): Promise<void> {
    await this.request(`/meeting-reminders/${id}/`, {
      method: 'DELETE',
    });
  }

  // Meeting Template API Methods
  async getTemplates(params?: any): Promise<{ results: MeetingTemplate[]; count: number }> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<{ results: MeetingTemplate[]; count: number }>(`/meeting-templates/${queryString}`);
    return response;
  }

  async getTemplate(id: number): Promise<MeetingTemplate> {
    const response = await this.request<MeetingTemplate>(`/meeting-templates/${id}/`);
    return response;
  }

  async createTemplate(data: any): Promise<MeetingTemplate> {
    const response = await this.request<MeetingTemplate>('/meeting-templates/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateTemplate(id: number, data: any): Promise<MeetingTemplate> {
    const response = await this.request<MeetingTemplate>(`/meeting-templates/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteTemplate(id: number): Promise<void> {
    await this.request(`/meeting-templates/${id}/`, {
      method: 'DELETE',
    });
  }

  // Get active templates
  async getActiveTemplates(): Promise<MeetingTemplate[]> {
    const response = await this.request<MeetingTemplate[]>(`/meeting-templates/active/`);
    return response;
  }

  // Create meeting from template
  async createMeetingFromTemplate(templateId: number, data: any): Promise<Meeting> {
    const response = await this.request<Meeting>(`/meeting-templates/${templateId}/create_meeting/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  // Calendar Integration API Methods
  async getIntegrations(): Promise<{ results: CalendarIntegration[]; count: number }> {
    const response = await this.request<{ results: CalendarIntegration[]; count: number }>('/calendar-integrations/');
    return response;
  }

  async getIntegration(id: number): Promise<CalendarIntegration> {
    const response = await this.request<CalendarIntegration>(`/calendar-integrations/${id}/`);
    return response;
  }

  async createIntegration(data: any): Promise<CalendarIntegration> {
    const response = await this.request<CalendarIntegration>('/calendar-integrations/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateIntegration(id: number, data: any): Promise<CalendarIntegration> {
    const response = await this.request<CalendarIntegration>(`/calendar-integrations/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteIntegration(id: number): Promise<void> {
    await this.request(`/calendar-integrations/${id}/`, {
      method: 'DELETE',
    });
  }

  // Test connection
  async testConnection(id: number): Promise<any> {
    const response = await this.request<any>(`/calendar-integrations/${id}/test_connection/`);
    return response;
  }

  // Sync meetings
  async syncMeetings(id: number): Promise<any> {
    const response = await this.request<any>(`/calendar-integrations/${id}/sync/`);
    return response;
  }

  async updateTask(taskId: number, data: any): Promise<any> {
    return this.request(`/tasks/${taskId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getTasks(params?: any): Promise<{ results: any[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== "all") queryParams.append(key, value.toString());
      });
    }
    const endpoint = `/tasks/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return this.request(endpoint);
  }

  async getDocuments(params?: any): Promise<{ results: any[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== "all") queryParams.append(key, value.toString());
      });
    }
    const endpoint = `/documents/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return this.request(endpoint);
  }

  async uploadDocument(data: FormData): Promise<any> {
    return this.request('/documents/', {
      method: 'POST',
      body: data,
    });
  }

  async deleteDocument(documentId: number): Promise<void> {
    return this.request(`/documents/${documentId}/`, {
      method: 'DELETE',
    });
  }

  async getFolders(params?: any): Promise<{ results: any[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "" && value !== "all") queryParams.append(key, value.toString());
      });
    }
    const endpoint = `/folders/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return this.request(endpoint);
  }

  async createFolder(data: { name: string; parent?: number | null }): Promise<any> {
    return this.request('/folders/', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async updateFolder(folderId: number, data: any): Promise<any> {
    return this.request(`/folders/${folderId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async deleteFolder(folderId: number): Promise<void> {
    return this.request(`/folders/${folderId}/`, {
      method: 'DELETE' });
  }

  /**
   * Upload an attachment for a draft email.
   * @param formData - FormData with file and email fields
   */
  async uploadEmailAttachment(formData: FormData): Promise<any> {
    return this.request('/email-attachments/', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for multipart
    });
  }

  /**
   * List attachments for a given email.
   * @param emailId - Email ID to filter attachments
   */
  async getEmailAttachments(emailId: number): Promise<{ results: any[]; count: number }> {
    return this.request(`/email-attachments/?email=${emailId}`);
  }

  /**
   * Delete an email attachment by ID.
   * @param attachmentId - Attachment ID
   */
  async deleteEmailAttachment(attachmentId: number): Promise<void> {
    return this.request(`/email-attachments/${attachmentId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Sync emails for the authenticated user.
   * This will include the Authorization header automatically.
   */
  async syncEmails(): Promise<any> {
    return this.request('/emails/sync/', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService(); 