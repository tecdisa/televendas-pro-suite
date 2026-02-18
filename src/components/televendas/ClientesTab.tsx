import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Plus, Pencil, Trash2, Info, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { clientsService, Client } from '@/services/clientsService';
import { metadataService, Rota, Tabela, Uf, Cidade, SegmentoVenda, Rede, PrazoPagto } from '@/services/metadataService';
import { representativesService, Representative } from '@/services/representativesService';
import { operacoes } from '@/mocks/data';
import { ClientInfoModal } from './ClientInfoModal';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const debounce = <T extends (...args: any[]) => void>(fn: T, wait = 300) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();
const toUpperTrimValue = (value: string | number | null | undefined) => String(value ?? '').trim().toUpperCase();
const formatPhone = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
};
const normalizePhoneDigits = (value: string | number | null | undefined) =>
  String(value ?? '').replace(/\D+/g, '').slice(0, 11);
const formatCpf = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};
const formatRg = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 9);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}-${digits.slice(8)}`;
};
const formatCep = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};
const handleUpperChange = (e: ChangeEvent<HTMLInputElement>) => {
  e.currentTarget.value = toUpperValue(e.currentTarget.value);
};
const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
  e.currentTarget.value = formatPhone(e.currentTarget.value);
};
const handleCpfChange = (e: ChangeEvent<HTMLInputElement>) => {
  e.currentTarget.value = formatCpf(e.currentTarget.value);
};
const handleCepChange = (e: ChangeEvent<HTMLInputElement>) => {
  e.currentTarget.value = formatCep(e.currentTarget.value);
};
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value: string) => emailRegex.test(value.trim());
const getTabelaLabel = (tabela: Tabela) => (tabela.codigo ? `${tabela.codigo} - ${tabela.descricao}` : tabela.descricao);
const summarizeSelection = (items: string[], emptyLabel = 'Selecione...') => {
  const filtered = Array.from(new Set(items.filter(Boolean)));
  if (filtered.length === 0) return emptyLabel;
  if (filtered.length <= 2) return filtered.join(', ');
  return `${filtered.slice(0, 2).join(', ')} +${filtered.length - 2}`;
};
const normalizeCityKey = (value: string | null | undefined) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
const normalizeTabelaIds = (value: any, fallback?: any) => {
  const ids: number[] = [];
  const pushId = (id: any) => {
    const num = Number(id);
    if (Number.isFinite(num) && num > 0) ids.push(num);
  };
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item) return;
      if (typeof item === 'object') {
        pushId(
          item.id ??
            item.tabela_preco_id ??
            item.tabela_id ??
            item.tabelaId ??
            item.codigo ??
            item.cod
        );
        return;
      }
      pushId(item);
    });
  } else if (value && typeof value === 'object') {
    pushId(
      value.id ??
        value.tabela_preco_id ??
        value.tabela_id ??
        value.tabelaId ??
        value.codigo ??
        value.cod
    );
  } else if (value != null) {
    pushId(value);
  }
  if (!ids.length && fallback != null) pushId(fallback);
  return Array.from(new Set(ids));
};
const normalizeRepresentantes = (value: any, fallbackId?: any, fallbackNome?: any) => {
  const reps: Array<{ id: string; nome: string }> = [];
  const pushRep = (id: any, nome?: any) => {
    const idStr = String(id ?? '').trim();
    if (!idStr) return;
    if (reps.some((rep) => rep.id === idStr)) return;
    reps.push({ id: idStr, nome: toUpperValue(nome ?? '') });
  };
  if (Array.isArray(value)) {
    value.forEach((rep) => {
      if (!rep) return;
      if (typeof rep === 'object') {
        pushRep(
          rep.codigoRepresentante ??
            rep.codigo_representante ??
            rep.codigo ??
            rep.cod ??
            rep.matricula ??
            rep.id,
          rep.nome ?? rep.representante_nome ?? rep.representanteNome
        );
        return;
      }
      pushRep(rep);
    });
  } else if (value && typeof value === 'object') {
    pushRep(
      value.codigoRepresentante ??
        value.codigo_representante ??
        value.codigo ??
        value.cod ??
        value.matricula ??
        value.id ??
        value.representante_id ??
        value.representanteId,
      value.nome ?? value.representante_nome ?? value.representanteNome
    );
  }
  if (!reps.length && fallbackId != null) {
    pushRep(fallbackId, fallbackNome);
  }
  return reps;
};

const FormField = ({ label, value, onChange, type = 'text', className = '', upperCase = true }: { 
  label: string; 
  value?: string | number; 
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  upperCase?: boolean;
}) => (
  <div className={className}>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    <Input 
      type={type}
      value={value ?? ''} 
      onChange={(e) => onChange(upperCase ? toUpperValue(e.target.value) : e.target.value)}
      className="h-8 text-sm" 
    />
  </div>
);

export const ClientesTab = () => {
  const CLIENT_LIMIT = 100;
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsHasMore, setClientsHasMore] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const clientsRequestId = useRef(0);
  const [filters, setFilters] = useState({
    search: '',
    uf: 'all',
    cidade: 'all',
    bairro: '',
    todos: false
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOperacao, setSelectedOperacao] = useState('');

  // CRUD dialogs & state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [clientInfoOpen, setClientInfoOpen] = useState(false);
  const [clientInfoId, setClientInfoId] = useState<number | null>(null);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotasLoading, setRotasLoading] = useState(false);
  const [segmentos, setSegmentos] = useState<SegmentoVenda[]>([]);
  const [segmentosLoading, setSegmentosLoading] = useState(false);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [redesLoading, setRedesLoading] = useState(false);
  const [prazos, setPrazos] = useState<PrazoPagto[]>([]);
  const [prazosLoading, setPrazosLoading] = useState(false);
  const [prazosError, setPrazosError] = useState<string | null>(null);

  // Representantes
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [repSearchOpen, setRepSearchOpen] = useState(false);
  const [repSearch, setRepSearch] = useState('');
  const [loadingReps, setLoadingReps] = useState(false);
  const [repsError, setRepsError] = useState<string | null>(null);
  const [repPage, setRepPage] = useState(1);
  const [repHasMore, setRepHasMore] = useState(true);

  // Tabelas de preço
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [tabelasLoading, setTabelasLoading] = useState(false);
  const [tabelaSearchOpen, setTabelaSearchOpen] = useState(false);
  const [tabelaSearch, setTabelaSearch] = useState('');

  // UFs e Cidades
  const [ufsApi, setUfsApi] = useState<Uf[]>([]);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [cidadesApi, setCidadesApi] = useState<Cidade[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);
  const [complementarUf, setComplementarUf] = useState('');
  const [complementarCidadeId, setComplementarCidadeId] = useState(0);
  const [, setComplementarCidade] = useState('');
  const [cidadesComplementares, setCidadesComplementares] = useState<Cidade[]>([]);
  const [cidadesComplementaresLoading, setCidadesComplementaresLoading] = useState(false);
  const [cobrancaUf, setCobrancaUf] = useState('');
  const [cobrancaCidadeId, setCobrancaCidadeId] = useState(0);
  const [, setCobrancaCidade] = useState('');
  const [cidadesCobranca, setCidadesCobranca] = useState<Cidade[]>([]);
  const [cidadesCobrancaLoading, setCidadesCobrancaLoading] = useState(false);

  // UFs e Cidades para filtros
  const [filterUfs, setFilterUfs] = useState<Uf[]>([]);
  const [filterUfsLoading, setFilterUfsLoading] = useState(false);
  const [filterCidades, setFilterCidades] = useState<Cidade[]>([]);
  const [filterCidadesLoading, setFilterCidadesLoading] = useState(false);

  const onTabelaDialogChange = (open: boolean) => {
    setTabelaSearchOpen(open);
    if (!open) setTabelaSearch('');
  };

  const [formData, setFormData] = useState({
    // Identificação
    codigoCliente: '',
    inativo: false,
    cnpjCpf: '',
    inscEstadual: '',
    inscMunicipal: '',
    rg: '',
    nome: '',
    fantasia: '',
    endereco: '',
    numero: '',
    bairro: '',
    uf: '',
    cidade: '',
    cidadeId: 0,
    cep: '',
    complemento: '',
    telefone: '',
    fax: '',
    whatsapp: '',
    email: '',
    emailDanfe: '',
    site: '',
    rota: '',
    rotaId: 0,
    b2bLiberado: false,
    b2bSenha: '',
    b2bTabelaId: 0,
    // Comercial
    contato1Nome: '',
    contato1Celular: '',
    contato1Aniversario: '',
    contato2Nome: '',
    contato2Celular: '',
    contato2Aniversario: '',
    segmentoId: 1,
    checkouts: 0,
    redeId: 0,
    tabelaIds: [] as number[],
    representantes: [] as Array<{ id: string; nome: string }>,
    descontoFinanceiroBoleto: 0,
    observacaoComercial: '',
    // Financeiro
    credito: 0,
    boleto: false,
    prazo: '',
    limite: 0,
    aberto: 0,
    disponivel: 0,
    observacaoFinanceiro: '',
    formaPagtoId: 1,
    prazoPagtoId: 1,
  });

  const cnpjLookupRef = useRef<(v: string) => void>();
  if (!cnpjLookupRef.current) {
    cnpjLookupRef.current = debounce(async (value: string) => {
      const cleaned = normalizeCnpj(value);
      if (cleaned.length !== 14) {
        setCnpjLookupLoading(false);
        return;
      }
      setCnpjLookupLoading(true);
      try {
        const result = await clientsService.lookupCnpj(cleaned);
        if (!result || !result.data) return;
        const d = result.data;
        const estab = d.estabelecimento ?? {};
        const cidadeObj = estab.cidade ?? {};
        const estadoObj = estab.estado ?? {};
        const tipoLogradouro = estab.tipo_logradouro ? String(estab.tipo_logradouro).trim() : '';
        const logradouro = estab.logradouro ? String(estab.logradouro).trim() : '';
        const cepFromCnpj = estab.cep ?? d.cep;
        const cepValue = cepFromCnpj ? normalizeCep(String(cepFromCnpj)) : '';
        const hasCep = cepValue.length === 8;
        setFormData((prevState) => {
          const prev = prevState;
          const enderecoFmt = [tipoLogradouro, logradouro].filter(Boolean).join(' ') || d.logradouro || prev.endereco;
          const complemento = estab.complemento ? String(estab.complemento).trim() : prev.complemento;
          const telefone1 = estab.telefone1 ? String(estab.telefone1).trim() : '';
          const ddd1 = estab.ddd1 ? String(estab.ddd1).trim() : '';
          const telefoneFmt = [ddd1, telefone1].filter(Boolean).join('');
          const faxFmt = estab.fax ? String(estab.fax).trim() : prev.fax;
          const nextCep = cepValue || normalizeCep(String(prev.cep));
          return {
            ...prev,
            cnpjCpf: cleaned,
            nome: toUpperValue(d.razao_social || prev.nome),
            fantasia: toUpperValue(d.nome_fantasia || estab.nome_fantasia || prev.fantasia),
            endereco: toUpperValue(enderecoFmt || d.logradouro || prev.endereco),
            numero: toUpperValue(estab.numero || d.numero || prev.numero || ''),
            bairro: toUpperValue(estab.bairro || d.bairro || prev.bairro),
            cidade: toUpperValue(cidadeObj.nome || estab.municipio || d.municipio || prev.cidade),
            uf: toUpperValue(estadoObj.sigla || estab.uf || d.uf || prev.uf),
            cep: formatCep(nextCep),
            complemento: toUpperValue(complemento),
            telefone: formatPhone(telefoneFmt || prev.telefone),
            fax: formatPhone(faxFmt),
            email: estab.email || prev.email,
            cidadeId: cidadeObj.id ?? 0,
          };
        });
        if (hasCep) {
          cepLookupRef.current?.(cepValue);
        }
        toast.success('Dados preenchidos pela consulta de CNPJ');
      } catch (e: any) {
        toast.error(String(e));
      } finally {
        setCnpjLookupLoading(false);
      }
    }, 600);
  }

  const cepLookupRef = useRef<(v: string) => void>();
  if (!cepLookupRef.current) {
    cepLookupRef.current = debounce(async (value: string) => {
      const cleaned = normalizeCep(value);
      if (cleaned.length !== 8) {
        setCepLookupLoading(false);
        return;
      }
      setCepLookupLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        if (!res.ok) {
          toast.error('Falha ao consultar CEP');
          return;
        }
        const data = await res.json();
        if (!data || data.erro) {
          toast.error('CEP nao encontrado');
          return;
        }
        setFormData((prev) => ({
          ...prev,
          cep: formatCep(cleaned),
          endereco: toUpperValue(data.logradouro || prev.endereco),
          complemento: toUpperValue(data.complemento || prev.complemento),
          bairro: toUpperValue(data.bairro || prev.bairro),
          cidade: data.localidade ? toUpperTrimValue(data.localidade) : prev.cidade,
          uf: data.uf ? toUpperValue(data.uf) : prev.uf,
          cidadeId: data.localidade || data.uf ? 0 : prev.cidadeId,
        }));
        toast.success('Endereco preenchido pelo CEP');
      } catch (e: any) {
        toast.error('Erro na consulta de CEP');
      } finally {
        setCepLookupLoading(false);
      }
    }, 600);
  }

  console.log('ClientesTab rendering', { clients });

  useEffect(() => {
    loadClients(undefined, true);
    loadFilterUfs();
  }, []);

  // Carregar rotas, tabelas e UFs quando abrir os dialogs de criação/edição
  useEffect(() => {
    if (createOpen || editOpen) {
      loadRotas();
      loadTabelas();
      loadUfs();
      loadSegmentos();
      loadRedes();
      loadPrazos();
    }
  }, [createOpen, editOpen]);

  // Carregar cidades quando UF mudar
  useEffect(() => {
    if (formData.uf && (createOpen || editOpen)) {
      loadCidades(formData.uf);
    } else {
      setCidadesApi([]);
    }
  }, [formData.uf, createOpen, editOpen]);

  useEffect(() => {
    if (!formData.cidade || cidadesApi.length === 0) return;
    const target = normalizeCityKey(formData.cidade);
    if (!target) return;
    const currentId = Number(formData.cidadeId) || 0;
    const idMatch = currentId > 0 && cidadesApi.some((c) => Number(c.cidade_id) === currentId);
    if (idMatch) return;
    const match = cidadesApi.find((c) => normalizeCityKey(c.nome_cidade) === target);
    if (!match) return;
    const nextId = Number(match.cidade_id) || 0;
    setFormData((prev) => {
      if (Number(prev.cidadeId) === nextId) return prev;
      return {
        ...prev,
        cidadeId: nextId,
        cidade: toUpperTrimValue(match.nome_cidade),
      };
    });
  }, [cidadesApi, formData.cidade, formData.cidadeId]);

  useEffect(() => {
    if (complementarUf && (createOpen || editOpen)) {
      loadCidadesComplementares(complementarUf);
    } else {
      setCidadesComplementares([]);
    }
  }, [complementarUf, createOpen, editOpen]);

  useEffect(() => {
    if (cobrancaUf && (createOpen || editOpen)) {
      loadCidadesCobranca(cobrancaUf);
    } else {
      setCidadesCobranca([]);
    }
  }, [cobrancaUf, createOpen, editOpen]);

  // Carregar cidades quando UF do filtro mudar
  useEffect(() => {
    if (filters.uf && filters.uf !== 'all') {
      loadFilterCidades(filters.uf);
    } else {
      setFilterCidades([]);
    }
  }, [filters.uf]);

  useEffect(() => {
    if (!createOpen && !editOpen) {
      setTabelaSearchOpen(false);
      setTabelaSearch('');
      setRepSearchOpen(false);
      setRepSearch('');
    }
  }, [createOpen, editOpen]);

  // Carregar representantes quando abrir dialog de busca
  const REP_LIMIT = 100;
  const loadReps = async (reset = false) => {
    if (loadingReps) return;
    setLoadingReps(true);
    setRepsError(null);
    try {
      const nextPage = reset ? 1 : repPage + 1;
      const data = await representativesService.find(repSearch || undefined, nextPage, REP_LIMIT);
      setRepresentatives((prev) => {
        const combined = reset ? data : [...prev, ...data];
        const unique = combined.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);
        return unique;
      });
      setRepPage(nextPage);
      setRepHasMore(Array.isArray(data) && data.length === REP_LIMIT);
    } catch (e: any) {
      setRepsError(String(e));
    } finally {
      setLoadingReps(false);
    }
  };

  useEffect(() => {
    if (!repSearchOpen) return;
    loadReps(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repSearchOpen]);

  useEffect(() => {
    if (!repSearchOpen) return;
    const t = setTimeout(() => {
      loadReps(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repSearch]);

  const loadRotas = async () => {
    setRotasLoading(true);
    try {
      const data = await metadataService.getRotas();
      setRotas(data);
    } catch (e) {
      console.error('Erro ao carregar rotas:', e);
    } finally {
      setRotasLoading(false);
    }
  };

  const loadSegmentos = async () => {
    setSegmentosLoading(true);
    try {
      const data = await metadataService.getSegmentosVendas();
      setSegmentos(data);
    } catch (e) {
      console.error('Erro ao carregar segmentos de vendas:', e);
    } finally {
      setSegmentosLoading(false);
    }
  };

  const loadRedes = async () => {
    setRedesLoading(true);
    try {
      const data = await metadataService.getRedes();
      setRedes(data);
    } catch (e) {
      console.error('Erro ao carregar redes:', e);
    } finally {
      setRedesLoading(false);
    }
  };

  const loadPrazos = async () => {
    setPrazosLoading(true);
    setPrazosError(null);
    try {
      const data = await metadataService.getPrazos();
      setPrazos(data);
    } catch (e) {
      console.error('Erro ao carregar prazos:', e);
      setPrazosError(String(e));
    } finally {
      setPrazosLoading(false);
    }
  };

  const loadTabelas = async () => {
    setTabelasLoading(true);
    try {
      const data = await metadataService.getTabelas();
      setTabelas(data);
    } catch (e) {
      console.error('Erro ao carregar tabelas:', e);
    } finally {
      setTabelasLoading(false);
    }
  };

  const loadUfs = async () => {
    setUfsLoading(true);
    try {
      const data = await metadataService.getUfs();
      setUfsApi(data);
    } catch (e) {
      console.error('Erro ao carregar UFs:', e);
    } finally {
      setUfsLoading(false);
    }
  };

  const loadCidades = async (uf: string) => {
    setCidadesLoading(true);
    try {
      const data = await metadataService.getCidadesPorUf(uf);
      setCidadesApi(data);
    } catch (e) {
      console.error('Erro ao carregar cidades:', e);
    } finally {
      setCidadesLoading(false);
    }
  };

  const loadCidadesComplementares = async (uf: string) => {
    setCidadesComplementaresLoading(true);
    try {
      const data = await metadataService.getCidadesPorUf(uf);
      setCidadesComplementares(data);
    } catch (e) {
      console.error('Erro ao carregar cidades:', e);
    } finally {
      setCidadesComplementaresLoading(false);
    }
  };

  const loadCidadesCobranca = async (uf: string) => {
    setCidadesCobrancaLoading(true);
    try {
      const data = await metadataService.getCidadesPorUf(uf);
      setCidadesCobranca(data);
    } catch (e) {
      console.error('Erro ao carregar cidades:', e);
    } finally {
      setCidadesCobrancaLoading(false);
    }
  };

  const loadFilterUfs = async () => {
    setFilterUfsLoading(true);
    try {
      const data = await metadataService.getUfs();
      setFilterUfs(data);
    } catch (e) {
      console.error('Erro ao carregar UFs para filtro:', e);
    } finally {
      setFilterUfsLoading(false);
    }
  };

  const loadFilterCidades = async (uf: string) => {
    setFilterCidadesLoading(true);
    try {
      const data = await metadataService.getCidadesPorUf(uf);
      setFilterCidades(data);
    } catch (e) {
      console.error('Erro ao carregar cidades para filtro:', e);
    } finally {
      setFilterCidadesLoading(false);
    }
  };

  const loadClients = async (nextFilters?: typeof filters, reset = false) => {
    if (clientsLoading) return;
    const active = nextFilters ?? filters;
    const ignoreFilters = active.todos;
    const nextPage = reset ? 1 : clientsPage + 1;
    if (reset) {
      setClients([]);
      setClientsPage(1);
      setClientsHasMore(true);
    }
    setClientsLoading(true);
    const requestId = ++clientsRequestId.current;
    try {
      const data = await clientsService.search({
        query: ignoreFilters ? undefined : active.search,
        uf: !ignoreFilters && active.uf !== 'all' ? active.uf : undefined,
        cidade: !ignoreFilters && active.cidade !== 'all' ? active.cidade : undefined,
        bairro: !ignoreFilters && active.bairro ? active.bairro.trim() : undefined,
      }, undefined, nextPage, CLIENT_LIMIT);
      if (requestId !== clientsRequestId.current) return;
      setClients((prev) => (reset ? data : [...prev, ...data]));
      setClientsPage(nextPage);
      setClientsHasMore(Array.isArray(data) && data.length === CLIENT_LIMIT);
    } catch (e: any) {
      if (requestId !== clientsRequestId.current) return;
      toast.error(String(e?.message || e || 'Erro ao carregar clientes'));
    } finally {
      if (requestId !== clientsRequestId.current) return;
      setClientsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(clients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedClients([...selectedClients, id]);
    } else {
      setSelectedClients(selectedClients.filter(cId => cId !== id));
    }
  };

  const handleCadastrarPara = () => {
    if (selectedClients.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }
    setDialogOpen(true);
  };

  const handleConfirmCadastro = () => {
    if (!selectedOperacao) {
      toast.error('Selecione uma operação');
      return;
    }
    toast.success(`Criando pedidos para ${selectedClients.length} cliente(s) com operação: ${selectedOperacao}`);
    setDialogOpen(false);
    setSelectedClients([]);
  };

  const isClientsInitialLoading = clientsLoading && clients.length === 0;
  const isClientsLoadingMore = clientsLoading && clients.length > 0;

  const handleClientsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!clientsHasMore || clientsLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadClients(undefined, false);
    }
  };

  const tabelaSearchValue = tabelaSearch.trim().toUpperCase();
  const filteredTabelas = tabelas.filter((t) => {
    if (!tabelaSearchValue) return true;
    return getTabelaLabel(t).toUpperCase().includes(tabelaSearchValue);
  });
  const selectedTabelaLabels = tabelas
    .filter((t) => formData.tabelaIds.includes(Number(t.id)))
    .map((t) => getTabelaLabel(t));
  const tabelaSummary = summarizeSelection(
    selectedTabelaLabels.length ? selectedTabelaLabels : formData.tabelaIds.map(String),
    'Selecione uma ou mais tabelas'
  );
  const representanteSummary = summarizeSelection(
    formData.representantes.map((rep) => rep.nome || rep.id),
    'Selecione...'
  );
  const toggleTabelaId = (id: number, checked: boolean) => {
    setFormData((prev) => {
      const exists = prev.tabelaIds.includes(id);
      const nextIds = checked && !exists
        ? [...prev.tabelaIds, id]
        : (!checked && exists ? prev.tabelaIds.filter((item) => item !== id) : prev.tabelaIds);
      return { ...prev, tabelaIds: nextIds };
    });
  };

const createEmptyFormData = () => ({
  codigoCliente: '',
  inativo: false,
  cnpjCpf: '',
  inscEstadual: '',
  inscMunicipal: '',
  rg: '',
  nome: '',
  fantasia: '',
  endereco: '',
  numero: '',
  bairro: '',
  uf: '',
  cidade: '',
  cidadeId: 0,
  cep: '',
  complemento: '',
  telefone: '',
  fax: '',
  whatsapp: '',
  email: '',
  emailDanfe: '',
  site: '',
  rota: '',
  rotaId: 0,
  b2bLiberado: false,
  b2bSenha: '',
  b2bTabelaId: 0,
  contato1Nome: '',
  contato1Celular: '',
  contato1Aniversario: '',
  contato2Nome: '',
  contato2Celular: '',
  contato2Aniversario: '',
  segmentoId: 1,
  checkouts: 0,
  redeId: 0,
  tabelaIds: [] as number[],
  representantes: [] as Array<{ id: string; nome: string }>,
  descontoFinanceiroBoleto: 0,
  observacaoComercial: '',
  credito: 0,
  boleto: false,
  prazo: '',
  limite: 0,
  aberto: 0,
  disponivel: 0,
  observacaoFinanceiro: '',
  formaPagtoId: 1,
  prazoPagtoId: 1,
});

const normalizeCep = (v: string) => v.replace(/\D+/g, '').slice(0, 8);

const normalizeDateInput = (value: unknown) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (raw.includes('T')) return raw.split('T')[0];
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
};
const normalizeCnpj = (v: string) => v.replace(/\D+/g, '').slice(0, 14);
const ensurePositiveId = (value: number | string | undefined | null, fallback = 1) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};
type ClientFormData = ReturnType<typeof createEmptyFormData>;

const normalizeErrorMessages = (error: unknown): string[] => {
  if (!error) return ['Erro desconhecido'];
  if (Array.isArray(error)) return error.map((item) => String(item)).filter(Boolean);
  const message = typeof error === 'string' ? error : (error as any)?.message ?? String(error);
  const parts = String(message)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length ? parts : [String(message)];
};

const validateFormData = (data: ClientFormData): string[] => {
  const errors: string[] = [];
  const hasText = (value: string | number | null | undefined) => String(value ?? '').trim().length > 0;
  const isValidId = (value: number | string | null | undefined) =>
    Number.isFinite(Number(value)) && Number(value) > 0;

  if (!hasText(data.cnpjCpf)) errors.push('Informe o CNPJ/CPF.');
  if (!hasText(data.nome)) errors.push('Informe a Razão Social/Nome.');
  if (!hasText(data.cep)) errors.push('Informe o CEP.');
  if (!hasText(data.telefone)) errors.push('Informe o telefone fixo.');

  const ufValue = String(data.uf ?? '').trim();
  if (!ufValue || ufValue.length < 2) errors.push('Informe a UF.');
  if (!isValidId(data.cidadeId)) errors.push('Selecione a cidade.');

  if (!hasText(data.endereco)) errors.push('Informe o endereço.');
  if (!hasText(data.bairro)) errors.push('Informe o bairro.');
  if (!isValidId(data.segmentoId)) errors.push('Selecione o segmento.');
  if (!isValidId(data.rotaId)) errors.push('Selecione a rota de entrega.');
  if (!isValidId(data.formaPagtoId)) errors.push('Selecione a forma de pagamento.');
  if (!isValidId(data.prazoPagtoId)) errors.push('Selecione o prazo de pagamento.');
  if (!Array.isArray(data.tabelaIds) || data.tabelaIds.length === 0) errors.push('Selecione ao menos uma tabela de preços.');
  if (!Array.isArray(data.representantes) || data.representantes.length === 0) errors.push('Selecione o representante.');

  const emailValue = String(data.email ?? '').trim();
  if (emailValue && !isValidEmail(emailValue)) errors.push('Email inválido.');
  const emailDanfeValue = String(data.emailDanfe ?? '').trim();
  if (emailDanfeValue && !isValidEmail(emailDanfeValue)) errors.push('Email DANFE inválido.');

  return errors;
};
  const openCreateDialog = () => {
    setFormErrors([]);
    setFormData(createEmptyFormData());
    setComplementarUf('');
    setComplementarCidadeId(0);
    setComplementarCidade('');
    setCidadesComplementares([]);
    setCobrancaUf('');
    setCobrancaCidadeId(0);
    setCobrancaCidade('');
    setCidadesCobranca([]);
    setTabelaSearchOpen(false);
    setTabelaSearch('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setFormErrors([]);
    const errors = validateFormData(formData);
    if (errors.length) {
      setFormErrors(errors);
      return;
    }
    const emailValue = formData.email.trim();
    const emailDanfeValue = formData.emailDanfe.trim();
    const tabelaId = formData.tabelaIds[0];
    const representanteIds = formData.representantes.map((rep) => rep.id).filter(Boolean);
    const representanteId = representanteIds[0];
    const redeId = ensurePositiveId(formData.redeId, 0);
    try {
      setFormLoading(true);
      const { representantes, tabelaIds, ...payloadBase } = formData;
      const payloadNormalized = {
        ...payloadBase,
        site: payloadBase.site?.trim() || undefined,
        telefone: normalizePhoneDigits(payloadBase.telefone),
        fax: normalizePhoneDigits(payloadBase.fax),
        whatsapp: normalizePhoneDigits(payloadBase.whatsapp),
        contato1Celular: normalizePhoneDigits(payloadBase.contato1Celular),
        contato2Celular: normalizePhoneDigits(payloadBase.contato2Celular),
      };
      await clientsService.create({
        ...payloadNormalized,
        tabelaIds,
        tabelaId: tabelaId || undefined,
        representanteIds,
        representanteId: representanteId || undefined,
        redeId: redeId || undefined,
        email: emailValue,
        emailDanfe: emailDanfeValue || undefined,
        b2bLiberado: Boolean(formData.b2bLiberado),
        b2bSenha: formData.b2bSenha.trim() || undefined,
        b2bTabelaId: formData.b2bTabelaId ? Number(formData.b2bTabelaId) : undefined,
        cidadeId: Number(formData.cidadeId) || 0,
        segmentoId: ensurePositiveId(formData.segmentoId),
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: ensurePositiveId(formData.formaPagtoId),
        prazoPagtoId: ensurePositiveId(formData.prazoPagtoId),
      });
      toast.success('Cliente criado com sucesso');
      setCreateOpen(false);
      setSelectedClients([]);
      loadClients(undefined, true);
    } catch (e: any) {
      setFormErrors(normalizeErrorMessages(e));
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = async () => {
    if (selectedClients.length !== 1) {
      toast.error('Selecione exatamente um cliente para editar');
      return;
    }
    const id = selectedClients[0];
    setEditId(id);
    setFormErrors([]);
    setDetailLoading(true);
    setComplementarUf('');
    setComplementarCidadeId(0);
    setComplementarCidade('');
    setCidadesComplementares([]);
    setCobrancaUf('');
    setCobrancaCidadeId(0);
    setCobrancaCidade('');
    setCidadesCobranca([]);
    setTabelaSearchOpen(false);
    setTabelaSearch('');
    setEditOpen(true);
    try {
      const detail = await clientsService.getDetail(id);
      // Try to map common fields; fallback to empty strings
      const d = detail || {};
      const tabelaIds = normalizeTabelaIds(
        d.tabelas ?? d.tabelas_preco ?? d.tabelasPreco ?? d.tabelas_precos ?? d.tabelasPrecos,
        d.tabela_id ?? d.tabelaId
      );
      const representantes = normalizeRepresentantes(
        d.representantes ?? d.representante,
        d.representante_codigo ?? d.representanteCod ?? d.representante_cod ?? d.representante_id ?? d.representanteId ?? d.representante?.id,
        d.representante_nome ?? d.representanteNome ?? d.representante?.nome
      );
      setFormData({
        codigoCliente: toUpperValue(d.codigo_cliente ?? d.codigoCliente ?? d.codigo ?? ''),
        inativo: Boolean(d.inativo),
        cnpjCpf: toUpperValue(d.cnpj_cpf ?? d.cnpjCpf ?? d.cnpj ?? d.cpf ?? ''),
        inscEstadual: toUpperValue(d.inscricao_estadual ?? d.inscEstadual ?? d.insc_estadual ?? ''),
          inscMunicipal: toUpperValue(d.inscricao_municipal ?? d.inscMunicipal ?? d.insc_municipal ?? ''),
          rg: formatRg(d.rg ?? ''),
          nome: toUpperValue(d.nome ?? d.razao_social ?? ''),
          fantasia: toUpperValue(d.fantasia ?? ''),
          endereco: toUpperValue(d.endereco ?? d.logradouro ?? ''),
          numero: toUpperValue((d as any)?.numero ?? (d as any)?.num ?? ''),
          bairro: toUpperTrimValue(d.bairro ?? ''),
          uf: toUpperValue(d.uf ?? d.estado ?? ''),
          cidade: toUpperTrimValue(d.cidade ?? ''),
          cidadeId: Number(d.cidade_id ?? d.cidadeId ?? 0),
          cep: formatCep(d.cep ?? ''),
          complemento: toUpperTrimValue(d.complemento ?? ''),
          telefone: formatPhone(d.fone ?? d.telefone ?? ''),
          fax: formatPhone(d.fax ?? ''),
          whatsapp: formatPhone(d.whatsapp ?? ''),
          email: String(d.email ?? '').trim(),
          emailDanfe: String(d.email_danfe ?? d.emailDanfe ?? '').trim(),
          site: String(d.site ?? ''),
          rota: toUpperValue(d.rota ?? ''),
          rotaId: Number(d.rota_id ?? d.rotaId ?? 0),
          b2bLiberado: Boolean(d.b2b_liberado ?? d.b2bLiberado ?? false),
          b2bSenha: String(d.b2b_senha ?? d.b2bSenha ?? '').trim(),
          b2bTabelaId: Number(d.b2b_tabela_id ?? d.b2bTabelaId ?? 0),
          contato1Nome: toUpperTrimValue(d.contato ?? d.comprador_nome ?? d.contato1Nome ?? d.contatos?.[0]?.nome ?? ''),
          contato1Celular: formatPhone(d.contato1Celular ?? d.comprador_fone ?? d.celular ?? d.contatos?.[0]?.celular ?? ''),
          contato1Aniversario: normalizeDateInput(
            d.contato1Aniversario ??
            d.contato1_aniversario ??
            d.contato1_data_aniversario ??
            d.comprador_data_nascimento ??
            d.compradorDataNascimento ??
            d.contatos?.[0]?.aniversario ??
            ''
          ),
          contato2Nome: toUpperValue(d.contato2_nome ?? d.contato2Nome ?? d.contatos?.[1]?.nome ?? ''),
          contato2Celular: formatPhone(d.contato2_celular ?? d.contato2Celular ?? d.contatos?.[1]?.celular ?? ''),
          contato2Aniversario: normalizeDateInput(
            d.contato2Aniversario ??
            d.contato2_aniversario ??
            d.contato2_data_aniversario ??
            d.contatos?.[1]?.aniversario ??
            ''
          ),
          segmentoId: ensurePositiveId(d.segmento_id ?? d.segmentoId),
          checkouts: Number(d.checkouts ?? 0),
        redeId: ensurePositiveId(d.rede_id ?? d.redeId ?? d.rede, 0),
        tabelaIds,
        representantes,
        descontoFinanceiroBoleto: Number(d.desconto_financeiro_boleto ?? d.descontoFinanceiroBoleto ?? 0),
        observacaoComercial: toUpperValue(d.observacao_comercial ?? d.observacaoComercial ?? ''),
          credito: Number(d.credito ?? 0) || 0,
          boleto: Boolean(d.boleto),
          prazo: String(d.prazo ?? '').trim(),
          limite: Number(d.limite_credito ?? d.limite ?? 0),
          aberto: Number(d.aberto ?? 0),
          disponivel: Number(d.disponivel ?? 0),
          observacaoFinanceiro: toUpperValue(d.observacao_financeiro ?? d.observacaoFinanceiro ?? ''),
          formaPagtoId: ensurePositiveId(d.forma_pagto_id ?? d.formaPagtoId),
          prazoPagtoId: ensurePositiveId(d.prazo_pagto_id ?? d.prazoPagtoId),
        });
    } catch (e: any) {
      setFormErrors(normalizeErrorMessages(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!editId) return;
    setFormErrors([]);
    const errors = validateFormData(formData);
    if (errors.length) {
      setFormErrors(errors);
      return;
    }
    const emailValue = formData.email.trim();
    const emailDanfeValue = formData.emailDanfe.trim();
    const tabelaId = formData.tabelaIds[0];
    const representanteIds = formData.representantes.map((rep) => rep.id).filter(Boolean);
    const representanteId = representanteIds[0];
    const redeId = ensurePositiveId(formData.redeId, 0);
    try {
      setFormLoading(true);
      const { representantes, tabelaIds, ...payloadBase } = formData;
      const payloadNormalized = {
        ...payloadBase,
        site: payloadBase.site?.trim() || undefined,
        telefone: normalizePhoneDigits(payloadBase.telefone),
        fax: normalizePhoneDigits(payloadBase.fax),
        whatsapp: normalizePhoneDigits(payloadBase.whatsapp),
        contato1Celular: normalizePhoneDigits(payloadBase.contato1Celular),
        contato2Celular: normalizePhoneDigits(payloadBase.contato2Celular),
      };
      await clientsService.update(editId, {
        ...payloadNormalized,
        tabelaIds,
        tabelaId: tabelaId || undefined,
        representanteIds,
        representanteId: representanteId || undefined,
        redeId: redeId || undefined,
        email: emailValue,
        emailDanfe: emailDanfeValue || undefined,
        b2bLiberado: Boolean(formData.b2bLiberado),
        b2bSenha: formData.b2bSenha.trim() || undefined,
        b2bTabelaId: formData.b2bTabelaId ? Number(formData.b2bTabelaId) : undefined,
        cidadeId: Number(formData.cidadeId) || 0,
        segmentoId: ensurePositiveId(formData.segmentoId),
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: ensurePositiveId(formData.formaPagtoId),
        prazoPagtoId: ensurePositiveId(formData.prazoPagtoId),
      });
      toast.success('Cliente atualizado com sucesso');
      setEditOpen(false);
      setSelectedClients([]);
      loadClients(undefined, true);
    } catch (e: any) {
      setFormErrors(normalizeErrorMessages(e));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedClients.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }
    try {
      for (const id of selectedClients) {
        await clientsService.remove(id);
      }
      toast.success(`${selectedClients.length} cliente(s) excluído(s)`);
      setSelectedClients([]);
      loadClients(undefined, true);
    } catch (e: any) {
      toast.error(String(e));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const defaultFilters = { search: '', uf: 'all', cidade: 'all', bairro: '', todos: false };
                  setFilters(defaultFilters);
                  setFilterCidades([]);
                  loadClients(defaultFilters, true);
                }}
              >
                Limpar
              </Button>
              <Button onClick={() => loadClients(undefined, true)} size="sm">
                <Search className="h-4 w-4 mr-2" /> Filtrar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Pesquisa</label>
              <Input 
                placeholder="Nome ou código"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && loadClients(undefined, true)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">UF</label>
              <Select 
                value={filters.uf} 
                onValueChange={(v) => {
                  const newFilters = { ...filters, uf: v, cidade: 'all' };
                  setFilters(newFilters);
                }}
                disabled={filterUfsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={filterUfsLoading ? 'Carregando...' : 'Todos'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterUfs.map(uf => (
                    <SelectItem key={uf.uf} value={uf.uf}>{uf.uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cidade</label>
              <Select 
                value={filters.cidade} 
                onValueChange={(v) => setFilters({...filters, cidade: v})}
                disabled={filterCidadesLoading || filters.uf === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={filterCidadesLoading ? 'Carregando...' : (filters.uf === 'all' ? 'Selecione UF' : 'Todas')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {filterCidades.map(cidade => (
                    <SelectItem key={cidade.cidade_id} value={cidade.nome_cidade}>{cidade.nome_cidade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Bairro</label>
              <Input 
                placeholder="Bairro"
                value={filters.bairro}
                onChange={(e) => setFilters({...filters, bairro: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && loadClients(undefined, true)}
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center space-x-2 pb-2">
                <Checkbox 
                  id="todos"
                  checked={filters.todos}
                  onCheckedChange={(checked) => {
                    const next = { ...filters, todos: checked as boolean };
                    setFilters(next);
                    loadClients(next, true);
                  }}
                />
                <label htmlFor="todos" className="text-sm font-medium">
                  Mostrar todos
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Clientes ({clients.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openCreateDialog} className="flex-1 sm:flex-none">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (selectedClients.length !== 1) {
                    toast.error('Selecione exatamente um cliente para visualizar');
                    return;
                  }
                  setClientInfoId(selectedClients[0]);
                  setClientInfoOpen(true);
                }}
                disabled={selectedClients.length !== 1}
                className="flex-1 sm:flex-none"
              >
                <Info className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Visualizar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={openEditDialog} disabled={selectedClients.length !== 1} className="flex-1 sm:flex-none">
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={selectedClients.length === 0} className="flex-1 sm:flex-none">
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Excluir</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-auto scrollbar-thin" onScroll={handleClientsScroll}>
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedClients.length === clients.length && clients.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Cidade</TableHead>
                  <TableHead className="w-12">UF</TableHead>
                  <TableHead className="hidden lg:table-cell">Bairro</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isClientsInitialLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{client.codigoCliente ?? ''}</TableCell>
                      <TableCell className="font-medium">{client.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">{client.cidade}</TableCell>
                      <TableCell>{client.uf}</TableCell>
                      <TableCell className="hidden lg:table-cell">{client.bairro}</TableCell>
                      <TableCell className="hidden sm:table-cell">{client.fone}</TableCell>
                    </TableRow>
                  ))
                )}
                {isClientsLoadingMore && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* <div className="flex justify-end">
        <Button onClick={handleCadastrarPara} disabled={selectedClients.length === 0}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cadastrar para ({selectedClients.length})
        </Button>
      </div> */}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Pedido para Clientes Selecionados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Operação</label>
              <Select value={selectedOperacao} onValueChange={setSelectedOperacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a operação" />
                </SelectTrigger>
                <SelectContent>
                  {operacoes.map(op => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Será criado um pedido para cada um dos {selectedClients.length} cliente(s) selecionado(s).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmCadastro}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Cadastrar novo cliente</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="identificacao" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="w-auto">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="comerciais">Dados Comerciais</TabsTrigger>
              <TabsTrigger value="complementares">Dados complementares</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 px-2 pb-2">
              {/* =================== Identificação =================== */}
              <TabsContent value="identificacao" className="m-0 space-y-4">
                {/* CNPJ/CPF + Tipo + Código */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CNPJ / CPF *</label>
                    <div className="flex gap-1">
                      <Input
                        className="h-8 text-sm flex-1"
                        value={formData.cnpjCpf}
                        onChange={(e) => {
                          setFormData({ ...formData, cnpjCpf: toUpperValue(e.target.value) });
                          cnpjLookupRef.current?.(e.target.value);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => cnpjLookupRef.current?.(formData.cnpjCpf)}
                        disabled={cnpjLookupLoading}
                      >
                        {cnpjLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
                    <Input className="h-8 text-sm bg-muted" value={formData.codigoCliente} readOnly />
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Checkbox checked={formData.inativo} onCheckedChange={(c) => setFormData({ ...formData, inativo: c as boolean })} />
                    <label className="text-sm">Cliente Inativo</label>
                  </div>
                </div>

                {/* Razão Social + Simples Nacional */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-9">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Razão Social/Nome *</label>
                    <Input className="h-8 text-sm" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: toUpperValue(e.target.value) })} />
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Checkbox />
                    <label className="text-sm">Simples nacional</label>
                  </div>
                </div>

                {/* Nome Fantasia + Consumidor final */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-9">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome Fantasia</label>
                    <Input className="h-8 text-sm" value={formData.fantasia} onChange={(e) => setFormData({ ...formData, fantasia: toUpperValue(e.target.value) })} />
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Checkbox />
                    <label className="text-sm">Consumidor final</label>
                  </div>
                </div>

                {/* Inscrições + Contribuinte + Suframa */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. estadual</label>
                    <Input className="h-8 text-sm" value={formData.inscEstadual} onChange={(e) => setFormData({ ...formData, inscEstadual: toUpperValue(e.target.value) })} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. municipal</label>
                    <Input className="h-8 text-sm" value={formData.inscMunicipal} onChange={(e) => setFormData({ ...formData, inscMunicipal: toUpperValue(e.target.value) })} />
                  </div>
                  <div className="col-span-3">
                    <Select defaultValue="contribuinte">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="contribuinte">Contribuinte ICM</SelectItem>
                        <SelectItem value="nao">Não contribuinte</SelectItem>
                        <SelectItem value="isento">Isento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Suframa</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                </div>

                {/* Seção Endereço */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Endereço</span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Cep *</label>
                    <div className="flex gap-1">
                      <Input
                        className="h-8 text-sm"
                        placeholder="-"
                        value={formData.cep}
                        onChange={(e) => {
                          const next = formatCep(e.target.value);
                          setFormData({ ...formData, cep: next });
                          cepLookupRef.current?.(next);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => cepLookupRef.current?.(formData.cep)}
                        disabled={cepLookupLoading}
                      >
                        {cepLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-9">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço *</label>
                    <Input className="h-8 text-sm" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: toUpperValue(e.target.value) })} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
                    <Input className="h-8 text-sm" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: toUpperValue(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">UF *</label>
                    <Select
                      value={formData.uf}
                      onValueChange={(v) => setFormData({ ...formData, uf: toUpperValue(v), cidade: '', cidadeId: 0 })}
                      disabled={ufsLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {ufsApi.map(u => (
                          <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade *</label>
                    <Select
                      value={formData.cidadeId ? String(formData.cidadeId) : ''}
                      onValueChange={(v) => {
                        const cid = cidadesApi.find(c => String(c.cidade_id) === v);
                        setFormData({ ...formData, cidadeId: parseInt(v) || 0, cidade: toUpperValue(cid?.nome_cidade || '') });
                      }}
                      disabled={cidadesLoading || !formData.uf}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={cidadesLoading ? 'Carregando...' : (formData.uf ? 'Selecione' : 'Selecione UF')} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-60">
                        {cidadesApi.map(c => (
                          <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro *</label>
                  </div>
                  <div className="col-span-3">
                    <Input className="h-8 text-sm" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: toUpperValue(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Complem.</label>
                    <Input className="h-8 text-sm" value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: toUpperValue(e.target.value) })} />
                  </div>
                </div>

                {/* Seção Telefones */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Telefones</span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Fixo *</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })} />
                  </div>
                </div>

                <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} className="max-w-lg" upperCase={false} />
                <FormField label="Email Danfe" value={formData.emailDanfe} onChange={(v) => setFormData({ ...formData, emailDanfe: v })} className="max-w-lg" upperCase={false} />
                <FormField label="Site" value={formData.site} onChange={(v) => setFormData({ ...formData, site: v })} className="max-w-lg" upperCase={false} />

                <div className="max-w-lg">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Rota entrega *</label>
                  <Select
                    value={formData.rotaId ? String(formData.rotaId) : ''}
                    onValueChange={(v) => setFormData({ ...formData, rotaId: parseInt(v) || 0 })}
                    disabled={rotasLoading}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={rotasLoading ? 'Carregando...' : 'Selecione a rota'} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="0">Nenhuma</SelectItem>
                      {rotas.map((rota) => (
                        <SelectItem key={rota.id} value={String(rota.id)}>
                          {rota.codigo_rota ? `${rota.codigo_rota} - ${rota.label}` : rota.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* =================== Dados Complementares =================== */}
              <TabsContent value="complementares" className="m-0 space-y-4">
                {/* Proprietário + Aniversário */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Proprietário</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Aniversário</label>
                    <Input type="date" className="h-8 text-sm" />
                  </div>
                </div>

                {/* CPF + RG + Início atividade */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CPF</label>
                    <Input className="h-8 text-sm" onChange={handleCpfChange} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">RG</label>
                    <Input className="h-8 text-sm" value={formData.rg} onChange={(e) => setFormData({ ...formData, rg: formatRg(e.target.value) })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Início de atividade</label>
                    <Input type="date" className="h-8 text-sm" />
                  </div>
                </div>

                {/* Endereço complementar */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Checkbox />
                    <label className="text-sm">Endereço para entrega</label>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-2">
                    <Select
                      value={complementarUf}
                      onValueChange={(v) => {
                        const nextUf = toUpperValue(v);
                        setComplementarUf(nextUf);
                        setComplementarCidadeId(0);
                        setComplementarCidade('');
                      }}
                      disabled={ufsLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {ufsApi.map(u => (
                          <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Select
                      value={complementarCidadeId ? String(complementarCidadeId) : ''}
                      onValueChange={(v) => {
                        const cid = cidadesComplementares.find(c => String(c.cidade_id) === v);
                        setComplementarCidadeId(parseInt(v) || 0);
                        setComplementarCidade(toUpperValue(cid?.nome_cidade || ''));
                      }}
                      disabled={cidadesComplementaresLoading || !complementarUf}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue
                          placeholder={
                            cidadesComplementaresLoading
                              ? 'Carregando...'
                              : (complementarUf ? 'Selecione' : 'Selecione UF')
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-60">
                        {cidadesComplementares.map(c => (
                          <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
                    <Input className="h-8 text-sm" placeholder="-" onChange={handleCepChange} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                </div>

                <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} className="max-w-md" upperCase={false} />

                {/* Seção Referências */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Referências</span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Banco</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Conta</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" placeholder="Agência" onChange={handleUpperChange} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                </div>

                {/* Referências Comerciais + Sócios */}
                <div className="grid grid-cols-12 gap-3 items-start mt-4">
                  <div className="col-span-6 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground block">Referências Comerciais</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-6 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground block">Sócios</label>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" onChange={handleUpperChange} />
                      <Input type="number" className="h-8 text-sm w-16 text-right" defaultValue={0} />
                    </div>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" onChange={handleUpperChange} />
                      <Input type="number" className="h-8 text-sm w-16 text-right" defaultValue={0} />
                    </div>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" onChange={handleUpperChange} />
                      <Input type="number" className="h-8 text-sm w-16 text-right" defaultValue={0} />
                    </div>
                  </div>
                </div>

                <FormField label="Cap. social" value="" onChange={() => {}} />

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contador</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
                    <Input className="h-8 text-sm" placeholder="( )" onChange={handlePhoneChange} />
                  </div>
                </div>

                {/* Seção Cobrança */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Cobrança</span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-2">
                    <Select
                      value={cobrancaUf}
                      onValueChange={(v) => {
                        const nextUf = toUpperValue(v);
                        setCobrancaUf(nextUf);
                        setCobrancaCidadeId(0);
                        setCobrancaCidade('');
                      }}
                      disabled={ufsLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {ufsApi.map(u => (
                          <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Select
                      value={cobrancaCidadeId ? String(cobrancaCidadeId) : ''}
                      onValueChange={(v) => {
                        const cid = cidadesCobranca.find(c => String(c.cidade_id) === v);
                        setCobrancaCidadeId(parseInt(v) || 0);
                        setCobrancaCidade(toUpperValue(cid?.nome_cidade || ''));
                      }}
                      disabled={cidadesCobrancaLoading || !cobrancaUf}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue
                          placeholder={
                            cidadesCobrancaLoading
                              ? 'Carregando...'
                              : (cobrancaUf ? 'Selecione' : 'Selecione UF')
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-60">
                        {cidadesCobranca.map(c => (
                          <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
                    <Input className="h-8 text-sm" placeholder="-" onChange={handleUpperChange} />
                  </div>
                  <div className="col-span-2">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* =================== Dados Comerciais =================== */}
              <TabsContent value="comerciais" className="m-0 space-y-4">
                {/* Contatos */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contatos</label>
                    <Input className="h-8 text-sm" value={formData.contato1Nome} onChange={(e) => setFormData({ ...formData, contato1Nome: toUpperValue(e.target.value) })} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.contato1Celular} onChange={(e) => setFormData({ ...formData, contato1Celular: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Aniversário</label>
                    <Input type="date" className="h-8 text-sm" value={formData.contato1Aniversario} onChange={(e) => setFormData({ ...formData, contato1Aniversario: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <Input className="h-8 text-sm" value={formData.contato2Nome} onChange={(e) => setFormData({ ...formData, contato2Nome: toUpperValue(e.target.value) })} />
                  </div>
                  <div className="col-span-3">
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.contato2Celular} onChange={(e) => setFormData({ ...formData, contato2Celular: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-4">
                    <Input type="date" className="h-8 text-sm" value={formData.contato2Aniversario} onChange={(e) => setFormData({ ...formData, contato2Aniversario: e.target.value })} />
                  </div>
                </div>

                {/* Segmentos / Checkouts / Dependência / Rede */}
                <div className="grid grid-cols-12 gap-3 items-end mt-4">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Segmentos *</label>
                    <Select
                      value={formData.segmentoId ? String(formData.segmentoId) : ''}
                      onValueChange={(v) => setFormData({ ...formData, segmentoId: parseInt(v) || 0 })}
                      disabled={segmentosLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={segmentosLoading ? 'Carregando...' : 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {segmentos.map((segmento) => (
                          <SelectItem key={segmento.id} value={String(segmento.id)}>
                            {segmento.codigo ? `${segmento.codigo} - ${segmento.descricao}` : segmento.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Checkouts</label>
                    <Input type="number" className="h-8 text-sm text-right" value={formData.checkouts} onChange={(e) => setFormData({ ...formData, checkouts: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Dependência</label>
                    <Input type="number" className="h-8 text-sm text-right" defaultValue={0} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Rede</label>
                    <Select
                      value={formData.redeId !== undefined && formData.redeId !== null ? String(formData.redeId) : ''}
                      onValueChange={(v) => setFormData({ ...formData, redeId: parseInt(v) || 0 })}
                      disabled={redesLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={redesLoading ? 'Carregando...' : 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="0">Nenhuma</SelectItem>
                        {redes.map((rede) => (
                          <SelectItem key={rede.id} value={String(rede.id)}>
                            {rede.codigo ? `${rede.codigo} - ${rede.descricao}` : rede.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tabelas de preços / Permite venda */}
                <div className="grid grid-cols-12 gap-3 items-end mt-4">
                  <div className="col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tabela de preços *</label>
                    <Dialog open={tabelaSearchOpen && createOpen} onOpenChange={onTabelaDialogChange}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-8 text-sm">
                          {tabelaSummary}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Selecionar tabelas de preço</DialogTitle>
                        </DialogHeader>
                        <Input
                          placeholder="Buscar tabela..."
                          value={tabelaSearch}
                          onChange={(e) => setTabelaSearch(e.target.value)}
                          autoFocus
                        />
                        <ScrollArea className="h-64 mt-2">
                          {tabelasLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Carregando tabelas...</div>
                          ) : tabelas.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma tabela disponível</div>
                          ) : filteredTabelas.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma tabela encontrada</div>
                          ) : (
                            <div className="space-y-1">
                              {filteredTabelas.map((t) => {
                                const tId = Number(t.id);
                                const checked = formData.tabelaIds.includes(tId);
                                const label = getTabelaLabel(t);
                                return (
                                  <label
                                    key={t.id}
                                    className={cn('flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer', checked && 'bg-muted')}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => toggleTabelaId(tId, value === true)}
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                        <DialogFooter>
                          <Button onClick={() => onTabelaDialogChange(false)}>Confirmar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="col-span-7">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Permite venda nas empresas (ex: 01,02..)</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                </div>

                {/* Representante */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Representante *</label>
                    <Dialog open={repSearchOpen && createOpen} onOpenChange={setRepSearchOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-8 text-sm">
                          {representanteSummary}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Buscar Representante</DialogTitle>
                        </DialogHeader>
                        <Input
                          placeholder="Digite nome ou código..."
                          value={repSearch}
                          onChange={(e) => setRepSearch(e.target.value)}
                          autoFocus
                        />
                        <ScrollArea className="h-64 mt-2" onScrollCapture={(e) => {
                          const el = e.currentTarget;
                          if (repHasMore && !loadingReps && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                            loadReps(false);
                          }
                        }}>
                          {loadingReps ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Carregando representantes...</div>
                          ) : repsError ? (
                            <div className="py-6 text-center text-sm text-red-600">{repsError}</div>
                          ) : representatives.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Nenhum representante encontrado</div>
                          ) : (
                            <div className="space-y-1">
                              {representatives.map((r) => {
                                const repId = String(r.codigoRepresentante || r.id);
                                const repNome = toUpperValue(r.nome);
                                const checked = formData.representantes.some((rep) => rep.id === repId);
                                return (
                                  <label
                                    key={r.id}
                                    className={cn('flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer', checked && 'bg-muted')}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        const isChecked = value === true;
                                        setFormData((prev) => {
                                          const exists = prev.representantes.some((rep) => rep.id === repId);
                                          const nextRepresentantes = isChecked && !exists
                                            ? [...prev.representantes, { id: repId, nome: repNome }]
                                            : (!isChecked && exists
                                              ? prev.representantes.filter((rep) => rep.id !== repId)
                                              : prev.representantes);
                                          return { ...prev, representantes: nextRepresentantes };
                                        });
                                      }}
                                    />
                                    <span>{`${r.codigoRepresentante || r.id} - ${repNome}`}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                        <DialogFooter>
                          <Button onClick={() => setRepSearchOpen(false)}>Confirmar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Prazo máximo + Descontos */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo máximo liberado</label>
                    <Select
                      value={formData.prazo}
                      onValueChange={(v) => {
                        const match =
                          prazos.find((p) => p.descricao === v) ||
                          prazos.find((p) => String(p.codigo || '').trim() === String(v).trim());
                        setFormData({ ...formData, prazo: v, prazoPagtoId: match ? ensurePositiveId(match.id, 0) : 0 });
                      }}
                      disabled={prazosLoading || !!prazosError}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={prazosLoading ? 'Carregando...' : prazosError ? 'Erro ao carregar' : 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {prazos.map((p) => (
                          <SelectItem key={`${p.id}-${p.codigo || p.descricao}`} value={String(p.descricao)}>
                            {p.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">% Desconto máximo na nota fiscal</label>
                    <div className="flex items-center gap-1">
                      <Input type="number" className="h-8 text-sm text-right" value={formData.descontoFinanceiroBoleto} onChange={(e) => setFormData({ ...formData, descontoFinanceiroBoleto: parseFloat(e.target.value) || 0 })} />
                      <span className="text-sm">(%)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Crédito</label>
                    <Input
                      type="number"
                      className="h-8 text-sm text-right"
                      value={formData.credito}
                      onChange={(e) => setFormData({ ...formData, credito: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Aberto</label>
                    <Input
                      type="number"
                      className="h-8 text-sm text-right"
                      value={formData.aberto}
                      onChange={(e) => setFormData({ ...formData, aberto: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Disponível</label>
                    <Input
                      type="number"
                      className="h-8 text-sm text-right"
                      value={formData.disponivel}
                      onChange={(e) => setFormData({ ...formData, disponivel: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6 flex items-center gap-2">
                    <Checkbox checked={formData.boleto} onCheckedChange={(c) => setFormData({ ...formData, boleto: c as boolean })} />
                    <label className="text-sm">Boleto bancário</label>
                  </div>
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">% Despesas nota fiscal</label>
                    <div className="flex items-center gap-1">
                      <Input type="number" className="h-8 text-sm text-right" defaultValue={0} />
                      <span className="text-sm">(%)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6"></div>
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">% Frete nota fiscal</label>
                    <div className="flex items-center gap-1">
                      <Input type="number" className="h-8 text-sm text-right" defaultValue={0} />
                      <span className="text-sm">(%)</span>
                    </div>
                  </div>
                </div>

                {/* B2B */}
                <div className="grid grid-cols-12 gap-3 items-center mt-4">
                  <div className="col-span-12 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.b2bLiberado}
                        onCheckedChange={(c) => setFormData({ ...formData, b2bLiberado: c as boolean })}
                      />
                      <label className="text-sm">Liberado venda no B2B</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Senha B2B</label>
                      <Input
                        className="h-8 text-sm w-32"
                        value={formData.b2bSenha}
                        onChange={(e) => setFormData({ ...formData, b2bSenha: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Tabela B2B</label>
                      <Select
                        value={formData.b2bTabelaId ? String(formData.b2bTabelaId) : ''}
                        onValueChange={(v) => setFormData({ ...formData, b2bTabelaId: Number(v) || 0 })}
                      >
                        <SelectTrigger className="h-8 text-sm w-44">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {tabelas.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {getTabelaLabel(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="border-t pt-4 mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs. Comercial</label>
                    <Textarea
                      className="min-h-[80px] text-sm"
                      value={formData.observacaoComercial}
                      onChange={(e) => setFormData({ ...formData, observacaoComercial: toUpperValue(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs. Financeiro</label>
                    <Textarea
                      className="min-h-[80px] text-sm"
                      value={formData.observacaoFinanceiro}
                      onChange={(e) => setFormData({ ...formData, observacaoFinanceiro: toUpperValue(e.target.value) })}
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          {formErrors.length > 0 && (
            <div className="text-sm text-destructive mt-2 space-y-1">
              {formErrors.map((err, index) => (
                <div key={`${err}-${index}`}>{err}</div>
              ))}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={formLoading}>Cancelar</Button>
            <Button onClick={submitCreate} disabled={formLoading}>{formLoading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client - mesmo layout */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Carregando dados do cliente...</div>
          ) : (
            <Tabs defaultValue="identificacao" className="flex-1 min-h-0 flex flex-col">
              <TabsList className="w-auto">
                <TabsTrigger value="identificacao">Identificação</TabsTrigger>
                <TabsTrigger value="comerciais">Dados Comerciais</TabsTrigger>
                <TabsTrigger value="complementares">Dados complementares</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4 px-2 pb-2">
                {/* Identificação */}
                <TabsContent value="identificacao" className="m-0 space-y-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">CNPJ / CPF *</label>
                    <div className="flex gap-1">
                        <Input className="h-8 text-sm flex-1" value={formData.cnpjCpf} onChange={(e) => setFormData({ ...formData, cnpjCpf: toUpperValue(e.target.value) })} />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => cnpjLookupRef.current?.(formData.cnpjCpf)}
                          disabled={cnpjLookupLoading}
                        >
                          {cnpjLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
                      <Input className="h-8 text-sm bg-muted" value={formData.codigoCliente} readOnly />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Checkbox checked={formData.inativo} onCheckedChange={(c) => setFormData({ ...formData, inativo: c as boolean })} />
                      <label className="text-sm">Cliente Inativo</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-9">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Razão Social/Nome *</label>
                      <Input className="h-8 text-sm" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: toUpperValue(e.target.value) })} />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Checkbox />
                      <label className="text-sm">Simples nacional</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-9">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome Fantasia</label>
                      <Input className="h-8 text-sm" value={formData.fantasia} onChange={(e) => setFormData({ ...formData, fantasia: toUpperValue(e.target.value) })} />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Checkbox />
                      <label className="text-sm">Consumidor final</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. estadual</label>
                      <Input className="h-8 text-sm" value={formData.inscEstadual} onChange={(e) => setFormData({ ...formData, inscEstadual: toUpperValue(e.target.value) })} />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. municipal</label>
                      <Input className="h-8 text-sm" value={formData.inscMunicipal} onChange={(e) => setFormData({ ...formData, inscMunicipal: toUpperValue(e.target.value) })} />
                    </div>
                    <div className="col-span-3">
                      <Select defaultValue="contribuinte">
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="contribuinte">Contribuinte ICM</SelectItem>
                          <SelectItem value="nao">Não contribuinte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Suframa</label>
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    </div>
                  </div>

                  <div className="border-b border-primary/50 pb-1 mt-4">
                    <span className="text-sm font-medium text-primary">Endereço</span>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Cep *</label>
                      <div className="flex gap-1">
                        <Input
                          className="h-8 text-sm"
                          value={formData.cep}
                          onChange={(e) => {
                            const next = formatCep(e.target.value);
                            setFormData({ ...formData, cep: next });
                            cepLookupRef.current?.(next);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => cepLookupRef.current?.(formData.cep)}
                          disabled={cepLookupLoading}
                        >
                          {cepLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-9">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço *</label>
                      <Input className="h-8 text-sm" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: toUpperValue(e.target.value) })} />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
                      <Input className="h-8 text-sm" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: toUpperValue(e.target.value) })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">UF *</label>
                      <Select
                        value={formData.uf}
                        onValueChange={(v) => setFormData({ ...formData, uf: toUpperValue(v), cidade: '', cidadeId: 0 })}
                        disabled={ufsLoading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {ufsApi.map(u => (
                            <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-5">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade *</label>
                      <Select
                        value={formData.cidadeId ? String(formData.cidadeId) : ''}
                        onValueChange={(v) => {
                          const cid = cidadesApi.find(c => String(c.cidade_id) === v);
                          setFormData({ ...formData, cidadeId: parseInt(v) || 0, cidade: toUpperValue(cid?.nome_cidade || '') });
                        }}
                        disabled={cidadesLoading || !formData.uf}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={cidadesLoading ? 'Carregando...' : (formData.uf ? 'Selecione' : 'Selecione UF')} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 max-h-60">
                          {cidadesApi.map(c => (
                            <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro *</label>
                    </div>
                    <div className="col-span-3">
                      <Input className="h-8 text-sm" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: toUpperValue(e.target.value) })} />
                    </div>
                  </div>

                  <FormField label="Complem." value={formData.complemento} onChange={(v) => setFormData({ ...formData, complemento: toUpperValue(v) })} className="max-w-md" />

                  <div className="border-b border-primary/50 pb-1 mt-4">
                    <span className="text-sm font-medium text-primary">Telefones</span>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Fixo *</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })} />
                  </div>
                </div>

                  <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} className="max-w-lg" upperCase={false} />
                  <FormField label="Email Danfe" value={formData.emailDanfe} onChange={(v) => setFormData({ ...formData, emailDanfe: v })} className="max-w-lg" upperCase={false} />
                  <FormField label="Site" value={formData.site} onChange={(v) => setFormData({ ...formData, site: v })} className="max-w-lg" upperCase={false} />

                  <div className="max-w-lg">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Rota entrega *</label>
                    <Select value={formData.rotaId ? String(formData.rotaId) : ''} onValueChange={(v) => setFormData({ ...formData, rotaId: parseInt(v) || 0 })} disabled={rotasLoading}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={rotasLoading ? 'Carregando...' : 'Selecione'} /></SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="0">Nenhuma</SelectItem>
                        {rotas.map((rota) => (
                          <SelectItem key={rota.id} value={String(rota.id)}>{rota.codigo_rota ? `${rota.codigo_rota} - ${rota.label}` : rota.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                {/* Dados Complementares */}
                <TabsContent value="complementares" className="m-0 space-y-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Proprietário</label>
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Aniversário</label>
                      <Input type="date" className="h-8 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CPF</label>
                      <Input className="h-8 text-sm" onChange={handleCpfChange} />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">RG</label>
                      <Input className="h-8 text-sm" value={formData.rg} onChange={(e) => setFormData({ ...formData, rg: formatRg(e.target.value) })} />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Início de atividade</label>
                      <Input type="date" className="h-8 text-sm" />
                    </div>
                  </div>

                  <div className="border-b border-primary/50 pb-1 mt-4">
                    <span className="text-sm font-medium text-primary">Referências</span>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Banco</label>
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Conta</label>
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    </div>
                    <div className="col-span-4">
                      <Input className="h-8 text-sm" placeholder="Agência" onChange={handleUpperChange} />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-start mt-4">
                    <div className="col-span-6 space-y-2">
                      <label className="text-xs font-medium text-muted-foreground block">Referências Comerciais</label>
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    </div>
                    <div className="col-span-6 space-y-2">
                      <label className="text-xs font-medium text-muted-foreground block">Sócios</label>
                      <div className="flex gap-2">
                        <Input className="h-8 text-sm flex-1" onChange={handleUpperChange} />
                        <Input type="number" className="h-8 text-sm w-16 text-right" defaultValue={0} />
                      </div>
                      <div className="flex gap-2">
                        <Input className="h-8 text-sm flex-1" onChange={handleUpperChange} />
                        <Input type="number" className="h-8 text-sm w-16 text-right" defaultValue={0} />
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-primary/50 pb-1 mt-4">
                    <span className="text-sm font-medium text-primary">Cobrança</span>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-8">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    </div>
                  </div>
                </TabsContent>

                {/* Dados Comerciais */}
                <TabsContent value="comerciais" className="m-0 space-y-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contatos</label>
                      <Input className="h-8 text-sm" value={formData.contato1Nome} onChange={(e) => setFormData({ ...formData, contato1Nome: toUpperValue(e.target.value) })} />
                  </div>
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                      <Input className="h-8 text-sm" placeholder="( )" value={formData.contato1Celular} onChange={(e) => setFormData({ ...formData, contato1Celular: formatPhone(e.target.value) })} />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Aniversário</label>
                      <Input type="date" className="h-8 text-sm" value={formData.contato1Aniversario} onChange={(e) => setFormData({ ...formData, contato1Aniversario: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                      <Input className="h-8 text-sm" value={formData.contato2Nome} onChange={(e) => setFormData({ ...formData, contato2Nome: toUpperValue(e.target.value) })} />
                  </div>
                    <div className="col-span-3">
                      <Input className="h-8 text-sm" placeholder="( )" value={formData.contato2Celular} onChange={(e) => setFormData({ ...formData, contato2Celular: formatPhone(e.target.value) })} />
                    </div>
                    <div className="col-span-4">
                      <Input type="date" className="h-8 text-sm" value={formData.contato2Aniversario} onChange={(e) => setFormData({ ...formData, contato2Aniversario: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end mt-4">
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Segmentos *</label>
                      <Select
                        value={formData.segmentoId ? String(formData.segmentoId) : ''}
                        onValueChange={(v) => setFormData({ ...formData, segmentoId: parseInt(v) || 0 })}
                        disabled={segmentosLoading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={segmentosLoading ? 'Carregando...' : 'Selecione'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {segmentos.map((segmento) => (
                            <SelectItem key={segmento.id} value={String(segmento.id)}>
                              {segmento.codigo ? `${segmento.codigo} - ${segmento.descricao}` : segmento.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Checkouts</label>
                      <Input type="number" className="h-8 text-sm text-right" value={formData.checkouts} onChange={(e) => setFormData({ ...formData, checkouts: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Dependência</label>
                      <Input type="number" className="h-8 text-sm text-right" defaultValue={0} />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Rede</label>
                      <Select
                        value={formData.redeId !== undefined && formData.redeId !== null ? String(formData.redeId) : ''}
                        onValueChange={(v) => setFormData({ ...formData, redeId: parseInt(v) || 0 })}
                        disabled={redesLoading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={redesLoading ? 'Carregando...' : 'Selecione'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="0">Nenhuma</SelectItem>
                          {redes.map((rede) => (
                            <SelectItem key={rede.id} value={String(rede.id)}>
                              {rede.codigo ? `${rede.codigo} - ${rede.descricao}` : rede.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Tabela de preços *</label>
                      <Dialog open={tabelaSearchOpen && editOpen} onOpenChange={onTabelaDialogChange}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start h-8 text-sm">
                            {tabelaSummary}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Selecionar tabelas de preço</DialogTitle>
                          </DialogHeader>
                          <Input
                            placeholder="Buscar tabela..."
                            value={tabelaSearch}
                            onChange={(e) => setTabelaSearch(e.target.value)}
                            autoFocus
                          />
                          <ScrollArea className="h-64 mt-2">
                            {tabelasLoading ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">Carregando tabelas...</div>
                            ) : tabelas.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma tabela disponível</div>
                            ) : filteredTabelas.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma tabela encontrada</div>
                            ) : (
                              <div className="space-y-1">
                                {filteredTabelas.map((t) => {
                                  const tId = Number(t.id);
                                  const checked = formData.tabelaIds.includes(tId);
                                  const label = getTabelaLabel(t);
                                  return (
                                    <label
                                      key={t.id}
                                      className={cn('flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer', checked && 'bg-muted')}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) => toggleTabelaId(tId, value === true)}
                                      />
                                      <span>{label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </ScrollArea>
                          <DialogFooter>
                            <Button onClick={() => onTabelaDialogChange(false)}>Confirmar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Representante *</label>
                      <Dialog open={repSearchOpen && editOpen} onOpenChange={setRepSearchOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start h-8 text-sm">
                            {representanteSummary}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Buscar Representante</DialogTitle>
                          </DialogHeader>
                          <Input
                            placeholder="Digite nome ou código..."
                            value={repSearch}
                            onChange={(e) => setRepSearch(e.target.value)}
                            autoFocus
                          />
                          <ScrollArea className="h-64 mt-2" onScrollCapture={(e) => {
                            const el = e.currentTarget;
                            if (repHasMore && !loadingReps && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                              loadReps(false);
                            }
                          }}>
                            {loadingReps ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">Carregando representantes...</div>
                            ) : repsError ? (
                              <div className="py-6 text-center text-sm text-red-600">{repsError}</div>
                          ) : representatives.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Nenhum representante encontrado</div>
                          ) : (
                            <div className="space-y-1">
                              {representatives.map((r) => {
                                const repId = String(r.codigoRepresentante || r.id);
                                const repNome = toUpperValue(r.nome);
                                const checked = formData.representantes.some((rep) => rep.id === repId);
                                return (
                                  <label
                                    key={r.id}
                                    className={cn('flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer', checked && 'bg-muted')}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        const isChecked = value === true;
                                        setFormData((prev) => {
                                          const exists = prev.representantes.some((rep) => rep.id === repId);
                                          const nextRepresentantes = isChecked && !exists
                                            ? [...prev.representantes, { id: repId, nome: repNome }]
                                            : (!isChecked && exists
                                              ? prev.representantes.filter((rep) => rep.id !== repId)
                                              : prev.representantes);
                                          return { ...prev, representantes: nextRepresentantes };
                                        });
                                      }}
                                    />
                                    <span>{`${r.codigoRepresentante || r.id} - ${repNome}`}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          </ScrollArea>
                          <DialogFooter>
                            <Button onClick={() => setRepSearchOpen(false)}>Confirmar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo máximo liberado</label>
                      <Select
                        value={formData.prazo}
                        onValueChange={(v) => {
                          const match =
                            prazos.find((p) => p.descricao === v) ||
                            prazos.find((p) => String(p.codigo || '').trim() === String(v).trim());
                          setFormData({ ...formData, prazo: v, prazoPagtoId: match ? ensurePositiveId(match.id, 0) : 0 });
                        }}
                        disabled={prazosLoading || !!prazosError}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={prazosLoading ? 'Carregando...' : prazosError ? 'Erro ao carregar' : 'Selecione'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {prazos.map((p) => (
                            <SelectItem key={`${p.id}-${p.codigo || p.descricao}`} value={String(p.descricao)}>
                              {p.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 flex items-center gap-2 pt-5">
                      <Checkbox checked={formData.boleto} onCheckedChange={(c) => setFormData({ ...formData, boleto: c as boolean })} />
                      <label className="text-sm">Boleto bancário</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">% Desconto máximo na nota fiscal</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          className="h-8 text-sm text-right"
                          value={formData.descontoFinanceiroBoleto}
                          onChange={(e) => setFormData({ ...formData, descontoFinanceiroBoleto: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-sm">(%)</span>
                      </div>
                    </div>
                    <div className="col-span-6" />
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Crédito</label>
                      <Input
                        type="number"
                        className="h-8 text-sm text-right"
                        value={formData.credito}
                        onChange={(e) => setFormData({ ...formData, credito: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Aberto</label>
                      <Input
                        type="number"
                        className="h-8 text-sm text-right"
                        value={formData.aberto}
                        onChange={(e) => setFormData({ ...formData, aberto: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Disponível</label>
                      <Input
                        type="number"
                        className="h-8 text-sm text-right"
                        value={formData.disponivel}
                        onChange={(e) => setFormData({ ...formData, disponivel: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center mt-4">
                    <div className="col-span-12 flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.b2bLiberado}
                          onCheckedChange={(c) => setFormData({ ...formData, b2bLiberado: c as boolean })}
                        />
                        <label className="text-sm">Liberado venda no B2B</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Senha B2B</label>
                        <Input
                          className="h-8 text-sm w-32"
                          value={formData.b2bSenha}
                          onChange={(e) => setFormData({ ...formData, b2bSenha: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Tabela B2B</label>
                        <Select
                          value={formData.b2bTabelaId ? String(formData.b2bTabelaId) : ''}
                          onValueChange={(v) => setFormData({ ...formData, b2bTabelaId: Number(v) || 0 })}
                        >
                          <SelectTrigger className="h-8 text-sm w-44"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {tabelas.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {getTabelaLabel(t)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs. Comercial</label>
                      <Textarea className="min-h-[80px] text-sm" value={formData.observacaoComercial} onChange={(e) => setFormData({ ...formData, observacaoComercial: toUpperValue(e.target.value) })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs. Financeiro</label>
                      <Textarea className="min-h-[80px] text-sm" value={formData.observacaoFinanceiro} onChange={(e) => setFormData({ ...formData, observacaoFinanceiro: toUpperValue(e.target.value) })} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
          {formErrors.length > 0 && (
            <div className="text-sm text-destructive mt-2 space-y-1">
              {formErrors.map((err, index) => (
                <div key={`${err}-${index}`}>{err}</div>
              ))}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={formLoading}>Cancelar</Button>
            <Button onClick={submitEdit} disabled={formLoading}>{formLoading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientInfoModal
        open={clientInfoOpen}
        onOpenChange={setClientInfoOpen}
        clienteId={clientInfoId}
      />
    </div>
  );
};
