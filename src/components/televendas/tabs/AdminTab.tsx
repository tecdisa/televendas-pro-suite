import { useEffect, useRef, useState } from 'react';
import { Search, Plus, Trash2, Loader2, Building2, Users, ShieldCheck, UserCheck, RefreshCw, Pencil, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { adminService, type AdminEmpresa, type AdminEmpresaDetalhe, type EmpresaUsuario, type AdminUsuario } from '@/services/adminService';
import { clientsService } from '@/services/clientsService';
import { normalizeCnpjCpf, formatCnpjCpf, isNumericCnpj } from '@/utils/cnpjCpf';

const TECDISA_API_KEY = 'HKemZzPV6hpvTR5pVqzomLzLe30rY5Gs4q45b4yHd2uEABXUcf6MQTFKMVgiKJeD';

const normalizeCep = (v: string) => v.replace(/\D/g, '').slice(0, 8);
const formatCep = (v: string) => { const d = normalizeCep(v); return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d; };
const normalizePhone = (v: string) => v.replace(/\D/g, '').slice(0, 11);

const EMPTY_EMPRESA_FORM = {
  cnpj: '',
  razao_social: '',
  fantasia: '',
  inscricao_estadual: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  fone: '',
  celular: '',
  whatsapp: '',
  email: '',
  tecdisa_id: '',
  empresa_master_id: '',
  master: false,
  inativo: false,
};

export function AdminTab() {
  const [empresas, setEmpresas] = useState<AdminEmpresa[]>([]);
  const [empresaSearch, setEmpresaSearch] = useState('');
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<AdminEmpresa | null>(null);

  const [usuarios, setUsuarios] = useState<EmpresaUsuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [togglingMasterId, setTogglingMasterId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [removeConfirmUsuario, setRemoveConfirmUsuario] = useState<EmpresaUsuario | null>(null);

  const [associarOpen, setAssociarOpen] = useState(false);
  const [assocSearch, setAssocSearch] = useState('');
  const [assocResults, setAssocResults] = useState<AdminUsuario[]>([]);
  const [assocLoading, setAssocLoading] = useState(false);
  const [assocSaving, setAssocSaving] = useState<number | null>(null);

  const assocDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Criar Empresa ---
  const [criarOpen, setCriarOpen] = useState(false);
  const [criarForm, setCriarForm] = useState({ ...EMPTY_EMPRESA_FORM });
  const [criarLoading, setCriarLoading] = useState(false);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const cnpjDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCnpjChange = (value: string) => {
    const formatted = formatCnpjCpf(normalizeCnpjCpf(value));
    setCriarForm((f) => ({ ...f, cnpj: formatted }));
    const digits = normalizeCnpjCpf(value);
    if (cnpjDebounce.current) clearTimeout(cnpjDebounce.current);
    if (!isNumericCnpj(digits)) return;
    cnpjDebounce.current = setTimeout(() => lookupCnpj(digits), 600);
  };

  const lookupCnpj = async (digits: string) => {
    setCnpjLookupLoading(true);
    const tecdisaPromise = fetch(
      `https://hom.adsapi.com.br/api/v1/${digits}/dados-tecdisa-id`,
      { headers: { 'User-Agent': 'AdsVendas', 'x-api-key': TECDISA_API_KEY } },
    ).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    try {
      const result = await clientsService.lookupCnpj(digits);
      if (!result?.data) return;
      const d = result.data;
      const estab = d.estabelecimento ?? {};
      const cidadeObj = estab.cidade ?? {};
      const estadoObj = estab.estado ?? {};
      const tipoLog = estab.tipo_logradouro ? String(estab.tipo_logradouro).trim() : '';
      const logradouro = estab.logradouro ? String(estab.logradouro).trim() : '';
      const enderecoFmt = [tipoLog, logradouro].filter(Boolean).join(' ') || d.logradouro || '';
      const ddd = estab.ddd1 ? String(estab.ddd1).trim() : '';
      const tel = estab.telefone1 ? String(estab.telefone1).trim() : '';
      const cepRaw = estab.cep ?? d.cep ?? '';
      setCriarForm((f) => ({
        ...f,
        razao_social: (d.razao_social || f.razao_social).toUpperCase(),
        fantasia: (d.nome_fantasia || estab.nome_fantasia || f.fantasia).toUpperCase(),
        endereco: (enderecoFmt || f.endereco).toUpperCase(),
        numero: (estab.numero || d.numero || f.numero || '').toString().toUpperCase(),
        complemento: (estab.complemento || f.complemento || '').toUpperCase(),
        bairro: (estab.bairro || d.bairro || f.bairro).toUpperCase(),
        cidade: (cidadeObj.nome || estab.municipio || d.municipio || f.cidade).toUpperCase(),
        uf: (estadoObj.sigla || estab.uf || d.uf || f.uf).toUpperCase(),
        cep: formatCep(normalizeCep(String(cepRaw)) || normalizeCep(f.cep)),
        fone: normalizePhone([ddd, tel].filter(Boolean).join('')) || f.fone,
        email: estab.email || f.email,
        inscricao_estadual: (estab.inscricoes_estaduais?.[0]?.inscricao_estadual || f.inscricao_estadual),
      }));
      toast.success('Dados preenchidos pela consulta de CNPJ');
      const tecdisaData = await tecdisaPromise;
      if (Array.isArray(tecdisaData) && tecdisaData[0]?.tecdisaID) {
        setCriarForm((f) => ({ ...f, tecdisa_id: String(tecdisaData[0].tecdisaID) }));
      }
    } catch (e: any) {
      toast.error(String(e?.message ?? e ?? 'Erro ao consultar CNPJ'));
    } finally {
      setCnpjLookupLoading(false);
    }
  };

  const handleCriarEmpresa = async () => {
    const cnpjDigits = normalizeCnpjCpf(criarForm.cnpj);
    const cepDigits = normalizeCep(criarForm.cep);
    const errors: string[] = [];
    if (cnpjDigits.length !== 14) errors.push('CNPJ inválido');
    if (!criarForm.razao_social.trim()) errors.push('Razão Social obrigatória');
    if (!criarForm.fantasia.trim()) errors.push('Fantasia obrigatória');
    if (!criarForm.endereco.trim()) errors.push('Endereço obrigatório');
    if (!criarForm.bairro.trim()) errors.push('Bairro obrigatório');
    if (!criarForm.uf.trim() || criarForm.uf.trim().length !== 2) errors.push('UF inválida');
    if (cepDigits.length !== 8) errors.push('CEP inválido');
    if (!normalizePhone(criarForm.fone)) errors.push('Fone obrigatório');
    if (errors.length) { toast.error(errors[0]); return; }

    setCriarLoading(true);
    try {
      const created = await adminService.createEmpresa({
        cnpj: cnpjDigits,
        razao_social: criarForm.razao_social.trim(),
        fantasia: criarForm.fantasia.trim(),
        inscricao_estadual: criarForm.inscricao_estadual.trim() || undefined,
        cep: cepDigits,
        endereco: criarForm.endereco.trim(),
        numero: criarForm.numero.trim() || undefined,
        complemento: criarForm.complemento.trim() || undefined,
        bairro: criarForm.bairro.trim(),
        cidade: criarForm.cidade.trim() || undefined,
        uf: criarForm.uf.trim().toUpperCase(),
        fone: normalizePhone(criarForm.fone),
        celular: normalizePhone(criarForm.celular) || undefined,
        whatsapp: normalizePhone(criarForm.whatsapp) || undefined,
        email: criarForm.email.trim() || undefined,
        tecdisa_id: criarForm.tecdisa_id.trim() || undefined,
        empresa_master_id: criarForm.empresa_master_id ? Number(criarForm.empresa_master_id) : null,
        master: criarForm.master,
      });
      toast.success(`Empresa ${created.razao_social} criada com sucesso`);
      setCriarOpen(false);
      setCriarForm({ ...EMPTY_EMPRESA_FORM });
      loadEmpresas();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar empresa');
    } finally {
      setCriarLoading(false);
    }
  };

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

  // --- Editar Empresa ---
  const [editOpen, setEditOpen] = useState(false);
  const [editEmpresaId, setEditEmpresaId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_EMPRESA_FORM });
  const [editLoading, setEditLoading] = useState(false);

  const handleOpenEdit = async (empresa: AdminEmpresa) => {
    setEditEmpresaId(empresa.empresa_id);
    setEditForm({ ...EMPTY_EMPRESA_FORM });
    setEditOpen(true);
    setEditLoading(true);
    try {
      const d: AdminEmpresaDetalhe = await adminService.getEmpresa(empresa.empresa_id);
      setEditForm({
        cnpj: formatCnpjCpf(d.cnpj_cpf),
        razao_social: d.razao_social,
        fantasia: d.fantasia,
        inscricao_estadual: d.inscricao_estadual ?? '',
        cep: formatCep(d.cep),
        endereco: d.endereco,
        numero: d.numero ?? '',
        complemento: d.complemento ?? '',
        bairro: d.bairro,
        cidade: d.cidade ?? '',
        uf: d.uf,
        fone: d.fone,
        celular: d.celular,
        whatsapp: d.whatsapp ?? '',
        email: d.email ?? '',
        tecdisa_id: d.tecdisa_id,
        empresa_master_id: d.empresa_master_id ? String(d.empresa_master_id) : '',
        master: false,
        inativo: d.inativo,
      });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar empresa');
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editEmpresaId) return;
    setEditLoading(true);
    try {
      await adminService.updateEmpresa(editEmpresaId, {
        razao_social: editForm.razao_social.trim(),
        fantasia: editForm.fantasia.trim(),
        inscricao_estadual: editForm.inscricao_estadual || undefined,
        endereco: editForm.endereco.trim(),
        numero: editForm.numero || undefined,
        complemento: editForm.complemento || undefined,
        bairro: editForm.bairro.trim(),
        cidade: editForm.cidade || undefined,
        uf: editForm.uf.trim(),
        cep: normalizeCep(editForm.cep),
        fone: normalizePhone(editForm.fone),
        celular: normalizePhone(editForm.celular),
        whatsapp: editForm.whatsapp || undefined,
        email: editForm.email || undefined,
        tecdisa_id: editForm.tecdisa_id,
        inativo: editForm.inativo,
        empresa_master_id: editForm.empresa_master_id ? Number(editForm.empresa_master_id) : null,
      });
      toast.success('Empresa atualizada');
      setEditOpen(false);
      loadEmpresas();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar empresa');
    } finally {
      setEditLoading(false);
    }
  };

  // --- Deletar Empresa ---
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminEmpresa | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteEmpresa = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminService.deleteEmpresa(deleteTarget.empresa_id);
      toast.success(`Empresa ${deleteTarget.fantasia || deleteTarget.razao_social} excluída`);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      if (selectedEmpresa?.empresa_id === deleteTarget.empresa_id) setSelectedEmpresa(null);
      loadEmpresas();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir empresa');
    } finally {
      setDeleteLoading(false);
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

  const handleRemove = (usuario: EmpresaUsuario) => setRemoveConfirmUsuario(usuario);

  const executeRemove = async () => {
    if (!removeConfirmUsuario) return;
    const usuario = removeConfirmUsuario;
    setRemoveConfirmUsuario(null);
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

  const handleToggleMaster = async (usuario: EmpresaUsuario, value: boolean) => {
    setTogglingMasterId(usuario.usuario_id);
    try {
      await adminService.setUserMaster(usuario.usuario_id, value);
      setUsuarios((prev) =>
        prev.map((u) => u.usuario_id === usuario.usuario_id ? { ...u, global_master: value } : u),
      );
      toast.success(value ? 'Usuário definido como Global Master' : 'Flag Global Master removida');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar flag master');
    } finally {
      setTogglingMasterId(null);
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Empresas
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={() => { setCriarForm({ ...EMPTY_EMPRESA_FORM }); setCriarOpen(true); }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Nova
            </Button>
          </div>
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
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors',
                    selectedEmpresa?.empresa_id === e.empresa_id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground',
                    e.inativo && 'opacity-60',
                  )}>
                    <button onClick={() => handleEmpresaSelect(e)} className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium truncate">{e.fantasia || e.razao_social}</span>
                        {e.inativo && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 shrink-0">Inativa</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-muted-foreground truncate text-[10px]">
                          #{e.empresa_id} · {e.uf} · {e.cnpj_cpf}
                        </span>
                        {!e.inativo && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 shrink-0">
                            {e.total_usuarios}
                          </Badge>
                        )}
                      </div>
                    </button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      title="Editar empresa"
                      onClick={(ev) => { ev.stopPropagation(); handleOpenEdit(e); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                      title="Excluir empresa"
                      onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e); setDeleteConfirmOpen(true); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
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
                  <TableHead className="text-xs text-center w-28">Global Master</TableHead>
                  <TableHead className="text-xs text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => {
                  const busy = togglingId === u.usuario_empresa_id || deletingId === u.usuario_empresa_id;
                  const masterBusy = togglingMasterId === u.usuario_id;
                  return (
                    <TableRow key={u.usuario_empresa_id} className={cn((busy || masterBusy) && 'opacity-60')}>
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
                      <TableCell className="text-center w-28">
                        <Switch
                          checked={u.global_master ?? false}
                          disabled={masterBusy}
                          onCheckedChange={(v) => handleToggleMaster(u, v)}
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

      {/* Criar Empresa dialog */}
      <Dialog open={criarOpen} onOpenChange={(o) => { if (!criarLoading) setCriarOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Nova Empresa
              <span className="text-xs font-normal text-muted-foreground">ID gerado automaticamente</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* CNPJ */}
            <div className="space-y-1">
              <Label className="text-xs">CNPJ *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="00.000.000/0000-00"
                  value={criarForm.cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  className="text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="shrink-0"
                  disabled={cnpjLookupLoading}
                  onClick={() => lookupCnpj(normalizeCnpjCpf(criarForm.cnpj))}
                >
                  {cnpjLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Razão Social + Fantasia */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Razão Social *</Label>
                <Input
                  value={criarForm.razao_social}
                  onChange={(e) => setCriarForm((f) => ({ ...f, razao_social: e.target.value.toUpperCase() }))}
                  className="text-sm uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fantasia *</Label>
                <Input
                  value={criarForm.fantasia}
                  onChange={(e) => setCriarForm((f) => ({ ...f, fantasia: e.target.value.toUpperCase() }))}
                  className="text-sm uppercase"
                />
              </div>
            </div>

            {/* Inscrição Estadual + ID Tecdisa */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Inscrição Estadual</Label>
                <Input
                  value={criarForm.inscricao_estadual}
                  onChange={(e) => setCriarForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ID Tecdisa</Label>
                <Input
                  value={criarForm.tecdisa_id}
                  readOnly
                  placeholder="Preenchido automaticamente via CNPJ"
                  className="text-sm bg-muted cursor-not-allowed text-muted-foreground"
                />
              </div>
            </div>

            {/* CEP + UF + Cidade */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CEP *</Label>
                <Input
                  value={criarForm.cep}
                  onChange={(e) => setCriarForm((f) => ({ ...f, cep: formatCep(e.target.value) }))}
                  placeholder="00000-000"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">UF *</Label>
                <Input
                  value={criarForm.uf}
                  maxLength={2}
                  onChange={(e) => setCriarForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0,2) }))}
                  placeholder="SP"
                  className="text-sm uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cidade</Label>
                <Input
                  value={criarForm.cidade}
                  onChange={(e) => setCriarForm((f) => ({ ...f, cidade: e.target.value.toUpperCase() }))}
                  className="text-sm uppercase"
                />
              </div>
            </div>

            {/* Endereço + Número */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Endereço *</Label>
                <Input
                  value={criarForm.endereco}
                  onChange={(e) => setCriarForm((f) => ({ ...f, endereco: e.target.value.toUpperCase() }))}
                  className="text-sm uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Número</Label>
                <Input
                  value={criarForm.numero}
                  onChange={(e) => setCriarForm((f) => ({ ...f, numero: e.target.value.toUpperCase() }))}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Bairro + Complemento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bairro *</Label>
                <Input
                  value={criarForm.bairro}
                  onChange={(e) => setCriarForm((f) => ({ ...f, bairro: e.target.value.toUpperCase() }))}
                  className="text-sm uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Complemento</Label>
                <Input
                  value={criarForm.complemento}
                  onChange={(e) => setCriarForm((f) => ({ ...f, complemento: e.target.value.toUpperCase() }))}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Fone + Celular + WhatsApp */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fone *</Label>
                <Input
                  value={criarForm.fone}
                  onChange={(e) => setCriarForm((f) => ({ ...f, fone: e.target.value.replace(/\D/g,'').slice(0,11) }))}
                  placeholder="11999999999"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Celular</Label>
                <Input
                  value={criarForm.celular}
                  onChange={(e) => setCriarForm((f) => ({ ...f, celular: e.target.value.replace(/\D/g,'').slice(0,11) }))}
                  placeholder="11999999999"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp</Label>
                <Input
                  value={criarForm.whatsapp}
                  onChange={(e) => setCriarForm((f) => ({ ...f, whatsapp: e.target.value.replace(/\D/g,'').slice(0,11) }))}
                  placeholder="11999999999"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Email + Empresa Master ID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  value={criarForm.email}
                  onChange={(e) => setCriarForm((f) => ({ ...f, email: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ID Empresa Master</Label>
                <Input
                  type="number"
                  value={criarForm.empresa_master_id}
                  onChange={(e) => setCriarForm((f) => ({ ...f, empresa_master_id: e.target.value }))}
                  placeholder="Deixe vazio se for a matriz"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Master flag */}
            <div className="flex items-center gap-2">
              <Switch
                checked={criarForm.master}
                onCheckedChange={(v) => setCriarForm((f) => ({ ...f, master: v }))}
              />
              <Label className="text-xs cursor-pointer">Esta empresa é uma matriz (master)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCriarOpen(false)} disabled={criarLoading}>
              Cancelar
            </Button>
            <Button onClick={handleCriarEmpresa} disabled={criarLoading}>
              {criarLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar Empresa dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!editLoading) setEditOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editar Empresa
              {editEmpresaId && (
                <span className="text-xs font-normal text-muted-foreground">ID #{editEmpresaId}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {editLoading && !editForm.razao_social ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-1">
              {/* CNPJ (read-only no edit) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">CNPJ</Label>
                  <Input value={editForm.cnpj} readOnly className="text-sm bg-muted cursor-not-allowed text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ID Tecdisa</Label>
                  <Input value={editForm.tecdisa_id} readOnly className="text-sm bg-muted cursor-not-allowed text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Razão Social *</Label>
                  <Input value={editForm.razao_social}
                    onChange={(e) => setEditForm((f) => ({ ...f, razao_social: e.target.value.toUpperCase() }))}
                    className="text-sm uppercase" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fantasia *</Label>
                  <Input value={editForm.fantasia}
                    onChange={(e) => setEditForm((f) => ({ ...f, fantasia: e.target.value.toUpperCase() }))}
                    className="text-sm uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Inscrição Estadual</Label>
                  <Input value={editForm.inscricao_estadual}
                    onChange={(e) => setEditForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                    className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ID Empresa Master</Label>
                  <Input type="number" value={editForm.empresa_master_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, empresa_master_id: e.target.value }))}
                    placeholder="Deixe vazio se for a matriz"
                    className="text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">CEP *</Label>
                  <Input value={editForm.cep}
                    onChange={(e) => setEditForm((f) => ({ ...f, cep: formatCep(e.target.value) }))}
                    placeholder="00000-000" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">UF *</Label>
                  <Input value={editForm.uf} maxLength={2}
                    onChange={(e) => setEditForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0,2) }))}
                    placeholder="SP" className="text-sm uppercase" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cidade</Label>
                  <Input value={editForm.cidade}
                    onChange={(e) => setEditForm((f) => ({ ...f, cidade: e.target.value.toUpperCase() }))}
                    className="text-sm uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Endereço *</Label>
                  <Input value={editForm.endereco}
                    onChange={(e) => setEditForm((f) => ({ ...f, endereco: e.target.value.toUpperCase() }))}
                    className="text-sm uppercase" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Número</Label>
                  <Input value={editForm.numero}
                    onChange={(e) => setEditForm((f) => ({ ...f, numero: e.target.value }))}
                    className="text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Bairro *</Label>
                  <Input value={editForm.bairro}
                    onChange={(e) => setEditForm((f) => ({ ...f, bairro: e.target.value.toUpperCase() }))}
                    className="text-sm uppercase" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Complemento</Label>
                  <Input value={editForm.complemento}
                    onChange={(e) => setEditForm((f) => ({ ...f, complemento: e.target.value.toUpperCase() }))}
                    className="text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Fone *</Label>
                  <Input value={editForm.fone}
                    onChange={(e) => setEditForm((f) => ({ ...f, fone: e.target.value.replace(/\D/g,'').slice(0,11) }))}
                    placeholder="11999999999" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Celular *</Label>
                  <Input value={editForm.celular}
                    onChange={(e) => setEditForm((f) => ({ ...f, celular: e.target.value.replace(/\D/g,'').slice(0,11) }))}
                    placeholder="11999999999" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp</Label>
                  <Input value={editForm.whatsapp}
                    onChange={(e) => setEditForm((f) => ({ ...f, whatsapp: e.target.value.replace(/\D/g,'').slice(0,11) }))}
                    placeholder="11999999999" className="text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="text-sm" />
              </div>

              {/* Ativo/Inativo */}
              <div className="flex items-center gap-3 pt-1 border-t">
                <PowerOff className={cn('h-4 w-4', editForm.inativo ? 'text-destructive' : 'text-muted-foreground')} />
                <div className="flex-1">
                  <Label className="text-xs font-medium">
                    {editForm.inativo ? 'Empresa Inativa' : 'Empresa Ativa'}
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    {editForm.inativo
                      ? 'Usuários desta empresa não conseguem fazer login.'
                      : 'Empresa ativa e operacional.'}
                  </p>
                </div>
                <Switch
                  checked={!editForm.inativo}
                  onCheckedChange={(v) => setEditForm((f) => ({ ...f, inativo: !v }))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(o) => { if (!deleteLoading) setDeleteConfirmOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Excluir Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm">
              Deseja excluir permanentemente a empresa{' '}
              <strong>{deleteTarget?.fantasia || deleteTarget?.razao_social}</strong>?
            </p>
            <p className="text-xs text-muted-foreground">
              Esta ação não pode ser desfeita. Se a empresa tiver registros vinculados, use <strong>Desativar</strong> em vez de excluir.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteEmpresa} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={removeConfirmUsuario !== null} onOpenChange={(open) => !open && setRemoveConfirmUsuario(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Remover {removeConfirmUsuario?.nome || removeConfirmUsuario?.usuario} desta empresa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
