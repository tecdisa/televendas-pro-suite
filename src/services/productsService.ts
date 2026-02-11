import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface Product {
  id: number;
  codigoProduto?: string;
  descricao: string;
  un: string;
  preco: number;
  estoque?: number;
  categoria?: string;
  codigoFabrica?: string;
  ean13?: string;
  dun14?: string;
  apresentacao?: string;
  marca?: string;
  tabelaPrecoId?: number;
  descricaoTabelaPreco?: string;
  descontoMaximo?: number;
  comissao?: number;
  fornecedorId?: number;
  fornecedor?: string;
  divisaoId?: number;
  divisaoDescricao?: string;
  fatorCompra?: number;
  fatorVenda?: number;
  multiploDeVendas?: number;
  pesoBruto?: number;
  pesoLiquido?: number;
  controlaLote?: boolean;
  permiteVendaB2b?: boolean;
  permiteVendaB2c?: boolean;
  possuiFoto?: boolean;
  principioAtivo?: string;
  precoNacionalConsumidor?: number;
  precoFabrica?: number;
  descricaoComplementar?: string;
  codigoSiteB2c?: string;
  lancamento?: boolean;
  inativo?: boolean;
}

interface ProductTabelaPrecoResponse {
  produtoId: number;
  tabelaPrecoId: number;
  preco: number;
}

export interface ProductBatch {
  empresaId: number;
  produtoId: number;
  lote: string;
  dataFabricacao: string;
  dataValidade: string;
  quantidadeLote: number;
  quantidadeAtual: number | null;
  fci: string | null;
}

