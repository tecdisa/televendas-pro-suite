import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Plus, Pencil, Trash2, Loader2, ChevronUp, ChevronDown, Package, Columns3, FileSpreadsheet, Upload, Eye, DollarSign, SlidersHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import {
  Product,
  ProductCadastroFilters,
  ProductCadastroInput,
  ProductKitItem,
  productsService,
} from '@/services/productsService';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { tabelasPrecoService } from '@/services/tabelasPrecoService';
import { cn } from '@/lib/utils';
import { ProdutoInfoModal } from '@/components/televendas/overlays/ProdutoInfoModal';
import { ProdutoAlterarPrecoModal } from '@/components/televendas/overlays/ProdutoAlterarPrecoModal';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

const UNIDADES = ['UN', 'CX', 'PC', 'KG', 'LT', 'DP', 'FR', 'TB', 'CT'];
const PRODUTOS_PINNED_COLUMNS_STORAGE_KEY = 'televendas:produtos:pinnedColumns';
const PRODUTOS_FIX_ACTIONS_STORAGE_KEY = 'televendas:produtos:fixActions';

const PRODUCTS_GRID_COLUMNS = [
  { key: 'codigoProduto', label: 'Código', width: 132, pinnable: true },
  { key: 'descricao', label: 'Descrição', width: 320, pinnable: true },
  { key: 'apresentacao', label: 'Apresentação', width: 180, pinnable: true },
  { key: 'un', label: 'UN', width: 72, pinnable: true },
  { key: 'marca', label: 'Marca', width: 140, pinnable: true },
  { key: 'codigoFabrica', label: 'Código fábrica', width: 156, pinnable: true },
  { key: 'ean13', label: 'EAN13', width: 156, pinnable: true },
  { key: 'dun14', label: 'DUN14', width: 156, pinnable: true },
  { key: 'fornecedorId', label: 'ID fornecedor', width: 130, pinnable: true },
  { key: 'fornecedor', label: 'Fornecedor', width: 260, pinnable: true },
  { key: 'divisaoId', label: 'ID divisão', width: 118, pinnable: true },
  { key: 'divisao', label: 'Divisão', width: 220, pinnable: true },
  { key: 'pesoBruto', label: 'Peso bruto', width: 130, pinnable: true },
  { key: 'pesoLiquido', label: 'Peso líquido', width: 130, pinnable: true },
  { key: 'controlaLote', label: 'Controla lote', width: 126, pinnable: true },
  { key: 'permiteVendaB2b', label: 'Permite B2B', width: 120, pinnable: true },
  { key: 'permiteVendaB2c', label: 'Permite B2C', width: 120, pinnable: true },
  { key: 'possuiFoto', label: 'Possui foto', width: 112, pinnable: true },
  { key: 'principioAtivo', label: 'Princípio ativo', width: 220, pinnable: true },
  {
    key: 'precoNacionalConsumidor',
    label: 'Preço nac. consumidor',
    width: 190,
    pinnable: true,
  },
  { key: 'precoFabrica', label: 'Preço fábrica', width: 146, pinnable: true },
  {
    key: 'descricaoComplementar',
    label: 'Descrição complementar',
    width: 300,
    pinnable: true,
  },
  { key: 'codigoSiteB2c', label: 'Código site B2C', width: 210, pinnable: true },
  { key: 'lancamento', label: 'Lançamento', width: 112, pinnable: true },
  { key: 'inativo', label: 'Inativo', width: 90, pinnable: true },
  { key: 'acoes', label: 'Ações', width: 144, pinnable: false },
] as const;

type ProductsGridColumnKey = (typeof PRODUCTS_GRID_COLUMNS)[number]['key'];
const PINNABLE_PRODUCT_COLUMNS = PRODUCTS_GRID_COLUMNS.filter(
  (column) => column.pinnable,
);

type StatusType = 'ativos' | 'inativos' | 'todos';
type RequiredProductField =
  | 'descricao'
  | 'unidade'
  | 'fornecedorId'
  | 'divisaoId'
  | 'fatorCompra'
  | 'fatorVenda';
type RequiredProductErrors = Partial<Record<RequiredProductField, string>>;

interface ProductFormState {
  id: number;
  codigoProduto: string;
  descricao: string;
  unidade: string;
  tipoItem: string;
  codigoFabrica: string;
  ean13: string;
  dun14: string;
  apresentacao: string;
  marca: string;
  fornecedorId: number;
  divisaoId: number;
  produtoSimilar: number;
  fatorCompra: number;
  fatorVenda: number;
  multiploDeVendas: number;
  pesoBruto: number;
  pesoLiquido: number;
  controlaLote: boolean;
  permiteVendaB2b: boolean;
  permiteVendaB2c: boolean;
  possuiFoto: boolean;
  principioAtivo: string;
  precoNacionalConsumidor: number;
  precoFabrica: number;
  descricaoComplementar: string;
  codigoSiteB2c: string;
  ncm: string;
  cest: string;
  mensagemNotaFiscal: string;
  regMs: string;
  origemProduto: string;
  validade: string;
  estoque: number;
  quantidadeReservada: number;
  custoMedio: number;
  custoNota: number;
  custoCompra: number;
  codigoSituacaoIcms: string;
  cst: string;
  csosn: string;
  aliquotaIcms: number;
  aliquotaIcmsCredito: number;
  pfcp: number;
  pautaIcms: number;
  reducaoSt: number;
  reducaoConvenio: number;
  repasseIcms: boolean;
  cstPis: string;
  cstCofins: string;
  aliquotaPis: number;
  aliquotaCofins: number;
  ibsCbs: string;
  ibsCbsClassifTrib: string;
  lancamento: boolean;
  inativo: boolean;
}

interface ProductKitFormItem {
  produtoItemId: number;
  codigoProduto: string;
  descricao: string;
  un: string;
  quantidade: number;
  inativo?: boolean;
}

const initialFormData: ProductFormState = {
  id: 0,
  codigoProduto: '',
  descricao: '',
  unidade: 'UN',
  tipoItem: 'MERCADORIA_REVENDA',
  codigoFabrica: '',
  ean13: '',
  dun14: '',
  apresentacao: '',
  marca: '',
  fornecedorId: 0,
  divisaoId: 0,
  produtoSimilar: 0,
  fatorCompra: 1,
  fatorVenda: 1,
  multiploDeVendas: 1,
  pesoBruto: 0,
  pesoLiquido: 0,
  controlaLote: false,
  permiteVendaB2b: false,
  permiteVendaB2c: false,
  possuiFoto: false,
  principioAtivo: '',
  precoNacionalConsumidor: 0,
  precoFabrica: 0,
  descricaoComplementar: '',
  codigoSiteB2c: '',
  ncm: '',
  cest: '',
  mensagemNotaFiscal: '',
  regMs: '',
  origemProduto: '0',
  validade: '',
  estoque: 0,
  quantidadeReservada: 0,
  custoMedio: 0,
  custoNota: 0,
  custoCompra: 0,
  codigoSituacaoIcms: '',
  cst: '',
  csosn: '',
  aliquotaIcms: 0,
  aliquotaIcmsCredito: 0,
  pfcp: 0,
  pautaIcms: 0,
  reducaoSt: 0,
  reducaoConvenio: 0,
  repasseIcms: false,
  cstPis: '',
  cstCofins: '',
  aliquotaPis: 0,
  aliquotaCofins: 0,
  ibsCbs: '',
  ibsCbsClassifTrib: '',
  lancamento: false,
  inativo: false,
};

function mapProductToForm(product: Product): ProductFormState {
  return {
    id: Number(product.id) || 0,
    codigoProduto: String(product.codigoProduto ?? '').trim(),
    descricao: String(product.descricao ?? '').trim(),
    unidade: String(product.un ?? 'UN').trim() || 'UN',
    tipoItem: String(product.tipoItem ?? 'MERCADORIA_REVENDA').trim() || 'MERCADORIA_REVENDA',
    codigoFabrica: String(product.codigoFabrica ?? '').trim(),
    ean13: onlyDigits(String(product.ean13 ?? '').trim(), 13),
    dun14: onlyDigits(String(product.dun14 ?? '').trim(), 14),
    apresentacao: String(product.apresentacao ?? '').trim(),
    marca: String(product.marca ?? '').trim(),
    fornecedorId: Number(product.fornecedorId ?? 0) || 0,
    divisaoId: Number(product.divisaoId ?? 0) || 0,
    produtoSimilar: Number(product.produtoSimilar ?? 0) || 0,
    fatorCompra: Number(product.fatorCompra ?? 0) || 0,
    fatorVenda: Number(product.fatorVenda ?? 0) || 0,
    multiploDeVendas: Number(product.multiploDeVendas ?? 0) || 0,
    pesoBruto: Number(product.pesoBruto ?? 0) || 0,
    pesoLiquido: Number(product.pesoLiquido ?? 0) || 0,
    controlaLote: Boolean(product.controlaLote ?? false),
    permiteVendaB2b: Boolean(product.permiteVendaB2b ?? false),
    permiteVendaB2c: Boolean(product.permiteVendaB2c ?? false),
    possuiFoto: Boolean(product.possuiFoto ?? false),
    principioAtivo: String(product.principioAtivo ?? '').trim(),
    precoNacionalConsumidor: Number(product.precoNacionalConsumidor ?? 0) || 0,
    precoFabrica: Number(product.precoFabrica ?? 0) || 0,
    descricaoComplementar: String(product.descricaoComplementar ?? '').trim(),
    codigoSiteB2c: String(product.codigoSiteB2c ?? '').trim(),
    ncm: String(product.ncm ?? '').trim(),
    cest: String(product.cest ?? '').trim(),
    mensagemNotaFiscal: String(product.mensagemNotaFiscal ?? '').trim(),
    regMs: String(product.regMs ?? '').trim(),
    origemProduto: String(product.origemProduto ?? '0').trim() || '0',
    validade: String(product.validade ?? '').trim(),
    estoque: Number(product.estoque ?? 0) || 0,
    quantidadeReservada: Number(product.quantidadeReservada ?? 0) || 0,
    custoMedio: Number(product.custoMedio ?? 0) || 0,
    custoNota: Number(product.custoNota ?? 0) || 0,
    custoCompra: Number(product.custoCompra ?? 0) || 0,
    codigoSituacaoIcms: String(product.codigoSituacaoIcms ?? '').trim(),
    cst: String(product.cst ?? '').trim(),
    csosn: String(product.csosn ?? '').trim(),
    aliquotaIcms: Number(product.aliquotaIcms ?? 0) || 0,
    aliquotaIcmsCredito: Number(product.aliquotaIcmsCredito ?? 0) || 0,
    pfcp: Number(product.pfcp ?? 0) || 0,
    pautaIcms: Number(product.pautaIcms ?? 0) || 0,
    reducaoSt: Number(product.reducaoSt ?? 0) || 0,
    reducaoConvenio: Number(product.reducaoConvenio ?? 0) || 0,
    repasseIcms: Boolean(product.repasseIcms ?? false),
    cstPis: String(product.cstPis ?? '').trim(),
    cstCofins: String(product.cstCofins ?? '').trim(),
    aliquotaPis: Number(product.aliquotaPis ?? 0) || 0,
    aliquotaCofins: Number(product.aliquotaCofins ?? 0) || 0,
    ibsCbs: String(product.ibsCbs ?? '').trim(),
    ibsCbsClassifTrib: String(product.ibsCbsClassifTrib ?? '').trim(),
    lancamento: Boolean(product.lancamento ?? false),
    inativo: Boolean(product.inativo ?? false),
  };
}

