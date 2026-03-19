import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface Receivable {
  id?: string | number;
  empresa_id: number;
  areceber_id: string | number;
  ads_areceber_id?: number;
  documento_tipo?: string;
  documento_numero?: string;
  nosso_numero_boleto?: string;
  nf?: number;
  cliente_id?: number;
  representante_id?: number;
  datapagto?: string | null;
  emissao?: string;
  vencto?: string;
  valor?: number;
  saldo?: number;
  emcartorio?: boolean;
}

export interface ReceivablesFilters {
  clienteId?: number;
  representanteId?: number;
  dataInicio?: string; // yyyy-MM-dd
  dataFim?: string; // yyyy-MM-dd
  page?: number;
  limit?: number;
}

function normalizeReceivable(raw: any): Receivable {
  return {
    id: raw?.areceber_id ?? raw?.id ?? undefined,
    empresa_id: Number(raw?.empresa_id ?? 0),
    areceber_id: raw?.areceber_id ?? raw?.id ?? '',
    ads_areceber_id: raw?.ads_areceber_id ?? undefined,
    documento_tipo: raw?.documento_tipo ?? undefined,
    documento_numero: raw?.documento_numero ?? undefined,
    nosso_numero_boleto: raw?.nosso_numero_boleto ?? undefined,
    nf: raw?.nf ?? undefined,
    cliente_id: raw?.cliente_id ?? raw?.clienteId ?? undefined,
    representante_id:
      raw?.representante_id ??
      raw?.representanteId ??
      raw?.forca_de_venda_id ??
      raw?.forcaDeVendaId ??
      undefined,
    datapagto: raw?.datapagto ?? raw?.data_pagto ?? null,
    emissao: raw?.emissao ?? undefined,
    vencto: raw?.vencto ?? raw?.vencimento ?? undefined,
    valor: typeof raw?.valor === 'number' ? raw.valor : Number(raw?.valor ?? 0) || 0,
    saldo: typeof raw?.saldo === 'number' ? raw.saldo : Number(raw?.saldo ?? 0) || 0,
    emcartorio: Boolean(raw?.emcartorio ?? false),
  };
}

export const receivablesService = {
  getByClienteId: async (clienteId: number, filters?: ReceivablesFilters): Promise<Receivable[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      params.set('clienteId', String(clienteId));
      
      if (filters?.representanteId) params.set('representanteId', String(filters.representanteId));
      if (filters?.dataInicio) params.set('dataInicio', filters.dataInicio);
      if (filters?.dataFim) params.set('dataFim', filters.dataFim);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const url = `${API_BASE}/api/areceber?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      
      const res = await apiClient.fetch(url, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        let message = 'Falha ao buscar contas a receber';
        try {
          const err = await res.json();
          message = err?.message ?? err?.error ?? message;
        } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      return arr.map(normalizeReceivable);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
};
