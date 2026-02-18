import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface Operacao {
  id: number | string;
  codigo: string;
  descricao: string;
  tipo?: string;
  tipoId?: string;
}

export interface Tabela {
  id: number | string;
  codigo?: string;
  descricao: string;
  prazoMedio?: number; // dias; 0 ou undefined = sem limite
  principal?: boolean;
}

export interface FormaPagamento {
  id: number | string;
  codigo?: string;
  descricao: string;
  somenteAvista?: boolean;
  boleto?: boolean;
  cartaoDebito?: boolean;
  cartaoCredito?: boolean;
  pix?: boolean;
  indiceFinanceiro?: number;
  taxaAdicional?: number;
  prazoPagtoId?: number | string | null;
  inativo?: boolean;
}

export interface PrazoPagto {
  id: number | string;
  codigo?: string;
  descricao: string;
  avista?: boolean;
  somenteCartao?: boolean;
  prazoNegociado?: boolean;
  formaPagtoId?: number | string | null;
  numeroParcelas?: number;
  prazosEmDias?: number[];
  pedidoMinimo?: number;
  prazoMedio?: number; // 0 = sem limite
  comissao?: number;
  inativo?: boolean;
}

export interface Rota {
  id: number;
  codigo_rota?: string;
  descricao_rota?: string;
  label: string;
  inativo?: boolean;
}

export interface Uf {
  uf: string;
  nome_uf: string;
  codigo_ibge: string | null;
  fuso: number;
}

export interface Cidade {
  cidade_id: number;
  codigo_cidade: string;
  nome_cidade: string;
  codigo_ibge: string | null;
  uf: string;
}

export interface SegmentoVenda {
  id: number | string;
  codigo?: string;
  descricao: string;
  inativo?: boolean;
}

export interface Rede {
  id: number | string;
  codigo?: string;
  descricao: string;
  cidade?: string;
  uf?: string;
  email?: string;
  inativo?: boolean;
}

function normalizeOperacao(raw: any): Operacao {
  const id = raw?.operacao_id ?? raw?.id ?? raw?.codigo ?? raw?.codigo_operacao ?? '';
  const codigo = raw?.codigo_operacao ?? raw?.codigo ?? String(id ?? '');
  const descricao =
    raw?.descricao_operacao ??
    raw?.descricao ??
    raw?.nome ??
    raw?.operacao ??
    '';
  const tipo = raw?.tipo ?? raw?.tipo_operacao ?? undefined;
  const tipoId = raw?.tipo_operacao_id ?? raw?.tipoId ?? undefined;

  return {
    id: typeof id === 'number' ? id : String(id ?? '').trim(),
    codigo: String(codigo ?? '').trim(),
    descricao: String(descricao ?? '').trim(),
    tipo: tipo ? String(tipo) : undefined,
    tipoId: tipoId ? String(tipoId) : undefined,
  };
}

