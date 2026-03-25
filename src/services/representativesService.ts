import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface Representante {
  representante_id: number;
  codigo_representante?: string;
  nome_representante: string;
  cnpj_cpf?: string;
  fantasia?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade_id?: number | null;
  uf?: string;
  cep?: string;
  fone?: string;
  whatsapp?: string;
  email?: string;
  data_nascimento?: string | null;
  supervisor?: string;
  supervisor_id?: number | null;
  gerente?: string;
  gerente_id?: number | null;
  comissao?: number;
  objetivo_de_venda?: number;
  limite_de_troca?: number;
  setor_id?: number | null;
  rotas_liberadas?: string;
  liberado_debito_credito?: boolean;
  bloqueia_alteracao_agenda?: boolean;
  quantidade_maxima_pedidos_retidos_para_sincronizar?: number;
  observacao?: string;
  empresa_id?: number | null;
  usuario_id?: number | null;
  inativo?: boolean;
}

// Alias for backward compatibility with existing components
export interface Representative {
  id: string;
  codigoRepresentante?: string;
  nome: string;
}

export interface RepresentanteFormData {
  codigo_representante?: string;
  nome_representante: string;
  cnpj_cpf?: string;
  fantasia?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade_id?: number | null;
  uf?: string;
  cep?: string;
  fone?: string;
  whatsapp?: string;
  email?: string;
  data_nascimento?: string | null;
  supervisor?: string;
  supervisor_id?: number | null;
  gerente?: string;
  gerente_id?: number | null;
  comissao?: number;
  objetivo_de_venda?: number;
  limite_de_troca?: number;
  setor_id?: number | null;
  rotas_liberadas?: string;
  liberado_debito_credito?: boolean;
  bloqueia_alteracao_agenda?: boolean;
  quantidade_maxima_pedidos_retidos_para_sincronizar?: number;
  observacao?: string;
  empresa_id?: number | null;
  usuario_id?: number | null;
  inativo?: boolean;
}

export interface RepresentanteFornecedor {
  fornecedor_id: number;
  codigo_fornecedor?: string;
  nome_fornecedor: string;
  cnpj_cpf?: string;
  fone?: string;
  inativo?: boolean;
}

export interface RepresentanteFornecedorItem {
  empresa_id?: number;
  representante: Representante;
  fornecedor: RepresentanteFornecedor;
  objetivo_de_venda?: number;
}

export interface CopyRepresentanteResult {
  totalOrigem: number;
  totalCriados: number;
  totalIgnorados: number;
}

function normalizeRepresentante(raw: any): Representante {
  const parseNumber = (value: any, fallback = 0) => {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    representante_id:
      raw.representante_id ??
      raw.forca_de_venda_id ??
      raw.forcaDeVendaId ??
      raw.id ??
      0,
    codigo_representante:
      raw.codigo_representante ??
      raw.codigoRepresentante ??
      raw.codigo_forca_de_vendas ??
      raw.codigoForcaDeVendas ??
      '',
    nome_representante:
      raw.nome_representante ??
      raw.nomeRepresentante ??
      raw.nome_forca_de_vendas ??
      raw.nomeForcaDeVendas ??
      raw.nome ??
      '',
    cnpj_cpf: raw.cnpj_cpf ?? raw.cnpjCpf ?? '',
    fantasia: raw.fantasia ?? '',
    endereco: raw.endereco ?? '',
    numero: raw.numero ?? '',
    complemento: raw.complemento ?? '',
    bairro: raw.bairro ?? '',
    cidade_id: raw.cidade_id ?? raw.cidadeId ?? null,
    uf: raw.uf ?? '',
    cep: raw.cep ?? '',
    fone: raw.fone ?? raw.telefone ?? '',
    whatsapp: raw.whatsapp ?? '',
    email: raw.email ?? '',
    data_nascimento: raw.data_nascimento ?? raw.dataNascimento ?? null,
    supervisor: raw.supervisor ?? '',
    supervisor_id: raw.supervisor_id ?? raw.supervisorId ?? null,
    gerente: raw.gerente ?? '',
    gerente_id: raw.gerente_id ?? raw.gerenteId ?? null,
    comissao: parseNumber(raw.comissao, 0),
    objetivo_de_venda: parseNumber(
      raw.objetivo_de_venda ?? raw.objetivoDeVenda,
      0,
    ),
    limite_de_troca: parseNumber(
      raw.limite_de_troca ?? raw.limiteDeTroca,
      0,
    ),
    setor_id: raw.setor_id ?? raw.setorId ?? null,
    rotas_liberadas: raw.rotas_liberadas ?? raw.rotasLiberadas ?? '',
    liberado_debito_credito: raw.liberado_debito_credito ?? raw.liberadoDebitoCredito ?? false,
    bloqueia_alteracao_agenda: raw.bloqueia_alteracao_agenda ?? raw.bloqueiaAlteracaoAgenda ?? false,
    quantidade_maxima_pedidos_retidos_para_sincronizar: raw.quantidade_maxima_pedidos_retidos_para_sincronizar ?? raw.quantidadeMaximaPedidosRetidosParaSincronizar ?? 0,
    observacao: raw.observacao ?? raw.obs ?? '',
    empresa_id: raw.empresa_id ?? raw.empresaId ?? null,
    usuario_id: raw.usuario_id ?? raw.usuarioId ?? null,
    inativo: raw.inativo ?? false,
  };
}

