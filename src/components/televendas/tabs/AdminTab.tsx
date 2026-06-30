import { useEffect, useRef, useState } from 'react';
import { Search, Plus, Trash2, Loader2, Building2, Users, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { adminService, type AdminEmpresa, type EmpresaUsuario, type AdminUsuario } from '@/services/adminService';

export function AdminTab() {
  const [empresas, setEmpresas] = useState<AdminEmpresa[]>([]);
  const [empresaSearch, setEmpresaSearch] = useState('');
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<AdminEmpresa | null>(null);

  const [usuarios, setUsuarios] = useState<EmpresaUsuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [associarOpen, setAssociarOpen] = useState(false);
  const [assocSearch, setAssocSearch] = useState('');
  const [assocResults, setAssocResults] = useState<AdminUsuario[]>([]);
  const [assocLoading, setAssocLoading] = useState(false);
  const [assocSaving, setAssocSaving] = useState<number | null>(null);

  const assocDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEmpresas = async () => {
    setLoadingEmpresas(true);
    try {
      const data = await adminService.listEmpresas(empresaSearch || undefined);
      setEmpresas(data);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar empresas');
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const loadUsuarios = async (empresa: AdminEmpresa) => {
    setLoadingUsuarios(true);
    setUsuarios([]);
    try {
      const data = await adminService.listUsuariosEmpresa(empresa.empresa_id);
      setUsuarios(data);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar usuários');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (selectedEmpresa) loadUsuarios(selectedEmpresa);
  }, [selectedEmpresa]);

  const handleEmpresaSelect = (e: AdminEmpresa) => {
    setSelectedEmpresa(e);
  };

  const handleEmpresaSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadEmpresas();
  };

  const handleToggle = async (
    usuario: EmpresaUsuario,
    field: 'admin' | 'forca_de_vendas' | 'inativo',
    value: boolean,
  ) => {
    setTogglingId(usuario.usuario_empresa_id);
    try {
      await adminService.updateVinculo(usuario.usuario_empresa_id, { [field]: value });
      setUsuarios((prev) =>
        prev.map((u) =>
          u.usuario_empresa_id === usuario.usuario_empresa_id
            ? { ...u, [field]: value, ativo: field === 'inativo' ? !value : u.ativo }
            : u,
        ),
      );
      toast.success('Vínculo atualizado');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar vínculo');
    } finally {
      setTogglingId(null);
    }
  };

  const handleRemove = async (usuario: EmpresaUsuario) => {
    if (!confirm(`Remover ${usuario.nome || usuario.usuario} desta empresa?`)) return;
    setDeletingId(usuario.usuario_empresa_id);
    try {
      await adminService.deleteVinculo(usuario.usuario_empresa_id);
      setUsuarios((prev) => prev.filter((u) => u.usuario_empresa_id !== usuario.usuario_empresa_id));
      if (selectedEmpresa) {
        setEmpresas((prev) =>
          prev.map((e) =>
            e.empresa_id === selectedEmpresa.empresa_id
              ? { ...e, total_usuarios: Math.max(0, e.total_usuarios - 1) }
              : e,
          ),
        );
      }
      toast.success('Vínculo removido');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao remover vínculo');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssocSearch = (q: string) => {
    setAssocSearch(q);
    if (assocDebounce.current) clearTimeout(assocDebounce.current);
    if (!q.trim()) { setAssocResults([]); return; }
    assocDebounce.current = setTimeout(async () => {
      setAssocLoading(true);
      try {
        const data = await adminService.searchUsuarios(q, selectedEmpresa?.empresa_id);
        setAssocResults(data);
      } catch (e: any) {
        toast.error(e?.message || 'Erro ao buscar usuários');
      } finally {
        setAssocLoading(false);
      }
    }, 350);
  };

  const handleAssociar = async (u: AdminUsuario) => {
    if (!selectedEmpresa) return;
    setAssocSaving(u.usuario_id);
    try {
      await adminService.createVinculo(u.usuario_id, selectedEmpresa.empresa_id);
      toast.success(`${u.nome || u.usuario} vinculado com sucesso`);
      setAssocResults((prev) => prev.map((r) => r.usuario_id === u.usuario_id ? { ...r, ja_vinculado: true } : r));
      loadUsuarios(selectedEmpresa);
      setEmpresas((prev) =>
        prev.map((e) =>
          e.empresa_id === selectedEmpresa.empresa_id
            ? { ...e, total_usuarios: e.total_usuarios + 1 }
            : e,
        ),
      );
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao vincular usuário');
    } finally {
      setAssocSaving(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Left panel: empresa list */}
      <Card className="w-full lg:w-64 xl:w-72 shrink-0">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Empresas
          </CardTitle>
          <form onSubmit={handleEmpresaSearch} className="flex gap-1 mt-1">
            <Input
              placeholder="Buscar empresa..."
              value={empresaSearch}
              onChange={(e) => setEmpresaSearch(e.target.value)}
              className="h-7 text-xs"
            />
            <Button type="submit" size="icon" variant="outline" className="h-7 w-7 shrink-0">
              {loadingEmpresas ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            </Button>
          </form>
        </CardHeader>
        <CardContent className="px-2 pb-2 max-h-[60vh] lg:max-h-[calc(100vh-260px)] overflow-y-auto">
          {loadingEmpresas && !empresas.length ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : empresas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma empresa encontrada</p>
          ) : (
            <ul className="space-y-0.5">
              {empresas.map((e) => (
                <li key={e.empresa_id}>
                  <button
                    onClick={() => handleEmpresaSelect(e)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-xs transition-colors',
                      selectedEmpresa?.empresa_id === e.empresa_id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-foreground',
                    )}
                  >
                    <div className="font-medium truncate">{e.fantasia || e.razao_social}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-muted-foreground truncate text-[10px]">{e.uf} · {e.cnpj_cpf}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 shrink-0">
                        {e.total_usuarios}
                      </Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Right panel: users of selected empresa */}
      <Card className="flex-1 min-w-0 w-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">
                {selectedEmpresa
                  ? `Usuários — ${selectedEmpresa.fantasia || selectedEmpresa.razao_social}`
                  : 'Selecione uma empresa'}
              </span>
            </CardTitle>
            {selectedEmpresa && (
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => loadUsuarios(selectedEmpresa)}
                  disabled={loadingUsuarios}
                >
                  <RefreshCw className={cn('h-3 w-3 mr-1', loadingUsuarios && 'animate-spin')} />
                  Atualizar
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setAssocSearch(''); setAssocResults([]); setAssociarOpen(true); }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Associar Usuário
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 overflow-x-auto">
          {!selectedEmpresa ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Building2 className="h-10 w-10 opacity-20" />
              <p className="text-sm">Selecione uma empresa na lista</p>
            </div>
          ) : loadingUsuarios ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Users className="h-10 w-10 opacity-20" />
              <p className="text-sm">Nenhum usuário vinculado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Login</TableHead>
                  <TableHead className="text-xs text-center w-20">Admin</TableHead>
                  <TableHead className="text-xs text-center w-28">Força Vendas</TableHead>
                  <TableHead className="text-xs text-center w-16">Ativo</TableHead>
                  <TableHead className="text-xs text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => {
                  const busy = togglingId === u.usuario_empresa_id || deletingId === u.usuario_empresa_id;
                  return (
                    <TableRow key={u.usuario_empresa_id} className={cn(busy && 'opacity-60')}>
                      <TableCell className="text-xs font-medium max-w-[200px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {u.admin_master && (
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" title="Admin Master" />
                          )}
                          <span className="truncate">{u.nome || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[140px]">
                        <span className="truncate block">{u.usuario}</span>
                      </TableCell>
                      <TableCell className="text-center w-20">
                        <Switch
                          checked={u.admin}
                          disabled={busy || u.admin_master}
                          onCheckedChange={(v) => handleToggle(u, 'admin', v)}
                          className="scale-75"
                        />
                      </TableCell>
                      <TableCell className="text-center w-28">
                        <Switch
                          checked={u.forca_de_vendas}
                          disabled={busy}
                          onCheckedChange={(v) => handleToggle(u, 'forca_de_vendas', v)}
                          className="scale-75"
                        />
                      </TableCell>
                      <TableCell className="text-center w-16">
                        <Switch
                          checked={u.ativo}
                          disabled={busy || u.admin_master}
                          onCheckedChange={(v) => handleToggle(u, 'inativo', !v)}
                          className="scale-75"
                        />
                      </TableCell>
                      <TableCell className="text-right w-12">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          disabled={busy || u.admin_master}
                          onClick={() => handleRemove(u)}
                          title="Remover vínculo"
                        >
                          {deletingId === u.usuario_empresa_id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Associar Usuário dialog */}
      <Dialog open={associarOpen} onOpenChange={setAssociarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Associar Usuário
              {selectedEmpresa && (
                <span className="text-sm font-normal text-muted-foreground">
                  — {selectedEmpresa.fantasia || selectedEmpresa.razao_social}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, login ou e-mail..."
                value={assocSearch}
                onChange={(e) => handleAssocSearch(e.target.value)}
                className="pl-8 text-sm"
                autoFocus
              />
            </div>

            <div className="min-h-[200px] max-h-[320px] overflow-y-auto">
              {assocLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !assocSearch.trim() ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Digite para buscar usuários
                </p>
              ) : assocResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhum usuário encontrado
                </p>
              ) : (
                <ul className="space-y-1">
                  {assocResults.map((u) => (
                    <li
                      key={u.usuario_id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.nome || u.usuario}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.usuario} {u.email ? `· ${u.email}` : ''}</p>
                      </div>
                      {u.ja_vinculado ? (
                        <Badge variant="secondary" className="text-xs shrink-0">Vinculado</Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          disabled={assocSaving === u.usuario_id}
                          onClick={() => handleAssociar(u)}
                        >
                          {assocSaving === u.usuario_id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Plus className="h-3 w-3 mr-1" />}
                          Associar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssociarOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
