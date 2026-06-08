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
  apresentacao?: string | null;
  codigo_fabrica?: string | null;
  ean13?: string | null;
  fornecedor_id?: number | null;
  nome_fornecedor?: string | null;
  divisao_id?: number | null;
  descricao_divisao?: string | null;
  produto_inativo?: boolean;
  estoque: number;
  quantidade_reservada: number;
  disponivel: number;
  custo_medio?: number | null;
  custo_nota?: number | null;
  custo_compra?: number | null;
  codigo_situacao_icms?: string | null;
  cst?: string | null;
  csosn?: string | null;
  aliquota_icms?: number | null;
  aliquota_icms_credito?: number | null;
  pfcp?: number | null;
  pauta_icms?: number | null;
  reducao_st?: number | null;
  reducao_convenio?: number | null;
  repasse_icms?: boolean | null;
  cst_pis?: string | null;
  cst_cofins?: string | null;
  aliquota_pis?: number | null;
  aliquota_cofins?: number | null;
  ibs_cbs?: string | null;
  ibs_cbs_classif_trib?: string | null;
}

interface StockResponse {
  data: any[];
  page: number;
  limit: number;
  total: number;
}

export interface StockListFilters {
  status?: 'ativos' | 'inativos' | 'todos';
  search?: string;
  fornecedorId?: number;
  divisaoId?: number;
  marca?: string;
  possuiFoto?: boolean;
  permiteVendaB2b?: boolean;
  permiteVendaB2c?: boolean;
  lancamento?: boolean;
}

export interface StockInput {
  produto_id: number;
  estoque?: number | null;
  quantidade_reservada?: number | null;
  custo_medio?: number | null;
  custo_nota?: number | null;
  custo_compra?: number | null;
  codigo_situacao_icms?: string | null;
  cst?: string | null;
  csosn?: string | null;
  aliquota_icms?: number | null;
  aliquota_icms_credito?: number | null;
  pfcp?: number | null;
  pauta_icms?: number | null;
  reducao_st?: number | null;
  reducao_convenio?: number | null;
  repasse_icms?: boolean;
  cst_pis?: string | null;
  cst_cofins?: string | null;
  aliquota_pis?: number | null;
  aliquota_cofins?: number | null;
  ibs_cbs?: string | null;
  ibs_cbs_classif_trib?: string | null;
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
    apresentacao: raw?.apresentacao ? String(raw.apresentacao).trim() : undefined,
    codigo_fabrica: raw?.codigo_fabrica ? String(raw.codigo_fabrica).trim() : undefined,
    ean13: raw?.ean13 ? String(raw.ean13).trim() : undefined,
    fornecedor_id: raw?.fornecedor_id ? Number(raw.fornecedor_id) : undefined,
    nome_fornecedor: raw?.nome_fornecedor ? String(raw.nome_fornecedor).trim() : undefined,
    divisao_id: raw?.divisao_id ? Number(raw.divisao_id) : undefined,
    descricao_divisao: raw?.descricao_divisao ? String(raw.descricao_divisao).trim() : undefined,
    produto_inativo: raw?.produto_inativo ?? raw?.produtoInativo ?? false,
    estoque: toNumber(raw?.estoque),
    quantidade_reservada: toNumber(raw?.quantidade_reservada ?? raw?.quantidadeReservada),
    disponivel: toNumber(raw?.disponivel),
    custo_medio: raw?.custo_medio != null ? Number(raw.custo_medio) : null,
    custo_nota: raw?.custo_nota != null ? Number(raw.custo_nota) : null,
    custo_compra: raw?.custo_compra != null ? Number(raw.custo_compra) : null,
    codigo_situacao_icms:
      raw?.codigo_situacao_icms != null ? String(raw.codigo_situacao_icms).trim() : null,
    cst: raw?.cst ? String(raw.cst).trim() : null,
    csosn: raw?.csosn ? String(raw.csosn).trim() : null,
    aliquota_icms: raw?.aliquota_icms != null ? Number(raw.aliquota_icms) : null,
    aliquota_icms_credito:
      raw?.aliquota_icms_credito != null ? Number(raw.aliquota_icms_credito) : null,
    pfcp: raw?.pfcp != null ? Number(raw.pfcp) : null,
    pauta_icms: raw?.pauta_icms != null ? Number(raw.pauta_icms) : null,
    reducao_st: raw?.reducao_st != null ? Number(raw.reducao_st) : null,
    reducao_convenio:
      raw?.reducao_convenio != null ? Number(raw.reducao_convenio) : null,
    repasse_icms: raw?.repasse_icms ?? raw?.repasseIcms ?? false,
    cst_pis: raw?.cst_pis ? String(raw.cst_pis).trim() : null,
    cst_cofins: raw?.cst_cofins ? String(raw.cst_cofins).trim() : null,
    aliquota_pis:
      raw?.aliquota_pis != null
        ? Number(raw.aliquota_pis)
        : raw?.pis_aliquota != null
        ? Number(raw.pis_aliquota)
        : null,
    aliquota_cofins:
      raw?.aliquota_cofins != null
        ? Number(raw.aliquota_cofins)
        : raw?.cofins_aliquota != null
        ? Number(raw.cofins_aliquota)
        : null,
    ibs_cbs: raw?.ibs_cbs ? String(raw.ibs_cbs).trim() : null,
    ibs_cbs_classif_trib:
      raw?.ibs_cbs_classif_trib != null ? String(raw.ibs_cbs_classif_trib).trim() : null,
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
    codigo_situacao_icms: sanitizeNullableText(data.codigo_situacao_icms),
    cst: sanitizeNullableText(data.cst),
    csosn: sanitizeNullableText(data.csosn),
    aliquota_icms: sanitizeNullableNumber(data.aliquota_icms),
    aliquota_icms_credito: sanitizeNullableNumber(data.aliquota_icms_credito),
    pfcp: sanitizeNullableNumber(data.pfcp),
    pauta_icms: sanitizeNullableNumber(data.pauta_icms),
    reducao_st: sanitizeNullableNumber(data.reducao_st),
    reducao_convenio: sanitizeNullableNumber(data.reducao_convenio),
    repasse_icms: data.repasse_icms,
    cst_pis: sanitizeNullableText(data.cst_pis),
    cst_cofins: sanitizeNullableText(data.cst_cofins),
    aliquota_pis: sanitizeNullableNumber(data.aliquota_pis),
    aliquota_cofins: sanitizeNullableNumber(data.aliquota_cofins),
    ibs_cbs: sanitizeNullableText(data.ibs_cbs),
    ibs_cbs_classif_trib: sanitizeNullableText(data.ibs_cbs_classif_trib),
  };
}

