import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Tag, Plus, Pencil, Trash2, Loader2, List, ArrowLeft, Save, Undo2, X, Copy, Percent } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { tabelasPrecoService, TabelaPreco, TabelaPrecoItem, TabelaPrecoDivisao } from '@/services/tabelasPrecoService';
import { metadataService, FormaPagamento, PrazoPagto } from '@/services/metadataService';
import { type Product } from '@/services/productsService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';
import { ProductSearchDialog } from '@/components/televendas/overlays/ProductSearchDialog';

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
  tabela_referencia_id: '',
  tabela_referencia_percentual: '',
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

  // Itens filters (server-side)
  const [itensStatus, setItensStatus] = useState<'ativos' | 'inativos' | 'todos'>('todos');
  const [itensFornecedor, setItensFornecedor] = useState('all');
  const [itensDivisao, setItensDivisao] = useState('all');
  const [itensMarca, setItensMarca] = useState('');
  const [itensLancamento, setItensLancamento] = useState(false);
  const [itensPossuiFoto, setItensPossuiFoto] = useState(false);
  const [itensB2b, setItensB2b] = useState(false);
  const [itensB2c, setItensB2c] = useState(false);

  // Refs que sempre apontam para os valores mais recentes dos filtros
  // (atualizados sincronamente no render — evita closure stale em loadItens)
  const itensStatusRef = useRef(itensStatus);
  const itensFornecedorRef = useRef(itensFornecedor);
  const itensDivisaoRef = useRef(itensDivisao);
  const itensMarcaRef = useRef(itensMarca);
  const itensLancamentoRef = useRef(itensLancamento);
  const itensPossuiFotoRef = useRef(itensPossuiFoto);
  const itensB2bRef = useRef(itensB2b);
  const itensB2cRef = useRef(itensB2c);
  const itensSearchRef = useRef(itensSearch);
  const itensTabelaRef = useRef(itensTabela);
  const itensPageRef = useRef(itensPage);
  const itensLoadingRef = useRef(false);

  // Sync refs — roda durante o render (antes de qualquer handler)
  itensStatusRef.current = itensStatus;
  itensFornecedorRef.current = itensFornecedor;
  itensDivisaoRef.current = itensDivisao;
  itensMarcaRef.current = itensMarca;
  itensLancamentoRef.current = itensLancamento;
  itensPossuiFotoRef.current = itensPossuiFoto;
  itensB2bRef.current = itensB2b;
  itensB2cRef.current = itensB2c;
  itensSearchRef.current = itensSearch;
  itensTabelaRef.current = itensTabela;
  itensPageRef.current = itensPage;

  // Itens filters (client-side)
  const [filterPromocao, setFilterPromocao] = useState(false);
  const [filterComissaoZerada, setFilterComissaoZerada] = useState(false);
  const [filterSemPreco, setFilterSemPreco] = useState(false);

  // Listas para dropdowns de filtro
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);

  // Inline edit: pending changes per produto_id
  const [pendingChanges, setPendingChanges] = useState<Record<number, PendingChange>>({});
  const [savingAll, setSavingAll] = useState(false);

  // Row selection
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Add item dialog (product search modal)
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [importingItems, setImportingItems] = useState(false);

  // Copiar itens dialog
  const [copiarOpen, setCopiarOpen] = useState(false);
  const [copiarFornecedor, setCopiarFornecedor] = useState('all');
  const [copiarDivisao, setCopiarDivisao] = useState('all');
  const [copiarMarca, setCopiarMarca] = useState('');
  const [copiarDestino, setCopiarDestino] = useState('');
  const [copiarLoading, setCopiarLoading] = useState(false);

  // Divisões dialog
  const [divisoesOpen, setDivisoesOpen] = useState(false);
  const [divisoesTabela, setDivisoesTabela] = useState<TabelaPreco | null>(null);
  const [divisoesItems, setDivisoesItems] = useState<TabelaPrecoDivisao[]>([]);
  const [divisoesLoading, setDivisoesLoading] = useState(false);
  const [divisoesSearch, setDivisoesSearch] = useState('');
  const [divisoesTab, setDivisoesTab] = useState<'pesquisa' | 'dados'>('pesquisa');
  const [divisaoEditando, setDivisaoEditando] = useState<TabelaPrecoDivisao | null>(null);
  const [divisaoFormDivisaoId, setDivisaoFormDivisaoId] = useState('');
  const [divisaoFormPercentual, setDivisaoFormPercentual] = useState('');
  const [divisaoFormLoading, setDivisaoFormLoading] = useState(false);
  const [divisaoDeleteLoading, setDivisaoDeleteLoading] = useState<number | null>(null);

  // Edit item dialog
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TabelaPrecoItem | null>(null);
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
      const [fp, pz, fornRes, divRes] = await Promise.all([
        metadataService.getFormasPagamento(),
        metadataService.getPrazos(),
        suppliersService.getAll(undefined, 1, 500, 'ativos', true),
        divisionsService.getAll(undefined, undefined, 1, 500, 'ativos'),
      ]);
      setFormasPagamento(fp);
      setPrazos(pz);
      setFornecedores(fornRes.data || []);
      setDivisoes(divRes.data || []);
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
          tabela_referencia_id: detail.tabela_referencia_id != null ? String(detail.tabela_referencia_id) : '',
          tabela_referencia_percentual: detail.tabela_referencia_percentual != null ? String(detail.tabela_referencia_percentual) : '',
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
    tabela_referencia_id: formData.tabela_referencia_id !== '' ? Number(formData.tabela_referencia_id) : null,
    tabela_referencia_percentual: formData.tabela_referencia_percentual !== '' ? Number(formData.tabela_referencia_percentual) : null,
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
  // useCallback sem deps: lê APENAS de refs, nunca de closure stale
  const loadItens = useCallback(async (reset = false) => {
    if (!itensTabelaRef.current) return;
    if (itensLoadingRef.current) return;
    itensLoadingRef.current = true;
    setItensLoading(true);
    if (reset) { setItens([]); setItensPage(1); setItensHasMore(true); }
    try {
      const nextPage = reset ? 1 : itensPageRef.current + 1;
      const filters = {
        status: itensStatusRef.current as 'ativos' | 'inativos' | 'todos',
        fornecedorId: itensFornecedorRef.current !== 'all' ? Number(itensFornecedorRef.current) : undefined,
        divisaoId: itensDivisaoRef.current !== 'all' ? Number(itensDivisaoRef.current) : undefined,
        marca: itensMarcaRef.current || undefined,
        lancamento: itensLancamentoRef.current || undefined,
        possuiFoto: itensPossuiFotoRef.current || undefined,
        permiteVendaB2b: itensB2bRef.current || undefined,
        permiteVendaB2c: itensB2cRef.current || undefined,
      };
      console.debug('[loadItens] tabelaId=%d page=%d filters=%o', itensTabelaRef.current.tabela_preco_id, nextPage, filters);
      const result = await tabelasPrecoService.getItens(
        itensTabelaRef.current.tabela_preco_id,
        itensSearchRef.current,
        nextPage,
        PAGE_LIMIT,
        filters,
      );
      setItens((prev) => (reset ? result.data : [...prev, ...result.data]));
      setItensPage(nextPage);
      itensPageRef.current = nextPage;
      const total = result.total ?? 0;
      setItensHasMore(total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT);
    } catch { toast.error('Erro ao carregar itens da tabela'); }
    finally {
      itensLoadingRef.current = false;
      setItensLoading(false);
    }
  }, []);

  const resetItensFilters = () => {
    itensStatusRef.current = 'todos';
    itensFornecedorRef.current = 'all';
    itensDivisaoRef.current = 'all';
    itensMarcaRef.current = '';
    itensLancamentoRef.current = false;
    itensPossuiFotoRef.current = false;
    itensB2bRef.current = false;
    itensB2cRef.current = false;
    itensSearchRef.current = '';
    setItensStatus('todos');
    setItensFornecedor('all');
    setItensDivisao('all');
    setItensMarca('');
    setItensLancamento(false);
    setItensPossuiFoto(false);
    setItensB2b(false);
    setItensB2c(false);
    setFilterPromocao(false);
    setFilterComissaoZerada(false);
    setFilterSemPreco(false);
  };

  const openItens = (t: TabelaPreco) => {
    itensTabelaRef.current = t;
    itensPageRef.current = 1;
    itensLoadingRef.current = false;
    setItensTabela(t);
    setItens([]);
    setItensSearch('');
    setItensPage(1);
    setItensHasMore(true);
    setPendingChanges({});
    setSelectedRows(new Set());
    resetItensFilters();
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
    itensLoadingRef.current = false;
    itensTabelaRef.current = null;
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

  // ── Add item via product search dialog ─────────────────────────────────
  const openAddItem = () => {
    setProductSearchOpen(true);
  };

  const handleImportProducts = async (selectedProducts: Product[]) => {
    if (!itensTabela) return;
    setImportingItems(true);
    let errors = 0;
    for (const p of selectedProducts) {
      try {
        await tabelasPrecoService.upsertItem(itensTabela.tabela_preco_id, {
          produto_id: p.id,
          preco: p.preco ?? 0,
        });
      } catch { errors++; }
    }
    setImportingItems(false);
    if (errors > 0) toast.error(`${errors} produto(s) não puderam ser adicionados`);
    else toast.success(`${selectedProducts.length} produto(s) importado(s) com sucesso`);
    loadItens(true);
  };

  const handleCopiarItens = async () => {
    if (!itensTabela || !copiarDestino) { toast.error('Selecione a tabela destino'); return; }
    setCopiarLoading(true);
    const hasSelection = selectedRows.size > 0;
    try {
      const result = await tabelasPrecoService.copiarItens(
        itensTabela.tabela_preco_id,
        Number(copiarDestino),
        hasSelection
          ? { produtoIds: Array.from(selectedRows) }
          : {
              fornecedorId: copiarFornecedor !== 'all' ? Number(copiarFornecedor) : undefined,
              divisaoId: copiarDivisao !== 'all' ? Number(copiarDivisao) : undefined,
              marca: copiarMarca.trim() || undefined,
            },
      );
      toast.success(
        `${result.copiados} item(s) copiado(s)${result.ignorados > 0 ? ` · ${result.ignorados} já existente(s) ignorado(s)` : ''}`,
      );
      setCopiarOpen(false);
      setCopiarFornecedor('all');
      setCopiarDivisao('all');
      setCopiarMarca('');
      setCopiarDestino('');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao copiar itens');
    } finally {
      setCopiarLoading(false);
    }
  };

  // ── Edit item dialog ─────────────────────────────────────────────────────

  const openEditItem = (item: TabelaPrecoItem) => {
    setEditingItem(item);
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

  const handleSaveItem = async () => {
    if (!itensTabela || !editingItem) return;
    setItemFormLoading(true);
    try {
      const payload = {
        produto_id: editingItem.produto_id,
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
      await tabelasPrecoService.updateItem(itensTabela.tabela_preco_id, editingItem.produto_id, payload);
      toast.success('Item atualizado');
      setAddItemOpen(false);
      loadItens(true);
    } catch (e: any) { toast.error(e?.message || 'Erro ao salvar item'); }
    finally { setItemFormLoading(false); }
  };

  // ── Divisões dialog ─────────────────────────────────────────────────────
  const loadDivisoes = async (tabela: TabelaPreco, q?: string) => {
    setDivisoesLoading(true);
    try {
      const res = await tabelasPrecoService.getDivisoes(tabela.tabela_preco_id, q);
      setDivisoesItems(res.data);
    } catch { toast.error('Erro ao carregar divisões'); }
    finally { setDivisoesLoading(false); }
  };

  const openDivisoes = (tabela: TabelaPreco) => {
    setDivisoesTabela(tabela);
    setDivisoesItems([]);
    setDivisoesSearch('');
    setDivisoesTab('pesquisa');
    resetDivisaoForm();
    setDivisoesOpen(true);
    loadDivisoes(tabela);
  };

  const resetDivisaoForm = () => {
    setDivisaoEditando(null);
    setDivisaoFormDivisaoId('');
    setDivisaoFormPercentual('');
  };

  const openNovaDivisao = () => {
    resetDivisaoForm();
    setDivisoesTab('dados');
  };

  const openEditDivisao = (d: TabelaPrecoDivisao) => {
    setDivisaoEditando(d);
    setDivisaoFormDivisaoId(String(d.divisao_id));
    setDivisaoFormPercentual(String(d.percentual_ajuste));
    setDivisoesTab('dados');
  };

  const handleSaveDivisao = async () => {
    if (!divisoesTabela) return;
    if (!divisaoFormDivisaoId) { toast.error('Selecione a divisão'); return; }
    const percentual = parseFloat(divisaoFormPercentual.replace(',', '.'));
    if (isNaN(percentual)) { toast.error('Percentual inválido'); return; }

    setDivisaoFormLoading(true);
    try {
      if (divisaoEditando) {
        await tabelasPrecoService.updateDivisao(
          divisoesTabela.tabela_preco_id,
          divisaoEditando.divisao_id,
          { percentual_ajuste: percentual },
        );
        toast.success('Divisão atualizada');
      } else {
        await tabelasPrecoService.createDivisao(divisoesTabela.tabela_preco_id, {
          divisao_id: Number(divisaoFormDivisaoId),
          percentual_ajuste: percentual,
        });
        toast.success('Divisão adicionada');
      }
      resetDivisaoForm();
      setDivisoesTab('pesquisa');
      loadDivisoes(divisoesTabela, divisoesSearch);
    } catch (e: any) { toast.error(e?.message || 'Erro ao salvar divisão'); }
    finally { setDivisaoFormLoading(false); }
  };

  const handleDeleteDivisao = async (d: TabelaPrecoDivisao) => {
    if (!divisoesTabela) return;
    if (!confirm(`Excluir divisão "${d.descricao_divisao}"?`)) return;
    setDivisaoDeleteLoading(d.id);
    try {
      await tabelasPrecoService.deleteDivisao(divisoesTabela.tabela_preco_id, d.divisao_id);
      toast.success('Divisão excluída');
      loadDivisoes(divisoesTabela, divisoesSearch);
    } catch (e: any) { toast.error(e?.message || 'Erro ao excluir divisão'); }
    finally { setDivisaoDeleteLoading(null); }
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-8">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tabela de referência</label>
          <Select
            value={formData.tabela_referencia_id}
            onValueChange={(v) => setFormData({ ...formData, tabela_referencia_id: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma</SelectItem>
              {tabelas
                .filter((t) => editId == null || t.tabela_preco_id !== editId)
                .map((t) => (
                  <SelectItem key={String(t.tabela_preco_id)} value={String(t.tabela_preco_id)}>
                    {t.codigo_tabela_preco} — {t.descricao_tabela_preco}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">% Referência</label>
          <Input className="h-8 text-sm" type="number" min="0" step="0.01"
            value={formData.tabela_referencia_percentual}
            onChange={(e) => setFormData({ ...formData, tabela_referencia_percentual: e.target.value })} />
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

  // ── Edit item form content ────────────────────────────────────────────────
  const addItemFormContent = (
    <div className="space-y-3">
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
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openAddItem} disabled={importingItems}>
              {importingItems ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Incluir produto
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setCopiarOpen(true)}>
              <Copy className="h-3.5 w-3.5" />
              Copiar itens
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
        <div className="border-x border-b bg-muted/20">
          {/* Row 1: busca + status + fornecedor + divisão + marca */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-dashed">
            <div className="flex items-center gap-1">
              <Input
                className="h-7 text-xs w-44"
                placeholder="Buscar produto..."
                value={itensSearch}
                onChange={(e) => setItensSearch(e.target.value)}
                onKeyDown={handleItensKeyDown}
              />
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleItensSearch} disabled={itensLoading}>
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Select value={itensStatus} onValueChange={(v) => setItensStatus(v as 'ativos' | 'inativos' | 'todos')}>
              <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={itensFornecedor} onValueChange={setItensFornecedor}>
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue placeholder="Fornecedor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos fornecedores</SelectItem>
                {fornecedores.map((f) => (
                  <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>
                    {f.nome_fornecedor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={itensDivisao} onValueChange={setItensDivisao}>
              <SelectTrigger className="h-7 text-xs w-40">
                <SelectValue placeholder="Divisão..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas divisões</SelectItem>
                {divisoes.map((d) => (
                  <SelectItem key={d.divisao_id} value={String(d.divisao_id)}>
                    {d.descricao_divisao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="h-7 text-xs w-28"
              placeholder="Marca..."
              value={itensMarca}
              onChange={(e) => setItensMarca(e.target.value)}
              onKeyDown={handleItensKeyDown}
            />

            <Button size="sm" className="h-7 px-3 text-xs" onClick={handleItensSearch} disabled={itensLoading}>
              Pesquisar
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1" onClick={() => { resetItensFilters(); }}>
              <X className="h-3 w-3" />
              Limpar
            </Button>
          </div>

          {/* Row 2: flags booleanas */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5">
            {([
              ['f-lancamento', 'Lançamento',      itensLancamento,    setItensLancamento],
              ['f-foto',       'Possui foto',      itensPossuiFoto,    setItensPossuiFoto],
              ['f-b2b',        'Permite B2B',      itensB2b,           setItensB2b],
              ['f-b2c',        'Permite B2C',      itensB2c,           setItensB2c],
              ['f-promo',      'Em promoção',      filterPromocao,     setFilterPromocao],
              ['f-comzero',    'Comissão zerada',  filterComissaoZerada, setFilterComissaoZerada],
              ['f-sempreco',   'Sem preço',        filterSemPreco,     setFilterSemPreco],
            ] as [string, string, boolean, (v: boolean) => void][]).map(([id, label, checked, setter]) => (
              <div key={id} className="flex items-center gap-1">
                <Checkbox id={id} checked={checked}
                  onCheckedChange={(c) => setter(c === true)} />
                <label htmlFor={id} className="text-xs cursor-pointer">{label}</label>
              </div>
            ))}

            <span className="text-xs text-muted-foreground ml-auto">
              {visibleItens.length} item(s){selectedRows.size > 0 ? `, ${selectedRows.size} selecionado(s)` : ''}
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-hidden border-x">
          <div className="h-full overflow-auto" onScroll={handleItensScroll}>
            <table className="w-full text-xs border-collapse" style={{ minWidth: 1500 }}>
              <thead className="sticky top-0 z-10 bg-muted/90">
                <tr className="border-b">
                  <th className="w-7 px-1 py-1.5 text-center">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="w-16 px-1 py-1.5 text-left">Prod.</th>
                  <th className="px-1 py-1.5 text-left">Descrição</th>
                  <th className="w-16 px-1 py-1.5 text-left">Apres.</th>
                  <th className="w-10 px-1 py-1.5 text-left">UN</th>
                  <th className="w-20 px-1 py-1.5 text-right">Estoque</th>
                  <th className="w-32 px-1 py-1.5 text-left">Divisão</th>
                  <th className="w-36 px-1 py-1.5 text-left">Fornecedor</th>
                  <th className="w-24 px-1 py-1.5 text-left">EAN13</th>
                  <th className="w-24 px-1 py-1.5 text-left">Cód.Fábrica</th>
                  <th className="w-28 px-1 py-1.5 text-left">Marca</th>
                  <th className="w-20 px-1 py-1.5 text-right">Múlt.Venda</th>
                  <th className="w-28 px-1 py-1.5 text-right">Pr.Nac.Cons.</th>
                  <th className="w-32 px-1 py-1.5 text-left">Princ.Ativo</th>
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
                  <tr><td colSpan={25} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td></tr>
                ) : visibleItens.length === 0 ? (
                  <tr><td colSpan={25} className="text-center py-10 text-muted-foreground">
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
                        <td className="px-1 py-0.5 font-mono text-[11px]">{item.codigo_produto}</td>
                        <td className="px-1 py-0.5 max-w-0">
                          <span className="block truncate" title={item.descricao_produto}>{item.descricao_produto}</span>
                        </td>
                        <td className="px-1 py-0.5 text-muted-foreground">{item.apresentacao || '-'}</td>
                        <td className="px-1 py-0.5 text-muted-foreground">{item.un || '-'}</td>
                        <td className="px-1 py-0.5 text-right text-muted-foreground">{fmt(item.estoque, 3)}</td>
                        <td className="px-1 py-0.5 text-muted-foreground truncate max-w-[128px]" title={item.divisao}>{item.divisao || '-'}</td>
                        <td className="px-1 py-0.5 text-muted-foreground truncate max-w-[144px]" title={item.fornecedor}>{item.fornecedor || '-'}</td>
                        <td className="px-1 py-0.5 font-mono text-[11px]">{item.ean13 || '-'}</td>
                        <td className="px-1 py-0.5 font-mono text-[11px]">{item.codigo_fabrica || '-'}</td>
                        <td className="px-1 py-0.5 text-muted-foreground truncate max-w-[112px]" title={item.marca}>{item.marca || '-'}</td>
                        <td className="px-1 py-0.5 text-right text-muted-foreground">{item.multiplo_de_vendas != null ? fmt(item.multiplo_de_vendas, 3) : '-'}</td>
                        <td className="px-1 py-0.5 text-right text-muted-foreground">{item.preco_nacional_consumidor != null ? fmt(item.preco_nacional_consumidor) : '-'}</td>
                        <td className="px-1 py-0.5 text-muted-foreground truncate max-w-[128px]" title={item.principio_ativo ?? ''}>{item.principio_ativo || '-'}</td>
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
                  <tr><td colSpan={25} className="text-center py-3 text-muted-foreground">
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

        {/* Copiar itens dialog */}
        <Dialog open={copiarOpen} onOpenChange={(v) => {
          setCopiarOpen(v);
          if (!v) { setCopiarFornecedor('all'); setCopiarDivisao('all'); setCopiarMarca(''); setCopiarDestino(''); }
        }}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Copiar Itens para Tabela</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {selectedRows.size > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                  {selectedRows.size} item(s) selecionado(s) — os filtros abaixo serão ignorados
                </div>
              )}
              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                <label className={`text-sm font-medium text-right ${selectedRows.size > 0 ? 'text-muted-foreground' : ''}`}>Fornecedor</label>
                <Select value={copiarFornecedor} onValueChange={setCopiarFornecedor} disabled={selectedRows.size > 0}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>
                        {f.nome_fornecedor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                <label className={`text-sm font-medium text-right ${selectedRows.size > 0 ? 'text-muted-foreground' : ''}`}>Divisão</label>
                <Select value={copiarDivisao} onValueChange={setCopiarDivisao} disabled={selectedRows.size > 0}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {divisoes.map((d) => (
                      <SelectItem key={d.divisao_id} value={String(d.divisao_id)}>
                        {d.descricao_divisao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                <label className={`text-sm font-medium text-right ${selectedRows.size > 0 ? 'text-muted-foreground' : ''}`}>Marca</label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Todas"
                  value={copiarMarca}
                  onChange={(e) => setCopiarMarca(e.target.value)}
                  disabled={selectedRows.size > 0}
                />
              </div>
              <div className="border-t pt-3 grid grid-cols-[100px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-right">Tabela Origem</label>
                <div className="h-8 flex items-center px-3 border rounded-md bg-muted/40 text-sm text-muted-foreground truncate">
                  {itensTabela?.codigo_tabela_preco} — {itensTabela?.descricao_tabela_preco}
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-right">Tabela Destino</label>
                <Select value={copiarDestino} onValueChange={setCopiarDestino}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tabelas
                      .filter((t) => t.tabela_preco_id !== itensTabela?.tabela_preco_id)
                      .map((t) => (
                        <SelectItem key={t.tabela_preco_id} value={String(t.tabela_preco_id)}>
                          {t.codigo_tabela_preco} — {t.descricao_tabela_preco}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCopiarOpen(false)}>Cancelar</Button>
              <Button onClick={handleCopiarItens} disabled={copiarLoading || !copiarDestino}>
                {copiarLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Copy className="h-4 w-4 mr-2" />
                Copiar para destino
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product search dialog for adding items */}
        <ProductSearchDialog
          open={productSearchOpen}
          onOpenChange={setProductSearchOpen}
          multiSelect
          onSelectProducts={handleImportProducts}
          selectedTabelaId={itensTabela?.tabela_preco_id ? String(itensTabela.tabela_preco_id) : undefined}
          showRecordCounter
        />

        {/* Edit item dialog */}
        <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
          <DialogContent className="w-[95vw] max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Item</DialogTitle>
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
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                const t = tabelas.find((t) => t.tabela_preco_id === editId);
                if (!t?.tabela_referencia_id) {
                  toast.error('Salve a tabela com uma referência antes de configurar percentuais por divisão');
                  return;
                }
                setEditOpen(false);
                openDivisoes(t);
              }}
              disabled={!editId}
            >
              <Percent className="h-4 w-4" />
              Percentual por Divisões
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdate} disabled={formLoading}>
                {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Divisões dialog */}
      <Dialog open={divisoesOpen} onOpenChange={(v) => { setDivisoesOpen(v); if (!v) resetDivisaoForm(); }}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Percentual por Divisões
              {divisoesTabela && (
                <span className="text-muted-foreground font-normal text-sm ml-1">
                  — {divisoesTabela.codigo_tabela_preco} {divisoesTabela.descricao_tabela_preco}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Custom tab bar */}
          <div className="flex border-b">
            {(['pesquisa', 'dados'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setDivisoesTab(tab); if (tab === 'dados' && !divisaoEditando) resetDivisaoForm(); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  divisoesTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'pesquisa' ? 'Pesquisa' : 'Dados da divisão'}
              </button>
            ))}
          </div>

          {/* ── Aba Pesquisa ── */}
          {divisoesTab === 'pesquisa' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium w-16 text-right shrink-0">Divisão</label>
                <Input
                  className="h-8 text-sm flex-1"
                  placeholder="Pesquisar divisão..."
                  value={divisoesSearch}
                  onChange={(e) => setDivisoesSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && divisoesTabela) loadDivisoes(divisoesTabela, divisoesSearch);
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => divisoesTabela && loadDivisoes(divisoesTabela, divisoesSearch)}
                  disabled={divisoesLoading}
                >
                  {divisoesLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Pesquisar
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr className="border-b">
                      <th className="w-12 px-2 py-1.5 text-left">Id</th>
                      <th className="w-20 px-2 py-1.5 text-left">Divisão</th>
                      <th className="px-2 py-1.5 text-left">Descrição</th>
                      <th className="w-28 px-2 py-1.5 text-right">Percentual Ajuste</th>
                      <th className="w-16 px-2 py-1.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisoesLoading ? (
                      <tr><td colSpan={5} className="text-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </td></tr>
                    ) : divisoesItems.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhuma divisão cadastrada
                      </td></tr>
                    ) : (
                      divisoesItems.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b hover:bg-muted/30 cursor-pointer"
                          onClick={() => openEditDivisao(d)}
                        >
                          <td className="px-2 py-1.5 font-mono">{d.id}</td>
                          <td className="px-2 py-1.5 font-mono">{d.codigo_divisao || '-'}</td>
                          <td className="px-2 py-1.5">{d.descricao_divisao || '-'}</td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {Number(d.percentual_ajuste).toFixed(5)}
                          </td>
                          <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              disabled={divisaoDeleteLoading === d.id}
                              onClick={() => handleDeleteDivisao(d)}
                            >
                              {divisaoDeleteLoading === d.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Trash2 className="h-3 w-3" />}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Registros: {divisoesItems.length}</span>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openNovaDivisao}>
                  <Plus className="h-3.5 w-3.5" />
                  Nova divisão
                </Button>
              </div>
            </div>
          )}

          {/* ── Aba Dados da divisão ── */}
          {divisoesTab === 'dados' && (
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-right">Divisão</label>
                <Select
                  value={divisaoFormDivisaoId}
                  onValueChange={setDivisaoFormDivisaoId}
                  disabled={!!divisaoEditando}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {divisoes.map((d) => (
                      <SelectItem key={d.divisao_id} value={String(d.divisao_id)}>
                        {d.descricao_divisao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-right">Percentual Ajuste</label>
                <Input
                  className="h-8 text-sm"
                  type="number"
                  step="0.00001"
                  min="0"
                  value={divisaoFormPercentual}
                  onChange={(e) => setDivisaoFormPercentual(e.target.value)}
                  placeholder="0.00000"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {divisoesTab === 'dados' ? (
              <>
                <Button variant="outline" onClick={() => { resetDivisaoForm(); setDivisoesTab('pesquisa'); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveDivisao} disabled={divisaoFormLoading}>
                  {divisaoFormLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {divisaoEditando ? 'Atualizar' : 'Adicionar'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setDivisoesOpen(false)}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
