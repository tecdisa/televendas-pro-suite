import { useEffect, useState } from 'react';
import { Search, UserRoundCog, Plus, Pencil, Trash2, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  usersService,
  type UsuarioCadastro,
  type UsuarioCadastroFormData,
  type UsuarioPermissao,
} from '@/services/usersService';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

const PAGE_LIMIT = 100;

const initialFormData: UsuarioCadastroFormData = {
  usuario: '',
  nome: '',
  email: '',
  ativo: true,
  admin: false,
  forca_de_vendas: false,
};

const statusLabel = (ativo?: boolean) => (ativo ? 'Ativo' : 'Inativo');
const perfilLabel = (admin?: boolean, adminMaster?: boolean) => {
  if (adminMaster) return 'Admin Master';
  return admin ? 'Administrador' : 'Usuario';
};

export function UsuariosTab() {
  const { canInsert } = useModuleCrudPermission('USUARIOS');
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioCadastro[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [viewUsuario, setViewUsuario] = useState<UsuarioCadastro | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState<UsuarioCadastroFormData>(initialFormData);
  const [permissoes, setPermissoes] = useState<UsuarioPermissao[]>([]);

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
    setPermissoes([]);
    setEditId(null);
  };

  const openCreate = () => {
    if (!canInsert) return;
    resetForm();
    setInviteEmail('');
    setCreateOpen(true);
  };

  const openEdit = async (usuario: UsuarioCadastro) => {
    setEditId(usuario.usuario_id);
    setEditOpen(true);
    setFormLoading(true);

    try {
      const [detail, permissoesUsuario] = await Promise.all([
        usersService.getById(usuario.usuario_id),
        usersService.getPermissions(usuario.usuario_id),
      ]);
      if (!detail) throw new Error('Usuario nao encontrado');

      setFormData({
        usuario_id: detail.usuario_id,
        usuario: detail.usuario || '',
        nome: detail.nome || '',
        email: detail.email || '',
        ativo: detail.ativo ?? true,
        admin: detail.admin ?? false,
        forca_de_vendas: detail.forca_de_vendas ?? false,
      });
      setPermissoes(permissoesUsuario);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar usuario');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const openView = async (usuario: UsuarioCadastro) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewUsuario(usuario);

    try {
      const detail = await usersService.getById(usuario.usuario_id);
      if (!detail) throw new Error('Usuario nao encontrado');
      setViewUsuario(detail);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar usuario');
      setViewOpen(false);
      setViewUsuario(null);
    } finally {
      setViewLoading(false);
    }
  };

  const validateForm = (mode: 'create' | 'edit') => {
    if (mode === 'create') {
      const email = inviteEmail.trim().toLowerCase();
      if (!email) {
        toast.error('Preencha o e-mail');
        return false;
      }
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!isEmail) {
        toast.error('Informe um e-mail valido');
        return false;
      }
      return true;
    }

    if (!editId) {
      toast.error('Usuario nao encontrado');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateForm('create')) return;
    setFormLoading(true);

    try {
      const appBaseUrl =
        typeof window !== 'undefined' ? window.location.origin : '';
      const basePath =
        typeof import.meta !== 'undefined' &&
        typeof import.meta.env?.BASE_URL === 'string'
          ? import.meta.env.BASE_URL
          : '/';
      const registerUrl = appBaseUrl
        ? new URL(
            `${basePath.replace(/\/$/, '')}/registre-se`,
            appBaseUrl,
          ).toString()
        : undefined;

      const result = await usersService.inviteLogin({
        email: inviteEmail.trim().toLowerCase(),
        registerUrl,
      });

      if (result.status === 'linked_existing') {
        if (result.email_delivery?.status === 'sent') {
          toast.success('Login existente vinculado e e-mail enviado');
        } else if (result.email_delivery?.status === 'skipped') {
          toast.success(
            'Login existente vinculado. E-mail pendente por falta de SMTP.',
          );
        } else if (result.email_delivery?.status === 'failed') {
          toast.success(
            'Login existente vinculado, mas houve falha no envio do e-mail.',
          );
        } else {
          toast.success('Login existente vinculado com sucesso');
        }
      } else {
        if (result.email_delivery?.status === 'sent') {
          toast.success('Convite de cadastro enviado por e-mail');
        } else if (result.email_delivery?.status === 'skipped') {
          toast.success(
            'Convite registrado, mas o e-mail nao foi enviado por falta de SMTP.',
          );
        } else if (result.email_delivery?.status === 'failed') {
          toast.success(
            'Convite registrado, mas houve falha no envio do e-mail.',
          );
        } else {
          toast.success('Convite para cadastro processado');
        }
      }
      setCreateOpen(false);
      setInviteEmail('');
      resetForm();
      loadUsuarios(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao convidar usuario');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !validateForm('edit')) return;
    setFormLoading(true);

    try {
      await usersService.update(editId, {
        ativo: formData.ativo ?? true,
        admin: formData.admin ?? false,
        forca_de_vendas: formData.forca_de_vendas ?? false,
      });
      await usersService.updatePermissions(
        editId,
        permissoes.map((item) => ({
          funcao_sistema_id: item.funcao_sistema_id,
          can_select: item.can_select,
          can_insert: item.can_insert,
          can_update: item.can_update,
          can_delete: item.can_delete,
        })),
      );
      toast.success('Vinculo do usuario atualizado com sucesso');
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

  const togglePermissao = (
    funcaoSistemaId: number,
    field: 'can_select' | 'can_insert' | 'can_update' | 'can_delete',
    checked: boolean,
  ) => {
    setPermissoes((prev) =>
      prev.map((item) =>
        item.funcao_sistema_id === funcaoSistemaId
          ? { ...item, [field]: checked }
          : item,
      ),
    );
  };

  const inviteFormContent = (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          E-mail da pessoa *
        </label>
        <Input
          type="email"
          className="h-8 text-sm"
          placeholder="nome@empresa.com.br"
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Se o e-mail ja tiver login, o sistema vincula esta empresa e envia aviso.
        Se nao tiver login, envia convite para registro.
      </p>
    </div>
  );

  const editFormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Usuario</label>
          <Input className="h-8 text-sm" value={formData.usuario ?? ''} disabled />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
          <Input className="h-8 text-sm" value={formData.nome ?? ''} disabled />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
          <Input className="h-8 text-sm" value={formData.email ?? ''} disabled />
        </div>
      </div>

      <div className="border-b border-primary/50 pb-1 mt-2">
        <span className="text-sm font-medium text-primary">Vinculo na Empresa</span>
      </div>

      <div className="space-y-1 pt-1">
        <label className="text-xs font-medium text-muted-foreground block">
          Status do usuario
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={formData.ativo ?? true}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, ativo: Boolean(checked) }))
            }
          />
          Ativo
        </label>
      </div>

      <div className="border-b border-primary/50 pb-1 mt-4">
        <span className="text-sm font-medium text-primary">Funcoes</span>
      </div>

      <div className="flex flex-wrap items-end pb-1 gap-6">
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

      <div className="border-b border-primary/50 pb-1 mt-4">
        <span className="text-sm font-medium text-primary">Permissoes por Modulo</span>
      </div>

      <div className="rounded-md border max-h-[38vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Modulo</TableHead>
              <TableHead className="w-20 text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">C</span>
                    </TooltipTrigger>
                    <TooltipContent>Consultar (Select)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="w-20 text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">I</span>
                    </TooltipTrigger>
                    <TooltipContent>Inserir (Insert)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="w-20 text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">A</span>
                    </TooltipTrigger>
                    <TooltipContent>Alterar (Update)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="w-20 text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">E</span>
                    </TooltipTrigger>
                    <TooltipContent>Excluir (Delete)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissoes.map((item) => (
              <TableRow key={item.funcao_sistema_id}>
                <TableCell className="font-medium">
                  {item.obs?.trim() || item.funcao}
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.can_select}
                    onCheckedChange={(checked) =>
                      togglePermissao(
                        item.funcao_sistema_id,
                        'can_select',
                        Boolean(checked),
                      )
                    }
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.can_insert}
                    onCheckedChange={(checked) =>
                      togglePermissao(
                        item.funcao_sistema_id,
                        'can_insert',
                        Boolean(checked),
                      )
                    }
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.can_update}
                    onCheckedChange={(checked) =>
                      togglePermissao(
                        item.funcao_sistema_id,
                        'can_update',
                        Boolean(checked),
                      )
                    }
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.can_delete}
                    onCheckedChange={(checked) =>
                      togglePermissao(
                        item.funcao_sistema_id,
                        'can_delete',
                        Boolean(checked),
                      )
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
            {!permissoes.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                  Nenhum modulo de permissao encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const viewFormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Usuario</label>
          <Input className="h-8 text-sm" value={viewUsuario?.usuario ?? ''} disabled />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
          <Input className="h-8 text-sm" value={viewUsuario?.nome ?? ''} disabled />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
          <Input className="h-8 text-sm" value={viewUsuario?.email ?? ''} disabled />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
          <Input className="h-8 text-sm" value={statusLabel(viewUsuario?.ativo)} disabled />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Perfil</label>
          <Input
            className="h-8 text-sm"
            value={perfilLabel(viewUsuario?.admin, viewUsuario?.admin_master)}
            disabled
          />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Forca de vendas
          </label>
          <Input
            className="h-8 text-sm"
            value={viewUsuario?.forca_de_vendas ? 'Sim' : 'Nao'}
            disabled
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
          <Input className="h-8 text-sm" value={viewUsuario?.fone ?? ''} disabled />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
          <Input className="h-8 text-sm" value={viewUsuario?.whatsapp ?? ''} disabled />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
          <Input className="h-8 text-sm" value={viewUsuario?.cep ?? ''} disabled />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-6">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereco</label>
          <Input className="h-8 text-sm" value={viewUsuario?.endereco ?? ''} disabled />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Numero</label>
          <Input className="h-8 text-sm" value={viewUsuario?.numero ?? ''} disabled />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Complemento</label>
          <Input className="h-8 text-sm" value={viewUsuario?.complemento ?? ''} disabled />
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
            <Button onClick={openCreate} size="sm" disabled={!canInsert}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Login
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
                    <TableHead className="w-36 text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.usuario_id}>
                      <TableCell className="font-medium">{usuario.usuario}</TableCell>
                      <TableCell>{usuario.nome}</TableCell>
                      <TableCell>{usuario.email || '-'}</TableCell>
                      <TableCell>{statusLabel(usuario.ativo)}</TableCell>
                      <TableCell>
                        {perfilLabel(usuario.admin, usuario.admin_master)}
                      </TableCell>
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
                                  onClick={() => openView(usuario)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Visualizar usuario</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

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
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Cadastrar Login</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {inviteFormContent}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setInviteEmail('');
                resetForm();
              }}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Editar Vinculo do Usuario</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {editFormContent}
          </div>
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

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) {
            setViewUsuario(null);
            setViewLoading(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Visualizar Usuario</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {viewLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando usuario...
              </div>
            ) : (
              viewFormContent
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewOpen(false);
                setViewUsuario(null);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
