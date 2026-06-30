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
  empresa_master_id: number | null;
  usuario_master_id: number | null;
  inativo: boolean;
  total_usuarios: number;
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
    try { const err = await res.json(); msg = err?.message ?? err?.error ?? fallback; } catch {}
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
};
