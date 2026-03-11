import { apiClient } from '@/utils/apiClient';
import { API_BASE } from '@/utils/env';
import { authService } from '@/services/authService';

export interface StockEntry {
  empresa_id: number;
  produto_id: number;
  codigo_produto: string;
  descricao_produto: string;
  unidade: string;
  marca?: string;
  produto_inativo?: boolean;
  estoque: number;
  quantidade_reservada: number;
  disponivel: number;
  custo_medio?: number | null;
  custo_nota?: number | null;
  custo_compra?: number | null;
  cst?: string | null;
  aliquota_icms?: number | null;
  pfcp?: number | null;
  pauta_icms?: number | null;
  reducao_st?: number | null;
  reducao_convenio?: number | null;
  repasse_icms?: boolean | null;
}

interface StockResponse {
  data: any[];
  page: number;
  limit: number;
  total: number;
}

export interface StockInput {
  produto_id: number;
  estoque?: number | null;
  quantidade_reservada?: number | null;
  custo_medio?: number | null;
  custo_nota?: number | null;
  custo_compra?: number | null;
  cst?: string | null;
  aliquota_icms?: number | null;
  pfcp?: number | null;
  pauta_icms?: number | null;
  reducao_st?: number | null;
  reducao_convenio?: number | null;
  repasse_icms?: boolean;
}

function sanitizeNullableText(value: any): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function sanitizeNullableNumber(value: any): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

function normalizeStock(raw: any): StockEntry {
  const toNumber = (value: any) => {
    if (value === undefined || value === null || value === '') return 0;
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  return {
    empresa_id: Number(raw?.empresa_id ?? raw?.empresaId ?? 0),
    produto_id: Number(raw?.produto_id ?? raw?.produtoId ?? raw?.id ?? 0),
    codigo_produto: String(raw?.codigo_produto ?? raw?.codigoProduto ?? '').trim(),
    descricao_produto: String(raw?.descricao_produto ?? raw?.descricaoProduto ?? '').trim(),
    unidade: String(raw?.unidade ?? raw?.un ?? 'UN').trim() || 'UN',
    marca: raw?.marca ? String(raw.marca).trim() : undefined,
    produto_inativo: raw?.produto_inativo ?? raw?.produtoInativo ?? false,
    estoque: toNumber(raw?.estoque),
    quantidade_reservada: toNumber(raw?.quantidade_reservada ?? raw?.quantidadeReservada),
    disponivel: toNumber(raw?.disponivel),
    custo_medio: raw?.custo_medio != null ? Number(raw.custo_medio) : null,
    custo_nota: raw?.custo_nota != null ? Number(raw.custo_nota) : null,
    custo_compra: raw?.custo_compra != null ? Number(raw.custo_compra) : null,
    cst: raw?.cst ? String(raw.cst).trim() : null,
    aliquota_icms: raw?.aliquota_icms != null ? Number(raw.aliquota_icms) : null,
    pfcp: raw?.pfcp != null ? Number(raw.pfcp) : null,
    pauta_icms: raw?.pauta_icms != null ? Number(raw.pauta_icms) : null,
    reducao_st: raw?.reducao_st != null ? Number(raw.reducao_st) : null,
    reducao_convenio:
      raw?.reducao_convenio != null ? Number(raw.reducao_convenio) : null,
    repasse_icms: raw?.repasse_icms ?? raw?.repasseIcms ?? false,
  };
}

function buildPayload(data: Partial<StockInput>) {
  return {
    produto_id: sanitizeNullableNumber(data.produto_id),
    estoque: sanitizeNullableNumber(data.estoque),
    quantidade_reservada: sanitizeNullableNumber(data.quantidade_reservada),
    custo_medio: sanitizeNullableNumber(data.custo_medio),
    custo_nota: sanitizeNullableNumber(data.custo_nota),
    custo_compra: sanitizeNullableNumber(data.custo_compra),
    cst: sanitizeNullableText(data.cst),
    aliquota_icms: sanitizeNullableNumber(data.aliquota_icms),
    pfcp: sanitizeNullableNumber(data.pfcp),
    pauta_icms: sanitizeNullableNumber(data.pauta_icms),
    reducao_st: sanitizeNullableNumber(data.reducao_st),
    reducao_convenio: sanitizeNullableNumber(data.reducao_convenio),
    repasse_icms: data.repasse_icms,
  };
}

function getEmpresaId(): number {
  const empresaId = authService.getEmpresa()?.empresa_id;
  if (!empresaId) throw new Error('Empresa não selecionada');
  return empresaId;
}

export const stocksService = {
  async getAll(
    search?: string,
    page = 1,
    limit = 100,
    status: 'ativos' | 'inativos' | 'todos' = 'ativos',
  ): Promise<{ data: StockEntry[]; total: number }> {
    const empresaId = getEmpresaId();
    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('status', status);
    if (status === 'todos') params.set('incluirInativos', 'true');
    if (search?.trim()) params.set('q', search.trim());

    const response = await apiClient.fetch(`${API_BASE}/api/estoques?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.message || err?.error?.message || err?.error || 'Erro ao buscar estoques',
      );
    }

    const json = (await response.json()) as StockResponse | any[];
    const arr = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : [];

    return {
      data: arr.map(normalizeStock),
      total: Array.isArray(json) ? arr.length : json?.total ?? arr.length,
    };
  },

  async getById(produtoId: number): Promise<StockEntry | null> {
    const empresaId = getEmpresaId();
    const response = await apiClient.fetch(
      `${API_BASE}/api/estoques/${produtoId}?empresaId=${empresaId}`,
    );
    if (!response.ok) {
      if (response.status === 404) return null;
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.message || err?.error?.message || err?.error || 'Erro ao buscar estoque',
      );
    }
    return normalizeStock(await response.json());
  },

  async create(data: StockInput): Promise<StockEntry> {
    const empresaId = getEmpresaId();
    const response = await apiClient.fetch(`${API_BASE}/api/estoques`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId, data: buildPayload(data) }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.message || err?.error?.message || err?.error || 'Erro ao criar estoque',
      );
    }
    return normalizeStock(await response.json());
  },

  async update(produtoId: number, data: Partial<StockInput>): Promise<StockEntry> {
    const empresaId = getEmpresaId();
    const response = await apiClient.fetch(
      `${API_BASE}/api/estoques/${produtoId}?empresaId=${empresaId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: buildPayload(data) }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.message || err?.error?.message || err?.error || 'Erro ao atualizar estoque',
      );
    }
    return normalizeStock(await response.json());
  },

  async delete(produtoId: number): Promise<void> {
    const empresaId = getEmpresaId();
    const response = await apiClient.fetch(
      `${API_BASE}/api/estoques/${produtoId}?empresaId=${empresaId}`,
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.message || err?.error?.message || err?.error || 'Erro ao excluir estoque',
      );
    }
  },
};
