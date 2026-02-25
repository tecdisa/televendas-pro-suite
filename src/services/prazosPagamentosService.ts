import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface PrazoPagamento {
  prazo_pagto_id: number;
  codigo_prazopagto?: string;
  descricao_prazo_pagto: string;
  avista?: boolean;
  somente_cartao?: boolean;
  prazo_negociado?: boolean;
  forma_pagto_id?: number | null;
  numero_de_parcelas?: number;
  prazos_em_dias?: string | null;
  pedido_minimo?: number;
  prazo_medio?: number;
  comissao?: number;
  liberado_app_mobile?: boolean;
  liberado_b2b?: boolean;
  liberado_b2c?: boolean;
  inativo?: boolean;
}

export interface PrazoPagamentoFormData {
  codigo_prazopagto?: string;
  descricao_prazo_pagto: string;
  avista?: boolean;
  somente_cartao?: boolean;
  prazo_negociado?: boolean;
  forma_pagto_id?: number | null;
  numero_de_parcelas?: number;
  prazos_em_dias?: string | null;
  pedido_minimo?: number;
  comissao?: number;
  liberado_app_mobile?: boolean;
  liberado_b2b?: boolean;
  liberado_b2c?: boolean;
  inativo?: boolean;
}

function normalize(raw: any): PrazoPagamento {
  return {
    prazo_pagto_id: raw.prazo_pagto_id ?? raw.prazoPagtoId ?? raw.id ?? 0,
    codigo_prazopagto: raw.codigo_prazopagto ?? raw.codigoPrazopagto ?? '',
    descricao_prazo_pagto: raw.descricao_prazo_pagto ?? raw.descricaoPrazoPagto ?? raw.descricao ?? '',
    avista: raw.avista ?? false,
    somente_cartao: raw.somente_cartao ?? raw.somenteCartao ?? false,
    prazo_negociado: raw.prazo_negociado ?? raw.prazoNegociado ?? false,
    forma_pagto_id: raw.forma_pagto_id ?? raw.formaPagtoId ?? null,
    numero_de_parcelas: raw.numero_de_parcelas ?? raw.numeroDeParcelas ?? 0,
    prazos_em_dias: raw.prazos_em_dias ?? raw.prazosEmDias ?? null,
    pedido_minimo: raw.pedido_minimo ?? raw.pedidoMinimo ?? 0,
    prazo_medio: raw.prazo_medio ?? raw.prazoMedio ?? 0,
    comissao: raw.comissao ?? 0,
    liberado_app_mobile: raw.liberado_app_mobile ?? raw.liberadoAppMobile ?? false,
    liberado_b2b: raw.liberado_b2b ?? raw.liberadoB2b ?? false,
    liberado_b2c: raw.liberado_b2c ?? raw.liberadoB2c ?? false,
    inativo: raw.inativo ?? false,
  };
}

async function getEmpresaId(): Promise<number> {
  const empresa = authService.getEmpresa();
  if (!empresa) throw new Error('Empresa não selecionada');
  return empresa.empresa_id;
}

export const prazosPagamentosService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    status: 'ativos' | 'inativos' | 'todos' = 'ativos',
    filters?: {
      cartao?: boolean;
      mobile?: boolean;
      b2b?: boolean;
    }
  ): Promise<{ data: PrazoPagamento[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('status', status);
    if (status === 'todos') params.set('incluirInativos', 'true');
    if (filters?.cartao !== undefined) params.set('cartao', String(filters.cartao));
    if (filters?.mobile !== undefined) params.set('mobile', String(filters.mobile));
    if (filters?.b2b !== undefined) params.set('b2b', String(filters.b2b));

    const url = `${API_BASE}/api/prazos-pagamentos?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      let message = 'Falha ao buscar prazos de pagamento';
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

  async getById(id: number): Promise<PrazoPagamento | null> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/prazos-pagamentos/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar prazo de pagamento';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async create(data: PrazoPagamentoFormData): Promise<PrazoPagamento> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/prazos-pagamentos`;
    const body = {
      empresaId,
      data: {
        descricao_prazo_pagto: data.descricao_prazo_pagto,
        codigo_prazopagto: data.codigo_prazopagto || undefined,
        avista: data.avista ?? false,
        somente_cartao: data.somente_cartao ?? false,
        prazo_negociado: data.prazo_negociado ?? false,
        forma_pagto_id: data.forma_pagto_id ?? null,
        numero_de_parcelas: data.numero_de_parcelas ?? undefined,
        prazos_em_dias: data.prazos_em_dias || null,
        pedido_minimo: data.pedido_minimo ?? undefined,
        comissao: data.comissao ?? undefined,
        liberado_app_mobile: data.liberado_app_mobile ?? false,
        liberado_b2b: data.liberado_b2b ?? false,
        liberado_b2c: data.liberado_b2c ?? false,
        inativo: data.inativo ?? false,
      },
    };

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao criar prazo de pagamento';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async update(id: number, data: Partial<PrazoPagamentoFormData>): Promise<PrazoPagamento> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/prazos-pagamentos/${id}?empresaId=${empresaId}`;
    const body = { data };

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao atualizar prazo de pagamento';
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
    const url = `${API_BASE}/api/prazos-pagamentos/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir prazo de pagamento';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
  },
};
