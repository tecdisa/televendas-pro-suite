import { pedidos } from '@/mocks/data';
import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';
import { productsService } from '@/services/productsService';

export interface OrderParcela {
  parcela: number;
  vencto: string; // ISO yyyy-mm-dd
  valor: number;
  entrada?: boolean; // parcela de entrada (depósito/TED) - não gera boleto
}

export interface OrderItemUI {
  produtoId: number;
  codigoProduto?: string;
  descricao: string;
  av: number;
  un: string;
  c: number;
  ordem?: number;
  quant: number;
  descontoPerc: number;
  preco: number;
  liquido: number;
  total: number;
  obs?: string;
  estoque?: number;
}

export interface Order {
  id: number;
  data: string;
  operacao: string;
  operacaoId?: number | string;
  operacaoCodigo?: string;
  operacaoDescricao?: string;
  clienteId: number;
  clienteCodigo?: string;
  clienteNome: string;
  representanteId: string;
  representanteCodigo?: string;
  representanteNome: string;
  tabela: string;
  formaPagamento: string;
  formaPagtoId?: number | string;
  prazo: string;
  prazoPagtoId?: number | string;
  boleto: boolean;
  rede: string;
  especial: boolean;
  situacao: string;
  valor: number;
  pedidoOrigem?: string;
  cancelado?: boolean;
  faturado?: boolean;
  itens: OrderItemUI[];
  totais: {
    bruto: number;
    descontos: number;
    descontosPerc: number;
    icmsRepasse: number;
    liquido: number;
  };
  observacaoCliente?: string;
  observacaoPedido?: string;
  observacaoNF?: string;
  transmitido?: boolean;
  clienteEndereco?: string;
  clienteNumero?: string;
  clienteComplemento?: string;
  clienteBairro?: string;
  clienteCidade?: string;
  clienteUf?: string;
  clienteCep?: string;
}

const firstNonEmpty = (...values: any[]): string | null => {
  for (const val of values) {
    if (val === undefined || val === null) continue;
    const text = String(val).trim();
    if (text) return text;
  }
  return null;
};

const textOrUndefined = (val: any): string | undefined => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string' || typeof val === 'number') {
    const text = String(val).trim();
    return text.length ? text : undefined;
  }
  return undefined;
};

const numberOrUndefined = (val: any): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  return Number.isFinite(num) ? num : undefined;
};

const extractFormaPagtoDescricao = (raw: any): string | undefined => {
  const formaObj =
    raw?.formaPagamento && typeof raw.formaPagamento === 'object'
      ? raw.formaPagamento
      : raw?.forma_pagamento;
  return (
    textOrUndefined(raw?.formaPagamento) ??
    textOrUndefined(raw?.forma_pagamento) ??
    textOrUndefined(formaObj?.descricao) ??
    textOrUndefined(formaObj?.nome)
  );
};

const extractPrazoDescricao = (raw: any): string | undefined => {
  const prazoObj =
    raw?.prazoPagamento && typeof raw.prazoPagamento === 'object'
      ? raw.prazoPagamento
      : raw?.prazo_pagamento;
  return (
    textOrUndefined(raw?.prazo) ??
    textOrUndefined(raw?.prazo_pagamento) ??
    textOrUndefined(raw?.prazoPagamento) ??
    textOrUndefined(prazoObj?.descricao) ??
    textOrUndefined(prazoObj?.nome)
  );
};

const buildPedidoOrigem = (val?: any): string => {
  // Se o front enviar algo já preenchido, respeita
  const incoming = typeof val === 'string' ? val.trim() : '';
  if (incoming) return incoming;

  // Gera um identificador único baseado em timestamp UTC + random
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0'),
    String(now.getUTCSeconds()).padStart(2, '0'),
  ].join('');
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `ADS-${stamp}-${rand}`;
};

