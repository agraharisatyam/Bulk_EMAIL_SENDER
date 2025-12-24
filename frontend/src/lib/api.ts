const API_BASE =
	// allow overriding in `.env` as VITE_API_BASE
	(import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:3000';

type JsonMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiOptions {
	method?: JsonMethod;
	body?: unknown;
	skipAuthRedirect?: boolean;
}

export interface ApiResult<T> {
	ok: boolean;
	status: number;
	data: T | null;
	error?: string;
}

async function apiRequest<T>(path: string, opts: ApiOptions = {}): Promise<ApiResult<T>> {
	const { method = 'GET', body } = opts;

	try {
		const response = await fetch(`${API_BASE}${path}`, {
			method,
			credentials: 'include',
			headers: {
				...(body ? { 'Content-Type': 'application/json' } : {})
			},
			body: body ? JSON.stringify(body) : undefined
		});

		let data: any = null;
		try {
			data = await response.json();
		} catch {
			// ignore parse errors for endpoints that don't return JSON
		}

		if (!response.ok) {
			return {
				ok: false,
				status: response.status,
				data: null,
				error: (data && (data.message as string)) || response.statusText
			};
		}

		return { ok: true, status: response.status, data };
	} catch (e) {
		// Network error - backend not running or CORS issue
		return {
			ok: false,
			status: 0,
			data: null,
			error: `Cannot connect to backend API at ${API_BASE}. Make sure the backend server is running.`
		};
	}
}

// Auth helpers
export interface AuthUser {
	id: string;
	email: string;
	name: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
	try {
		const res = await apiRequest<{ success: boolean; user?: AuthUser; message?: string }>(
			'/auth/me'
		);

		if (!res.ok || !res.data?.success || !res.data.user) {
			return null;
		}

		return res.data.user;
	} catch (e) {
		// Network error or backend not running - return null (not logged in)
		return null;
	}
}

export async function login(email: string, password: string) {
	return apiRequest<{ success: boolean; message?: string; user?: AuthUser }>('/auth/login', {
		method: 'POST',
		body: { email, password }
	});
}

export async function register(name: string, email: string, password: string) {
	return apiRequest<{ success: boolean; message?: string; user?: AuthUser }>('/auth/register', {
		method: 'POST',
		body: { name, email, password }
	});
}

export async function logout() {
	return apiRequest<{ success: boolean; message?: string }>('/auth/logout', {
		method: 'POST'
	});
}

// Config helpers
export interface SmtpConfig {
	id: string;
	name: string;
	host: string;
	port: number;
	secure: boolean;
	user: string;
	fromEmail: string;
	fromName?: string;
	isDefault: boolean;
	createdAt: string;
}

export interface SmtpConfigResponse {
	success: boolean;
	userId: string;
	userName: string;
	userConfigs: SmtpConfig[];
}

export async function getUserConfigs() {
	return apiRequest<SmtpConfigResponse>('/config/smtp');
}

export async function createUserConfig(input: {
	name: string;
	host: string;
	port: number;
	secure: boolean;
	user: string;
	pass: string;
	fromEmail: string;
	fromName?: string;
	isDefault?: boolean;
}) {
	return apiRequest('/config/smtp', {
		method: 'POST',
		body: input
	});
}

// Reports
export interface EmailLog {
	id: string;
	email: string;
	status: 'Sent' | 'Failed' | 'Error';
	message?: string;
	timestamp: string;
	messageId?: string;
	firstName?: string;
	company?: string;
	subject?: string;
}

export interface ReportStats {
	total: number;
	sent: number;
	failed: number;
	errors: number;
}

export interface ReportResponse {
	success: boolean;
	data: {
		logs: EmailLog[];
		stats: ReportStats;
	};
}

export async function getReport() {
	return apiRequest<ReportResponse>('/report');
}

// Email sending – use FormData because backend expects multipart/form-data
export const emailApiBase = API_BASE;



