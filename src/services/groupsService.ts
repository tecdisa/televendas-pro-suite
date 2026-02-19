import { apiClient } from '@/utils/apiClient';
import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';

export interface Grupo {
  empresa_id: number;
  grupo_id: number;
  codigo_grupo: string;
  descricao_grupo: string;
  inativo: boolean;
}

export interface GrupoResponse {
  data: Grupo[];
  page: number;
  limit: number;
  total: number;
}

function normalizeGrupo(raw: any): Grupo {
  return {
    empresa_id: Number(raw?.empresa_id ?? 0),
    grupo_id: Number(raw?.grupo_id ?? raw?.id ?? 0),
    codigo_grupo: String(raw?.codigo_grupo ?? raw?.codigoGrupo ?? '').trim(),
    descricao_grupo: String(raw?.descricao_grupo ?? raw?.descricaoGrupo ?? raw?.descricao ?? '').trim(),
    inativo: Boolean(raw?.inativo ?? false),
  };
}

export const groupsService = {
  async getAll(query?: string, page = 1, limit = 100, status: 'ativos' | 'inativos' | 'todos' = 'ativos'): Promise<{ data: Grupo[]; total: number }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;

    if (!empresaId) {
      console.warn('groupsService.getAll: empresaId não encontrado');
      return { data: [], total: 0 };
    }

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('status', status);
    if (status === 'todos') params.set('incluirInativos', 'true');
    if (query?.trim()) params.set('q', query.trim());

    try {
      const response = await apiClient.fetch(`${API_BASE}/api/grupos-produtos?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      const arr = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      return {
        data: arr.map(normalizeGrupo),
        total: result?.total ?? arr.length,
      };
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      return { data: [], total: 0 };
    }
  },

  async getById(id: number): Promise<Grupo | null> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) return null;

    try {
      const response = await apiClient.fetch(`${API_BASE}/api/grupos-produtos/${id}?empresaId=${empresaId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return normalizeGrupo(result);
    } catch (error) {
      console.error('Erro ao buscar grupo:', error);
      return null;
    }
  },

  async create(data: { codigo_grupo?: string; descricao_grupo: string; inativo?: boolean }): Promise<Grupo> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/grupos-produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId, data }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao criar grupo');
    }
    return normalizeGrupo(await response.json());
  },

  async update(id: number, data: Partial<{ codigo_grupo: string; descricao_grupo: string; inativo: boolean }>): Promise<Grupo> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/grupos-produtos/${id}?empresaId=${empresaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao atualizar grupo');
    }
    return normalizeGrupo(await response.json());
  },

  async delete(id: number): Promise<void> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/grupos-produtos/${id}?empresaId=${empresaId}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao excluir grupo');
    }
  },
};
