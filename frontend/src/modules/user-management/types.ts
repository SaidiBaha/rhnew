export interface UserAdmin {
  id: number;
  matricule: string;
  fullName: string | null;
  email: string | null;
  role: string;
  blocked: boolean;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  lastActivityIp: string | null;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  connectedToday: number;
  byRole: Record<string, number>;
}

export interface UserActivityLog {
  id: number;
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  detail: string | null;
  createdAt: string;
}

export interface UserActivityPage {
  content: UserActivityLog[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  first: boolean;
  last: boolean;
}

export interface UpdateUserRequest {
  role?: string;
  email?: string;
}
