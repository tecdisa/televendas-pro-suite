import { apiClient } from '@/utils/apiClient';
import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';

export interface TabelaPreco {
  tabela_preco_id: number;
  empresa_id: number;
  codigo_tabela_preco: string;
  descricao_tabela_preco: string;
  prazo_medio: number | null;
  somente_venda_avista: boolean;
  pedido_minimo: number;
  indice_financeiro: number;
  validade: string | null;
  forma_pagto_id: number | null;
  prazo_pagto_id: number | null;
  inativo: boolean;
  padrao: boolean;
  tabela_referencia_id: number | null;
  tabela_referencia_percentual: number | null;
}

export interface PrecoPorProduto {
  tabela_preco_id: number;
  produto_id: number;
  empresa_id: number;
  codigo_tabela_preco: string;
  descricao_tabela_preco: string;
  preco: number;
  pvs: number;
  preco_aplicado: number;
  desconto_maximo: number | null;
  comissao: number | null;
  quantidade_minima: number | null;
  despesa: number;
  lucro: number;
  frete: number;
  majoracao: number;
  markup: number;
  custo_compra: number;
  permite_debito_credito: boolean;
  permite_bonificacao: boolean;
  permite_venda_especial: boolean;
  produto_em_promocao: boolean;
}

export interface TabelaPrecoItem {
  tabela_preco_id: number;
  produto_id: number;
  codigo_produto: string;
  descricao_produto: string;
  apresentacao: string;
  custo: number;
  produto_inativo: boolean;
  preco: number;
  desconto_maximo: number;
  desconto_valor: number;
  comissao: number;
  permite_bonificacao: boolean;
  permite_debito_credito: boolean;
  permite_venda_especial: boolean;
  produto_em_promocao: boolean;
  quantidade_minima: number;
  pvs: number;
  markup: number;
  despesa: number;
  lucro: number;
  frete: number;
  majoracao: number;
  un: string;
  estoque: number;
  ean13: string;
  codigo_fabrica: string;
  marca: string;
  multiplo_de_vendas: number | null;
  principio_ativo: string | null;
  preco_nacional_consumidor: number | null;
  divisao: string;
  fornecedor: string;
  has_escala: boolean;
  escala_tiers: Array<{ quantidade: number; desconto: number; comissao: number }> | null;
}

function normalizeTabelaPreco(raw: any): TabelaPreco {
  return {
    tabela_preco_id: Number(raw?.tabela_preco_id ?? 0),
    empresa_id: Number(raw?.empresa_id ?? 0),
    codigo_tabela_preco: String(raw?.codigo_tabela_preco ?? '').trim(),
    descricao_tabela_preco: String(raw?.descricao_tabela_preco ?? '').trim(),
    prazo_medio: raw?.prazo_medio != null ? Number(raw.prazo_medio) : null,
    somente_venda_avista: Boolean(raw?.somente_venda_avista ?? false),
    pedido_minimo: Number(raw?.pedido_minimo ?? 0),
    indice_financeiro: Number(raw?.indice_financeiro ?? 0),
    validade: raw?.validade ? String(raw.validade) : null,
    forma_pagto_id: raw?.forma_pagto_id != null ? Number(raw.forma_pagto_id) : null,
    prazo_pagto_id: raw?.prazo_pagto_id != null ? Number(raw.prazo_pagto_id) : null,
    inativo: Boolean(raw?.inativo ?? false),
    padrao: Boolean(raw?.padrao ?? false),
    tabela_referencia_id: raw?.tabela_referencia_id != null ? Number(raw.tabela_referencia_id) : null,
    tabela_referencia_percentual: raw?.tabela_referencia_percentual != null ? Number(raw.tabela_referencia_percentual) : null,
  };
}

