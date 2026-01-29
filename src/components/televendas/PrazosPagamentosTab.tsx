import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Clock, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { prazosPagamentosService, PrazoPagamento, PrazoPagamentoFormData } from '@/services/prazosPagamentosService';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

const initialFormData: PrazoPagamentoFormData = {
  codigo_prazopagto: '',
  descricao_prazo_pagto: '',
  avista: false,
  somente_cartao: false,
  prazo_negociado: false,
  forma_pagto_id: null,
  numero_de_parcelas: 0,
  prazos_em_dias: '',
  pedido_minimo: 0,
  prazo_medio: 0,
  comissao: 0,
  liberado_app_mobile: false,
  liberado_b2b: false,
  liberado_b2c: false,
  inativo: false,
};

export function PrazosPagamentosTab() {
  const [loading, setLoading] = useState(false);
  const [prazos, setPrazos] = useState<PrazoPagamento[]>([]);
  const [search, setSearch] = useState('');
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState<PrazoPagamentoFormData>(initialFormData);

  const loadPrazos = async () => {
    setLoading(true);
    try {
      const result = await prazosPagamentosService.getAll(search, 1, 100, incluirInativos);
      setPrazos(result.data);
    } catch (error: any) {
      console.error('Erro ao carregar prazos:', error);
      toast.error(error?.message || 'Erro ao carregar prazos de pagamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrazos();
  }, [incluirInativos]);

  const handleSearch = () => loadPrazos();
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

  const openEdit = async (p: PrazoPagamento) => {
    setEditId(p.prazo_pagto_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await prazosPagamentosService.getById(p.prazo_pagto_id);
      if (detail) {
        setFormData({
          codigo_prazopagto: detail.codigo_prazopagto || '',
          descricao_prazo_pagto: detail.descricao_prazo_pagto || '',
          avista: detail.avista ?? false,
          somente_cartao: detail.somente_cartao ?? false,
          prazo_negociado: detail.prazo_negociado ?? false,
          forma_pagto_id: detail.forma_pagto_id ?? null,
          numero_de_parcelas: detail.numero_de_parcelas ?? 0,
          prazos_em_dias: detail.prazos_em_dias || '',
          pedido_minimo: detail.pedido_minimo ?? 0,
          prazo_medio: detail.prazo_medio ?? 0,
          comissao: detail.comissao ?? 0,
          liberado_app_mobile: detail.liberado_app_mobile ?? false,
          liberado_b2b: detail.liberado_b2b ?? false,
          liberado_b2c: detail.liberado_b2c ?? false,
          inativo: detail.inativo ?? false,
        });
      }
    } catch (e: any) {
      toast.error('Erro ao carregar dados do prazo');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.descricao_prazo_pagto.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      const dataToSend = {
        ...formData,
        prazos_em_dias: formData.prazos_em_dias?.trim() || null,
      };
      await prazosPagamentosService.create(dataToSend);
      toast.success('Prazo de pagamento criado com sucesso');
      setCreateOpen(false);
      resetForm();
      loadPrazos();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar prazo de pagamento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!formData.descricao_prazo_pagto.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      const dataToSend = {
        ...formData,
        prazos_em_dias: formData.prazos_em_dias?.trim() || null,
      };
      await prazosPagamentosService.update(editId, dataToSend);
      toast.success('Prazo de pagamento atualizado com sucesso');
      setEditOpen(false);
      resetForm();
      loadPrazos();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar prazo de pagamento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este prazo de pagamento?')) return;
    setDeleteLoading(id);
    try {
      await prazosPagamentosService.delete(id);
      toast.success('Prazo de pagamento excluído com sucesso');
      loadPrazos();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir prazo de pagamento');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formContent = (
    <Tabs defaultValue="geral" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="config">Configurações</TabsTrigger>
      </TabsList>

      <TabsContent value="geral" className="space-y-4 mt-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
            <Input
              className="h-8 text-sm"
              value={formData.codigo_prazopagto}
              onChange={(e) => setFormData({ ...formData, codigo_prazopagto: toUpperValue(e.target.value) })}
            />
          </div>
          <div className="col-span-9">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
            <Input
              className="h-8 text-sm"
              value={formData.descricao_prazo_pagto}
              onChange={(e) => setFormData({ ...formData, descricao_prazo_pagto: toUpperValue(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nº Parcelas</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={formData.numero_de_parcelas ?? ''}
              onChange={(e) => setFormData({ ...formData, numero_de_parcelas: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
          <div className="col-span-8">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazos em Dias (ex: 30,60,90)</label>
            <Input
              className="h-8 text-sm"
              value={formData.prazos_em_dias ?? ''}
              onChange={(e) => setFormData({ ...formData, prazos_em_dias: e.target.value })}
              placeholder="30,60,90"
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo Médio</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={formData.prazo_medio ?? ''}
              onChange={(e) => setFormData({ ...formData, prazo_medio: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Pedido Mínimo</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={formData.pedido_minimo ?? ''}
              onChange={(e) => setFormData({ ...formData, pedido_minimo: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
          <div className="col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Comissão (%)</label>
            <Input
              type="number"
              step="0.01"
              className="h-8 text-sm"
              value={formData.comissao ?? ''}
              onChange={(e) => setFormData({ ...formData, comissao: e.target.value ? Number(e.target.value) : 0 })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-6">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma Pagto ID</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={formData.forma_pagto_id ?? ''}
              onChange={(e) => setFormData({ ...formData, forma_pagto_id: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="config" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.avista}
              onCheckedChange={(c) => setFormData({ ...formData, avista: c as boolean })}
            />
            <label className="text-sm">À Vista</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.somente_cartao}
              onCheckedChange={(c) => setFormData({ ...formData, somente_cartao: c as boolean })}
            />
            <label className="text-sm">Somente Cartão</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.prazo_negociado}
              onCheckedChange={(c) => setFormData({ ...formData, prazo_negociado: c as boolean })}
            />
            <label className="text-sm">Prazo Negociado</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.liberado_app_mobile}
              onCheckedChange={(c) => setFormData({ ...formData, liberado_app_mobile: c as boolean })}
            />
            <label className="text-sm">Liberado App Mobile</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.liberado_b2b}
              onCheckedChange={(c) => setFormData({ ...formData, liberado_b2b: c as boolean })}
            />
            <label className="text-sm">Liberado B2B</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.liberado_b2c}
              onCheckedChange={(c) => setFormData({ ...formData, liberado_b2c: c as boolean })}
            />
            <label className="text-sm">Liberado B2C</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.inativo}
              onCheckedChange={(c) => setFormData({ ...formData, inativo: c as boolean })}
            />
            <label className="text-sm">Inativo</label>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Prazos de Pagamento
            </CardTitle>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Prazo
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
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell w-20">Parcelas</TableHead>
                    <TableHead className="hidden lg:table-cell">Prazos</TableHead>
                    <TableHead className="hidden xl:table-cell w-20">À Vista</TableHead>
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
                  ) : prazos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum prazo de pagamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    prazos.map((p) => (
                      <TableRow key={p.prazo_pagto_id} className={p.inativo ? 'opacity-50' : ''}>
                        <TableCell className="font-mono text-xs">{p.codigo_prazopagto || '-'}</TableCell>
                        <TableCell className="font-medium">{p.descricao_prazo_pagto}</TableCell>
                        <TableCell className="hidden md:table-cell">{p.numero_de_parcelas || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{p.prazos_em_dias || '-'}</TableCell>
                        <TableCell className="hidden xl:table-cell">{p.avista ? 'Sim' : 'Não'}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded ${p.inativo ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                            {p.inativo ? 'Inativo' : 'Ativo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(p.prazo_pagto_id)}
                              disabled={deleteLoading === p.prazo_pagto_id}
                            >
                              {deleteLoading === p.prazo_pagto_id ? (
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Prazo de Pagamento</DialogTitle>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Prazo de Pagamento</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.descricao_prazo_pagto ? (
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
