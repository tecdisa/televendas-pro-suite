import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Tag, Plus, Pencil, Trash2, Loader2, List, ArrowLeft, Save, Undo2, X, Copy, Percent, Layers, FileSpreadsheet, Upload, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { tabelasPrecoService, TabelaPreco, TabelaPrecoItem, TabelaPrecoDivisao, TabelaPrecoEscala } from '@/services/tabelasPrecoService';
import { metadataService, FormaPagamento, PrazoPagto } from '@/services/metadataService';
import { type Product } from '@/services/productsService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';
import { ProductSearchDialog } from '@/components/televendas/overlays/ProductSearchDialog';

const PAGE_LIMIT = 100;

// ─── Excel Export / Import ────────────────────────────────────────────────────

interface ExportColDef {
  header: string;
  field: keyof TabelaPrecoItem;
  type: 'number' | 'string' | 'boolean';
  editable: boolean;
  digits?: number;
}

const EXPORT_COLS: ExportColDef[] = [
  { header: 'produto_id',        field: 'produto_id',             type: 'number',  editable: false },
  { header: 'Produto',           field: 'codigo_produto',         type: 'string',  editable: false },
  { header: 'Descrição',         field: 'descricao_produto',      type: 'string',  editable: false },
  { header: 'Apres.',            field: 'apresentacao',           type: 'string',  editable: false },
  { header: 'UN',                field: 'un',                     type: 'string',  editable: false },
  { header: 'Custo',             field: 'custo',                  type: 'number',  editable: false, digits: 4 },
  { header: '%Markup',           field: 'markup',                 type: 'number',  editable: true,  digits: 2 },
  { header: '%Despesa',          field: 'despesa',                type: 'number',  editable: true,  digits: 2 },
  { header: '%Lucro',            field: 'lucro',                  type: 'number',  editable: true,  digits: 2 },
  { header: '%Comissão',         field: 'comissao',               type: 'number',  editable: true,  digits: 2 },
  { header: '%Frete',            field: 'frete',                  type: 'number',  editable: true,  digits: 2 },
  { header: '%Major.',           field: 'majoracao',              type: 'number',  editable: true,  digits: 2 },
  { header: 'Preço Venda',       field: 'preco',                  type: 'number',  editable: true,  digits: 2 },
  { header: '%DescMáx',          field: 'desconto_maximo',        type: 'number',  editable: true,  digits: 2 },
  { header: 'Prom.',             field: 'produto_em_promocao',    type: 'boolean', editable: true },
  { header: 'Qtd.Mín.',          field: 'quantidade_minima',      type: 'number',  editable: true,  digits: 0 },
  { header: 'Bon.',              field: 'permite_bonificacao',    type: 'boolean', editable: true },
  { header: 'Déb/Cr.',           field: 'permite_debito_credito', type: 'boolean', editable: true },
  { header: 'Vd.Esp.',           field: 'permite_venda_especial', type: 'boolean', editable: true },
  { header: 'Estoque',           field: 'estoque',                type: 'number',  editable: false, digits: 0 },
  { header: 'Divisão',           field: 'divisao',                type: 'string',  editable: false },
  { header: 'Fornecedor',        field: 'fornecedor',             type: 'string',  editable: false },
  { header: 'EAN13',             field: 'ean13',                  type: 'string',  editable: false },
  { header: 'Cód.Fábrica',       field: 'codigo_fabrica',         type: 'string',  editable: false },
  { header: 'Marca',             field: 'marca',                  type: 'string',  editable: false },
  { header: 'Múlt.Venda',        field: 'multiplo_de_vendas',     type: 'number',  editable: false, digits: 0 },
  { header: 'Pr.Nac.Cons.',      field: 'preco_nacional_consumidor', type: 'number', editable: false, digits: 2 },
  { header: 'Princ.Ativo',       field: 'principio_ativo',        type: 'string',  editable: false },
];

function xlsxBool(v: boolean): string {
  return v ? 'S' : 'N';
}

function parseXlsxBool(v: unknown): boolean | null {
  if (v === null || v === undefined || v === '') return false;
  const s = String(v).trim().toUpperCase();
  if (['S', 'SIM', 'TRUE', '1', 'X', 'Y', 'YES'].includes(s)) return true;
  if (['N', 'NÃO', 'NAO', 'FALSE', '0', ''].includes(s)) return false;
  return null; // invalid
}