function mapProductKitToFormItems(product?: Product | null): ProductKitFormItem[] {
  return (product?.kitItens ?? []).map((item: ProductKitItem) => ({
    produtoItemId: Number(item.produtoItemId ?? item.produtoId) || 0,
    codigoProduto: String(item.codigoProduto ?? '').trim(),
    descricao: String(item.descricao ?? '').trim(),
    un: String(item.un ?? 'UN').trim() || 'UN',
    quantidade: Number(item.quantidade ?? 0) || 0,
    inativo: Boolean(item.inativo ?? false),
  }));
}

const formatBooleanCell = (value?: boolean | null) => (value ? 'Sim' : 'Não');
const formatNullableInteger = (value?: number | null) =>
  value === null || value === undefined ? '-' : Number(value).toLocaleString('pt-BR');
const onlyDigits = (value: string | null | undefined, maxLength: number) =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .slice(0, maxLength);
const formatNullableDecimal = (value?: number | null, fractionDigits = 3) =>
  value === null || value === undefined
    ? '-'
    : Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      });
const formatNullableCurrency = (value?: number | null) =>
  value === null || value === undefined
    ? '-'
    : Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
const toFixedNumber = (value: number, decimals = 3) =>
  Number.isFinite(value) ? value.toFixed(decimals) : '0.000';

function mapFormToPayload(form: ProductFormState): ProductCadastroInput {
  const payload: ProductCadastroInput = {
    codigo_produto: form.codigoProduto.trim() || undefined,
    descricao_produto: form.descricao.trim(),
    unidade: form.unidade.trim().toUpperCase(),
    codigo_fabrica: form.codigoFabrica.trim() || null,
    ean13: onlyDigits(form.ean13, 13) || null,
    dun14: onlyDigits(form.dun14, 14) || null,
    apresentacao: form.apresentacao.trim() || null,
    marca: form.marca.trim() || null,
    fornecedor_id: Number(form.fornecedorId) || 0,
    divisao_id: Number(form.divisaoId) || 0,
    fator_compra: Number(form.fatorCompra) || 0,
    fator_venda: Number(form.fatorVenda) || 0,
    multiplo_de_vendas: Number(form.multiploDeVendas) || 0,
    peso_bruto: Number(form.pesoBruto) || 0,
    peso_liquido: Number(form.pesoLiquido) || 0,
    controla_lote: Boolean(form.controlaLote),
    permite_venda_b2b: Boolean(form.permiteVendaB2b),
    permite_venda_b2c: Boolean(form.permiteVendaB2c),
    possui_foto: Boolean(form.possuiFoto),
    principio_ativo: form.principioAtivo.trim() || null,
    preco_nacional_consumidor: Number(form.precoNacionalConsumidor) || 0,
    preco_fabrica: Number(form.precoFabrica) || 0,
    descricao_complementar: form.descricaoComplementar.trim() || null,
    codigo_site_b2c: form.codigoSiteB2c.trim() || null,
    ncm: form.ncm.trim() || null,
    cest: form.cest.trim() || null,
    tipo_item: form.tipoItem.trim() || null,
    produto_similar: Number(form.produtoSimilar) || 0,
    mensagem_nota_fiscal: form.mensagemNotaFiscal.trim() || null,
    reg_ms: form.regMs.trim() || null,
    origem_produto: form.origemProduto.trim() || null,
    validade: form.validade.trim() || null,
    estoque: Number(form.estoque) || 0,
    quantidade_reservada: Number(form.quantidadeReservada) || 0,
    custo_medio: Number(form.custoMedio) || 0,
    custo_nota: Number(form.custoNota) || 0,
    custo_compra: Number(form.custoCompra) || 0,
    codigo_situacao_icms: form.codigoSituacaoIcms.trim() || null,
    cst: form.cst.trim() || null,
    csosn: form.csosn.trim() || null,
    aliquota_icms: Number(form.aliquotaIcms) || 0,
    aliquota_icms_credito: Number(form.aliquotaIcmsCredito) || 0,
    pfcp: Number(form.pfcp) || 0,
    pauta_icms: Number(form.pautaIcms) || 0,
    reducao_st: Number(form.reducaoSt) || 0,
    reducao_convenio: Number(form.reducaoConvenio) || 0,
    repasse_icms: Boolean(form.repasseIcms),
    cst_pis: form.cstPis.trim() || null,
    cst_cofins: form.cstCofins.trim() || null,
    aliquota_pis: Number(form.aliquotaPis) || 0,
    aliquota_cofins: Number(form.aliquotaCofins) || 0,
    ibs_cbs: form.ibsCbs.trim() || null,
    ibs_cbs_classif_trib: form.ibsCbsClassifTrib.trim() || null,
    lancamento: Boolean(form.lancamento),
    inativo: Boolean(form.inativo),
  };
  return payload;
}

function validateRequiredProductFields(form: ProductFormState): RequiredProductErrors {
  const errors: RequiredProductErrors = {};

  if (!form.descricao.trim()) {
    errors.descricao = 'Descrição é obrigatória';
  }

  if (!form.unidade.trim()) {
    errors.unidade = 'Unidade é obrigatória';
  }

  if (!Number(form.fornecedorId)) {
    errors.fornecedorId = 'Fornecedor é obrigatório';
  }

  if (!Number(form.divisaoId)) {
    errors.divisaoId = 'Divisão é obrigatória';
  }

  if (!Number.isInteger(Number(form.fatorCompra)) || Number(form.fatorCompra) <= 0) {
    errors.fatorCompra = 'Fator compra deve ser maior que zero';
  }

  if (!Number.isInteger(Number(form.fatorVenda)) || Number(form.fatorVenda) <= 0) {
    errors.fatorVenda = 'Fator venda deve ser maior que zero';
  }

  return errors;
}

interface ImportRow {
  rowIndex: number;
  action: 'criar' | 'erro' | 'aviso';
  data: Partial<ProductFormState>;
  error?: string;
  preview?: { prvenda?: number; comissao?: number };
}

function parseXlsxBool(val: any): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'sim' || s === 'true' || s === '1' || s === 'yes';
}

