export interface Empresa {
  empresa_id: number;
  razao_social: string;
  fantasia: string | null;
  uf: string;
  empresa_master_id?: number | null;
  empresa_master_razao_social?: string | null;
  empresa_master_fantasia?: string | null;
  empresa_master_uf?: string | null;
  fornecedores_permitidos?: string | null;
}
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface ParametrosAppMobile {
  empresa_id?: number;
  bloqueia_desconto_acima_tabela?: boolean;
}

export interface EmpresaMasterGroup {
  empresa_master_id: number;
  razao_social: string;
  fantasia: string | null;
  uf: string;
  empresas: Empresa[];
}

export interface SessionUser {
  usuario: string;
  nome: string;
  token: string;
  admin?: boolean;
  admin_master?: boolean;
  payload?: any;
  empresa?: Empresa | null;
  parametros_app_mobile?: ParametrosAppMobile | null;
  timestamp: string;
}

export interface RegisterPayload {
  usuario: string;
  nome: string;
  email: string;
  senha: string;
  cnpj_cpf?: string;
  fantasia?: string;
  fone?: string;
  whatsapp?: string;
}

export function getEmpresaMasterId(empresa: Empresa): number {
  const masterId = Number(empresa.empresa_master_id ?? empresa.empresa_id);
  return Number.isInteger(masterId) && masterId > 0 ? masterId : Number(empresa.empresa_id);
}

export function getEmpresaDisplayName(empresa: Empresa): string {
  return (
    empresa.fantasia?.trim() ||
    empresa.razao_social?.trim() ||
    `Empresa ${empresa.empresa_id}`
  );
}

export function getMasterDisplayName(master: Pick<EmpresaMasterGroup, 'fantasia' | 'razao_social' | 'empresa_master_id'>): string {
  return (
    master.fantasia?.trim() ||
    master.razao_social?.trim() ||
    `Master ${master.empresa_master_id}`
  );
}

export function groupEmpresasByMaster(empresas: Empresa[]): EmpresaMasterGroup[] {
  const groups = new Map<number, EmpresaMasterGroup>();

  empresas.forEach((empresa) => {
    const masterId = getEmpresaMasterId(empresa);
    if (!groups.has(masterId)) {
      groups.set(masterId, {
        empresa_master_id: masterId,
        razao_social:
          empresa.empresa_master_razao_social?.trim() ||
          empresa.razao_social?.trim() ||
          '',
        fantasia:
          empresa.empresa_master_fantasia?.trim() ||
          empresa.fantasia?.trim() ||
          null,
        uf: empresa.empresa_master_uf?.trim() || empresa.uf?.trim() || '',
        empresas: [],
      });
    }
    groups.get(masterId)!.empresas.push(empresa);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      empresas: group.empresas
        .slice()
        .sort((a, b) => getEmpresaDisplayName(a).localeCompare(getEmpresaDisplayName(b))),
    }))
    .sort((a, b) => getMasterDisplayName(a).localeCompare(getMasterDisplayName(b)));
}

