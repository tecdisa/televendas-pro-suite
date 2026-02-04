import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import { ChevronLeft, ChevronRight, Search, Network, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { redesService, Rede, RedeFormData } from '@/services/redesService';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const initialFormData: RedeFormData = {
  codigo_rede: '',
  descricao_rede: '',
  cidade: '',
  uf: '',
  email: '',
  inativo: false,
};

export function RedesTab() {
  const PAGE_LIMIT = 100;
  const [loading, setLoading] = useState(false);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState<RedeFormData>(initialFormData);

  const loadRedes = async (nextPage = page) => {
    setLoading(true);
    try {
      const result = await redesService.getAll(search, nextPage, PAGE_LIMIT, incluirInativos);
      setRedes(result.data);
      setTotal(result.total ?? result.data.length);
      setPage(result.page ?? nextPage);
    } catch (error: any) {
      console.error('Erro ao carregar redes:', error);
      toast.error(error?.message || 'Erro ao carregar redes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadRedes(1);
  }, [incluirInativos]);

  const handleSearch = () => {
    setPage(1);
    loadRedes(1);
  };
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
          cidade: detail.cidade || '',
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
      await redesService.create(formData);
      toast.success('Rede criada com sucesso');
      setCreateOpen(false);
      resetForm();
      loadRedes(page);
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
      await redesService.update(editId, formData);
      toast.success('Rede atualizada com sucesso');
      setEditOpen(false);
      resetForm();
      loadRedes(page);
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
      const totalAfter = Math.max(0, total - 1);
      const totalPagesAfter = Math.max(1, Math.ceil(totalAfter / PAGE_LIMIT));
      const nextPage = Math.min(page, totalPagesAfter);
      setPage(nextPage);
      loadRedes(nextPage);
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
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
          <Input
            className="h-8 text-sm"
            value={formData.cidade}
            onChange={(e) => setFormData({ ...formData, cidade: toUpperValue(e.target.value) })}
          />
        </div>
        <div className="col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={formData.uf}
            onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
          >
            <option value="">Selecione</option>
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-9">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
          <Input
            type="email"
            className="h-8 text-sm"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const showingTo = total === 0 ? 0 : Math.min(page * PAGE_LIMIT, total);
  const pageItems: Array<number | 'ellipsis'> = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const items: Array<number | 'ellipsis'> = [1];
    const windowStart = Math.max(2, page - 1);
    const windowEnd = Math.min(totalPages - 1, page + 1);
    if (windowStart > 2) items.push('ellipsis');
    for (let p = windowStart; p <= windowEnd; p += 1) items.push(p);
    if (windowEnd < totalPages - 1) items.push('ellipsis');
    items.push(totalPages);
    return items;
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5" />
              Redes
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="incluirInativos"
                checked={incluirInativos}
                onCheckedChange={(c) => setIncluirInativos(c as boolean)}
              />
              <label htmlFor="incluirInativos" className="text-sm whitespace-nowrap">Incluir inativos</label>
            </div>
            <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
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
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
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
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(r.rede_id)}
                              disabled={deleteLoading === r.rede_id}
                            >
                              {deleteLoading === r.rede_id ? (
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
                </TableBody>
              </Table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="text-xs text-muted-foreground">
                Mostrando {showingFrom}-{showingTo} de {total}
              </div>
              <Pagination className="justify-end sm:justify-center">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1 && !loading) loadRedes(page - 1);
                      }}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      <span>Anterior</span>
                    </PaginationLink>
                  </PaginationItem>
                  {pageItems.map((item, idx) => (
                    <PaginationItem key={`${item}-${idx}`}>
                      {item === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          isActive={item === page}
                          onClick={(e) => {
                            e.preventDefault();
                            if (item !== page && !loading) loadRedes(item);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages && !loading) loadRedes(page + 1);
                      }}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                    >
                      <span>Próxima</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
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
        <DialogContent className="max-w-lg">
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
