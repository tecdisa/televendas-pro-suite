import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';
import { normalizeCnpjCpf } from '@/utils/cnpjCpf';

export interface ClientRota {
  id: number;
  codigo_rota?: string;
  descricao_rota?: string;
}

export interface Client {
  id: number;
  empresaId?: number;
  codigoCliente?: string;
  cnpjCpf?: string;
  tipoPessoa?: string;
  consumidorFinal?: boolean;
  nome: string;
  fantasia?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  rg?: string;
  cep?: string;
  cidadeId?: number;
  cidade: string;
  uf: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  fone?: string;
  fax?: string;
  celular?: string;
  whatsapp?: string;
  contato?: string;
  email?: string;
  emailDanfe?: string;
  site?: string;
  compradorNome?: string;
  compradorFone?: string;
  compradorDataNascimento?: string;
  contato2Nome?: string;
  contato2Celular?: string;
  contato2DataAniversario?: string;
  segmentoId?: number;
  redeId?: number;
  limiteCredito?: number | null;
  descontoFinanceiroBoleto?: number | null;
  checkouts?: number | null;
  credito?: number | null;
  boleto?: boolean | null;
  prazo?: string | null;
  aberto?: number | null;
  disponivel?: number | null;
  formaPagtoId?: number | string | null;
  prazoPagtoId?: number | string | null;
  b2bLiberado?: boolean;
  b2bSenha?: string | null;
  b2bTabelaId?: number | null;
  observacaoComercial?: string | null;
  observacaoFinanceiro?: string | null;
  inativo?: boolean;
  simplesNacional?: boolean;
  cobrancaEndereco?: string | null;
  cobrancaEnderecoNumero?: string | null;
  cobrancaEnderecoBairro?: string | null;
  cobrancaEnderecoCidadeId?: number | null;
  cobrancaEnderecoCep?: string | null;
  cobrancaEnderecoUf?: string | null;
  cobrancaEnderecoComplemento?: string | null;
  rotaId?: number | null;
  rota?: ClientRota | null;
  representanteId?: string;
  representanteNome?: string;
  representanteCodigo?: string;
  representantes?: Array<{
    id: string;
    codigoRepresentante?: string;
    nome?: string;
  }>;
  tabelasCodigos?: string[];
}