function normalizeRepresentanteFornecedor(raw: any): RepresentanteFornecedor {
  return {
    fornecedor_id: raw?.fornecedor_id ?? raw?.id ?? 0,
    codigo_fornecedor: raw?.codigo_fornecedor ?? raw?.codigoFornecedor ?? undefined,
    nome_fornecedor: raw?.nome_fornecedor ?? raw?.nomeFornecedor ?? raw?.nome ?? '',
    cnpj_cpf: raw?.cnpj_cpf ?? raw?.cnpjCpf ?? undefined,
    fone: raw?.fone ?? raw?.telefone ?? undefined,
    inativo: Boolean(raw?.inativo ?? false),
  };
}

function normalizeRepresentanteFornecedorItem(raw: any): RepresentanteFornecedorItem {
  const objetivoRaw = raw?.objetivo_de_venda ?? raw?.objetivoDeVenda;
  const objetivo =
    objetivoRaw === undefined || objetivoRaw === null || objetivoRaw === ''
      ? undefined
      : Number(objetivoRaw);
  return {
    empresa_id: raw?.empresa_id ?? undefined,
    representante: normalizeRepresentante(
      raw?.representante ?? raw?.forca_de_vendas ?? raw?.forcaDeVendas ?? {},
    ),
    fornecedor: normalizeRepresentanteFornecedor(raw?.fornecedor ?? {}),
    objetivo_de_venda: Number.isFinite(objetivo) ? objetivo : undefined,
  };
}

async function getEmpresaId(): Promise<number> {
  const empresa = authService.getEmpresa();
  if (!empresa) throw new Error('Empresa não selecionada');
  return empresa.empresa_id;
}

