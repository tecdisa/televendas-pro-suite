import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface RotaCliente {
  rota_id: number;
  codigo_rota?: string;
  descricao_rota: string;
  inativo?: boolean;
}

export interface RotaClienteFormData {
  codigo_rota?: string;
  descricao_rota: string;
  inativo?: boolean;
}

function normalize(raw: any): RotaCliente {
  return {
    rota_id: raw.rota_id ?? raw.rotaId ?? raw.id ?? 0,
    codigo_rota: raw.codigo_rota ?? raw.codigoRota ?? '',
    descricao_rota: raw.descricao_rota ?? raw.descricaoRota ?? raw.descricao ?? '',
    inativo: raw.inativo ?? false,
  };
}

async function getEmpresaId(): Promise<number> {
  const empresa = authService.getEmpresa();
  if (!empresa) throw new Error('Empresa não selecionada');
  return empresa.empresa_id;
}

export const rotasClientesService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    incluirInativos = false
  ): Promise<{ data: RotaCliente[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (incluirInativos) params.set('incluirInativos', 'true');

    const url = `${API_BASE}/api/rotas-clientes?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      let message = 'Falha ao buscar rotas';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return {
      data: arr.map(normalize),
      page: json?.page ?? page,
      limit: json?.limit ?? limit,
      total: json?.total ?? arr.length,
    };
  },

  async getById(id: number): Promise<RotaCliente | null> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/rotas-clientes/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar rota';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async create(data: RotaClienteFormData): Promise<RotaCliente> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/rotas-clientes`;
    const body = {
      empresaId,
      data: {
        descricao_rota: data.descricao_rota,
        codigo_rota: data.codigo_rota || undefined,
        inativo: data.inativo ?? false,
      },
    };

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao criar rota';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async update(id: number, data: Partial<RotaClienteFormData>): Promise<RotaCliente> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/rotas-clientes/${id}?empresaId=${empresaId}`;
    const body = { data };

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao atualizar rota';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async delete(id: number): Promise<void> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/rotas-clientes/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir rota';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
  },
};
