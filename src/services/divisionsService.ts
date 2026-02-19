import { apiClient } from '@/utils/apiClient';
import { API_BASE } from '@/utils/env';
import { authService } from '@/services/authService';

export interface Divisao {
  empresa_id: number;
  divisao_id: number;
  codigo_divisao?: string;
  grupo_id?: number;
  descricao_divisao: string;
  inativo?: boolean;
}

export interface DivisaoResponse {
  data: Divisao[];
  page: number;
  limit: number;
  total: number;
}

function normalizeDivisao(raw: any): Divisao {
  return {
    empresa_id: Number(raw?.empresa_id ?? raw?.empresaId ?? 0),
    divisao_id: Number(raw?.divisao_id ?? raw?.divisaoId ?? raw?.id ?? 0),
    codigo_divisao: raw?.codigo_divisao ?? raw?.codigoDivisao ?? undefined,
    grupo_id: raw?.grupo_id ?? raw?.grupoId ?? undefined,
    descricao_divisao: String(raw?.descricao_divisao ?? raw?.descricaoDivisao ?? raw?.descricao ?? '').trim(),
    inativo: Boolean(raw?.inativo ?? false),
  };
}

export const divisionsService = {
  async getAll(query?: string, grupoId?: number, page = 1, limit = 100, incluirInativos = false, apenasInativos = false): Promise<{ data: Divisao[]; total: number }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;

    if (!empresaId) {
      console.warn('divisionsService.getAll: empresaId não encontrado');
      return { data: [], total: 0 };
    }

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (incluirInativos) params.set('incluirInativos', 'true');
    if (apenasInativos) params.set('apenasInativos', 'true');
    if (query?.trim()) params.set('q', query.trim());
    if (grupoId) params.set('grupoId', String(grupoId));

    try {
      const res = await apiClient.fetch(`${API_BASE}/api/divisoes-produtos?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
      return {
        data: arr.map(normalizeDivisao).filter((d: Divisao) => d.descricao_divisao),
        total: data?.total ?? arr.length,
      };
    } catch (error) {
      console.error('Erro ao buscar divisões:', error);
      return { data: [], total: 0 };
    }
  },

  async getById(id: number): Promise<Divisao | null> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) return null;

    try {
      const response = await apiClient.fetch(`${API_BASE}/api/divisoes-produtos/${id}?empresaId=${empresaId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return normalizeDivisao(result);
    } catch (error) {
      console.error('Erro ao buscar divisão:', error);
      return null;
    }
  },

  async create(data: { codigo_divisao?: string; grupo_id: number; descricao_divisao: string; inativo?: boolean }): Promise<Divisao> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/divisoes-produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId, data }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao criar divisão');
    }
    return normalizeDivisao(await response.json());
  },

  async update(id: number, data: Partial<{ codigo_divisao: string; grupo_id: number; descricao_divisao: string; inativo: boolean }>): Promise<Divisao> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/divisoes-produtos/${id}?empresaId=${empresaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao atualizar divisão');
    }
    return normalizeDivisao(await response.json());
  },

  async delete(id: number): Promise<void> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/divisoes-produtos/${id}?empresaId=${empresaId}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao excluir divisão');
    }
  },
};
