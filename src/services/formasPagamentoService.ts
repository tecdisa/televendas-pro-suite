import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface FormaPagamento {
  forma_pagto_id: number;
  descricao_forma_pagto: string;
  boleto?: boolean;
  cartao?: boolean;
  envia_mobile?: boolean;
  permite_gerar_receber?: boolean;
  prazo_pagto_id?: number | null;
  meio_pagamento_id?: number | null;
  inativo?: boolean;
}

export interface FormaPagamentoFormData {
  descricao_forma_pagto: string;
  boleto?: boolean;
  cartao?: boolean;
  envia_mobile?: boolean;
  permite_gerar_receber?: boolean;
  prazo_pagto_id?: number | null;
  meio_pagamento_id?: number | null;
  inativo?: boolean;
}

function normalize(raw: any): FormaPagamento {
  return {
    forma_pagto_id: raw.forma_pagto_id ?? raw.formaPagtoId ?? raw.id ?? 0,
    descricao_forma_pagto: raw.descricao_forma_pagto ?? raw.descricaoFormaPagto ?? raw.descricao ?? '',
    boleto: raw.boleto ?? false,
    cartao: raw.cartao ?? false,
    envia_mobile: raw.envia_mobile ?? raw.enviaMobile ?? false,
    permite_gerar_receber: raw.permite_gerar_receber ?? raw.permiteGerarReceber ?? false,
    prazo_pagto_id: raw.prazo_pagto_id ?? raw.prazoPagtoId ?? null,
    meio_pagamento_id: raw.meio_pagamento_id ?? raw.meioPagamentoId ?? null,
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
    incluirInativos = false
  ): Promise<{ data: FormaPagamento[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (incluirInativos) params.set('incluirInativos', 'true');

    const url = `${API_BASE}/api/formas-pagamento?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      let message = 'Falha ao buscar formas de pagamento';
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

  async getById(id: number): Promise<FormaPagamento | null> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/formas-pagamento/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar forma de pagamento';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async create(data: FormaPagamentoFormData): Promise<FormaPagamento> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/formas-pagamento`;
    const body = {
      empresaId,
      data: {
        descricao_forma_pagto: data.descricao_forma_pagto,
        boleto: data.boleto ?? false,
        cartao: data.cartao ?? false,
        envia_mobile: data.envia_mobile ?? false,
        permite_gerar_receber: data.permite_gerar_receber ?? false,
        prazo_pagto_id: data.prazo_pagto_id ?? null,
        meio_pagamento_id: data.meio_pagamento_id ?? null,
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
        message = err?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async update(id: number, data: Partial<FormaPagamentoFormData>): Promise<FormaPagamento> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/formas-pagamento/${id}?empresaId=${empresaId}`;
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
        message = err?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return normalize(await res.json());
  },

  async delete(id: number): Promise<void> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/formas-pagamento/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir forma de pagamento';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
  },
};