function normalizeProduct(raw: any): Product {
  const trimOrUndefined = (val: any): string | undefined => {
    if (val === undefined || val === null) return undefined;
    const str = String(val).trim();
    return str.length ? str : undefined;
  };

  const boolOrUndefined = (val: any): boolean | undefined => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const text = val.trim().toLowerCase();
      if (text === 'true' || text === '1' || text === 'yes' || text === 'sim') return true;
      if (text === 'false' || text === '0' || text === 'no' || text === 'nao' || text === 'não') return false;
    }
    if (typeof val === 'number') return val !== 0;
    return undefined;
  };

  const numberOrUndefined = (val: any): number | undefined => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'number') return val;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  };
  const divisaoInfo = raw?.divisao_info;
  const fornecedorInfo = raw?.fornecedor_info;

  const id = raw?.id ?? raw?.produto_id ?? raw?.codigo ?? raw?.cod ?? 0;
  const codigoProduto =
    raw?.codigo_produto ??
    raw?.codigoProduto ??
    raw?.produto_codigo ??
    raw?.produtoCod ??
    raw?.produto_cod ??
    null;
  const descricao =
    raw?.descricao ??
    raw?.descricao_produto ??
    raw?.descricaoProduto ??
    raw?.nome ??
    raw?.produto ??
    '';
  const un = raw?.un ?? raw?.unidade ?? raw?.unidad ?? raw?.uom ?? '';
  const precoRaw = raw?.preco ?? raw?.preco_tabela ?? raw?.precoTabela ?? raw?.price ?? raw?.valor;
  const preco = typeof precoRaw === 'number' ? precoRaw : Number(precoRaw || 0) || 0;
  const estoqueRaw =
    raw?.estoque ??
    raw?.estoque_disponivel ??
    raw?.estoqueDisponivel ??
    raw?.quantidade_estoque ??
    raw?.quantidadeEstoque ??
    raw?.qtd_estoque ??
    raw?.qtdEstoque ??
    raw?.saldo ??
    raw?.saldo_estoque ??
    raw?.disponivel;
  const estoque = (() => {
    if (typeof estoqueRaw === 'number') return estoqueRaw;
    if (typeof estoqueRaw === 'string') {
      const n = Number(estoqueRaw);
      if (!Number.isNaN(n)) return n;
    }
    if (estoqueRaw && typeof estoqueRaw === 'object') {
      const objCandidate =
        (estoqueRaw as any).disponivel ??
        (estoqueRaw as any).estoque ??
        (estoqueRaw as any).quantidade ??
        (estoqueRaw as any).saldo ??
        (estoqueRaw as any).saldo_disponivel;
      if (typeof objCandidate === 'number') return objCandidate;
      if (typeof objCandidate === 'string') {
        const n = Number(objCandidate);
        if (!Number.isNaN(n)) return n;
      }
    }
    return undefined;
  })();
  const categoria = raw?.categoria ?? raw?.categoria_codigo ?? raw?.categoriaCodigo ?? undefined;
  const descricaoTabelaPreco =
    raw?.descricao_tabela_preco ??
    raw?.descricaoTabelaPreco ??
    raw?.tabela_descricao ??
    raw?.tabelaDescricao ??
    raw?.tabela_preco ??
    raw?.tabelaPreco;
  const tabelaPrecoId = numberOrUndefined(raw?.tabela_preco_id ?? raw?.tabelaPrecoId);
  const descontoMaximo = numberOrUndefined(raw?.desconto_maximo ?? raw?.descontoMaximo ?? raw?.desconto_max);
  const comissao = numberOrUndefined(raw?.comissao ?? raw?.percentual_comissao ?? raw?.percentualComissao);
  const fornecedor =
    fornecedorInfo?.nome_fornecedor ??
    fornecedorInfo?.fantasia ??
    raw?.fornecedor ??
    raw?.fornecedor_nome ??
    raw?.fornecedorNome ??
    raw?.nome_fornecedor ??
    raw?.fantasia;
  const divisaoDescricao =
    divisaoInfo?.descricao_divisao ??
    divisaoInfo?.descricao ??
    raw?.descricao_divisao ??
    raw?.divisaoDescricao ??
    raw?.divisao_descricao ??
    raw?.divisaoNome ??
    raw?.divisao;

  return {
    id: Number(id) || 0,
    codigoProduto: codigoProduto ? String(codigoProduto).trim() : undefined,
    descricao: String(descricao || '').trim(),
    un: String(un || '').trim() || 'UN',
    preco,
    estoque: typeof estoque === 'number' ? estoque : undefined,
    categoria: categoria ? String(categoria) : undefined,
    codigoFabrica: trimOrUndefined(raw?.codigo_fabrica ?? raw?.codigoFabrica),
    ean13: trimOrUndefined(raw?.ean13 ?? raw?.ean_13 ?? raw?.ean),
    dun14: trimOrUndefined(raw?.dun14 ?? raw?.dun_14 ?? raw?.dun),
    apresentacao: trimOrUndefined(raw?.apresentacao),
    marca: trimOrUndefined(raw?.marca),
    tabelaPrecoId,
    descricaoTabelaPreco: trimOrUndefined(descricaoTabelaPreco),
    descontoMaximo,
    comissao,
    fornecedorId: numberOrUndefined(
      fornecedorInfo?.fornecedor_id ?? fornecedorInfo?.fornecedorId ?? raw?.fornecedor_id ?? raw?.fornecedorId
    ),
    fornecedor: trimOrUndefined(fornecedor),
    divisaoId: numberOrUndefined(divisaoInfo?.divisao_id ?? divisaoInfo?.divisaoId ?? raw?.divisao_id ?? raw?.divisaoId),
    divisaoDescricao: trimOrUndefined(divisaoDescricao),
    fatorCompra: numberOrUndefined(raw?.fator_compra ?? raw?.fatorCompra),
    fatorVenda: numberOrUndefined(raw?.fator_venda ?? raw?.fatorVenda),
    multiploDeVendas: numberOrUndefined(raw?.multiplo_de_vendas ?? raw?.multiploVendas ?? raw?.multiploVenda),
    pesoBruto: numberOrUndefined(raw?.peso_bruto ?? raw?.pesoBruto),
    pesoLiquido: numberOrUndefined(raw?.peso_liquido ?? raw?.pesoLiquido),
    controlaLote: boolOrUndefined(raw?.controla_lote ?? raw?.controlaLote),
    permiteVendaB2b: boolOrUndefined(raw?.permite_venda_b2b ?? raw?.permiteVendaB2b),
    permiteVendaB2c: boolOrUndefined(raw?.permite_venda_b2c ?? raw?.permiteVendaB2c),
    possuiFoto: boolOrUndefined(raw?.possui_foto ?? raw?.possuiFoto),
    principioAtivo: raw?.principio_ativo ?? raw?.principioAtivo,
    precoNacionalConsumidor: numberOrUndefined(raw?.preco_nacional_consumidor ?? raw?.precoNacionalConsumidor),
    precoFabrica: numberOrUndefined(raw?.preco_fabrica ?? raw?.precoFabrica),
    descricaoComplementar: raw?.descricao_complementar ?? raw?.descricaoComplementar,
    codigoSiteB2c: raw?.codigo_site_b2c ?? raw?.codigoSiteB2c,
    lancamento: boolOrUndefined(raw?.lancamento),
    inativo: boolOrUndefined(raw?.inativo),
  };
}

