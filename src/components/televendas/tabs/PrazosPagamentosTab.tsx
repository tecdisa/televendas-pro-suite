import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Clock, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { prazosPagamentosService, PrazoPagamento, PrazoPagamentoFormData } from '@/services/prazosPagamentosService';
import { metadataService, type FormaPagamento as MetadataFormaPagamento } from '@/services/metadataService';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

const initialFormData: PrazoPagamentoFormData = {
  codigo_prazopagto: '',
  descricao_prazo_pagto: '',
  avista: false,
  somente_cartao: false,
  prazo_negociado: false,
  forma_pagto_id: null,
  numero_de_parcelas: 0,
  prazos_em_dias: '',
  pedido_minimo: 0,
  comissao: 0,
  liberado_app_mobile: false,
  liberado_b2b: false,
  liberado_b2c: false,
  inativo: false,
};

export function PrazosPagamentosTab() {
  const { canInsert } = useModuleCrudPermission('PRAZOS');
  const PAGE_LIMIT = 100;
  const [loading, setLoading] = useState(false);
  const [prazos, setPrazos] = useState<PrazoPagamento[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [filterCartao, setFilterCartao] = useState(false);
  const [filterMobile, setFilterMobile] = useState(false);
  const [filterB2b, setFilterB2b] = useState(false);
  const [formasPagto, setFormasPagto] = useState<MetadataFormaPagamento[]>([]);
  const [formasPagtoLoading, setFormasPagtoLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState<PrazoPagamentoFormData>(initialFormData);

  const loadPrazos = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) {
      setPrazos([]);
      setPage(1);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await prazosPagamentosService.getAll(search, nextPage, PAGE_LIMIT, filtroStatus, {
        cartao: filterCartao,
        mobile: filterMobile,
        b2b: filterB2b,
      });
      setPrazos((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(result.page ?? nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error: any) {
      console.error('Erro ao carregar prazos:', error);
      toast.error(error?.message || 'Erro ao carregar prazos de pagamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrazos(true);
  }, [filtroStatus, filterCartao, filterMobile, filterB2b]);

  useEffect(() => {
    const loadFormasPagamento = async () => {
      setFormasPagtoLoading(true);
      try {
        const data = await metadataService.getFormasPagamento();
        setFormasPagto(data);
      } catch {
        setFormasPagto([]);
      } finally {
        setFormasPagtoLoading(false);
      }
    };
    loadFormasPagamento();
  }, []);

  const handleSearch = () => loadPrazos(true);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditId(null);
  };

  const openCreate = () => {
    if (!canInsert) return;
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = async (p: PrazoPagamento) => {
    setEditId(p.prazo_pagto_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await prazosPagamentosService.getById(p.prazo_pagto_id);
      if (detail) {
        setFormData({
          codigo_prazopagto: detail.codigo_prazopagto || '',
          descricao_prazo_pagto: detail.descricao_prazo_pagto || '',
          avista: detail.avista ?? false,
          somente_cartao: detail.somente_cartao ?? false,
          prazo_negociado: detail.prazo_negociado ?? false,
          forma_pagto_id: detail.forma_pagto_id ?? null,
          numero_de_parcelas: detail.numero_de_parcelas ?? 0,
          prazos_em_dias: detail.prazos_em_dias || '',
          pedido_minimo: detail.pedido_minimo ?? 0,
          comissao: detail.comissao ?? 0,
          liberado_app_mobile: detail.liberado_app_mobile ?? false,
          liberado_b2b: detail.liberado_b2b ?? false,
          liberado_b2c: detail.liberado_b2c ?? false,
          inativo: detail.inativo ?? false,
        });
      }
    } catch (e: any) {
      toast.error('Erro ao carregar dados do prazo');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.descricao_prazo_pagto.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    const numeroParcelas = Number(formData.numero_de_parcelas ?? 0);
    const prazosEmDiasRaw = String(formData.prazos_em_dias ?? '').trim();
    if (numeroParcelas > 0 && !prazosEmDiasRaw) {
      toast.error('Prazos em dias é obrigatório quando houver número de parcelas');
      return;
    }
    if (prazosEmDiasRaw && numeroParcelas <= 0) {
      toast.error('Número de parcelas é obrigatório quando houver prazos em dias');
      return;
    }
    setFormLoading(true);
    try {
      const prazosEmDias = formData.prazos_em_dias;
      const prazosEmDiasValue =
        prazosEmDias == null ? null : (String(prazosEmDias).trim() || null);
      const dataToSend = {
        ...formData,
        prazos_em_dias: prazosEmDiasValue,
      };
      await prazosPagamentosService.create(dataToSend);
      toast.success('Prazo de pagamento criado com sucesso');
      setCreateOpen(false);
      resetForm();
      loadPrazos(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar prazo de pagamento');
    } finally {
      setFormLoading(false);
    }
  };

  const matchesCurrentFilters = (prazo: PrazoPagamento) => {
    const term = search.trim().toUpperCase();
    if (term) {
      const codigo = toUpperValue(prazo.codigo_prazopagto);
      const descricao = toUpperValue(prazo.descricao_prazo_pagto);
      if (!codigo.includes(term) && !descricao.includes(term)) return false;
    }

    if (filtroStatus === 'ativos' && prazo.inativo === true) return false;
    if (filtroStatus === 'inativos' && prazo.inativo !== true) return false;
    if (filterCartao && prazo.somente_cartao !== true) return false;
    if (filterMobile && prazo.liberado_app_mobile !== true) return false;
    if (filterB2b && prazo.liberado_b2b !== true) return false;

    return true;
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!formData.descricao_prazo_pagto.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    const numeroParcelas = Number(formData.numero_de_parcelas ?? 0);
    const prazosEmDiasRaw = String(formData.prazos_em_dias ?? '').trim();
    if (numeroParcelas > 0 && !prazosEmDiasRaw) {
      toast.error('Prazos em dias é obrigatório quando houver número de parcelas');
      return;
    }
    if (prazosEmDiasRaw && numeroParcelas <= 0) {
      toast.error('Número de parcelas é obrigatório quando houver prazos em dias');
      return;
    }
    setFormLoading(true);
    try {
      const prazosEmDias = formData.prazos_em_dias;
      const prazosEmDiasValue =
        prazosEmDias == null ? null : (String(prazosEmDias).trim() || null);
      const dataToSend = {
        ...formData,
        prazos_em_dias: prazosEmDiasValue,
      };
      const updated = await prazosPagamentosService.update(editId, dataToSend);
      toast.success('Prazo de pagamento atualizado com sucesso');
      setEditOpen(false);
      resetForm();
      setPrazos((prev) => {
        const existsInCurrentList = prev.some((p) => p.prazo_pagto_id === editId);
        if (!existsInCurrentList) return prev;
        if (!matchesCurrentFilters(updated))
          return prev.filter((p) => p.prazo_pagto_id !== editId);

        return prev
          .map((p) => (p.prazo_pagto_id === editId ? updated : p))
          .sort((a, b) =>
            (a.descricao_prazo_pagto || '').localeCompare(
              b.descricao_prazo_pagto || '',
              'pt-BR',
            ),
          );
      });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar prazo de pagamento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: number) => setDeleteConfirm(id);

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleteConfirm(null);
    setDeleteLoading(id);
    try {
      await prazosPagamentosService.delete(id);
      toast.success('Prazo de pagamento excluído com sucesso');
      loadPrazos(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir prazo de pagamento');
    } finally {
      setDeleteLoading(null);
    }
  };

  const isInitialLoading = loading && prazos.length === 0;
  const isLoadingMore = loading && prazos.length > 0;

  const calcularPrazoMedio = (prazosEmDias?: string | number | null, numParcelas?: number | null): string => {
    if (prazosEmDias == null || !numParcelas || numParcelas <= 0) return '-';
    const prazosStr = String(prazosEmDias);
    const dias = prazosStr
      .split(/[,;/\s]+/)
      .map((d) => parseInt(d.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0);
    if (dias.length === 0) return '-';
    const soma = dias.reduce((acc, d) => acc + d, 0);
    return String(Math.round(soma / numParcelas));
  };

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadPrazos();
    }
  };

  const formContent = (
    <Tabs defaultValue="geral" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-2">
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="config">Configurações</TabsTrigger>
      </TabsList>

      <TabsContent value="geral" className="space-y-4 mt-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
          <Input
            className="h-8 text-sm"
            value={formData.descricao_prazo_pagto}
            onChange={(e) => setFormData({ ...formData, descricao_prazo_pagto: toUpperValue(e.target.value) })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="col-span-1 md:col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nº Parcelas</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={formData.numero_de_parcelas ?? ''}
              onChange={(e) => setFormData({ ...formData, numero_de_parcelas: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
          <div className="col-span-1 md:col-span-8">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazos em Dias (ex: 30,60,90)</label>
            <Input
              className="h-8 text-sm"
              value={formData.prazos_em_dias ?? ''}
              onChange={(e) => setFormData({ ...formData, prazos_em_dias: e.target.value })}
              placeholder="30,60,90"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="col-span-1 md:col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Pedido Mínimo</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={formData.pedido_minimo ?? ''}
              onChange={(e) => setFormData({ ...formData, pedido_minimo: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
          <div className="col-span-1 md:col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Comissão (%)</label>
            <Input
              type="number"
              step="0.01"
              className="h-8 text-sm"
              value={formData.comissao ?? ''}
              onChange={(e) => setFormData({ ...formData, comissao: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="col-span-1 md:col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de Pagamento</label>
            <Select
              value={formData.forma_pagto_id?.toString() || 'none'}
              onValueChange={(val) => {
                if (val === 'none') {
                  setFormData({ ...formData, forma_pagto_id: null });
                  return;
                }
                const parsed = Number(val);
                setFormData({
                  ...formData,
                  forma_pagto_id: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                });
              }}
              disabled={formasPagtoLoading}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={formasPagtoLoading ? 'Carregando...' : 'Selecione uma forma'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {formasPagto.map((f) => {
                  const id = String(f.id ?? '').trim();
                  if (!id) return null;
                  const label = f.codigo
                    ? `${f.codigo} - ${f.descricao}`
                    : f.descricao;
                  return (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="config" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.avista}
              onCheckedChange={(c) => setFormData({ ...formData, avista: c as boolean })}
            />
            <label className="text-sm">À Vista</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.somente_cartao}
              onCheckedChange={(c) => setFormData({ ...formData, somente_cartao: c as boolean })}
            />
            <label className="text-sm">Somente Cartão</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.prazo_negociado}
              onCheckedChange={(c) => setFormData({ ...formData, prazo_negociado: c as boolean })}
            />
            <label className="text-sm">Prazo Negociado</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.liberado_app_mobile}
              onCheckedChange={(c) => setFormData({ ...formData, liberado_app_mobile: c as boolean })}
            />
            <label className="text-sm">Liberado App Mobile</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.liberado_b2b}
              onCheckedChange={(c) => setFormData({ ...formData, liberado_b2b: c as boolean })}
            />
            <label className="text-sm">Liberado B2B</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.liberado_b2c}
              onCheckedChange={(c) => setFormData({ ...formData, liberado_b2c: c as boolean })}
            />
            <label className="text-sm">Liberado B2C</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!formData.inativo}
              onCheckedChange={(checked) => setFormData({ ...formData, inativo: checked !== true })}
            />
            <label className="text-sm">Ativo</label>
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
              <Clock className="h-5 w-5" />
              Prazos de Pagamento ({prazos.length})
            </CardTitle>
            <Button variant="default" onClick={openCreate} size="sm" disabled={!canInsert}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Prazo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Buscar por código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <div className="flex flex-wrap items-center gap-3">
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
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filtroCartao"
                  checked={filterCartao}
                  onCheckedChange={(c) => setFilterCartao(c as boolean)}
                />
                <label htmlFor="filtroCartao" className="text-sm whitespace-nowrap">Cartao</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filtroMobile"
                  checked={filterMobile}
                  onCheckedChange={(c) => setFilterMobile(c as boolean)}
                />
                <label htmlFor="filtroMobile" className="text-sm whitespace-nowrap">Mobile</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filtroB2b"
                  checked={filterB2b}
                  onCheckedChange={(c) => setFilterB2b(c as boolean)}
                />
                <label htmlFor="filtroB2b" className="text-sm whitespace-nowrap">B2B</label>
              </div>
            </div>
            <Button variant="default" onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[60vh] overflow-auto scrollbar-thin" onScroll={handleListScroll}>
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell w-20">Parcelas</TableHead>
                    <TableHead className="hidden lg:table-cell">Prazos</TableHead>
                    <TableHead className="hidden md:table-cell w-24">Prazo Médio</TableHead>
                    <TableHead className="hidden xl:table-cell w-20">À Vista</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-28 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : prazos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum prazo de pagamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    prazos.map((p) => (
                      <TableRow key={p.prazo_pagto_id} className={p.inativo ? 'opacity-50' : ''}>
                        <TableCell className="font-mono text-xs">{p.codigo_prazopagto || '-'}</TableCell>
                        <TableCell className="font-medium">{p.descricao_prazo_pagto}</TableCell>
                        <TableCell className="hidden md:table-cell">{p.numero_de_parcelas || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{p.prazos_em_dias || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{calcularPrazoMedio(p.prazos_em_dias, p.numero_de_parcelas)}</TableCell>
                        <TableCell className="hidden xl:table-cell">{p.avista ? 'Sim' : 'Não'}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded ${p.inativo ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                            {p.inativo ? 'Inativo' : 'Ativo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <div className="flex items-center justify-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDelete(p.prazo_pagto_id)}
                                    disabled={deleteLoading === p.prazo_pagto_id}
                                  >
                                    {deleteLoading === p.prazo_pagto_id ? (
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
                      <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Prazo de Pagamento</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="default" onClick={handleCreate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Prazo de Pagamento</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.descricao_prazo_pagto ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            formContent
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button variant="default" onClick={handleUpdate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este prazo de pagamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
