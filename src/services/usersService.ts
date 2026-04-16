import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface UsuarioCadastro {
  usuario_id: number;
  usuario: string;
  nome: string;
  email?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade_id?: number | null;
  uf?: string | null;
  cep?: string | null;
  cnpj_cpf?: string | null;
  fantasia?: string | null;
  fone?: string | null;
  whatsapp?: string | null;
  ativo?: boolean;
  admin?: boolean;
  admin_master?: boolean;
  forca_de_vendas?: boolean;
  empresa_master_id?: number | null;
  empresa_ids?: number[];
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface UsuarioCadastroFormData {
  usuario_id?: number;
  usuario: string;
  nome: string;
  senha?: string;
  senha_atual?: string;
  senhaAtual?: string;
  email?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade_id?: number | null;
  uf?: string | null;
  cep?: string | null;
  cnpj_cpf?: string | null;
  fantasia?: string | null;
  fone?: string | null;
  whatsapp?: string | null;
  ativo?: boolean;
  admin?: boolean;
  admin_master?: boolean;
  forca_de_vendas?: boolean;
  empresa_master_id?: number | null;
  empresa_ids?: number[];
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface UsuarioPermissao {
  funcao_sistema_id: number;
  funcao: string;
  obs?: string | null;
  can_select: boolean;
  can_insert: boolean;
  can_update: boolean;
  can_delete: boolean;
  personalizado?: boolean;
}

export interface UsuarioCreateResult {
  usuario: UsuarioCadastro;
  email_delivery?: {
    status?: 'sent' | 'skipped' | 'failed';
    reason?: string;
    message?: string;
    messageId?: string;
  };
}

export interface UsuarioInviteLoginResult {
  status: 'linked_existing' | 'invited_to_register';
  empresa_id: number;
  email?: string;
  usuario?: {
    usuario_id: number;
    usuario: string;
    nome: string;
    email?: string | null;
  };
  link_created?: boolean;
  link_reactivated?: boolean;
  email_delivery?: {
    status?: 'sent' | 'skipped' | 'failed';
    reason?: string;
    message?: string;
    messageId?: string;
  };
}

function toBoolean(value: any, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 't', 'on', 'yes', 'y', 'sim', 's'].includes(normalized);
}

function toNumberArray(value: any): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
}

function toNullableText(value: any): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function onlyDigits(value: any): string | null {
  if (value === undefined || value === null || value === '') return null;
  const digits = String(value).replace(/\D+/g, '');
  return digits.length ? digits : null;
}

function toNullableNumber(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUsuario(raw: any): UsuarioCadastro {
  return {
    usuario_id: Number(raw?.usuario_id ?? raw?.id ?? 0),
    usuario: String(raw?.usuario ?? '').trim(),
    nome: String(raw?.nome ?? '').trim(),
    email: raw?.email != null ? String(raw.email).trim() : null,
    endereco: toNullableText(raw?.endereco),
    numero: toNullableText(raw?.numero),
    complemento: toNullableText(raw?.complemento),
    bairro: toNullableText(raw?.bairro),
    cidade_id: toNullableNumber(raw?.cidade_id ?? raw?.cidadeId),
    uf: toNullableText(raw?.uf),
    cep: onlyDigits(raw?.cep),
    cnpj_cpf: onlyDigits(raw?.cnpj_cpf ?? raw?.cnpjCpf),
    fantasia: toNullableText(raw?.fantasia),
    fone: onlyDigits(raw?.fone),
    whatsapp: onlyDigits(raw?.whatsapp),
    ativo: toBoolean(raw?.ativo, true),
    admin: toBoolean(raw?.admin, false),
    admin_master: toBoolean(raw?.admin_master, false),
    forca_de_vendas: toBoolean(
      raw?.forca_de_vendas ?? raw?.forcaDeVendas,
      false,
    ),
    empresa_master_id:
      raw?.empresa_master_id != null ? Number(raw.empresa_master_id) : null,
    empresa_ids: toNumberArray(raw?.empresa_ids ?? raw?.empresas ?? []),
    criado_em: raw?.criado_em ? String(raw.criado_em) : null,
    atualizado_em: raw?.atualizado_em ? String(raw.atualizado_em) : null,
  };
}

function normalizePermissao(raw: any): UsuarioPermissao {
  return {
    funcao_sistema_id: Number(raw?.funcao_sistema_id ?? 0),
    funcao: String(raw?.funcao ?? '').trim(),
    obs: toNullableText(raw?.obs),
    can_select: toBoolean(raw?.can_select ?? raw?.select, false),
    can_insert: toBoolean(raw?.can_insert ?? raw?.insert, false),
    can_update: toBoolean(raw?.can_update ?? raw?.update, false),
    can_delete: toBoolean(raw?.can_delete ?? raw?.delete, false),
    personalizado: toBoolean(raw?.personalizado, false),
  };
}

function toErrorMessage(errorBody: any, fallback: string): string {
  if (!errorBody) return fallback;
  if (typeof errorBody?.message === 'string' && errorBody.message.trim()) {
    return errorBody.message;
  }
  if (
    typeof errorBody?.error?.message === 'string' &&
    errorBody.error.message.trim()
  ) {
    return errorBody.error.message;
  }
  if (typeof errorBody?.error === 'string' && errorBody.error.trim()) {
    return errorBody.error;
  }
  return fallback;
}

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const err = await response.json();
    return toErrorMessage(err, fallback);
  } catch {
    return fallback;
  }
}

