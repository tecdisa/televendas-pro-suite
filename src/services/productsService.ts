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
  ncm?: string;
  cest?: string;
  tipi?: string;
  tipoItem?: string;
  pno?: string;
  inibeEanXmlNfe?: boolean;
  medicamento?: boolean;
  producaoPropria?: boolean;
  apresentacao2?: string;
  unidade2?: string;
  dcb?: string;
  dcbDescricao?: string;
  portaria?: string;
  produtoSimilar?: number;
  mensagemNotaFiscal?: string;
  regMs?: string;
  origemProduto?: string;
  validade?: string;
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
    ncm: trimOrUndefined(raw?.ncm),
    cest: trimOrUndefined(raw?.cest),
    tipi: trimOrUndefined(raw?.tipi),
    tipoItem: trimOrUndefined(raw?.tipo_item ?? raw?.tipoItem),
    pno: trimOrUndefined(raw?.pno),
    inibeEanXmlNfe: boolOrUndefined(raw?.inibe_ean_xml_nfe ?? raw?.inibeEanXmlNfe),
    medicamento: boolOrUndefined(raw?.medicamento),
    producaoPropria: boolOrUndefined(raw?.producao_propria ?? raw?.producaoPropria),
    apresentacao2: trimOrUndefined(raw?.apresentacao2 ?? raw?.segunda_apresentacao),
    unidade2: trimOrUndefined(raw?.unidade2 ?? raw?.unidade_2),
    dcb: trimOrUndefined(raw?.dcb),
    dcbDescricao: trimOrUndefined(raw?.dcb_descricao ?? raw?.dcbDescricao),
    portaria: trimOrUndefined(raw?.portaria),
    produtoSimilar: numberOrUndefined(raw?.produto_similar ?? raw?.produtoSimilar),
    mensagemNotaFiscal: trimOrUndefined(raw?.mensagem_nota_fiscal ?? raw?.mensagemNotaFiscal),
    regMs: trimOrUndefined(raw?.reg_ms ?? raw?.regMs),
    origemProduto: trimOrUndefined(raw?.origem_produto ?? raw?.origemProduto),
    validade: trimOrUndefined(raw?.validade),
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

export interface ProductCadastroFilters {
  status?: 'ativos' | 'inativos' | 'todos';
  searchType?: 'descricao' | 'codigo' | 'ean' | 'codFabrica';
  buscaTipo?: 'inicial' | 'contido';
  search?: string;
  fornecedorId?: number;
  divisaoId?: number;
  marca?: string;
  possuiFoto?: boolean;
  permiteVendaB2b?: boolean;
  permiteVendaB2c?: boolean;
  lancamento?: boolean;
}

export interface ProductCadastroInput {
  codigo_produto?: string;
  descricao_produto: string;
  unidade: string;
  codigo_fabrica?: string | null;
  ean13?: string | null;
  dun14?: string | null;
  apresentacao?: string | null;
  marca?: string | null;
  fornecedor_id: number;
  divisao_id: number;
  fator_compra?: number | null;
  fator_venda?: number | null;
  multiplo_de_vendas?: number | null;
  peso_bruto?: number | null;
  peso_liquido?: number | null;
  controla_lote?: boolean;
  permite_venda_b2b?: boolean;
  permite_venda_b2c?: boolean;
  possui_foto?: boolean;
  principio_ativo?: string | null;
  preco_nacional_consumidor?: number | null;
  preco_fabrica?: number | null;
  descricao_complementar?: string | null;
  codigo_site_b2c?: string | null;
  ncm?: string | null;
  cest?: string | null;
  tipi?: string | null;
  tipo_item?: string | null;
  pno?: string | null;
  inibe_ean_xml_nfe?: boolean;
  medicamento?: boolean;
  producao_propria?: boolean;
  apresentacao2?: string | null;
  unidade2?: string | null;
  dcb?: string | null;
  dcb_descricao?: string | null;
  portaria?: string | null;
  produto_similar?: number | null;
  mensagem_nota_fiscal?: string | null;
  reg_ms?: string | null;
  origem_produto?: string | null;
  validade?: string | null;
  lancamento?: boolean;
  inativo?: boolean;
}

