import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Route, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { rotasClientesService, RotaCliente, RotaClienteFormData } from '@/services/rotasClientesService';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

const initialFormData: RotaClienteFormData = {
  codigo_rota: '',
  descricao_rota: '',
  inativo: false,
};

export function RotasClientesTab() {
  const PAGE_LIMIT = 100;
  const [loading, setLoading] = useState(false);
  const [rotas, setRotas] = useState<RotaCliente[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState<RotaClienteFormData>(initialFormData);

  const loadRotas = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) {
      setRotas([]);
      setPage(1);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await rotasClientesService.getAll(search, nextPage, PAGE_LIMIT, filtroStatus);
      setRotas((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(result.page ?? nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error: any) {
      console.error('Erro ao carregar rotas:', error);
      toast.error(error?.message || 'Erro ao carregar rotas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRotas(true);
  }, [filtroStatus]);

  const handleSearch = () => loadRotas(true);
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

  const openEdit = async (r: RotaCliente) => {
    setEditId(r.rota_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await rotasClientesService.getById(r.rota_id);
      if (detail) {
        setFormData({
          codigo_rota: detail.codigo_rota || '',
          descricao_rota: detail.descricao_rota || '',
          inativo: detail.inativo ?? false,
        });
      }
    } catch (e: any) {
      toast.error('Erro ao carregar dados da rota');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.descricao_rota.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      await rotasClientesService.create(formData);
      toast.success('Rota criada com sucesso');
      setCreateOpen(false);
      resetForm();
      loadRotas(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar rota');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!formData.descricao_rota.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      await rotasClientesService.update(editId, formData);
      toast.success('Rota atualizada com sucesso');
      setEditOpen(false);
      resetForm();
      loadRotas(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar rota');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta rota?')) return;
    setDeleteLoading(id);
    try {
      await rotasClientesService.delete(id);
      toast.success('Rota excluída com sucesso');
      loadRotas(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir rota');
    } finally {
      setDeleteLoading(null);
    }
  };

  const isInitialLoading = loading && rotas.length === 0;
  const isLoadingMore = loading && rotas.length > 0;

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadRotas();
    }
  };

  const formContent = (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
        <Input
          className="h-8 text-sm"
          value={formData.descricao_rota}
          onChange={(e) => setFormData({ ...formData, descricao_rota: toUpperValue(e.target.value) })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={formData.inativo}
          onCheckedChange={(c) => setFormData({ ...formData, inativo: c as boolean })}
        />
        <label className="text-sm">Inativo</label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Route className="h-5 w-5" />
              Rotas de Clientes ({rotas.length})
            </CardTitle>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Rota
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
                <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-28 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : rotas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma rota encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    rotas.map((r) => (
                      <TableRow key={r.rota_id} className={r.inativo ? 'opacity-50' : ''}>
                        <TableCell className="font-mono text-xs">{r.codigo_rota || '-'}</TableCell>
                        <TableCell className="font-medium">{r.descricao_rota}</TableCell>
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
                                    onClick={() => handleDelete(r.rota_id)}
                                    disabled={deleteLoading === r.rota_id}
                                  >
                                    {deleteLoading === r.rota_id ? (
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
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Rota</DialogTitle>
          </DialogHeader>
          {formContent}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Rota</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.descricao_rota ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            formContent
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
