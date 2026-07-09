import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Grid3X3, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { groupsService, Grupo } from '@/services/groupsService';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

const initialFormData = {
  codigo_divisao: '',
  grupo_id: 0,
  descricao_divisao: '',
  inativo: false,
};

export function DivisoesTab() {
  const { canInsert } = useModuleCrudPermission('DIVISOES');
  const PAGE_LIMIT = 100;
  const [loading, setLoading] = useState(false);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [gruposLoading, setGruposLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGrupoId, setFilterGrupoId] = useState<number | undefined>(undefined);
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const loadDivisoes = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) {
      setDivisoes([]);
      setPage(1);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await divisionsService.getAll(search, filterGrupoId, nextPage, PAGE_LIMIT, filtroStatus);
      setDivisoes((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error) {
      console.error('Erro ao carregar divisões:', error);
      toast.error('Erro ao carregar divisões');
    } finally {
      setLoading(false);
    }
  };

  const loadGrupos = async () => {
    setGruposLoading(true);
    try {
      const result = await groupsService.getAll('', 1, 500);
      setGrupos(result.data);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    } finally {
      setGruposLoading(false);
    }
  };

  useEffect(() => {
    loadGrupos();
    loadDivisoes(true);
  }, []);

  useEffect(() => {
    loadDivisoes(true);
  }, [filtroStatus, filterGrupoId]);

  const handleSearch = () => loadDivisoes(true);
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

  const openEdit = async (d: Divisao) => {
    setEditId(d.divisao_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await divisionsService.getById(d.divisao_id);
      if (detail) {
        setFormData({
          codigo_divisao: detail.codigo_divisao || '',
          grupo_id: detail.grupo_id || 0,
          descricao_divisao: detail.descricao_divisao || '',
          inativo: detail.inativo || false,
        });
      }
    } catch (e) {
      toast.error('Erro ao carregar dados da divisão');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.descricao_divisao.trim() || !formData.grupo_id) {
      toast.error('Preencha os campos obrigatórios: Grupo e Descrição');
      return;
    }
    setFormLoading(true);
    try {
      await divisionsService.create({
        grupo_id: formData.grupo_id,
        descricao_divisao: formData.descricao_divisao.trim(),
        inativo: formData.inativo,
      });
      toast.success('Divisão criada com sucesso');
      setCreateOpen(false);
      resetForm();
      loadDivisoes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar divisão');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setFormLoading(true);
    try {
      await divisionsService.update(editId, {
        grupo_id: formData.grupo_id,
        descricao_divisao: formData.descricao_divisao.trim(),
        inativo: formData.inativo,
      });
      toast.success('Divisão atualizada com sucesso');
      setEditOpen(false);
      resetForm();
      loadDivisoes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar divisão');
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
      await divisionsService.delete(id);
      toast.success('Divisão excluída com sucesso');
      loadDivisoes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir divisão');
    } finally {
      setDeleteLoading(null);
    }
  };

  const isInitialLoading = loading && divisoes.length === 0;
  const isLoadingMore = loading && divisoes.length > 0;

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadDivisoes();
    }
  };

  const getGrupoNome = (grupoId?: number) => {
    if (!grupoId) return '-';
    const g = grupos.find((gr) => gr.grupo_id === grupoId);
    return g ? g.descricao_grupo : String(grupoId);
  };

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-9">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Grupo *</label>
          <Select
            value={formData.grupo_id ? String(formData.grupo_id) : ''}
            onValueChange={(v) => setFormData({ ...formData, grupo_id: Number(v) })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione o grupo" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-60">
              {grupos.map((g) => (
                <SelectItem key={g.grupo_id} value={String(g.grupo_id)}>
                  {g.descricao_grupo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 md:col-span-3 flex items-center gap-2 pt-5">
          <Checkbox
            checked={!formData.inativo}
            onCheckedChange={(checked) => setFormData({ ...formData, inativo: checked !== true })}
          />
          <label className="text-sm">Ativo</label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-12">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
          <Input
            className="h-8 text-sm"
            value={formData.descricao_divisao}
            onChange={(e) => setFormData({ ...formData, descricao_divisao: toUpperValue(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Divisões de Produtos ({divisoes.length})
            </CardTitle>
            <Button variant="default" onClick={openCreate} size="sm" disabled={!canInsert}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Divisão
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
            <Select
              value={filterGrupoId ? String(filterGrupoId) : 'all'}
              onValueChange={(v) => setFilterGrupoId(v === 'all' ? undefined : Number(v))}
            >
              <SelectTrigger className="w-full sm:w-48 h-9">
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-60">
                <SelectItem value="all">Todos os grupos</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g.grupo_id} value={String(g.grupo_id)}>
                    {g.descricao_grupo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="default" onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[60vh] overflow-auto scrollbar-thin" onScroll={handleListScroll}>
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead className="hidden md:table-cell">Grupo</TableHead>
                    <TableHead>Divisão</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-28 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : divisoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma divisão encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    divisoes.map((d) => (
                      <TableRow key={d.divisao_id} className={d.inativo ? 'opacity-50' : ''}>
                        <TableCell className="font-mono text-xs">{d.codigo_divisao || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {getGrupoNome(d.grupo_id)}
                        </TableCell>
                        <TableCell className="font-medium">{d.descricao_divisao}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded ${d.inativo ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                            {d.inativo ? 'Inativo' : 'Ativo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <div className="flex items-center justify-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}>
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
                                    onClick={() => handleDelete(d.divisao_id)}
                                    disabled={deleteLoading === d.divisao_id}
                                  >
                                    {deleteLoading === d.divisao_id ? (
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
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
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
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Divisão</DialogTitle>
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
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Divisão</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.descricao_divisao ? (
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
              Tem certeza que deseja excluir esta divisão? Esta ação não pode ser desfeita.
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
