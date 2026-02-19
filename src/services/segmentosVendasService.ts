import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface SegmentoVenda {
  segmento_id: number;
  codigo_segmento?: string;
  descricao_segmento: string;
  inativo?: boolean;
}

export interface SegmentoVendaFormData {
  codigo_segmento?: string;
  descricao_segmento: string;
  inativo?: boolean;
}

function normalize(raw: any): SegmentoVenda {
  return {
    segmento_id: raw.segmento_id ?? raw.segmentoId ?? raw.id ?? 0,
    codigo_segmento: raw.codigo_segmento ?? raw.codigoSegmento ?? '',
    descricao_segmento: raw.descricao_segmento ?? raw.descricaoSegmento ?? raw.descricao ?? '',
    inativo: raw.inativo ?? false,
  };
}

async function getEmpresaId(): Promise<number> {
  const empresa = authService.getEmpresa();
  if (!empresa) throw new Error('Empresa não selecionada');
  return empresa.empresa_id;
}

export const segmentosVendasService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    incluirInativos = false,
    apenasInativos = false
  ): Promise<{ data: SegmentoVenda[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (incluirInativos) params.set('incluirInativos', 'true');
    if (apenasInativos) params.set('apenasInativos', 'true');

    const url = `${API_BASE}/api/segmentos-vendas?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      let message = 'Falha ao buscar segmentos de venda';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
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

  async getById(id: number): Promise<SegmentoVenda | null> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/segmentos-vendas/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar segmento de venda';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async create(data: SegmentoVendaFormData): Promise<SegmentoVenda> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/segmentos-vendas`;
    const body = {
      empresaId,
      data: {
        descricao_segmento: data.descricao_segmento,
        codigo_segmento: data.codigo_segmento || undefined,
        inativo: data.inativo ?? false,
      },
    };

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao criar segmento de venda';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async update(id: number, data: Partial<SegmentoVendaFormData>): Promise<SegmentoVenda> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/segmentos-vendas/${id}?empresaId=${empresaId}`;
    const body = { data };

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao atualizar segmento de venda';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async delete(id: number): Promise<void> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/segmentos-vendas/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir segmento de venda';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
  },
};