interface ProductListResponse {
  data: any[];
  page: number;
  limit: number;
  total: number;
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

function getEmpresaAndToken() {
  const empresa = authService.getEmpresa();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  const token = authService.getToken();
  if (!token) return Promise.reject('Token ausente');
  return Promise.resolve({ empresa, token });
}

async function fetchCadastroProdutos({
  filters,
  page = 1,
  limit = 100,
}: {
  filters?: ProductCadastroFilters;
  page?: number;
  limit?: number;
}): Promise<{ data: Product[]; page: number; limit: number; total: number }> {
  const { empresa } = await getEmpresaAndToken();
  const params = new URLSearchParams();
  params.set('empresaId', String(empresa.empresa_id));
  params.set('page', String(page));
  params.set('limit', String(limit));
  params.set('status', filters?.status ?? 'ativos');
  params.set('buscaTipo', filters?.buscaTipo ?? 'contido');

  if (filters?.search?.trim()) {
    const term = filters.search.trim();
    const type = filters.searchType ?? 'descricao';
    if (type === 'codigo') params.set('codigoProduto', term);
    else if (type === 'ean') params.set('ean13', term);
    else if (type === 'codFabrica') params.set('codigoFabrica', term);
    else params.set('descricao', term);
  }
  if (filters?.fornecedorId) params.set('fornecedorId', String(filters.fornecedorId));
  if (filters?.divisaoId) params.set('divisaoId', String(filters.divisaoId));
  if (filters?.marca?.trim()) params.set('marca', filters.marca.trim());
  if (filters?.lancamento !== undefined)
    params.set('lancamento', String(Boolean(filters.lancamento)));
  if (filters?.possuiFoto !== undefined)
    params.set('possuiFoto', String(Boolean(filters.possuiFoto)));
  if (filters?.permiteVendaB2b !== undefined)
    params.set('permiteVendaB2b', String(Boolean(filters.permiteVendaB2b)));
  if (filters?.permiteVendaB2c !== undefined)
    params.set('permiteVendaB2c', String(Boolean(filters.permiteVendaB2c)));

  const url = `${API_BASE}/api/produtos?${params.toString()}`;
  const res = await apiClient.fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    let message = 'Falha ao buscar produtos';
    try {
      const err = await res.json();
      message = err?.message || err?.error?.message || err?.error || message;
    } catch {}
    return Promise.reject(message);
  }

  const json = (await res.json()) as ProductListResponse | any[];
  const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
  return {
    data: arr.map(normalizeProduct),
    page: Array.isArray(json) ? page : json?.page ?? page,
    limit: Array.isArray(json) ? limit : json?.limit ?? limit,
    total: Array.isArray(json) ? arr.length : json?.total ?? arr.length,
  };
}