export interface ProductFiltersParams {
  codigoProduto?: string;
  descricao?: string;
  marca?: string;
  tabela?: string;
  codFabrica?: string;
  fornecedor?: string;
  ean13?: string;
  divisao?: string;
  dun14?: string;
  principioAtivo?: string;
  comEstoque?: boolean;
  estoqueZerado?: boolean;
  lancamentos?: boolean;
  ultimasComprasDesde?: string;
}

async function fetchFromApi({ 
  filters, 
  page = 1, 
  limit = 100 
}: { 
  filters?: ProductFiltersParams; 
  page?: number; 
  limit?: number; 
}): Promise<Product[]> {
  const empresa = authService.getEmpresa();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  const token = authService.getToken();
  if (!token) return Promise.reject('Token ausente');

  try {
    const params = new URLSearchParams();
    params.set('empresaId', String(empresa.empresa_id));
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    
    // Add individual filter parameters
    if (filters?.codigoProduto) params.set('codigoProduto', filters.codigoProduto);
    if (filters?.descricao) params.set('descricao', filters.descricao);
    if (filters?.marca) params.set('marca', filters.marca);
    if (filters?.tabela) params.set('tabelaPrecoId', filters.tabela);
    if (filters?.codFabrica) params.set('codigoFabrica', filters.codFabrica);
    if (filters?.fornecedor) params.set('fornecedorId', filters.fornecedor);
    if (filters?.ean13) params.set('ean13', filters.ean13);
    if (filters?.divisao) params.set('divisaoId', filters.divisao);
    if (filters?.dun14) params.set('dun14', filters.dun14);
    if (filters?.principioAtivo) {
      const principioAtivo = filters.principioAtivo.trim();
      if (principioAtivo) params.set('principioAtivo', principioAtivo.toUpperCase());
    }
    if (filters?.comEstoque) params.set('comEstoque', 'true');
    if (filters?.estoqueZerado) params.set('estoqueZerado', 'true');
    if (filters?.lancamentos) params.set('lancamentos', 'true');
    if (filters?.ultimasComprasDesde) params.set('ultimasComprasDesde', filters.ultimasComprasDesde);
    
    const url = `${API_BASE}/api/produtos?${params.toString()}`;
    const headers: Record<string, string> = { accept: 'application/json' };
    const res = await apiClient.fetch(url, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      let message = 'Falha ao buscar produtos';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }

    const data = await res.json();
    const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return arr.map(normalizeProduct);
  } catch (e) {
    return Promise.reject('Erro de conexão com o servidor');
  }
}

