import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, UserCheck, Pencil, Loader2, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { representativesService, Representante } from '@/services/representativesService';
import { metadataService, Rota } from '@/services/metadataService';
import { RepresentantesPastasTab } from './RepresentantesPastasTab';

const formatObjetivo = (value: number | null | undefined) =>
  Number(value ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseRotasLiberadas = (value?: string | null): number[] =>
  Array.from(
    new Set(
      String(value ?? '')
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );

const buildRotasLiberadas = (ids: number[]): string =>
  [...ids]
    .sort((a, b) => a - b)
    .join(',');

type RepresentanteEditFormData = Pick<
  Representante,
  | 'codigo_representante'
  | 'supervisor'
  | 'supervisor_id'
  | 'gerente'
  | 'gerente_id'
  | 'comissao'
  | 'objetivo_de_venda'
  | 'limite_de_troca'
  | 'rotas_liberadas'
  | 'liberado_debito_credito'
  | 'bloqueia_alteracao_agenda'
  | 'quantidade_maxima_pedidos_retidos_para_sincronizar'
  | 'observacao'
  | 'empresa_id'
  | 'usuario_id'
  | 'inativo'
>;

const initialFormData: RepresentanteEditFormData = {
  codigo_representante: '',
  supervisor: false,
  supervisor_id: null,
  gerente: false,
  gerente_id: null,
  comissao: 0,
  objetivo_de_venda: 0,
  limite_de_troca: 0,
  rotas_liberadas: '',
  liberado_debito_credito: false,
  bloqueia_alteracao_agenda: false,
  quantidade_maxima_pedidos_retidos_para_sincronizar: 0,
  observacao: '',
  empresa_id: null,
  usuario_id: null,
  inativo: false,
};

type VinculoUsuarioOption = {
  usuario_id: number;
  nome: string;
  descricao: string;
  gerente: boolean;
  supervisor: boolean;
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
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<RepresentanteEditFormData>(initialFormData);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<VinculoUsuarioOption[]>([]);
  const [usuariosEmpresaLoading, setUsuariosEmpresaLoading] = useState(false);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotasLoading, setRotasLoading] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pendingClose, setPendingClose] = useState<'edit' | null>(null);
  const formSnapshotRef = useRef<string>(JSON.stringify(initialFormData));
  const setFormSnapshot = (data: RepresentanteEditFormData) => {
    formSnapshotRef.current = JSON.stringify(data);
  };
  const isFormDirty = () => JSON.stringify(formData) !== formSnapshotRef.current;
  const closeDialog = () => {
    setEditOpen(false);
  };
  const requestCloseDialog = () => {
    if (isFormDirty()) {
      setPendingClose('edit');
      setShowConfirmClose(true);
      return;
    }
    closeDialog();
  };
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) return requestCloseDialog();
    setEditOpen(true);
  };
  const handleConfirmClose = () => {
    if (pendingClose) closeDialog();
    setPendingClose(null);
    setShowConfirmClose(false);
  };
  const handleCancelClose = () => {
    setPendingClose(null);
    setShowConfirmClose(false);
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
      console.error('Erro ao carregar força de vendas:', error);
      toast.error(error?.message || 'Erro ao carregar força de vendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepresentantes(true);
  }, [filtroStatus]);

  useEffect(() => {
    if (!editOpen) return;

    const empresaId = formData.empresa_id;
    if (!empresaId) {
      setUsuariosEmpresa([]);
      return;
    }

    let ativo = true;
    setUsuariosEmpresaLoading(true);

    representativesService
      .getByEmpresaId(empresaId, undefined, 1, 500, 'todos')
      .then((result) => {
        if (!ativo) return;
        const usuarios = Array.from(
          new Map(
            result.data
              .filter(
                (representante) =>
                  Number.isInteger(representante.usuario_id) &&
                  Number(representante.usuario_id) > 0,
              )
              .map((representante) => [
                Number(representante.usuario_id),
                {
                  usuario_id: Number(representante.usuario_id),
                  nome: representante.nome_representante,
                  descricao: `${representante.nome_representante} (${representante.codigo_representante || representante.representante_id})`,
                  gerente: Boolean(representante.gerente ?? false),
                  supervisor: Boolean(representante.supervisor ?? false),
                },
              ]),
          ).values(),
        ).sort((a, b) => a.nome.localeCompare(b.nome));
        setUsuariosEmpresa(usuarios);
        setFormData((prev) => ({
          ...prev,
          gerente_id: usuarios.some(
            (user) => user.gerente && user.usuario_id === prev.gerente_id,
          )
            ? prev.gerente_id
            : null,
          supervisor_id: usuarios.some(
            (user) => user.supervisor && user.usuario_id === prev.supervisor_id,
          )
            ? prev.supervisor_id
            : null,
        }));
      })
      .catch((error) => {
        if (!ativo) return;
        setUsuariosEmpresa([]);
        toast.error(String(error) || 'Erro ao carregar vínculos da força de vendas');
      })
      .finally(() => {
        if (ativo) setUsuariosEmpresaLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [editOpen, formData.empresa_id]);

  useEffect(() => {
    if (!editOpen) return;

    const empresaId = formData.empresa_id;
    if (!empresaId) {
      setRotas([]);
      return;
    }

    let ativo = true;
    setRotasLoading(true);

    metadataService
      .getRotasByEmpresa(empresaId, undefined, true)
      .then((result) => {
        if (!ativo) return;
        setRotas(
          [...result].sort((a, b) =>
            (a.label || '').localeCompare(b.label || ''),
          ),
        );
      })
      .catch((error) => {
        if (!ativo) return;
        setRotas([]);
        toast.error(String(error) || 'Erro ao carregar rotas');
      })
      .finally(() => {
        if (ativo) setRotasLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [editOpen, formData.empresa_id]);

  const handleSearch = () => loadRepresentantes(true);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const resetForm = (updateSnapshot = false) => {
    const nextData = { ...initialFormData };
    setFormData(nextData);
    setEditId(null);
    if (updateSnapshot) setFormSnapshot(nextData);
  };

  const openEdit = async (r: Representante) => {
    setEditId(r.representante_id);
    setFormSnapshot(formData);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await representativesService.getById(r.representante_id);
      if (detail) {
        const nextData: RepresentanteEditFormData = {
          codigo_representante: detail.codigo_representante || '',
          supervisor: detail.supervisor ?? false,
          supervisor_id: detail.supervisor_id ?? null,
          gerente: detail.gerente ?? false,
          gerente_id: detail.gerente_id ?? null,
          comissao: detail.comissao ?? 0,
          objetivo_de_venda: detail.objetivo_de_venda ?? 0,
          limite_de_troca: detail.limite_de_troca ?? 0,
          rotas_liberadas: detail.rotas_liberadas || '',
          liberado_debito_credito: detail.liberado_debito_credito ?? false,
          bloqueia_alteracao_agenda: detail.bloqueia_alteracao_agenda ?? false,
          quantidade_maxima_pedidos_retidos_para_sincronizar: detail.quantidade_maxima_pedidos_retidos_para_sincronizar ?? 0,
          observacao: detail.observacao || '',
          empresa_id: detail.empresa_id ?? null,
          usuario_id: detail.usuario_id ?? null,
          inativo: detail.inativo ?? false,
        };
        setFormData(nextData);
        setFormSnapshot(nextData);
      }
    } catch (e: any) {
      toast.error('Erro ao carregar dados da força de vendas');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setFormLoading(true);
    try {
      await representativesService.update(editId, formData);
      toast.success('Força de vendas atualizada com sucesso');
      setEditOpen(false);
      resetForm();
      loadRepresentantes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar força de vendas');
    } finally {
      setFormLoading(false);
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

  const selectedRotaIds = parseRotasLiberadas(formData.rotas_liberadas);
  const selectedRotasLabel =
    selectedRotaIds.length === 0
      ? 'Selecionar rotas'
      : selectedRotaIds.length <= 2
      ? selectedRotaIds
          .map((id) => rotas.find((rota) => rota.id === id)?.label || `Rota ${id}`)
          .join(', ')
      : `${selectedRotaIds.length} rotas selecionadas`;

  const toggleRota = (rotaId: number, checked: boolean) => {
    const nextIds = checked
      ? [...selectedRotaIds, rotaId]
      : selectedRotaIds.filter((id) => id !== rotaId);

    setFormData({
      ...formData,
      rotas_liberadas: buildRotasLiberadas(nextIds),
    });
  };

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
          <Input
            className="h-8 text-sm"
            value={formData.codigo_representante}
            onChange={(e) =>
              setFormData({ ...formData, codigo_representante: e.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Cargo
        </label>
        <RadioGroup
          value={formData.gerente ? 'gerente' : formData.supervisor ? 'supervisor' : 'nenhum'}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              gerente: value === 'gerente',
              supervisor: value === 'supervisor',
            })
          }
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <label className="flex items-center gap-2 text-sm border rounded-md px-3 py-2">
            <RadioGroupItem value="nenhum" />
            <span>Nenhum</span>
          </label>
          <label className="flex items-center gap-2 text-sm border rounded-md px-3 py-2">
            <RadioGroupItem value="gerente" />
            <span>Gerente</span>
          </label>
          <label className="flex items-center gap-2 text-sm border rounded-md px-3 py-2">
            <RadioGroupItem value="supervisor" />
            <span>Supervisor</span>
          </label>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-6">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Associar a gerente
          </label>
          <Select
            value={formData.gerente_id != null ? String(formData.gerente_id) : 'none'}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                gerente_id: value === 'none' ? null : Number(value),
              })
            }
            disabled={!formData.empresa_id || usuariosEmpresaLoading}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue
                placeholder={
                  !formData.empresa_id
                    ? 'Selecione a empresa'
                    : usuariosEmpresaLoading
                    ? 'Carregando...'
                    : 'Selecione'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {usuariosEmpresa
                .filter((usuario) => usuario.gerente)
                .map((usuario) => (
                <SelectItem key={`gerente-${usuario.usuario_id}`} value={String(usuario.usuario_id)}>
                  {usuario.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 md:col-span-6">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Associar a supervisor
          </label>
          <Select
            value={formData.supervisor_id != null ? String(formData.supervisor_id) : 'none'}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                supervisor_id: value === 'none' ? null : Number(value),
              })
            }
            disabled={!formData.empresa_id || usuariosEmpresaLoading}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue
                placeholder={
                  !formData.empresa_id
                    ? 'Selecione a empresa'
                    : usuariosEmpresaLoading
                    ? 'Carregando...'
                    : 'Selecione'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {usuariosEmpresa
                .filter((usuario) => usuario.supervisor)
                .map((usuario) => (
                <SelectItem key={`supervisor-${usuario.usuario_id}`} value={String(usuario.usuario_id)}>
                  {usuario.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Comissão (%)</label>
          <Input
            type="number"
            className="h-8 text-sm"
            value={formData.comissao ?? ''}
            onChange={(e) => setFormData({ ...formData, comissao: e.target.value ? Number(e.target.value) : 0 })}
          />
        </div>
        <div className="col-span-1 md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Máx. Pedidos Retidos</label>
          <Input
            type="number"
            className="h-8 text-sm"
            value={formData.quantidade_maxima_pedidos_retidos_para_sincronizar ?? ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                quantidade_maxima_pedidos_retidos_para_sincronizar: e.target.value ? Number(e.target.value) : 0,
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Objetivo de Venda</label>
          <Input
            type="number"
            step="0.01"
            className="h-8 text-sm"
            value={formData.objetivo_de_venda ?? ''}
            onChange={(e) => setFormData({ ...formData, objetivo_de_venda: e.target.value ? Number(e.target.value) : 0 })}
          />
        </div>
        <div className="col-span-1 md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Limite de Troca</label>
          <Input
            type="number"
            step="0.01"
            className="h-8 text-sm"
            value={formData.limite_de_troca ?? ''}
            onChange={(e) => setFormData({ ...formData, limite_de_troca: e.target.value ? Number(e.target.value) : 0 })}
          />
        </div>
        <div className="col-span-1 md:col-span-6">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Rotas Liberadas</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-8 w-full justify-between text-sm font-normal"
                disabled={rotasLoading || !formData.empresa_id}
              >
                <span className="truncate">
                  {!formData.empresa_id
                    ? 'Empresa não definida'
                    : rotasLoading
                    ? 'Carregando...'
                    : selectedRotasLabel}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
              <div className="space-y-3">
                <div className="text-sm font-medium">Rotas liberadas</div>
                {!formData.empresa_id ? (
                  <div className="text-sm text-muted-foreground">
                    Empresa não definida para este cadastro.
                  </div>
                ) : rotasLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando rotas...</div>
                ) : rotas.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhuma rota disponível.</div>
                ) : (
                  <>
                    <div className="max-h-56 space-y-2 overflow-auto pr-1">
                      {rotas.map((rota) => {
                        const checked = selectedRotaIds.includes(rota.id);
                        return (
                          <label
                            key={rota.id}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => toggleRota(rota.id, Boolean(value))}
                            />
                            <span className="truncate">
                              {rota.label}
                              {rota.codigo_rota ? ` (${rota.codigo_rota})` : ''}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            rotas_liberadas: '',
                          })
                        }
                      >
                        Limpar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end pb-1">
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

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Observação</label>
        <Input
          className="h-8 text-sm"
          value={formData.observacao}
          onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
        />
      </div>
    </div>
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
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Força de Vendas ({representantes.length})
              </CardTitle>
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
                              Nenhuma força de vendas encontrada
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
                              <TableCell className="font-mono text-sm text-right">
                                {formatObjetivo(r.objetivo_de_venda)}
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs px-2 py-0.5 rounded ${r.inativo ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                                  {r.inativo ? 'Inativo' : 'Ativo'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <TooltipProvider>
                                  <div className="flex items-center justify-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Editar</TooltipContent>
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
              <CardTitle className="text-lg">Pastas por Força de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <RepresentantesPastasTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Força de Vendas</DialogTitle>
          </DialogHeader>
          {formLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            formContent
          )}
          <DialogFooter>
            <Button variant="outline" onClick={requestCloseDialog}>Cancelar</Button>
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
