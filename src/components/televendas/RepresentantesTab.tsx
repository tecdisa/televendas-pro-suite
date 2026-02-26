import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserCheck, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { representativesService, Representante, RepresentanteFormData } from '@/services/representativesService';
import { metadataService, Uf, Cidade } from '@/services/metadataService';
import { clientsService } from '@/services/clientsService';
import { RepresentantesPastasTab } from '@/components/televendas/RepresentantesPastasTab';

const debounce = <T extends (...args: any[]) => void>(fn: T, wait = 300) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const normalizeCnpj = (value: string) => value.replace(/\D/g, '').slice(0, 14);
const normalizeCep = (value: string) => value.replace(/\D/g, '').slice(0, 8);

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

const maskPhone = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
};

const maskCep = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d{0,3})/, '$1-$2').trim();
};

const maskCnpjCpf = (v: string) => {
  const digits = v.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '');
  }
  return digits.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/-$/, '');
};

const formatObjetivo = (value: number | null | undefined) =>
  Number(value ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const initialFormData: RepresentanteFormData = {
  codigo_representante: '',
  nome_representante: '',
  cnpj_cpf: '',
  fantasia: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade_id: null,
  uf: '',
  cep: '',
  fone: '',
  whatsapp: '',
  email: '',
  data_nascimento: null,
  supervisor: '',
  gerente: '',
  comissao: 0,
  objetivo_de_venda: 0,
  limite_de_troca: 0,
  setor_id: null,
  rotas_liberadas: '',
  liberado_debito_credito: false,
  bloqueia_alteracao_agenda: false,
  quantidade_maxima_pedidos_retidos_para_sincronizar: 0,
  observacao: '',
  inativo: false,
};

export function RepresentantesTab() {
  const PAGE_LIMIT = 100;
  const [loading, setLoading] = useState(false);
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [sectionTab, setSectionTab] = useState<'pesquisa' | 'pastas'>('pesquisa');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState<RepresentanteFormData>(initialFormData);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pendingClose, setPendingClose] = useState<'create' | 'edit' | null>(null);
  const formSnapshotRef = useRef<string>(JSON.stringify(initialFormData));
  const setFormSnapshot = (data: RepresentanteFormData) => {
    formSnapshotRef.current = JSON.stringify(data);
  };
  const isFormDirty = () => JSON.stringify(formData) !== formSnapshotRef.current;
  const closeDialog = (type: 'create' | 'edit') => {
    if (type === 'create') setCreateOpen(false);
    else setEditOpen(false);
  };
  const requestCloseDialog = (type: 'create' | 'edit') => {
    if (isFormDirty()) {
      setPendingClose(type);
      setShowConfirmClose(true);
      return;
    }
    closeDialog(type);
  };
  const handleDialogOpenChange = (type: 'create' | 'edit') => (nextOpen: boolean) => {
    if (!nextOpen) {
      requestCloseDialog(type);
      return;
    }
    if (type === 'create') setCreateOpen(true);
    else setEditOpen(true);
  };
  const handleConfirmClose = () => {
    if (pendingClose) closeDialog(pendingClose);
    setPendingClose(null);
    setShowConfirmClose(false);
  };
  const handleCancelClose = () => {
    setPendingClose(null);
    setShowConfirmClose(false);
  };

  // UFs e Cidades
  const [ufsApi, setUfsApi] = useState<Uf[]>([]);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [cidadesApi, setCidadesApi] = useState<Cidade[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [pendingCidadeNome, setPendingCidadeNome] = useState<string>(''); // Para auto-match após carregar cidades

  const normalizeCityKey = (value: string | null | undefined) =>
    String(value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toUpperCase();

  // CNPJ Lookup
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
        const nextUf = toUpperValue(estadoObj.sigla || estab.uf || d.uf || '');
        const cidadeNome = toUpperValue(cidadeObj.nome || estab.municipio || d.municipio || '');
        const cidadeIdRaw = (cidadeObj as any)?.id ?? (cidadeObj as any)?.cidade_id ?? (cidadeObj as any)?.cidadeId;
        const cidadeIdFromCnpj = Number(cidadeIdRaw);
        const cidadeId = Number.isFinite(cidadeIdFromCnpj) && cidadeIdFromCnpj > 0 ? cidadeIdFromCnpj : null;
        const tipoLogradouro = estab.tipo_logradouro ? String(estab.tipo_logradouro).trim() : '';
        const logradouro = estab.logradouro ? String(estab.logradouro).trim() : '';
        const cepFromCnpj = estab.cep ?? d.cep;
        const cepValue = cepFromCnpj ? normalizeCep(String(cepFromCnpj)) : '';
        const hasCep = cepValue.length === 8;
        setFormData((prev) => {
          const enderecoFmt = [tipoLogradouro, logradouro].filter(Boolean).join(' ') || d.logradouro || prev.endereco;
          const complemento = estab.complemento ? String(estab.complemento).trim() : prev.complemento;
          const telefone1 = estab.telefone1 ? String(estab.telefone1).trim() : '';
          const ddd1 = estab.ddd1 ? String(estab.ddd1).trim() : '';
          const telefoneFmt = [ddd1, telefone1].filter(Boolean).join('');
          const nextCep = cepValue || normalizeCep(String(prev.cep || ''));
          return {
            ...prev,
            cnpj_cpf: maskCnpjCpf(cleaned),
            nome_representante: toUpperValue(d.razao_social || prev.nome_representante),
            fantasia: toUpperValue(d.nome_fantasia || estab.nome_fantasia || prev.fantasia),
            endereco: toUpperValue(enderecoFmt || d.logradouro || prev.endereco),
            numero: toUpperValue(estab.numero || d.numero || prev.numero || ''),
            bairro: toUpperValue(estab.bairro || d.bairro || prev.bairro),
            uf: nextUf || prev.uf,
            cep: maskCep(nextCep),
            complemento: toUpperValue(complemento),
            fone: maskPhone(telefoneFmt || prev.fone || ''),
            email: estab.email || prev.email,
            // Igual ao cadastro de clientes: já seta o cidade_id vindo da consulta
            cidade_id: cidadeId,
          };
        });
        // Sempre tenta casar por nome quando as cidades carregarem (cidade_id externo pode não bater)
        if (cidadeNome) {
          setPendingCidadeNome(cidadeNome);
        } else {
          setPendingCidadeNome('');
        }
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

  // CEP Lookup
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
          toast.error('CEP não encontrado');
          return;
        }
        const cidadeNomeCep = data.localidade ? toUpperValue(data.localidade) : '';
        setFormData((prev) => ({
          ...prev,
          cep: maskCep(cleaned),
          endereco: toUpperValue(data.logradouro || prev.endereco),
          complemento: toUpperValue(data.complemento || prev.complemento),
          bairro: toUpperValue(data.bairro || prev.bairro),
          uf: data.uf ? toUpperValue(data.uf) : prev.uf,
          cidade_id: data.localidade || data.uf ? null : prev.cidade_id,
        }));
        if (cidadeNomeCep) {
          setPendingCidadeNome(cidadeNomeCep);
        }
        toast.success('Endereço preenchido pelo CEP');
      } catch (e: any) {
        toast.error('Erro na consulta de CEP');
      } finally {
        setCepLookupLoading(false);
      }
    }, 600);
  }

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

  const loadRepresentantes = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) {
      setRepresentantes([]);
      setPage(1);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await representativesService.getAll(search, nextPage, PAGE_LIMIT, filtroStatus);
      setRepresentantes((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(result.page ?? nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error: any) {
      console.error('Erro ao carregar representantes:', error);
      toast.error(error?.message || 'Erro ao carregar representantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepresentantes(true);
  }, [filtroStatus]);

  // Carregar UFs quando abrir os dialogs de criação/edição
  useEffect(() => {
    if (createOpen || editOpen) {
      loadUfs();
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

  // Auto-seleciona cidade pelo nome quando as cidades são carregadas (após CNPJ lookup)
  useEffect(() => {
    if (cidadesApi.length === 0) return;
    
    // Se já tem cidade_id válida e está na lista, não precisa fazer nada
    if (formData.cidade_id) {
      const idMatch = cidadesApi.some(c => c.cidade_id === formData.cidade_id);
      if (idMatch) {
        setPendingCidadeNome('');
        return;
      }
    }
    
    // Tenta match pelo nome da cidade pendente
    if (!pendingCidadeNome) return;
    const target = normalizeCityKey(pendingCidadeNome);
    if (!target) return;
    
    const match = cidadesApi.find(c => normalizeCityKey(c.nome_cidade) === target);
    if (match) {
      setFormData(prev => ({
        ...prev,
        cidade_id: match.cidade_id,
      }));
      setPendingCidadeNome('');
    }
  }, [cidadesApi, formData.cidade_id, pendingCidadeNome]);

  const handleSearch = () => loadRepresentantes(true);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const resetForm = (updateSnapshot = false) => {
    const nextData = { ...initialFormData };
    setFormData(nextData);
    setEditId(null);
    setPendingCidadeNome('');
    if (updateSnapshot) setFormSnapshot(nextData);
  };

  const openCreate = () => {
    resetForm(true);
    setCreateOpen(true);
  };

  const openEdit = async (r: Representante) => {
    setEditId(r.representante_id);
    setPendingCidadeNome('');
    setFormSnapshot(formData);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await representativesService.getById(r.representante_id);
      if (detail) {
        const nextData: RepresentanteFormData = {
          codigo_representante: detail.codigo_representante || '',
          nome_representante: detail.nome_representante || '',
          cnpj_cpf: detail.cnpj_cpf || '',
          fantasia: detail.fantasia || '',
          endereco: detail.endereco || '',
          numero: detail.numero || '',
          complemento: detail.complemento || '',
          bairro: detail.bairro || '',
          cidade_id: detail.cidade_id ?? null,
          uf: detail.uf || '',
          cep: detail.cep || '',
          fone: detail.fone || '',
          whatsapp: detail.whatsapp || '',
          email: detail.email || '',
          data_nascimento: detail.data_nascimento || null,
          supervisor: detail.supervisor || '',
          gerente: detail.gerente || '',
          comissao: detail.comissao ?? 0,
          objetivo_de_venda: detail.objetivo_de_venda ?? 0,
          limite_de_troca: detail.limite_de_troca ?? 0,
          setor_id: detail.setor_id ?? null,
          rotas_liberadas: detail.rotas_liberadas || '',
          liberado_debito_credito: detail.liberado_debito_credito ?? false,
          bloqueia_alteracao_agenda: detail.bloqueia_alteracao_agenda ?? false,
          quantidade_maxima_pedidos_retidos_para_sincronizar: detail.quantidade_maxima_pedidos_retidos_para_sincronizar ?? 0,
          observacao: detail.observacao || '',
          inativo: detail.inativo ?? false,
        };
        setFormData(nextData);
        setFormSnapshot(nextData);
      }
    } catch (e: any) {
      toast.error('Erro ao carregar dados do representante');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nome_representante.trim()) {
      toast.error('Preencha o campo obrigatório: Nome');
      return;
    }
    setFormLoading(true);
    try {
      await representativesService.create(formData);
      toast.success('Representante criado com sucesso');
      setCreateOpen(false);
      resetForm();
      loadRepresentantes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar representante');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!formData.nome_representante.trim()) {
      toast.error('Preencha o campo obrigatório: Nome');
      return;
    }
    setFormLoading(true);
    try {
      await representativesService.update(editId, formData);
      toast.success('Representante atualizado com sucesso');
      setEditOpen(false);
      resetForm();
      loadRepresentantes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar representante');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este representante?')) return;
    setDeleteLoading(id);
    try {
      await representativesService.delete(id);
      toast.success('Representante excluído com sucesso');
      loadRepresentantes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir representante');
    } finally {
      setDeleteLoading(null);
    }
  };

  const isInitialLoading = loading && representantes.length === 0;
  const isLoadingMore = loading && representantes.length > 0;

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadRepresentantes();
    }
  };

  const formContent = (
    <Tabs defaultValue="identificacao" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="identificacao">Identificação</TabsTrigger>
        <TabsTrigger value="endereco">Endereço</TabsTrigger>
        <TabsTrigger value="config">Configurações</TabsTrigger>
      </TabsList>

      <TabsContent value="identificacao" className="space-y-4 mt-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
            <Input
              className="h-8 text-sm bg-muted"
              value={formData.codigo_representante}
              readOnly
            />
          </div>
          <div className="col-span-9">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
            <Input
              className="h-8 text-sm"
              value={formData.nome_representante}
              onChange={(e) => setFormData({ ...formData, nome_representante: toUpperValue(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">CPF/CNPJ</label>
            <div className="flex gap-1">
              <Input
                className="h-8 text-sm flex-1"
                value={formData.cnpj_cpf}
                onChange={(e) => {
                  const next = maskCnpjCpf(e.target.value);
                  setFormData({ ...formData, cnpj_cpf: next });
                  cnpjLookupRef.current?.(next);
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => cnpjLookupRef.current?.(formData.cnpj_cpf || '')}
                disabled={cnpjLookupLoading}
              >
                {cnpjLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="col-span-8">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Fantasia</label>
            <Input
              className="h-8 text-sm"
              value={formData.fantasia}
              onChange={(e) => setFormData({ ...formData, fantasia: toUpperValue(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
            <Input
              className="h-8 text-sm"
              value={formData.fone}
              onChange={(e) => setFormData({ ...formData, fone: maskPhone(e.target.value) })}
            />
          </div>
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
            <Input
              className="h-8 text-sm"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: maskPhone(e.target.value) })}
            />
          </div>
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Nascimento</label>
            <Input
              type="date"
              className="h-8 text-sm"
              value={formData.data_nascimento || ''}
              onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value || null })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
            <Input
              type="email"
              className="h-8 text-sm"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="endereco" className="space-y-4 mt-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
            <div className="flex gap-1">
              <Input
                className="h-8 text-sm flex-1"
                value={formData.cep}
                onChange={(e) => {
                  const next = maskCep(e.target.value);
                  setFormData({ ...formData, cep: next });
                  cepLookupRef.current?.(next);
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => cepLookupRef.current?.(formData.cep || '')}
                disabled={cepLookupLoading}
              >
                {cepLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="col-span-7">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
            <Input
              className="h-8 text-sm"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: toUpperValue(e.target.value) })}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
            <Input
              className="h-8 text-sm"
              value={formData.numero}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Complemento</label>
            <Input
              className="h-8 text-sm"
              value={formData.complemento}
              onChange={(e) => setFormData({ ...formData, complemento: toUpperValue(e.target.value) })}
            />
          </div>
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
            <Input
              className="h-8 text-sm"
              value={formData.bairro}
              onChange={(e) => setFormData({ ...formData, bairro: toUpperValue(e.target.value) })}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
            <Select
              value={formData.uf || ''}
              onValueChange={(v) => {
                setFormData({ ...formData, uf: v, cidade_id: null });
                setPendingCidadeNome('');
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
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
            <Select
              value={formData.cidade_id ? String(formData.cidade_id) : ''}
              onValueChange={(v) => setFormData({ ...formData, cidade_id: parseInt(v) || null })}
              disabled={cidadesLoading || !formData.uf}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={cidadesLoading ? '...' : (formData.uf ? 'Sel.' : 'UF')} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-60">
                {cidadesApi.map(c => (
                  <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="config" className="space-y-4 mt-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Supervisor</label>
            <Input
              className="h-8 text-sm"
              value={formData.supervisor}
              onChange={(e) => setFormData({ ...formData, supervisor: toUpperValue(e.target.value) })}
            />
          </div>
          <div className="col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Gerente</label>
            <Input
              className="h-8 text-sm"
              value={formData.gerente}
              onChange={(e) => setFormData({ ...formData, gerente: toUpperValue(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Comissão (%)</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={formData.comissao ?? ''}
              onChange={(e) => setFormData({ ...formData, comissao: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
          <div className="col-span-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Objetivo de Venda</label>
            <Input
              type="number"
              step="0.01"
              className="h-8 text-sm"
              value={formData.objetivo_de_venda ?? ''}
              onChange={(e) => setFormData({ ...formData, objetivo_de_venda: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
          <div className="col-span-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Limite de Troca</label>
            <Input
              type="number"
              step="0.01"
              className="h-8 text-sm"
              value={formData.limite_de_troca ?? ''}
              onChange={(e) => setFormData({ ...formData, limite_de_troca: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
          <div className="col-span-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Setor ID</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={formData.setor_id ?? ''}
              onChange={(e) => setFormData({ ...formData, setor_id: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Rotas Liberadas</label>
            <Input
              className="h-8 text-sm"
              value={formData.rotas_liberadas}
              onChange={(e) => setFormData({ ...formData, rotas_liberadas: e.target.value })}
              placeholder="Ex: 1,2,3"
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Máx. Pedidos Retidos</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={formData.quantidade_maxima_pedidos_retidos_para_sincronizar ?? ''}
              onChange={(e) => setFormData({ ...formData, quantidade_maxima_pedidos_retidos_para_sincronizar: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
          <div className="col-span-8 flex flex-wrap gap-4 items-end pb-1">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.liberado_debito_credito}
                onCheckedChange={(c) => setFormData({ ...formData, liberado_debito_credito: c as boolean })}
              />
              <label className="text-sm">Liberado Déb/Créd</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.bloqueia_alteracao_agenda}
                onCheckedChange={(c) => setFormData({ ...formData, bloqueia_alteracao_agenda: c as boolean })}
              />
              <label className="text-sm">Bloqueia Agenda</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.inativo}
                onCheckedChange={(c) => setFormData({ ...formData, inativo: c as boolean })}
              />
              <label className="text-sm">Inativo</label>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Observação</label>
          <Input
            className="h-8 text-sm"
            value={formData.observacao}
            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
          />
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-4">
      <Tabs value={sectionTab} onValueChange={(value) => setSectionTab(value as 'pesquisa' | 'pastas')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pesquisa">Pesquisa</TabsTrigger>
          <TabsTrigger value="pastas">Pastas</TabsTrigger>
        </TabsList>

        <TabsContent value="pesquisa" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Representantes
                </CardTitle>
                <Button onClick={openCreate} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Representante
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <Input
                  placeholder="Buscar por nome, CPF/CNPJ ou código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as 'ativos' | 'inativos' | 'todos')}>
                  <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativos">Ativo</SelectItem>
                    <SelectItem value="inativos">Inativo</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
                  <Search className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Buscar</span>
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[60vh] overflow-auto scrollbar-thin" onScroll={handleListScroll}>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Código</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="hidden md:table-cell">CPF/CNPJ</TableHead>
                          <TableHead className="hidden lg:table-cell w-12">UF</TableHead>
                          <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                          <TableHead className="hidden xl:table-cell">E-mail</TableHead>
                          <TableHead className="w-40">Objetivo venda</TableHead>
                          <TableHead className="w-20">Status</TableHead>
                          <TableHead className="w-28 text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isInitialLoading ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : representantes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              Nenhum representante encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          representantes.map((r) => (
                            <TableRow key={r.representante_id} className={r.inativo ? 'opacity-50' : ''}>
                              <TableCell className="font-mono text-xs">{r.codigo_representante || '-'}</TableCell>
                              <TableCell className="font-medium">{r.nome_representante}</TableCell>
                              <TableCell className="hidden md:table-cell text-xs">{r.cnpj_cpf || '-'}</TableCell>
                              <TableCell className="hidden lg:table-cell">{r.uf || '-'}</TableCell>
                              <TableCell className="hidden lg:table-cell text-xs">{r.fone || '-'}</TableCell>
                              <TableCell className="hidden xl:table-cell text-xs">{r.email || '-'}</TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatObjetivo(r.objetivo_de_venda)}
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs px-2 py-0.5 rounded ${r.inativo ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                                  {r.inativo ? 'Inativo' : 'Ativo'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <TooltipProvider>
                                  <div className="flex items-center justify-center gap-0.5">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Editar</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleDelete(r.representante_id)}
                                          disabled={deleteLoading === r.representante_id}
                                        >
                                          {deleteLoading === r.representante_id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Excluir</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        {isLoadingMore && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pastas" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pastas por Representante</CardTitle>
            </CardHeader>
            <CardContent>
              <RepresentantesPastasTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={handleDialogOpenChange('create')}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Representante</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => requestCloseDialog('create')}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={handleDialogOpenChange('edit')}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Representante</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.nome_representante ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            formContent
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => requestCloseDialog('edit')}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as alterações não salvas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
