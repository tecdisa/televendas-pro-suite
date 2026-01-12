import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface ClientRota {
  id: number;
  codigo_rota?: string;
  descricao_rota?: string;
}

export interface Client {
  id: number;
  codigoCliente?: string;
  nome: string;
  cidade: string;
  uf: string;
  bairro: string;
  fone?: string;
  contato?: string;
  formaPagtoId?: number | string | null;
  prazoPagtoId?: number | string | null;
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
  const formaPagtoId = raw?.forma_pagto_id ?? raw?.formaPagtoId ?? raw?.forma_pagto ?? null;
  const prazoPagtoId = raw?.prazo_pagto_id ?? raw?.prazoPagtoId ?? null;
  const rotaId = raw?.rota_id ?? raw?.rotaId ?? null;
  // Objeto rota vindo do join com rotas_clientes
  const rotaObj = raw?.rota && typeof raw.rota === 'object' ? {
    id: raw.rota.id,
    codigo_rota: raw.rota.codigo_rota,
    descricao_rota: raw.rota.descricao_rota,
  } : null;
  const repObj = raw?.representante && typeof raw.representante === 'object' ? raw.representante : null;
  const representantesArr = Array.isArray(raw?.representantes) ? raw.representantes : [];
  const representantes = representantesArr
    .map((r: any) => {
      if (!r) return null;
      const rid = r.id ?? r.codigo_representante ?? r.codigo ?? r.cod ?? r.matricula ?? null;
      return {
        id: rid != null ? String(rid).trim() : '',
        codigoRepresentante: r.codigo_representante ?? r.codigoRepresentante ?? r.codigo ?? r.cod ?? r.matricula ?? undefined,
        nome: r.nome ? String(r.nome).trim() : undefined,
      };
    })
    .filter(Boolean) as Client['representantes'];
  const firstRep = representantes?.[0];
  const representanteId =
    raw?.representanteId ??
    raw?.representante_id ??
    raw?.representante ??
    repObj?.id ??
    repObj?.codigo ??
    repObj?.cod ??
    null;
  const representanteCodigo =
    raw?.codigo_representante ??
    raw?.codigoRepresentante ??
    raw?.representante_codigo ??
    raw?.representanteCod ??
    raw?.representante_cod ??
    repObj?.codigo_representante ??
    repObj?.codigoRepresentante ??
    repObj?.codigo ??
    repObj?.cod ??
    firstRep?.codigoRepresentante ??
    firstRep?.id ??
    representanteId ??
    null;
  const representanteNome = raw?.representanteNome ?? repObj?.nome ?? '';

  return {
    id: Number(id) || 0,
    codigoCliente: codigoCliente ? String(codigoCliente).trim() : undefined,
    nome: String(nome || '').trim(),
    cidade: String(cidade || '').trim(),
    uf: String(uf || '').trim(),
    bairro: String(bairro || '').trim(),
    fone: fone ? String(fone) : undefined,
    contato: contato ? String(contato) : undefined,
    formaPagtoId: typeof formaPagtoId === 'number' ? formaPagtoId : (formaPagtoId != null ? String(formaPagtoId) : null),
    prazoPagtoId: typeof prazoPagtoId === 'number' ? prazoPagtoId : (prazoPagtoId != null ? String(prazoPagtoId) : null),
    rotaId: rotaId != null ? Number(rotaId) : null,
    rota: rotaObj,
    representanteId: representanteId != null ? String(representanteId).trim() : undefined,
    representanteCodigo: representanteCodigo ? String(representanteCodigo).trim() : undefined,
    representanteNome: representanteNome ? String(representanteNome).trim() : undefined,
    representantes,
  };
}

type ClientSearchFilters = {
  query?: string;         // q - busca geral
  nome?: string;
  codigoCliente?: string;
  fantasia?: string;
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
  bairro?: string;
  consumidorFinal?: boolean;
  segmentoId?: number;
  redeId?: number;
  rotaId?: number;
  inativo?: boolean;
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
    setParam('bairro', clean.bairro);
    if (clean.consumidorFinal !== undefined) params.set('consumidorFinal', String(clean.consumidorFinal));
    if (clean.segmentoId !== undefined) params.set('segmentoId', String(clean.segmentoId));
    if (clean.redeId !== undefined) params.set('redeId', String(clean.redeId));
    if (clean.rotaId !== undefined) params.set('rotaId', String(clean.rotaId));
    if (clean.inativo !== undefined) params.set('inativo', String(clean.inativo));

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
      
      // Payload plano
      const res = await apiClient.fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(cleanData),
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
};
