import { useEffect, useMemo, useState } from 'react';
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
import { Search, Plus, Pencil, Trash2, Loader2, ChevronUp, ChevronDown, Package } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Product,
  ProductCadastroFilters,
  ProductCadastroInput,
  productsService,
} from '@/services/productsService';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';

const UNIDADES = ['UN', 'CX', 'PC', 'KG', 'LT', 'DP', 'FR', 'TB', 'CT'];
const TIPOS_ITEM = [
  { value: 'MERCADORIA_REVENDA', label: 'Mercadoria para Revenda' },
  { value: 'USO_CONSUMO', label: 'Uso e Consumo' },
  { value: 'ATIVO_IMOBILIZADO', label: 'Ativo Imobilizado' },
];
const ORIGENS_PRODUTO = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira importação direta' },
  { value: '2', label: '2 - Estrangeira adquirida no mercado interno' },
  { value: '3', label: '3 - Nacional conteúdo importação > 40%' },
  { value: '4', label: '4 - Nacional processos básicos' },
  { value: '5', label: '5 - Nacional conteúdo importação <= 40%' },
  { value: '6', label: '6 - Estrangeira importação direta sem similar' },
  { value: '7', label: '7 - Estrangeira mercado interno sem similar' },
  { value: '8', label: '8 - Nacional conteúdo importação > 70%' },
];

type SearchType = 'descricao' | 'codigo' | 'ean' | 'codFabrica';
type StatusType = 'ativos' | 'inativos' | 'todos';
type BuscaTipo = 'inicial' | 'contido';

interface ProductFormState {
  id: number;
  codigoProduto: string;
  descricao: string;
  unidade: string;
  tipoItem: string;
  codigoFabrica: string;
  ean13: string;
  dun14: string;
  ncm: string;
  cest: string;
  tipi: string;
  pno: string;
  inibeEanXmlNfe: boolean;
  medicamento: boolean;
  producaoPropria: boolean;
  apresentacao: string;
  apresentacao2: string;
  unidade2: string;
  marca: string;
  fornecedorId: number;
  divisaoId: number;
  dcb: string;
  dcbDescricao: string;
  portaria: string;
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
  mensagemNotaFiscal: string;
  regMs: string;
  origemProduto: string;
  validade: string;
  lancamento: boolean;
  inativo: boolean;
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
  ncm: '',
  cest: '',
  tipi: '',
  pno: '',
  inibeEanXmlNfe: false,
  medicamento: false,
  producaoPropria: false,
  apresentacao: '',
  apresentacao2: '',
  unidade2: 'UN',
  marca: '',
  fornecedorId: 0,
  divisaoId: 0,
  dcb: '',
  dcbDescricao: '',
  portaria: '',
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
  mensagemNotaFiscal: '',
  regMs: '',
  origemProduto: '0',
  validade: '',
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
    ncm: String(product.ncm ?? '').trim(),
    cest: String(product.cest ?? '').trim(),
    tipi: String(product.tipi ?? '').trim(),
    pno: String(product.pno ?? '').trim(),
    inibeEanXmlNfe: Boolean(product.inibeEanXmlNfe ?? false),
    medicamento: Boolean(product.medicamento ?? false),
    producaoPropria: Boolean(product.producaoPropria ?? false),
    apresentacao: String(product.apresentacao ?? '').trim(),
    apresentacao2: String(product.apresentacao2 ?? '').trim(),
    unidade2: String(product.unidade2 ?? 'UN').trim() || 'UN',
    marca: String(product.marca ?? '').trim(),
    fornecedorId: Number(product.fornecedorId ?? 0) || 0,
    divisaoId: Number(product.divisaoId ?? 0) || 0,
    dcb: String(product.dcb ?? '').trim(),
    dcbDescricao: String(product.dcbDescricao ?? '').trim(),
    portaria: String(product.portaria ?? '').trim(),
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
    mensagemNotaFiscal: String(product.mensagemNotaFiscal ?? '').trim(),
    regMs: String(product.regMs ?? '').trim(),
    origemProduto: String(product.origemProduto ?? '0').trim() || '0',
    validade: String(product.validade ?? '').trim(),
    lancamento: Boolean(product.lancamento ?? false),
    inativo: Boolean(product.inativo ?? false),
  };
}