export const authService = {
  login: async (usuario: string, senha: string, empresaId?: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          empresaId != null ? { usuario, senha, empresaId } : { usuario, senha },
        ),
        // Fluxo baseado em token no corpo da resposta (sem cookies)
        credentials: 'omit',
      });

      // Try to extract error details if not OK
      if (!res.ok) {
        try {
          const errData = await res.json();
          const message =
            errData?.error?.message ||
            errData?.message ||
            (typeof errData?.error === 'string' ? errData.error : undefined) ||
            res.statusText ||
            'Falha no login';
          return { success: false, error: message } as const;
        } catch {
          return { success: false, error: 'Falha no login' } as const;
        }
      }

      const data: any = await res.json();

      // Normalize a session object based on common API fields
      const token =
        data?.token ??
        data?.accessToken ??
        data?.jwt ??
        data?.access_token ??
        data?.idToken ??
        data?.id_token;

      if (!token) {
        return { success: false, error: 'Token não recebido do servidor' } as const;
      }

      const session: SessionUser = {
        usuario: data?.user?.usuario ?? data?.usuario ?? usuario,
        nome: data?.user?.nome ?? data?.nome ?? data?.name ?? data?.username ?? usuario,
        token,
        admin: Boolean(data?.user?.admin ?? data?.admin ?? false),
        admin_master: Boolean(
          data?.user?.admin_master ?? data?.admin_master ?? false,
        ),
        // Keep full payload for potential future use
        payload: data,
        parametros_app_mobile: data?.parametros_app_mobile ?? null,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem('session', JSON.stringify(session));
      return { success: true, user: session } as const;
    } catch (e) {
      return { success: false, error: 'Erro de conexão com o servidor' } as const;
    }
  },

  register: async (payload: RegisterPayload) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'omit',
      });

      if (!res.ok) {
        try {
          const errData = await res.json();
          const message =
            errData?.error?.message ||
            errData?.message ||
            (typeof errData?.error === 'string' ? errData.error : undefined) ||
            res.statusText ||
            'Falha no cadastro';
          return { success: false, error: message } as const;
        } catch {
          return { success: false, error: 'Falha no cadastro' } as const;
        }
      }

      const data = await res.json();
      return { success: true, data } as const;
    } catch {
      return { success: false, error: 'Erro de conexão com o servidor' } as const;
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'omit',
      });

      if (!res.ok) {
        try {
          const errData = await res.json();
          const message =
            errData?.error?.message ||
            errData?.message ||
            (typeof errData?.error === 'string' ? errData.error : undefined) ||
            res.statusText ||
            'Falha ao solicitar recuperação de senha';
          return { success: false, error: message } as const;
        } catch {
          return {
            success: false,
            error: 'Falha ao solicitar recuperação de senha',
          } as const;
        }
      }

      const data = await res.json();
      return { success: true, data } as const;
    } catch {
      return { success: false, error: 'Erro de conexão com o servidor' } as const;
    }
  },

  resetPassword: async (token: string, senha: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, senha }),
        credentials: 'omit',
      });

      if (!res.ok) {
        try {
          const errData = await res.json();
          const message =
            errData?.error?.message ||
            errData?.message ||
            (typeof errData?.error === 'string' ? errData.error : undefined) ||
            res.statusText ||
            'Falha ao redefinir senha';
          return { success: false, error: message } as const;
        } catch {
          return { success: false, error: 'Falha ao redefinir senha' } as const;
        }
      }

      const data = await res.json();
      return { success: true, data } as const;
    } catch {
      return { success: false, error: 'Erro de conexão com o servidor' } as const;
    }
  },

  logout: () => {
    localStorage.removeItem('session');
  },

  getSession: () => {
    const session = localStorage.getItem('session');
    return session ? (JSON.parse(session) as SessionUser) : null;
  },

  isAuthenticated: () => {
    return !!authService.getSession();
  },

  getToken: () => {
    const session = authService.getSession();
    return session?.token;
  },

  toBooleanFlag: (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return ['true', '1', 't', 'on', 'yes', 'y', 'sim', 's'].includes(normalized);
    }
    return false;
  },

  isAdmin: () => {
    const session = authService.getSession();
    return (
      authService.toBooleanFlag(session?.admin) ||
      authService.toBooleanFlag(session?.payload?.user?.admin) ||
      authService.toBooleanFlag(session?.payload?.admin) ||
      authService.toBooleanFlag(session?.admin_master) ||
      authService.toBooleanFlag(session?.payload?.user?.admin_master) ||
      authService.toBooleanFlag(session?.payload?.admin_master)
    );
  },

  isMasterAdmin: () => {
    const session = authService.getSession();
    return (
      authService.toBooleanFlag(session?.admin_master) ||
      authService.toBooleanFlag(session?.payload?.user?.admin_master) ||
      authService.toBooleanFlag(session?.payload?.admin_master)
    );
  },

  getEmpresas: async (): Promise<Empresa[]> => {
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const headers: Record<string, string> = { accept: '*/*' };
      const res = await apiClient.fetch(`${API_BASE}/api/auth/empresas`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        let message = 'Falha ao buscar empresas';
        try {
          const errData = await res.json();
          message = errData?.message || errData?.error || message;
        } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  setEmpresa: (empresa: Empresa | null) => {
    const session = authService.getSession();
    if (!session) return;
    const updated = { ...session, empresa };
    localStorage.setItem('session', JSON.stringify(updated));
  },

  getEmpresa: (): Empresa | null => {
    const session = authService.getSession();
    return session?.empresa ?? null;
  },

  getParametrosAppMobile: (): ParametrosAppMobile | null => {
    const session = authService.getSession();
    return session?.parametros_app_mobile ?? session?.payload?.parametros_app_mobile ?? null;
  },
};
