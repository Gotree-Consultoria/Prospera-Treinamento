export interface UserProfile {
  id?: string | number;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;
  phone?: string;
  birth?: string;
  birthDate?: string;
  document?: string;
  documentNumber?: string;
  cpf?: string;
  cpfNumber?: string;
  company?: Record<string, unknown>;
  organizations?: Array<Record<string, unknown>>;
  personalProfile?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  avatarUrl?: string;
  organizationName?: string;
  [key: string]: unknown;
}

export interface AuthSession {
  token: string;
  email?: string;
  role?: string;
}
