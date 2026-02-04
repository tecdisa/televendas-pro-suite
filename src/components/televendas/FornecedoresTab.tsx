import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Truck, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { clientsService } from '@/services/clientsService';
import { metadataService, Uf, Cidade } from '@/services/metadataService';
import { ScrollArea } from '@/components/ui/scroll-area';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();
const normalizeCityKey = (value: string | null | undefined) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
const debounce = <T extends (...args: any[]) => void>(fn: T, wait = 300) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};
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
const formatCep = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};
const formatCnpj = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 14);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const normalizeCnpj = (v: string) => String(v ?? '').replace(/\D+/g, '').slice(0, 14);
const normalizeCep = (v: string) => String(v ?? '').replace(/\D+/g, '').slice(0, 8);

const initialFormData = {
  codigo_fornecedor: '',
  cnpj_cpf: '',
  nome_fornecedor: '',
  fantasia: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  uf: '',
  cidade_id: 0,
  cep: '',
  fone: '',
  contato: '',
  email: '',
  whatsapp: '',
  site: '',
  empresas_autorizadas: '',
  obs: '',
  inativo: false,
  revenda: false,
};

export function FornecedoresTab() {
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  // UFs e Cidades
  const [ufsApi, setUfsApi] = useState<Uf[]>([]);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [cidadesApi, setCidadesApi] = useState<Cidade[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);

  const loadFornecedores = async () => {
    setLoading(true);
    try {
      const result = await suppliersService.getAll(search);
      setFornecedores(result.data);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
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
    if (!uf) {
      setCidadesApi([]);
      return;
    }
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

  const resolveCidadeId = async (uf: string, nomeCidade?: string) => {
    if (!uf) return 0;
    try {
      const cidades = await metadataService.getCidadesPorUf(uf);
      setCidadesApi(cidades);
      if (!nomeCidade) return 0;
      const target = normalizeCityKey(nomeCidade);
      if (!target) return 0;
      const match = cidades.find((c) => normalizeCityKey(c.nome_cidade) === target);
      return match ? Number(match.cidade_id) || 0 : 0;
    } catch (e) {
      return 0;
    }
  };

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
        const ufValue = toUpperValue(estadoObj.sigla || estab.uf || d.uf || '');
        const cidadeNome = cidadeObj.nome || estab.municipio || d.municipio || '';
        const cidadeId = ufValue ? await resolveCidadeId(ufValue, cidadeNome) : 0;
        setFormData((prev) => {
          const enderecoFmt = [tipoLogradouro, logradouro].filter(Boolean).join(' ') || d.logradouro || prev.endereco;
          const complemento = estab.complemento ? String(estab.complemento).trim() : prev.complemento;
          const telefone1 = estab.telefone1 ? String(estab.telefone1).trim() : '';
          const ddd1 = estab.ddd1 ? String(estab.ddd1).trim() : '';
          const telefoneFmt = [ddd1, telefone1].filter(Boolean).join('');
          const nextCep = cepValue || normalizeCep(String(prev.cep));
          return {
            ...prev,
            cnpj_cpf: cleaned,
            nome_fornecedor: toUpperValue(d.razao_social || prev.nome_fornecedor),
            fantasia: toUpperValue(d.nome_fantasia || estab.nome_fantasia || prev.fantasia),
            endereco: toUpperValue(enderecoFmt || d.logradouro || prev.endereco),
            numero: toUpperValue(estab.numero || d.numero || prev.numero || ''),
            bairro: toUpperValue(estab.bairro || d.bairro || prev.bairro),
            uf: ufValue || prev.uf,
            cep: formatCep(nextCep),
            complemento: toUpperValue(complemento),
            fone: formatPhone(telefoneFmt || prev.fone),
            email: estab.email || prev.email,
            cidade_id: cidadeId || prev.cidade_id,
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
        const ufValue = data.uf ? toUpperValue(data.uf) : '';
        const cidadeNome = data.localidade ? String(data.localidade) : '';
        const cidadeId = ufValue ? await resolveCidadeId(ufValue, cidadeNome) : 0;
        setFormData((prev) => ({
          ...prev,
          cep: formatCep(cleaned),
          endereco: toUpperValue(data.logradouro || prev.endereco),
          complemento: toUpperValue(data.complemento || prev.complemento),
          bairro: toUpperValue(data.bairro || prev.bairro),
          uf: ufValue || prev.uf,
          cidade_id: cidadeId || prev.cidade_id,
        }));
        toast.success('Endereco preenchido pelo CEP');
      } catch (e: any) {
        toast.error('Erro na consulta de CEP');
      } finally {
        setCepLookupLoading(false);
      }
    }, 600);
  }

  useEffect(() => {
    loadFornecedores();
  }, []);

  useEffect(() => {
    if (createOpen || editOpen) {
      loadUfs();
    }
  }, [createOpen, editOpen]);

  useEffect(() => {
    if (formData.uf && (createOpen || editOpen)) {
      loadCidades(formData.uf);
    } else {
      setCidadesApi([]);
    }
  }, [formData.uf, createOpen, editOpen]);

  const handleSearch = () => loadFornecedores();
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = async (f: Fornecedor) => {
    setEditId(f.fornecedor_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await suppliersService.getById(f.fornecedor_id);
      if (detail) {
        setFormData({
          codigo_fornecedor: detail.codigo_fornecedor || '',
          cnpj_cpf: detail.cnpj_cpf || '',
          nome_fornecedor: detail.nome_fornecedor || '',
          fantasia: detail.fantasia || '',
          endereco: detail.endereco || '',
          numero: detail.numero || '',
          complemento: detail.complemento || '',
          bairro: detail.bairro || '',
          uf: detail.uf || '',
          cidade_id: detail.cidade_id || 0,
          cep: formatCep(detail.cep || ''),
          fone: formatPhone(detail.fone || ''),
          contato: detail.contato || '',
          email: detail.email || '',
          whatsapp: formatPhone(detail.whatsapp || ''),
          site: detail.site || '',
          empresas_autorizadas: detail.empresas_autorizadas || '',
          obs: detail.obs || '',
          inativo: detail.inativo || false,
          revenda: detail.revenda || false,
        });
      }
    } catch (e) {
      toast.error('Erro ao carregar dados do fornecedor');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nome_fornecedor.trim() || !formData.cnpj_cpf.trim()) {
      toast.error('Preencha os campos obrigatórios: CNPJ/CPF e Nome');
      return;
    }
    setFormLoading(true);
    try {
      await suppliersService.create({
        cnpj_cpf: normalizeCnpj(formData.cnpj_cpf),
        nome_fornecedor: formData.nome_fornecedor.trim(),
        fantasia: formData.fantasia.trim() || undefined,
        endereco: formData.endereco.trim() || undefined,
        numero: formData.numero.trim() || undefined,
        complemento: formData.complemento.trim() || undefined,
        bairro: formData.bairro.trim() || undefined,
        uf: formData.uf || undefined,
        cidade_id: formData.cidade_id || null,
        cep: normalizeCep(formData.cep) || undefined,
        fone: normalizePhoneDigits(formData.fone) || undefined,
        contato: formData.contato.trim() || undefined,
        email: formData.email.trim() || undefined,
        whatsapp: normalizePhoneDigits(formData.whatsapp) || undefined,
        site: formData.site.trim() || undefined,
        empresas_autorizadas: formData.empresas_autorizadas.trim() || undefined,
        obs: formData.obs.trim() || undefined,
        inativo: formData.inativo,
        revenda: formData.revenda,
      });
      toast.success('Fornecedor criado com sucesso');
      setCreateOpen(false);
      resetForm();
      loadFornecedores();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar fornecedor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setFormLoading(true);
    try {
      const codigoFornecedor = formData.codigo_fornecedor.trim();
      await suppliersService.update(editId, {
        ...(codigoFornecedor ? { codigo_fornecedor: codigoFornecedor } : {}),
        cnpj_cpf: normalizeCnpj(formData.cnpj_cpf),
        nome_fornecedor: formData.nome_fornecedor.trim(),
        fantasia: formData.fantasia.trim() || undefined,
        endereco: formData.endereco.trim() || undefined,
        numero: formData.numero.trim() || undefined,
        complemento: formData.complemento.trim() || undefined,
        bairro: formData.bairro.trim() || undefined,
        uf: formData.uf || undefined,
        cidade_id: formData.cidade_id || undefined,
        cep: normalizeCep(formData.cep) || undefined,
        fone: normalizePhoneDigits(formData.fone) || undefined,
        contato: formData.contato.trim() || undefined,
        email: formData.email.trim() || undefined,
        whatsapp: normalizePhoneDigits(formData.whatsapp) || undefined,
        site: formData.site.trim() || undefined,
        empresas_autorizadas: formData.empresas_autorizadas.trim() || undefined,
        obs: formData.obs.trim() || undefined,
        inativo: formData.inativo,
        revenda: formData.revenda,
      });
      toast.success('Fornecedor atualizado com sucesso');
      setEditOpen(false);
      resetForm();
      loadFornecedores();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar fornecedor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    setDeleteLoading(id);
    try {
      await suppliersService.delete(id);
      toast.success('Fornecedor excluído com sucesso');
      loadFornecedores();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir fornecedor');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formContent = (
    <Tabs defaultValue="identificacao" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="identificacao">Identificação</TabsTrigger>
        <TabsTrigger value="complementar">Dados Complementares</TabsTrigger>
      </TabsList>

      <TabsContent value="identificacao" className="m-0 space-y-4 mt-4">
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">CNPJ/CPF *</label>
            <div className="flex gap-1">
              <Input
                className="h-8 text-sm"
                value={formData.cnpj_cpf}
                onChange={(e) => {
                  const next = e.target.value;
                  setFormData({ ...formData, cnpj_cpf: next });
                  cnpjLookupRef.current?.(next);
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => cnpjLookupRef.current?.(formData.cnpj_cpf)}
                disabled={cnpjLookupLoading}
              >
                {cnpjLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="col-span-4 flex items-center gap-4 pt-5">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.inativo}
                onCheckedChange={(c) => setFormData({ ...formData, inativo: c as boolean })}
              />
              <label className="text-sm">Inativo</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.revenda}
                onCheckedChange={(c) => setFormData({ ...formData, revenda: c as boolean })}
              />
              <label className="text-sm">Revenda</label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-9">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Razão Social *</label>
            <Input
              className="h-8 text-sm"
              value={formData.nome_fornecedor}
              onChange={(e) => setFormData({ ...formData, nome_fornecedor: toUpperValue(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-9">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Fantasia</label>
            <Input
              className="h-8 text-sm"
              value={formData.fantasia}
              onChange={(e) => setFormData({ ...formData, fantasia: toUpperValue(e.target.value) })}
            />
          </div>
        </div>

        <div className="border-b border-primary/50 pb-1 mt-4">
          <span className="text-sm font-medium text-primary">Endereço</span>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cep</label>
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
            <Input
              className="h-8 text-sm"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: toUpperValue(e.target.value) })}
            />
          </div>
          <div className="col-span-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
            <Input
              className="h-8 text-sm"
              value={formData.numero}
              onChange={(e) => setFormData({ ...formData, numero: toUpperValue(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
            <Select
              value={formData.uf}
              onValueChange={(v) => setFormData({ ...formData, uf: toUpperValue(v), cidade_id: 0 })}
              disabled={ufsLoading}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {ufsApi.map((uf) => (
                  <SelectItem key={uf.uf} value={uf.uf}>{uf.uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-5">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
            <Select
              value={formData.cidade_id ? String(formData.cidade_id) : ''}
              onValueChange={(v) => setFormData({ ...formData, cidade_id: Number(v) })}
              disabled={cidadesLoading || !formData.uf}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={cidadesLoading ? 'Carregando...' : (formData.uf ? 'Selecione' : 'Selecione UF')} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-60">
                {cidadesApi.map((c) => (
                  <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
          </div>
          <div className="col-span-3">
            <Input
              className="h-8 text-sm"
              value={formData.bairro}
              onChange={(e) => setFormData({ ...formData, bairro: toUpperValue(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Complemento</label>
            <Input
              className="h-8 text-sm"
              value={formData.complemento}
              onChange={(e) => setFormData({ ...formData, complemento: toUpperValue(e.target.value) })}
            />
          </div>
        </div>

        <div className="border-b border-primary/50 pb-1 mt-4">
          <span className="text-sm font-medium text-primary">Telefones</span>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
            <Input
              className="h-8 text-sm"
              value={formData.fone}
              onChange={(e) => setFormData({ ...formData, fone: formatPhone(e.target.value) })}
            />
          </div>
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
            <Input
              className="h-8 text-sm"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
            />
          </div>
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Contato</label>
            <Input
              className="h-8 text-sm"
              value={formData.contato}
              onChange={(e) => setFormData({ ...formData, contato: toUpperValue(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
            <Input
              className="h-8 text-sm"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
            />
          </div>
          <div className="col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Site</label>
            <Input
              className="h-8 text-sm"
              value={formData.site}
              onChange={(e) => setFormData({ ...formData, site: e.target.value.toLowerCase() })}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="complementar" className="m-0 space-y-4 mt-4">
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-12">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresas Autorizadas</label>
            <Input
              className="h-8 text-sm"
              placeholder="Ex: 1,2,3"
              value={formData.empresas_autorizadas}
              onChange={(e) => setFormData({ ...formData, empresas_autorizadas: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
            <Textarea
              className="text-sm min-h-[80px]"
              value={formData.obs}
              onChange={(e) => setFormData({ ...formData, obs: toUpperValue(e.target.value) })}
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Fornecedores
            </CardTitle>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Buscar por nome, código ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="sm:inline">Buscar</span>
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Fantasia</TableHead>
                    <TableHead className="hidden sm:table-cell">CNPJ/CPF</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : fornecedores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum fornecedor encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    fornecedores.map((f) => (
                      <TableRow key={f.fornecedor_id} className={f.inativo ? 'opacity-50' : ''}>
                        <TableCell className="font-mono text-xs">{f.codigo_fornecedor || '-'}</TableCell>
                        <TableCell className="font-medium">{f.nome_fornecedor}</TableCell>
                        <TableCell className="hidden md:table-cell">{f.fantasia || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-xs">{formatCnpj(f.cnpj_cpf || '')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(f.fornecedor_id)}
                              disabled={deleteLoading === f.fornecedor_id}
                            >
                              {deleteLoading === f.fornecedor_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {formContent}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.nome_fornecedor ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-4">
              {formContent}
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