const resolveOperacaoFields = (raw: any): { id?: number | string; codigo?: string; descricao?: string } => {
  const opObj = raw?.operacao && typeof raw.operacao === 'object' ? raw.operacao : null;
  const descricao = firstNonEmpty(
    raw?.operacaoDescricao,
    raw?.operacao_descricao,
    raw?.descricaoOperacao,
    raw?.descricao_operacao,
    raw?.operacaoNome,
    opObj?.descricao,
    opObj?.nome,
    typeof raw?.operacao === 'string' ? raw.operacao : null,
  );
  const codigo = firstNonEmpty(
    raw?.operacaoCodigo,
    raw?.operacao_codigo,
    raw?.operacaoCod,
    raw?.operacao_cod,
    opObj?.codigo,
    opObj?.cod,
    opObj?.id,
    opObj?.sigla,
    raw?.operacaoId,
    raw?.operacao_id,
    raw?.codigo_operacao,
    raw?.codigo,
  );

  const codigoStr = codigo ? String(codigo).trim() : '';
  const paddedCodigo =
    codigoStr && /^\d+$/.test(codigoStr) ? codigoStr.padStart(3, '0') : codigoStr;

  const id = raw?.operacaoId ?? raw?.operacao_id ?? opObj?.id;

  return {
    id: id as any,
    codigo: paddedCodigo || undefined,
    descricao: descricao || undefined,
  };
};

const coerceItensArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const nested = (value as any).data ?? (value as any).itens ?? (value as any).items;
    if (Array.isArray(nested)) return nested;
  }
  return [];
};

const extractItensArray = (payload: any): any[] => {
  const direct = coerceItensArray(payload);
  if (direct.length > 0) return direct;

  const candidates = [
    payload?.itens,
    payload?.itens_pedido,
    payload?.itensPedido,
    payload?.pedido_itens,
    payload?.items,
    payload?.order_items,
    payload?.orderItems,
  ];

  for (const candidate of candidates) {
    const arr = coerceItensArray(candidate);
    if (arr.length > 0) return arr;
  }

  return direct;
};

const normalizeItens = (raw: any): OrderItemUI[] => {
  const itens = extractItensArray(raw);
  return itens.map((it, idx) => {
    const produtoId = Number(it?.produtoId ?? it?.produto_id ?? it?.produto ?? it?.id) || 0;
    const quant = Number(it?.quant ?? it?.quantidade ?? it?.qtd) || 0;
    const descontoPerc =
      Number(it?.descontoPerc ?? it?.desconto_perc ?? it?.percentual_desconto ?? it?.desconto) || 0;
    const preco =
      Number(it?.preco ?? it?.preco_unitario ?? it?.precoUnitario ?? it?.valor_unitario) || 0;
    const total = Number(it?.total ?? it?.valor_total ?? it?.valorTotal ?? it?.valor) || 0;
    const liquidoRaw = it?.liquido ?? it?.valor_liquido ?? it?.valorLiquido;
    const liquido =
      typeof liquidoRaw === 'number' ? liquidoRaw : Number(liquidoRaw ?? (quant ? total / quant : 0)) || 0;

    return {
      ...it,
      produtoId,
      codigoProduto:
        it?.codigoProduto ??
        it?.codigo_produto ??
        it?.produto_codigo ??
        it?.produtoCod ??
        it?.produto_cod ??
        it?.codigo,
      descricao:
        it?.descricao ??
        it?.descricao_produto ??
        it?.produto_descricao ??
        it?.produtoDescricao ??
        it?.descricaoProduto ??
        '',
      av: Number(it?.av ?? 1) || 1,
      un: it?.un ?? it?.unidade ?? 'UN',
      c: Number(it?.c ?? 1) || 1,
      ordem: Number(it?.ordem ?? it?.order ?? it?.ord ?? idx + 1) || idx + 1,
      quant,
      descontoPerc,
      preco,
      liquido,
      total,
      obs: it?.obs ?? it?.observacao ?? it?.observacao_item ?? it?.observacaoItem,
      estoque: typeof it?.estoque === 'number' ? it.estoque : undefined,
    } as OrderItemUI;
  });
};