export const metadataService = {
  getOperacoes: async (): Promise<Operacao[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      const url = `${API_BASE}/api/metadata/operacoes?${params.toString()}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
      };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar operações';
        try {
          const err = await res.json();
          message = err?.message || err?.error?.message || err?.error || message;
        } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      return arr.map(normalizeOperacao);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
  // Tabelas de preço para popular selects
  getTabelas: async (): Promise<Tabela[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    // Normaliza diferentes formatos de payload
    const normalizeTabela = (raw: any): Tabela => {
      if (raw == null) return { id: '', descricao: '' };
      if (typeof raw === 'string' || typeof raw === 'number') {
        const val = String(raw);
        return { id: val, descricao: val };
      }
      const id = raw?.tabela_preco_id ?? raw?.id ?? raw?.tabela_id ?? raw?.codigo ?? raw?.cod ?? '';
      const codigo = raw?.codigo_tabela_preco ?? raw?.codigoTabelaPreco ?? raw?.codigo ?? raw?.sigla ?? undefined;
      const desc =
        raw?.descricao_tabela_preco ??
        raw?.descricaoTabelaPreco ??
        raw?.descricao ??
        raw?.descricao_tabela ??
        raw?.descricaoTabela ??
        raw?.nome ??
        raw?.tabela ??
        '';
      return {
        id: typeof id === 'number' ? id : String(id || '').trim(),
        codigo: codigo ? String(codigo).trim() : undefined,
        descricao: String(desc || '').trim(),
        prazoMedio: Number(raw?.prazo_medio ?? 0) || 0,
        principal: Boolean(raw?.principal ?? false),
      };
    };

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      const url = `${API_BASE}/api/metadata/tabelas?${params.toString()}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
      };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar tabelas';
        try {
          const err = await res.json();
          message = err?.message || err?.error?.message || err?.error || message;
        } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      return arr.map(normalizeTabela).filter((t) => String(t.descricao || '').length > 0);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
  // Tabelas de preço por cliente
  getTabelasByCliente: async (clienteId: number): Promise<Tabela[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    // Normaliza payload específico do endpoint de cliente
    const normalizeTabelaCliente = (raw: any): Tabela => {
      if (!raw) return { id: '', descricao: '' };
      const id = raw?.tabela_preco_id ?? raw?.id ?? raw?.tabela_id ?? raw?.codigo ?? raw?.cod ?? '';
      const codigo = raw?.codigo_tabela_preco ?? raw?.codigoTabelaPreco ?? raw?.codigo ?? raw?.sigla ?? undefined;
      const desc =
        raw?.descricao_tabela_preco ??
        raw?.descricaoTabelaPreco ??
        raw?.descricao ??
        raw?.descricao_tabela ??
        raw?.descricaoTabela ??
        raw?.nome ??
        raw?.tabela ??
        '';
      return {
        id: typeof id === 'number' ? id : String(id || '').trim(),
        codigo: codigo ? String(codigo).trim() : undefined,
        descricao: String(desc || '').trim(),
        prazoMedio: Number(raw?.prazo_medio ?? 0) || 0,
        principal: Boolean(raw?.principal ?? false),
      };
    };

    try {
      const url = `${API_BASE}/api/clientes/${encodeURIComponent(clienteId)}/tabelas-precos?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
      };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar tabelas do cliente';
        try {
          const err = await res.json();
          message = err?.message || err?.error?.message || err?.error || message;
        } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      return arr.map(normalizeTabelaCliente).filter((t) => String(t.descricao || '').trim().length > 0);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Segmentos de vendas
  getSegmentosVendas: async (): Promise<SegmentoVenda[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    const normalize = (raw: any): SegmentoVenda => {
      if (!raw) return { id: '', descricao: '' };
      const id = raw?.segmento_id ?? raw?.id ?? raw?.codigo ?? '';
      const codigo = raw?.codigo_segmento ?? raw?.codigo ?? undefined;
      const descricao = raw?.descricao_segmento ?? raw?.descricao ?? raw?.nome ?? '';
      return {
        id: typeof id === 'number' ? id : String(id || '').trim(),
        codigo: codigo ? String(codigo).trim() : undefined,
        descricao: String(descricao || '').trim(),
        inativo: Boolean(raw?.inativo ?? false),
      };
    };

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      const url = `${API_BASE}/api/metadata/segmentos-vendas?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar segmentos de vendas';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      return arr.map(normalize).filter((s) => String(s.descricao || '').trim().length > 0 && !s.inativo);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Redes
  getRedes: async (): Promise<Rede[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    const normalize = (raw: any): Rede => {
      if (!raw) return { id: '', descricao: '' };
      const id = raw?.rede_id ?? raw?.id ?? raw?.codigo ?? '';
      const codigo = raw?.codigo_rede ?? raw?.codigo ?? undefined;
      const descricao = raw?.descricao_rede ?? raw?.descricao ?? raw?.nome ?? '';
      return {
        id: typeof id === 'number' ? id : String(id || '').trim(),
        codigo: codigo ? String(codigo).trim() : undefined,
        descricao: String(descricao || '').trim(),
        cidade: raw?.cidade ? String(raw.cidade).trim() : undefined,
        uf: raw?.uf ? String(raw.uf).trim() : undefined,
        email: raw?.email ? String(raw.email).trim() : undefined,
        inativo: Boolean(raw?.inativo ?? false),
      };
    };

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      const url = `${API_BASE}/api/metadata/redes?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar redes';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      return arr.map(normalize).filter((r) => String(r.descricao || '').trim().length > 0 && !r.inativo);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Formas de pagamento
  getFormasPagamento: async (): Promise<FormaPagamento[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    try {
      const url = `${API_BASE}/api/metadata/formas-pagamento?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
      };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar formas de pagamento';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const normalize = (raw: any): FormaPagamento => {
        const id = raw?.forma_pagto_id ?? raw?.id ?? raw?.codigo ?? raw?.codigo_formapagto ?? '';
        const codigo = raw?.codigo_formapagto ?? raw?.codigo ?? undefined;
        const descricao =
          raw?.descricao_forma_pagto ??
          raw?.descricao ??
          raw?.nome ??
          '';
        return {
          id: typeof id === 'number' ? id : String(id || '').trim(),
          codigo: codigo ? String(codigo).trim() : undefined,
          descricao: String(descricao || '').trim(),
          somenteAvista: Boolean(raw?.somente_avista ?? false),
          boleto: Boolean(raw?.boleto ?? false),
          cartaoDebito: Boolean(raw?.cartao_debito ?? false),
          cartaoCredito: Boolean(raw?.cartao_credito ?? false),
          pix: Boolean(raw?.pix ?? false),
          indiceFinanceiro: Number(raw?.indice_financeiro ?? 0) || 0,
          taxaAdicional: Number(raw?.taxa_adicional ?? 0) || 0,
          prazoPagtoId: raw?.prazo_pagto_id ?? null,
          inativo: Boolean(raw?.inativo ?? false),
        };
      };
      const mapped = arr.map(normalize).filter((f) => String(f.descricao || '').trim().length > 0 && !f.inativo);
      return mapped;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Prazos de pagamento
  getPrazos: async (): Promise<PrazoPagto[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    try {
      const url = `${API_BASE}/api/metadata/prazos?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
      };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar prazos';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const normalize = (raw: any): PrazoPagto => {
        const id = raw?.prazo_pagto_id ?? raw?.id ?? raw?.codigo ?? raw?.codigo_prazopagto ?? '';
        const codigo = raw?.codigo_prazopagto ?? raw?.codigo ?? undefined;
        const descricao = raw?.descricao_prazo_pagto ?? raw?.descricao ?? '';
        const pedidoMinimo = Number(raw?.pedido_minimo ?? 0) || 0;
        const comissao = Number(raw?.comissao ?? 0) || 0;
        const prazoMedio = Number(raw?.prazo_medio ?? 0) || 0;
        const dias = Array.isArray(raw?.prazos_em_dias) ? raw.prazos_em_dias.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n)) : undefined;
        return {
          id: typeof id === 'number' ? id : String(id || '').trim(),
          codigo: codigo ? String(codigo).trim() : undefined,
          descricao: String(descricao || '').trim(),
          avista: Boolean(raw?.avista ?? false),
          somenteCartao: Boolean(raw?.somente_cartao ?? false),
          prazoNegociado: Boolean(raw?.prazo_negociado ?? false),
          formaPagtoId: raw?.forma_pagto_id ?? null,
          numeroParcelas: Number(raw?.numero_de_parcelas ?? 0) || 0,
          prazosEmDias: dias,
          pedidoMinimo,
          prazoMedio,
          comissao,
          inativo: Boolean(raw?.inativo ?? false),
        };
      };
      const mapped = arr.map(normalize).filter((p) => String(p.descricao || '').trim().length > 0 && !p.inativo);
      return mapped;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
  // Tabelas de preço por produto
  getTabelasByProduto: async (produtoId: number): Promise<Tabela[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    const normalize = (raw: any): Tabela => {
      if (!raw) return { id: '', descricao: '' };
      const id = raw?.tabela_preco_id ?? raw?.id ?? raw?.tabela_id ?? raw?.codigo ?? raw?.cod ?? '';
      const codigo = raw?.codigo_tabela_preco ?? raw?.codigoTabelaPreco ?? raw?.codigo ?? raw?.sigla ?? undefined;
      const desc =
        raw?.descricao_tabela_preco ??
        raw?.descricaoTabelaPreco ??
        raw?.descricao ??
        raw?.descricao_tabela ??
        raw?.descricaoTabela ??
        raw?.nome ??
        raw?.tabela ??
        '';
      return {
        id: typeof id === 'number' ? id : String(id || '').trim(),
        codigo: codigo ? String(codigo).trim() : undefined,
        descricao: String(desc || '').trim(),
        prazoMedio: Number(raw?.prazo_medio ?? 0) || 0,
        principal: Boolean(raw?.principal ?? false),
      };
    };

    try {
      const url = `${API_BASE}/api/produtos/${encodeURIComponent(produtoId)}/tabelas-precos?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
      };
      const res = await apiClient.fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar tabelas do produto';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      return arr.map(normalize).filter((t) => String(t.descricao || '').trim().length > 0);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // UFs disponíveis - GET /api/ufs
  getUfs: async (): Promise<Uf[]> => {
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const url = `${API_BASE}/api/ufs`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, { method: 'GET', headers });

      if (!res.ok) {
        let message = 'Falha ao buscar UFs';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

      const normalize = (raw: any): Uf => ({
        uf: String(raw?.uf ?? '').trim(),
        nome_uf: String(raw?.nome_uf ?? '').trim(),
        codigo_ibge: raw?.codigo_ibge ?? null,
        fuso: Number(raw?.fuso ?? -3),
      });

      return arr.map(normalize).filter((u) => u.uf.length === 2);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Cidades por UF - GET /api/cidades-por-uf?empresaId=...&uf=...&q=...
  getCidadesPorUf: async (uf: string, query?: string): Promise<Cidade[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      params.set('uf', uf);
      if (query) params.set('q', query);

      const url = `${API_BASE}/api/cidades-por-uf?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, { method: 'GET', headers });

      if (!res.ok) {
        let message = 'Falha ao buscar cidades';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

      const normalize = (raw: any): Cidade => ({
        cidade_id: Number(raw?.cidade_id ?? 0),
        codigo_cidade: String(raw?.codigo_cidade ?? '').trim(),
        nome_cidade: String(raw?.nome_cidade ?? '').trim(),
        codigo_ibge: raw?.codigo_ibge ?? null,
        uf: String(raw?.uf ?? '').trim(),
      });

      return arr.map(normalize).filter((c) => c.nome_cidade.length > 0);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Rotas disponíveis - GET /api/rotas?empresaId=...
  getRotas: async (query?: string, incluirInativos = false): Promise<Rota[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      if (query) params.set('q', query);
      if (incluirInativos) params.set('incluirInativos', 'true');

      const url = `${API_BASE}/api/rotas?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, { method: 'GET', headers });

      if (!res.ok) {
        let message = 'Falha ao buscar rotas';
        try { const err = await res.json(); message = err?.message || err?.error?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

      const normalize = (raw: any): Rota => ({
        id: Number(raw?.id ?? raw?.rota_id ?? 0),
        codigo_rota: raw?.codigo_rota ?? undefined,
        descricao_rota: raw?.descricao_rota ?? undefined,
        label: String(raw?.label ?? raw?.descricao_rota ?? '').trim(),
        inativo: Boolean(raw?.inativo ?? false),
      });

      return arr.map(normalize).filter((r) => r.label.length > 0);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
};