function buildCadastroPayload(data: Partial<ProductCadastroInput>): Record<string, any> {
  return {
    codigo_produto: sanitizeNullableText(data.codigo_produto),
    descricao_produto: sanitizeNullableText(data.descricao_produto),
    unidade: sanitizeNullableText(data.unidade),
    codigo_fabrica: sanitizeNullableText(data.codigo_fabrica),
    ean13: sanitizeNullableText(data.ean13),
    dun14: sanitizeNullableText(data.dun14),
    apresentacao: sanitizeNullableText(data.apresentacao),
    marca: sanitizeNullableText(data.marca),
    fornecedor_id: sanitizeNullableNumber(data.fornecedor_id),
    divisao_id: sanitizeNullableNumber(data.divisao_id),
    fator_compra: sanitizeNullableNumber(data.fator_compra),
    fator_venda: sanitizeNullableNumber(data.fator_venda),
    multiplo_de_vendas: sanitizeNullableNumber(data.multiplo_de_vendas),
    peso_bruto: sanitizeNullableNumber(data.peso_bruto),
    peso_liquido: sanitizeNullableNumber(data.peso_liquido),
    controla_lote: data.controla_lote,
    permite_venda_b2b: data.permite_venda_b2b,
    permite_venda_b2c: data.permite_venda_b2c,
    possui_foto: data.possui_foto,
    principio_ativo: sanitizeNullableText(data.principio_ativo),
    preco_nacional_consumidor: sanitizeNullableNumber(data.preco_nacional_consumidor),
    preco_fabrica: sanitizeNullableNumber(data.preco_fabrica),
    descricao_complementar: sanitizeNullableText(data.descricao_complementar),
    codigo_site_b2c: sanitizeNullableText(data.codigo_site_b2c),
    ncm: sanitizeNullableText(data.ncm),
    cest: sanitizeNullableText(data.cest),
    tipi: sanitizeNullableText(data.tipi),
    tipo_item: sanitizeNullableText(data.tipo_item),
    pno: sanitizeNullableText(data.pno),
    inibe_ean_xml_nfe: data.inibe_ean_xml_nfe,
    medicamento: data.medicamento,
    producao_propria: data.producao_propria,
    apresentacao2: sanitizeNullableText(data.apresentacao2),
    unidade2: sanitizeNullableText(data.unidade2),
    dcb: sanitizeNullableText(data.dcb),
    dcb_descricao: sanitizeNullableText(data.dcb_descricao),
    portaria: sanitizeNullableText(data.portaria),
    produto_similar: sanitizeNullableNumber(data.produto_similar),
    mensagem_nota_fiscal: sanitizeNullableText(data.mensagem_nota_fiscal),
    reg_ms: sanitizeNullableText(data.reg_ms),
    origem_produto: sanitizeNullableText(data.origem_produto),
    validade: sanitizeNullableText(data.validade),
    lancamento: data.lancamento,
    inativo: data.inativo,
  };
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

  listCadastro: async (
    filters?: ProductCadastroFilters,
    page = 1,
    limit = 100,
  ): Promise<{ data: Product[]; page: number; limit: number; total: number }> => {
    return fetchCadastroProdutos({ filters, page, limit });
  },

  getCadastroById: async (id: number): Promise<Product | null> => {
    const { empresa } = await getEmpresaAndToken();
    const url = `${API_BASE}/api/produtos/${id}?empresaId=${empresa.empresa_id}`;
    const res = await apiClient.fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar produto';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }

    return normalizeProduct(await res.json());
  },

  createCadastro: async (data: ProductCadastroInput): Promise<Product> => {
    const { empresa } = await getEmpresaAndToken();
    const response = await apiClient.fetch(`${API_BASE}/api/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        empresaId: empresa.empresa_id,
        data: buildCadastroPayload(data),
      }),
    });

    if (!response.ok) {
      let message = 'Erro ao criar produto';
      try {
        const err = await response.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }

    return normalizeProduct(await response.json());
  },

  updateCadastro: async (
    id: number,
    data: Partial<ProductCadastroInput>,
  ): Promise<Product> => {
    const { empresa } = await getEmpresaAndToken();
    const response = await apiClient.fetch(
      `${API_BASE}/api/produtos/${id}?empresaId=${empresa.empresa_id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ data: buildCadastroPayload(data) }),
      },
    );

    if (!response.ok) {
      let message = 'Erro ao atualizar produto';
      try {
        const err = await response.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }

    return normalizeProduct(await response.json());
  },

  deleteCadastro: async (id: number): Promise<void> => {
    const { empresa } = await getEmpresaAndToken();
    const response = await apiClient.fetch(
      `${API_BASE}/api/produtos/${id}?empresaId=${empresa.empresa_id}`,
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 204) {
      let message = 'Erro ao excluir produto';
      try {
        const err = await response.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }
  },
};