function getEmpresaId(): number {
  const empresaId = authService.getEmpresa()?.empresa_id;
  if (!empresaId) throw new Error('Empresa não selecionada');
  return empresaId;
}

export const stocksService = {
  async getAll(
    filtersOrSearch?: string | StockListFilters,
    page = 1,
    limit = 100,
    status: 'ativos' | 'inativos' | 'todos' = 'ativos',
  ): Promise<{ data: StockEntry[]; total: number }> {
    const empresaId = getEmpresaId();
    const filters: StockListFilters =
      typeof filtersOrSearch === 'string'
        ? { search: filtersOrSearch, status }
        : { ...(filtersOrSearch ?? {}) };
    const resolvedStatus = filters.status ?? status;
    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('status', resolvedStatus);
    if (resolvedStatus === 'todos') params.set('incluirInativos', 'true');
    if (filters.search?.trim()) params.set('q', filters.search.trim());
    if (filters.fornecedorId) params.set('fornecedorId', String(filters.fornecedorId));
    if (filters.divisaoId) params.set('divisaoId', String(filters.divisaoId));
    if (filters.marca?.trim()) params.set('marca', filters.marca.trim());
    if (filters.lancamento !== undefined)
      params.set('lancamento', String(Boolean(filters.lancamento)));
    if (filters.possuiFoto !== undefined)
      params.set('possuiFoto', String(Boolean(filters.possuiFoto)));
    if (filters.permiteVendaB2b !== undefined)
      params.set('permiteVendaB2b', String(Boolean(filters.permiteVendaB2b)));
    if (filters.permiteVendaB2c !== undefined)
      params.set('permiteVendaB2c', String(Boolean(filters.permiteVendaB2c)));

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
