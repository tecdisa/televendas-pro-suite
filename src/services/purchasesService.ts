import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface PurchaseOrder {
  id: number;
  data: string;
  pedido: string;
  representanteId?: string;
  representanteCodigo?: string;
  representanteNome?: string;
  clienteId?: number;
  clienteNome?: string;
  operacao?: string;
  operacaoDescricao?: string;
  prazo?: string;
  total?: number;
  numero?: string;
  itens?: PurchaseItem[];
}

export interface PurchaseItem {
  id?: number;
  produtoId: number;
  codigoProduto?: string;
  descricao: string;
  un?: string;
  quant: number;
  preco: number;
  descontoPerc?: number;
  total: number;
}

export interface PurchaseSummary {
  compras: number;
  devolucoes: number;
  devolucoesPerc: number;
  bonificacoes: number;
  bonificacoesPerc: number;
  trocas: number;
  trocasPerc: number;
}

export interface PurchasesFilters {
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}

function normalizeItem(raw: any): PurchaseItem {
  return {
    id: raw?.id ?? raw?.item_id ?? 0,
    produtoId: raw?.produto_id ?? raw?.produtoId ?? 0,
    codigoProduto: raw?.codigo_produto ?? raw?.codigoProduto ?? raw?.produtoCodigo ?? '',
    descricao: raw?.descricao ?? raw?.produto_descricao ?? raw?.produtoDescricao ?? '',
    un: raw?.un ?? raw?.unidade ?? '',
    quant: raw?.quant ?? raw?.quantidade ?? 0,
    preco: raw?.preco ?? raw?.preco_unitario ?? raw?.precoUnitario ?? 0,
    descontoPerc: raw?.desconto_perc ?? raw?.descontoPerc ?? raw?.percentual_desconto ?? 0,
    total: raw?.total ?? raw?.valor_total ?? raw?.valorTotal ?? 0,
  };
}

function normalizeOrder(raw: any): PurchaseOrder {
  return {
    id: raw?.id ?? raw?.pedido_id ?? raw?.pedidoId ?? 0,
    data: raw?.data ?? raw?.data_pedido ?? raw?.dataPedido ?? '',
    pedido: raw?.pedido ?? raw?.numero ?? raw?.numero_pedido ?? raw?.numeroPedido ?? String(raw?.id ?? ''),
    representanteId:
      raw?.representante_id ??
      raw?.representanteId ??
      raw?.forca_de_venda_id ??
      raw?.forcaDeVendaId ??
      '',
    representanteCodigo:
      raw?.representante_codigo ??
      raw?.representanteCodigo ??
      raw?.codigo_representante ??
      raw?.codigo_forca_de_vendas ??
      raw?.codigoForcaDeVendas ??
      '',
    representanteNome:
      raw?.representante_nome ??
      raw?.representanteNome ??
      raw?.nome_representante ??
      raw?.forca_de_vendas_nome ??
      raw?.forcaDeVendasNome ??
      raw?.nome_forca_de_vendas ??
      '',
    clienteId: raw?.cliente_id ?? raw?.clienteId ?? 0,
    clienteNome: raw?.cliente_nome ?? raw?.clienteNome ?? '',
    operacao: raw?.operacao ?? raw?.operacao_codigo ?? raw?.operacaoCodigo ?? '',
    operacaoDescricao: raw?.operacao_descricao ?? raw?.operacaoDescricao ?? raw?.operacaoNome ?? '',
    prazo: raw?.prazo ?? raw?.prazo_pagamento ?? raw?.prazoPagamento ?? '',
    total: raw?.total ?? raw?.valor ?? raw?.valor_total ?? 0,
    numero: raw?.numero ?? raw?.numero_nf ?? raw?.numeroNF ?? '',
    itens: Array.isArray(raw?.itens) ? raw.itens.map(normalizeItem) : [],
  };
}

export const purchasesService = {
  getByClienteId: async (clienteId: number, filters?: PurchasesFilters): Promise<{ orders: PurchaseOrder[]; summary: PurchaseSummary }> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      params.set('clienteId', String(clienteId));
      
      if (filters?.dataInicio) params.set('dataInicio', filters.dataInicio);
      if (filters?.dataFim) params.set('dataFim', filters.dataFim);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const url = `${API_BASE}/api/pedidos/ultimas-compras?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      
      const res = await apiClient.fetch(url, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        let message = 'Falha ao buscar últimas compras';
        try {
          const err = await res.json();
          message = err?.message ?? err?.error ?? message;
        } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.pedidos) ? data.pedidos : [];
      const orders = arr.map(normalizeOrder);
      
      // Extract or calculate summary
      const summary: PurchaseSummary = {
        compras: data?.compras ?? data?.totalCompras ?? orders.reduce((sum, o) => sum + (o.total || 0), 0),
        devolucoes: data?.devolucoes ?? data?.totalDevolucoes ?? 0,
        devolucoesPerc: data?.devolucoesPerc ?? data?.percentualDevolucoes ?? 0,
        bonificacoes: data?.bonificacoes ?? data?.totalBonificacoes ?? 0,
        bonificacoesPerc: data?.bonificacoesPerc ?? data?.percentualBonificacoes ?? 0,
        trocas: data?.trocas ?? data?.totalTrocas ?? 0,
        trocasPerc: data?.trocasPerc ?? data?.percentualTrocas ?? 0,
      };

      return { orders, summary };
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  getOrderDetail: async (orderId: number): Promise<PurchaseOrder> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const url = `${API_BASE}/api/pedidos/${encodeURIComponent(orderId)}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      
      const res = await apiClient.fetch(url, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        let message = 'Falha ao buscar detalhes do pedido';
        try {
          const err = await res.json();
          message = err?.message ?? err?.error ?? message;
        } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      return normalizeOrder(data);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
};
