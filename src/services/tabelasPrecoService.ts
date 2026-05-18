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
  tabela_referencia_id: number | null;
  tabela_referencia_percentual: number | null;
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
    filters?: { fornecedorId?: number; divisaoId?: number; marca?: string },
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
};
