import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface AdminEmpresa {
  empresa_id: number;
  razao_social: string;
  fantasia: string | null;
  cnpj_cpf: string;
  uf: string;
  cidade: string | null;
  fone: string | null;
  celular: string | null;
  email: string | null;
  tecdisa_id: string | null;
  empresa_master_id: number | null;
  usuario_master_id: number | null;
  inativo: boolean;
  total_usuarios: number;
}

export interface AdminEmpresaDetalhe {
  empresa_id: number;
  razao_social: string;
  fantasia: string;
  cnpj_cpf: string;
  inscricao_estadual: string | null;
  endereco: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string | null;
  uf: string;
  cep: string;
  fone: string;
  celular: string | null;
  whatsapp: string | null;
  contato: string | null;
  email: string | null;
  site: string | null;
  tecdisa_id: string | null;
  empresa_master_id: number | null;
  usuario_master_id: number | null;
  inativo: boolean;
  obs: string | null;
}

export interface AdminUsuario {
  usuario_id: number;
  usuario: string;
  nome: string;
  email: string | null;
  criado_em: string | null;
  empresa_ids: number[];
  ja_vinculado: boolean;
}

export interface AdminVinculo {
  usuario_empresa_id: number;
  usuario_id: number;
  empresa_id: number;
  admin: boolean;
  forca_de_vendas: boolean;
  inativo: boolean;
  codigo_representante: string | null;
}

export interface EmpresaUsuario {
  usuario_id: number;
  usuario: string;
  nome: string;
  email: string | null;
  ativo: boolean;
  admin: boolean;
  admin_master: boolean;
  global_master: boolean;
  forca_de_vendas: boolean;
  usuario_empresa_id: number;
}

async function authHeaders() {
  const token = authService.getToken();
  if (!token) throw new Error('Token ausente');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handleResponse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let msg = fallback;
    try {
      const err = await res.json();
      const raw = err?.message ?? err?.error ?? fallback;
      msg = Array.isArray(raw) ? raw.join(', ') : (typeof raw === 'string' ? raw : fallback);
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const adminService = {
  async listEmpresas(q?: string): Promise<AdminEmpresa[]> {
    const headers = await authHeaders();
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const res = await apiClient.fetch(`${API_BASE}/api/admin/empresas${qs}`, { headers });
    const data = await handleResponse<{ data: AdminEmpresa[] }>(res, 'Erro ao listar empresas');
    return data.data;
  },

  async searchUsuarios(q: string, empresaId?: number): Promise<AdminUsuario[]> {
    const headers = await authHeaders();
    const params = new URLSearchParams({ q });
    if (empresaId) params.set('empresaId', String(empresaId));
    const res = await apiClient.fetch(`${API_BASE}/api/admin/usuarios?${params}`, { headers });
    const data = await handleResponse<{ data: AdminUsuario[] }>(res, 'Erro ao buscar usuários');
    return data.data;
  },

  async listUsuariosEmpresa(empresaId: number): Promise<EmpresaUsuario[]> {
    const headers = await authHeaders();
    const res = await apiClient.fetch(
      `${API_BASE}/api/usuarios/empresa/${empresaId}?limit=500&status=todos`,
      { headers },
    );
    const data = await handleResponse<{ data: EmpresaUsuario[] }>(res, 'Erro ao listar usuários');
    return data.data ?? [];
  },

  async createVinculo(usuarioId: number, empresaId: number, opts: { admin?: boolean; forca_de_vendas?: boolean } = {}): Promise<AdminVinculo> {
    const headers = await authHeaders();
    const res = await apiClient.fetch(`${API_BASE}/api/admin/vinculos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ usuarioId, empresaId, ...opts }),
    });
    return handleResponse<AdminVinculo>(res, 'Erro ao criar vínculo');
  },

  async updateVinculo(vinculoId: number, patch: { admin?: boolean; forca_de_vendas?: boolean; inativo?: boolean }): Promise<AdminVinculo> {
    const headers = await authHeaders();
    const res = await apiClient.fetch(`${API_BASE}/api/admin/vinculos/${vinculoId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch),
    });
    return handleResponse<AdminVinculo>(res, 'Erro ao atualizar vínculo');
  },

  async deleteVinculo(vinculoId: number): Promise<void> {
    const headers = await authHeaders();
    const res = await apiClient.fetch(`${API_BASE}/api/admin/vinculos/${vinculoId}`, {
      method: 'DELETE',
      headers,
    });
    await handleResponse<void>(res, 'Erro ao remover vínculo');
  },

  async setUserMaster(usuarioId: number, master: boolean): Promise<{ usuario_id: number; usuario: string; master: boolean }> {
    const headers = await authHeaders();
    const res = await apiClient.fetch(`${API_BASE}/api/admin/usuarios/${usuarioId}/master`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ master }),
    });
    return handleResponse(res, 'Erro ao atualizar flag master');
  },

  async getEmpresa(id: number): Promise<AdminEmpresaDetalhe> {
    const headers = await authHeaders();
    const res = await apiClient.fetch(`${API_BASE}/api/empresas/${id}`, { headers });
    return handleResponse<AdminEmpresaDetalhe>(res, 'Erro ao buscar empresa');
  },

  async updateEmpresa(id: number, data: Partial<{
    razao_social: string;
    fantasia: string;
    inscricao_estadual: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    fone: string;
    celular: string;
    whatsapp: string;
    email: string;
    tecdisa_id: string;
    inativo: boolean;
    obs: string;
    empresa_master_id: number | null;
  }>): Promise<AdminEmpresaDetalhe> {
    const headers = await authHeaders();
    const res = await apiClient.fetch(`${API_BASE}/api/empresas/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<AdminEmpresaDetalhe>(res, 'Erro ao atualizar empresa');
  },

  async deleteEmpresa(id: number): Promise<void> {
    const headers = await authHeaders();
    const res = await apiClient.fetch(`${API_BASE}/api/empresas/${id}`, {
      method: 'DELETE',
      headers,
    });
    await handleResponse<void>(res, 'Erro ao excluir empresa');
  },

  async createEmpresa(data: {
    cnpj: string;
    razao_social: string;
    fantasia: string;
    inscricao_estadual?: string;
    endereco: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cidade?: string;
    uf: string;
    cep: string;
    fone: string;
    celular?: string;
    whatsapp?: string;
    email?: string;
    tecdisa_id?: string;
    empresa_master_id?: number | null;
    master?: boolean;
  }): Promise<{ empresa_id: number; razao_social: string; fantasia: string; cnpj_cpf: string; empresa_master_id: number | null; uf: string; inativo: boolean }> {
    const headers = await authHeaders();
    const res = await apiClient.fetch(`${API_BASE}/api/empresas`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(res, 'Erro ao criar empresa');
  },
};
