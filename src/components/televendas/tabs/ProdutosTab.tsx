import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
import { Search, Plus, Pencil, Trash2, Loader2, ChevronUp, ChevronDown, Package, Columns3 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
  { key: 'acoes', label: 'Ações', width: 112, pinnable: false },
] as const;

type ProductsGridColumnKey = (typeof PRODUCTS_GRID_COLUMNS)[number]['key'];
const PINNABLE_PRODUCT_COLUMNS = PRODUCTS_GRID_COLUMNS.filter(
  (column) => column.pinnable,
);

const parseEmpresasAutorizadas = (value?: string | null) =>
  Array.from(
    new Set(
      (String(value ?? '').match(/\d+/g) ?? [])
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );

const isFornecedorAutorizadoParaEmpresa = (
  fornecedor: Fornecedor,
  empresaId: number,
) => {
  const autorizadas = parseEmpresasAutorizadas(fornecedor.empresas_autorizadas);
  return autorizadas.length === 0 || autorizadas.includes(empresaId);
};

type StatusType = 'ativos' | 'inativos' | 'todos';

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
  fatorCompra: 0,
  fatorVenda: 0,
  multiploDeVendas: 0,
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
    ean13: String(product.ean13 ?? '').trim(),
    dun14: String(product.dun14 ?? '').trim(),
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
    ean13: form.ean13.trim() || null,
    dun14: form.dun14.trim() || null,
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

export function ProdutosTab() {
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
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [kitItens, setKitItens] = useState<ProductKitFormItem[]>([]);
  const [kitSearch, setKitSearch] = useState('');
  const [kitSearchLoading, setKitSearchLoading] = useState(false);
  const [kitSearchResults, setKitSearchResults] = useState<Product[]>([]);
  const [selectedKitProductId, setSelectedKitProductId] = useState('none');
  const [kitQuantity, setKitQuantity] = useState(1);
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
  });

  const fornecedoresMap = useMemo(() => {
    return new Map<number, string>(
      fornecedores.map((f) => [Number(f.fornecedor_id) || 0, String(f.nome_fornecedor ?? '').trim()]),
    );
  }, [fornecedores]);
  const fornecedoresDisponiveis = useMemo(() => {
    if (!empresaIdAtual) return fornecedores;
    return fornecedores.filter(
      (fornecedor) =>
        isFornecedorAutorizadoParaEmpresa(fornecedor, empresaIdAtual) ||
        Number(fornecedor.fornecedor_id) === Number(formData.fornecedorId || 0),
    );
  }, [empresaIdAtual, formData.fornecedorId, fornecedores]);

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
          undefined,
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
      };

      const result = await productsService.listCadastro(params, 1, 500);
      setProdutos(result.data || []);
      setTotalProdutos(result.total ?? (result.data || []).length);
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
    let left = 0;
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
        ? 'sticky right-0 z-20 bg-background shadow-[-1px_0_0_hsl(var(--border))] group-hover:bg-muted/50'
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
    () => PRODUCTS_GRID_COLUMNS.reduce((total, column) => total + column.width, 0),
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
    };
    setFilters(resetFilters);
    await loadProdutos(resetFilters);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({ ...initialFormData });
    setKitItens([]);
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
      setEditingProduct(detail);
      setFormData(mapProductToForm(detail));
      setKitItens(mapProductKitToFormItems(detail));
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
    if (!formData.descricao.trim()) {
      toast.error('Preencha a descrição do produto');
      return;
    }
    if (!formData.unidade.trim()) {
      toast.error('Preencha a unidade');
      return;
    }
    if (!formData.fornecedorId) {
      toast.error('Selecione o fornecedor');
      return;
    }
    if (!formData.divisaoId) {
      toast.error('Selecione a divisão');
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
      setDialogOpen(false);
      await loadProdutos();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error?.message || 'Erro ao salvar produto');
    } finally {
      setSubmitting(false);
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

  const updateFilter = (key: string, value: any) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const updateForm = (key: keyof ProductFormState, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

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
        { status: 'todos', search: term },
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
                <Button onClick={handleSearch} disabled={loading} className="w-full min-h-11 rounded-lg md:min-h-10 md:rounded-md">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Pesquisar
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
                  <label className="text-sm font-medium mb-1 block">Fornecedor</label>
                  <Select value={filters.fornecedor} onValueChange={(v) => updateFilter('fornecedor', v)}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {fornecedoresDisponiveis.map((f) => (
                        <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>
                          {f.fornecedor_id} - {f.nome_fornecedor}
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
              <Button size="sm" onClick={openCreate} className="flex-1 sm:flex-none">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo Produto</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-auto scrollbar-thin">
            <Table style={{ minWidth: tableMinWidth }}>
              <TableHeader>
                <TableRow>
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
                      colSpan={PRODUCTS_GRID_COLUMNS.length}
                      className="text-center py-8"
                    >
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : produtos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={PRODUCTS_GRID_COLUMNS.length}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  produtos.map((product) => {
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
                        className="group cursor-pointer hover:bg-muted/50"
                        onDoubleClick={() => void openEdit(product)}
                      >
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    <Label className="text-xs">ID</Label>
                    <Input
                      className="h-8 text-xs bg-muted"
                      value={formData.id ? String(formData.id) : ''}
                      readOnly
                    />
                  </div>
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
                      className="h-8 text-xs"
                      value={formData.descricao}
                      onChange={(e) => updateForm('descricao', e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs font-semibold">Unidade *</Label>
                    <Select value={formData.unidade} onValueChange={(v) => updateForm('unidade', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNIDADES.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs">EAN13</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.ean13}
                      onChange={(e) => updateForm('ean13', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-xs">DUN14</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.dun14}
                      onChange={(e) => updateForm('dun14', e.target.value)}
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
                      onValueChange={(v) => updateForm('fornecedorId', v === 'none' ? 0 : Number(v))}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {fornecedoresDisponiveis.map((f) => (
                          <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>
                            {f.fornecedor_id} - {f.nome_fornecedor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-6">
                    <Label className="text-xs font-semibold">Divisão *</Label>
                    <Select
                      value={formData.divisaoId ? String(formData.divisaoId) : 'none'}
                      onValueChange={(v) => updateForm('divisaoId', v === 'none' ? 0 : Number(v))}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                        checked={formData.lancamento}
                        onCheckedChange={(v) => updateForm('lancamento', Boolean(v))}
                        className="h-3.5 w-3.5"
                      />
                      Lançamento
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={formData.inativo}
                        onCheckedChange={(v) => updateForm('inativo', Boolean(v))}
                        className="h-3.5 w-3.5"
                      />
                      Produto inativo
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-3">
                    <Label className="text-xs">Fator compra</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={formData.fatorCompra}
                      onChange={(e) => updateForm('fatorCompra', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <Label className="text-xs">Fator venda</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={formData.fatorVenda}
                      onChange={(e) => updateForm('fatorVenda', Number(e.target.value) || 0)}
                    />
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
                  <div className="col-span-1 md:col-span-4">
                    <Label className="text-xs">Múltiplo de vendas</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={formData.multiploDeVendas}
                      onChange={(e) => updateForm('multiploDeVendas', Number(e.target.value) || 0)}
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
                        className="h-8 text-xs"
                        value={formData.quantidadeReservada}
                        onChange={(e) =>
                          updateForm('quantidadeReservada', Number(e.target.value) || 0)
                        }
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingProduct ? 'Salvar' : 'Criar'}
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
