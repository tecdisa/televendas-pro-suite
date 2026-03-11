import { authService } from '@/services/authService';
import { apiClient } from '@/utils/apiClient';
import { API_BASE } from '@/utils/env';

export interface CidadeCadastro {
  empresa_id: number;
  cidade_id: number;
  codigo_cidade: string;
  nome_cidade: string;
  codigo_ibge?: string | null;
  uf: string;
}

export interface CidadeCadastroFormData {
  codigo_cidade?: string;
  nome_cidade: string;
  codigo_ibge?: string | null;
  uf: string;
}

function normalizeCidade(raw: any): CidadeCadastro {
  return {
    empresa_id: Number(raw?.empresa_id ?? 0),
    cidade_id: Number(raw?.cidade_id ?? raw?.id ?? 0),
    codigo_cidade: String(raw?.codigo_cidade ?? raw?.codigoCidade ?? '').trim(),
    nome_cidade: String(raw?.nome_cidade ?? raw?.nomeCidade ?? raw?.nome ?? '').trim(),
    codigo_ibge:
      raw?.codigo_ibge != null
        ? String(raw.codigo_ibge).trim()
        : raw?.codigoIbge != null
        ? String(raw.codigoIbge).trim()
        : null,
    uf: String(raw?.uf ?? '').trim(),
  };
}

async function getEmpresaId(): Promise<number> {
  const empresa = authService.getEmpresa();
  if (!empresa?.empresa_id) throw new Error('Empresa não selecionada');
  return empresa.empresa_id;
}

export const citiesRegistryService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    uf?: string,
  ): Promise<{ data: CidadeCadastro[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();
    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (query?.trim()) params.set('q', query.trim());
    if (uf && uf !== 'all') params.set('uf', uf);

    const res = await apiClient.fetch(`${API_BASE}/api/cidades-cadastro?${params.toString()}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      let message = 'Falha ao buscar cidades';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return {
      data: arr.map(normalizeCidade),
      page: json?.page ?? page,
      limit: json?.limit ?? limit,
      total: json?.total ?? arr.length,
    };
  },

  async getById(id: number): Promise<CidadeCadastro | null> {
    const empresaId = await getEmpresaId();
    const res = await apiClient.fetch(`${API_BASE}/api/cidades-cadastro/${id}?empresaId=${empresaId}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar cidade';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalizeCidade(await res.json());
  },

  async create(data: CidadeCadastroFormData): Promise<CidadeCadastro> {
    const empresaId = await getEmpresaId();
    const body = {
      empresaId,
      data: {
        nome_cidade: data.nome_cidade,
        codigo_ibge: data.codigo_ibge || undefined,
        uf: data.uf,
      },
    };

    const res = await apiClient.fetch(`${API_BASE}/api/cidades-cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao criar cidade';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalizeCidade(await res.json());
  },

  async update(id: number, data: Partial<CidadeCadastroFormData>): Promise<CidadeCadastro> {
    const empresaId = await getEmpresaId();
    const res = await apiClient.fetch(
      `${API_BASE}/api/cidades-cadastro/${id}?empresaId=${empresaId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ data }),
      },
    );

    if (!res.ok) {
      let message = 'Falha ao atualizar cidade';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalizeCidade(await res.json());
  },

  async delete(id: number): Promise<void> {
    const empresaId = await getEmpresaId();
    const res = await apiClient.fetch(`${API_BASE}/api/cidades-cadastro/${id}?empresaId=${empresaId}`, {
      method: 'DELETE',
    });

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir cidade';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
  },
};