function extractErrorMessage(err: any, fallback: string): string {
  try {
    if (!err) return fallback;
    // Common shapes: { message }, { error: string }, { error: { message } }
    if (typeof err === 'string') return err;
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.message === 'string') return err.message;

    // Zod-style details: error.details.fieldErrors / formErrors
    const details = err?.error?.details ?? err?.details;
    const fieldErrors = details?.fieldErrors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const values = Object.values(fieldErrors).flat().filter(Boolean) as any[];
      if (values.length) return String(values[0]);
    }
    const formErrors = details?.formErrors;
    if (Array.isArray(formErrors) && formErrors.length) {
      return String(formErrors[0]);
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function normalizeClient(raw: any): Client {
  // Try multiple common API field names and normalize to UI expectations
  const id = raw?.id ?? raw?.cliente_id ?? raw?.codigo ?? raw?.cod ?? 0;
  const codigoCliente =
    raw?.codigo_cliente ??
    raw?.codigoCliente ??
    raw?.codigo ??
    raw?.cod ??
    raw?.cliente_codigo ??
    raw?.clienteCod ??
    raw?.cliente_cod ??
    null;
  const nome =
    raw?.nome ??
    raw?.razao_social ??
    raw?.fantasia ??
    raw?.razaoSocial ??
    raw?.razao ??
    '';
  const cidade = raw?.cidade ?? raw?.municipio ?? raw?.city ?? '';
  const uf = raw?.uf ?? raw?.estado ?? raw?.state ?? '';
  const bairro = raw?.bairro ?? raw?.district ?? raw?.bairro_nome ?? '';
  const fone = raw?.fone ?? raw?.telefone ?? raw?.phone ?? '';
  const contato = raw?.contato ?? raw?.responsavel ?? raw?.contact ?? '';
  const empresaId = raw?.empresa_id ?? raw?.empresaId ?? undefined;
  const cnpjCpf = raw?.cnpj_cpf ?? raw?.cnpjCpf ?? undefined;
  const tipoPessoa = raw?.tipo_pessoa ?? raw?.tipoPessoa ?? undefined;
  const consumidorFinal = raw?.consumidor_final ?? raw?.consumidorFinal ?? undefined;
  const fantasia = raw?.fantasia ?? raw?.nome_fantasia ?? undefined;
  const inscricaoEstadual =
    raw?.inscricao_estadual ?? raw?.inscricaoEstadual ?? undefined;
  const inscricaoMunicipal =
    raw?.inscricao_municipal ?? raw?.inscricaoMunicipal ?? undefined;
  const rg = raw?.rg ?? undefined;
  const cep = raw?.cep ?? undefined;
  const cidadeId = raw?.cidade_id ?? raw?.cidadeId ?? undefined;
  const endereco = raw?.endereco ?? undefined;
  const numero = raw?.numero ?? undefined;
  const complemento = raw?.complemento ?? undefined;
  const fax = raw?.fax ?? undefined;
  const celular = raw?.celular ?? undefined;
  const whatsapp = raw?.whatsapp ?? undefined;
  const email = raw?.email ?? undefined;
  const emailDanfe = raw?.email_danfe ?? raw?.emailDanfe ?? undefined;
  const site = raw?.site ?? undefined;
  const compradorNome = raw?.comprador_nome ?? raw?.compradorNome ?? undefined;
  const compradorFone = raw?.comprador_fone ?? raw?.compradorFone ?? undefined;
  const compradorDataNascimento =
    raw?.comprador_data_nascimento ?? raw?.compradorDataNascimento ?? undefined;
  const contato2Nome = raw?.contato2_nome ?? raw?.contato2Nome ?? undefined;
  const contato2Celular =
    raw?.contato2_celular ?? raw?.contato2Celular ?? undefined;
  const contato2DataAniversario =
    raw?.contato2_data_aniversario ??
    raw?.contato2DataAniversario ??
    undefined;
  const segmentoId = raw?.segmento_id ?? raw?.segmentoId ?? undefined;
  const redeId = raw?.rede_id ?? raw?.redeId ?? undefined;
  const limiteCredito =
    raw?.limite_credito ?? raw?.limiteCredito ?? raw?.limite ?? null;
  const descontoFinanceiroBoleto =
    raw?.desconto_financeiro_boleto ?? raw?.descontoFinanceiroBoleto ?? null;
  const checkouts = raw?.checkouts ?? null;
  const credito = raw?.credito ?? null;
  const boleto = raw?.boleto ?? null;
  const prazo = raw?.prazo ?? null;
  const aberto = raw?.aberto ?? null;
  const disponivel = raw?.disponivel ?? null;
  const formaPagtoId = raw?.forma_pagto_id ?? raw?.formaPagtoId ?? raw?.forma_pagto ?? null;
  const prazoPagtoId = raw?.prazo_pagto_id ?? raw?.prazoPagtoId ?? null;
  const b2bLiberado = raw?.b2b_liberado ?? raw?.b2bLiberado ?? undefined;
  const b2bSenha = raw?.b2b_senha ?? raw?.b2bSenha ?? null;
  const b2bTabelaId = raw?.b2b_tabela_id ?? raw?.b2bTabelaId ?? null;
  const observacaoComercial =
    raw?.observacao_comercial ?? raw?.observacaoComercial ?? null;
  const observacaoFinanceiro =
    raw?.observacao_financeiro ?? raw?.observacaoFinanceiro ?? null;
  const inativo = raw?.inativo ?? undefined;
  const rotaId = raw?.rota_id ?? raw?.rotaId ?? null;
  const cobrancaEndereco =
    raw?.cobranca_endereco ?? raw?.cobrancaEndereco ?? null;
  const cobrancaEnderecoNumero =
    raw?.cobranca_endereco_numero ?? raw?.cobrancaEnderecoNumero ?? null;
  const cobrancaEnderecoBairro =
    raw?.cobranca_endereco_bairro ?? raw?.cobrancaEnderecoBairro ?? null;
  const cobrancaEnderecoCidadeId =
    raw?.cobranca_endereco_cidade_id ?? raw?.cobrancaEnderecoCidadeId ?? null;
  const cobrancaEnderecoCep =
    raw?.cobranca_endereco_cep ?? raw?.cobrancaEnderecoCep ?? null;
  const cobrancaEnderecoUf =
    raw?.cobranca_endereco_uf ?? raw?.cobrancaEnderecoUf ?? null;
  const cobrancaEnderecoComplemento =
    raw?.cobranca_endereco_complemento ??
    raw?.cobrancaEnderecoComplemento ??
    null;
  // Objeto rota vindo do join com rotas_clientes
  const rotaObj = raw?.rota && typeof raw.rota === 'object' ? {
    id: raw.rota.id,
    codigo_rota: raw.rota.codigo_rota,
    descricao_rota: raw.rota.descricao_rota,
  } : null;
  const repObj =
    raw?.representante && typeof raw.representante === 'object'
      ? raw.representante
      : raw?.forca_de_vendas && typeof raw.forca_de_vendas === 'object'
      ? raw.forca_de_vendas
      : raw?.forcaDeVendas && typeof raw.forcaDeVendas === 'object'
      ? raw.forcaDeVendas
      : null;
  const representantesArr = Array.isArray(raw?.representantes)
    ? raw.representantes
    : Array.isArray(raw?.forcas_de_vendas)
    ? raw.forcas_de_vendas
    : Array.isArray(raw?.forcasDeVendas)
    ? raw.forcasDeVendas
    : [];
  const representantes = representantesArr
    .map((r: any) => {
      if (!r) return null;
      const rid =
        r.id ??
        r.representante_id ??
        r.forca_de_venda_id ??
        r.forcaDeVendaId ??
        r.codigo_representante ??
        r.codigo_forca_de_vendas ??
        r.codigo ??
        r.cod ??
        r.matricula ??
        null;
      return {
        id: rid != null ? String(rid).trim() : '',
        codigoRepresentante:
          r.codigo_representante ??
          r.codigoRepresentante ??
          r.codigo_forca_de_vendas ??
          r.codigoForcaDeVendas ??
          r.codigo ??
          r.cod ??
          r.matricula ??
          undefined,
        nome:
          (r.nome ?? r.nome_representante ?? r.nome_forca_de_vendas) != null
            ? String(r.nome ?? r.nome_representante ?? r.nome_forca_de_vendas).trim()
            : undefined,
      };
    })
    .filter(Boolean) as Client['representantes'];
  const firstRep = representantes?.[0];
  const representanteId =
    raw?.representanteId ??
    raw?.representante_id ??
    raw?.forcaDeVendasId ??
    raw?.forca_de_venda_id ??
    raw?.forca_de_vendas_id ??
    raw?.representante ??
    raw?.forca_de_vendas ??
    raw?.forcaDeVendas ??
    repObj?.id ??
    repObj?.representante_id ??
    repObj?.forca_de_venda_id ??
    repObj?.forcaDeVendaId ??
    repObj?.codigo ??
    repObj?.cod ??
    null;
  const representanteCodigo =
    raw?.codigo_representante ??
    raw?.codigoRepresentante ??
    raw?.codigo_forca_de_vendas ??
    raw?.codigoForcaDeVendas ??
    raw?.representante_codigo ??
    raw?.representanteCod ??
    raw?.representante_cod ??
    repObj?.codigo_representante ??
    repObj?.codigoRepresentante ??
    repObj?.codigo_forca_de_vendas ??
    repObj?.codigoForcaDeVendas ??
    repObj?.codigo ??
    repObj?.cod ??
    firstRep?.codigoRepresentante ??
    firstRep?.id ??
    representanteId ??
    null;
  const representanteNome =
    raw?.representanteNome ??
    raw?.representante_nome ??
    raw?.nome_representante ??
    raw?.forcaDeVendasNome ??
    raw?.forca_de_vendas_nome ??
    raw?.nome_forca_de_vendas ??
    repObj?.nome ??
    repObj?.nome_representante ??
    repObj?.nome_forca_de_vendas ??
    '';
  return {
    id: Number(id) || 0,
    empresaId: empresaId != null ? Number(empresaId) : undefined,
    codigoCliente: codigoCliente ? String(codigoCliente).trim() : undefined,
    cnpjCpf: cnpjCpf != null ? String(cnpjCpf).trim() : undefined,
    tipoPessoa: tipoPessoa != null ? String(tipoPessoa).trim() : undefined,
    consumidorFinal:
      consumidorFinal !== undefined ? Boolean(consumidorFinal) : undefined,
    nome: String(nome || '').trim(),
    fantasia: fantasia != null ? String(fantasia).trim() : undefined,
    inscricaoEstadual:
      inscricaoEstadual != null ? String(inscricaoEstadual).trim() : undefined,
    inscricaoMunicipal:
      inscricaoMunicipal != null ? String(inscricaoMunicipal).trim() : undefined,
    rg: rg != null ? String(rg).trim() : undefined,
    cep: cep != null ? String(cep).trim() : undefined,
    cidadeId: cidadeId != null ? Number(cidadeId) : undefined,
    cidade: String(cidade || '').trim(),
    uf: String(uf || '').trim(),
    endereco: endereco != null ? String(endereco).trim() : undefined,
    numero: numero != null ? String(numero).trim() : undefined,
    complemento: complemento != null ? String(complemento).trim() : undefined,
    bairro: String(bairro || '').trim(),
    fone: fone ? String(fone) : undefined,
    fax: fax ? String(fax).trim() : undefined,
    celular: celular ? String(celular).trim() : undefined,
    whatsapp: whatsapp ? String(whatsapp).trim() : undefined,
    contato: contato ? String(contato) : undefined,
    email: email ? String(email).trim() : undefined,
    emailDanfe: emailDanfe ? String(emailDanfe).trim() : undefined,
    site: site ? String(site).trim() : undefined,
    compradorNome: compradorNome ? String(compradorNome).trim() : undefined,
    compradorFone: compradorFone ? String(compradorFone).trim() : undefined,
    compradorDataNascimento: compradorDataNascimento
      ? String(compradorDataNascimento).trim()
      : undefined,
    contato2Nome: contato2Nome ? String(contato2Nome).trim() : undefined,
    contato2Celular: contato2Celular
      ? String(contato2Celular).trim()
      : undefined,
    contato2DataAniversario: contato2DataAniversario
      ? String(contato2DataAniversario).trim()
      : undefined,
    segmentoId: segmentoId != null ? Number(segmentoId) : undefined,
    redeId: redeId != null ? Number(redeId) : undefined,
    limiteCredito:
      limiteCredito != null && limiteCredito !== ''
        ? Number(limiteCredito)
        : null,
    descontoFinanceiroBoleto:
      descontoFinanceiroBoleto != null && descontoFinanceiroBoleto !== ''
        ? Number(descontoFinanceiroBoleto)
        : null,
    checkouts:
      checkouts != null && checkouts !== '' ? Number(checkouts) : null,
    credito: credito != null && credito !== '' ? Number(credito) : null,
    boleto: boleto != null ? Boolean(boleto) : null,
    prazo: prazo != null ? String(prazo).trim() : null,
    aberto: aberto != null && aberto !== '' ? Number(aberto) : null,
    disponivel:
      disponivel != null && disponivel !== '' ? Number(disponivel) : null,
    formaPagtoId: typeof formaPagtoId === 'number' ? formaPagtoId : (formaPagtoId != null ? String(formaPagtoId) : null),
    prazoPagtoId: typeof prazoPagtoId === 'number' ? prazoPagtoId : (prazoPagtoId != null ? String(prazoPagtoId) : null),
    b2bLiberado:
      b2bLiberado !== undefined ? Boolean(b2bLiberado) : undefined,
    b2bSenha: b2bSenha != null ? String(b2bSenha).trim() : null,
    b2bTabelaId:
      b2bTabelaId != null && b2bTabelaId !== '' ? Number(b2bTabelaId) : null,
    observacaoComercial:
      observacaoComercial != null ? String(observacaoComercial).trim() : null,
    observacaoFinanceiro:
      observacaoFinanceiro != null ? String(observacaoFinanceiro).trim() : null,
    inativo: inativo !== undefined ? Boolean(inativo) : undefined,
    simplesNacional: Boolean(raw?.simples_nacional ?? raw?.simplesNacional ?? false),
    cobrancaEndereco:
      cobrancaEndereco != null ? String(cobrancaEndereco).trim() : null,
    cobrancaEnderecoNumero:
      cobrancaEnderecoNumero != null ? String(cobrancaEnderecoNumero).trim() : null,
    cobrancaEnderecoBairro:
      cobrancaEnderecoBairro != null ? String(cobrancaEnderecoBairro).trim() : null,
    cobrancaEnderecoCidadeId:
      cobrancaEnderecoCidadeId != null ? Number(cobrancaEnderecoCidadeId) : null,
    cobrancaEnderecoCep:
      cobrancaEnderecoCep != null ? String(cobrancaEnderecoCep).trim() : null,
    cobrancaEnderecoUf:
      cobrancaEnderecoUf != null ? String(cobrancaEnderecoUf).trim() : null,
    cobrancaEnderecoComplemento:
      cobrancaEnderecoComplemento != null
        ? String(cobrancaEnderecoComplemento).trim()
        : null,
    rotaId: rotaId != null ? Number(rotaId) : null,
    rota: rotaObj,
    representanteId: representanteId != null ? String(representanteId).trim() : undefined,
    representanteCodigo: representanteCodigo ? String(representanteCodigo).trim() : undefined,
    representanteNome: representanteNome ? String(representanteNome).trim() : undefined,
    representantes,
    tabelasCodigos: Array.isArray(raw?.tabelas_codigos)
      ? raw.tabelas_codigos.map((c: any) => String(c))
      : undefined,
  };
}

type ClientSearchFilters = {
  query?: string;         // q - busca geral
  tipoBusca?: 'inicial' | 'contido';
  buscarEmTodos?: boolean;
  clientesB2b?: boolean;
  nome?: string;
  codigoCliente?: string;
  fantasia?: string;
  pessoa?: 'F' | 'J' | 'todos';
  tipoPessoa?: 'fisica' | 'juridica'; // compat legado
  formaPagtoId?: number;
  prazoPagtoId?: number;
  boletoBancario?: boolean;
  boleto?: boolean; // compat legado
  tabelaPrecoId?: number | string | Array<number | string>;
  tabelaId?: number; // compat legado
  email?: string;
  emailDanfe?: string;
  fone?: string;
  whatsapp?: string;
  celular?: string;
  compradorNome?: string;
  compradorFone?: string;
  clienteId?: string | number;
  uf?: string;
  cidade?: string;
  cidadeId?: number;
  bairro?: string;
  consumidorFinal?: boolean;
  classeId?: number;
  segmentoId?: number;
  redeId?: number;
  rotaId?: number;
  limite?: number;
  limiteMin?: number;
  limiteMax?: number;
  limiteCredito?: number; // compat legado
  situacaoCredito?: string;
  dependencia?: string;
  b2bLiberado?: boolean; // compat legado
  naoPositivadoDesde?: string;
  cadastradosDe?: string;
  cadastradosAte?: string;
  cadastroDe?: string; // compat legado
  cadastroAte?: string; // compat legado
  ultimaCompraDe?: string;
  ultimaCompraAte?: string;
  status?: 'ativos' | 'inativos' | 'todos';
  representanteId?: number | string;
};

type BulkAdjustPayload = {
  clienteIds: number[];
  data: Partial<{
    consumidorFinal: boolean;
    segmentoId: number;
    rotaId: number;
    redeId: number | null;
    cep: string;
    limiteCredito: number;
    formaPagtoId: number;
    prazoPagtoId: number;
    b2bLiberado: boolean;
    b2bTabelaId: number | null;
    inativo: boolean;
    boleto: boolean;
    prazo: string;
    descontoFinanceiroBoleto: number;
    checkouts: number;
    credito: number;
    aberto: number;
    disponivel: number;
    representanteId: string;
    representanteIds: string[];
  }>;
};

async function fetchFromApi({
  filters,
  page = 1,
  limit = 100,
}: {
  filters?: ClientSearchFilters;
  page?: number;
  limit?: number;
}): Promise<Client[]> {
  const empresa = authService.getEmpresa();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  const token = authService.getToken();
  if (!token) return Promise.reject('Token ausente');

  try {
    const params = new URLSearchParams();
    params.set('empresaId', String(empresa.empresa_id));
    const clean = filters || {};
    const qTrim = typeof clean.query === 'string' ? clean.query.trim() : '';
    const qUpper = qTrim ? qTrim.toUpperCase() : '';
    if (qUpper) params.set('q', qUpper);
    if (clean.status) {
      params.set('status', clean.status);
    }

    const tipoBusca = clean.tipoBusca ?? (clean as any).searchMode;
    if (tipoBusca) {
      params.set('tipoBusca', tipoBusca);
    }

    const buscarEmTodos = clean.buscarEmTodos ?? true;
    params.set('buscarEmTodos', String(Boolean(buscarEmTodos)));

    const clientesB2b = clean.clientesB2b ?? clean.b2bLiberado;
    if (clientesB2b !== undefined) {
      params.set('clientesB2b', String(Boolean(clientesB2b)));
    }

    const setParam = (key: keyof ClientSearchFilters, value: any) => {
      if (value === undefined || value === null) return;
      const text = String(value).trim();
      if (text === '') return;
      params.set(key as string, text);
    };

    setParam('nome', clean.nome);
    setParam('codigoCliente', clean.codigoCliente);
    setParam('fantasia', clean.fantasia);
    setParam('email', clean.email);
    setParam('emailDanfe', clean.emailDanfe);
    setParam('fone', clean.fone);
    setParam('whatsapp', clean.whatsapp);
    setParam('celular', clean.celular);
    setParam('compradorNome', clean.compradorNome);
    setParam('compradorFone', clean.compradorFone);
    setParam('clienteId', clean.clienteId);

    setParam('uf', clean.uf);
    setParam('cidade', clean.cidade);
    if (clean.cidadeId !== undefined) params.set('cidadeId', String(clean.cidadeId));
    setParam('bairro', clean.bairro);

    const classeId = clean.classeId ?? clean.segmentoId;
    if (classeId !== undefined) params.set('classeId', String(classeId));

    if (clean.formaPagtoId !== undefined) params.set('formaPagtoId', String(clean.formaPagtoId));
    if (clean.prazoPagtoId !== undefined) params.set('prazoPagtoId', String(clean.prazoPagtoId));

    const boletoBancario = clean.boletoBancario ?? clean.boleto;
    if (boletoBancario !== undefined) params.set('boletoBancario', String(Boolean(boletoBancario)));

    const tabelaPrecoId = clean.tabelaPrecoId ?? clean.tabelaId;
    if (Array.isArray(tabelaPrecoId)) {
      const values = tabelaPrecoId.map((v) => String(v).trim()).filter(Boolean);
      if (values.length > 0) params.set('tabelaPrecoId', values.join(','));
    } else if (tabelaPrecoId !== undefined && tabelaPrecoId !== null && String(tabelaPrecoId).trim() !== '') {
      params.set('tabelaPrecoId', String(tabelaPrecoId).trim());
    }

    const limite = clean.limite ?? clean.limiteCredito;
    if (limite !== undefined) params.set('limite', String(limite));
    if (clean.limiteMin !== undefined) params.set('limiteMin', String(clean.limiteMin));
    if (clean.limiteMax !== undefined) params.set('limiteMax', String(clean.limiteMax));

    if (clean.consumidorFinal !== undefined) params.set('consumidorFinal', String(clean.consumidorFinal));
    if (clean.redeId !== undefined) params.set('redeId', String(clean.redeId));
    if (clean.rotaId !== undefined) params.set('rotaId', String(clean.rotaId));
    if (clean.representanteId !== undefined && clean.representanteId !== null && String(clean.representanteId).trim() !== '')
      params.set('representanteId', String(clean.representanteId).trim());
    setParam('situacaoCredito', clean.situacaoCredito);
    setParam('dependencia', clean.dependencia);

    const pessoa = clean.pessoa
      ?? (clean.tipoPessoa === 'fisica' ? 'F' : clean.tipoPessoa === 'juridica' ? 'J' : clean.tipoPessoa === 'all' ? 'todos' : undefined);
    if (pessoa) params.set('pessoa', pessoa);

    setParam('naoPositivadoDesde', clean.naoPositivadoDesde);
    const cadastradosDe = clean.cadastradosDe ?? clean.cadastroDe;
    const cadastradosAte = clean.cadastradosAte ?? clean.cadastroAte;
    if (cadastradosDe) params.set('cadastradosDe', cadastradosDe);
    if (cadastradosAte) params.set('cadastradosAte', cadastradosAte);
    setParam('ultimaCompraDe', clean.ultimaCompraDe);
    setParam('ultimaCompraAte', clean.ultimaCompraAte);

    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const url = `${API_BASE}/api/clientes?${params.toString()}`;
    const headers: Record<string, string> = { accept: 'application/json' };
    const res = await apiClient.fetch(url, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      let message = 'Falha ao buscar clientes';
      try {
        const err = await res.json();
        message = extractErrorMessage(err, message);
      } catch {}
      return Promise.reject(message);
    }

    const data = await res.json();
    const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return arr.map(normalizeClient);
  } catch (e) {
    return Promise.reject('Erro de conexão com o servidor');
  }
}

export const clientsService = {
  lookupCnpj: async (cnpj: string) => {
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    const trimmed = (cnpj || '').trim();
    if (!trimmed) return Promise.reject('CNPJ obrigatório');

    const params = new URLSearchParams();
    params.set('cnpj', trimmed);

    try {
      const url = `${API_BASE}/api/cnpj?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao consultar CNPJ';
        try {
          const err = await res.json();
          message = extractErrorMessage(err, message);
        } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      return Promise.reject('Erro de conexão na consulta de CNPJ');
    }
  },
  findByCnpjCpf: async (cnpjCpf: string): Promise<Client | undefined> => {
    const cleaned = normalizeCnpjCpf(cnpjCpf);
    if (!cleaned) return undefined;

    const list = await fetchFromApi({
      filters: { query: cleaned, status: 'todos' },
      page: 1,
      limit: 10,
    });

    return list.find(
      (client) => normalizeCnpjCpf(client.cnpjCpf) === cleaned,
    );
  },
  // Server-side search with pagination
  find: async (
    queryOrFilters?: string | ClientSearchFilters,
    page = 1,
    limit = 100,
  ): Promise<Client[]> => {
    const filters =
      typeof queryOrFilters === 'string'
        ? { query: queryOrFilters }
        : queryOrFilters;
    return fetchFromApi({ filters, page, limit });
  },

  // Backwards-compatible search signature used elsewhere in the app
  search: async (
    queryOrFilters?: string | ClientSearchFilters,
    _filters?: any,
    page = 1,
    limit = 100,
  ): Promise<Client[]> => {
    const filters =
      typeof queryOrFilters === 'string'
        ? { query: queryOrFilters }
        : queryOrFilters;
    return fetchFromApi({ filters, page, limit });
  },

  // Convenience to get a single client by id using a server search
  getById: async (id: number): Promise<Client | undefined> => {
    const list = await fetchFromApi({ filters: { query: String(id) }, page: 1, limit: 1 });
    return list.find((c) => c.id === id);
  },

  // Detailed GET by id (raw object from API)
  getDetail: async (id: number): Promise<any> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const url = `${API_BASE}/api/clientes/${encodeURIComponent(id)}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        let message = 'Falha ao buscar cliente';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Create new client - POST /api/clientes
  // codigo_cliente é gerado automaticamente, não enviar
  // Payload plano com aliases suportados
  create: async (data: {
    cnpjCpf: string;
    tipoPessoa?: string;
    consumidorFinal?: boolean;
    simplesNacional?: boolean;
    inscricaoEstadual?: string;
    nome: string;
    fantasia?: string;
    cep?: string;
    cidadeId?: number;
    cidade?: string;
    uf?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cobrancaEndereco?: string;
    cobrancaEnderecoNumero?: string;
    cobrancaEnderecoBairro?: string;
    cobrancaEnderecoCidadeId?: number;
    cobrancaEnderecoCep?: string;
    cobrancaEnderecoUf?: string;
    cobrancaEnderecoComplemento?: string;
    telefone?: string;
    fone?: string;
    whatsapp?: string;
    celular?: string;
    email?: string;
    emailDanfe?: string;
    contato1Nome?: string;
    compradorNome?: string;
    contato1Celular?: string;
    compradorFone?: string;
    contato1Aniversario?: string;
    compradorDataNascimento?: string;
    segmentoId?: number;
    rotaId?: number;
    rota?: string | number;
    redeId?: number;
    rede?: string | number;
    tabelaId?: number;
    tabelaIds?: number[];
    representanteId?: string;
    representanteIds?: string[];
    limite?: number;
    limiteCredito?: number;
    formaPagtoId?: number;
    prazoPagtoId?: number;
    b2bLiberado?: boolean;
    b2bSenha?: string;
    b2bTabelaId?: number;
    inativo?: boolean;
  }): Promise<any> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const url = `${API_BASE}/api/clientes`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        'Content-Type': 'application/json',
      };
      // Remover codigoCliente se existir (é gerado automaticamente)
      const { ...cleanData } = data as any;
      delete cleanData.codigoCliente;
      delete cleanData.codigo_cliente;
      
      // Payload conforme doc: empresaId no topo + dados dentro de "data"
      const res = await apiClient.fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ empresaId: empresa.empresa_id, data: cleanData }),
      });
      if (!res.ok) {
        let message = 'Falha ao criar cliente';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Update client - PUT /api/clientes/:id?empresaId=5
  // codigo_cliente não é aceito/gerado aqui
  // Payload plano com aliases suportados
  update: async (
    id: number,
    data: Partial<{
      cnpjCpf: string;
      tipoPessoa: string;
      consumidorFinal: boolean;
      simplesNacional: boolean;
      inscricaoEstadual: string;
      nome: string;
      fantasia: string;
      cep: string;
      cidadeId: number;
      cidade: string;
      uf: string;
      endereco: string;
      numero: string;
      complemento: string;
      bairro: string;
      cobrancaEndereco: string;
      cobrancaEnderecoNumero: string;
      cobrancaEnderecoBairro: string;
      cobrancaEnderecoCidadeId: number;
      cobrancaEnderecoCep: string;
      cobrancaEnderecoUf: string;
      cobrancaEnderecoComplemento: string;
      telefone: string;
      fone: string;
      whatsapp: string;
      celular: string;
      email: string;
      emailDanfe: string;
      contato1Nome: string;
      compradorNome: string;
      contato1Celular: string;
      compradorFone: string;
      contato1Aniversario: string;
      compradorDataNascimento: string;
      segmentoId: number;
      rotaId: number;
      rota: string | number;
      redeId: number;
      rede: string | number;
      tabelaId: number;
      tabelaIds: number[];
      representanteId: string;
      representanteIds: string[];
      limite: number;
      limiteCredito: number;
      formaPagtoId: number;
      prazoPagtoId: number;
      b2bLiberado: boolean;
      b2bSenha: string;
      b2bTabelaId: number;
      inativo: boolean;
    }>
  ): Promise<any> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      // empresaId na query string conforme doc
      const url = `${API_BASE}/api/clientes/${encodeURIComponent(id)}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        'Content-Type': 'application/json',
      };
      // Remover codigoCliente se existir (não é aceito no PUT)
      const { ...cleanData } = data as any;
      delete cleanData.codigoCliente;
      delete cleanData.codigo_cliente;
      const payload = {
        ...cleanData,
        consumidor_final:
          cleanData.consumidorFinal !== undefined
            ? Boolean(cleanData.consumidorFinal)
            : undefined,
        simples_nacional:
          cleanData.simplesNacional !== undefined
            ? Boolean(cleanData.simplesNacional)
            : undefined,
      };
      
      // Payload no formato documentado pelo backend
      const res = await apiClient.fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: payload }),
      });
      if (!res.ok) {
        let message = 'Falha ao atualizar cliente';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Bulk update clients - POST /api/clientes/ajuste-geral
  bulkAdjust: async (payload: BulkAdjustPayload): Promise<any> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const url = `${API_BASE}/api/clientes/ajuste-geral`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        'Content-Type': 'application/json',
      };
      const res = await apiClient.fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          empresaId: empresa.empresa_id,
          clienteIds: Array.from(
            new Set(
              (payload?.clienteIds ?? [])
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0),
            ),
          ),
          data: payload?.data ?? {},
        }),
      });
      if (!res.ok) {
        let message = 'Falha ao aplicar ajuste geral';
        try {
          const err = await res.json();
          message = extractErrorMessage(err, message);
        } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Delete client - DELETE /api/clientes/:id?empresaId=5
  remove: async (id: number): Promise<boolean> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    try {
      const url = `${API_BASE}/api/clientes/${encodeURIComponent(id)}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        let message = 'Falha ao excluir cliente';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      return true;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Get price tables for client - GET /api/clientes/:id/tabelas-precos?empresaId=5
  getTabelasPrecos: async (id: number): Promise<any[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    try {
      const url = `${API_BASE}/api/clientes/${encodeURIComponent(id)}/tabelas-precos?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        let message = 'Falha ao buscar tabelas de preço';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // GET /api/clientes/por-forca-de-vendas
  getByRepresentante: async (params: {
    forcaDeVendas?: string;
    forcaDeVendasId?: number;
    representante?: string;
    representanteId?: number;
    q?: string;
    uf?: string;
    cidade?: string;
    bairro?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Client[]; total: number }> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    const qs = new URLSearchParams();
    qs.set('empresaId', String(empresa.empresa_id));
    if (params.forcaDeVendas || params.representante)
      qs.set('forcaDeVendas', params.forcaDeVendas ?? String(params.representante));
    if (params.forcaDeVendasId || params.representanteId)
      qs.set(
        'forcaDeVendasId',
        String(params.forcaDeVendasId ?? params.representanteId),
      );
    if (params.q) qs.set('q', params.q);
    if (params.uf) qs.set('uf', params.uf);
    if (params.cidade) qs.set('cidade', params.cidade);
    if (params.bairro) qs.set('bairro', params.bairro);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));

    try {
      const url = `${API_BASE}/api/clientes/por-forca-de-vendas?${qs.toString()}`;
      const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });
      if (!res.ok) {
        let message = 'Falha ao buscar clientes por representante';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      const raw = await res.json();
      const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      const total = typeof raw?.total === 'number' ? raw.total : arr.length;
      return { data: arr.map(normalizeClient), total };
    } catch {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  importar: async (
    rows: Record<string, any>[],
  ): Promise<{ criados: number; atualizados: number; erros: Array<{ linha: number; cnpj_cpf: string; mensagem: string }> }> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');

    const res = await apiClient.fetch(`${API_BASE}/api/clientes/importar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId: empresa.empresa_id, data: rows }),
    });
    if (!res.ok) {
      let message = 'Falha ao importar clientes';
      try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
      return Promise.reject(message);
    }
    return res.json();
  },
};
