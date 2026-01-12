import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Plus, Pencil, Trash2, Info, Search } from 'lucide-react';
import { toast } from 'sonner';
import { clientsService, Client } from '@/services/clientsService';
import { metadataService, Rota } from '@/services/metadataService';
import { operacoes } from '@/mocks/data';
import { ClientInfoModal } from './ClientInfoModal';
import { ClientFormModal } from './ClientFormModal';
import { cn } from '@/lib/utils';

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
    tabelas: '',
    descontoFinanceiroBoleto: 0,
    observacaoComercial: '',
    segmentoId: 0,
    // Financeiro
    credito: '',
    boleto: false,
    prazo: '',
    limite: 0,
    aberto: 0,
    disponivel: 0,
    observacaoFinanceiro: '',
    formaPagtoId: 0,
    prazoPagtoId: 0,
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

  // Carregar rotas quando abrir os dialogs de criação/edição
  useEffect(() => {
    if (createOpen || editOpen) {
      loadRotas();
    }
  }, [createOpen, editOpen]);

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
  tabelas: '',
  descontoFinanceiroBoleto: 0,
  observacaoComercial: '',
  segmentoId: 0,
  credito: '',
  boleto: false,
  prazo: '',
  limite: 0,
  aberto: 0,
  disponivel: 0,
  observacaoFinanceiro: '',
  formaPagtoId: 0,
  prazoPagtoId: 0,
});

const normalizeCep = (v: string) => v.replace(/\D+/g, '').slice(0, 8);
const normalizeCnpj = (v: string) => v.replace(/\D+/g, '').slice(0, 14);

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
        segmentoId: Number(formData.segmentoId) || 0,
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: Number(formData.formaPagtoId) || 0,
        prazoPagtoId: Number(formData.prazoPagtoId) || 0,
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
        tabelas: String(d.tabelas ?? ''),
        descontoFinanceiroBoleto: Number(d.desconto_financeiro_boleto ?? d.descontoFinanceiroBoleto ?? 0),
        observacaoComercial: String(d.observacao_comercial ?? d.observacaoComercial ?? ''),
        segmentoId: Number(d.segmento_id ?? d.segmentoId ?? 0),
        credito: String(d.credito ?? ''),
        boleto: Boolean(d.boleto),
        prazo: String(d.prazo ?? ''),
        limite: Number(d.limite_credito ?? d.limite ?? 0),
        aberto: Number(d.aberto ?? 0),
        disponivel: Number(d.disponivel ?? 0),
        observacaoFinanceiro: String(d.observacao_financeiro ?? d.observacaoFinanceiro ?? ''),
        formaPagtoId: Number(d.forma_pagto_id ?? d.formaPagtoId ?? 0),
        prazoPagtoId: Number(d.prazo_pagto_id ?? d.prazoPagtoId ?? 0),
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
        segmentoId: Number(formData.segmentoId) || 0,
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: Number(formData.formaPagtoId) || 0,
        prazoPagtoId: Number(formData.prazoPagtoId) || 0,
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
      <ClientFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSuccess={() => {
          setSelectedClients([]);
          loadClients();
        }}
      />

      {/* Edit Client */}
      <ClientFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        clientId={editId}
        onSuccess={() => {
          setSelectedClients([]);
          loadClients();
        }}
      />

      <ClientInfoModal
        open={clientInfoOpen}
        onOpenChange={setClientInfoOpen}
        clienteId={clientInfoId}
      />
    </div>
  );
};