function mapFormToPayload(form: ProductFormState): ProductCadastroInput {
  return {
    codigo_produto: form.codigoProduto.trim() || undefined,
    descricao_produto: form.descricao.trim(),
    unidade: form.unidade.trim().toUpperCase(),
    tipo_item: form.tipoItem.trim() || null,
    codigo_fabrica: form.codigoFabrica.trim() || null,
    ean13: form.ean13.trim() || null,
    dun14: form.dun14.trim() || null,
    ncm: form.ncm.trim() || null,
    cest: form.cest.trim() || null,
    tipi: form.tipi.trim() || null,
    pno: form.pno.trim() || null,
    inibe_ean_xml_nfe: Boolean(form.inibeEanXmlNfe),
    medicamento: Boolean(form.medicamento),
    producao_propria: Boolean(form.producaoPropria),
    apresentacao: form.apresentacao.trim() || null,
    apresentacao2: form.apresentacao2.trim() || null,
    unidade2: form.unidade2.trim().toUpperCase() || null,
    marca: form.marca.trim() || null,
    fornecedor_id: Number(form.fornecedorId) || 0,
    divisao_id: Number(form.divisaoId) || 0,
    dcb: form.dcb.trim() || null,
    dcb_descricao: form.dcbDescricao.trim() || null,
    portaria: form.portaria.trim() || null,
    produto_similar: Number.isFinite(Number(form.produtoSimilar))
      ? Number(form.produtoSimilar)
      : null,
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
    mensagem_nota_fiscal: form.mensagemNotaFiscal.trim() || null,
    reg_ms: form.regMs.trim() || null,
    origem_produto: form.origemProduto.trim() || null,
    validade: form.validade.trim() || null,
    lancamento: Boolean(form.lancamento),
    inativo: Boolean(form.inativo),
  };
}

