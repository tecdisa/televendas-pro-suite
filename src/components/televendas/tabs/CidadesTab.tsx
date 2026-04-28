import { useEffect, useState } from 'react';
import { MapPinned, Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { citiesRegistryService, type CidadeCadastro } from '@/services/citiesRegistryService';
import { metadataService, type Uf } from '@/services/metadataService';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

const PAGE_LIMIT = 100;

const initialFormData = {
  codigo_cidade: '',
  nome_cidade: '',
  codigo_ibge: '',
  siafi: '',
  uf: '',
};

const toUpperValue = (value: string | number | null | undefined) =>
  String(value ?? '').toUpperCase();

export function CidadesTab() {
  const { canInsert } = useModuleCrudPermission('CIDADES');
  const [loading, setLoading] = useState(false);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [ufsApi, setUfsApi] = useState<Uf[]>([]);
  const [cidades, setCidades] = useState<CidadeCadastro[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroUf, setFiltroUf] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    setUfsLoading(true);
    metadataService
      .getUfs()
      .then(setUfsApi)
      .catch(() => toast.error('Erro ao carregar UFs'))
      .finally(() => setUfsLoading(false));
  }, []);

  const loadCidades = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) {
      setCidades([]);
      setPage(1);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await citiesRegistryService.getAll(
        search,
        nextPage,
        PAGE_LIMIT,
        filtroUf === 'all' ? undefined : filtroUf,
      );
      setCidades((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
      toast.error('Erro ao carregar cidades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCidades(true);
  }, [filtroUf]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditId(null);
  };

  const handleSearch = () => loadCidades(true);
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') handleSearch();
  };

  const openCreate = () => {
    if (!canInsert) return;
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = async (cidade: CidadeCadastro) => {
    setEditId(cidade.cidade_id);
    setEditOpen(true);
    setFormLoading(true);
    try {
      const detail = await citiesRegistryService.getById(cidade.cidade_id);
      if (!detail) throw new Error('Cidade não encontrada');
      setFormData({
        codigo_cidade: detail.codigo_cidade || '',
        nome_cidade: detail.nome_cidade || '',
        codigo_ibge: detail.codigo_ibge || '',
        siafi: detail.siafi || '',
        uf: detail.uf || '',
      });
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar cidade');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.nome_cidade.trim()) {
      toast.error('Preencha o nome da cidade');
      return false;
    }
    if (!formData.uf.trim()) {
      toast.error('Selecione a UF');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      await citiesRegistryService.create({
        nome_cidade: formData.nome_cidade.trim(),
        codigo_ibge: formData.codigo_ibge.trim() || null,
        siafi: formData.siafi.trim() || null,
        uf: formData.uf,
      });
      toast.success('Cidade criada com sucesso');
      setCreateOpen(false);
      resetForm();
      loadCidades(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar cidade');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !validateForm()) return;
    setFormLoading(true);
    try {
      await citiesRegistryService.update(editId, {
        nome_cidade: formData.nome_cidade.trim(),
        codigo_ibge: formData.codigo_ibge.trim() || null,
        siafi: formData.siafi.trim() || null,
        uf: formData.uf,
      });
      toast.success('Cidade atualizada com sucesso');
      setEditOpen(false);
      resetForm();
      loadCidades(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar cidade');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta cidade?')) return;
    setDeleteLoading(id);
    try {
      await citiesRegistryService.delete(id);
      toast.success('Cidade excluída com sucesso');
      loadCidades(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir cidade');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (!hasMore || loading) return;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 24) {
      loadCidades();
    }
  };

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
          <Input className="h-8 text-sm bg-muted" value={formData.codigo_cidade} readOnly />
        </div>
        <div className="col-span-1 md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">UF *</label>
          <Select
            value={formData.uf || 'none'}
            onValueChange={(value) =>
              setFormData({ ...formData, uf: value === 'none' ? '' : value })
            }
            disabled={ufsLoading}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione</SelectItem>
              {ufsApi.map((uf) => (
                <SelectItem key={uf.uf} value={uf.uf}>
                  {uf.uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Código IBGE</label>
          <Input
            className="h-8 text-sm"
            value={formData.codigo_ibge}
            onChange={(event) =>
              setFormData({
                ...formData,
                codigo_ibge: event.target.value.replace(/\D+/g, '').slice(0, 7),
              })
            }
          />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Código SIAFI</label>
          <Input
            className="h-8 text-sm"
            value={formData.siafi}
            onChange={(event) =>
              setFormData({
                ...formData,
                siafi: event.target.value.replace(/\D+/g, '').slice(0, 10),
              })
            }
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome da cidade *</label>
        <Input
          className="h-8 text-sm"
          value={formData.nome_cidade}
          onChange={(event) =>
            setFormData({ ...formData, nome_cidade: toUpperValue(event.target.value) })
          }
        />
      </div>
    </div>
  );

  const isInitialLoading = loading && cidades.length === 0;
  const isLoadingMore = loading && cidades.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPinned className="h-5 w-5" />
              Cidades ({cidades.length})
            </CardTitle>
            <Button onClick={openCreate} size="sm" disabled={!canInsert}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Cidade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Buscar por código, nome, UF, IBGE ou SIAFI..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Select value={filtroUf} onValueChange={setFiltroUf} disabled={ufsLoading}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas UFs</SelectItem>
                {ufsApi.map((uf) => (
                  <SelectItem key={uf.uf} value={uf.uf}>
                    {uf.uf}
                  </SelectItem>
                ))}
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
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Código</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="w-20">UF</TableHead>
                      <TableHead className="w-28">IBGE</TableHead>
                      <TableHead className="w-28">SIAFI</TableHead>
                      <TableHead className="w-28 text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isInitialLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : cidades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma cidade encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      cidades.map((cidade) => (
                        <TableRow key={cidade.cidade_id}>
                          <TableCell className="font-mono text-xs">{cidade.codigo_cidade || '-'}</TableCell>
                          <TableCell className="font-medium">{cidade.nome_cidade}</TableCell>
                          <TableCell>{cidade.uf || '-'}</TableCell>
                          <TableCell>{cidade.codigo_ibge || '-'}</TableCell>
                          <TableCell>{cidade.siafi || '-'}</TableCell>
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <div className="flex items-center justify-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openEdit(cidade)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar cidade</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => handleDelete(cidade.cidade_id)}
                                      disabled={deleteLoading === cidade.cidade_id}
                                    >
                                      {deleteLoading === cidade.cidade_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir cidade</TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}

                    {isLoadingMore && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-3 text-muted-foreground">
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Cidade</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={formLoading}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cidade</DialogTitle>
          </DialogHeader>
          {formLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {formContent}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={formLoading}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdate} disabled={formLoading}>
                  Salvar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
