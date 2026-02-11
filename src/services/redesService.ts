import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface Rede {
  rede_id: number;
  codigo_rede?: string;
  descricao_rede: string;
  cidade?: string;
  cidade_id?: number | null;
  uf?: string;
  email?: string;
  inativo?: boolean;
}

export interface RedeFormData {
  codigo_rede?: string;
  descricao_rede: string;
  cidade?: string;
  cidade_id?: number | null;
  uf?: string;
  email?: string;
  inativo?: boolean;
}

function normalizeRede(raw: any): Rede {
  return {
    rede_id: raw.rede_id ?? raw.id ?? 0,
    codigo_rede: raw.codigo_rede ?? raw.codigoRede ?? '',
    descricao_rede: raw.descricao_rede ?? raw.descricaoRede ?? raw.descricao ?? '',
    cidade: raw.cidade ?? '',
    cidade_id: raw.cidade_id ?? raw.cidadeId ?? null,
    uf: raw.uf ?? '',
    email: raw.email ?? '',
    inativo: raw.inativo ?? false,
  };
}

async function getEmpresaId(): Promise<number> {
  const empresa = authService.getEmpresa();
  if (!empresa) throw new Error('Empresa não selecionada');
  return empresa.empresa_id;
}

export const redesService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    incluirInativos = false
  ): Promise<{ data: Rede[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (incluirInativos) params.set('incluirInativos', 'true');

    const url = `${API_BASE}/api/redes/empresa/${empresaId}?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      let message = 'Falha ao buscar redes';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return {
      data: arr.map(normalizeRede),
      page: json?.page ?? page,
      limit: json?.limit ?? limit,
      total: json?.total ?? arr.length,
    };
  },

  async getById(id: number): Promise<Rede | null> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/redes/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar rede';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalizeRede(await res.json());
  },

  async create(data: RedeFormData): Promise<Rede> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/redes`;
    const body = {
      empresaId,
      data: {
        descricao_rede: data.descricao_rede,
        codigo_rede: data.codigo_rede || undefined,
        cidade: data.cidade || undefined,
        uf: data.uf || undefined,
        email: data.email || undefined,
        inativo: data.inativo ?? false,
      },
    };

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao criar rede';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalizeRede(await res.json());
  },

  async update(id: number, data: Partial<RedeFormData>): Promise<Rede> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/redes/${id}?empresaId=${empresaId}`;
    const body = { data };

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao atualizar rede';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalizeRede(await res.json());
  },

  async delete(id: number): Promise<void> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/redes/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir rede';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
  },
};
