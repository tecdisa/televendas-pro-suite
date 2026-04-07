import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Network, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { redesService, Rede, RedeFormData } from '@/services/redesService';
import { metadataService, Uf, Cidade } from '@/services/metadataService';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

interface ExtendedFormData extends Omit<RedeFormData, 'cidade'> {
  cidade_id: number | null;
}

const initialFormData: ExtendedFormData = {
  codigo_rede: '',
  descricao_rede: '',
  cidade_id: null,
  uf: '',
  email: '',
  inativo: false,
};

export function RedesTab() {
  const PAGE_LIMIT = 100;
  const [loading, setLoading] = useState(false);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExtendedFormData>(initialFormData);

  // UF and Cidade states
  const [ufsApi, setUfsApi] = useState<Uf[]>([]);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [cidadesApi, setCidadesApi] = useState<Cidade[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);

  // Load UFs on mount
  useEffect(() => {
    setUfsLoading(true);
    metadataService.getUfs()
      .then(setUfsApi)
      .catch(() => toast.error('Erro ao carregar UFs'))
      .finally(() => setUfsLoading(false));
  }, []);

  // Load cities when UF changes
  useEffect(() => {
    if (!formData.uf) {
      setCidadesApi([]);
      return;
    }
    setCidadesLoading(true);
    metadataService.getCidadesPorUf(formData.uf)
      .then(setCidadesApi)
      .catch(() => toast.error('Erro ao carregar cidades'))
      .finally(() => setCidadesLoading(false));
  }, [formData.uf]);

  const loadRedes = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) {
      setRedes([]);
      setPage(1);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await redesService.getAll(search, nextPage, PAGE_LIMIT, filtroStatus);
      setRedes((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(result.page ?? nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error: any) {
      console.error('Erro ao carregar redes:', error);
      toast.error(error?.message || 'Erro ao carregar redes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRedes(true);
  }, [filtroStatus]);

  const handleSearch = () => loadRedes(true);
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

  const openEdit = async (r: Rede) => {
    setEditId(r.rede_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await redesService.getById(r.rede_id);
      if (detail) {
        setFormData({
          codigo_rede: detail.codigo_rede || '',
          descricao_rede: detail.descricao_rede || '',
          cidade_id: detail.cidade_id ?? null,
          uf: detail.uf || '',
          email: detail.email || '',
          inativo: detail.inativo ?? false,
        });
      }
    } catch (e: any) {
      toast.error('Erro ao carregar dados da rede');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.descricao_rede.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      // Find cidade name from cidade_id
      const cidadeObj = cidadesApi.find((c) => c.cidade_id === formData.cidade_id);
      await redesService.create({
        ...formData,
        cidade: cidadeObj?.nome_cidade || '',
      });
      toast.success('Rede criada com sucesso');
      setCreateOpen(false);
      resetForm();
      loadRedes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar rede');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!formData.descricao_rede.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      // Find cidade name from cidade_id
      const cidadeObj = cidadesApi.find((c) => c.cidade_id === formData.cidade_id);
      await redesService.update(editId, {
        ...formData,
        cidade: cidadeObj?.nome_cidade || '',
      });
      toast.success('Rede atualizada com sucesso');
      setEditOpen(false);
      resetForm();
      loadRedes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar rede');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta rede?')) return;
    setDeleteLoading(id);
    try {
      await redesService.delete(id);
      toast.success('Rede excluída com sucesso');
      loadRedes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir rede');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formContent = (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
        <Input
          className="h-8 text-sm"
          value={formData.descricao_rede}
          onChange={(e) => setFormData({ ...formData, descricao_rede: toUpperValue(e.target.value) })}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
          <Select
            value={formData.uf || 'none'}
            onValueChange={(v) => setFormData({ ...formData, uf: v === 'none' ? '' : v, cidade_id: null })}
            disabled={ufsLoading}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione</SelectItem>
              {ufsApi.map((u) => (
                <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 md:col-span-8">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
          <Select
            value={formData.cidade_id ? String(formData.cidade_id) : 'none'}
            onValueChange={(v) => setFormData({ ...formData, cidade_id: v === 'none' ? null : Number(v) })}
            disabled={!formData.uf || cidadesLoading}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={cidadesLoading ? 'Carregando...' : 'Selecione'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione</SelectItem>
              {cidadesApi.map((c) => (
                <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-9">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
          <Input
            type="email"
            className="h-8 text-sm"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
          />
        </div>
        <div className="col-span-1 md:col-span-3 flex items-center gap-2 pt-5">
          <Checkbox
            checked={!formData.inativo}
            onCheckedChange={(checked) => setFormData({ ...formData, inativo: checked !== true })}
          />
          <label className="text-sm">Ativo</label>
        </div>
      </div>
    </div>
  );

  const isInitialLoading = loading && redes.length === 0;
  const isLoadingMore = loading && redes.length > 0;

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadRedes();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5" />
              Redes ({redes.length})
            </CardTitle>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Rede
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
                <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">Cidade</TableHead>
                    <TableHead className="hidden md:table-cell w-12">UF</TableHead>
                    <TableHead className="hidden lg:table-cell">E-mail</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-28 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : redes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma rede encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    redes.map((r) => (
                      <TableRow key={r.rede_id} className={r.inativo ? 'opacity-50' : ''}>
                        <TableCell className="font-mono text-xs">{r.codigo_rede || '-'}</TableCell>
                        <TableCell className="font-medium">{r.descricao_rede}</TableCell>
                        <TableCell className="hidden md:table-cell">{r.cidade || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">{r.uf || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{r.email || '-'}</TableCell>
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
                                    onClick={() => handleDelete(r.rede_id)}
                                    disabled={deleteLoading === r.rede_id}
                                  >
                                    {deleteLoading === r.rede_id ? (
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
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
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
            <DialogTitle>Nova Rede</DialogTitle>
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
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Rede</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.descricao_rede ? (
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
