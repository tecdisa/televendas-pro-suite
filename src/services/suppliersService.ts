import { apiClient } from '@/utils/apiClient';
import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { normalizeCnpjCpf } from '@/utils/cnpjCpf';

export interface Fornecedor {
  empresa_id?: number;
  fornecedor_id: number;
  cnpj_cpf?: string;
  codigo_fornecedor?: string;
  nome_fornecedor: string;
  fantasia?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade_id?: number;
  uf?: string;
  cep?: string;
  fone?: string;
  contato?: string;
  email?: string;
  whatsapp?: string;
  site?: string;
  empresas_autorizadas?: string;
  obs?: string;
  inativo?: boolean;
  revenda?: boolean;
  cadastra_produtos?: boolean;
}

export interface FornecedorResponse {
  data: Fornecedor[];
  page: number;
  limit: number;
  total: number;
}

function normalizeFornecedor(raw: any): Fornecedor {
  return {
    empresa_id: raw?.empresa_id ?? undefined,
    fornecedor_id: raw?.fornecedor_id ?? raw?.id ?? 0,
    cnpj_cpf: raw?.cnpj_cpf?.trim() ?? undefined,
    codigo_fornecedor: raw?.codigo_fornecedor?.trim() ?? undefined,
    nome_fornecedor: raw?.nome_fornecedor?.trim() ?? '',
    fantasia: raw?.fantasia?.trim() ?? undefined,
    endereco: raw?.endereco?.trim() ?? undefined,
    numero: raw?.numero?.trim() ?? undefined,
    complemento: raw?.complemento?.trim() ?? undefined,
    bairro: raw?.bairro?.trim() ?? undefined,
    cidade_id: raw?.cidade_id ?? undefined,
    uf: raw?.uf?.trim() ?? undefined,
    cep: raw?.cep?.trim() ?? undefined,
    fone: raw?.fone ?? raw?.telefone ?? undefined,
    contato: raw?.contato?.trim() ?? undefined,
    email: raw?.email?.trim() ?? undefined,
    whatsapp: raw?.whatsapp?.trim() ?? undefined,
    site: raw?.site?.trim() ?? undefined,
    empresas_autorizadas: raw?.empresas_autorizadas ?? undefined,
    obs: raw?.obs?.trim() ?? undefined,
    inativo: Boolean(raw?.inativo ?? false),
    revenda: Boolean(raw?.revenda ?? false),
    cadastra_produtos: Boolean(raw?.cadastra_produtos ?? raw?.cadastraProdutos ?? false),
  };
}

export const suppliersService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    status: 'ativos' | 'inativos' | 'todos' = 'ativos',
    revenda?: boolean,
    empresaIdOverride?: number,
  ): Promise<{ data: Fornecedor[]; total: number }> {
    const empresa = authService.getEmpresa();
    const empresaId = empresaIdOverride ?? empresa?.empresa_id;

    if (!empresaId) {
      console.warn('suppliersService.getAll: empresaId não encontrado');
      return { data: [], total: 0 };
    }

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('status', status);
    if (status === 'todos') params.set('incluirInativos', 'true');
    if (revenda === true) params.set('revenda', 'true');
    if (query?.trim()) params.set('q', query.trim());

    try {
      const response = await apiClient.fetch(`${API_BASE}/api/fornecedores?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json() as FornecedorResponse;
      const arr = result?.data && Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
      return {
        data: (arr as any[]).map(normalizeFornecedor),
        total: result?.total ?? arr.length,
      };
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      return { data: [], total: 0 };
    }
  },

  async getById(id: number): Promise<Fornecedor | null> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) return null;

    try {
      const response = await apiClient.fetch(`${API_BASE}/api/fornecedores/${id}?empresaId=${empresaId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return normalizeFornecedor(result);
    } catch (error) {
      console.error('Erro ao buscar fornecedor:', error);
      return null;
    }
  },

  async findByCnpjCpf(cnpjCpf: string): Promise<Fornecedor | undefined> {
    const cleaned = normalizeCnpjCpf(cnpjCpf);
    if (!cleaned) return undefined;

    const { data } = await this.getAll(cleaned, 1, 10, 'todos');
    return data.find(
      (fornecedor) =>
        normalizeCnpjCpf(fornecedor.cnpj_cpf) === cleaned,
    );
  },

  async create(data: {
    cnpj_cpf: string;
    nome_fornecedor: string;
    fantasia?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade_id?: number | null;
    uf?: string;
    cep?: string;
    fone?: string;
    contato?: string;
    email?: string;
    whatsapp?: string;
    site?: string;
    empresas_autorizadas?: string;
    obs?: string;
    inativo?: boolean;
    revenda?: boolean;
    cadastra_produtos?: boolean;
  }): Promise<Fornecedor> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/fornecedores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId, data }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao criar fornecedor');
    }
    return normalizeFornecedor(await response.json());
  },

  async update(id: number, data: Partial<Fornecedor>): Promise<Fornecedor> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/fornecedores/${id}?empresaId=${empresaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao atualizar fornecedor');
    }
    return normalizeFornecedor(await response.json());
  },

  async delete(id: number): Promise<void> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    if (!empresaId) throw new Error('Empresa não selecionada');

    const response = await apiClient.fetch(`${API_BASE}/api/fornecedores/${id}?empresaId=${empresaId}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || err?.error || 'Erro ao excluir fornecedor');
    }
  },

  async getByEmpresa(empresaId: number, query?: string, page = 1, limit = 100): Promise<Fornecedor[]> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (query?.trim()) params.set('q', query.trim());

    try {
      const response = await apiClient.fetch(`${API_BASE}/api/fornecedores/empresa/${empresaId}?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json() as FornecedorResponse;
      if (result?.data && Array.isArray(result.data)) return result.data.map(normalizeFornecedor);
      if (Array.isArray(result)) return (result as any[]).map(normalizeFornecedor);
      return [];
    } catch (error) {
      console.error('Erro ao buscar fornecedores por empresa:', error);
      return [];
    }
  },
};
