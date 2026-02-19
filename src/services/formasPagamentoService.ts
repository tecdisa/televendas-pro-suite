import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface FormaPagamento {
  forma_pagto_id: number;
  codigo_formapagto: string;
  descricao_forma_pagto: string;
  somente_avista?: boolean;
  boleto?: boolean;
  cartao_debito?: boolean;
  cartao_credito?: boolean;
  pix?: boolean;
  indice_financeiro?: number | null;
  taxa_adicional?: number | null;
  liberado_app_mobile?: boolean;
  liberado_b2b?: boolean;
  liberado_b2c?: boolean;
  prazo_pagto_id?: number | null;
  inativo?: boolean;
}

export interface FormaPagamentoFormData {
  codigo_formapagto?: string;
  descricao_forma_pagto: string;
  somente_avista?: boolean;
  boleto?: boolean;
  cartao_debito?: boolean;
  cartao_credito?: boolean;
  pix?: boolean;
  indice_financeiro?: number | null;
  taxa_adicional?: number | null;
  liberado_app_mobile?: boolean;
  liberado_b2b?: boolean;
  liberado_b2c?: boolean;
  prazo_pagto_id?: number | null;
  inativo?: boolean;
}

function normalize(raw: any): FormaPagamento {
  return {
    forma_pagto_id: raw.forma_pagto_id ?? raw.formaPagtoId ?? raw.id ?? 0,
    codigo_formapagto: raw.codigo_formapagto ?? raw.codigoFormapagto ?? '',
    descricao_forma_pagto: raw.descricao_forma_pagto ?? raw.descricaoFormaPagto ?? raw.descricao ?? '',
    somente_avista: raw.somente_avista ?? raw.somenteAvista ?? false,
    boleto: raw.boleto ?? false,
    cartao_debito: raw.cartao_debito ?? raw.cartaoDebito ?? false,
    cartao_credito: raw.cartao_credito ?? raw.cartaoCredito ?? false,
    pix: raw.pix ?? false,
    indice_financeiro: raw.indice_financeiro ?? raw.indiceFinanceiro ?? null,
    taxa_adicional: raw.taxa_adicional ?? raw.taxaAdicional ?? null,
    liberado_app_mobile: raw.liberado_app_mobile ?? raw.liberadoAppMobile ?? false,
    liberado_b2b: raw.liberado_b2b ?? raw.liberadoB2b ?? false,
    liberado_b2c: raw.liberado_b2c ?? raw.liberadoB2c ?? false,
    prazo_pagto_id: raw.prazo_pagto_id ?? raw.prazoPagtoId ?? null,
    inativo: raw.inativo ?? false,
  };
}

async function getEmpresaId(): Promise<number> {
  const empresa = authService.getEmpresa();
  if (!empresa) throw new Error('Empresa não selecionada');
  return empresa.empresa_id;
}

export const formasPagamentoService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    status: 'ativos' | 'inativos' | 'todos' = 'ativos'
  ): Promise<{ data: FormaPagamento[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('status', status);
    if (status === 'todos') params.set('incluirInativos', 'true');

    const url = `${API_BASE}/api/formas-pagamentos?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      let message = 'Falha ao buscar formas de pagamento';
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

  async getById(id: number): Promise<FormaPagamento | null> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/formas-pagamentos/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar forma de pagamento';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async create(data: FormaPagamentoFormData): Promise<FormaPagamento> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/formas-pagamentos`;
    const body = {
      empresaId,
      data: {
        descricao_forma_pagto: data.descricao_forma_pagto,
        somente_avista: data.somente_avista ?? false,
        boleto: data.boleto ?? false,
        cartao_debito: data.cartao_debito ?? false,
        cartao_credito: data.cartao_credito ?? false,
        pix: data.pix ?? false,
        indice_financeiro: data.indice_financeiro ?? null,
        taxa_adicional: data.taxa_adicional ?? null,
        liberado_app_mobile: data.liberado_app_mobile ?? false,
        liberado_b2b: data.liberado_b2b ?? false,
        liberado_b2c: data.liberado_b2c ?? false,
        prazo_pagto_id: data.prazo_pagto_id ?? null,
        inativo: data.inativo ?? false,
      },
    };

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao criar forma de pagamento';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async update(id: number, data: Partial<FormaPagamentoFormData>): Promise<FormaPagamento> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/formas-pagamentos/${id}?empresaId=${empresaId}`;
    const body = { data };

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao atualizar forma de pagamento';
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
    const url = `${API_BASE}/api/formas-pagamentos/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir forma de pagamento';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
  },
};