interface ImportPreviewRow {
  xlsxLine: number;
  produtoId: number;
  codigoProduto: string;
  descricao: string;
  status: 'ok' | 'warning' | 'error';
  diffLines: string[];
  errors: string[];
  warnings: string[];
}

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

  // Escala dialog
  const [escalaOpen, setEscalaOpen] = useState(false);
  const [escalaItem, setEscalaItem] = useState<TabelaPrecoItem | null>(null);
  const [escalaRows, setEscalaRows] = useState<TabelaPrecoEscala[]>([]);
  const [escalaLoading, setEscalaLoading] = useState(false);
  const [escalaFormQtd, setEscalaFormQtd] = useState('');
  const [escalaFormDesc, setEscalaFormDesc] = useState('');
  const [escalaFormComissao, setEscalaFormComissao] = useState('');
  const [escalaEditando, setEscalaEditando] = useState<TabelaPrecoEscala | null>(null);
  const [escalaFormLoading, setEscalaFormLoading] = useState(false);
  const [escalaDeleteLoading, setEscalaDeleteLoading] = useState<number | null>(null);

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

  // ── Excel import/export ─────────────────────────────────────────────────
  const [xlsxExporting, setXlsxExporting] = useState(false);
  const [xlsxPreviewOpen, setXlsxPreviewOpen] = useState(false);
  const [xlsxPreviewRows, setXlsxPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [xlsxImporting, setXlsxImporting] = useState(false);
  const [xlsxParsedChanges, setXlsxParsedChanges] = useState<Record<number, PendingChange>>({});
  const xlsxFileRef = useRef<HTMLInputElement>(null);

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

  // ── Escala ──────────────────────────────────────────────────────────────
  const openEscala = async (item: TabelaPrecoItem) => {
    if (!itensTabela) return;
    setEscalaItem(item);
    setEscalaRows([]);
    setEscalaEditando(null);
    setEscalaFormQtd('');
    setEscalaFormDesc('');
    setEscalaFormComissao('');
    setEscalaOpen(true);
    setEscalaLoading(true);
    try {
      const rows = await tabelasPrecoService.listEscala(itensTabela.tabela_preco_id, item.produto_id);
      setEscalaRows(rows);
    } catch (e: any) { toast.error(e?.message || 'Erro ao carregar escala'); }
    finally { setEscalaLoading(false); }
  };

  const resetEscalaForm = () => {
    setEscalaEditando(null);
    setEscalaFormQtd('');
    setEscalaFormDesc('');
    setEscalaFormComissao('');
  };

  const handleSaveEscala = async () => {
    if (!itensTabela || !escalaItem) return;
    const qtd = parseFloat(escalaFormQtd.replace(',', '.'));
    if (isNaN(qtd) || qtd <= 0) { toast.error('Quantidade inválida'); return; }
    const desc = parseFloat(escalaFormDesc.replace(',', '.') || '0');
    const com = parseFloat(escalaFormComissao.replace(',', '.') || '0');
    if (isNaN(desc) || isNaN(com)) { toast.error('Desconto ou comissão inválidos'); return; }
    setEscalaFormLoading(true);
    try {
      if (escalaEditando) {
        const updated = await tabelasPrecoService.updateEscala(
          itensTabela.tabela_preco_id, escalaItem.produto_id, escalaEditando.id,
          { quantidade: qtd, desconto: desc, comissao: com },
        );
        setEscalaRows((prev) => prev.map((r) => r.id === updated.id ? updated : r));
        toast.success('Escala atualizada');
      } else {
        const created = await tabelasPrecoService.createEscala(
          itensTabela.tabela_preco_id, escalaItem.produto_id,
          { quantidade: qtd, desconto: desc, comissao: com },
        );
        setEscalaRows((prev) => [...prev, created].sort((a, b) => a.quantidade - b.quantidade));
        toast.success('Escala adicionada');
      }
      resetEscalaForm();
    } catch (e: any) { toast.error(e?.message || 'Erro ao salvar escala'); }
    finally { setEscalaFormLoading(false); }
  };

  const handleDeleteEscala = async (row: TabelaPrecoEscala) => {
    if (!itensTabela || !escalaItem) return;
    if (!confirm(`Excluir escala de quantidade ${row.quantidade}?`)) return;
    setEscalaDeleteLoading(row.id);
    try {
      await tabelasPrecoService.deleteEscala(itensTabela.tabela_preco_id, escalaItem.produto_id, row.id);
      setEscalaRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success('Escala excluída');
    } catch (e: any) { toast.error(e?.message || 'Erro ao excluir escala'); }
    finally { setEscalaDeleteLoading(null); }
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

  // ── Excel Export ────────────────────────────────────────────────────────
  function buildAndDownloadXlsx(toExport: TabelaPrecoItem[]) {
    const header = EXPORT_COLS.map((c) => c.header);
    const rows = toExport.map((item) =>
      EXPORT_COLS.map((col) => {
        const raw = item[col.field];
        if (col.type === 'boolean') return xlsxBool(raw as boolean);
        if (col.type === 'number') {
          const n = raw == null ? 0 : Number(raw);
          return col.digits === 0 ? Math.round(n) : n;
        }
        return raw ?? '';
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    EXPORT_COLS.forEach((col, ci) => {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: ci })];
      if (cell) {
        cell.s = col.editable
          ? { fill: { fgColor: { rgb: 'C6EFCE' } }, font: { bold: true } }
          : { fill: { fgColor: { rgb: 'F2F2F2' } }, font: { bold: true } };
      }
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens');
    const label = itensTabela
      ? `${itensTabela.codigo_tabela_preco}_itens`
      : 'tabela_itens';
    XLSX.writeFile(wb, `${label}.xlsx`);
  }

  async function handleExportExcel() {
    if (xlsxExporting) return;

    // Com seleção: exporta apenas os selecionados (já estão em memória)
    if (selectedRows.size > 0) {
      buildAndDownloadXlsx(itens.filter((i) => selectedRows.has(i.produto_id)));
      return;
    }

    // Sem seleção: busca TODOS os itens ignorando paginação
    if (!itensTabela) return;
    setXlsxExporting(true);
    try {
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
      const result = await tabelasPrecoService.getItens(
        itensTabela.tabela_preco_id,
        itensSearchRef.current,
        1,
        99999,
        filters,
      );
      buildAndDownloadXlsx(result.data);
      toast.success(`${result.data.length} item(s) exportados`);
    } catch {
      toast.error('Erro ao exportar para Excel');
    } finally {
      setXlsxExporting(false);
    }
  }

  // ── Excel Import ─────────────────────────────────────────────────────────
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset input so same file can be re-imported
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Find header row by locating 'produto_id' cell
        let headerRowIdx = -1;
        let headerMap: Record<string, number> = {};
        for (let ri = 0; ri < Math.min(aoa.length, 10); ri++) {
          const row = aoa[ri] as unknown[];
          const pidIdx = row.findIndex((c) => String(c).trim().toLowerCase() === 'produto_id');
          if (pidIdx >= 0) {
            headerRowIdx = ri;
            row.forEach((c, ci) => { headerMap[String(c).trim()] = ci; });
            break;
          }
        }

        if (headerRowIdx < 0) {
          toast.error('Planilha inválida: coluna "produto_id" não encontrada.');
          return;
        }

        const itensMap = new Map(itens.map((i) => [i.produto_id, i]));
        const previewRows: ImportPreviewRow[] = [];
        const parsedChanges: Record<number, PendingChange> = {};

        for (let ri = headerRowIdx + 1; ri < aoa.length; ri++) {
          const row = aoa[ri] as unknown[];
          const rawId = row[headerMap['produto_id']];
          if (rawId === '' || rawId === null || rawId === undefined) continue;
          const produtoId = Number(rawId);
          if (isNaN(produtoId) || produtoId <= 0) continue;

          const xlsxLine = ri + 1;
          const codigoProduto = String(row[headerMap['Produto']] ?? '');
          const descricao = String(row[headerMap['Descrição']] ?? '');
          const errors: string[] = [];
          const warnings: string[] = [];
          const diffLines: string[] = [];
          const change: PendingChange = {};

          const currentItem = itensMap.get(produtoId);
          if (!currentItem) {
            warnings.push(`Produto ID ${produtoId} não está carregado nos itens atuais`);
          }

          // Parse editable numeric fields
          const numericEditableFields: Array<{ header: string; field: keyof PendingChange; digits: number }> = [
            { header: '%Markup',     field: 'markup',          digits: 2 },
            { header: '%Despesa',    field: 'despesa',         digits: 2 },
            { header: '%Lucro',      field: 'lucro',           digits: 2 },
            { header: '%Comissão',   field: 'comissao',        digits: 2 },
            { header: '%Frete',      field: 'frete',           digits: 2 },
            { header: '%Major.',     field: 'majoracao',       digits: 2 },
            { header: 'Preço Venda', field: 'preco',           digits: 2 },
            { header: '%DescMáx',    field: 'desconto_maximo', digits: 2 },
            { header: 'Qtd.Mín.',    field: 'quantidade_minima', digits: 0 },
          ];
          for (const { header, field, digits } of numericEditableFields) {
            const idx = headerMap[header];
            if (idx === undefined) continue;
            const raw = row[idx];
            if (raw === '' || raw === null || raw === undefined) continue;
            const num = parseFloat(String(raw).replace(',', '.'));
            if (isNaN(num)) {
              errors.push(`${header}: valor inválido "${raw}"`);
            } else {
              const rounded = digits === 0 ? Math.round(num) : parseFloat(num.toFixed(digits));
              (change as any)[field] = rounded;
              if (currentItem) {
                const cur = Number((currentItem as any)[field]);
                if (Math.abs(cur - rounded) > 0.001) {
                  diffLines.push(`${header}: ${cur.toFixed(digits)} → ${rounded.toFixed(digits)}`);
                }
              }
            }
          }

          // Parse editable boolean fields
          const boolEditableFields: Array<{ header: string; field: keyof PendingChange }> = [
            { header: 'Prom.',    field: 'produto_em_promocao' },
            { header: 'Bon.',     field: 'permite_bonificacao' },
            { header: 'Déb/Cr.', field: 'permite_debito_credito' },
            { header: 'Vd.Esp.', field: 'permite_venda_especial' },
          ];
          for (const { header, field } of boolEditableFields) {
            const idx = headerMap[header];
            if (idx === undefined) continue;
            const raw = row[idx];
            if (raw === '' || raw === null || raw === undefined) continue;
            const b = parseXlsxBool(raw);
            if (b === null) {
              errors.push(`${header}: valor inválido "${raw}" (use S ou N)`);
            } else {
              (change as any)[field] = b;
              if (currentItem) {
                const cur = Boolean((currentItem as any)[field]);
                if (cur !== b) {
                  diffLines.push(`${header}: ${xlsxBool(cur)} → ${xlsxBool(b)}`);
                }
              }
            }
          }

          const hasChanges = Object.keys(change).length > 0;
          if (hasChanges) parsedChanges[produtoId] = change;

          const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok';
          previewRows.push({ xlsxLine, produtoId, codigoProduto, descricao, status, diffLines, errors, warnings });
        }

        setXlsxParsedChanges(parsedChanges);
        setXlsxPreviewRows(previewRows);
        setXlsxPreviewOpen(true);
      } catch (err) {
        toast.error('Erro ao ler planilha Excel.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleConfirmImport() {
    setXlsxImporting(true);
    try {
      const tabelaId = itensTabela!.tabela_preco_id;
      const entries = Object.entries(xlsxParsedChanges);
      let saved = 0;
      for (const [pidStr, change] of entries) {
        const produtoId = Number(pidStr);
        const current = itens.find((i) => i.produto_id === produtoId);
        if (!current) continue;
        const merged = { ...current, ...change };
        await tabelasPrecoService.updateItem(tabelaId, produtoId, {
          preco: merged.preco,
          desconto_maximo: merged.desconto_maximo,
          comissao: merged.comissao,
          quantidade_minima: merged.quantidade_minima,
          pvs: merged.pvs,
          markup: merged.markup,
          despesa: merged.despesa,
          lucro: merged.lucro,
          frete: merged.frete,
          majoracao: merged.majoracao,
          permite_bonificacao: merged.permite_bonificacao,
          permite_debito_credito: merged.permite_debito_credito,
          permite_venda_especial: merged.permite_venda_especial,
          produto_em_promocao: merged.produto_em_promocao,
        });
        saved++;
      }
      toast.success(`${saved} item(s) atualizados com sucesso.`);
      setXlsxPreviewOpen(false);
      setXlsxParsedChanges({});
      setXlsxPreviewRows([]);
      // Reload items
      setItensPage(1);
      setItens([]);
      setItensHasMore(true);
    } catch (err) {
      toast.error('Erro ao salvar itens importados.');
      console.error(err);
    } finally {
      setXlsxImporting(false);
    }
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
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleExportExcel} disabled={xlsxExporting || itens.length === 0}>
              {xlsxExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
              {selectedRows.size > 0 ? `Excel (${selectedRows.size} sel.)` : 'Excel (todos)'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => xlsxFileRef.current?.click()} disabled={itens.length === 0}>
              <Upload className="h-3.5 w-3.5" />
              Importar
            </Button>
            <input
              ref={xlsxFileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />
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
            <table className="w-full text-xs border-collapse" style={{ minWidth: 1700 }}>
              <thead className="sticky top-0 z-20 bg-muted/90">
                <tr className="border-b">
                  <th className="sticky left-0 z-30 w-7 px-1 py-1.5 text-center bg-muted/90">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="sticky left-7 z-30 w-16 px-1 py-1.5 text-left bg-muted/90">Prod.</th>
                  <th className="sticky left-[92px] z-30 w-[260px] pl-1 pr-4 py-1.5 text-left bg-muted/90 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border">Descrição</th>
                  <th className="w-16 px-1 py-1.5 text-left">Apres.</th>
                  <th className="w-10 px-1 py-1.5 text-left">UN</th>
                  <th className="w-16 pl-12 pr-1 py-1.5 text-right">Custo</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Markup</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Despesa</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Lucro</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Comissão</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Frete</th>
                  <th className="w-14 px-1 py-1.5 text-right">%Major.</th>
                  <th className="w-20 px-1 py-1.5 text-right">Preço Venda</th>
                  <th className="w-14 px-1 py-1.5 text-right">%DescMáx</th>
                  <th className="w-10 px-1 py-1.5 text-center">Prom.</th>
                  <th className="w-14 px-1 py-1.5 text-right">Qtd.Mín.</th>
                  <th className="w-10 px-1 py-1.5 text-center" title="Permite Bonificação">Bon.</th>
                  <th className="w-10 px-1 py-1.5 text-center" title="Permite Débito/Crédito">Déb/Cr.</th>
                  <th className="w-10 px-1 py-1.5 text-center" title="Permite Venda Especial">Vd.Esp.</th>
                  <th className="w-20 px-1 py-1.5 text-right">Estoque</th>
                  <th className="w-32 px-1 py-1.5 text-left">Divisão</th>
                  <th className="w-36 px-1 py-1.5 text-left">Fornecedor</th>
                  <th className="w-24 px-1 py-1.5 text-left">EAN13</th>
                  <th className="w-24 px-1 py-1.5 text-left">Cód.Fábrica</th>
                  <th className="w-28 px-1 py-1.5 text-left">Marca</th>
                  <th className="w-20 px-1 py-1.5 text-right">Múlt.Venda</th>
                  <th className="w-28 px-1 py-1.5 text-right">Pr.Nac.Cons.</th>
                  <th className="w-32 px-1 py-1.5 text-left">Princ.Ativo</th>
                  <th className="w-8 px-1 py-1.5 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {isItensLoading ? (
                  <tr><td colSpan={29} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td></tr>
                ) : visibleItens.length === 0 ? (
                  <tr><td colSpan={29} className="text-center py-10 text-muted-foreground">
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
                    const stickyBg = isSelected
                      ? 'bg-primary/5'
                      : hasPendingRow
                        ? 'bg-amber-50/50 dark:bg-amber-950/20'
                        : 'bg-background group-hover:bg-muted/30';

                    return (
                      <tr
                        key={item.produto_id}
                        className={`group border-b transition-colors
                          ${isSelected ? 'bg-primary/5' : hasPendingRow ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-muted/30'}
                          ${item.produto_inativo ? 'opacity-50' : ''}`}
                      >
                        <td className={`sticky left-0 z-10 px-1 py-0.5 text-center ${stickyBg}`}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(item.produto_id)} />
                        </td>
                        <td className={`sticky left-7 z-10 px-1 py-0.5 font-mono text-[11px] ${stickyBg}`}>{item.codigo_produto}</td>
                        <td className={`sticky left-[92px] z-10 pl-1 pr-4 py-0.5 w-[260px] max-w-[260px] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border ${stickyBg}`}>
                          <span className="block truncate" title={item.descricao_produto}>{item.descricao_produto}</span>
                        </td>
                        <td className="px-1 py-0.5 text-muted-foreground">{item.apresentacao || '-'}</td>
                        <td className="px-1 py-0.5 text-muted-foreground">{item.un || '-'}</td>
                        <td className="pl-12 pr-1 py-0.5 text-right text-muted-foreground">{fmt(item.custo)}</td>
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
                        <td className="px-1 py-0.5 text-right font-medium">
                          <EditableCell value={item.preco} field="preco" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-right">
                          <EditableCell value={item.desconto_maximo} field="desconto_maximo" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          <Checkbox checked={promValue} onCheckedChange={(c) => commitBool(item.produto_id, 'produto_em_promocao', c === true)} />
                        </td>
                        <td className="px-1 py-0.5 text-right">
                          <EditableCell value={item.quantidade_minima} field="quantidade_minima" produtoId={item.produto_id} pending={pending} onCommit={commitCell} />
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          <Checkbox
                            checked={pending && 'permite_bonificacao' in pending ? Boolean(pending.permite_bonificacao) : item.permite_bonificacao}
                            onCheckedChange={(c) => commitBool(item.produto_id, 'permite_bonificacao', c === true)}
                          />
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          <Checkbox
                            checked={pending && 'permite_debito_credito' in pending ? Boolean(pending.permite_debito_credito) : item.permite_debito_credito}
                            onCheckedChange={(c) => commitBool(item.produto_id, 'permite_debito_credito', c === true)}
                          />
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          <Checkbox
                            checked={pending && 'permite_venda_especial' in pending ? Boolean(pending.permite_venda_especial) : item.permite_venda_especial}
                            onCheckedChange={(c) => commitBool(item.produto_id, 'permite_venda_especial', c === true)}
                          />
                        </td>
                        <td className="px-1 py-0.5 text-right text-muted-foreground">{fmt(item.estoque, 3)}</td>
                        <td className="px-1 py-0.5 text-muted-foreground truncate max-w-[128px]" title={item.divisao}>{item.divisao || '-'}</td>
                        <td className="px-1 py-0.5 text-muted-foreground truncate max-w-[144px]" title={item.fornecedor}>{item.fornecedor || '-'}</td>
                        <td className="px-1 py-0.5 font-mono text-[11px]">{item.ean13 || '-'}</td>
                        <td className="px-1 py-0.5 font-mono text-[11px]">{item.codigo_fabrica || '-'}</td>
                        <td className="px-1 py-0.5 text-muted-foreground truncate max-w-[112px]" title={item.marca}>{item.marca || '-'}</td>
                        <td className="px-1 py-0.5 text-right text-muted-foreground">{item.multiplo_de_vendas != null ? fmt(item.multiplo_de_vendas, 3) : '-'}</td>
                        <td className="px-1 py-0.5 text-right text-muted-foreground">{item.preco_nacional_consumidor != null ? fmt(item.preco_nacional_consumidor) : '-'}</td>
                        <td className="px-1 py-0.5 text-muted-foreground truncate max-w-[128px]" title={item.principio_ativo ?? ''}>{item.principio_ativo || '-'}</td>
                        <td className="px-1 py-0.5 text-center">
                          <div className="flex items-center gap-0.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6"
                                    onClick={() => openEscala(item)}>
                                    <Layers className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Escalonado</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                {itensLoading && itens.length > 0 && (
                  <tr><td colSpan={29} className="text-center py-3 text-muted-foreground">
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

        {/* Escala dialog */}
        <Dialog open={escalaOpen} onOpenChange={(v) => { setEscalaOpen(v); if (!v) resetEscalaForm(); }}>
          <DialogContent className="w-[95vw] max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Escalonado — {escalaItem?.codigo_produto} · {escalaItem?.descricao_produto}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Tabela de escalas */}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/80">
                    <tr>
                      <th className="px-3 py-2 text-right">Quantidade</th>
                      <th className="px-3 py-2 text-right">% Desconto</th>
                      <th className="px-3 py-2 text-right">% Comissão</th>
                      <th className="w-16 px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {escalaLoading ? (
                      <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </td></tr>
                    ) : escalaRows.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">
                        Nenhuma escala cadastrada
                      </td></tr>
                    ) : escalaRows.map((row) => (
                      <tr key={row.id} className={`border-t ${escalaEditando?.id === row.id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                        <td className="px-3 py-1.5 text-right font-mono">{row.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
                        <td className="px-3 py-1.5 text-right">{row.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                        <td className="px-3 py-1.5 text-right">{row.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-6 w-6"
                              onClick={() => { setEscalaEditando(row); setEscalaFormQtd(String(row.quantidade)); setEscalaFormDesc(String(row.desconto)); setEscalaFormComissao(String(row.comissao)); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                              onClick={() => handleDeleteEscala(row)}
                              disabled={escalaDeleteLoading === row.id}>
                              {escalaDeleteLoading === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Formulário */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {escalaEditando ? 'Editar escala' : 'Adicionar escala'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Quantidade</label>
                    <Input className="h-8 text-sm mt-1" placeholder="0" value={escalaFormQtd}
                      onChange={(e) => setEscalaFormQtd(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">% Desconto</label>
                    <Input className="h-8 text-sm mt-1" placeholder="0,00" value={escalaFormDesc}
                      onChange={(e) => setEscalaFormDesc(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">% Comissão</label>
                    <Input className="h-8 text-sm mt-1" placeholder="0,00" value={escalaFormComissao}
                      onChange={(e) => setEscalaFormComissao(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 mt-2 justify-end">
                  {escalaEditando && (
                    <Button variant="ghost" size="sm" onClick={resetEscalaForm}>Cancelar</Button>
                  )}
                  <Button size="sm" onClick={handleSaveEscala} disabled={escalaFormLoading}>
                    {escalaFormLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    {escalaEditando ? 'Salvar' : 'Adicionar'}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEscalaOpen(false)}>Fechar</Button>
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

        {/* Excel Import Preview Dialog */}
        <Dialog open={xlsxPreviewOpen} onOpenChange={setXlsxPreviewOpen}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Pré-visualização da Importação</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto text-xs">
              {xlsxPreviewRows.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center">Nenhuma linha encontrada na planilha.</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr>
                      <th className="border px-2 py-1 text-left font-medium">#Linha</th>
                      <th className="border px-2 py-1 text-left font-medium">Status</th>
                      <th className="border px-2 py-1 text-left font-medium">Produto</th>
                      <th className="border px-2 py-1 text-left font-medium">Descrição</th>
                      <th className="border px-2 py-1 text-left font-medium">Alterações / Erros / Avisos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xlsxPreviewRows.map((row) => (
                      <tr key={row.xlsxLine} className={
                        row.status === 'error' ? 'bg-red-50' :
                        row.status === 'warning' ? 'bg-yellow-50' : ''
                      }>
                        <td className="border px-2 py-1 text-muted-foreground">{row.xlsxLine}</td>
                        <td className="border px-2 py-1">
                          {row.status === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          {row.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                          {row.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                        </td>
                        <td className="border px-2 py-1 font-mono">{row.codigoProduto}</td>
                        <td className="border px-2 py-1 max-w-[200px] truncate" title={row.descricao}>{row.descricao}</td>
                        <td className="border px-2 py-1">
                          {row.errors.length > 0 && (
                            <div className="text-red-700">
                              {row.errors.map((e, i) => <div key={i}>❌ {e}</div>)}
                            </div>
                          )}
                          {row.warnings.length > 0 && (
                            <div className="text-yellow-700">
                              {row.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                            </div>
                          )}
                          {row.diffLines.length > 0 && (
                            <div className="text-foreground space-y-0.5">
                              {row.diffLines.map((d, i) => <div key={i} className="font-mono">{d}</div>)}
                            </div>
                          )}
                          {row.errors.length === 0 && row.warnings.length === 0 && row.diffLines.length === 0 && (
                            <span className="text-muted-foreground italic">Sem alterações</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground space-x-3">
                <span className="text-green-700">✅ {xlsxPreviewRows.filter(r => r.status === 'ok').length} ok</span>
                <span className="text-yellow-700">⚠️ {xlsxPreviewRows.filter(r => r.status === 'warning').length} aviso(s)</span>
                <span className="text-red-700">❌ {xlsxPreviewRows.filter(r => r.status === 'error').length} erro(s)</span>
                <span>{Object.keys(xlsxParsedChanges).length} item(s) com alterações</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setXlsxPreviewOpen(false)} disabled={xlsxImporting}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmImport}
                  disabled={
                    xlsxImporting ||
                    xlsxPreviewRows.some(r => r.status === 'error') ||
                    Object.keys(xlsxParsedChanges).length === 0
                  }
                >
                  {xlsxImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Importar ({Object.keys(xlsxParsedChanges).length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