function normalizeTabelaPrecoItem(raw: any): TabelaPrecoItem {
  return {
    tabela_preco_id: Number(raw?.tabela_preco_id ?? 0),
    produto_id: Number(raw?.produto_id ?? 0),
    codigo_produto: String(raw?.codigo_produto ?? '').trim(),
    descricao_produto: String(raw?.descricao_produto ?? '').trim(),
    apresentacao: String(raw?.apresentacao ?? '').trim(),
    custo: Number(raw?.custo ?? 0),
    produto_inativo: Boolean(raw?.produto_inativo ?? false),
    preco: Number(raw?.preco ?? 0),
    desconto_maximo: Number(raw?.desconto_maximo ?? 0),
    desconto_valor: Number(raw?.desconto_valor ?? 0),
    comissao: Number(raw?.comissao ?? 0),
    permite_bonificacao: Boolean(raw?.permite_bonificacao ?? false),
    permite_debito_credito: Boolean(raw?.permite_debito_credito ?? false),
    permite_venda_especial: Boolean(raw?.permite_venda_especial ?? false),
    produto_em_promocao: Boolean(raw?.produto_em_promocao ?? false),
    quantidade_minima: Number(raw?.quantidade_minima ?? 0),
    pvs: Number(raw?.pvs ?? 0),
    markup: Number(raw?.markup ?? 0),
    despesa: Number(raw?.despesa ?? 0),
    lucro: Number(raw?.lucro ?? 0),
    frete: Number(raw?.frete ?? 0),
    majoracao: Number(raw?.majoracao ?? 0),
    un: String(raw?.un ?? '').trim(),
    estoque: Number(raw?.estoque ?? 0),
    ean13: String(raw?.ean13 ?? '').trim(),
    codigo_fabrica: String(raw?.codigo_fabrica ?? '').trim(),
    marca: String(raw?.marca ?? '').trim(),
    multiplo_de_vendas: raw?.multiplo_de_vendas != null ? Number(raw.multiplo_de_vendas) : null,
    principio_ativo: raw?.principio_ativo ? String(raw.principio_ativo).trim() : null,
    preco_nacional_consumidor: raw?.preco_nacional_consumidor != null ? Number(raw.preco_nacional_consumidor) : null,
    divisao: String(raw?.divisao ?? '').trim(),
    fornecedor: String(raw?.fornecedor ?? '').trim(),
    has_escala: Boolean(raw?.has_escala ?? false),
    escala_tiers: Array.isArray(raw?.escala_tiers)
      ? raw.escala_tiers.map((t: any) => ({
          quantidade: Number(t.quantidade ?? 0),
          desconto: Number(t.desconto ?? 0),
          comissao: Number(t.comissao ?? 0),
        }))
      : null,
  };
}

export interface TabelaPrecoDivisao {
  id: number;
  empresa_id: number;
  tabela_preco_id: number;
  divisao_id: number;
  percentual_ajuste: number;
  codigo_divisao: string;
  descricao_divisao: string;
  codigo_tabela_preco: string;
}

function normalizeTabelaPrecoDivisao(raw: any): TabelaPrecoDivisao {
  return {
    id: Number(raw?.id ?? 0),
    empresa_id: Number(raw?.empresa_id ?? 0),
    tabela_preco_id: Number(raw?.tabela_preco_id ?? 0),
    divisao_id: Number(raw?.divisao_id ?? 0),
    percentual_ajuste: Number(raw?.percentual_ajuste ?? 0),
    codigo_divisao: String(raw?.codigo_divisao ?? '').trim(),
    descricao_divisao: String(raw?.descricao_divisao ?? '').trim(),
    codigo_tabela_preco: String(raw?.codigo_tabela_preco ?? '').trim(),
  };
}

export interface TabelaPrecoEscala {
  id: number;
  quantidade: number;
  desconto: number;
  comissao: number;
}

export interface ComparacaoItem {
  produto_id: number;
  codigo_produto: string;
  descricao_produto: string;
  apresentacao: string;
  un: string;
  marca: string;
  divisao: string;
  fornecedor: string;
  preco_a: number;
  desconto_a: number;
  preco_b: number;
  desconto_b: number;
  dif_reais: number;
  dif_pct: number;
}