export const representativesService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    status: 'ativos' | 'inativos' | 'todos' = 'ativos'
  ): Promise<{ data: Representante[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('status', status);
    if (status === 'todos') params.set('incluirInativos', 'true');

    const url = `${API_BASE}/api/forca-de-vendas/empresa/${empresaId}?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      let message = 'Falha ao buscar força de vendas';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return {
      data: arr.map(normalizeRepresentante),
      page: json?.page ?? page,
      limit: json?.limit ?? limit,
      total: json?.total ?? arr.length,
    };
  },

  async getById(id: number): Promise<Representante | null> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/forca-de-vendas/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar força de vendas';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    return normalizeRepresentante(json);
  },

  async create(data: RepresentanteFormData): Promise<Representante> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/forca-de-vendas`;
    const body = {
      empresaId,
      data: {
        nome_representante: data.nome_representante,
        codigo_representante: data.codigo_representante || undefined,
        cnpj_cpf: data.cnpj_cpf || undefined,
        fantasia: data.fantasia || undefined,
        endereco: data.endereco || undefined,
        numero: data.numero || undefined,
        complemento: data.complemento || undefined,
        bairro: data.bairro || undefined,
        cidade_id: data.cidade_id ?? null,
        uf: data.uf || undefined,
        cep: data.cep || undefined,
        fone: data.fone || undefined,
        whatsapp: data.whatsapp || undefined,
        email: data.email || undefined,
        data_nascimento: data.data_nascimento || null,
        supervisor: data.supervisor || undefined,
        supervisor_id: data.supervisor_id ?? undefined,
        gerente: data.gerente || undefined,
        gerente_id: data.gerente_id ?? undefined,
        comissao: data.comissao ?? undefined,
        objetivo_de_venda: data.objetivo_de_venda ?? undefined,
        limite_de_troca: data.limite_de_troca ?? undefined,
        setor_id: data.setor_id ?? null,
        rotas_liberadas: data.rotas_liberadas || undefined,
        liberado_debito_credito: data.liberado_debito_credito ?? false,
        bloqueia_alteracao_agenda: data.bloqueia_alteracao_agenda ?? false,
        quantidade_maxima_pedidos_retidos_para_sincronizar: data.quantidade_maxima_pedidos_retidos_para_sincronizar ?? undefined,
        observacao: data.observacao || undefined,
        empresa_id: data.empresa_id ?? undefined,
        inativo: data.inativo ?? false,
      },
    };

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao criar força de vendas';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    return normalizeRepresentante(json);
  },

  async update(id: number, data: Partial<RepresentanteFormData>): Promise<Representante> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/forca-de-vendas/${id}?empresaId=${empresaId}`;
    const payload: Partial<RepresentanteFormData> = {};
    if (data.codigo_representante !== undefined)
      payload.codigo_representante = data.codigo_representante;
    if (data.comissao !== undefined) payload.comissao = data.comissao;
    if (data.objetivo_de_venda !== undefined)
      payload.objetivo_de_venda = data.objetivo_de_venda;
    if (data.limite_de_troca !== undefined)
      payload.limite_de_troca = data.limite_de_troca;
    if (data.setor_id !== undefined) payload.setor_id = data.setor_id;
    if (data.gerente_id !== undefined) payload.gerente_id = data.gerente_id;
    if (data.supervisor_id !== undefined) payload.supervisor_id = data.supervisor_id;
    if (data.empresa_id !== undefined) payload.empresa_id = data.empresa_id;
    if (data.rotas_liberadas !== undefined)
      payload.rotas_liberadas = data.rotas_liberadas;
    if (data.liberado_debito_credito !== undefined)
      payload.liberado_debito_credito = data.liberado_debito_credito;
    if (data.bloqueia_alteracao_agenda !== undefined)
      payload.bloqueia_alteracao_agenda = data.bloqueia_alteracao_agenda;
    if (data.quantidade_maxima_pedidos_retidos_para_sincronizar !== undefined)
      payload.quantidade_maxima_pedidos_retidos_para_sincronizar =
        data.quantidade_maxima_pedidos_retidos_para_sincronizar;
    if (data.observacao !== undefined) payload.observacao = data.observacao;
    if (data.inativo !== undefined) payload.inativo = data.inativo;

    const body = { data: payload };

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao atualizar força de vendas';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    return normalizeRepresentante(json);
  },

  async delete(id: number): Promise<void> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/forca-de-vendas/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir força de vendas';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
  },

  // DELETE /api/clientes/:id/forca-de-vendas/:forcaDeVendasId?empresaId=5
  async removeClienteRepresentante(clienteId: number, representanteId: number | string): Promise<boolean> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/clientes/${encodeURIComponent(clienteId)}/forca-de-vendas/${encodeURIComponent(representanteId)}?empresaId=${encodeURIComponent(empresaId)}`;
    const res = await apiClient.fetch(url, { method: 'DELETE', headers: { accept: 'application/json' } });
    if (res.status === 404) throw new Error('Cliente ou vínculo com força de vendas não encontrado');
    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao remover força de vendas do cliente';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
    return true;
  },

  async getFornecedores(
    representanteId: number | string,
    options?: { q?: string; page?: number; limit?: number }
  ): Promise<{ data: RepresentanteFornecedorItem[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 100;
    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (options?.q?.trim()) params.set('q', options.q.trim());

    const url = `${API_BASE}/api/forca-de-vendas/${encodeURIComponent(representanteId)}/fornecedores?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      let message = 'Falha ao buscar fornecedores da força de vendas';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return {
      data: arr.map(normalizeRepresentanteFornecedorItem),
      page: json?.page ?? page,
      limit: json?.limit ?? limit,
      total: json?.total ?? arr.length,
    };
  },

  async addFornecedor(
    representanteId: number | string,
    fornecedorId: number | string
  ): Promise<boolean> {
    const empresaId = await getEmpresaId();
    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    const url = `${API_BASE}/api/forca-de-vendas/${encodeURIComponent(representanteId)}/fornecedores?${params.toString()}`;

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ fornecedorId: Number(fornecedorId) }),
    });

    if (!res.ok && res.status !== 201 && res.status !== 204) {
      let message = 'Falha ao incluir fornecedor na força de vendas';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return true;
  },

  async removeFornecedor(
    representanteId: number | string,
    fornecedorId: number | string
  ): Promise<boolean> {
    const empresaId = await getEmpresaId();
    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    const url = `${API_BASE}/api/forca-de-vendas/${encodeURIComponent(representanteId)}/fornecedores/${encodeURIComponent(fornecedorId)}?${params.toString()}`;

    const res = await apiClient.fetch(url, {
      method: 'DELETE',
      headers: { accept: 'application/json' },
    });

    if (res.status === 404) {
      throw new Error('Fornecedor não vinculado à força de vendas');
    }

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir fornecedor da pasta';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return true;
  },

  async updateFornecedorObjetivo(
    representanteId: number | string,
    fornecedorId: number | string,
    objetivoDeVenda: number | null,
  ): Promise<boolean> {
    const empresaId = await getEmpresaId();
    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    const url = `${API_BASE}/api/forca-de-vendas/${encodeURIComponent(representanteId)}/fornecedores/${encodeURIComponent(fornecedorId)}?${params.toString()}`;

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        data: {
          objetivo_de_venda: objetivoDeVenda,
        },
      }),
    });

    if (!res.ok) {
      let message = 'Falha ao atualizar objetivo do fornecedor';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    return true;
  },

  async copyClientes(
    representanteDestinoId: number | string,
    representanteOrigemId: number | string
  ): Promise<CopyRepresentanteResult> {
    const empresaId = await getEmpresaId();
    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    const url = `${API_BASE}/api/forca-de-vendas/${encodeURIComponent(representanteDestinoId)}/copiar-clientes?${params.toString()}`;

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ representanteOrigemId: Number(representanteOrigemId) }),
    });

    if (!res.ok) {
      let message = 'Falha ao copiar clientes';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    return {
      totalOrigem: Number(json?.totalOrigem ?? 0),
      totalCriados: Number(json?.totalCriados ?? 0),
      totalIgnorados: Number(json?.totalIgnorados ?? 0),
    };
  },

  async copyFornecedores(
    representanteDestinoId: number | string,
    representanteOrigemId: number | string
  ): Promise<CopyRepresentanteResult> {
    const empresaId = await getEmpresaId();
    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    const url = `${API_BASE}/api/forca-de-vendas/${encodeURIComponent(representanteDestinoId)}/copiar-fornecedores?${params.toString()}`;

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ representanteOrigemId: Number(representanteOrigemId) }),
    });

    if (!res.ok) {
      let message = 'Falha ao copiar fornecedores';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }

    const json = await res.json();
    return {
      totalOrigem: Number(json?.totalOrigem ?? 0),
      totalCriados: Number(json?.totalCriados ?? 0),
      totalIgnorados: Number(json?.totalIgnorados ?? 0),
    };
  },

  // Legacy method for backward compatibility with existing components
  async find(query?: string, page = 1, limit = 100): Promise<Representative[]> {
    const result = await this.getAll(query, page, limit, 'ativos');
    return result.data.map((r) => ({
      id: String(r.representante_id),
      codigoRepresentante: r.codigo_representante,
      nome: r.nome_representante,
    }));
  },
};
