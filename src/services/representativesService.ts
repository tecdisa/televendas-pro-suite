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
  gerente?: string;
  comissao?: number;
  setor_id?: number | null;
  rotas_liberadas?: string;
  liberado_debito_credito?: boolean;
  bloqueia_alteracao_agenda?: boolean;
  quantidade_maxima_pedidos_retidos_para_sincronizar?: number;
  observacao?: string;
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
  gerente?: string;
  comissao?: number;
  setor_id?: number | null;
  rotas_liberadas?: string;
  liberado_debito_credito?: boolean;
  bloqueia_alteracao_agenda?: boolean;
  quantidade_maxima_pedidos_retidos_para_sincronizar?: number;
  observacao?: string;
  inativo?: boolean;
}

function normalizeRepresentante(raw: any): Representante {
  return {
    representante_id: raw.representante_id ?? raw.id ?? 0,
    codigo_representante: raw.codigo_representante ?? raw.codigoRepresentante ?? '',
    nome_representante: raw.nome_representante ?? raw.nomeRepresentante ?? raw.nome ?? '',
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
    gerente: raw.gerente ?? '',
    comissao: raw.comissao ?? 0,
    setor_id: raw.setor_id ?? raw.setorId ?? null,
    rotas_liberadas: raw.rotas_liberadas ?? raw.rotasLiberadas ?? '',
    liberado_debito_credito: raw.liberado_debito_credito ?? raw.liberadoDebitoCredito ?? false,
    bloqueia_alteracao_agenda: raw.bloqueia_alteracao_agenda ?? raw.bloqueiaAlteracaoAgenda ?? false,
    quantidade_maxima_pedidos_retidos_para_sincronizar: raw.quantidade_maxima_pedidos_retidos_para_sincronizar ?? raw.quantidadeMaximaPedidosRetidosParaSincronizar ?? 0,
    observacao: raw.observacao ?? raw.obs ?? '',
    inativo: raw.inativo ?? false,
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
    incluirInativos = false
  ): Promise<{ data: Representante[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (incluirInativos) params.set('incluirInativos', 'true');

    const url = `${API_BASE}/api/representantes/empresa/${empresaId}?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      let message = 'Falha ao buscar representantes';
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
    const url = `${API_BASE}/api/representantes/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      if (res.status === 404) return null;
      let message = 'Falha ao buscar representante';
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
    const url = `${API_BASE}/api/representantes`;
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
        gerente: data.gerente || undefined,
        comissao: data.comissao ?? undefined,
        setor_id: data.setor_id ?? null,
        rotas_liberadas: data.rotas_liberadas || undefined,
        liberado_debito_credito: data.liberado_debito_credito ?? false,
        bloqueia_alteracao_agenda: data.bloqueia_alteracao_agenda ?? false,
        quantidade_maxima_pedidos_retidos_para_sincronizar: data.quantidade_maxima_pedidos_retidos_para_sincronizar ?? undefined,
        observacao: data.observacao || undefined,
        inativo: data.inativo ?? false,
      },
    };

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao criar representante';
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
    const url = `${API_BASE}/api/representantes/${id}?empresaId=${empresaId}`;
    const body = { data };

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Falha ao atualizar representante';
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
    const url = `${API_BASE}/api/representantes/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao excluir representante';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
  },

  // DELETE /api/clientes/:id/representantes/:representanteId?empresaId=5
  async removeClienteRepresentante(clienteId: number, representanteId: number | string): Promise<boolean> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/clientes/${encodeURIComponent(clienteId)}/representantes/${encodeURIComponent(representanteId)}?empresaId=${encodeURIComponent(empresaId)}`;
    const res = await apiClient.fetch(url, { method: 'DELETE', headers: { accept: 'application/json' } });
    if (res.status === 404) throw new Error('Cliente ou vínculo com representante não encontrado');
    if (!res.ok && res.status !== 204) {
      let message = 'Falha ao remover representante do cliente';
      try {
        const err = await res.json();
        message = err?.message || err?.error?.message || err?.error || message;
      } catch {}
      throw new Error(message);
    }
    return true;
  },

  // Legacy method for backward compatibility with existing components
  async find(query?: string, page = 1, limit = 100): Promise<Representative[]> {
    const result = await this.getAll(query, page, limit, false);
    return result.data.map((r) => ({
      id: String(r.representante_id),
      codigoRepresentante: r.codigo_representante,
      nome: r.nome_representante,
    }));
  },
};