export interface ListaItem {
  produto_id: number;
  codigo_produto: string;
  descricao_produto: string;
  apresentacao: string;
  un: string;
  marca: string;
  codigo_fabrica: string;
  ean13: string;
  multiplo_de_vendas: number;
  estoque: number;
  divisao: string;
  grupo: string;
  fornecedor: string;
  preco: number;
  desconto_maximo: number;
  comissao: number;
  quantidade_minima: number;
  permite_bonificacao: boolean;
  permite_debito_credito: boolean;
  permite_venda_especial: boolean;
  produto_em_promocao: boolean;
  custo: number;
  pvs: number;
}

export type OrdemLista = 'divisao_descricao' | 'produto' | 'descricao' | 'marca' | 'fornecedor';

export const tabelasPrecoService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    status: 'ativos' | 'inativos' | 'todos' = 'ativos',
  ): Promise<{ data: TabelaPreco[]; total: number }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;

    if (!empresaId) {
      console.warn('tabelasPrecoService.getAll: empresaId não encontrado');
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
      const response = await apiClient.fetch(`${API_BASE}/api/tabelas-precos?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      const arr = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      return {
        data: arr.map(normalizeTabelaPreco),
        total: result?.total ?? arr.length,
      };
    } catch (error) {
      console.error('Erro ao buscar tabelas de preço:', error);
      return { data: [], total: 0 };
    }
  },

  async getById(id: number): Promise<TabelaPreco | null> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) return null;

    try {
      const response = await apiClient.fetch(
        `${API_BASE}/api/tabelas-precos/${id}?empresaId=${empresaId}`,
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return normalizeTabelaPreco(result);
    } catch (error) {
      console.error('Erro ao buscar tabela de preço:', error);
      return null;
    }
  },

  async create(data: {
    descricao_tabela_preco: string;
    codigo_tabela_preco?: string;
    prazo_medio?: number | null;
    somente_venda_avista?: boolean;
    pedido_minimo?: number;
    indice_financeiro?: number;
    validade?: string | null;
    forma_pagto_id?: number | null;
    prazo_pagto_id?: number | null;
    inativo?: boolean;
    tabela_referencia_id?: number | null;
    tabela_referencia_percentual?: number | null;
  }): Promise<TabelaPreco> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/tabelas-precos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId, data }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao criar tabela de preço');
    }
    return normalizeTabelaPreco(await response.json());
  },

  async update(
    id: number,
    data: Partial<{
      descricao_tabela_preco: string;
      codigo_tabela_preco: string;
      prazo_medio: number | null;
      somente_venda_avista: boolean;
      pedido_minimo: number;
      indice_financeiro: number;
      validade: string | null;
      forma_pagto_id: number | null;
      prazo_pagto_id: number | null;
      inativo: boolean;
      tabela_referencia_id: number | null;
      tabela_referencia_percentual: number | null;
    }>,
  ): Promise<TabelaPreco> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${id}?empresaId=${empresaId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao atualizar tabela de preço');
    }
    return normalizeTabelaPreco(await response.json());
  },

  async setPadrao(id: number, padrao: boolean): Promise<TabelaPreco> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${id}/padrao?empresaId=${empresaId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ padrao }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao definir tabela padrão');
    }
    return normalizeTabelaPreco(await response.json());
  },

  async delete(id: number): Promise<void> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${id}?empresaId=${empresaId}`,
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao excluir tabela de preço');
    }
  },

  async getItens(
    tabelaId: number,
    query?: string,
    page = 1,
    limit = 100,
    filters?: {
      status?: 'ativos' | 'inativos' | 'todos';
      fornecedorId?: number;
      divisaoId?: number;
      marca?: string;
      lancamento?: boolean;
      possuiFoto?: boolean;
      permiteVendaB2b?: boolean;
      permiteVendaB2c?: boolean;
      escala?: 'com' | 'sem';
    },
  ): Promise<{ data: TabelaPrecoItem[]; total: number }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) return { data: [], total: 0 };

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (query?.trim()) params.set('q', query.trim());
    if (filters?.status) params.set('status', filters.status);
    if (filters?.fornecedorId) params.set('fornecedorId', String(filters.fornecedorId));
    if (filters?.divisaoId) params.set('divisaoId', String(filters.divisaoId));
    if (filters?.marca?.trim()) params.set('marca', filters.marca.trim());
    if (filters?.lancamento) params.set('lancamento', 'true');
    if (filters?.possuiFoto) params.set('possuiFoto', 'true');
    if (filters?.permiteVendaB2b) params.set('permiteVendaB2b', 'true');
    if (filters?.permiteVendaB2c) params.set('permiteVendaB2c', 'true');
    if (filters?.escala) params.set('escala', filters.escala);

    try {
      const response = await apiClient.fetch(
        `${API_BASE}/api/tabelas-precos/${tabelaId}/itens?${params.toString()}`,
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      const arr = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      return {
        data: arr.map(normalizeTabelaPrecoItem),
        total: result?.total ?? arr.length,
      };
    } catch (error) {
      console.error('Erro ao buscar itens da tabela de preço:', error);
      return { data: [], total: 0 };
    }
  },

  async upsertItem(
    tabelaId: number,
    data: {
      produto_id: number;
      preco?: number;
      desconto_maximo?: number;
      desconto_valor?: number;
      comissao?: number;
      permite_bonificacao?: boolean;
      permite_debito_credito?: boolean;
      permite_venda_especial?: boolean;
      produto_em_promocao?: boolean;
      quantidade_minima?: number;
      pvs?: number;
      markup?: number;
      despesa?: number;
      lucro?: number;
      frete?: number;
      majoracao?: number;
    },
  ): Promise<TabelaPrecoItem> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/itens`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, data }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao salvar item');
    }
    return normalizeTabelaPrecoItem(await response.json());
  },

  async updateItem(
    tabelaId: number,
    produtoId: number,
    data: Partial<{
      preco: number;
      desconto_maximo: number;
      desconto_valor: number;
      comissao: number;
      permite_bonificacao: boolean;
      permite_debito_credito: boolean;
      permite_venda_especial: boolean;
      produto_em_promocao: boolean;
      quantidade_minima: number;
      pvs: number;
      markup: number;
      despesa: number;
      lucro: number;
      frete: number;
      majoracao: number;
    }>,
  ): Promise<TabelaPrecoItem> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/itens/${produtoId}?empresaId=${empresaId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao atualizar item');
    }
    return normalizeTabelaPrecoItem(await response.json());
  },

  async copiarItens(
    origemId: number,
    destinoTabelaId: number,
    filters?: { fornecedorId?: number; divisaoId?: number; marca?: string; produtoIds?: number[] },
  ): Promise<{ total: number; copiados: number; ignorados: number }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${origemId}/copiar-itens`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          destinoTabelaId,
          produtoIds: filters?.produtoIds ?? null,
          fornecedorId: filters?.fornecedorId ?? null,
          divisaoId: filters?.divisaoId ?? null,
          marca: filters?.marca ?? null,
        }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao copiar itens');
    }
    return response.json();
  },

  async iniciarAplicarReferenciaTodas(): Promise<{ jobId: string }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/aplicar-referencia-todas`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao iniciar processo');
    }
    return response.json();
  },

  async aplicarReferencia(tabelaId: number): Promise<{ totalAtualizados: number; message?: string }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/aplicar-referencia`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao aplicar referência');
    }
    return response.json();
  },

  async deleteItem(tabelaId: number, produtoId: number): Promise<void> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/itens/${produtoId}?empresaId=${empresaId}`,
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao excluir item');
    }
  },

  // ── Divisões ────────────────────────────────────────────────────────────

  async getDivisoes(
    tabelaId: number,
    query?: string,
  ): Promise<{ data: TabelaPrecoDivisao[]; total: number }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) return { data: [], total: 0 };

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    if (query?.trim()) params.set('q', query.trim());

    try {
      const response = await apiClient.fetch(
        `${API_BASE}/api/tabelas-precos/${tabelaId}/divisoes?${params.toString()}`,
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      const arr = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      return { data: arr.map(normalizeTabelaPrecoDivisao), total: result?.total ?? arr.length };
    } catch (error) {
      console.error('Erro ao buscar divisões da tabela:', error);
      return { data: [], total: 0 };
    }
  },

  async createDivisao(
    tabelaId: number,
    data: { divisao_id: number; percentual_ajuste: number },
  ): Promise<TabelaPrecoDivisao> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/divisoes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, ...data }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao criar divisão');
    }
    return normalizeTabelaPrecoDivisao(await response.json());
  },

  async updateDivisao(
    tabelaId: number,
    divisaoId: number,
    data: { percentual_ajuste: number },
  ): Promise<TabelaPrecoDivisao> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/divisoes/${divisaoId}?empresaId=${empresaId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao atualizar divisão');
    }
    return normalizeTabelaPrecoDivisao(await response.json());
  },

  async deleteDivisao(tabelaId: number, divisaoId: number): Promise<void> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/divisoes/${divisaoId}?empresaId=${empresaId}`,
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao excluir divisão');
    }
  },

  async listEscala(tabelaId: number, produtoId: number): Promise<TabelaPrecoEscala[]> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');
    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/escala/${produtoId}?empresaId=${empresaId}`,
    );
    if (!response.ok) throw new Error('Erro ao carregar escala');
    return response.json();
  },

  async createEscala(
    tabelaId: number,
    produtoId: number,
    data: { quantidade: number; desconto: number; comissao: number },
  ): Promise<TabelaPrecoEscala> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');
    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/escala/${produtoId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, ...data }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao criar escala');
    }
    return response.json();
  },

  async updateEscala(
    tabelaId: number,
    produtoId: number,
    escalaId: number,
    data: { quantidade?: number; desconto?: number; comissao?: number },
  ): Promise<TabelaPrecoEscala> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');
    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/escala/${produtoId}/${escalaId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, ...data }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao atualizar escala');
    }
    return response.json();
  },

  async listItensAjuste(tabelaId: number, filters: { fornecedorId?: number; divisaoId?: number; grupoId?: number; marca?: string } = {}): Promise<Array<{ produto_id: number; codigo_produto: string; descricao_produto: string; apresentacao: string; preco: number }>> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');
    const params = new URLSearchParams({ empresaId: String(empresaId), limit: '5000', status: 'ativos' });
    if (filters.fornecedorId) params.set('fornecedorId', String(filters.fornecedorId));
    if (filters.divisaoId) params.set('divisaoId', String(filters.divisaoId));
    if (filters.grupoId) params.set('grupoId', String(filters.grupoId));
    if (filters.marca) params.set('marca', filters.marca);
    const response = await apiClient.fetch(`${API_BASE}/api/tabelas-precos/${tabelaId}/itens?${params}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || 'Erro ao carregar itens');
    }
    const json = await response.json();
    return (json.data ?? json) as any[];
  },

  async ajusteLinear(tabelaId: number, updates: Array<{ produto_id: number; preco: number }>): Promise<{ atualizados: number }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');
    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/ajuste-linear`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empresaId, updates }) },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || 'Erro ao salvar ajuste');
    }
    return response.json();
  },

  async deleteEscala(tabelaId: number, produtoId: number, escalaId: number): Promise<void> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');
    const response = await apiClient.fetch(
      `${API_BASE}/api/tabelas-precos/${tabelaId}/escala/${produtoId}/${escalaId}?empresaId=${empresaId}`,
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao excluir escala');
    }
  },

  async comparacaoTabelas(
    tabelaAId: number,
    tabelaBId: number,
    filters: { fornecedorIds?: string[]; divisaoIds?: string[]; grupoIds?: string[]; marca?: string; ordem?: OrdemLista } = {},
  ): Promise<ComparacaoItem[]> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');
    const params = new URLSearchParams({ empresaId: String(empresaId), tabelaAId: String(tabelaAId), tabelaBId: String(tabelaBId) });
    if (filters.fornecedorIds?.length) params.set('fornecedorIds', filters.fornecedorIds.join(','));
    if (filters.divisaoIds?.length) params.set('divisaoIds', filters.divisaoIds.join(','));
    if (filters.grupoIds?.length) params.set('grupoIds', filters.grupoIds.join(','));
    if (filters.marca) params.set('marca', filters.marca);
    if (filters.ordem) params.set('ordem', filters.ordem);
    const response = await apiClient.fetch(`${API_BASE}/api/tabelas-precos/comparacao?${params}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || 'Erro ao comparar tabelas');
    }
    return response.json();
  },

  async listaTabelaPreco(
    tabelaId: number,
    filters: {
      fornecedorIds?: string[];
      excetoFornecedorIds?: string[];
      divisaoIds?: string[];
      excetoDivisaoIds?: string[];
      grupoIds?: string[];
      marca?: string;
      ordem?: OrdemLista;
      somente_estoque?: boolean;
      somente_promocao?: boolean;
    } = {},
  ): Promise<ListaItem[]> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');
    const params = new URLSearchParams({ empresaId: String(empresaId) });
    if (filters.fornecedorIds?.length) params.set('fornecedorIds', filters.fornecedorIds.join(','));
    if (filters.excetoFornecedorIds?.length) params.set('excetoFornecedorIds', filters.excetoFornecedorIds.join(','));
    if (filters.divisaoIds?.length) params.set('divisaoIds', filters.divisaoIds.join(','));
    if (filters.excetoDivisaoIds?.length) params.set('excetoDivisaoIds', filters.excetoDivisaoIds.join(','));
    if (filters.grupoIds?.length) params.set('grupoIds', filters.grupoIds.join(','));
    if (filters.marca) params.set('marca', filters.marca);
    if (filters.ordem) params.set('ordem', filters.ordem);
    if (filters.somente_estoque) params.set('somente_estoque', 'true');
    if (filters.somente_promocao) params.set('somente_promocao', 'true');
    const response = await apiClient.fetch(`${API_BASE}/api/tabelas-precos/${tabelaId}/lista?${params}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || 'Erro ao carregar lista');
    }
    return response.json();
  },

  async getPrecosPorProduto(produtoId: number): Promise<PrecoPorProduto[]> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');
    const response = await apiClient.fetch(
      `${API_BASE}/api/produtos/${produtoId}/tabelas-precos?empresaId=${empresaId}`,
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || 'Erro ao carregar preços do produto');
    }
    const data = await response.json();
    const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return arr.map((r): PrecoPorProduto => ({
      tabela_preco_id: Number(r.tabela_preco_id ?? 0),
      produto_id: Number(r.produto_id ?? 0),
      empresa_id: Number(r.empresa_id ?? 0),
      codigo_tabela_preco: String(r.codigo_tabela_preco ?? '').trim(),
      descricao_tabela_preco: String(r.descricao_tabela_preco ?? '').trim(),
      preco: Number(r.preco ?? 0),
      pvs: Number(r.pvs ?? 0),
      preco_aplicado: Number(r.preco_aplicado ?? r.pvs ?? r.preco ?? 0),
      desconto_maximo: r.desconto_maximo != null ? Number(r.desconto_maximo) : null,
      comissao: r.comissao != null ? Number(r.comissao) : null,
      quantidade_minima: r.quantidade_minima != null ? Number(r.quantidade_minima) : null,
      despesa: Number(r.despesa ?? 0),
      lucro: Number(r.lucro ?? 0),
      frete: Number(r.frete ?? 0),
      majoracao: Number(r.majoracao ?? 0),
      markup: Number(r.markup ?? 0),
      custo_compra: Number(r.custo_compra ?? 0),
      permite_debito_credito: Boolean(r.permite_debito_credito ?? false),
      permite_bonificacao: Boolean(r.permite_bonificacao ?? false),
      permite_venda_especial: Boolean(r.permite_venda_especial ?? false),
      produto_em_promocao: Boolean(r.produto_em_promocao ?? false),
    }));
  },
};