async function getEmpresaId(): Promise<number> {
  const empresa = authService.getEmpresa();
  if (!empresa?.empresa_id) throw new Error('Empresa nao selecionada');
  return empresa.empresa_id;
}

export const usersService = {
  async getByEmpresa(
    empresaId: number,
    options?: {
      query?: string;
      page?: number;
      limit?: number;
      status?: 'ativos' | 'inativos' | 'todos';
      onlyForcaDeVendas?: boolean;
    },
  ): Promise<{ data: UsuarioCadastro[]; page: number; limit: number; total: number }> {
    if (!empresaId) {
      return { data: [], page: 1, limit: options?.limit ?? 100, total: 0 };
    }

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 100;
    const status = options?.status ?? 'ativos';
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('status', status);
    if (options?.query?.trim()) params.set('q', options.query.trim());
    if (status === 'todos') params.set('incluirInativos', 'true');
    if (options?.onlyForcaDeVendas) params.set('forcaDeVendas', 'true');

    const url = `${API_BASE}/api/usuarios/empresa/${empresaId}?${params.toString()}`;
    const res = await apiClient.fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Falha ao buscar usuarios'));
    }

    const json = await res.json();
    const arr = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : [];
    return {
      data: arr.map(normalizeUsuario),
      page: Number(json?.page ?? page),
      limit: Number(json?.limit ?? limit),
      total: Number(json?.total ?? arr.length),
    };
  },

  async getAll(
    query?: string,
    page = 1,
    limit = 100,
    status: 'ativos' | 'inativos' | 'todos' = 'ativos',
  ): Promise<{ data: UsuarioCadastro[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();
    return this.getByEmpresa(empresaId, { query, page, limit, status });
  },

  async getById(id: number): Promise<UsuarioCadastro | null> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/usuarios/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(await parseErrorMessage(res, 'Falha ao buscar usuario'));
    }

    return normalizeUsuario(await res.json());
  },

  async getMyProfile(): Promise<UsuarioCadastro> {
    const res = await apiClient.fetch(`${API_BASE}/api/usuarios/me/perfil`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Falha ao buscar perfil'));
    }

    return normalizeUsuario(await res.json());
  },

  async create(data: UsuarioCadastroFormData): Promise<UsuarioCreateResult> {
    const empresaId = await getEmpresaId();
    const empresaIds =
      data.empresa_ids && data.empresa_ids.length > 0
        ? toNumberArray(data.empresa_ids)
        : [empresaId];
    const payload = {
      empresaId,
      data: {
        usuario: data.usuario,
        nome: data.nome,
        email: toNullableText(data.email) || undefined,
        endereco: toNullableText(data.endereco) || undefined,
        numero: toNullableText(data.numero) || undefined,
        complemento: toNullableText(data.complemento) || undefined,
        bairro: toNullableText(data.bairro) || undefined,
        cidade_id: toNullableNumber(data.cidade_id),
        uf: toNullableText(data.uf)?.toUpperCase() || undefined,
        cep: onlyDigits(data.cep) || undefined,
        cnpj_cpf: onlyDigits(data.cnpj_cpf) || undefined,
        fantasia: toNullableText(data.fantasia) || undefined,
        fone: onlyDigits(data.fone) || undefined,
        whatsapp: onlyDigits(data.whatsapp) || undefined,
        ativo: data.ativo ?? true,
        admin: data.admin ?? false,
        forca_de_vendas: data.forca_de_vendas ?? false,
        empresa_master_id: data.empresa_master_id ?? empresaIds[0] ?? empresaId,
        empresaIds,
      },
    };

    const res = await apiClient.fetch(`${API_BASE}/api/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Falha ao criar usuario'));
    }

    const json = await res.json();
    return {
      usuario: normalizeUsuario(json?.usuario ?? json),
      email_delivery: json?.email_delivery,
    };
  },

  async inviteLogin(input: {
    email: string;
    registerUrl?: string;
  }): Promise<UsuarioInviteLoginResult> {
    const payload = {
      data: {
        email: String(input.email || '').trim().toLowerCase(),
        registerUrl:
          typeof input.registerUrl === 'string' && input.registerUrl.trim()
            ? input.registerUrl.trim()
            : undefined,
      },
    };

    const res = await apiClient.fetch(`${API_BASE}/api/usuarios/invite-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        await parseErrorMessage(res, 'Falha ao enviar convite de login'),
      );
    }

    return (await res.json()) as UsuarioInviteLoginResult;
  },

  async update(
    id: number,
    data: Partial<UsuarioCadastroFormData>,
  ): Promise<UsuarioCadastro> {
    const payloadData: Record<string, any> = {};

    if (data.usuario !== undefined) payloadData.usuario = data.usuario;
    if (data.nome !== undefined) payloadData.nome = data.nome;
    if (data.email !== undefined) payloadData.email = toNullableText(data.email);
    if (data.endereco !== undefined) payloadData.endereco = toNullableText(data.endereco);
    if (data.numero !== undefined) payloadData.numero = toNullableText(data.numero);
    if (data.complemento !== undefined) payloadData.complemento = toNullableText(data.complemento);
    if (data.bairro !== undefined) payloadData.bairro = toNullableText(data.bairro);
    if (data.cidade_id !== undefined) payloadData.cidade_id = toNullableNumber(data.cidade_id);
    if (data.uf !== undefined) payloadData.uf = toNullableText(data.uf)?.toUpperCase() ?? null;
    if (data.cep !== undefined) payloadData.cep = onlyDigits(data.cep);
    if (data.cnpj_cpf !== undefined) payloadData.cnpj_cpf = onlyDigits(data.cnpj_cpf);
    if (data.fantasia !== undefined) payloadData.fantasia = toNullableText(data.fantasia);
    if (data.fone !== undefined) payloadData.fone = onlyDigits(data.fone);
    if (data.whatsapp !== undefined) payloadData.whatsapp = onlyDigits(data.whatsapp);
    if (data.senha !== undefined && data.senha.trim()) {
      payloadData.senha = data.senha.trim();
    }
    if (data.ativo !== undefined) payloadData.ativo = data.ativo;
    if (data.admin !== undefined) payloadData.admin = data.admin;
    if (data.forca_de_vendas !== undefined) {
      payloadData.forca_de_vendas = data.forca_de_vendas;
    }
    if (data.empresa_master_id !== undefined) {
      payloadData.empresa_master_id = data.empresa_master_id;
    }
    if (data.empresa_ids !== undefined) {
      payloadData.empresaIds = toNumberArray(data.empresa_ids);
    }

    const res = await apiClient.fetch(`${API_BASE}/api/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ data: payloadData }),
    });

    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Falha ao atualizar usuario'));
    }

    return normalizeUsuario(await res.json());
  },

  async updateMyProfile(
    data: Partial<UsuarioCadastroFormData>,
  ): Promise<UsuarioCadastro> {
    const payloadData: Record<string, any> = {};

    if (data.usuario !== undefined) payloadData.usuario = data.usuario;
    if (data.nome !== undefined) payloadData.nome = data.nome;
    if (data.email !== undefined) payloadData.email = toNullableText(data.email);
    if (data.endereco !== undefined) payloadData.endereco = toNullableText(data.endereco);
    if (data.numero !== undefined) payloadData.numero = toNullableText(data.numero);
    if (data.complemento !== undefined) payloadData.complemento = toNullableText(data.complemento);
    if (data.bairro !== undefined) payloadData.bairro = toNullableText(data.bairro);
    if (data.cidade_id !== undefined) payloadData.cidade_id = toNullableNumber(data.cidade_id);
    if (data.uf !== undefined) payloadData.uf = toNullableText(data.uf)?.toUpperCase() ?? null;
    if (data.cep !== undefined) payloadData.cep = onlyDigits(data.cep);
    if (data.cnpj_cpf !== undefined) payloadData.cnpj_cpf = onlyDigits(data.cnpj_cpf);
    if (data.fantasia !== undefined) payloadData.fantasia = toNullableText(data.fantasia);
    if (data.fone !== undefined) payloadData.fone = onlyDigits(data.fone);
    if (data.whatsapp !== undefined) payloadData.whatsapp = onlyDigits(data.whatsapp);
    if (data.senha_atual !== undefined || data.senhaAtual !== undefined) {
      payloadData.senha_atual = toNullableText(data.senha_atual ?? data.senhaAtual);
    }
    if (data.senha !== undefined && data.senha.trim()) {
      payloadData.senha = data.senha.trim();
    }

    const res = await apiClient.fetch(`${API_BASE}/api/usuarios/me/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ data: payloadData }),
    });

    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Falha ao atualizar perfil'));
    }

    return normalizeUsuario(await res.json());
  },

  async delete(id: number): Promise<void> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/usuarios/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      throw new Error(await parseErrorMessage(res, 'Falha ao excluir usuario'));
    }
  },

  async getPermissions(id: number): Promise<UsuarioPermissao[]> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/usuarios/${id}/permissoes?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(
        await parseErrorMessage(res, 'Falha ao buscar permissoes do usuario'),
      );
    }

    const json = await res.json();
    const arr = Array.isArray(json?.permissoes) ? json.permissoes : [];
    return arr.map(normalizePermissao);
  },

  async getMyPermissions(): Promise<UsuarioPermissao[]> {
    const res = await apiClient.fetch(`${API_BASE}/api/usuarios/me/permissoes`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(
        await parseErrorMessage(res, 'Falha ao buscar permissoes do usuario logado'),
      );
    }

    const json = await res.json();
    const arr = Array.isArray(json?.permissoes) ? json.permissoes : [];
    return arr.map(normalizePermissao);
  },

  async updatePermissions(
    id: number,
    permissoes: Array<{
      funcao_sistema_id: number;
      can_select: boolean;
      can_insert: boolean;
      can_update: boolean;
      can_delete: boolean;
    }>,
  ): Promise<UsuarioPermissao[]> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/usuarios/${id}/permissoes?empresaId=${empresaId}`;
    const payload = {
      data: {
        replaceAll: true,
        permissoes: permissoes.map((item) => ({
          funcao_sistema_id: Number(item.funcao_sistema_id),
          can_select: Boolean(item.can_select),
          can_insert: Boolean(item.can_insert),
          can_update: Boolean(item.can_update),
          can_delete: Boolean(item.can_delete),
        })),
      },
    };

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        await parseErrorMessage(res, 'Falha ao atualizar permissoes do usuario'),
      );
    }

    const json = await res.json();
    const arr = Array.isArray(json?.permissoes) ? json.permissoes : [];
    return arr.map(normalizePermissao);
  },
};