export function ProdutosTab() {
  const { canInsert } = useModuleCrudPermission('PRODUTOS');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [pinnedColumns, setPinnedColumns] = useState<ProductsGridColumnKey[]>(
    () => {
      try {
        if (typeof window === 'undefined') return [];
        const saved = window.localStorage.getItem(
          PRODUTOS_PINNED_COLUMNS_STORAGE_KEY,
        );
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((value) =>
          PINNABLE_PRODUCT_COLUMNS.some((column) => column.key === value),
        );
      } catch {
        return [];
      }
    },
  );
  const [fixActionsColumn, setFixActionsColumn] = useState(() => {
    try {
      if (typeof window === 'undefined') return true;
      const saved = window.localStorage.getItem(PRODUTOS_FIX_ACTIONS_STORAGE_KEY);
      if (saved === null) return true;
      return saved === 'true';
    } catch {
      return true;
    }
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormState>(initialFormData);
  const [requiredErrors, setRequiredErrors] = useState<RequiredProductErrors>({});
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [kitItens, setKitItens] = useState<ProductKitFormItem[]>([]);
  const [kitSearch, setKitSearch] = useState('');
  const [kitSearchLoading, setKitSearchLoading] = useState(false);
  const [kitSearchResults, setKitSearchResults] = useState<Product[]>([]);
  const [selectedKitProductId, setSelectedKitProductId] = useState('none');
  const [kitQuantity, setKitQuantity] = useState(1);
  const formSnapshotRef = useRef<string>(JSON.stringify(initialFormData));
  const kitSnapshotRef = useRef<string>(JSON.stringify([] as ProductKitFormItem[]));
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewProdutoId, setViewProdutoId] = useState<number>(0);
  const [precoModalOpen, setPrecoModalOpen] = useState(false);
  const [precoProduto, setPrecoProduto] = useState<Product | null>(null);
  const [ajusteGeralOpen, setAjusteGeralOpen] = useState(false);
  const [ajusteGeralLoading, setAjusteGeralLoading] = useState(false);
  const [ajusteGeralAlvo, setAjusteGeralAlvo] = useState<'selecionados' | 'view' | 'todos'>('selecionados');
  const [ajusteGeralForm, setAjusteGeralForm] = useState({
    fornecedorChecked: false, fornecedorId: '',
    divisaoChecked: false, divisaoId: '',
    marcaChecked: false, marca: '',
    multiploChecked: false, multiplo: '',
    fatorCompraChecked: false, fatorCompra: '',
    fatorVendaChecked: false, fatorVenda: '',
    inativoChecked: false, inativo: 'false',
    ncmChecked: false, ncm: '',
    cestChecked: false, cest: '',
    b2bChecked: false, b2b: 'false',
  });
  const empresaAtual = authService.getEmpresa();
  const empresaIdAtual = Number(empresaAtual?.empresa_id) || 0;
  const empresaCadastroId =
    Number(empresaAtual?.empresa_master_id ?? empresaAtual?.empresa_id) || 0;

  const [filters, setFilters] = useState<{
    status: StatusType;
    search: string;
    fornecedor: string;
    divisao: string;
    marca: string;
    possuiFoto?: boolean;
    permiteVendaB2b?: boolean;
    permiteVendaB2c?: boolean;
    lancamento?: boolean;
    cadastroDe: string;
    cadastroAte: string;
  }>({
    status: 'ativos',
    search: '',
    fornecedor: 'all',
    divisao: 'all',
    marca: '',
    possuiFoto: undefined,
    permiteVendaB2b: undefined,
    permiteVendaB2c: undefined,
    lancamento: undefined,
    cadastroDe: '',
    cadastroAte: '',
  });

  const fornecedoresMap = useMemo(() => {
    return new Map<number, string>(
      fornecedores.map((f) => [Number(f.fornecedor_id) || 0, String(f.nome_fornecedor ?? '').trim()]),
    );
  }, [fornecedores]);
  const fornecedoresDisponiveis = useMemo(() => {
    return fornecedores;
  }, [fornecedores]);

  const divisoesMap = useMemo(() => {
    return new Map<number, string>(
      divisoes.map((d) => [Number(d.divisao_id) || 0, String(d.descricao_divisao ?? '').trim()]),
    );
  }, [divisoes]);

  const loadOptions = async () => {
    try {
      const [fornRes, divRes] = await Promise.all([
        suppliersService.getAll(
          undefined,
          1,
          500,
          'ativos',
          true,
          empresaCadastroId || undefined,
        ),
        divisionsService.getAll(
          undefined,
          undefined,
          1,
          500,
          'ativos',
          empresaCadastroId || undefined,
        ),
      ]);
      setFornecedores(fornRes.data || []);
      setDivisoes(divRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar opções de produtos:', error);
      toast.error('Erro ao carregar fornecedores/divisões');
    }
  };

  const loadProdutos = async (overrideFilters?: Partial<ProductCadastroFilters>) => {
    if (loading) return;
    setLoading(true);
    try {
      const params: ProductCadastroFilters = {
        status: overrideFilters?.status ?? filters.status,
        search: overrideFilters?.search ?? filters.search,
        fornecedorId:
          overrideFilters?.fornecedorId ??
          (filters.fornecedor !== 'all' ? Number(filters.fornecedor) : undefined),
        divisaoId:
          overrideFilters?.divisaoId ??
          (filters.divisao !== 'all' ? Number(filters.divisao) : undefined),
        marca: overrideFilters?.marca ?? filters.marca,
        possuiFoto: overrideFilters?.possuiFoto ?? filters.possuiFoto,
        permiteVendaB2b:
          overrideFilters?.permiteVendaB2b ?? filters.permiteVendaB2b,
        permiteVendaB2c:
          overrideFilters?.permiteVendaB2c ?? filters.permiteVendaB2c,
        lancamento: overrideFilters?.lancamento ?? filters.lancamento,
        cadastroDe: overrideFilters?.cadastroDe ?? (filters.cadastroDe || undefined),
        cadastroAte: overrideFilters?.cadastroAte ?? (filters.cadastroAte || undefined),
      };

      const result = await productsService.listCadastro(params, 1, 500);
      setProdutos(result.data || []);
      setTotalProdutos(result.total ?? (result.data || []).length);
      setSelectedRows(new Set());
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      toast.error(error?.message || 'Erro ao buscar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOptions();
    void loadProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaCadastroId]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        PRODUTOS_PINNED_COLUMNS_STORAGE_KEY,
        JSON.stringify(pinnedColumns),
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [pinnedColumns]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        PRODUTOS_FIX_ACTIONS_STORAGE_KEY,
        String(fixActionsColumn),
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [fixActionsColumn]);

  const allSelected = produtos.length > 0 && produtos.every((p) => selectedRows.has(p.id));
  const someSelected = !allSelected && produtos.some((p) => selectedRows.has(p.id));

  const toggleRow = (id: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(produtos.map((p) => p.id)));
    }
  };

  const togglePinnedColumn = (
    columnKey: ProductsGridColumnKey,
    checked: boolean,
  ) => {
    if (!PINNABLE_PRODUCT_COLUMNS.some((column) => column.key === columnKey)) return;
    setPinnedColumns((prev) => {
      if (checked) {
        if (prev.includes(columnKey)) return prev;
        return [...prev, columnKey];
      }
      return prev.filter((key) => key !== columnKey);
    });
  };

  const CHECKBOX_COL_WIDTH = 40; // w-8 (32px) + px-2 (8px padding)

  const columnWidthMap = useMemo(() => {
    const map = new Map<ProductsGridColumnKey, number>();
    PRODUCTS_GRID_COLUMNS.forEach((column) => map.set(column.key, column.width));
    return map;
  }, []);

  const pinnedLeftColumnsInOrder = useMemo(
    () =>
      PRODUCTS_GRID_COLUMNS.filter(
        (column) => column.key !== 'acoes' && pinnedColumns.includes(column.key),
      ).map((column) => column.key),
    [pinnedColumns],
  );

  const pinnedLeftOffsets = useMemo(() => {
    const offsets = new Map<ProductsGridColumnKey, number>();
    let left = CHECKBOX_COL_WIDTH; // checkbox column always occupies the first 32px
    for (const key of pinnedLeftColumnsInOrder) {
      offsets.set(key, left);
      left += columnWidthMap.get(key) ?? 0;
    }
    return offsets;
  }, [columnWidthMap, pinnedLeftColumnsInOrder]);

  const getStickyHeadClass = (key: ProductsGridColumnKey) => {
    if (key === 'acoes') {
      return fixActionsColumn
        ? 'sticky right-0 z-30 bg-background shadow-[-1px_0_0_hsl(var(--border))]'
        : '';
    }
    return pinnedLeftOffsets.has(key)
      ? 'sticky z-30 bg-background shadow-[1px_0_0_hsl(var(--border))]'
      : '';
  };

  const getStickyCellClass = (key: ProductsGridColumnKey) => {
    if (key === 'acoes') {
      return fixActionsColumn
        ? 'sticky right-0 z-20 bg-background shadow-[-1px_0_0_hsl(var(--border))]'
        : '';
    }
    return pinnedLeftOffsets.has(key)
      ? 'sticky z-20 bg-background shadow-[1px_0_0_hsl(var(--border))] group-hover:bg-muted/50'
      : '';
  };

  const getColumnStyle = (key: ProductsGridColumnKey): CSSProperties => {
    const width = columnWidthMap.get(key) ?? 120;
    const style: CSSProperties = {
      width,
      minWidth: width,
      maxWidth: width,
    };
    if (key === 'acoes') {
      if (!fixActionsColumn) return style;
      return { ...style, right: 0 };
    }
    if (!pinnedLeftOffsets.has(key)) return style;
    return { ...style, left: pinnedLeftOffsets.get(key) ?? 0 };
  };

  const tableMinWidth = useMemo(
    () => CHECKBOX_COL_WIDTH + PRODUCTS_GRID_COLUMNS.reduce((total, column) => total + column.width, 0),
    [],
  );

  const handleSearch = async () => {
    await loadProdutos();
  };

  const handleClear = async () => {
    const resetFilters = {
      status: 'ativos' as StatusType,
      search: '',
      fornecedor: 'all',
      divisao: 'all',
      marca: '',
      possuiFoto: undefined,
      permiteVendaB2b: undefined,
      permiteVendaB2c: undefined,
      lancamento: undefined,
      cadastroDe: '',
      cadastroAte: '',
    };
    setFilters(resetFilters);
    await loadProdutos(resetFilters);
  };

  const setFormSnapshot = (nextForm: ProductFormState, nextKitItens: ProductKitFormItem[]) => {
    formSnapshotRef.current = JSON.stringify(nextForm);
    kitSnapshotRef.current = JSON.stringify(nextKitItens);
  };

  const isFormDirty = () =>
    JSON.stringify(formData) !== formSnapshotRef.current ||
    JSON.stringify(kitItens) !== kitSnapshotRef.current;

  const closeDialog = () => {
    setDialogOpen(false);
    setRequiredErrors({});
    setShowConfirmClose(false);
  };

  const requestCloseDialog = () => {
    if (isFormDirty()) {
      setShowConfirmClose(true);
      return;
    }
    closeDialog();
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      requestCloseDialog();
      return;
    }
    setDialogOpen(true);
  };

  const handleConfirmClose = () => {
    closeDialog();
  };

  const handleCancelClose = () => {
    setShowConfirmClose(false);
  };

  const openCreate = () => {
    if (!canInsert) return;
    const nextForm = { ...initialFormData };
    const nextKitItens: ProductKitFormItem[] = [];
    setEditingProduct(null);
    setFormData(nextForm);
    setRequiredErrors({});
    setKitItens(nextKitItens);
    setFormSnapshot(nextForm, nextKitItens);
    setKitSearch('');
    setKitSearchResults([]);
    setSelectedKitProductId('none');
    setKitQuantity(1);
    setDialogOpen(true);
  };

  const openEdit = async (produto: Product) => {
    setSubmitting(true);
    try {
      const detail = await productsService.getCadastroById(produto.id);
      if (!detail) {
        toast.error('Produto não encontrado');
        return;
      }
      const nextForm = mapProductToForm(detail);
      const nextKitItens = mapProductKitToFormItems(detail);
      setEditingProduct(detail);
      setFormData(nextForm);
      setRequiredErrors({});
      setKitItens(nextKitItens);
      setFormSnapshot(nextForm, nextKitItens);
      setKitSearch('');
      setKitSearchResults([]);
      setSelectedKitProductId('none');
      setKitQuantity(1);
      setDialogOpen(true);
    } catch (error: any) {
      console.error('Erro ao carregar produto:', error);
      toast.error(error?.message || 'Erro ao carregar produto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    const ean13 = onlyDigits(formData.ean13, 13);
    const dun14 = onlyDigits(formData.dun14, 14);

    const errors = validateRequiredProductFields(formData);
    if (Object.keys(errors).length > 0) {
      setRequiredErrors(errors);
      toast.error('Preencha todos os campos obrigatórios (*)');
      return;
    }
    if (ean13.length > 13) {
      toast.error('EAN13 deve ter no máximo 13 caracteres');
      return;
    }
    if (dun14.length > 14) {
      toast.error('DUN14 deve ter no máximo 14 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      const payload = mapFormToPayload(formData);
      payload.kit_itens = kitItens.map((item) => ({
        produto_item_id: item.produtoItemId,
        quantidade: Number(item.quantidade) || 0,
      }));
      if (editingProduct) {
        await productsService.updateCadastro(editingProduct.id, payload);
        toast.success('Produto atualizado com sucesso');
      } else {
        await productsService.createCadastro(payload);
        toast.success('Produto criado com sucesso');
      }
      closeDialog();
      await loadProdutos();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error?.message || 'Erro ao salvar produto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessAjusteGeral = async () => {
    const errors: string[] = [];
    const data: Record<string, any> = {};

    if (ajusteGeralForm.fornecedorChecked) {
      const id = Number(ajusteGeralForm.fornecedorId);
      if (!id || id <= 0) errors.push('Selecione um fornecedor.');
      else data.fornecedorId = id;
    }
    if (ajusteGeralForm.divisaoChecked) {
      const id = Number(ajusteGeralForm.divisaoId);
      if (!id || id <= 0) errors.push('Selecione uma divisão.');
      else data.divisaoId = id;
    }
    if (ajusteGeralForm.marcaChecked) {
      if (!ajusteGeralForm.marca.trim()) errors.push('Informe a marca.');
      else data.marca = ajusteGeralForm.marca.trim();
    }
    if (ajusteGeralForm.multiploChecked) {
      const v = parseInt(ajusteGeralForm.multiplo);
      if (!Number.isFinite(v) || v <= 0) errors.push('Informe um múltiplo válido (inteiro positivo).');
      else data.multiploDeVendas = v;
    }
    if (ajusteGeralForm.fatorCompraChecked) {
      const v = parseInt(ajusteGeralForm.fatorCompra);
      if (!Number.isFinite(v) || v <= 0) errors.push('Informe um fator de compra válido (inteiro positivo).');
      else data.fatorCompra = v;
    }
    if (ajusteGeralForm.fatorVendaChecked) {
      const v = parseInt(ajusteGeralForm.fatorVenda);
      if (!Number.isFinite(v) || v <= 0) errors.push('Informe um fator de venda válido (inteiro positivo).');
      else data.fatorVenda = v;
    }
    if (ajusteGeralForm.inativoChecked) {
      data.inativo = ajusteGeralForm.inativo === 'true';
    }
    if (ajusteGeralForm.ncmChecked) {
      if (!ajusteGeralForm.ncm.trim()) errors.push('Informe o NCM.');
      else data.ncm = ajusteGeralForm.ncm.trim();
    }
    if (ajusteGeralForm.cestChecked) {
      if (!ajusteGeralForm.cest.trim()) errors.push('Informe o CEST.');
      else data.cest = ajusteGeralForm.cest.trim();
    }
    if (ajusteGeralForm.b2bChecked) {
      data.permiteVendaB2b = ajusteGeralForm.b2b === 'true';
    }

    const hasCheckedField =
      ajusteGeralForm.fornecedorChecked || ajusteGeralForm.divisaoChecked ||
      ajusteGeralForm.marcaChecked || ajusteGeralForm.multiploChecked ||
      ajusteGeralForm.fatorCompraChecked || ajusteGeralForm.fatorVendaChecked ||
      ajusteGeralForm.inativoChecked || ajusteGeralForm.ncmChecked ||
      ajusteGeralForm.cestChecked || ajusteGeralForm.b2bChecked;

    if (!hasCheckedField) { toast.error('Selecione ao menos um campo para atualizar.'); return; }
    if (errors.length) { toast.error(errors[0]); return; }

    setAjusteGeralLoading(true);
    try {
      let produtoIds: number[];
      if (ajusteGeralAlvo === 'selecionados') {
        produtoIds = Array.from(selectedRows);
      } else {
        produtoIds = produtos.map((p) => p.id);
      }
      if (!produtoIds.length) { toast.error('Nenhum produto para aplicar o ajuste.'); return; }

      const result = await productsService.bulkAdjust({ produtoIds, data });
      toast.success(`Ajuste aplicado em ${result.totalAtualizados} produto(s).`);
      setAjusteGeralOpen(false);
      setSelectedRows(new Set());
      await loadProdutos();
    } catch (e: any) {
      toast.error(String(e?.message || e || 'Erro ao aplicar ajuste geral'));
    } finally {
      setAjusteGeralLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    setDeleteLoading(true);
    try {
      await productsService.deleteCadastro(deleteProduct.id);
      toast.success('Produto excluído com sucesso');
      setDeleteProduct(null);
      await loadProdutos();
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast.error(error?.message || 'Erro ao excluir produto');
    } finally {
      setDeleteLoading(false);
    }
  };

  function handleExportarExcel() {
    if (!produtos.length) { toast.error('Realize a pesquisa antes de exportar'); return; }
    const exportList = selectedRows.size > 0 ? produtos.filter((p) => selectedRows.has(p.id)) : produtos;

    const fornIdToCodigo = new Map<number, string>(
      fornecedores
        .filter((f) => f.codigo_fornecedor)
        .map((f) => [f.fornecedor_id, f.codigo_fornecedor!.trim()]),
    );
    const divIdToCodigo = new Map<number, string>(
      divisoes
        .filter((d) => d.codigo_divisao)
        .map((d) => [d.divisao_id, d.codigo_divisao!.trim()]),
    );

    const wb = XLSX.utils.book_new();
    const hoje = new Date().toLocaleDateString('pt-BR');

    const header = [
      'produto_id', 'descricao', 'apresentacao', 'marca', 'codfab', 'ean13', 'ncm', 'cest',
      'estoque', 'unidade', 'fator_cv', 'muv', 'localizacao', 'descricao2',
      'divisao_id', 'fornece', 'fornec_id',
      'trib_icms', 'cst', 'csosn', 'aliq_icms', 'pFCP', 'pauta', 'cicms', 'cIpi',
      'cst_pis', 'cst_cofins', 'aliq_pis', 'aliq_cofins',
      'origem', 'pesobr', 'u_nota', 'ccompra', 'cmedio',
      'prvenda', 'comissao', 'unidade2', 'dun14', 'pno',
      'CST_ibs_cbs', 'cClassTrib_ibs_cbs',
    ];

    const dataRows = exportList.map((p) => [
      p.codigoProduto ?? '',
      p.descricao ?? '',
      p.apresentacao ?? '',
      p.marca ?? '',
      p.codigoFabrica ?? '',
      p.ean13 ?? '',
      p.ncm ?? '',
      p.cest ?? '',
      p.estoque ?? 0,
      p.un ?? '',
      p.fatorVenda ?? '',
      p.multiploDeVendas ?? '',
      '', // localizacao — não disponível no sistema
      '', // descricao2 — não disponível no sistema
      (p.divisaoId != null ? divIdToCodigo.get(p.divisaoId) ?? '' : ''),
      p.fornecedor ?? '',
      (p.fornecedorId != null ? fornIdToCodigo.get(p.fornecedorId) ?? '' : ''),
      p.codigoSituacaoIcms ?? '',
      p.cst ?? '',
      p.csosn ?? '',
      p.aliquotaIcms ?? '',
      p.pfcp ?? '',
      p.pautaIcms ?? '',
      p.aliquotaIcmsCredito ?? '',
      '', // cIpi — não disponível no sistema
      p.cstPis ?? '',
      p.cstCofins ?? '',
      p.aliquotaPis ?? '',
      p.aliquotaCofins ?? '',
      p.origemProduto ?? '',
      p.pesoBruto ?? '',
      p.custoNota ?? '',
      p.custoCompra ?? '',
      p.custoMedio ?? '',
      p.preco ?? '',
      p.comissao ?? '',
      p.unidade2 ?? '',
      p.dun14 ?? '',
      p.pno ?? '',
      p.ibsCbs ?? '',
      p.ibsCbsClassifTrib ?? '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    ws['!cols'] = [
      { wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 8  }, { wch: 10 }, { wch: 6  }, { wch: 12 }, { wch: 20 },
      { wch: 12 }, { wch: 36 }, { wch: 12 },
      { wch: 28 }, { wch: 6  }, { wch: 6  }, { wch: 10 }, { wch: 8  }, { wch: 8  }, { wch: 8  }, { wch: 8  },
      { wch: 8  }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 6  }, { wch: 8  }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 8  }, { wch: 14 }, { wch: 6  },
      { wch: 12 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
    XLSX.writeFile(wb, `produtos_${hoje.replace(/\//g, '-')}.xlsx`);
    toast.success('Arquivo exportado com sucesso');
  }

  async function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const tabelas = await tabelasPrecoService.getAll('', 1, 500, 'ativos');
      const temPadrao = tabelas.data.some((t) => t.padrao);
      if (!temPadrao) {
        toast.error('Nenhuma tabela de preços padrão definida. Cadastre e marque uma tabela como padrão antes de importar produtos.');
        return;
      }
    } catch {
      toast.error('Não foi possível verificar as tabelas de preços. Tente novamente.');
      return;
    }

    let fileData: string;
    try {
      fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
        reader.readAsBinaryString(file);
      });
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao ler o arquivo');
      return;
    }

    try {
      const wb = XLSX.read(fileData, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

      if (!rows.length) { toast.error('Planilha vazia'); return; }

      const byEan13 = new Map<string, Product>(
        produtos
          .filter((p) => p.ean13)
          .map((p) => [String(p.ean13!).replace(/\D/g, '').trim(), p]),
      );
      const byCodFabFornecedor = new Map<string, Product>(
        produtos
          .filter((p) => p.codigoFabrica && p.fornecedorId != null)
          .map((p) => [
            `${String(p.codigoFabrica!).trim().toUpperCase()}|${p.fornecedorId}`,
            p,
          ]),
      );

      const codigoToFornId = new Map<string, number>(
        fornecedores
          .filter((f) => f.codigo_fornecedor)
          .map((f) => [f.codigo_fornecedor!.trim().toUpperCase(), f.fornecedor_id]),
      );
      const codigoToDivId = new Map<string, number>(
        divisoes
          .filter((d) => d.codigo_divisao)
          .map((d) => [d.codigo_divisao!.trim().toUpperCase(), d.divisao_id]),
      );

      const parsed: ImportRow[] = rows.map((row, idx) => {
        const descricao = String(row['descricao'] ?? '').trim().toUpperCase();

        const num = (v: any) => (v !== '' && v != null ? Number(v) || undefined : undefined);

        const fornecCodigoRaw = String(row['fornec_id'] ?? '').trim().toUpperCase();
        const resolvedFornId = fornecCodigoRaw ? codigoToFornId.get(fornecCodigoRaw) : undefined;

        const divisaoCodigoRaw = String(row['divisao_id'] ?? '').trim().toUpperCase();
        const resolvedDivId = divisaoCodigoRaw ? codigoToDivId.get(divisaoCodigoRaw) : undefined;

        const str = (v: any) => String(v ?? '').trim() || undefined;
        const data: Partial<ProductFormState> = {
          descricao: descricao || undefined,
          apresentacao: str(row['apresentacao'])?.toUpperCase(),
          marca: str(row['marca'])?.toUpperCase(),
          codigoFabrica: str(row['codfab'])?.toUpperCase(),
          ean13: String(row['ean13'] ?? '').replace(/\D/g, '').slice(0, 13) || undefined,
          ncm: str(row['ncm']),
          cest: str(row['cest']),
          unidade: str(row['unidade'])?.toUpperCase(),
          fatorVenda: num(row['fator_cv']),
          multiploDeVendas: num(row['muv']),
          divisaoId: resolvedDivId,
          fornecedorId: resolvedFornId,
          estoque: num(row['estoque']),
          // Custos — cmedio é o nome novo, custo é o legado
          custoMedio: num(row['cmedio'] ?? row['custo']),
          custoNota: num(row['u_nota']),
          custoCompra: num(row['ccompra']),
          // Fiscal
          codigoSituacaoIcms: str(row['trib_icms']),
          cst: str(row['cst']),
          csosn: str(row['csosn']),
          aliquotaIcms: num(row['aliq_icms']),
          pfcp: num(row['pFCP']),
          pautaIcms: num(row['pauta']),
          aliquotaIcmsCredito: num(row['cicms']),
          cstPis: str(row['cst_pis']),
          cstCofins: str(row['cst_cofins']),
          aliquotaPis: num(row['aliq_pis']),
          aliquotaCofins: num(row['aliq_cofins']),
          // Outros
          origemProduto: str(row['origem']),
          pesoBruto: num(row['pesobr']),
          dun14: String(row['dun14'] ?? '').replace(/\D/g, '').slice(0, 14) || undefined,
          ibsCbs: str(row['CST_ibs_cbs']),
          ibsCbsClassifTrib: str(row['cClassTrib_ibs_cbs']),
        };
        const preview = {
          prvenda: num(row['prvenda']),
          comissao: num(row['comissao']),
        };

        if (!descricao) {
          return { rowIndex: idx + 1, action: 'erro' as const, data, preview, error: 'Linha sem descrição — ignorada' };
        }

        if (fornecCodigoRaw && resolvedFornId == null) {
          return { rowIndex: idx + 1, action: 'aviso' as const, data, preview, error: `Fornecedor código "${fornecCodigoRaw}" não encontrado` };
        }
        if (divisaoCodigoRaw && resolvedDivId == null) {
          return { rowIndex: idx + 1, action: 'aviso' as const, data, preview, error: `Divisão código "${divisaoCodigoRaw}" não encontrada` };
        }

        const ean13Val = data.ean13;
        const codFab = data.codigoFabrica;
        const fornId = data.fornecedorId;

        if (ean13Val) {
          if (byEan13.has(ean13Val)) {
            return { rowIndex: idx + 1, action: 'erro' as const, data, preview, error: `Produto já existente (EAN13: ${ean13Val})` };
          }
        } else if (codFab && fornId != null) {
          const key = `${codFab}|${fornId}`;
          if (byCodFabFornecedor.has(key)) {
            return { rowIndex: idx + 1, action: 'erro' as const, data, preview, error: `Produto já existente (Cód.Fábrica: ${codFab} / Forn. ID: ${fornId})` };
          }
        }

        return { rowIndex: idx + 1, action: 'criar' as const, data, preview };
      });

      // Pré-validar fornecedor_id e divisao_id contra a empresa atual
      const candidatos = parsed.filter((r) => r.action !== 'erro');
      const uniqueFornIds = [...new Set(candidatos.map((r) => r.data.fornecedorId).filter((v): v is number => v != null))];
      const uniqueDivIds  = [...new Set(candidatos.map((r) => r.data.divisaoId).filter((v): v is number => v != null))];

      const [fornChecks, divChecks] = await Promise.all([
        Promise.all(uniqueFornIds.map((id) => suppliersService.getById(id).then((f) => [id, f !== null] as [number, boolean]))),
        Promise.all(uniqueDivIds.map((id) => divisionsService.getById(id).then((d) => [id, d !== null] as [number, boolean]))),
      ]);

      const validFornIds = new Set(fornChecks.filter(([, ok]) => ok).map(([id]) => id));
      const validDivIds  = new Set(divChecks.filter(([, ok]) => ok).map(([id]) => id));

      const finalParsed: ImportRow[] = parsed.map((row) => {
        if (row.action === 'erro') return row;
        const fornId = row.data.fornecedorId;
        if (fornId != null && !validFornIds.has(fornId)) {
          return { ...row, action: 'aviso' as const, error: `Fornecedor ID ${fornId} não cadastrado para esta empresa` };
        }
        const divId = row.data.divisaoId;
        if (divId != null && !validDivIds.has(divId)) {
          return { ...row, action: 'aviso' as const, error: `Divisão ID ${divId} não encontrada para esta empresa` };
        }
        return row;
      });

      const errorRows = finalParsed.filter((r) => r.action === 'erro');
      const avisoRows = finalParsed.filter((r) => r.action === 'aviso');
      const criarRows = finalParsed.filter((r) => r.action === 'criar');
      if (errorRows.length) toast.warning(`${errorRows.length} linha(s) ignorada(s) por duplicidade`);
      if (avisoRows.length) toast.warning(`${avisoRows.length} linha(s) com aviso — verifique na prévia antes de confirmar`);
      if (!criarRows.length && !avisoRows.length) { toast.error('Nenhuma linha válida encontrada'); return; }

      setImportRows(finalParsed);
      setImportDialogOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao processar planilha');
    }
  }

  async function handleConfirmImport() {
    const validRows = importRows.filter((r) => r.action !== 'erro');
    if (!validRows.length) return;
    setImportLoading(true);
    let created = 0;
    const failed: ImportRow[] = [];
    try {
      for (const row of validRows) {
        try {
          const merged: ProductFormState = { ...initialFormData, ...Object.fromEntries(Object.entries(row.data).filter(([, v]) => v !== undefined)) } as ProductFormState;
          const payload = mapFormToPayload(merged);
          await productsService.createCadastro(payload);
          created++;
        } catch (err: any) {
          failed.push({ ...row, action: 'erro', error: typeof err === 'string' ? err : (err?.message || 'Erro ao criar produto') });
        }
      }

      if (failed.length) {
        toast.error(`${created} produto(s) criado(s), ${failed.length} com erro. Veja o detalhe na tabela.`);
        setImportRows(failed);
      } else {
        toast.success(`Importação concluída: ${created} produto(s) criado(s)`);
        setImportDialogOpen(false);
        setImportRows([]);
      }
      await loadProdutos();
    } finally {
      setImportLoading(false);
    }
  }

  const updateFilter = (key: string, value: any) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const updateForm = (key: keyof ProductFormState, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));
  const clearRequiredError = (key: RequiredProductField) =>
    setRequiredErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSearchKitProducts = async () => {
    const term = kitSearch.trim();
    if (!term) {
      setKitSearchResults([]);
      setSelectedKitProductId('none');
      return;
    }
    setKitSearchLoading(true);
    try {
      const result = await productsService.listCadastro(
        { status: 'ativos', search: term },
        1,
        20,
      );
      setKitSearchResults(
        (result.data || []).filter((item) => Number(item.id) !== Number(formData.id || 0)),
      );
      setSelectedKitProductId('none');
    } catch (error: any) {
      console.error('Erro ao buscar componentes do kit:', error);
      toast.error(error?.message || 'Erro ao buscar componentes do kit');
    } finally {
      setKitSearchLoading(false);
    }
  };

  const handleAddKitItem = () => {
    const produtoId = Number(selectedKitProductId);
    if (!produtoId) {
      toast.error('Selecione um componente para adicionar');
      return;
    }
    if (!(Number(kitQuantity) > 0)) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    const selectedProduct = kitSearchResults.find((item) => Number(item.id) === produtoId);
    if (!selectedProduct) {
      toast.error('Componente não encontrado');
      return;
    }
    setKitItens((prev) => {
      const existing = prev.find((item) => Number(item.produtoItemId) === produtoId);
      if (existing) {
        return prev.map((item) =>
          Number(item.produtoItemId) === produtoId
            ? { ...item, quantidade: Number(item.quantidade) + Number(kitQuantity) }
            : item,
        );
      }
      return [
        ...prev,
        {
          produtoItemId: produtoId,
          codigoProduto: String(selectedProduct.codigoProduto ?? '').trim(),
          descricao: String(selectedProduct.descricao ?? '').trim(),
          un: String(selectedProduct.un ?? 'UN').trim() || 'UN',
          quantidade: Number(kitQuantity) || 0,
          inativo: Boolean(selectedProduct.inativo ?? false),
        },
      ];
    });
    setSelectedKitProductId('none');
    setKitQuantity(1);
  };

  const handleRemoveKitItem = (produtoItemId: number) => {
    setKitItens((prev) =>
      prev.filter((item) => Number(item.produtoItemId) !== Number(produtoItemId)),
    );
  };

  const getHeadClassName = (key: ProductsGridColumnKey) => {
    switch (key) {
      case 'fornecedorId':
      case 'divisaoId':
      case 'pesoBruto':
      case 'pesoLiquido':
      case 'precoNacionalConsumidor':
      case 'precoFabrica':
        return 'text-right';
      case 'controlaLote':
      case 'permiteVendaB2b':
      case 'permiteVendaB2c':
      case 'possuiFoto':
      case 'lancamento':
      case 'inativo':
        return 'text-center';
      case 'acoes':
        return 'text-center';
      default:
        return '';
    }
  };

  const getCellClassName = (key: ProductsGridColumnKey) => {
    switch (key) {
      case 'fornecedorId':
      case 'divisaoId':
      case 'pesoBruto':
      case 'pesoLiquido':
      case 'precoNacionalConsumidor':
      case 'precoFabrica':
        return 'text-xs text-right';
      case 'controlaLote':
      case 'permiteVendaB2b':
      case 'permiteVendaB2c':
      case 'possuiFoto':
      case 'lancamento':
      case 'inativo':
        return 'text-xs text-center';
      case 'acoes':
        return 'text-right';
      case 'codigoProduto':
        return 'text-xs font-mono';
      default:
        return 'text-xs';
    }
  };

  const renderProductCell = (
    product: Product,
    key: ProductsGridColumnKey,
    fornecedorNome: string,
    divisaoNome: string,
  ) => {
    switch (key) {
      case 'codigoProduto':
        return product.codigoProduto || product.id;
      case 'descricao':
        return (
          <div className="truncate whitespace-nowrap" title={product.descricao}>
            {product.descricao}
          </div>
        );
      case 'apresentacao':
        return product.apresentacao || '-';
      case 'un':
        return product.un || '-';
      case 'marca':
        return product.marca || '-';
      case 'codigoFabrica':
        return product.codigoFabrica || '-';
      case 'ean13':
        return product.ean13 || '-';
      case 'dun14':
        return product.dun14 || '-';
      case 'fornecedorId':
        return formatNullableInteger(product.fornecedorId);
      case 'fornecedor':
        return (
          <div className="truncate whitespace-nowrap" title={fornecedorNome}>
            {fornecedorNome}
          </div>
        );
      case 'divisaoId':
        return formatNullableInteger(product.divisaoId);
      case 'divisao':
        return (
          <div className="truncate whitespace-nowrap" title={divisaoNome}>
            {divisaoNome}
          </div>
        );
      case 'pesoBruto':
        return formatNullableDecimal(product.pesoBruto, 3);
      case 'pesoLiquido':
        return formatNullableDecimal(product.pesoLiquido, 3);
      case 'controlaLote':
        return formatBooleanCell(product.controlaLote);
      case 'permiteVendaB2b':
        return formatBooleanCell(product.permiteVendaB2b);
      case 'permiteVendaB2c':
        return formatBooleanCell(product.permiteVendaB2c);
      case 'possuiFoto':
        return formatBooleanCell(product.possuiFoto);
      case 'principioAtivo':
        return product.principioAtivo || '-';
      case 'precoNacionalConsumidor':
        return formatNullableCurrency(product.precoNacionalConsumidor);
      case 'precoFabrica':
        return formatNullableCurrency(product.precoFabrica);
      case 'descricaoComplementar':
        return (
          <div
            className="truncate whitespace-nowrap"
            title={product.descricaoComplementar || '-'}
          >
            {product.descricaoComplementar || '-'}
          </div>
        );
      case 'codigoSiteB2c':
        return product.codigoSiteB2c || '-';
      case 'lancamento':
        return formatBooleanCell(product.lancamento);
      case 'inativo':
        return formatBooleanCell(product.inativo);
      case 'acoes':
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setViewProdutoId(product.id);
                setViewModalOpen(true);
              }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setPrecoProduto(product);
                setPrecoModalOpen(true);
              }}
            >
              <DollarSign className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                void openEdit(product);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteProduct(product);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      default:
        return '-';
    }
  };

  return (
    <div className="space-y-4">
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(v: StatusType) => updateFilter('status', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativos">Ativos</SelectItem>
                    <SelectItem value="inativos">Inativos</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-6">
                <label className="text-sm font-medium mb-1 block">Pesquisa</label>
                <Input
                  placeholder="Descrição, código, EAN, fornecedor, divisão..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                />
              </div>
              <div className="md:col-span-2">
                <Button variant="default" onClick={handleSearch} disabled={loading} className="w-full min-h-11 rounded-lg md:min-h-10 md:rounded-md">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Buscar
                </Button>
              </div>
              <div className="md:col-span-2">
                <Button
                  variant="outline"
                  className="w-full min-h-11 rounded-lg md:min-h-10 md:rounded-md"
                  onClick={handleClear}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          </CardContent>
          <div className="px-6 pb-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full min-h-11 justify-between rounded-lg border bg-muted/40 px-4 text-sm font-semibold text-foreground hover:bg-muted/40 hover:text-foreground md:min-h-10 md:rounded-md"
              >
                <span>Mais filtros</span>
                {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4">
                  <label className="text-sm font-medium mb-1 block">Marca</label>
                  <Input
                    value={filters.marca}
                    onChange={(e) => updateFilter('marca', e.target.value)}
                  />
                </div>
                <div className="md:col-span-8 flex flex-wrap gap-x-4 gap-y-2 pt-5">
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={filters.possuiFoto === true}
                      onCheckedChange={(v) => updateFilter('possuiFoto', v ? true : undefined)}
                    />
                    Com foto
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={filters.permiteVendaB2b === true}
                      onCheckedChange={(v) => updateFilter('permiteVendaB2b', v ? true : undefined)}
                    />
                    B2B
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={filters.permiteVendaB2c === true}
                      onCheckedChange={(v) => updateFilter('permiteVendaB2c', v ? true : undefined)}
                    />
                    B2C
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={filters.lancamento === true}
                      onCheckedChange={(v) => updateFilter('lancamento', v ? true : undefined)}
                    />
                    Lançamento
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4">
                  <label className="text-sm font-medium mb-1 block">Cadastrado em (de)</label>
                  <Input
                    type="date"
                    value={filters.cadastroDe}
                    onChange={(e) => setFilters({ ...filters, cadastroDe: e.target.value })}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-sm font-medium mb-1 block">Cadastrado em (até)</label>
                  <Input
                    type="date"
                    value={filters.cadastroAte}
                    onChange={(e) => setFilters({ ...filters, cadastroAte: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4">
                  <label className="text-sm font-medium mb-1 block">Fornecedor</label>
                  <Select value={filters.fornecedor} onValueChange={(v) => updateFilter('fornecedor', v)}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {fornecedoresDisponiveis.map((f) => (
                        <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>
                          {f.nome_fornecedor}{f.codigo_fornecedor ? ` - ${f.codigo_fornecedor}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-4">
                  <label className="text-sm font-medium mb-1 block">Divisão</label>
                  <Select value={filters.divisao} onValueChange={(v) => updateFilter('divisao', v)}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
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
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Produtos ({totalProdutos})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <input
                ref={importFileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportFileChange}
              />
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => importFileRef.current?.click()}>
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Importar Excel</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleExportarExcel} disabled={produtos.length === 0}>
                <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{selectedRows.size > 0 ? `Excel (${selectedRows.size} sel.)` : 'Excel (todos)'}</span>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Columns3 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Fixar colunas</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Colunas fixas</div>
                    <div className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-sm">Fixar ações à direita</span>
                      <Checkbox
                        checked={fixActionsColumn}
                        onCheckedChange={(checked) =>
                          setFixActionsColumn(checked === true)
                        }
                      />
                    </div>
                    <ScrollArea className="h-56 pr-2">
                      <div className="space-y-2">
                        {PINNABLE_PRODUCT_COLUMNS.map((column) => (
                          <label
                            key={column.key}
                            className="flex items-center justify-between rounded-md border p-2 text-sm"
                          >
                            <span>{column.label}</span>
                            <Checkbox
                              checked={pinnedColumns.includes(column.key)}
                              onCheckedChange={(checked) =>
                                togglePinnedColumn(column.key, checked === true)
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  setAjusteGeralAlvo(selectedRows.size > 0 ? 'selecionados' : 'view');
                  setAjusteGeralForm({
                    fornecedorChecked: false, fornecedorId: '',
                    divisaoChecked: false, divisaoId: '',
                    marcaChecked: false, marca: '',
                    multiploChecked: false, multiplo: '',
                    fatorCompraChecked: false, fatorCompra: '',
                    fatorVendaChecked: false, fatorVenda: '',
                    inativoChecked: false, inativo: 'false',
                    ncmChecked: false, ncm: '',
                    cestChecked: false, cest: '',
                    b2bChecked: false, b2b: 'false',
                  });
                  setAjusteGeralOpen(true);
                }}
                disabled={produtos.length === 0}
              >
                <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {selectedRows.size > 0 ? `Ajuste Geral (${selectedRows.size})` : 'Ajuste Geral'}
                </span>
              </Button>
              <Button variant="default" size="sm" onClick={openCreate} className="flex-1 sm:flex-none" disabled={!canInsert}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo Produto</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-auto scrollbar-thin">
            <Table style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: CHECKBOX_COL_WIDTH }} />
                {PRODUCTS_GRID_COLUMNS.map((column) => (
                  <col key={column.key} style={{ width: column.width }} />
                ))}
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 px-2 sticky left-0 z-30 bg-muted/90">
                    <Checkbox
                      checked={allSelected}
                      data-indeterminate={someSelected}
                      onCheckedChange={toggleAll}
                      className={someSelected ? 'opacity-60' : ''}
                    />
                  </TableHead>
                  {PRODUCTS_GRID_COLUMNS.map((column) => (
                    <TableHead
                      key={column.key}
                      style={getColumnStyle(column.key)}
                      className={cn(
                        getStickyHeadClass(column.key),
                        getHeadClassName(column.key),
                      )}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={PRODUCTS_GRID_COLUMNS.length + 1}
                      className="text-center py-8"
                    >
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : produtos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={PRODUCTS_GRID_COLUMNS.length + 1}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  produtos.map((product) => {
                    const isSelected = selectedRows.has(product.id);
                    const fornecedorNome =
                      product.fornecedor?.trim() ||
                      fornecedoresMap.get(Number(product.fornecedorId ?? 0)) ||
                      '-';
                    const divisaoNome =
                      product.divisaoDescricao?.trim() ||
                      divisoesMap.get(Number(product.divisaoId ?? 0)) ||
                      '-';

                    return (
                      <TableRow
                        key={product.id}
                        className={cn('group cursor-pointer hover:bg-muted/50', isSelected && 'bg-primary/5')}
                        onDoubleClick={() => void openEdit(product)}
                      >
                        <TableCell className="w-8 px-2 sticky left-0 z-10 bg-background group-hover:bg-muted/50" style={isSelected ? { background: 'hsl(var(--primary)/.05)' } : undefined}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(product.id)} />
                        </TableCell>
                        {PRODUCTS_GRID_COLUMNS.map((column) => (
                          <TableCell
                            key={column.key}
                            style={getColumnStyle(column.key)}
                            className={cn(
                              getStickyCellClass(column.key),
                              getCellClassName(column.key),
                            )}
                          >
                            {renderProductCell(
                              product,
                              column.key,
                              fornecedorNome,
                              divisaoNome,
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open && !importLoading) { setImportDialogOpen(false); setImportRows([]); } }}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Prévia da importação</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground mb-2">
            {importRows.filter((r) => r.action === 'criar').length} a criar &nbsp;|&nbsp;
            {importRows.filter((r) => r.action === 'aviso').length > 0 && (
              <><span className="text-amber-600 font-medium">{importRows.filter((r) => r.action === 'aviso').length} com aviso</span> &nbsp;|&nbsp;</>
            )}
            {importRows.filter((r) => r.action === 'erro').length} com erro (ignorados)
          </div>
          <div className="flex-1 overflow-auto border rounded-md">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-muted/90">
                <tr className="border-b">
                  <th className="px-2 py-1.5 text-left w-16">Ação</th>
                  <th className="px-2 py-1.5 text-left min-w-[180px]">Descrição</th>
                  <th className="px-2 py-1.5 text-left w-28">Apres.</th>
                  <th className="px-2 py-1.5 text-left w-24">Marca</th>
                  <th className="px-2 py-1.5 text-left w-28">Cód.Fábrica</th>
                  <th className="px-2 py-1.5 text-left w-28">EAN13</th>
                  <th className="px-2 py-1.5 text-left w-20">NCM</th>
                  <th className="px-2 py-1.5 text-left w-16">CEST</th>
                  <th className="px-2 py-1.5 text-left w-10">UN</th>
                  <th className="px-2 py-1.5 text-right w-16">Ft.Venda</th>
                  <th className="px-2 py-1.5 text-right w-14">Múlt.</th>
                  <th className="px-2 py-1.5 text-right w-20">Estoque</th>
                  <th className="px-2 py-1.5 text-right w-20">Custo</th>
                  <th className="px-2 py-1.5 text-right w-20">Pr.Venda</th>
                  <th className="px-2 py-1.5 text-right w-16">%Com.</th>
                  <th className="px-2 py-1.5 text-left w-36">Fornecedor</th>
                  <th className="px-2 py-1.5 text-left w-36">Divisão</th>
                  <th className="px-2 py-1.5 text-left">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const fornIdToNome = new Map<number, string>(
                    fornecedores.map((f) => [f.fornecedor_id, f.codigo_fornecedor ? `${f.nome_fornecedor} - ${f.codigo_fornecedor}` : f.nome_fornecedor]),
                  );
                  const divIdToNome = new Map<number, string>(
                    divisoes.map((d) => [d.divisao_id, d.descricao_divisao]),
                  );
                  return importRows.map((row) => (
                    <tr key={row.rowIndex} className={`border-b ${
                      row.action === 'erro'  ? 'bg-red-50 dark:bg-red-950/20' :
                      row.action === 'aviso' ? 'bg-amber-50 dark:bg-amber-950/20' :
                      'bg-green-50/50 dark:bg-green-950/20'
                    }`}>
                      <td className="px-2 py-1">
                        <span className={`font-semibold ${
                          row.action === 'erro'  ? 'text-red-600' :
                          row.action === 'aviso' ? 'text-amber-600' :
                          'text-green-700'
                        }`}>
                          {row.action === 'criar' ? 'Criar' : row.action === 'aviso' ? 'Aviso' : 'Erro'}
                        </span>
                      </td>
                      <td className="px-2 py-1">{row.data.descricao || '—'}</td>
                      <td className="px-2 py-1">{row.data.apresentacao || '—'}</td>
                      <td className="px-2 py-1">{row.data.marca || '—'}</td>
                      <td className="px-2 py-1 font-mono">{row.data.codigoFabrica || '—'}</td>
                      <td className="px-2 py-1 font-mono">{row.data.ean13 || '—'}</td>
                      <td className="px-2 py-1">{row.data.ncm || '—'}</td>
                      <td className="px-2 py-1">{row.data.cest || '—'}</td>
                      <td className="px-2 py-1">{row.data.unidade || '—'}</td>
                      <td className="px-2 py-1 text-right">{row.data.fatorVenda ?? '—'}</td>
                      <td className="px-2 py-1 text-right">{row.data.multiploDeVendas ?? '—'}</td>
                      <td className="px-2 py-1 text-right">{row.data.estoque ?? '—'}</td>
                      <td className="px-2 py-1 text-right">{row.data.custoMedio ?? '—'}</td>
                      <td className="px-2 py-1 text-right">{row.preview?.prvenda ?? '—'}</td>
                      <td className="px-2 py-1 text-right">{row.preview?.comissao ?? '—'}</td>
                      <td className="px-2 py-1">{row.data.fornecedorId != null ? (fornIdToNome.get(row.data.fornecedorId) ?? row.data.fornecedorId) : '—'}</td>
                      <td className="px-2 py-1">{row.data.divisaoId != null ? (divIdToNome.get(row.data.divisaoId) ?? row.data.divisaoId) : '—'}</td>
                      <td className="px-2 py-1 text-muted-foreground">{row.error || ''}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportRows([]); }} disabled={importLoading}>
              Cancelar
            </Button>
            <Button onClick={() => void handleConfirmImport()} disabled={importLoading || !importRows.some((r) => r.action !== 'erro')}>
              {importLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90dvh] overflow-hidden !flex !flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingProduct ? 'Dados do produto' : 'Novo produto'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="caracteristicas" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
              <TabsTrigger value="caracteristicas">Características</TabsTrigger>
              {!editingProduct && <TabsTrigger value="estoques">Estoques</TabsTrigger>}
              <TabsTrigger value="complementar">Dados complementares</TabsTrigger>
              <TabsTrigger value="kit">Kit</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 mt-2 overflow-y-scroll pr-1">
              <TabsContent value="caracteristicas" className="mt-0 space-y-4 px-1 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs">Código produto</Label>
                    <Input
                      className="h-8 text-xs bg-muted"
                      value={formData.codigoProduto}
                      readOnly
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs">Código fábrica</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.codigoFabrica}
                      onChange={(e) => updateForm('codigoFabrica', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-6">
                    <Label className="text-xs font-semibold">Descrição *</Label>
                    <Input
                      required
                      aria-invalid={Boolean(requiredErrors.descricao)}
                      className={cn(
                        'h-8 text-xs',
                        requiredErrors.descricao && 'border-destructive focus-visible:ring-destructive',
                      )}
                      value={formData.descricao}
                      onChange={(e) => {
                        const nextValue = e.target.value.toUpperCase();
                        updateForm('descricao', nextValue);
                        if (nextValue.trim()) clearRequiredError('descricao');
                      }}
                    />
                    {requiredErrors.descricao ? (
                      <p className="mt-1 text-[11px] text-destructive">{requiredErrors.descricao}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs font-semibold">Unidade *</Label>
                    <Select
                      value={formData.unidade}
                      onValueChange={(v) => {
                        updateForm('unidade', v);
                        if (v.trim()) clearRequiredError('unidade');
                      }}
                    >
                      <SelectTrigger
                        aria-invalid={Boolean(requiredErrors.unidade)}
                        className={cn(
                          'h-8 text-xs',
                          requiredErrors.unidade && 'border-destructive focus:ring-destructive',
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requiredErrors.unidade ? (
                      <p className="mt-1 text-[11px] text-destructive">{requiredErrors.unidade}</p>
                    ) : null}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs">EAN13</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.ean13}
                      maxLength={13}
                      inputMode="numeric"
                      onChange={(e) => updateForm('ean13', onlyDigits(e.target.value, 13))}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs">DUN14</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.dun14}
                      maxLength={14}
                      inputMode="numeric"
                      onChange={(e) => updateForm('dun14', onlyDigits(e.target.value, 14))}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <Label className="text-xs">Apresentação</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.apresentacao}
                      onChange={(e) => updateForm('apresentacao', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <Label className="text-xs">Marca</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.marca}
                      onChange={(e) => updateForm('marca', e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-6">
                    <Label className="text-xs font-semibold">Fornecedor *</Label>
                    <Select
                      value={formData.fornecedorId ? String(formData.fornecedorId) : 'none'}
                      onValueChange={(v) => {
                        updateForm('fornecedorId', v === 'none' ? 0 : Number(v));
                        if (v !== 'none') clearRequiredError('fornecedorId');
                      }}
                    >
                      <SelectTrigger
                        aria-invalid={Boolean(requiredErrors.fornecedorId)}
                        className={cn(
                          'h-8 text-xs',
                          requiredErrors.fornecedorId && 'border-destructive focus:ring-destructive',
                        )}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {fornecedoresDisponiveis.map((f) => (
                          <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>
                            {f.nome_fornecedor}{f.codigo_fornecedor ? ` - ${f.codigo_fornecedor}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requiredErrors.fornecedorId ? (
                      <p className="mt-1 text-[11px] text-destructive">{requiredErrors.fornecedorId}</p>
                    ) : null}
                  </div>
                  <div className="col-span-1 md:col-span-6">
                    <Label className="text-xs font-semibold">Divisão *</Label>
                    <Select
                      value={formData.divisaoId ? String(formData.divisaoId) : 'none'}
                      onValueChange={(v) => {
                        updateForm('divisaoId', v === 'none' ? 0 : Number(v));
                        if (v !== 'none') clearRequiredError('divisaoId');
                      }}
                    >
                      <SelectTrigger
                        aria-invalid={Boolean(requiredErrors.divisaoId)}
                        className={cn(
                          'h-8 text-xs',
                          requiredErrors.divisaoId && 'border-destructive focus:ring-destructive',
                        )}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {divisoes.map((d) => (
                          <SelectItem key={d.divisao_id} value={String(d.divisao_id)}>
                            {d.descricao_divisao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requiredErrors.divisaoId ? (
                      <p className="mt-1 text-[11px] text-destructive">{requiredErrors.divisaoId}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-12 flex flex-wrap gap-x-4 gap-y-2 pt-1">
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={formData.permiteVendaB2b}
                        onCheckedChange={(v) => updateForm('permiteVendaB2b', Boolean(v))}
                        className="h-3.5 w-3.5"
                      />
                      B2B
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={formData.permiteVendaB2c}
                        onCheckedChange={(v) => updateForm('permiteVendaB2c', Boolean(v))}
                        className="h-3.5 w-3.5"
                      />
                      B2C
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={formData.controlaLote}
                        onCheckedChange={(v) => updateForm('controlaLote', Boolean(v))}
                        className="h-3.5 w-3.5"
                      />
                      Controla lote
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={formData.possuiFoto}
                        onCheckedChange={(v) => updateForm('possuiFoto', Boolean(v))}
                        className="h-3.5 w-3.5"
                      />
                      Possui foto
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={!formData.inativo}
                        onCheckedChange={(checked) => updateForm('inativo', checked !== true)}
                        className="h-3.5 w-3.5"
                      />
                      Ativo
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-4">
                    <Label className="text-xs">Múltiplo de vendas</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={formData.multiploDeVendas}
                      onChange={(e) => updateForm('multiploDeVendas', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <Label className="text-xs">Fator compra *</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      aria-invalid={Boolean(requiredErrors.fatorCompra)}
                      className={cn(
                        'h-8 text-xs',
                        requiredErrors.fatorCompra && 'border-destructive focus-visible:ring-destructive',
                      )}
                      value={formData.fatorCompra}
                      onChange={(e) => {
                        const nextValue = Number(e.target.value);
                        updateForm('fatorCompra', Number.isFinite(nextValue) ? nextValue : 0);
                        if (nextValue > 0) clearRequiredError('fatorCompra');
                      }}
                    />
                    {requiredErrors.fatorCompra ? (
                      <p className="mt-1 text-[11px] text-destructive">{requiredErrors.fatorCompra}</p>
                    ) : null}
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <Label className="text-xs">Fator venda *</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      aria-invalid={Boolean(requiredErrors.fatorVenda)}
                      className={cn(
                        'h-8 text-xs',
                        requiredErrors.fatorVenda && 'border-destructive focus-visible:ring-destructive',
                      )}
                      value={formData.fatorVenda}
                      onChange={(e) => {
                        const nextValue = Number(e.target.value);
                        updateForm('fatorVenda', Number.isFinite(nextValue) ? nextValue : 0);
                        if (nextValue > 0) clearRequiredError('fatorVenda');
                      }}
                    />
                    {requiredErrors.fatorVenda ? (
                      <p className="mt-1 text-[11px] text-destructive">{requiredErrors.fatorVenda}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-3">
                    <Label className="text-xs">Peso bruto (KG)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="h-8 text-xs"
                      value={formData.pesoBruto}
                      onChange={(e) => updateForm('pesoBruto', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <Label className="text-xs">Peso líquido (KG)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="h-8 text-xs"
                      value={formData.pesoLiquido}
                      onChange={(e) => updateForm('pesoLiquido', Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs">NCM</Label>
                    <Input
                      className="h-8 text-xs"
                      maxLength={8}
                      value={formData.ncm}
                      onChange={(e) => updateForm('ncm', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs">CEST</Label>
                    <Input
                      className="h-8 text-xs"
                      maxLength={7}
                      value={formData.cest}
                      onChange={(e) => updateForm('cest', e.target.value)}
                    />
                  </div>
                </div>

              </TabsContent>

              <TabsContent value="kit" className="mt-0 px-1 space-y-4 pb-4">
                <div className="rounded-md border p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-8">
                      <Label className="text-xs">Buscar produto componente</Label>
                      <Input
                        className="h-8 text-xs"
                        value={kitSearch}
                        onChange={(e) => setKitSearch(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && (e.preventDefault(), void handleSearchKitProducts())
                        }
                        placeholder="Descrição, código ou EAN do componente"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-8 text-xs"
                        onClick={() => void handleSearchKitProducts()}
                        disabled={kitSearchLoading}
                      >
                        {kitSearchLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        ) : (
                          <Search className="h-3.5 w-3.5 mr-2" />
                        )}
                        Buscar componente
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-8">
                      <Label className="text-xs">Resultado da busca</Label>
                      <Select value={selectedKitProductId} onValueChange={setSelectedKitProductId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecione o componente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione</SelectItem>
                          {kitSearchResults.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {(item.codigoProduto || item.id) + ' - ' + item.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        className="h-8 text-xs"
                        value={kitQuantity}
                        onChange={(e) => setKitQuantity(Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Button
                        type="button"
                        className="w-full h-8 text-xs"
                        onClick={handleAddKitItem}
                      >
                        <Plus className="h-3.5 w-3.5 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-16">UN</TableHead>
                        <TableHead className="w-24 text-right">Quantidade</TableHead>
                        <TableHead className="w-20 text-center">Inativo</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kitItens.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            Este produto ainda não possui componentes de kit.
                          </TableCell>
                        </TableRow>
                      ) : (
                        kitItens.map((item) => (
                          <TableRow key={item.produtoItemId}>
                            <TableCell className="text-xs">
                              {item.codigoProduto || item.produtoItemId}
                            </TableCell>
                            <TableCell className="text-xs">{item.descricao}</TableCell>
                            <TableCell className="text-xs">{item.un}</TableCell>
                            <TableCell className="text-xs text-right">{item.quantidade}</TableCell>
                            <TableCell className="text-xs text-center">
                              {item.inativo ? 'Sim' : 'Não'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700"
                                onClick={() => handleRemoveKitItem(item.produtoItemId)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {!editingProduct && (
                <TabsContent value="estoques" className="mt-0 px-1 space-y-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Código
                      </Label>
                      <Input className="h-8 text-xs bg-muted" value={formData.codigoProduto} readOnly />
                    </div>
                    <div className="md:col-span-8">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Produto
                      </Label>
                      <Input className="h-8 text-xs bg-muted" value={formData.descricao} readOnly />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">UN</Label>
                      <Input className="h-8 text-xs bg-muted" value={formData.unidade} readOnly />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3">
                      <Label className="text-xs">Estoque</Label>
                      <Input
                        type="number"
                        step="0.001"
                        className="h-8 text-xs"
                        value={formData.estoque}
                        onChange={(e) => updateForm('estoque', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Quantidade reservada</Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="h-8 text-xs bg-muted"
                      value={formData.quantidadeReservada}
                      readOnly
                    />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Disponível</Label>
                      <Input
                        className="h-8 text-xs bg-muted"
                        value={toFixedNumber(
                          Number(formData.estoque || 0) - Number(formData.quantidadeReservada || 0),
                          3,
                        )}
                        readOnly
                      />
                    </div>
                    <div className="md:col-span-3 flex items-center gap-2 pt-5">
                      <Checkbox
                        checked={formData.repasseIcms}
                        onCheckedChange={(checked) => updateForm('repasseIcms', Boolean(checked))}
                        className="h-3.5 w-3.5"
                      />
                      <label className="text-xs">Repasse ICMS</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3">
                      <Label className="text-xs">Custo médio</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        className="h-8 text-xs"
                        value={formData.custoMedio}
                        onChange={(e) => updateForm('custoMedio', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Custo nota</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        className="h-8 text-xs"
                        value={formData.custoNota}
                        onChange={(e) => updateForm('custoNota', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Custo compra</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        className="h-8 text-xs"
                        value={formData.custoCompra}
                        onChange={(e) => updateForm('custoCompra', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">CST</Label>
                      <Input
                        className="h-8 text-xs"
                        maxLength={2}
                        value={formData.cst}
                        onChange={(e) => updateForm('cst', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">CSOSN</Label>
                      <Input
                        className="h-8 text-xs"
                        maxLength={3}
                        value={formData.csosn}
                        onChange={(e) => updateForm('csosn', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Código situação ICMS</Label>
                      <Input
                        className="h-8 text-xs"
                        maxLength={6}
                        value={formData.codigoSituacaoIcms}
                        onChange={(e) =>
                          updateForm('codigoSituacaoIcms', e.target.value.toUpperCase())
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Aliq. ICMS</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        value={formData.aliquotaIcms}
                        onChange={(e) => updateForm('aliquotaIcms', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Aliq. ICMS crédito</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        className="h-8 text-xs"
                        value={formData.aliquotaIcmsCredito}
                        onChange={(e) =>
                          updateForm('aliquotaIcmsCredito', Number(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">PFCP</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        value={formData.pfcp}
                        onChange={(e) => updateForm('pfcp', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Pauta ICMS</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        value={formData.pautaIcms}
                        onChange={(e) => updateForm('pautaIcms', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Redução ST</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        value={formData.reducaoSt}
                        onChange={(e) => updateForm('reducaoSt', Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3">
                      <Label className="text-xs">Redução convênio</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        value={formData.reducaoConvenio}
                        onChange={(e) =>
                          updateForm('reducaoConvenio', Number(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">CST PIS</Label>
                      <Input
                        className="h-8 text-xs"
                        maxLength={2}
                        value={formData.cstPis}
                        onChange={(e) => updateForm('cstPis', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">CST COFINS</Label>
                      <Input
                        className="h-8 text-xs"
                        maxLength={2}
                        value={formData.cstCofins}
                        onChange={(e) => updateForm('cstCofins', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">PIS Alíquota</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        value={formData.aliquotaPis}
                        onChange={(e) => updateForm('aliquotaPis', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">COFINS Alíquota</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        value={formData.aliquotaCofins}
                        onChange={(e) =>
                          updateForm('aliquotaCofins', Number(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-2">
                      <Label className="text-xs">IBS/CBS</Label>
                      <Input
                        className="h-8 text-xs"
                        maxLength={3}
                        value={formData.ibsCbs}
                        onChange={(e) => updateForm('ibsCbs', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">IBS/CBS Classif. Trib.</Label>
                      <Input
                        className="h-8 text-xs"
                        maxLength={6}
                        value={formData.ibsCbsClassifTrib}
                        onChange={(e) =>
                          updateForm('ibsCbsClassifTrib', e.target.value.toUpperCase())
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="complementar" className="mt-0 px-1 space-y-3 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-6">
                    <Label className="text-xs">Princípio ativo</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.principioAtivo}
                      onChange={(e) => updateForm('principioAtivo', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <Label className="text-xs">Preço nacional consumidor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-xs"
                      value={formData.precoNacionalConsumidor}
                      onChange={(e) =>
                        updateForm('precoNacionalConsumidor', Number(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <Label className="text-xs">Preço fábrica</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-xs"
                      value={formData.precoFabrica}
                      onChange={(e) => updateForm('precoFabrica', Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-4">
                    <Label className="text-xs">Código site B2C</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.codigoSiteB2c}
                      onChange={(e) => updateForm('codigoSiteB2c', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Descrição complementar</Label>
                  <Textarea
                    className="min-h-[200px] text-xs"
                    placeholder="Descrição complementar do produto..."
                    value={formData.descricaoComplementar}
                    onChange={(e) => updateForm('descricaoComplementar', e.target.value)}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={requestCloseDialog} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingProduct ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as alterações não salvas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProdutoInfoModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        produtoId={viewProdutoId}
      />

      <ProdutoAlterarPrecoModal
        open={precoModalOpen}
        onOpenChange={setPrecoModalOpen}
        produto={precoProduto}
      />

      {/* Ajuste Geral Dialog */}
      <Dialog open={ajusteGeralOpen} onOpenChange={(open) => { if (!ajusteGeralLoading) setAjusteGeralOpen(open); }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajuste Geral de Produtos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Alvo */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Aplicar para</label>
              <Select value={ajusteGeralAlvo} onValueChange={(v) => setAjusteGeralAlvo(v as typeof ajusteGeralAlvo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="selecionados" disabled={selectedRows.size === 0}>
                    {selectedRows.size > 0 ? `Selecionados (${selectedRows.size})` : 'Selecionados (nenhum)'}
                  </SelectItem>
                  <SelectItem value="view">Visíveis ({produtos.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fornecedor */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.fornecedorChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, fornecedorChecked: c === true }))} />
                  <label className="text-sm font-medium">Fornecedor</label>
                </div>
                <Select value={ajusteGeralForm.fornecedorId || 'none'} onValueChange={(v) => setAjusteGeralForm((p) => ({ ...p, fornecedorId: v === 'none' ? '' : v }))} disabled={!ajusteGeralForm.fornecedorChecked}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>
                        {f.nome_fornecedor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Divisão */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.divisaoChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, divisaoChecked: c === true }))} />
                  <label className="text-sm font-medium">Divisão</label>
                </div>
                <Select value={ajusteGeralForm.divisaoId || 'none'} onValueChange={(v) => setAjusteGeralForm((p) => ({ ...p, divisaoId: v === 'none' ? '' : v }))} disabled={!ajusteGeralForm.divisaoChecked}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {divisoes.map((d) => (
                      <SelectItem key={d.divisao_id} value={String(d.divisao_id)}>
                        {d.descricao_divisao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Marca */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.marcaChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, marcaChecked: c === true }))} />
                  <label className="text-sm font-medium">Marca</label>
                </div>
                <Input value={ajusteGeralForm.marca} onChange={(e) => setAjusteGeralForm((p) => ({ ...p, marca: e.target.value }))} disabled={!ajusteGeralForm.marcaChecked} placeholder="Ex: GENÉRICO" maxLength={20} />
              </div>

              {/* Múltiplo de Vendas */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.multiploChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, multiploChecked: c === true }))} />
                  <label className="text-sm font-medium">Múltiplo de vendas</label>
                </div>
                <Input type="number" min={1} step={1} value={ajusteGeralForm.multiplo} onChange={(e) => setAjusteGeralForm((p) => ({ ...p, multiplo: e.target.value }))} disabled={!ajusteGeralForm.multiploChecked} placeholder="1" />
              </div>

              {/* Fator Compra */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.fatorCompraChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, fatorCompraChecked: c === true }))} />
                  <label className="text-sm font-medium">Fator compra</label>
                </div>
                <Input type="number" min={1} step={1} value={ajusteGeralForm.fatorCompra} onChange={(e) => setAjusteGeralForm((p) => ({ ...p, fatorCompra: e.target.value }))} disabled={!ajusteGeralForm.fatorCompraChecked} placeholder="1" />
              </div>

              {/* Fator Venda */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.fatorVendaChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, fatorVendaChecked: c === true }))} />
                  <label className="text-sm font-medium">Fator venda</label>
                </div>
                <Input type="number" min={1} step={1} value={ajusteGeralForm.fatorVenda} onChange={(e) => setAjusteGeralForm((p) => ({ ...p, fatorVenda: e.target.value }))} disabled={!ajusteGeralForm.fatorVendaChecked} placeholder="1" />
              </div>

              {/* Ativo/Inativo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.inativoChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, inativoChecked: c === true }))} />
                  <label className="text-sm font-medium">Ativo / Inativo</label>
                </div>
                <Select value={ajusteGeralForm.inativo} onValueChange={(v) => setAjusteGeralForm((p) => ({ ...p, inativo: v }))} disabled={!ajusteGeralForm.inativoChecked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Ativo</SelectItem>
                    <SelectItem value="true">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* NCM */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.ncmChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, ncmChecked: c === true }))} />
                  <label className="text-sm font-medium">NCM</label>
                </div>
                <Input value={ajusteGeralForm.ncm} onChange={(e) => setAjusteGeralForm((p) => ({ ...p, ncm: e.target.value.replace(/\D/g, '').slice(0, 8) }))} disabled={!ajusteGeralForm.ncmChecked} placeholder="00000000" maxLength={8} />
              </div>

              {/* CEST */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.cestChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, cestChecked: c === true }))} />
                  <label className="text-sm font-medium">CEST</label>
                </div>
                <Input value={ajusteGeralForm.cest} onChange={(e) => setAjusteGeralForm((p) => ({ ...p, cest: e.target.value.replace(/\D/g, '').slice(0, 7) }))} disabled={!ajusteGeralForm.cestChecked} placeholder="0000000" maxLength={7} />
              </div>

              {/* B2B */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ajusteGeralForm.b2bChecked} onCheckedChange={(c) => setAjusteGeralForm((p) => ({ ...p, b2bChecked: c === true }))} />
                  <label className="text-sm font-medium">Permite B2B</label>
                </div>
                <Select value={ajusteGeralForm.b2b} onValueChange={(v) => setAjusteGeralForm((p) => ({ ...p, b2b: v }))} disabled={!ajusteGeralForm.b2bChecked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setAjusteGeralOpen(false)} disabled={ajusteGeralLoading}>Cancelar</Button>
            <Button onClick={() => void handleProcessAjusteGeral()} disabled={ajusteGeralLoading}>
              {ajusteGeralLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Processar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteProduct)} onOpenChange={(open) => !open && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto{' '}
              <strong>{deleteProduct?.descricao || deleteProduct?.codigoProduto || deleteProduct?.id}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
