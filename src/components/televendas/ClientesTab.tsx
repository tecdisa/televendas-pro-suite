import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Plus, Pencil, Trash2, Info, Search } from 'lucide-react';
import { toast } from 'sonner';
import { clientsService, Client } from '@/services/clientsService';
import { metadataService, Rota, Tabela, Uf, Cidade } from '@/services/metadataService';
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

const FormField = ({ label, value, onChange, type = 'text', className = '' }: { 
  label: string; 
  value?: string | number; 
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) => (
  <div className={className}>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    <Input 
      type={type}
      value={value ?? ''} 
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-sm" 
    />
  </div>
);

export const ClientesTab = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
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
  const [formError, setFormError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [clientInfoOpen, setClientInfoOpen] = useState(false);
  const [clientInfoId, setClientInfoId] = useState<number | null>(null);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotasLoading, setRotasLoading] = useState(false);

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

  // UFs e Cidades
  const [ufsApi, setUfsApi] = useState<Uf[]>([]);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [cidadesApi, setCidadesApi] = useState<Cidade[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);

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
    email: '',
    site: '',
    rota: '',
    rotaId: 0,
    // Comercial
    contato1Nome: '',
    contato1Celular: '',
    contato1Aniversario: '',
    contato2Nome: '',
    contato2Celular: '',
    contato2Aniversario: '',
    classe: '',
    checkouts: 0,
    nielsen: '',
    rede: '',
    tabelaId: 0,
    representanteId: '',
    representanteNome: '',
    descontoFinanceiroBoleto: 0,
    observacaoComercial: '',
    segmentoId: 1,
    // Financeiro
    credito: '',
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
      if (cleaned.length !== 14) return;
      try {
        const result = await clientsService.lookupCnpj(cleaned);
        if (!result || !result.data) return;
        const d = result.data;
        setFormData((prevState) => {
          const prev = prevState;
          const estab = d.estabelecimento ?? {};
          const cidadeObj = estab.cidade ?? {};
          const estadoObj = estab.estado ?? {};
          const tipoLogradouro = estab.tipo_logradouro ? String(estab.tipo_logradouro).trim() : '';
          const logradouro = estab.logradouro ? String(estab.logradouro).trim() : '';
          const enderecoFmt = [tipoLogradouro, logradouro].filter(Boolean).join(' ') || d.logradouro || prev.endereco;
          const complemento = estab.complemento ? String(estab.complemento).trim() : prev.complemento;
          const telefone1 = estab.telefone1 ? String(estab.telefone1).trim() : '';
          const ddd1 = estab.ddd1 ? String(estab.ddd1).trim() : '';
          const telefoneFmt = [ddd1, telefone1].filter(Boolean).join('');
          const faxFmt = estab.fax ? String(estab.fax).trim() : prev.fax;

          return {
            ...prev,
            cnpjCpf: cleaned,
            nome: d.razao_social || prev.nome,
            fantasia: d.nome_fantasia || estab.nome_fantasia || prev.fantasia,
            endereco: enderecoFmt,
            numero: estab.numero || d.numero || prev.numero || '',
            bairro: estab.bairro || d.bairro || prev.bairro,
            cidade: cidadeObj.nome || estab.municipio || d.municipio || prev.cidade,
            uf: estadoObj.sigla || estab.uf || d.uf || prev.uf,
            cep: estab.cep ? normalizeCep(String(estab.cep)) : (d.cep ? normalizeCep(String(d.cep)) : prev.cep),
            complemento,
            telefone: telefoneFmt || prev.telefone,
            fax: faxFmt,
            email: estab.email || prev.email,
            cidadeId: cidadeObj.id ?? prev.cidadeId,
          };
        });
        toast.success('Dados preenchidos pela consulta de CNPJ');
      } catch (e: any) {
        toast.error(String(e));
      }
    }, 600);
  }

  console.log('ClientesTab rendering', { clients });

  useEffect(() => {
    loadClients();
  }, []);

  // Carregar rotas, tabelas e UFs quando abrir os dialogs de criação/edição
  useEffect(() => {
    if (createOpen || editOpen) {
      loadRotas();
      loadTabelas();
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

  const loadClients = async () => {
    const data = await clientsService.search(filters.search, {
      uf: filters.uf !== 'all' ? filters.uf : undefined,
      cidade: filters.cidade !== 'all' ? filters.cidade : undefined,
      bairro: filters.bairro
    });
    setClients(data);
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

  const ufs = [...new Set(clients.map(c => c.uf))];
  const cidades = [...new Set(clients.map(c => c.cidade))];

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
  email: '',
  site: '',
  rota: '',
  rotaId: 0,
  contato1Nome: '',
  contato1Celular: '',
  contato1Aniversario: '',
  contato2Nome: '',
  contato2Celular: '',
  contato2Aniversario: '',
  classe: '',
  checkouts: 0,
  nielsen: '',
  rede: '',
  tabelaId: 0,
  representanteId: '',
  representanteNome: '',
  descontoFinanceiroBoleto: 0,
  observacaoComercial: '',
  segmentoId: 1,
  credito: '',
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
const normalizeCnpj = (v: string) => v.replace(/\D+/g, '').slice(0, 14);
const ensurePositiveId = (value: number | string | undefined | null, fallback = 1) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

  const openCreateDialog = () => {
    setFormError(null);
    setFormData(createEmptyFormData());
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setFormError(null);
    if (!formData.nome || !formData.cnpjCpf) {
      setFormError('Preencha Nome e CNPJ/CPF');
      return;
    }
    try {
      setFormLoading(true);
      await clientsService.create({
        ...formData,
        cidadeId: Number(formData.cidadeId) || 0,
        segmentoId: ensurePositiveId(formData.segmentoId),
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: ensurePositiveId(formData.formaPagtoId),
        prazoPagtoId: ensurePositiveId(formData.prazoPagtoId),
      });
      toast.success('Cliente criado com sucesso');
      setCreateOpen(false);
      setSelectedClients([]);
      loadClients();
    } catch (e: any) {
      setFormError(String(e));
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
    setFormError(null);
    setDetailLoading(true);
    setEditOpen(true);
    try {
      const detail = await clientsService.getDetail(id);
      // Try to map common fields; fallback to empty strings
        const d = detail || {};
        setFormData({
          codigoCliente: String(d.codigo_cliente ?? d.codigoCliente ?? d.codigo ?? ''),
          inativo: Boolean(d.inativo),
          cnpjCpf: String(d.cnpj_cpf ?? d.cnpjCpf ?? d.cnpj ?? d.cpf ?? ''),
        inscEstadual: String(d.inscricao_estadual ?? d.inscEstadual ?? d.insc_estadual ?? ''),
        inscMunicipal: String(d.inscricao_municipal ?? d.inscMunicipal ?? d.insc_municipal ?? ''),
        rg: String(d.rg ?? ''),
          nome: String(d.nome ?? d.razao_social ?? ''),
          fantasia: String(d.fantasia ?? ''),
          endereco: String(d.endereco ?? d.logradouro ?? ''),
          numero: String((d as any)?.numero ?? (d as any)?.num ?? ''),
          bairro: String(d.bairro ?? '').trim(),
          uf: String(d.uf ?? d.estado ?? ''),
          cidade: String(d.cidade ?? '').trim(),
        cidadeId: Number(d.cidade_id ?? d.cidadeId ?? 0),
        cep: String(d.cep ?? ''),
        complemento: String(d.complemento ?? '').trim(),
        telefone: String(d.fone ?? d.telefone ?? '').trim(),
        fax: String(d.fax ?? ''),
        email: String(d.email ?? '').trim(),
        site: String(d.site ?? ''),
        rota: String(d.rota ?? ''),
        rotaId: Number(d.rota_id ?? d.rotaId ?? 0),
        contato1Nome: String(d.contato ?? d.contatos?.[0]?.nome ?? '').trim(),
        contato1Celular: String(d.celular ?? d.contatos?.[0]?.celular ?? '').trim(),
        contato1Aniversario: String(d.contatos?.[0]?.aniversario ?? ''),
        contato2Nome: String(d.contatos?.[1]?.nome ?? ''),
        contato2Celular: String(d.contatos?.[1]?.celular ?? ''),
        contato2Aniversario: String(d.contatos?.[1]?.aniversario ?? ''),
        classe: String(d.classe ?? ''),
        checkouts: Number(d.checkouts ?? 0),
        nielsen: String(d.nielsen ?? ''),
        rede: String(d.rede_id ?? d.rede ?? ''),
        tabelaId: Number(d.tabela_id ?? d.tabelaId ?? 0),
        representanteId: String(d.representante_id ?? d.representanteId ?? d.representante?.id ?? ''),
        representanteNome: String(d.representante_nome ?? d.representanteNome ?? d.representante?.nome ?? ''),
        descontoFinanceiroBoleto: Number(d.desconto_financeiro_boleto ?? d.descontoFinanceiroBoleto ?? 0),
        observacaoComercial: String(d.observacao_comercial ?? d.observacaoComercial ?? ''),
        segmentoId: ensurePositiveId(d.segmento_id ?? d.segmentoId),
        credito: String(d.credito ?? ''),
        boleto: Boolean(d.boleto),
        prazo: String(d.prazo ?? ''),
        limite: Number(d.limite_credito ?? d.limite ?? 0),
        aberto: Number(d.aberto ?? 0),
        disponivel: Number(d.disponivel ?? 0),
        observacaoFinanceiro: String(d.observacao_financeiro ?? d.observacaoFinanceiro ?? ''),
        formaPagtoId: ensurePositiveId(d.forma_pagto_id ?? d.formaPagtoId),
        prazoPagtoId: ensurePositiveId(d.prazo_pagto_id ?? d.prazoPagtoId),
      });
    } catch (e: any) {
      setFormError(String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!editId) return;
    setFormError(null);
    try {
      setFormLoading(true);
      await clientsService.update(editId, {
        ...formData,
        cidadeId: Number(formData.cidadeId) || 0,
        segmentoId: ensurePositiveId(formData.segmentoId),
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: ensurePositiveId(formData.formaPagtoId),
        prazoPagtoId: ensurePositiveId(formData.prazoPagtoId),
      });
      toast.success('Cliente atualizado com sucesso');
      setEditOpen(false);
      setSelectedClients([]);
      loadClients();
    } catch (e: any) {
      setFormError(String(e));
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
      loadClients();
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
            <Button onClick={loadClients} size="sm">
              <Search className="h-4 w-4 mr-2" /> Filtrar
            </Button>
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
                onKeyDown={(e) => e.key === 'Enter' && loadClients()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">UF</label>
              <Select value={filters.uf} onValueChange={(v) => setFilters({...filters, uf: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {ufs.map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cidade</label>
              <Select value={filters.cidade} onValueChange={(v) => setFilters({...filters, cidade: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {cidades.map(cidade => (
                    <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
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
                onKeyDown={(e) => e.key === 'Enter' && loadClients()}
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center space-x-2 pb-2">
                <Checkbox 
                  id="todos"
                  checked={filters.todos}
                  onCheckedChange={(checked) => setFilters({...filters, todos: checked as boolean})}
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
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Clientes ({clients.length})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" /> Novo
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
              >
                <Info className="h-4 w-4 mr-2" /> Visualizar
              </Button>
              <Button variant="outline" size="sm" onClick={openEditDialog} disabled={selectedClients.length !== 1}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={selectedClients.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-auto scrollbar-thin">
            <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedClients.length === clients.length && clients.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{client.codigoCliente ?? ''}</TableCell>
                  <TableCell>{client.nome}</TableCell>
                  <TableCell>{client.cidade}</TableCell>
                  <TableCell>{client.uf}</TableCell>
                  <TableCell>{client.bairro}</TableCell>
                  <TableCell>{client.fone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleCadastrarPara} disabled={selectedClients.length === 0}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cadastrar para ({selectedClients.length})
        </Button>
      </div>

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
          <Tabs defaultValue="identificacao" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-auto">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="complementares">Dados complementares</TabsTrigger>
              <TabsTrigger value="comerciais">Dados Comerciais</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 pr-2">
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
                          setFormData({ ...formData, cnpjCpf: e.target.value });
                          cnpjLookupRef.current?.(e.target.value);
                        }}
                      />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => cnpjLookupRef.current?.(formData.cnpjCpf)}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <Select defaultValue="Cliente">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Cliente">Cliente</SelectItem>
                        <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
                    <Input className="h-8 text-sm" value={formData.codigoCliente} onChange={(e) => setFormData({ ...formData, codigoCliente: e.target.value })} />
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
                    <Input className="h-8 text-sm" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
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
                    <Input className="h-8 text-sm" value={formData.fantasia} onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })} />
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Checkbox />
                    <label className="text-sm">Consumidor final</label>
                  </div>
                </div>

                {/* Inscr. estadual + Contribuinte + Suframa */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. estadual</label>
                    <Input className="h-8 text-sm" value={formData.inscEstadual} onChange={(e) => setFormData({ ...formData, inscEstadual: e.target.value })} />
                  </div>
                  <div className="col-span-4">
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
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Suframa</label>
                    <Input className="h-8 text-sm" />
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
                      <Input className="h-8 text-sm" placeholder="-" value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço *</label>
                    <Input className="h-8 text-sm" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">UF *</label>
                    <Select
                      value={formData.uf}
                      onValueChange={(v) => setFormData({ ...formData, uf: v, cidade: '', cidadeId: 0 })}
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
                        setFormData({ ...formData, cidadeId: parseInt(v) || 0, cidade: cid?.nome_cidade || '' });
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
                    <Input className="h-8 text-sm" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Complem.</label>
                    <Input className="h-8 text-sm" value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} />
                  </div>
                </div>

                {/* Seção Telefones */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Telefones</span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Fixo *</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
                    <Input className="h-8 text-sm" placeholder="( )" />
                  </div>
                </div>

                <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} className="max-w-lg" />
                <FormField label="Email Danfe" value="" onChange={() => {}} className="max-w-lg" />
                <FormField label="Site" value={formData.site} onChange={(v) => setFormData({ ...formData, site: v })} className="max-w-lg" />

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
                    <Input className="h-8 text-sm" />
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
                    <Input className="h-8 text-sm" />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">RG</label>
                    <Input className="h-8 text-sm" value={formData.rg} onChange={(e) => setFormData({ ...formData, rg: e.target.value })} />
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
                    <Input className="h-8 text-sm" />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Checkbox />
                    <label className="text-sm">Endereço para entrega</label>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-2">
                    <Select>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" placeholder="Cidade" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
                    <Input className="h-8 text-sm" placeholder="-" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                    <Input className="h-8 text-sm" />
                  </div>
                </div>

                <FormField label="Email" value="" onChange={() => {}} className="max-w-md" />

                {/* Seção Referências */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Referências</span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Banco</label>
                    <Input className="h-8 text-sm" />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Conta</label>
                    <Input className="h-8 text-sm" />
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" placeholder="Agência" />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" />
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" />
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" />
                  </div>
                </div>

                {/* Referências Comerciais + Sócios */}
                <div className="grid grid-cols-12 gap-3 items-start mt-4">
                  <div className="col-span-6 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground block">Referências Comerciais</label>
                    <Input className="h-8 text-sm" />
                    <Input className="h-8 text-sm" />
                    <Input className="h-8 text-sm" />
                    <Input className="h-8 text-sm" />
                  </div>
                  <div className="col-span-6 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground block">Sócios</label>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" />
                      <Input type="number" className="h-8 text-sm w-16 text-right" defaultValue={0} />
                    </div>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" />
                      <Input type="number" className="h-8 text-sm w-16 text-right" defaultValue={0} />
                    </div>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" />
                      <Input type="number" className="h-8 text-sm w-16 text-right" defaultValue={0} />
                    </div>
                  </div>
                </div>

                <FormField label="Cap. social" value="" onChange={() => {}} />

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contador</label>
                    <Input className="h-8 text-sm" />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
                    <Input className="h-8 text-sm" placeholder="( )" />
                  </div>
                </div>

                {/* Seção Cobrança */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Cobrança</span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
                    <Input className="h-8 text-sm" />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                    <Input className="h-8 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-2">
                    <Select>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Input className="h-8 text-sm" placeholder="Cidade" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
                    <Input className="h-8 text-sm" placeholder="-" />
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
                    <Input className="h-8 text-sm" value={formData.contato1Nome} onChange={(e) => setFormData({ ...formData, contato1Nome: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.contato1Celular} onChange={(e) => setFormData({ ...formData, contato1Celular: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Aniversário</label>
                    <Input type="date" className="h-8 text-sm" value={formData.contato1Aniversario} onChange={(e) => setFormData({ ...formData, contato1Aniversario: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <Input className="h-8 text-sm" value={formData.contato2Nome} onChange={(e) => setFormData({ ...formData, contato2Nome: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.contato2Celular} onChange={(e) => setFormData({ ...formData, contato2Celular: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <Input type="date" className="h-8 text-sm" value={formData.contato2Aniversario} onChange={(e) => setFormData({ ...formData, contato2Aniversario: e.target.value })} />
                  </div>
                </div>

                {/* Classe / Checkouts / Nielsen / Dependência / Rede */}
                <div className="grid grid-cols-12 gap-3 items-end mt-4">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Classe *</label>
                    <Select value={formData.classe} onValueChange={(v) => setFormData({ ...formData, classe: v })}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
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
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nielsen</label>
                    <Select value={formData.nielsen} onValueChange={(v) => setFormData({ ...formData, nielsen: v })}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Rede</label>
                    <Select value={formData.rede} onValueChange={(v) => setFormData({ ...formData, rede: v })}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="propria">Própria</SelectItem>
                        <SelectItem value="associada">Associada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tabelas de preços / Permite venda */}
                <div className="grid grid-cols-12 gap-3 items-end mt-4">
                  <div className="col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tabela de preços *</label>
                    <Select
                      value={formData.tabelaId ? String(formData.tabelaId) : ''}
                      onValueChange={(v) => setFormData({ ...formData, tabelaId: parseInt(v) || 0 })}
                      disabled={tabelasLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={tabelasLoading ? 'Carregando...' : 'Selecione a tabela'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="0">Nenhuma</SelectItem>
                        {tabelas.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.codigo ? `${t.codigo} - ${t.descricao}` : t.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-7">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Permite venda nas empresas (ex: 01,02..)</label>
                    <Input className="h-8 text-sm" />
                  </div>
                </div>

                {/* Representante */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Representante *</label>
                    <Dialog open={repSearchOpen} onOpenChange={setRepSearchOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-8 text-sm">
                          {formData.representanteId ? `${formData.representanteId} - ${formData.representanteNome}` : 'Selecione...'}
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
                              {representatives.map((r) => (
                                <Button
                                  key={r.id}
                                  variant="ghost"
                                  className="w-full justify-start text-sm h-9"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      representanteId: r.codigoRepresentante || r.id,
                                      representanteNome: r.nome,
                                    });
                                    setRepSearchOpen(false);
                                    setRepSearch('');
                                  }}
                                >
                                  {r.codigoRepresentante || r.id} - {r.nome}
                                </Button>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Prazo máximo + Descontos */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo máximo liberado</label>
                    <Select value={formData.prazo} onValueChange={(v) => setFormData({ ...formData, prazo: v })}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="30/40/50 DD">30/40/50 DD</SelectItem>
                        <SelectItem value="30/60/90 DD">30/60/90 DD</SelectItem>
                        <SelectItem value="A VISTA">A VISTA</SelectItem>
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
                      <Checkbox />
                      <label className="text-sm">Liberado venda no B2B</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Senha B2B</label>
                      <Input className="h-8 text-sm w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Tabela B2B</label>
                      <Select>
                        <SelectTrigger className="h-8 text-sm w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Observação */}
                <div className="border-t pt-4 mt-4">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs.</label>
                  <Textarea
                    className="min-h-[80px] text-sm"
                    value={formData.observacaoComercial}
                    onChange={(e) => setFormData({ ...formData, observacaoComercial: e.target.value })}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
          {formError && <div className="text-sm text-destructive mt-2">{formError}</div>}
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
            <Tabs defaultValue="identificacao" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-auto">
                <TabsTrigger value="identificacao">Identificação</TabsTrigger>
                <TabsTrigger value="complementares">Dados complementares</TabsTrigger>
                <TabsTrigger value="comerciais">Dados Comerciais</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4 pr-2">
                {/* Identificação */}
                <TabsContent value="identificacao" className="m-0 space-y-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">CNPJ / CPF *</label>
                      <div className="flex gap-1">
                        <Input className="h-8 text-sm flex-1" value={formData.cnpjCpf} onChange={(e) => setFormData({ ...formData, cnpjCpf: e.target.value })} />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => cnpjLookupRef.current?.(formData.cnpjCpf)}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <Select defaultValue="Cliente">
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="Cliente">Cliente</SelectItem>
                          <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
                      <Input className="h-8 text-sm" value={formData.codigoCliente} onChange={(e) => setFormData({ ...formData, codigoCliente: e.target.value })} />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Checkbox checked={formData.inativo} onCheckedChange={(c) => setFormData({ ...formData, inativo: c as boolean })} />
                      <label className="text-sm">Cliente Inativo</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-9">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Razão Social/Nome *</label>
                      <Input className="h-8 text-sm" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Checkbox />
                      <label className="text-sm">Simples nacional</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-9">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome Fantasia</label>
                      <Input className="h-8 text-sm" value={formData.fantasia} onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })} />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Checkbox />
                      <label className="text-sm">Consumidor final</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. estadual</label>
                      <Input className="h-8 text-sm" value={formData.inscEstadual} onChange={(e) => setFormData({ ...formData, inscEstadual: e.target.value })} />
                    </div>
                    <div className="col-span-4">
                      <Select defaultValue="contribuinte">
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="contribuinte">Contribuinte ICM</SelectItem>
                          <SelectItem value="nao">Não contribuinte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Suframa</label>
                      <Input className="h-8 text-sm" />
                    </div>
                  </div>

                  <div className="border-b border-primary/50 pb-1 mt-4">
                    <span className="text-sm font-medium text-primary">Endereço</span>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Cep *</label>
                      <div className="flex gap-1">
                        <Input className="h-8 text-sm" value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
                        <Button variant="outline" size="icon" className="h-8 w-8"><Search className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>

                  <FormField label="Endereço *" value={formData.endereco} onChange={(v) => setFormData({ ...formData, endereco: v })} />

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">UF *</label>
                      <Select
                        value={formData.uf}
                        onValueChange={(v) => setFormData({ ...formData, uf: v, cidade: '', cidadeId: 0 })}
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
                          setFormData({ ...formData, cidadeId: parseInt(v) || 0, cidade: cid?.nome_cidade || '' });
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
                      <Input className="h-8 text-sm" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                    </div>
                  </div>

                  <FormField label="Complem." value={formData.complemento} onChange={(v) => setFormData({ ...formData, complemento: v })} className="max-w-md" />

                  <div className="border-b border-primary/50 pb-1 mt-4">
                    <span className="text-sm font-medium text-primary">Telefones</span>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Fixo *</label>
                      <Input className="h-8 text-sm" placeholder="( )" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                      <Input className="h-8 text-sm" placeholder="( )" value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: e.target.value })} />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
                      <Input className="h-8 text-sm" placeholder="( )" />
                    </div>
                  </div>

                  <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} className="max-w-lg" />
                  <FormField label="Email Danfe" value="" onChange={() => {}} className="max-w-lg" />
                  <FormField label="Site" value={formData.site} onChange={(v) => setFormData({ ...formData, site: v })} className="max-w-lg" />

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
                      <Input className="h-8 text-sm" />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Aniversário</label>
                      <Input type="date" className="h-8 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">CPF</label>
                      <Input className="h-8 text-sm" />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">RG</label>
                      <Input className="h-8 text-sm" value={formData.rg} onChange={(e) => setFormData({ ...formData, rg: e.target.value })} />
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
                      <Input className="h-8 text-sm" />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Conta</label>
                      <Input className="h-8 text-sm" />
                    </div>
                    <div className="col-span-4">
                      <Input className="h-8 text-sm" placeholder="Agência" />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-start mt-4">
                    <div className="col-span-6 space-y-2">
                      <label className="text-xs font-medium text-muted-foreground block">Referências Comerciais</label>
                      <Input className="h-8 text-sm" />
                      <Input className="h-8 text-sm" />
                      <Input className="h-8 text-sm" />
                    </div>
                    <div className="col-span-6 space-y-2">
                      <label className="text-xs font-medium text-muted-foreground block">Sócios</label>
                      <div className="flex gap-2">
                        <Input className="h-8 text-sm flex-1" />
                        <Input type="number" className="h-8 text-sm w-16 text-right" defaultValue={0} />
                      </div>
                      <div className="flex gap-2">
                        <Input className="h-8 text-sm flex-1" />
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
                      <Input className="h-8 text-sm" />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                      <Input className="h-8 text-sm" />
                    </div>
                  </div>
                </TabsContent>

                {/* Dados Comerciais */}
                <TabsContent value="comerciais" className="m-0 space-y-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Contatos</label>
                      <Input className="h-8 text-sm" value={formData.contato1Nome} onChange={(e) => setFormData({ ...formData, contato1Nome: e.target.value })} />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                      <Input className="h-8 text-sm" placeholder="( )" value={formData.contato1Celular} onChange={(e) => setFormData({ ...formData, contato1Celular: e.target.value })} />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Aniversário</label>
                      <Input type="date" className="h-8 text-sm" value={formData.contato1Aniversario} onChange={(e) => setFormData({ ...formData, contato1Aniversario: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5">
                      <Input className="h-8 text-sm" value={formData.contato2Nome} onChange={(e) => setFormData({ ...formData, contato2Nome: e.target.value })} />
                    </div>
                    <div className="col-span-3">
                      <Input className="h-8 text-sm" placeholder="( )" value={formData.contato2Celular} onChange={(e) => setFormData({ ...formData, contato2Celular: e.target.value })} />
                    </div>
                    <div className="col-span-4">
                      <Input type="date" className="h-8 text-sm" value={formData.contato2Aniversario} onChange={(e) => setFormData({ ...formData, contato2Aniversario: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end mt-4">
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Classe *</label>
                      <Select value={formData.classe} onValueChange={(v) => setFormData({ ...formData, classe: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
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
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Tabela de preços *</label>
                      <Select
                        value={formData.tabelaId ? String(formData.tabelaId) : ''}
                        onValueChange={(v) => setFormData({ ...formData, tabelaId: parseInt(v) || 0 })}
                        disabled={tabelasLoading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={tabelasLoading ? 'Carregando...' : 'Selecione a tabela'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="0">Nenhuma</SelectItem>
                          {tabelas.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.codigo ? `${t.codigo} - ${t.descricao}` : t.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Representante *</label>
                      <Dialog open={repSearchOpen} onOpenChange={setRepSearchOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start h-8 text-sm">
                            {formData.representanteId ? `${formData.representanteId} - ${formData.representanteNome}` : 'Selecione...'}
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
                                {representatives.map((r) => (
                                  <Button
                                    key={r.id}
                                    variant="ghost"
                                    className="w-full justify-start text-sm h-9"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        representanteId: r.codigoRepresentante || r.id,
                                        representanteNome: r.nome,
                                      });
                                      setRepSearchOpen(false);
                                      setRepSearch('');
                                    }}
                                  >
                                    {r.codigoRepresentante || r.id} - {r.nome}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo máximo liberado</label>
                      <Select value={formData.prazo} onValueChange={(v) => setFormData({ ...formData, prazo: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="30/40/50 DD">30/40/50 DD</SelectItem>
                          <SelectItem value="30/60/90 DD">30/60/90 DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 flex items-center gap-2 pt-5">
                      <Checkbox checked={formData.boleto} onCheckedChange={(c) => setFormData({ ...formData, boleto: c as boolean })} />
                      <label className="text-sm">Boleto bancário</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center mt-4">
                    <div className="col-span-12 flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Checkbox />
                        <label className="text-sm">Liberado venda no B2B</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Senha B2B</label>
                        <Input className="h-8 text-sm w-32" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Tabela B2B</label>
                        <Select>
                          <SelectTrigger className="h-8 text-sm w-16"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="1">1</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs.</label>
                    <Textarea className="min-h-[80px] text-sm" value={formData.observacaoComercial} onChange={(e) => setFormData({ ...formData, observacaoComercial: e.target.value })} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
          {formError && <div className="text-sm text-destructive mt-2">{formError}</div>}
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