async function fetchPrecoByTabela({
  produtoId,
  tabelaPrecoId,
}: {
  produtoId: number;
  tabelaPrecoId: number;
}): Promise<ProductTabelaPrecoResponse> {
  const empresa = authService.getEmpresa();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  const token = authService.getToken();
  if (!token) return Promise.reject('Token ausente');

  try {
    const params = new URLSearchParams();
    params.set('empresaId', String(empresa.empresa_id));
    params.set('tabelaPrecoId', String(tabelaPrecoId));

    const url = `${API_BASE}/api/produtos/${encodeURIComponent(
      produtoId,
    )}/preco?${params.toString()}`;
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    const res = await apiClient.fetch(url, { method: 'GET', headers });

    if (!res.ok) {
      let message = 'Erro ao buscar preço do produto';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }

    const data = await res.json();
    const produtoIdResp = Number(data?.produtoId ?? produtoId) || produtoId;
    const tabelaIdResp =
      Number(data?.tabelaPrecoId ?? tabelaPrecoId) || tabelaPrecoId;
    const precoResp = Number(data?.preco ?? 0) || 0;

    return {
      produtoId: produtoIdResp,
      tabelaPrecoId: tabelaIdResp,
      preco: precoResp,
    };
  } catch {
    return Promise.reject('Erro de conexão ao buscar preço do produto');
  }
}

async function fetchLotes(produtoId: number): Promise<ProductBatch[]> {
  const empresa = authService.getEmpresa();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  const token = authService.getToken();
  if (!token) return Promise.reject('Token ausente');

  try {
    const params = new URLSearchParams();
    params.set('empresaId', String(empresa.empresa_id));

    const url = `${API_BASE}/api/produtos/${encodeURIComponent(produtoId)}/lotes?${params.toString()}`;
    const headers: Record<string, string> = { accept: 'application/json' };
    const res = await apiClient.fetch(url, { method: 'GET', headers });

    if (!res.ok) {
      let message = 'Erro ao buscar lotes do produto';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }

    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    
    const parseNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const n = parseFloat(val);
        return Number.isNaN(n) ? 0 : n;
      }
      return 0;
    };

    const parseDate = (val: any): string => {
      if (!val) return '';
      // Handle ISO date format like "2025-02-12T00:00:00.000Z"
      const str = String(val);
      return str.split('T')[0] || str;
    };
    
    return arr.map((raw: any) => ({
      empresaId: parseNumber(raw.empresa_id ?? raw.empresaId),
      produtoId: parseNumber(raw.produto_id ?? raw.produtoId) || produtoId,
      lote: raw.lote ?? '',
      dataFabricacao: parseDate(raw.data_fabricacao ?? raw.dataFabricacao),
      dataValidade: parseDate(raw.data_validade ?? raw.dataValidade),
      quantidadeLote: parseNumber(raw.quantidade_lote ?? raw.quantidadeLote),
      quantidadeAtual: raw.quantidade_atual != null || raw.quantidadeAtual != null 
        ? parseNumber(raw.quantidade_atual ?? raw.quantidadeAtual) 
        : null,
      fci: raw.fci ?? null,
    }));
  } catch {
    return Promise.reject('Erro de conexão ao buscar lotes');
  }
}

export const productsService = {
  find: async (filters?: ProductFiltersParams, page = 1, limit = 100): Promise<Product[]> => {
    return fetchFromApi({ filters, page, limit });
  },
  search: async (filters?: ProductFiltersParams, page = 1, limit = 100): Promise<Product[]> => {
    return fetchFromApi({ filters, page, limit });
  },
  getById: async (id: number): Promise<Product | undefined> => {
    const list = await fetchFromApi({ filters: { descricao: String(id) }, page: 1, limit: 1 });
    return list.find((p) => p.id === id);
  },
  getPrecoByTabela: async (
    produtoId: number,
    tabelaPrecoId: number,
  ): Promise<number> => {
    const data = await fetchPrecoByTabela({ produtoId, tabelaPrecoId });
    return data.preco;
  },
  getLotes: async (produtoId: number): Promise<ProductBatch[]> => {
    return fetchLotes(produtoId);
  },

  reserveEstoque: async (produtoId: number, quantidade: number): Promise<void> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    const url = `${API_BASE}/api/produtos/${encodeURIComponent(produtoId)}/estoque/reservar?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
    const headers: Record<string, string> = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = JSON.stringify({ quantidade_reservada: quantidade });
    const res = await apiClient.fetch(url, { method: 'POST', headers, body });
    if (!res.ok) {
      let message = 'Falha ao reservar estoque';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }
    await res.json();
  },
};