const extractFormaPagtoId = (raw: any): number | string | undefined => {
  const formaObj = raw?.formaPagamento || raw?.forma_pagamento;
  const candidates = [
    raw?.formaPagtoId,
    raw?.forma_pagto_id,
    raw?.forma_pagamento_id,
    raw?.formaPagamentoId,
    formaObj?.id,
  ];
  const val = candidates.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  return val as any;
};

const extractPrazoPagtoId = (raw: any): number | string | undefined => {
  const prazoObj = raw?.prazoPagamento || raw?.prazo_pagamento;
  const candidates = [
    raw?.prazoPagtoId,
    raw?.prazo_pagto_id,
    raw?.prazo_pagamento_id,
    raw?.prazoPagamentoId,
    prazoObj?.id,
  ];
  const val = candidates.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  return val as any;
};

const extractClienteCodigo = (raw: any): string | undefined => {
  const clienteObj = raw?.cliente && typeof raw.cliente === 'object' ? raw.cliente : null;
  const candidates = [
    raw?.clienteCodigo,
    raw?.cliente_codigo,
    raw?.codigo_cliente,
    raw?.codigoCliente,
    raw?.clienteCod,
    raw?.cliente_cod,
    clienteObj?.codigo,
    clienteObj?.codigo_cliente,
    clienteObj?.codigoCliente,
  ];

  for (const val of candidates) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'object') continue;
    const text = String(val).trim();
    if (text) return text;
  }
  return undefined;
};

const extractRepresentanteCodigo = (raw: any): string | undefined => {
  const repObj =
    raw?.representante && typeof raw.representante === 'object'
      ? raw.representante
      : raw?.forca_de_vendas && typeof raw.forca_de_vendas === 'object'
      ? raw.forca_de_vendas
      : raw?.forcaDeVendas && typeof raw.forcaDeVendas === 'object'
      ? raw.forcaDeVendas
      : null;
  const candidates = [
    raw?.representanteCodigo,
    raw?.representante_codigo,
    raw?.codigo_representante,
    raw?.codigoRepresentante,
    raw?.codigo_forca_de_vendas,
    raw?.codigoForcaDeVendas,
    raw?.representanteCod,
    raw?.representante_cod,
    repObj?.codigo,
    repObj?.codigo_representante,
    repObj?.codigoRepresentante,
    repObj?.codigo_forca_de_vendas,
    repObj?.codigoForcaDeVendas,
  ];

  for (const val of candidates) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'object') continue;
    const text = String(val).trim();
    if (text) return text;
  }
  return undefined;
};


