import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Layers, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { groupsService, Grupo } from '@/services/groupsService';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

const initialFormData = {
  codigo_grupo: '',
  descricao_grupo: '',
  inativo: false,
};

export function GruposTab() {
  const PAGE_LIMIT = 100;
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const loadGrupos = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) {
      setGrupos([]);
      setPage(1);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await groupsService.getAll(search, nextPage, PAGE_LIMIT, filtroStatus);
      setGrupos((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrupos(true);
  }, [filtroStatus]);

  const handleSearch = () => loadGrupos(true);
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

  const openEdit = async (g: Grupo) => {
    setEditId(g.grupo_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await groupsService.getById(g.grupo_id);
      if (detail) {
        setFormData({
          codigo_grupo: detail.codigo_grupo || '',
          descricao_grupo: detail.descricao_grupo || '',
          inativo: detail.inativo || false,
        });
      }
    } catch (e) {
      toast.error('Erro ao carregar dados do grupo');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.descricao_grupo.trim()) {
      toast.error('Preencha os campos obrigatórios: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      await groupsService.create({
        descricao_grupo: formData.descricao_grupo.trim(),
        inativo: formData.inativo,
      });
      toast.success('Grupo criado com sucesso');
      setCreateOpen(false);
      resetForm();
      loadGrupos(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar grupo');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setFormLoading(true);
    try {
      await groupsService.update(editId, {
        descricao_grupo: formData.descricao_grupo.trim(),
        inativo: formData.inativo,
      });
      toast.success('Grupo atualizado com sucesso');
      setEditOpen(false);
      resetForm();
      loadGrupos(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar grupo');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return;
    setDeleteLoading(id);
    try {
      await groupsService.delete(id);
      toast.success('Grupo excluído com sucesso');
      loadGrupos(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir grupo');
    } finally {
      setDeleteLoading(null);
    }
  };

  const isInitialLoading = loading && grupos.length === 0;
  const isLoadingMore = loading && grupos.length > 0;

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadGrupos();
    }
  };

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-9">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
          <Input
            className="h-8 text-sm"
            value={formData.descricao_grupo}
            onChange={(e) => setFormData({ ...formData, descricao_grupo: toUpperValue(e.target.value) })}
          />
        </div>
        <div className="col-span-3 flex items-center gap-2 pt-5">
          <Checkbox
            checked={formData.inativo}
            onCheckedChange={(c) => setFormData({ ...formData, inativo: c as boolean })}
          />
          <label className="text-sm">Inativo</label>
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
              <Layers className="h-5 w-5" />
              Grupos de Produtos
            </CardTitle>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
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
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : grupos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum grupo encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    grupos.map((g) => (
                      <TableRow key={g.grupo_id} className={g.inativo ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-xs">{g.codigo_grupo || '-'}</TableCell>
                      <TableCell className="font-medium">{g.descricao_grupo}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded ${g.inativo ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                            {g.inativo ? 'Inativo' : 'Ativo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(g.grupo_id)}
                              disabled={deleteLoading === g.grupo_id}
                            >
                              {deleteLoading === g.grupo_id ? (
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
            <DialogTitle>Novo Grupo</DialogTitle>
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
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.descricao_grupo ? (
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
