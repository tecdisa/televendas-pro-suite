import { useEffect, useState } from 'react';
import { Search, UserRoundCog, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usersService, type UsuarioCadastro, type UsuarioCadastroFormData } from '@/services/usersService';

const PAGE_LIMIT = 100;

const initialFormData: UsuarioCadastroFormData = {
  usuario: '',
  nome: '',
  senha: '',
  email: '',
  ativo: true,
  admin: false,
  forca_de_vendas: false,
  empresa_master_id: null,
};

const statusLabel = (ativo?: boolean) => (ativo ? 'Ativo' : 'Inativo');
const perfilLabel = (admin?: boolean) => (admin ? 'Administrador' : 'Usuario');

export function UsuariosTab() {
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioCadastro[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState<UsuarioCadastroFormData>(initialFormData);

  const loadUsuarios = async (reset = false) => {
    if (loading) return;
    setLoading(true);

    if (reset) {
      setUsuarios([]);
      setPage(1);
      setHasMore(true);
    }

    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await usersService.getAll(search, nextPage, PAGE_LIMIT, filtroStatus);
      setUsuarios((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(result.page ?? nextPage);

      const total = result.total ?? 0;
      const nextHasMore = total
        ? nextPage * PAGE_LIMIT < total
        : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios(true);
  }, [filtroStatus]);

  const handleSearch = () => loadUsuarios(true);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') handleSearch();
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = async (usuario: UsuarioCadastro) => {
    setEditId(usuario.usuario_id);
    setEditOpen(true);
    setFormLoading(true);

    try {
      const detail = await usersService.getById(usuario.usuario_id);
      if (!detail) throw new Error('Usuario nao encontrado');

      setFormData({
        usuario: detail.usuario || '',
        nome: detail.nome || '',
        senha: '',
        email: detail.email || '',
        ativo: detail.ativo ?? true,
        admin: detail.admin ?? false,
        forca_de_vendas: detail.forca_de_vendas ?? false,
        empresa_master_id: detail.empresa_master_id ?? null,
        empresa_ids: detail.empresa_ids ?? [],
      });
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar usuario');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const validateForm = (mode: 'create' | 'edit') => {
    if (!formData.usuario?.trim()) {
      toast.error('Preencha o usuario');
      return false;
    }
    if (!formData.nome?.trim()) {
      toast.error('Preencha o nome');
      return false;
    }
    if (mode === 'create' && !formData.senha?.trim()) {
      toast.error('Preencha a senha');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm('create')) return;
    setFormLoading(true);

    try {
      await usersService.create({
        usuario: formData.usuario.trim(),
        nome: formData.nome.trim(),
        senha: formData.senha?.trim(),
        email: formData.email?.trim().toLowerCase() || null,
        ativo: formData.ativo ?? true,
        admin: formData.admin ?? false,
        forca_de_vendas: formData.forca_de_vendas ?? false,
        empresa_master_id: formData.empresa_master_id ?? null,
      });
      toast.success('Usuario criado com sucesso');
      setCreateOpen(false);
      resetForm();
      loadUsuarios(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar usuario');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !validateForm('edit')) return;
    setFormLoading(true);

    try {
      await usersService.update(editId, {
        usuario: formData.usuario.trim(),
        nome: formData.nome.trim(),
        senha: formData.senha?.trim() || undefined,
        email: formData.email?.trim().toLowerCase() || null,
        ativo: formData.ativo ?? true,
        admin: formData.admin ?? false,
        forca_de_vendas: formData.forca_de_vendas ?? false,
        empresa_master_id: formData.empresa_master_id ?? null,
        empresa_ids: formData.empresa_ids,
      });
      toast.success('Usuario atualizado com sucesso');
      setEditOpen(false);
      resetForm();
      loadUsuarios(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar usuario');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuario desta empresa?')) return;
    setDeleteLoading(id);

    try {
      await usersService.delete(id);
      toast.success('Usuario excluido com sucesso');
      loadUsuarios(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir usuario');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (!hasMore || loading) return;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 24) {
      loadUsuarios();
    }
  };

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-6">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Usuario *</label>
          <Input
            className="h-8 text-sm"
            value={formData.usuario}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, usuario: event.target.value }))
            }
          />
        </div>
        <div className="col-span-1 md:col-span-6">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
          <Input
            className="h-8 text-sm"
            value={formData.nome}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, nome: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-7">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
          <Input
            type="email"
            className="h-8 text-sm"
            value={formData.email ?? ''}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, email: event.target.value }))
            }
          />
        </div>
        <div className="col-span-1 md:col-span-5">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Senha {editOpen ? '(opcional)' : '*'}
          </label>
          <Input
            type="password"
            className="h-8 text-sm"
            value={formData.senha ?? ''}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, senha: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Empresa Master ID
          </label>
          <Input
            className="h-8 text-sm"
            inputMode="numeric"
            value={formData.empresa_master_id ?? ''}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D+/g, '');
              setFormData((prev) => ({
                ...prev,
                empresa_master_id: digits ? Number(digits) : null,
              }));
            }}
          />
        </div>

        <div className="col-span-1 md:col-span-8 flex items-end pb-1 gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={formData.ativo ?? true}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, ativo: Boolean(checked) }))
              }
            />
            Ativo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={formData.admin ?? false}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, admin: Boolean(checked) }))
              }
            />
            Administrador
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={formData.forca_de_vendas ?? false}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, forca_de_vendas: Boolean(checked) }))
              }
            />
            Forca de vendas
          </label>
        </div>
      </div>
    </div>
  );

  const isInitialLoading = loading && usuarios.length === 0;
  const isLoadingMore = loading && usuarios.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserRoundCog className="h-5 w-5" />
              Usuarios ({usuarios.length})
            </CardTitle>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-8"
                placeholder="Buscar por usuario, nome ou e-mail..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Select
              value={filtroStatus}
              onValueChange={(value) =>
                setFiltroStatus(value as 'ativos' | 'inativos' | 'todos')
              }
            >
              <SelectTrigger className="w-full sm:w-44 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleSearch}>
              Buscar
            </Button>
          </div>

          {isInitialLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Carregando usuarios...</div>
          ) : (
            <div
              className="rounded-md border max-h-[60vh] overflow-auto"
              onScroll={handleListScroll}
            >
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Forca de vendas</TableHead>
                    <TableHead className="w-24 text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.usuario_id}>
                      <TableCell className="font-medium">{usuario.usuario}</TableCell>
                      <TableCell>{usuario.nome}</TableCell>
                      <TableCell>{usuario.email || '-'}</TableCell>
                      <TableCell>{statusLabel(usuario.ativo)}</TableCell>
                      <TableCell>{perfilLabel(usuario.admin)}</TableCell>
                      <TableCell>{usuario.forca_de_vendas ? 'Sim' : 'Nao'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => openEdit(usuario)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar usuario</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(usuario.usuario_id)}
                                  disabled={deleteLoading === usuario.usuario_id}
                                >
                                  {deleteLoading === usuario.usuario_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir usuario</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!usuarios.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum usuario encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground border-t bg-background/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carregando mais...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Usuario</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                resetForm();
              }}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