export const ordersService = {
  list: async (filters?: any, page: number = 1, limit: number = 100) => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      // Map known filters to API params
      if (filters) {
        if (filters.representante) params.set('representante', String(filters.representante));
        // Accept both 'pedidoIds' and legacy 'pedidos'
        const pedidoIds = filters.pedidoIds ?? filters.pedidos;
        if (pedidoIds) params.set('pedidoIds', String(pedidoIds));
        if (filters.operacoes) params.set('operacoes', String(filters.operacoes));
        if (typeof filters.especial === 'boolean') params.set('especial', String(filters.especial));
        if (filters.situacao && filters.situacao !== '__ALL__' && filters.situacao !== 'Todos') {
          params.set('situacao', String(filters.situacao));
        }
        if (filters.dataInicio) params.set('dataInicio', String(filters.dataInicio));
        if (filters.dataFim) params.set('dataFim', String(filters.dataFim));
        if (filters.cliente) params.set('cliente', String(filters.cliente));
      }
      if (page) params.set('page', String(page));
      if (limit) params.set('limit', String(limit));
      const url = `${API_BASE}/api/pedidos?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        let message = 'Falha ao buscar pedidos';
        try {
          const err = await res.json();
          message = err?.message || err?.error?.message || err?.error || message;
        } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      // Normalize API payload to UI Order type used across app
      const normalized: Order[] = arr.map((p: any) => {
        const opFields = resolveOperacaoFields(p);
        const formaPagtoId = extractFormaPagtoId(p);
        const prazoPagtoId = extractPrazoPagtoId(p);
        const representanteId =
          p?.representanteId ??
          p?.representante_id ??
          p?.forcaDeVendasId ??
          p?.forca_de_venda_id ??
          p?.forca_de_vendas_id ??
          '017';
        const representanteCodigo = extractRepresentanteCodigo(p);
        const clienteId = p?.clienteId ?? p?.cliente_id ?? p?.cliente ?? 0;
        const clienteCodigo = extractClienteCodigo(p);
        return {
          id: p?.id ?? p?.pedido_id ?? p?.numero ?? 0,
          data: p?.data ?? p?.createdAt ?? new Date().toISOString().split('T')[0],
          operacao: opFields.descricao || opFields.codigo || '',
          operacaoId: opFields.id,
          operacaoCodigo: opFields.codigo || undefined,
          operacaoDescricao: opFields.descricao || undefined,
          clienteId: clienteId ?? 0,
          clienteCodigo,
          clienteNome: p?.clienteNome ?? p?.cliente_nome ?? p?.clienteRazao ?? '',
          representanteId: representanteId ?? '017',
          representanteCodigo,
          representanteNome:
            p?.representanteNome ??
            p?.representante_nome ??
            p?.nome_representante ??
            p?.forcaDeVendasNome ??
            p?.forca_de_vendas_nome ??
            p?.nome_forca_de_vendas ??
            'FORÇA DE VENDAS',
          tabela: p?.tabela ?? p?.tabela_preco ?? 'TABELA 01',
          formaPagamento: extractFormaPagtoDescricao(p) ?? 'BOLETO BANCARIO',
          formaPagtoId,
          prazo: extractPrazoDescricao(p) ?? '30 DIAS',
          prazoPagtoId,
          boleto: Boolean(p?.boleto ?? true),
          rede: p?.rede ?? '',
          especial: Boolean(p?.especial ?? false),
          situacao: p?.situacao ?? p?.status ?? 'Pendentes',
          valor: typeof p?.valor === 'number' ? p.valor : Number(p?.valor ?? p?.total ?? 0) || 0,
          cancelado: Boolean(p?.cancelado ?? false),
          faturado: Boolean(p?.faturado ?? false),
          itens: normalizeItens(p),
          totais: p?.totais ?? {
            bruto: Number(p?.bruto ?? 0) || 0,
            descontos: Number(p?.descontos ?? 0) || 0,
            descontosPerc: Number(p?.descontosPerc ?? 0) || 0,
            icmsRepasse: Number(p?.icmsRepasse ?? 0) || 0,
            liquido: typeof p?.valor === 'number' ? p.valor : Number(p?.valor ?? p?.total ?? 0) || 0,
          },
          observacaoCliente: p?.observacaoCliente ?? '',
          observacaoPedido: p?.observacaoPedido ?? '',
          observacaoNF: p?.observacaoNF ?? '',
          transmitido: Boolean(p?.transmitido ?? false),
          clienteEndereco: textOrUndefined(p?.clienteEndereco ?? p?.cliente_endereco),
          clienteNumero: textOrUndefined(p?.clienteNumero ?? p?.cliente_numero),
          clienteComplemento: textOrUndefined(p?.clienteComplemento ?? p?.cliente_complemento),
          clienteBairro: textOrUndefined(p?.clienteBairro ?? p?.cliente_bairro),
          clienteCidade: textOrUndefined(p?.clienteCidade ?? p?.cliente_cidade),
          clienteUf: textOrUndefined(p?.clienteUf ?? p?.cliente_uf ?? p?.clienteUF),
          clienteCep: textOrUndefined(p?.clienteCep ?? p?.cliente_cep),
        };
      });

      return normalized;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
  // Detalhe do pedido via API (para edição/visualização)
  getById: async (id: number): Promise<Order> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    try {
      const url = `${API_BASE}/api/pedidos/${encodeURIComponent(id)}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar pedido';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      const p: any = await res.json();
      const opFields = resolveOperacaoFields(p);
      const formaPagtoId = extractFormaPagtoId(p);
      const prazoPagtoId = extractPrazoPagtoId(p);
      const representanteId =
        p?.representanteId ??
        p?.representante_id ??
        p?.forcaDeVendasId ??
        p?.forca_de_venda_id ??
        p?.forca_de_vendas_id ??
        '';
      const representanteCodigo = extractRepresentanteCodigo(p);
      const clienteId = p?.clienteId ?? p?.cliente_id ?? p?.cliente ?? 0;
      const clienteCodigo = extractClienteCodigo(p);
      const order: Order = {
        id: p?.id ?? p?.pedido_id ?? id,
        data: p?.data ?? new Date().toISOString().split('T')[0],
        operacao: opFields.descricao || opFields.codigo || '',
        operacaoId: opFields.id,
        operacaoCodigo: opFields.codigo,
        operacaoDescricao: opFields.descricao,
        clienteId: clienteId ?? 0,
        clienteCodigo,
        clienteNome: p?.clienteNome ?? p?.cliente_nome ?? '',
        representanteId: representanteId ?? '',
        representanteCodigo,
        representanteNome:
          p?.representanteNome ??
          p?.representante_nome ??
          p?.nome_representante ??
          p?.forcaDeVendasNome ??
          p?.forca_de_vendas_nome ??
          p?.nome_forca_de_vendas ??
          '',
        tabela: p?.tabela ?? p?.tabela_preco ?? '',
        formaPagamento: extractFormaPagtoDescricao(p) ?? '',
        formaPagtoId,
        prazo: extractPrazoDescricao(p) ?? '',
        prazoPagtoId,
        boleto: Boolean(p?.boleto ?? false),
        rede: p?.rede ?? '',
        especial: Boolean(p?.especial ?? false),
        situacao: p?.situacao ?? p?.status ?? 'Pendentes',
        valor: typeof p?.valor === 'number' ? p.valor : Number(p?.valor ?? p?.total ?? 0) || 0,
        cancelado: Boolean(p?.cancelado ?? false),
        faturado: Boolean(p?.faturado ?? false),
        itens: normalizeItens(p),
        totais: p?.totais ?? {
          bruto: Number(p?.bruto ?? 0) || 0,
          descontos: Number(p?.descontos ?? 0) || 0,
          descontosPerc: Number(p?.descontosPerc ?? 0) || 0,
          icmsRepasse: Number(p?.icmsRepasse ?? 0) || 0,
          liquido: typeof p?.valor === 'number' ? p.valor : Number(p?.valor ?? p?.total ?? 0) || 0,
        },
        observacaoCliente: p?.observacaoCliente ?? '',
        observacaoPedido: p?.observacaoPedido ?? '',
        observacaoNF: p?.observacaoNF ?? '',
        transmitido: Boolean(p?.transmitido ?? false),
        clienteEndereco: textOrUndefined(p?.clienteEndereco ?? p?.cliente_endereco),
        clienteNumero: textOrUndefined(p?.clienteNumero ?? p?.cliente_numero),
        clienteComplemento: textOrUndefined(p?.clienteComplemento ?? p?.cliente_complemento),
        clienteBairro: textOrUndefined(p?.clienteBairro ?? p?.cliente_bairro),
        clienteCidade: textOrUndefined(p?.clienteCidade ?? p?.cliente_cidade),
        clienteUf: textOrUndefined(p?.clienteUf ?? p?.cliente_uf ?? p?.clienteUF),
        clienteCep: textOrUndefined(p?.clienteCep ?? p?.cliente_cep),
      };
      return order;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  create: async (order: any) => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    // Constrói itens conforme contrato de criação da API
    // (PedidoCreateItemInput em ../tecdisa-vendas-backend/src/api/dto/pedido.input.ts)
    const buildItens = (uiItens: any[]): any[] => {
      const itens = Array.isArray(uiItens) ? uiItens : [];
      return itens.map((it: any, idx: number) => {
        const produtoIdRaw = it?.produtoId ?? it?.produto_id ?? it?.id;
        const quantRaw = it?.quant ?? it?.quantidade ?? 0;
        const descontoRaw = it?.descontoPerc ?? it?.percentual_desconto ?? 0;
        const tabelaRaw =
          it?.tabela_preco_id ?? it?.tabelaId ?? order?.tabela ?? undefined;
        const precoBaseRaw =
          it?.preco ?? it?.preco_tabela ?? it?.precoTabela ?? it?.valor_unitario ?? it?.valorUnitario;
        const precoUnitarioRaw =
          it?.precoUnitario ??
          it?.preco_unitario ??
          it?.liquido ??
          it?.valor_liquido ??
          it?.valorLiquido;
        const valorDescontoRaw = it?.valorDesconto ?? it?.valor_desconto;

        const produtoId = Number(produtoIdRaw) || 0;
        const quant = Number(quantRaw) || 0;
        const descontoPerc = Number(descontoRaw) || 0;
        const precoBase = numberOrUndefined(precoBaseRaw) ?? 0;
        const tabelaPrecoId =
          tabelaRaw !== undefined && tabelaRaw !== null && tabelaRaw !== ''
            ? Number(tabelaRaw) || 0
            : undefined;
        const precoUnitario =
          numberOrUndefined(precoUnitarioRaw) ??
          (precoBase ? precoBase * (1 - descontoPerc / 100) : undefined);
        const brutoTotal =
          numberOrUndefined(it?.valor_bruto_calc) ??
          (precoBase && quant ? precoBase * quant : undefined);
        let valorDesconto = numberOrUndefined(valorDescontoRaw);
        if (valorDesconto === undefined) {
          if (brutoTotal !== undefined && precoUnitario !== undefined && quant) {
            const diff = brutoTotal - precoUnitario * quant;
            if (Number.isFinite(diff)) {
              valorDesconto = Math.max(0, diff);
            }
          } else if (brutoTotal !== undefined && descontoPerc) {
            valorDesconto = brutoTotal * (descontoPerc / 100);
          }
        }

        return {
          // Campos esperados pelo pedidoCreateSchema / PedidoCreateItemInput
          produtoId,
          quant,
          descontoPerc,
          obs: it?.obs ? String(it.obs) : undefined,
          tabelaPrecoId,
          precoUnitario,
          valorDesconto,
        };
      });
    };

    // Monta payload para API de pedidos
    const canalId = Number(order?.canalId ?? 30) || 30;
    const pedidoOrigem = String(order?.pedidoOrigem || 'ADS VENDAS').trim() || 'ADS VENDAS';
    const payload: any = {
      // Campos auxiliares lidos pelo backend a partir do body
      // (ver PedidoCreateInput em ../tecdisa-vendas-backend/src/api/dto/pedido.input.ts)
      empresaId: empresa.empresa_id,
      canalId,
      operacaoId: order?.operacaoId,
      prazoPagtoId: order?.prazoPagtoId,
      formaPagtoId: order?.formaPagtoId,
      tabelaPrecoId: order?.tabelaPrecoId,
      pedidoOrigem: buildPedidoOrigem(order?.pedidoOrigem),

      // Campos validados por pedidoCreateSchema
      operacao: order?.operacao,
      clienteId: order?.clienteId,
      representanteId: order?.representanteId,
      tabela: order?.tabela,
      formaPagamento: order?.formaPagamento,
      prazo: order?.prazo,
      boleto: Boolean(order?.boleto ?? false),
      rede: order?.rede,
      valor: order?.valor,
      observacaoPedido: order?.observacoes?.pedido || undefined,
      observacaoNF: order?.observacoes?.nf || undefined,
      itens: buildItens(order?.itens),
    };

    const reserveItens = async (itens: any[]) => {
      const tasks = (Array.isArray(itens) ? itens : [])
        .map((it) => {
          const produtoId = Number(it?.produtoId) || 0;
          const quantidade = Number(it?.quant) || 0;
          if (!produtoId || quantidade <= 0) return null;
          return productsService.reserveEstoque(produtoId, quantidade);
        })
        .filter(Boolean) as Promise<void>[];
      if (tasks.length === 0) return;
      await Promise.all(tasks);
    };

    try {
      const url = `${API_BASE}/api/pedidos`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        'Content-Type': 'application/json',
      };
      const res = await apiClient.fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        let message = 'Falha ao criar pedido';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      const created = await res.json();
      try {
        await reserveItens(payload.itens);
      } catch (e: any) {
        return Promise.reject(String(e) || 'Falha ao reservar estoque');
      }
      return created;
    } catch (e) {
      // Fallback para mock em caso de ambiente offline
      const newOrder: Order = {
        ...order,
        id: Math.max(...pedidos.map(p => p.id)) + 1,
        transmitido: false,
        pedidoOrigem: buildPedidoOrigem(order?.pedidoOrigem),
        itens: order.itens.map((item: OrderItemUI, idx: number) => ({
          ...item,
          obs: item.obs || '',
          ordem: item.ordem ?? idx + 1,
        }))
      };
      pedidos.push(newOrder as any);
      return newOrder;
    }
  },

  update: async (id: number, order: any) => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    // Reusa o mesmo mapeamento de itens do create (contrato PedidoCreateItemInput)
    const buildItens = (uiItens: any[]): any[] => {
      const itens = Array.isArray(uiItens) ? uiItens : [];
      return itens.map((it: any, idx: number) => {
        const produtoIdRaw = it?.produtoId ?? it?.produto_id ?? it?.id;
        const quantRaw = it?.quant ?? it?.quantidade ?? 0;
        const descontoRaw = it?.descontoPerc ?? it?.percentual_desconto ?? 0;
        const tabelaRaw =
          it?.tabela_preco_id ?? it?.tabelaId ?? order?.tabela ?? undefined;
        const precoBaseRaw =
          it?.preco ?? it?.preco_tabela ?? it?.precoTabela ?? it?.valor_unitario ?? it?.valorUnitario;
        const precoUnitarioRaw =
          it?.precoUnitario ??
          it?.preco_unitario ??
          it?.liquido ??
          it?.valor_liquido ??
          it?.valorLiquido;
        const valorDescontoRaw = it?.valorDesconto ?? it?.valor_desconto;

        const produtoId = Number(produtoIdRaw) || 0;
        const quant = Number(quantRaw) || 0;
        const descontoPerc = Number(descontoRaw) || 0;
        const precoBase = numberOrUndefined(precoBaseRaw) ?? 0;
        const tabelaPrecoId =
          tabelaRaw !== undefined && tabelaRaw !== null && tabelaRaw !== ''
            ? Number(tabelaRaw) || 0
            : undefined;
        const precoUnitario =
          numberOrUndefined(precoUnitarioRaw) ??
          (precoBase ? precoBase * (1 - descontoPerc / 100) : undefined);
        const brutoTotal =
          numberOrUndefined(it?.valor_bruto_calc) ??
          (precoBase && quant ? precoBase * quant : undefined);
        let valorDesconto = numberOrUndefined(valorDescontoRaw);
        if (valorDesconto === undefined) {
          if (brutoTotal !== undefined && precoUnitario !== undefined && quant) {
            const diff = brutoTotal - precoUnitario * quant;
            if (Number.isFinite(diff)) {
              valorDesconto = Math.max(0, diff);
            }
          } else if (brutoTotal !== undefined && descontoPerc) {
            valorDesconto = brutoTotal * (descontoPerc / 100);
          }
        }

        return {
          produtoId,
          quant,
          descontoPerc,
          obs: it?.obs ? String(it.obs) : undefined,
          tabelaPrecoId,
          precoUnitario,
          valorDesconto,
        };
      });
    };

    const canalId = Number(order?.canalId ?? 30) || 30;

    const payload: any = {
      empresaId: empresa.empresa_id,
      canalId,
      operacaoId: order?.operacaoId,
      prazoPagtoId: order?.prazoPagtoId,
      formaPagtoId: order?.formaPagtoId,
      tabelaPrecoId: order?.tabelaPrecoId,

      data: order?.data,
      operacao: order?.operacao,
      clienteId: order?.clienteId,
      representanteId: order?.representanteId,
      tabela: order?.tabela,
      formaPagamento: order?.formaPagamento,
      prazo: order?.prazo,
      boleto: Boolean(order?.boleto ?? false),
      rede: order?.rede,
      valor: order?.valor,
      observacaoPedido: order?.observacoes?.pedido || undefined,
      observacaoNF: order?.observacoes?.nf || undefined,
      itens: buildItens(order?.itens),
    };

    try {
      const url = `${API_BASE}/api/pedidos/${encodeURIComponent(
        id,
      )}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        'Content-Type': 'application/json',
      };
      const res = await apiClient.fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        let message = 'Falha ao atualizar pedido';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      // Fallback: atualiza mock local
      const index = pedidos.findIndex(p => p.id === id);
      if (index !== -1) {
        pedidos[index] = { ...pedidos[index], ...order } as any;
        return pedidos[index] as any;
      }
      return Promise.reject('Pedido não encontrado');
    }
  },

  remove: async (id: number) => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const url = `${API_BASE}/api/pedidos/${encodeURIComponent(id)}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, { method: 'DELETE', headers });
      if (!res.ok) {
        let message = 'Falha ao excluir pedido';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      return true;
    } catch (e) {
      // Fallback: remove do mock local para ambiente offline
      const index = pedidos.findIndex(p => p.id === id);
      if (index !== -1) {
        pedidos.splice(index, 1);
        return true;
      }
      return Promise.reject('Pedido não encontrado');
    }
  },

  export: (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (pedido) {
      const dataStr = JSON.stringify(pedido, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedido_${id}_faturamento.json`;
      link.click();
      URL.revokeObjectURL(url);
      return Promise.resolve(true);
    }
    return Promise.reject('Pedido não encontrado');
  },

  // Prazo negociado: parcelas customizadas do pedido (vendas_parcelas)
  getParcelas: async (id: number): Promise<OrderParcela[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    const url = `${API_BASE}/api/pedidos/${encodeURIComponent(id)}/parcelas?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });
    if (!res.ok) {
      let message = 'Falha ao buscar parcelas do pedido';
      try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
      return Promise.reject(message);
    }
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((p: any) => ({
          parcela: Number(p.parcela),
          vencto: String(p.vencto),
          valor: Number(p.valor),
          entrada: Boolean(p.entrada),
        }))
      : [];
  },

  saveParcelas: async (id: number, parcelas: OrderParcela[]): Promise<OrderParcela[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    const url = `${API_BASE}/api/pedidos/${encodeURIComponent(id)}/parcelas`;
    const headers: Record<string, string> = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ empresaId: empresa.empresa_id, parcelas }),
    });
    if (!res.ok) {
      let message = 'Falha ao salvar parcelas do pedido';
      try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
      return Promise.reject(message);
    }
    const data = await res.json();
    const arr = Array.isArray(data?.parcelas) ? data.parcelas : [];
    return arr.map((p: any) => ({ parcela: Number(p.parcela), vencto: String(p.vencto), valor: Number(p.valor) }));
  },

  duplicate: (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (pedido) {
      const newOrder = {
        ...pedido,
        id: Math.max(...pedidos.map(p => p.id)) + 1,
        data: new Date().toISOString().split('T')[0]
      };
      pedidos.push(newOrder);
      return Promise.resolve(newOrder);
    }
    return Promise.reject('Pedido não encontrado');
  }
};