export function ProdutosTab() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormState>(initialFormData);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [filters, setFilters] = useState<{
    status: StatusType;
    searchType: SearchType;
    search: string;
    fornecedor: string;
    divisao: string;
    marca: string;
    buscaTipo: BuscaTipo;
    possuiFoto?: boolean;
    permiteVendaB2b?: boolean;
    permiteVendaB2c?: boolean;
    lancamento?: boolean;
  }>({
    status: 'ativos',
    searchType: 'descricao',
    search: '',
    fornecedor: 'all',
    divisao: 'all',
    marca: '',
    buscaTipo: 'contido',
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

  const divisoesMap = useMemo(() => {
    return new Map<number, string>(
      divisoes.map((d) => [Number(d.divisao_id) || 0, String(d.descricao_divisao ?? '').trim()]),
    );
  }, [divisoes]);

  const loadOptions = async () => {
    try {
      const [fornRes, divRes] = await Promise.all([
        suppliersService.getAll(undefined, 1, 500, 'ativos'),
        divisionsService.getAll(undefined, undefined, 1, 500, 'ativos'),
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
        searchType: overrideFilters?.searchType ?? filters.searchType,
        buscaTipo: overrideFilters?.buscaTipo ?? filters.buscaTipo,
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
  }, []);

  const handleSearch = async () => {
    await loadProdutos();
  };

  const handleClear = async () => {
    const resetFilters = {
      status: 'ativos' as StatusType,
      searchType: 'descricao' as SearchType,
      search: '',
      fornecedor: 'all',
      divisao: 'all',
      marca: '',
      buscaTipo: 'contido' as BuscaTipo,
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
                  placeholder="Digite para pesquisar..."
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
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Buscar por</label>
                  <Select
                    value={filters.searchType}
                    onValueChange={(v: SearchType) => updateFilter('searchType', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="descricao">Descrição</SelectItem>
                      <SelectItem value="codigo">Código</SelectItem>
                      <SelectItem value="ean">EAN</SelectItem>
                      <SelectItem value="codFabrica">Cód. Fábrica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm font-medium mb-1 block">Tipo de busca</label>
                  <RadioGroup
                    value={filters.buscaTipo}
                    onValueChange={(v: BuscaTipo) => updateFilter('buscaTipo', v)}
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="inicial" id="prodBuscaInicial" />
                      <label htmlFor="prodBuscaInicial" className="text-sm">Inicial</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="contido" id="prodBuscaContido" />
                      <label htmlFor="prodBuscaContido" className="text-sm">Contido</label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm font-medium mb-1 block">Marca</label>
                  <Input
                    value={filters.marca}
                    onChange={(e) => updateFilter('marca', e.target.value)}
                  />
                </div>
                <div className="md:col-span-4 flex flex-wrap gap-x-4 gap-y-2 pt-5">
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
                      {fornecedores.map((f) => (
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
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Produtos ({totalProdutos})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-460px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-14">UN</TableHead>
                  <TableHead className="w-28">Marca</TableHead>
                  <TableHead className="w-44">Fornecedor</TableHead>
                  <TableHead className="w-40">Divisão</TableHead>
                  <TableHead className="w-16 text-center">B2B</TableHead>
                  <TableHead className="w-16 text-center">Inativo</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : produtos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  produtos.map((p) => {
                    const fornecedorNome =
                      p.fornecedor?.trim() ||
                      fornecedoresMap.get(Number(p.fornecedorId ?? 0)) ||
                      '-';
                    const divisaoNome =
                      p.divisaoDescricao?.trim() ||
                      divisoesMap.get(Number(p.divisaoId ?? 0)) ||
                      '-';
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onDoubleClick={() => void openEdit(p)}
                      >
                        <TableCell className="text-xs font-mono">
                          {p.codigoProduto || p.id}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[340px]">
                          {p.descricao}
                        </TableCell>
                        <TableCell className="text-xs">{p.un}</TableCell>
                        <TableCell className="text-xs">{p.marca || '-'}</TableCell>
                        <TableCell className="text-xs truncate max-w-[220px]">
                          {fornecedorNome}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[220px]">
                          {divisaoNome}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {p.permiteVendaB2b ? 'Sim' : 'Não'}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {p.inativo ? 'Sim' : 'Não'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openEdit(p);
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
                                setDeleteProduct(p);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingProduct ? 'Dados do produto' : 'Novo produto'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="caracteristicas" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="caracteristicas">Características</TabsTrigger>
              <TabsTrigger value="custos">Custos e Venda</TabsTrigger>
              <TabsTrigger value="complementar">Descrição complementar</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-2">
              <TabsContent value="caracteristicas" className="mt-0 space-y-4 px-1">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-2">
                    <Label className="text-xs">ID</Label>
                    <Input className="h-8 text-xs" value={formData.id || ''} disabled />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Código produto</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.codigoProduto}
                      onChange={(e) => updateForm('codigoProduto', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Código fábrica</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.codigoFabrica}
                      onChange={(e) => updateForm('codigoFabrica', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold">NCM</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.ncm}
                      onChange={(e) => updateForm('ncm', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">CEST</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.cest}
                      onChange={(e) => updateForm('cest', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">EAN13</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.ean13}
                      onChange={(e) => updateForm('ean13', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">DUN14</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.dun14}
                      onChange={(e) => updateForm('dun14', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">TIPI</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.tipi}
                      onChange={(e) => updateForm('tipi', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">PNO</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.pno}
                      onChange={(e) => updateForm('pno', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Marca</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.marca}
                      onChange={(e) => updateForm('marca', e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Label className="text-xs font-semibold">Tipo do item</Label>
                    <Select value={formData.tipoItem} onValueChange={(v) => updateForm('tipoItem', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_ITEM.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-8">
                    <Label className="text-xs font-semibold">Descrição *</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.descricao}
                      onChange={(e) => updateForm('descricao', e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">1ª Apresentação</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.apresentacao}
                      onChange={(e) => updateForm('apresentacao', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="col-span-2">
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
                  <div className="col-span-3">
                    <Label className="text-xs">2ª Apresentação</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.apresentacao2}
                      onChange={(e) => updateForm('apresentacao2', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Unidade 2</Label>
                    <Select value={formData.unidade2} onValueChange={(v) => updateForm('unidade2', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNIDADES.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Múltiplo de vendas</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={formData.multiploDeVendas}
                      onChange={(e) => updateForm('multiploDeVendas', Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Label className="text-xs font-semibold">Fornecedor *</Label>
                    <Select
                      value={formData.fornecedorId ? String(formData.fornecedorId) : 'none'}
                      onValueChange={(v) => updateForm('fornecedorId', v === 'none' ? 0 : Number(v))}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {fornecedores.map((f) => (
                          <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>
                            {f.fornecedor_id} - {f.nome_fornecedor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
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
                  <div className="col-span-4">
                    <Label className="text-xs">Princípio ativo</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.principioAtivo}
                      onChange={(e) => updateForm('principioAtivo', e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">DCB</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.dcb}
                      onChange={(e) => updateForm('dcb', e.target.value)}
                    />
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs">DCB - descrição</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.dcbDescricao}
                      onChange={(e) => updateForm('dcbDescricao', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Portaria</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.portaria}
                      onChange={(e) => updateForm('portaria', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Produto similar</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={formData.produtoSimilar}
                      onChange={(e) => updateForm('produtoSimilar', Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 flex flex-wrap gap-x-4 gap-y-2 pt-1">
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
                        checked={formData.inibeEanXmlNfe}
                        onCheckedChange={(v) => updateForm('inibeEanXmlNfe', Boolean(v))}
                        className="h-3.5 w-3.5"
                      />
                      Inibe EAN XML NFe
                    </label>
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
                        checked={formData.medicamento}
                        onCheckedChange={(v) => updateForm('medicamento', Boolean(v))}
                        className="h-3.5 w-3.5"
                      />
                      Medicamento
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={formData.producaoPropria}
                        onCheckedChange={(v) => updateForm('producaoPropria', Boolean(v))}
                        className="h-3.5 w-3.5"
                      />
                      Produção própria
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
              </TabsContent>

              <TabsContent value="custos" className="mt-0 space-y-4 px-1">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">Fator compra</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={formData.fatorCompra}
                      onChange={(e) => updateForm('fatorCompra', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Fator venda</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={formData.fatorVenda}
                      onChange={(e) => updateForm('fatorVenda', Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">Peso bruto (KG)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="h-8 text-xs"
                      value={formData.pesoBruto}
                      onChange={(e) => updateForm('pesoBruto', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3">
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

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
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
                  <div className="col-span-3">
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

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8">
                    <Label className="text-xs">Mensagem na nota fiscal</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.mensagemNotaFiscal}
                      onChange={(e) => updateForm('mensagemNotaFiscal', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Reg. MS</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.regMs}
                      onChange={(e) => updateForm('regMs', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Validade</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={formData.validade}
                      onChange={(e) => updateForm('validade', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8">
                    <Label className="text-xs">Origem do produto</Label>
                    <Select
                      value={formData.origemProduto || '0'}
                      onValueChange={(v) => updateForm('origemProduto', v)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORIGENS_PRODUTO.map((origem) => (
                          <SelectItem key={origem.value} value={origem.value}>
                            {origem.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="complementar" className="mt-0 px-1 space-y-3">
                <div>
                  <Label className="text-xs">Descrição complementar</Label>
                  <Textarea
                    className="min-h-[200px] text-xs"
                    placeholder="Descrição complementar do produto..."
                    value={formData.descricaoComplementar}
                    onChange={(e) => updateForm('descricaoComplementar', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <Label className="text-xs">Código site B2C</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.codigoSiteB2c}
                      onChange={(e) => updateForm('codigoSiteB2c', e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
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
