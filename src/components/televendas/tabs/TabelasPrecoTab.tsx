import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Tag, Plus, Pencil, Trash2, Loader2, List, ArrowLeft, Save, Undo2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { tabelasPrecoService, TabelaPreco, TabelaPrecoItem } from '@/services/tabelasPrecoService';
import { metadataService, FormaPagamento, PrazoPagto } from '@/services/metadataService';
import { productsService, Product } from '@/services/productsService';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

const PAGE_LIMIT = 100;

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

function isoToInputDate(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

const initialFormData = {
  codigo_tabela_preco: '',
  descricao_tabela_preco: '',
  prazo_medio: '',
  somente_venda_avista: false,
  pedido_minimo: '',
  indice_financeiro: '',
  validade: '',
  forma_pagto_id: '',
  prazo_pagto_id: '',
  inativo: false,
};

const initialItemFormData = {
  preco: '',
  desconto_maximo: '',
  comissao: '',
  quantidade_minima: '',
  pvs: '',
  markup: '',
  despesa: '',
  lucro: '',
  frete: '',
  majoracao: '',
  permite_bonificacao: false,
  permite_debito_credito: false,
  permite_venda_especial: false,
  produto_em_promocao: false,
};

type ItemFormData = typeof initialItemFormData;

type NumericItemField =
  | 'preco' | 'desconto_maximo' | 'comissao' | 'quantidade_minima' | 'pvs'
  | 'markup' | 'despesa' | 'lucro' | 'frete' | 'majoracao';

type BooleanItemField =
  | 'permite_bonificacao' | 'permite_debito_credito' | 'permite_venda_especial' | 'produto_em_promocao';

type PendingChange = Partial<Omit<TabelaPrecoItem, 'tabela_preco_id' | 'produto_id' | 'codigo_produto' | 'descricao_produto' | 'apresentacao' | 'custo' | 'produto_inativo'>>;

// Inline editable cell
function EditableCell({
  value,
  field,
  produtoId,
  pending,
  onCommit,
  digits = 2,
  className = '',
}: {
  value: number;
  field: NumericItemField;
  produtoId: number;
  pending?: PendingChange;
  onCommit: (produtoId: number, field: NumericItemField, val: number) => void;
  digits?: number;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayed = pending && field in pending ? Number((pending as any)[field]) : value;

  const startEdit = () => {
    setDraft(fmt(displayed, digits));
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const commit = () => {
    const num = parseFloat(draft.replace(',', '.'));
    if (!isNaN(num)) onCommit(produtoId, field, num);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        className={`w-full h-6 text-xs text-right border border-primary rounded px-1 bg-background outline-none ${className}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  const changed = pending && field in pending;
  return (
    <span
      className={`cursor-pointer select-none px-1 rounded hover:bg-muted/60 ${changed ? 'text-amber-600 font-medium' : ''} ${className}`}
      onDoubleClick={startEdit}
      onClick={startEdit}
      title="Clique para editar"
    >
      {fmt(displayed, digits)}
    </span>
  );
}

export function TabelasPrecoTab() {
  const { canInsert } = useModuleCrudPermission('TABELAS_PRECO');

  // ── Tabelas list state ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');

  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [prazos, setPrazos] = useState<PrazoPagto[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  // ── Items view state ────────────────────────────────────────────────────
  const [itensView, setItensView] = useState(false);
  const [itensTabela, setItensTabela] = useState<TabelaPreco | null>(null);
  const [itens, setItens] = useState<TabelaPrecoItem[]>([]);
  const [itensLoading, setItensLoading] = useState(false);
  const [itensSearch, setItensSearch] = useState('');
  const [itensPage, setItensPage] = useState(1);
  const [itensHasMore, setItensHasMore] = useState(true);

  // Filters
  const [filterPromocao, setFilterPromocao] = useState(false);
  const [filterComissaoZerada, setFilterComissaoZerada] = useState(false);
  const [filterSemPreco, setFilterSemPreco] = useState(false);

  // Inline edit: pending changes per produto_id
  const [pendingChanges, setPendingChanges] = useState<Record<number, PendingChange>>({});
  const [savingAll, setSavingAll] = useState(false);

  // Row selection
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Add item dialog
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TabelaPrecoItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [itemFormData, setItemFormData] = useState<ItemFormData>(initialItemFormData);
  const [itemFormLoading, setItemFormLoading] = useState(false);
  const [deleteItemLoading, setDeleteItemLoading] = useState<number | null>(null);

  // Batch bottom bar state
  const [batchDespesa, setBatchDespesa] = useState('');
  const [batchComissao, setBatchComissao] = useState('');
  const [batchMajoracao, setBatchMajoracao] = useState('');
  const [batchMarkup, setBatchMarkup] = useState('');
  const [batchLucro, setBatchLucro] = useState('');
  const [batchFrete, setBatchFrete] = useState('');
  const [batchDesconto, setBatchDesconto] = useState('');
  const [batchBonificacao, setBatchBonificacao] = useState(false);
  const [batchDebitoCredito, setBatchDebitoCredito] = useState(false);
  const [batchVendaEspecial, setBatchVendaEspecial] = useState(false);
  const [batchPromocao, setBatchPromocao] = useState(false);

  // ── Metadata ────────────────────────────────────────────────────────────
  const loadMetadata = useCallback(async () => {
    try {
      const [fp, pz] = await Promise.all([
        metadataService.getFormasPagamento(),
        metadataService.getPrazos(),
      ]);
      setFormasPagamento(fp);
      setPrazos(pz);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadMetadata(); }, [loadMetadata]);

  // ── Tabelas list ────────────────────────────────────────────────────────
  const loadTabelas = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) { setTabelas([]); setPage(1); setHasMore(true); }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await tabelasPrecoService.getAll(search, nextPage, PAGE_LIMIT, filtroStatus);
      setTabelas((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(nextPage);
      const total = result.total ?? 0;
      setHasMore(total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT);
    } catch {
      toast.error('Erro ao carregar tabelas de preço');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadTabelas(true); }, [filtroStatus]);

  const handleSearch = () => loadTabelas(true);
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) loadTabelas();
  };

  // ── Tabela form ─────────────────────────────────────────────────────────
  const resetForm = () => { setFormData(initialFormData); setEditId(null); };

  const openCreate = () => { if (!canInsert) return; resetForm(); setCreateOpen(true); };

  const openEdit = async (t: TabelaPreco) => {
    setEditId(t.tabela_preco_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await tabelasPrecoService.getById(t.tabela_preco_id);
      if (detail) {
        setFormData({
          codigo_tabela_preco: detail.codigo_tabela_preco || '',
          descricao_tabela_preco: detail.descricao_tabela_preco || '',
          prazo_medio: detail.prazo_medio != null ? String(detail.prazo_medio) : '',
          somente_venda_avista: detail.somente_venda_avista || false,
          pedido_minimo: detail.pedido_minimo ? String(detail.pedido_minimo) : '',
          indice_financeiro: detail.indice_financeiro ? String(detail.indice_financeiro) : '',
          validade: isoToInputDate(detail.validade),
          forma_pagto_id: detail.forma_pagto_id != null ? String(detail.forma_pagto_id) : '',
          prazo_pagto_id: detail.prazo_pagto_id != null ? String(detail.prazo_pagto_id) : '',
          inativo: detail.inativo || false,
        });
      }
    } catch {
      toast.error('Erro ao carregar dados da tabela de preço');
      setEditOpen(false);
    } finally { setFormLoading(false); }
  };

  const buildPayload = () => ({
    descricao_tabela_preco: formData.descricao_tabela_preco.trim(),
    codigo_tabela_preco: formData.codigo_tabela_preco.trim() || undefined,
    prazo_medio: formData.prazo_medio !== '' ? Number(formData.prazo_medio) : null,
    somente_venda_avista: formData.somente_venda_avista,
    pedido_minimo: formData.pedido_minimo !== '' ? Number(formData.pedido_minimo) : 0,
    indice_financeiro: formData.indice_financeiro !== '' ? Number(formData.indice_financeiro) : 0,
    validade: formData.validade || null,
    forma_pagto_id: formData.forma_pagto_id !== '' ? Number(formData.forma_pagto_id) : null,
    prazo_pagto_id: formData.prazo_pagto_id !== '' ? Number(formData.prazo_pagto_id) : null,
    inativo: formData.inativo,
  });

  const handleCreate = async () => {
    if (!formData.descricao_tabela_preco.trim()) { toast.error('Preencha a Descrição'); return; }
    setFormLoading(true);
    try {
      await tabelasPrecoService.create(buildPayload());
      toast.success('Tabela criada com sucesso');
      setCreateOpen(false); resetForm(); loadTabelas(true);
    } catch (e: any) { toast.error(e?.message || 'Erro ao criar tabela'); }
    finally { setFormLoading(false); }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!formData.descricao_tabela_preco.trim()) { toast.error('Preencha a Descrição'); return; }
    setFormLoading(true);
    try {
      await tabelasPrecoService.update(editId, buildPayload());
      toast.success('Tabela atualizada com sucesso');
      setEditOpen(false); resetForm(); loadTabelas(true);
    } catch (e: any) { toast.error(e?.message || 'Erro ao atualizar tabela'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta tabela de preço?')) return;
    setDeleteLoading(id);
    try {
      await tabelasPrecoService.delete(id);
      toast.success('Tabela excluída com sucesso');
      loadTabelas(true);
    } catch (e: any) { toast.error(e?.message || 'Erro ao excluir tabela'); }
    finally { setDeleteLoading(null); }
  };

  // ── Items view ──────────────────────────────────────────────────────────
  const loadItens = async (reset = false) => {
    if (!itensTabela) return;
    if (itensLoading) return;
    setItensLoading(true);
    if (reset) { setItens([]); setItensPage(1); setItensHasMore(true); }
    try {
      const nextPage = reset ? 1 : itensPage + 1;
      const result = await tabelasPrecoService.getItens(itensTabela.tabela_preco_id, itensSearch, nextPage, PAGE_LIMIT);
      setItens((prev) => (reset ? result.data : [...prev, ...result.data]));
      setItensPage(nextPage);
      const total = result.total ?? 0;
      setItensHasMore(total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT);
    } catch { toast.error('Erro ao carregar itens da tabela'); }
    finally { setItensLoading(false); }
  };

  const openItens = (t: TabelaPreco) => {
    setItensTabela(t);
    setItens([]);
    setItensSearch('');
    setItensPage(1);
    setItensHasMore(true);
    setPendingChanges({});
    setSelectedRows(new Set());
    setFilterPromocao(false);
    setFilterComissaoZerada(false);
    setFilterSemPreco(false);
    setItensView(true);
  };

  useEffect(() => {
    if (itensView && itensTabela) loadItens(true);
  }, [itensView, itensTabela]);

  const handleItensSearch = () => loadItens(true);
  const handleItensKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleItensSearch(); };

  const handleItensScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!itensHasMore || itensLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) loadItens();
  };

  const backToTabelas = () => {
    if (Object.keys(pendingChanges).length > 0) {
      if (!confirm('Há alterações não salvas. Deseja sair sem salvar?')) return;
    }
    setItensView(false);
    setItensTabela(null);
    setPendingChanges({});
    setSelectedRows(new Set());
  };

  // ── Inline editing ──────────────────────────────────────────────────────
  const commitCell = (produtoId: number, field: NumericItemField, val: number) => {
    setPendingChanges((prev) => ({
      ...prev,
      [produtoId]: { ...prev[produtoId], [field]: val },
    }));
  };

  const commitBool = (produtoId: number, field: BooleanItemField, val: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [produtoId]: { ...prev[produtoId], [field]: val },
    }));
  };

  const hasPending = Object.keys(pendingChanges).length > 0;

  const handleSaveAll = async () => {
    if (!itensTabela || !hasPending) return;
    setSavingAll(true);
    const entries = Object.entries(pendingChanges);
    let errors = 0;
    for (const [produtoIdStr, changes] of entries) {
      const produtoId = Number(produtoIdStr);
      try {
        await tabelasPrecoService.updateItem(itensTabela.tabela_preco_id, produtoId, changes);
      } catch { errors++; }
    }
    if (errors > 0) toast.error(`${errors} item(s) não puderam ser salvos`);
    else toast.success(`${entries.length} item(s) salvos com sucesso`);
    setPendingChanges({});
    await loadItens(true);
    setSavingAll(false);
  };

  const handleDesfazer = () => {
    setPendingChanges({});
    toast.info('Alterações desfeitas');
  };

  // ── Row selection ───────────────────────────────────────────────────────
  const toggleRow = (id: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visibleItens = itens.filter((item) => {
    if (filterPromocao && !item.produto_em_promocao) return false;
    if (filterComissaoZerada && item.comissao !== 0) return false;
    if (filterSemPreco && item.preco !== 0) return false;
    return true;
  });

  const allSelected = visibleItens.length > 0 && visibleItens.every((i) => selectedRows.has(i.produto_id));

  const toggleAll = () => {
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(visibleItens.map((i) => i.produto_id)));
  };

  const targetIds = selectedRows.size > 0
    ? Array.from(selectedRows)
    : visibleItens.map((i) => i.produto_id);

  // ── Batch apply ─────────────────────────────────────────────────────────
  const applyBatchField = (field: NumericItemField, rawVal: string) => {
    const val = parseFloat(rawVal.replace(',', '.'));
    if (isNaN(val)) { toast.error('Valor inválido'); return; }
    setPendingChanges((prev) => {
      const next = { ...prev };
      for (const id of targetIds) {
        next[id] = { ...next[id], [field]: val };
      }
      return next;
    });
    toast.info(`${field} aplicado em ${targetIds.length} item(s)`);
  };

  const applyBatchBool = (field: BooleanItemField, val: boolean) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      for (const id of targetIds) {
        next[id] = { ...next[id], [field]: val };
      }
      return next;
    });
  };

  // ── Delete item ─────────────────────────────────────────────────────────
  const handleDeleteItem = async (produtoId: number) => {
    if (!itensTabela) return;
    if (!confirm('Excluir este item?')) return;
    setDeleteItemLoading(produtoId);
    try {
      await tabelasPrecoService.deleteItem(itensTabela.tabela_preco_id, produtoId);
      toast.success('Item excluído');
      setPendingChanges((prev) => { const n = { ...prev }; delete n[produtoId]; return n; });
      setSelectedRows((prev) => { const n = new Set(prev); n.delete(produtoId); return n; });
      loadItens(true);
    } catch (e: any) { toast.error(e?.message || 'Erro ao excluir item'); }
    finally { setDeleteItemLoading(null); }
  };

  const handleDeleteSelected = async () => {
    if (!itensTabela || selectedRows.size === 0) return;
    if (!confirm(`Excluir ${selectedRows.size} item(s) selecionado(s)?`)) return;
    let errors = 0;
    for (const id of Array.from(selectedRows)) {
      try { await tabelasPrecoService.deleteItem(itensTabela.tabela_preco_id, id); }
      catch { errors++; }
    }
    if (errors > 0) toast.error(`${errors} item(s) não puderam ser excluídos`);
    else toast.success(`${selectedRows.size} item(s) excluídos`);
    setSelectedRows(new Set());
    loadItens(true);
  };

  // ── Add / Edit item dialog ───────────────────────────────────────────────
  const openAddItem = () => {
    setEditingItem(null);
    setSelectedProduct(null);
    setProductSearch('');
    setProductResults([]);
    setItemFormData(initialItemFormData);
    setAddItemOpen(true);
  };

  const openEditItem = (item: TabelaPrecoItem) => {
    setEditingItem(item);
    setSelectedProduct({ id: item.produto_id, descricao: item.descricao_produto, codigoProduto: item.codigo_produto, un: '', preco: item.preco });
    setProductSearch('');
    setProductResults([]);
    setItemFormData({
      preco: item.preco ? String(item.preco) : '',
      desconto_maximo: item.desconto_maximo ? String(item.desconto_maximo) : '',
      comissao: item.comissao ? String(item.comissao) : '',
      quantidade_minima: item.quantidade_minima ? String(item.quantidade_minima) : '',
      pvs: item.pvs ? String(item.pvs) : '',
      markup: item.markup ? String(item.markup) : '',
      despesa: item.despesa ? String(item.despesa) : '',
      lucro: item.lucro ? String(item.lucro) : '',
      frete: item.frete ? String(item.frete) : '',
      majoracao: item.majoracao ? String(item.majoracao) : '',
      permite_bonificacao: item.permite_bonificacao,
      permite_debito_credito: item.permite_debito_credito,
      permite_venda_especial: item.permite_venda_especial,
      produto_em_promocao: item.produto_em_promocao,
    });
    setAddItemOpen(true);
  };

  const searchProducts = async (q: string) => {
    if (!q.trim()) { setProductResults([]); return; }
    setProductSearchLoading(true);
    try {
      const results = await productsService.search({ descricao: q.trim() }, 1, 20);
      setProductResults(results);
    } catch { setProductResults([]); }
    finally { setProductSearchLoading(false); }
  };

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductResults([]);
    setProductSearch('');
    if (!itemFormData.preco && p.preco) {
      setItemFormData((prev) => ({ ...prev, preco: String(p.preco) }));
    }
  };

  const handleSaveItem = async () => {
    if (!itensTabela) return;
    if (!selectedProduct) { toast.error('Selecione um produto'); return; }
    setItemFormLoading(true);
    try {
      const payload = {
        produto_id: selectedProduct.id,
        preco: itemFormData.preco !== '' ? Number(itemFormData.preco) : undefined,
        desconto_maximo: itemFormData.desconto_maximo !== '' ? Number(itemFormData.desconto_maximo) : undefined,
        comissao: itemFormData.comissao !== '' ? Number(itemFormData.comissao) : undefined,
        quantidade_minima: itemFormData.quantidade_minima !== '' ? Number(itemFormData.quantidade_minima) : undefined,
        pvs: itemFormData.pvs !== '' ? Number(itemFormData.pvs) : undefined,
        markup: itemFormData.markup !== '' ? Number(itemFormData.markup) : undefined,
        despesa: itemFormData.despesa !== '' ? Number(itemFormData.despesa) : undefined,
        lucro: itemFormData.lucro !== '' ? Number(itemFormData.lucro) : undefined,
        frete: itemFormData.frete !== '' ? Number(itemFormData.frete) : undefined,
        majoracao: itemFormData.majoracao !== '' ? Number(itemFormData.majoracao) : undefined,
        permite_bonificacao: itemFormData.permite_bonificacao,
        permite_debito_credito: itemFormData.permite_debito_credito,
        permite_venda_especial: itemFormData.permite_venda_especial,
        produto_em_promocao: itemFormData.produto_em_promocao,
      };
      if (editingItem) {
        await tabelasPrecoService.updateItem(itensTabela.tabela_preco_id, editingItem.produto_id, payload);
        toast.success('Item atualizado');
      } else {
        await tabelasPrecoService.upsertItem(itensTabela.tabela_preco_id, payload);
        toast.success('Item adicionado');
      }
      setAddItemOpen(false);
      loadItens(true);
    } catch (e: any) { toast.error(e?.message || 'Erro ao salvar item'); }
    finally { setItemFormLoading(false); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const isInitialLoading = loading && tabelas.length === 0;
  const isLoadingMore = loading && tabelas.length > 0;
  const isItensLoading = itensLoading && itens.length === 0;
  const pendingCount = Object.keys(pendingChanges).length;

  // ── Tabela form content ─────────────────────────────────────────────────
  const formContent = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-12">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
          <Input className="h-8 text-sm" value={formData.descricao_tabela_preco}
            onChange={(e) => setFormData({ ...formData, descricao_tabela_preco: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo médio (dias)</label>
          <Input className="h-8 text-sm" type="number" min="0" value={formData.prazo_medio}
            onChange={(e) => setFormData({ ...formData, prazo_medio: e.target.value })} />
        </div>
        <div className="col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Pedido mínimo</label>
          <Input className="h-8 text-sm" type="number" min="0" step="0.01" value={formData.pedido_minimo}
            onChange={(e) => setFormData({ ...formData, pedido_minimo: e.target.value })} />
        </div>
        <div className="col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Índice financeiro</label>
          <Input className="h-8 text-sm" type="number" min="0" step="0.001" value={formData.indice_financeiro}
            onChange={(e) => setFormData({ ...formData, indice_financeiro: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Validade</label>
          <Input className="h-8 text-sm" type="date" value={formData.validade}
            onChange={(e) => setFormData({ ...formData, validade: e.target.value })} />
        </div>
        <div className="col-span-8">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de pagamento</label>
          <Select value={formData.forma_pagto_id} onValueChange={(v) => setFormData({ ...formData, forma_pagto_id: v === '__none__' ? '' : v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma</SelectItem>
              {formasPagamento.map((fp) => <SelectItem key={String(fp.id)} value={String(fp.id)}>{fp.descricao}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-12">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo de pagamento</label>
          <Select value={formData.prazo_pagto_id} onValueChange={(v) => setFormData({ ...formData, prazo_pagto_id: v === '__none__' ? '' : v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {prazos.map((pz) => <SelectItem key={String(pz.id)} value={String(pz.id)}>{pz.descricao}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-6 pt-1">
        <div className="flex items-center gap-2">
          <Checkbox checked={formData.somente_venda_avista}
            onCheckedChange={(c) => setFormData({ ...formData, somente_venda_avista: c === true })} />
          <label className="text-sm">Somente venda à vista</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={!formData.inativo}
            onCheckedChange={(c) => setFormData({ ...formData, inativo: c !== true })} />
          <label className="text-sm">Ativo</label>
        </div>
      </div>
    </div>
  );

  // ── Add item form content ────────────────────────────────────────────────
  const addItemFormContent = (
    <div className="space-y-3">
      {!editingItem && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Produto *</label>
          {selectedProduct ? (
            <div className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
              <div>
                <span className="text-xs text-muted-foreground mr-2">{selectedProduct.codigoProduto}</span>
                <span className="text-sm font-medium">{selectedProduct.descricao}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-xs"
                onClick={() => { setSelectedProduct(null); setItemFormData((p) => ({ ...p, preco: '' })); }}>
                Trocar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input className="h-8 text-sm flex-1" placeholder="Buscar produto..."
                  value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchProducts(productSearch); }} />
                <Button size="sm" className="h-8" onClick={() => searchProducts(productSearch)} disabled={productSearchLoading}>
                  {productSearchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {productResults.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-auto">
                  {productResults.map((p) => (
                    <button key={p.id} type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 border-b last:border-b-0"
                      onClick={() => selectProduct(p)}>
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{p.codigoProduto}</span>
                      <span className="truncate">{p.descricao}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {editingItem && (
        <div className="p-2 border rounded-md bg-muted/30">
          <span className="text-xs text-muted-foreground mr-2">{editingItem.codigo_produto}</span>
          <span className="text-sm font-medium">{editingItem.descricao_produto}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {([
          ['Preço', 'preco'], ['% Desc. máx.', 'desconto_maximo'],
          ['% Comissão', 'comissao'], ['% Markup', 'markup'],
          ['% Despesa', 'despesa'], ['% Majoração', 'majoracao'],
          ['% Lucro', 'lucro'], ['% Frete', 'frete'],
          ['Qtd. mínima', 'quantidade_minima'], ['PVS', 'pvs'],
        ] as [string, keyof ItemFormData][]).map(([label, field]) => (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
            <Input className="h-8 text-sm" type="number" min="0" step="0.01"
              value={itemFormData[field] as string}
              onChange={(e) => setItemFormData({ ...itemFormData, [field]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        {([
          ['Permite bonificação', 'permite_bonificacao'],
          ['Permite déb./créd.', 'permite_debito_credito'],
          ['Venda especial', 'permite_venda_especial'],
          ['Promoção', 'produto_em_promocao'],
        ] as [string, keyof ItemFormData][]).map(([label, field]) => (
          <div key={field} className="flex items-center gap-2">
            <Checkbox checked={itemFormData[field] as boolean}
              onCheckedChange={(c) => setItemFormData({ ...itemFormData, [field]: c === true })} />
            <label className="text-sm">{label}</label>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Batch bar field ──────────────────────────────────────────────────────
  function BatchField({ label, value, onChange, onApply }: {
    label: string; value: string; onChange: (v: string) => void; onApply: () => void;
  }) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
        <Input className="h-6 text-xs w-20 text-right px-1" value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onApply(); }} />
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={onApply}>OK</Button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ITEMS VIEW
  // ═══════════════════════════════════════════════════════════════════════
  if (itensView && itensTabela) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] space-y-0">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-card border rounded-t-md">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={backToTabelas}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Tabelas
            </Button>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-sm font-semibold truncate max-w-[400px]">
              {itensTabela.codigo_tabela_preco} — {itensTabela.descricao_tabela_preco}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasPending && (
              <span className="text-xs text-amber-600 font-medium">{pendingCount} alt. pendente(s)</span>
            )}
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openAddItem}>
              <Plus className="h-3.5 w-3.5" />
              Incluir produto
            </Button>
            {selectedRows.size > 0 && (
              <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={handleDeleteSelected}>
                <Trash2 className="h-3.5 w-3.5" />
                Excluir ({selectedRows.size})
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleDesfazer} disabled={!hasPending}>
              <Undo2 className="h-3.5 w-3.5" />
              Desfazer
            </Button>
            <Button size="sm" className="h-7 gap-1 text-xs" onClick={handleSaveAll} disabled={!hasPending || savingAll}>
              {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 bg-muted/30 border-x border-b">
          <div className="flex items-center gap-1">
            <Input
              className="h-7 text-xs w-52"
              placeholder="Buscar produto..."
              value={itensSearch}
              onChange={(e) => setItensSearch(e.target.value)}
              onKeyDown={handleItensKeyDown}
            />
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleItensSearch} disabled={itensLoading}>
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Checkbox id="f-promo" checked={filterPromocao} onCheckedChange={(c) => setFilterPromocao(c === true)} />
            <label htmlFor="f-promo" className="text-xs cursor-pointer">Promoção</label>
          </div>
          <div className="flex items-center gap-1">
            <Checkbox id="f-comzero" checked={filterComissaoZerada} onCheckedChange={(c) => setFilterComissaoZerada(c === true)} />
            <label htmlFor="f-comzero" className="text-xs cursor-pointer">Comissão zerada</label>
          </div>
          <div className="flex items-center gap-1">
            <Checkbox id="f-sempreco" checked={filterSemPreco} onCheckedChange={(c) => setFilterSemPreco(c === true)} />
            <label htmlFor="f-sempreco" className="text-xs cursor-pointer">Sem preço</label>
          </div>
          {(filterPromocao || filterComissaoZerada || filterSemPreco) && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1"
              onClick={() => { setFilterPromocao(false); setFilterComissaoZerada(false); setFilterSemPreco(false); }}>
              <X className="h-3 w-3" />
              Limpar filtros
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {visibleItens.length} item(s){selectedRows.size > 0 ? `, ${selectedRows.size} selecionado(s)` : ''}
          </span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-hidden border-x">
          <div className="h-full overflow-auto" onScroll={handleItensScroll}>
            <table className="w-full text-xs border-collapse" style={{ minWidth: 1100 }}>
              <thead className="sticky top-0 z-10 bg-muted/90">
                <tr className="border-b">
                  <th className="w-7 px-1 py-1.5 text-center">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="w-5 px-1 py-1.5 text-center">C</th>
                  <th className="w-16 px-1 py-1.5 text-left">Prod.</th>
                  <th className="px-1 py-1.5 text-left">Descrição</th>
                  <th className="w-16 px-1 py-1.5 text-left">Apres.</th>
                  <th className="w-16 px-1 py-1.5 text-right">Custo</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Markup</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Despesa</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Lucro</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Comissão</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Frete</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Major.</th>
                  <th className="w-10 px-1 py-1.5 text-center">Prom.</th>
                  <th className="w-20 px-1 py-1.5 text-right">Preço Venda</th>
                  <th className="w-14 px-1 py-1.5 text-right">%DescMáx</th>
                  <th className="w-8 px-1 py-1.5 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {isItensLoading ? (
                  <tr><td colSpan={16} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td></tr>
                ) : visibleItens.length === 0 ? (
                  <tr><td colSpan={16} className="text-center py-10 text-muted-foreground">
                    Nenhum item encontrado
                  </td></tr>
                ) : (
                  visibleItens.map((item) => {
                    const pending = pendingChanges[item.produto_id];
                    const isSelected = selectedRows.has(item.produto_id);
                    const hasPendingRow = !!pending && Object.keys(pending).length > 0;
                    const promValue = pending && 'produto_em_promocao' in pending
                      ? Boolean(pending.produto_em_promocao)
                      : item.produto_em_promocao;

                    return (
                      <tr
                        key={item.produto_id}
                        className={`border-b transition-colors
                          ${isSelected ? 'bg-primary/5' : hasPendingRow ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-muted/30'}
                          ${item.produto_inativo ? 'opacity-50' : ''}`}
                      >
                        <td className="px-1 py-0.5 text-center">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(item.produto_id)} />
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          <span className={`inline-block w-4 h-4 rounded text-[10px] font-bold leading-4 text-center ${item.produto_inativo ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                            {item.produto_inativo ? 'I' : 'A'}
                          </span>
                        </td>
                        <td className="px-1 py-0.5 font-mono text-[11px]">{item.codigo_produto}</td>
                        <td className="px-1 py-0.5 max-w-0">
                          <span className="block truncate" title={item.descricao_produto}>{item.descricao_produto}</span>
                        </td>
                        <td className="px-1 py-0.5 text-muted-foreground">{item.apresentacao || '-'}</td>
                        <td className="px-1 py-0.5 text-right text-muted-foreground">{fmt(item.custo)}</td>
                        <td className="px-1 py-0.5 text-right">
                          <EditableCell value={item.markup} field="markup" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-right">
                          <EditableCell value={item.despesa} field="despesa" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-right">
                          <EditableCell value={item.lucro} field="lucro" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-right">
                          <EditableCell value={item.comissao} field="comissao" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-right">
                          <EditableCell value={item.frete} field="frete" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-right">
                          <EditableCell value={item.majoracao} field="majoracao" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          <Checkbox
                            checked={promValue}
                            onCheckedChange={(c) => commitBool(item.produto_id, 'produto_em_promocao', c === true)}
                          />
                        </td>
                        <td className="px-1 py-0.5 text-right font-medium">
                          <EditableCell value={item.preco} field="preco" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-right">
                          <EditableCell value={item.desconto_maximo} field="desconto_maximo" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6"
                                  onClick={() => handleDeleteItem(item.produto_id)}
                                  disabled={deleteItemLoading === item.produto_id}>
                                  {deleteItemLoading === item.produto_id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Trash2 className="h-3 w-3" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      </tr>
                    );
                  })
                )}
                {itensLoading && itens.length > 0 && (
                  <tr><td colSpan={16} className="text-center py-3 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Batch bottom bar */}
        <div className="border rounded-b-md bg-card px-3 py-2 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <BatchField label="% Despesa" value={batchDespesa} onChange={setBatchDespesa} onApply={() => applyBatchField('despesa', batchDespesa)} />
            <BatchField label="% Comissão" value={batchComissao} onChange={setBatchComissao} onApply={() => applyBatchField('comissao', batchComissao)} />
            <BatchField label="% Majoração" value={batchMajoracao} onChange={setBatchMajoracao} onApply={() => applyBatchField('majoracao', batchMajoracao)} />
            <BatchField label="% Markup" value={batchMarkup} onChange={setBatchMarkup} onApply={() => applyBatchField('markup', batchMarkup)} />
            <BatchField label="% Lucro" value={batchLucro} onChange={setBatchLucro} onApply={() => applyBatchField('lucro', batchLucro)} />
            <BatchField label="% Frete" value={batchFrete} onChange={setBatchFrete} onApply={() => applyBatchField('frete', batchFrete)} />
            <BatchField label="% Desconto" value={batchDesconto} onChange={setBatchDesconto} onApply={() => applyBatchField('desconto_maximo', batchDesconto)} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-xs text-muted-foreground">Aplicar em {selectedRows.size > 0 ? `${selectedRows.size} selecionado(s)` : 'todos'}:</span>
            <div className="flex items-center gap-1.5">
              <Checkbox id="b-bon" checked={batchBonificacao} onCheckedChange={(c) => {
                setBatchBonificacao(c === true);
                applyBatchBool('permite_bonificacao', c === true);
              }} />
              <label htmlFor="b-bon" className="text-xs cursor-pointer">Permite bonificação</label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox id="b-dc" checked={batchDebitoCredito} onCheckedChange={(c) => {
                setBatchDebitoCredito(c === true);
                applyBatchBool('permite_debito_credito', c === true);
              }} />
              <label htmlFor="b-dc" className="text-xs cursor-pointer">Gera Débito/Crédito</label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox id="b-ve" checked={batchVendaEspecial} onCheckedChange={(c) => {
                setBatchVendaEspecial(c === true);
                applyBatchBool('permite_venda_especial', c === true);
              }} />
              <label htmlFor="b-ve" className="text-xs cursor-pointer">Venda especial</label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox id="b-promo" checked={batchPromocao} onCheckedChange={(c) => {
                setBatchPromocao(c === true);
                applyBatchBool('produto_em_promocao', c === true);
              }} />
              <label htmlFor="b-promo" className="text-xs cursor-pointer">Produto em Promoção</label>
            </div>
          </div>
        </div>

        {/* Add/Edit item dialog */}
        <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
          <DialogContent className="w-[95vw] max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Item' : 'Incluir Produto'}</DialogTitle>
            </DialogHeader>
            {addItemFormContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveItem} disabled={itemFormLoading}>
                {itemFormLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TABELAS LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tabelas de Preço ({tabelas.length})
            </CardTitle>
            <Button onClick={openCreate} size="sm" disabled={!canInsert}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tabela
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input placeholder="Buscar por código ou descrição..." value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={handleKeyDown} className="flex-1" />
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as 'ativos' | 'inativos' | 'todos')}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
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
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-24 text-right">Prazo médio</TableHead>
                      <TableHead className="w-24 text-center">Só à vista</TableHead>
                      <TableHead className="w-28 text-right">Ped. mínimo</TableHead>
                      <TableHead className="w-28 text-right">Índice fin.</TableHead>
                      <TableHead className="w-28">Validade</TableHead>
                      <TableHead className="w-20 text-center">Status</TableHead>
                      <TableHead className="w-32 text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isInitialLoading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell></TableRow>
                    ) : tabelas.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma tabela de preço encontrada
                      </TableCell></TableRow>
                    ) : (
                      tabelas.map((t) => (
                        <TableRow key={t.tabela_preco_id} className={t.inativo ? 'opacity-50' : ''}>
                          <TableCell className="font-mono text-xs">{t.codigo_tabela_preco || '-'}</TableCell>
                          <TableCell className="font-medium">{t.descricao_tabela_preco}</TableCell>
                          <TableCell className="text-right text-sm">{t.prazo_medio != null ? `${t.prazo_medio}d` : '-'}</TableCell>
                          <TableCell className="text-center">
                            {t.somente_venda_avista
                              ? <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Sim</span>
                              : <span className="text-xs text-muted-foreground">Não</span>}
                          </TableCell>
                          <TableCell className="text-right text-sm">{t.pedido_minimo > 0 ? fmt(t.pedido_minimo) : '-'}</TableCell>
                          <TableCell className="text-right text-sm">{t.indice_financeiro > 0 ? fmt(t.indice_financeiro, 3) : '-'}</TableCell>
                          <TableCell className="text-sm">{formatDate(t.validade)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs px-2 py-0.5 rounded ${t.inativo ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                              {t.inativo ? 'Inativo' : 'Ativo'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <div className="flex items-center justify-center gap-0.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openItens(t)}>
                                      <List className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Itens</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => handleDelete(t.tabela_preco_id)}
                                      disabled={deleteLoading === t.tabela_preco_id}>
                                      {deleteLoading === t.tabela_preco_id
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Trash2 className="h-3.5 w-3.5" />}
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
                      <TableRow><TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader><DialogTitle>Nova Tabela de Preço</DialogTitle></DialogHeader>
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader><DialogTitle>Editar Tabela de Preço</DialogTitle></DialogHeader>
          {formLoading && !formData.descricao_tabela_preco ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : formContent}
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
