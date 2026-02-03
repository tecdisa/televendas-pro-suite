import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CreditCard, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formasPagamentoService, FormaPagamento, FormaPagamentoFormData } from '@/services/formasPagamentoService';
import { prazosPagamentosService, PrazoPagamento } from '@/services/prazosPagamentosService';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

const initialFormData: FormaPagamentoFormData = {
  descricao_forma_pagto: '',
  boleto: false,
  cartao: false,
  envia_mobile: false,
  permite_gerar_receber: false,
  prazo_pagto_id: null,
  meio_pagamento_id: null,
  inativo: false,
};

// Lista fixa de meios de pagamento baseada na imagem
const meiosPagamento = [
  { id: 1, descricao: 'Dinheiro' },
  { id: 2, descricao: 'Cheque' },
  { id: 3, descricao: 'Cartão de Crédito' },
  { id: 4, descricao: 'Cartão de Débito' },
  { id: 5, descricao: 'Boleto' },
  { id: 6, descricao: 'PIX' },
  { id: 7, descricao: 'Transferência' },
];

export function FormasPagamentoTab() {
  const [loading, setLoading] = useState(false);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [prazos, setPrazos] = useState<PrazoPagamento[]>([]);
  const [search, setSearch] = useState('');
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormaPagamentoFormData>(initialFormData);

  const loadFormas = async () => {
    setLoading(true);
    try {
      const result = await formasPagamentoService.getAll(search, 1, 100, incluirInativos);
      setFormas(result.data);
    } catch (error: any) {
      console.error('Erro ao carregar formas:', error);
      toast.error(error?.message || 'Erro ao carregar formas de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const loadPrazos = async () => {
    try {
      const result = await prazosPagamentosService.getAll('', 1, 500, false);
      setPrazos(result.data);
    } catch (error) {
      console.error('Erro ao carregar prazos:', error);
    }
  };

  useEffect(() => {
    loadFormas();
    loadPrazos();
  }, [incluirInativos]);

  const handleSearch = () => loadFormas();
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

  const openEdit = async (f: FormaPagamento) => {
    setEditId(f.forma_pagto_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await formasPagamentoService.getById(f.forma_pagto_id);
      if (detail) {
        setFormData({
          descricao_forma_pagto: detail.descricao_forma_pagto || '',
          boleto: detail.boleto ?? false,
          cartao: detail.cartao ?? false,
          envia_mobile: detail.envia_mobile ?? false,
          permite_gerar_receber: detail.permite_gerar_receber ?? false,
          prazo_pagto_id: detail.prazo_pagto_id ?? null,
          meio_pagamento_id: detail.meio_pagamento_id ?? null,
          inativo: detail.inativo ?? false,
        });
      }
    } catch (e: any) {
      toast.error('Erro ao carregar dados da forma de pagamento');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.descricao_forma_pagto.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      await formasPagamentoService.create(formData);
      toast.success('Forma de pagamento criada com sucesso');
      setCreateOpen(false);
      resetForm();
      loadFormas();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar forma de pagamento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!formData.descricao_forma_pagto.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      await formasPagamentoService.update(editId, formData);
      toast.success('Forma de pagamento atualizada com sucesso');
      setEditOpen(false);
      resetForm();
      loadFormas();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar forma de pagamento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta forma de pagamento?')) return;
    setDeleteLoading(id);
    try {
      await formasPagamentoService.delete(id);
      toast.success('Forma de pagamento excluída com sucesso');
      loadFormas();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir forma de pagamento');
    } finally {
      setDeleteLoading(null);
    }
  };

  const getMeioPagamentoDescricao = (id: number | null | undefined) => {
    if (!id) return '-';
    const meio = meiosPagamento.find(m => m.id === id);
    return meio ? meio.descricao : '-';
  };

  const getPrazoDescricao = (id: number | null | undefined) => {
    if (!id) return '-';
    const prazo = prazos.find(p => p.prazo_pagto_id === id);
    return prazo ? prazo.descricao_prazo_pagto : '-';
  };

  const formContent = (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
        <Input
          className="h-8 text-sm"
          value={formData.descricao_forma_pagto}
          onChange={(e) => setFormData({ ...formData, descricao_forma_pagto: toUpperValue(e.target.value) })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.boleto}
            onCheckedChange={(c) => setFormData({ ...formData, boleto: c as boolean })}
          />
          <label className="text-sm">Boleto</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.permite_gerar_receber}
            onCheckedChange={(c) => setFormData({ ...formData, permite_gerar_receber: c as boolean })}
          />
          <label className="text-sm">Permite gerar a Receber</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.cartao}
            onCheckedChange={(c) => setFormData({ ...formData, cartao: c as boolean })}
          />
          <label className="text-sm">Cartão</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.envia_mobile}
            onCheckedChange={(c) => setFormData({ ...formData, envia_mobile: c as boolean })}
          />
          <label className="text-sm">Envia Mobile</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.inativo}
            onCheckedChange={(c) => setFormData({ ...formData, inativo: c as boolean })}
          />
          <label className="text-sm">Inativo</label>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo</label>
        <Select
          value={formData.prazo_pagto_id?.toString() || ''}
          onValueChange={(val) => setFormData({ ...formData, prazo_pagto_id: val ? Number(val) : null })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Selecione um prazo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {prazos.map((p) => (
              <SelectItem key={p.prazo_pagto_id} value={p.prazo_pagto_id.toString()}>
                {p.descricao_prazo_pagto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Meio de pagamento</label>
        <Select
          value={formData.meio_pagamento_id?.toString() || ''}
          onValueChange={(val) => setFormData({ ...formData, meio_pagamento_id: val ? Number(val) : null })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Selecione um meio de pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {meiosPagamento.map((m) => (
              <SelectItem key={m.id} value={m.id.toString()}>
                {m.id.toString().padStart(2, '0')} - {m.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Formas de Pagamento
            </CardTitle>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Forma
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Buscar por descrição..."
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
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell w-20">Boleto</TableHead>
                    <TableHead className="hidden md:table-cell w-20">Cartão</TableHead>
                    <TableHead className="hidden lg:table-cell">Meio Pagto</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : formas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma forma de pagamento encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    formas.map((f) => (
                      <TableRow key={f.forma_pagto_id} className={f.inativo ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{f.descricao_forma_pagto}</TableCell>
                        <TableCell className="hidden md:table-cell">{f.boleto ? 'Sim' : 'Não'}</TableCell>
                        <TableCell className="hidden md:table-cell">{f.cartao ? 'Sim' : 'Não'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{getMeioPagamentoDescricao(f.meio_pagamento_id)}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded ${f.inativo ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                            {f.inativo ? 'Inativo' : 'Ativo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(f.forma_pagto_id)}
                              disabled={deleteLoading === f.forma_pagto_id}
                            >
                              {deleteLoading === f.forma_pagto_id ? (
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Forma de Pagamento</DialogTitle>
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
            <DialogTitle>Editar Forma de Pagamento</DialogTitle>
          </DialogHeader>
          {formLoading ? (
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
