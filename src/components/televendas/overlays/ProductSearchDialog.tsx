import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, X, Filter, ChevronDown, ChevronUp, DollarSign, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { productsService, type Product, type ProductFiltersParams } from '@/services/productsService';
import { metadataService, type Tabela } from '@/services/metadataService';
import { suppliersService, type Fornecedor } from '@/services/suppliersService';
import { divisionsService, type Divisao } from '@/services/divisionsService';
import { representativesService } from '@/services/representativesService';
import { formatCurrency } from '@/utils/format';
import { ProductPriceTablesModal, type ProductPriceTableEntry, fetchProductPriceTables } from './ProductPriceTablesModal';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ProductFilters {
  codigoProduto: string;
  descricao: string;
  marca: string;
  tabela: string;
  codFabrica: string;
  fornecedor: string;
  ean13: string;
  divisao: string;
  dun14: string;
  principioAtivo: string;
  comEstoque: boolean;
  lancamentos: boolean;
  estoqueZerado: boolean;
  ultimasComprasDesde: Date | undefined;
}

const emptyFilters: ProductFilters = {
  codigoProduto: '',
  descricao: '',
  marca: '',
  tabela: '',
  codFabrica: '',
  fornecedor: '',
  ean13: '',
  divisao: '',
  dun14: '',
  principioAtivo: '',
  comEstoque: false,
  lancamentos: false,
  estoqueZerado: false,
  ultimasComprasDesde: undefined,
};

interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct?: (product: Product) => void;
  onSelectProducts?: (products: Product[]) => void;
  multiSelect?: boolean;
  trigger?: React.ReactNode;
  selectedTabelaId?: string;
  availableTabelas?: Tabela[];
  showRecordCounter?: boolean;
  representanteId?: string;
}

export const ProductSearchDialog = ({
  open,
  onOpenChange,
  onSelectProduct,
  onSelectProducts,
  multiSelect = false,
  trigger,
  selectedTabelaId,
  availableTabelas,
  showRecordCounter = false,
  representanteId,
}: ProductSearchDialogProps) => {
  const [filters, setFilters] = useState<ProductFilters>(emptyFilters);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [loadingTabelas, setLoadingTabelas] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loadingFornecedores, setLoadingFornecedores] = useState(false);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [loadingDivisoes, setLoadingDivisoes] = useState(false);
  // null = sem restrição (mostra todas), array = apenas as divisões permitidas do rep
  const [allowedDivisoes, setAllowedDivisoes] = useState<Divisao[] | null>(null);
  const [loadingAllowedDivisoes, setLoadingAllowedDivisoes] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [priceTablesModalOpen, setPriceTablesModalOpen] = useState(false);
  const [selectedProductForPrices, setSelectedProductForPrices] = useState<Product | null>(null);
  const [priceTablesData, setPriceTablesData] = useState<ProductPriceTableEntry[]>([]);
  const [loadingPriceTables, setLoadingPriceTables] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleOpenPriceTables = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Prevent row selection
    setLoadingPriceTables(product.id);
    try {
      const data = await fetchProductPriceTables(product.id);
      // Filtra para exibir apenas tabelas que o cliente tem acesso
      const allowedIds =
        availableTabelas && availableTabelas.length > 0
          ? new Set(availableTabelas.map((t) => Number(t.id)))
          : null;
      setPriceTablesData(allowedIds ? data.filter((e) => allowedIds.has(e.tabelaPrecoId)) : data);
      setSelectedProductForPrices(product);
      setPriceTablesModalOpen(true);
    } catch (err) {
      toast.error(String(err) || 'Erro ao carregar tabelas de preço');
    } finally {
      setLoadingPriceTables(null);
    }
  };
  const formatPercent = (value?: number) =>
    value == null ? '-' : `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const formatNumber = (value?: number, maximumFractionDigits = 2) =>
    value == null ? '-' : value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits });
  const formatCurrencyOrDash = (value?: number) => (value == null ? '-' : formatCurrency(value));

  const PRODUCT_LIMIT = 300;

  // Use available tabelas from props, or fallback to fetching
  const displayTabelas = availableTabelas && availableTabelas.length > 0 ? availableTabelas : tabelas;

  // Load tabelas, fornecedores and divisões on mount / when representanteId changes
  useEffect(() => {
    const loadMetadata = async () => {
      // Load tabelas only if not provided via props
      if (!availableTabelas || availableTabelas.length === 0) {
        setLoadingTabelas(true);
        try {
          const data = await metadataService.getTabelas();
          setTabelas(data);
        } catch (e) {
          console.error('Erro ao carregar tabelas:', e);
        } finally {
          setLoadingTabelas(false);
        }
      }

      // Load fornecedores – se há representante, só os autorizados para ele
      setLoadingFornecedores(true);
      try {
        if (representanteId) {
          const result = await representativesService.getFornecedores(representanteId, { limit: 200 });
          setFornecedores(
            result.data.map((item) => ({
              fornecedor_id: item.fornecedor.fornecedor_id,
              nome_fornecedor: item.fornecedor.nome_fornecedor,
              codigo_fornecedor: item.fornecedor.codigo_fornecedor,
              inativo: item.fornecedor.inativo,
            })),
          );
        } else {
          const result = await suppliersService.getAll(undefined, 1, 200, 'ativos', true);
          setFornecedores(result.data);
        }
      } catch (e) {
        console.error('Erro ao carregar fornecedores:', e);
      } finally {
        setLoadingFornecedores(false);
      }

      // Load all divisões (fallback quando rep não tem restrição de divisão)
      setLoadingDivisoes(true);
      try {
        const result = await divisionsService.getAll();
        setDivisoes(result.data);
      } catch (e) {
        console.error('Erro ao carregar divisões:', e);
      } finally {
        setLoadingDivisoes(false);
      }
    };

    loadMetadata();
  }, [availableTabelas, representanteId]);

  // Reset multi-selection and pre-fill tabela when dialog opens
  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    if (selectedTabelaId) {
      setFilters((prev) => ({ ...prev, tabela: selectedTabelaId }));
    }
  }, [open, selectedTabelaId]);

  // Carrega as divisões permitidas do representante quando o fornecedor muda
  useEffect(() => {
    if (!representanteId || !filters.fornecedor || filters.fornecedor === '_all') {
      setAllowedDivisoes(null);
      return;
    }
    let active = true;
    setLoadingAllowedDivisoes(true);
    representativesService
      .getFornecedorDivisoes(representanteId, filters.fornecedor)
      .then((result) => {
        if (!active) return;
        if (result.data.length === 0) {
          // Sem restrição de divisão para este fornecedor
          setAllowedDivisoes(null);
          setFilters((prev) => ({ ...prev, divisao: '' }));
        } else {
          const mapped: Divisao[] = result.data.map((d) => ({
            empresa_id: d.empresa_id,
            divisao_id: d.divisao_id,
            codigo_divisao: d.codigo_divisao ?? undefined,
            descricao_divisao: d.descricao_divisao ?? '',
          }));
          setAllowedDivisoes(mapped);
          // Auto-seleciona se só há uma divisão permitida
          setFilters((prev) => ({
            ...prev,
            divisao: mapped.length === 1 ? String(mapped[0].divisao_id) : '',
          }));
        }
      })
      .catch(() => {
        if (!active) return;
        setAllowedDivisoes(null);
      })
      .finally(() => {
        if (active) setLoadingAllowedDivisoes(false);
      });
    return () => { active = false; };
  }, [representanteId, filters.fornecedor]);

  // Build filters object for API
  const buildFiltersParams = useCallback((): ProductFiltersParams => {
    const params: ProductFiltersParams = {};
    if (filters.codigoProduto.trim()) params.codigoProduto = filters.codigoProduto.trim();
    if (filters.descricao.trim()) params.descricao = filters.descricao.trim();
    if (filters.marca.trim()) params.marca = filters.marca.trim();
    if (filters.tabela) params.tabela = filters.tabela;
    if (filters.codFabrica.trim()) params.codFabrica = filters.codFabrica.trim();
    if (filters.fornecedor) params.fornecedor = filters.fornecedor;
    if (filters.ean13.trim()) params.ean13 = filters.ean13.trim();
    if (filters.divisao) params.divisao = filters.divisao;
    if (filters.dun14.trim()) params.dun14 = filters.dun14.trim();
    if (filters.principioAtivo.trim()) params.principioAtivo = filters.principioAtivo.trim();
    if (filters.comEstoque) params.comEstoque = true;
    if (filters.estoqueZerado) params.estoqueZerado = true;
    if (filters.lancamentos) params.lancamentos = true;
    if (filters.ultimasComprasDesde) {
      params.ultimasComprasDesde = format(filters.ultimasComprasDesde, 'yyyy-MM-dd');
    }
    return params;
  }, [filters]);

  const loadProducts = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    if (reset) setTotalProducts(0);
    try {
      const nextPage = reset ? 1 : page + 1;
      const filtersParams = buildFiltersParams();
      const result = await productsService.findPaged(filtersParams, nextPage, PRODUCT_LIMIT);
      
      const combined = reset ? result.data : [...products, ...result.data];
      const seen = new Set<number>();
      const nextProducts = combined.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
      setProducts(nextProducts);
      setPage(nextPage);
      setTotalProducts(result.total);
      setHasMore(nextProducts.length < result.total);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [loading, page, products, buildFiltersParams]);

  // Load products when dialog opens
  useEffect(() => {
    if (!open) return;
    loadProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSearch = () => {
    loadProducts(true);
  };

  const handleClearFilters = () => {
    setFilters({ ...emptyFilters, tabela: selectedTabelaId || '' });
    setAllowedDivisoes(null);
  };

  const handleSelectProduct = (product: Product) => {
    if (multiSelect) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(product.id)) next.delete(product.id); else next.add(product.id);
        return next;
      });
    } else {
      onSelectProduct?.(product);
      onOpenChange(false);
    }
  };

  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleImportSelected = () => {
    const selected = products.filter((p) => selectedIds.has(p.id));
    if (selected.length === 0) { toast.error('Selecione ao menos um produto'); return; }
    onSelectProducts?.(selected);
    onOpenChange(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (hasMore && !loading && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadProducts(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pesquisa Produtos</DialogTitle>
        </DialogHeader>
        
        {/* Accordion Filters Section */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="border rounded-lg flex-shrink-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/50 transition-colors rounded-lg data-[state=open]:rounded-b-none"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filtros
              </span>
              {filtersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 bg-muted/30 border-t rounded-b-lg">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-6">
                {/* Column 1 - Text inputs */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-24 text-right shrink-0">Descrição</label>
                    <Input
                      placeholder=""
                      value={filters.descricao}
                      onChange={(e) => setFilters(prev => ({ ...prev, descricao: e.target.value }))}
                      className="h-8 flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-24 text-right shrink-0">Cód. Prod.</label>
                    <Input
                      value={filters.codigoProduto}
                      onChange={(e) => setFilters(prev => ({ ...prev, codigoProduto: e.target.value }))}
                      className="h-8 flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>

                {/* Column 2 - Dropdowns and buttons */}
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium w-14 text-right shrink-0">Marca</label>
                      <Input
                        value={filters.marca}
                        onChange={(e) => setFilters(prev => ({ ...prev, marca: e.target.value }))}
                        className="h-8 flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium w-14 text-right shrink-0">Tabela</label>
                      <Select
                        value={filters.tabela}
                        onValueChange={(v) => setFilters(prev => ({ ...prev, tabela: v === '_all' ? '' : v }))}
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder={loadingTabelas ? '...' : 'Cadastro de produtos'} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTabelas && availableTabelas.length > 0 ? null : (
                            <SelectItem value="_all">Cadastro de produtos</SelectItem>
                          )}
                          {displayTabelas.map((t) => (
                            <SelectItem key={String(t.id)} value={String(t.id)}>
                              {t.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium w-14 text-right shrink-0">Fornec.</label>
                      <Select
                        value={filters.fornecedor}
                        onValueChange={(v) => setFilters(prev => ({ ...prev, fornecedor: v === '_all' ? '' : v }))}
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder={loadingFornecedores ? '...' : 'Todos'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">Todos</SelectItem>
                          {fornecedores.map((f) => (
                            <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>
                              {f.nome_fornecedor} - {f.fornecedor_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium w-14 text-right shrink-0">Divisão</label>
                      <Select
                        value={filters.divisao}
                        onValueChange={(v) => setFilters(prev => ({ ...prev, divisao: v === '_all' ? '' : v }))}
                        disabled={loadingAllowedDivisoes}
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder={loadingAllowedDivisoes ? '...' : (loadingDivisoes ? '...' : 'Todas')} />
                        </SelectTrigger>
                        <SelectContent>
                          {!allowedDivisoes && <SelectItem value="_all">Todas</SelectItem>}
                          {(allowedDivisoes ?? divisoes).map((d) => (
                            <SelectItem key={d.divisao_id} value={String(d.divisao_id)}>
                              {d.descricao_divisao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSearch}
                      className="h-9 w-48"
                      disabled={loading}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Filtrar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-9 w-48"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                  </div>
                </div>

                {/* Column 3 - Checkboxes */}
                <div className="flex flex-col gap-2 pl-4 border-l">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="comEstoque"
                      checked={filters.comEstoque}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, comEstoque: !!checked, estoqueZerado: false }))}
                    />
                    <label htmlFor="comEstoque" className="text-sm cursor-pointer whitespace-nowrap">Com estoque</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="estoqueZerado"
                      checked={filters.estoqueZerado}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, estoqueZerado: !!checked, comEstoque: false }))}
                    />
                    <label htmlFor="estoqueZerado" className="text-sm cursor-pointer whitespace-nowrap">Estoque zerado</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lancamentos"
                      checked={filters.lancamentos}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, lancamentos: !!checked }))}
                    />
                    <label htmlFor="lancamentos" className="text-sm cursor-pointer whitespace-nowrap">Lançamentos</label>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Products Table */}
        {showRecordCounter && (
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            Exibindo {products.length.toLocaleString('pt-BR')} de {totalProducts.toLocaleString('pt-BR')} registro(s)
          </div>
        )}

        <div className="flex-1 min-h-[250px] border rounded-lg overflow-hidden flex flex-col">
          {loading && products.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Carregando produtos...</div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-destructive">{error}</div>
          ) : (
            <div 
              className="flex-1 overflow-x-scroll overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-muted" 
              style={{ scrollbarWidth: 'auto', scrollbarColor: 'hsl(var(--border)) hsl(var(--muted))' }}
              onScroll={handleScroll}
            >
              <Table className="min-w-[2300px]">
                <TableHeader>
                  <TableRow>
                    {multiSelect && (
                      <TableHead className="w-[40px] text-xs text-center">
                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                      </TableHead>
                    )}
                    {!multiSelect && <TableHead className="w-[50px] text-xs">Ações</TableHead>}
                    <TableHead className="w-[80px] text-xs">Código</TableHead>
                    <TableHead className="text-xs min-w-[220px]">Descrição</TableHead>
                    <TableHead className="w-[110px] text-xs text-right">Preço</TableHead>
                    <TableHead className="w-[110px] text-xs text-right">Desc. Máx</TableHead>
                    <TableHead className="w-[90px] text-xs text-right">Estoque</TableHead>
                    <TableHead className="w-[100px] text-xs text-right">Comissão</TableHead>
                    <TableHead className="w-[180px] text-xs">Apresentação</TableHead>
                    <TableHead className="w-[120px] text-xs">Marca</TableHead>
                    <TableHead className="w-[80px] text-xs">UN</TableHead>
                    <TableHead className="w-[160px] text-xs">Tabela Preço</TableHead>
                    <TableHead className="w-[120px] text-xs text-right">Múltiplo Venda</TableHead>
                    <TableHead className="w-[150px] text-xs text-right">Preço Nac. Cons.</TableHead>
                    <TableHead className="w-[130px] text-xs">EAN13</TableHead>
                    <TableHead className="w-[150px] text-xs">Divisão</TableHead>
                    <TableHead className="w-[170px] text-xs">Fornecedor</TableHead>
                    <TableHead className="w-[170px] text-xs">Princípio Ativo</TableHead>
                    <TableHead className="w-[120px] text-xs">Cód. Fábrica</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className={`cursor-pointer hover:bg-primary/10 ${multiSelect && selectedIds.has(product.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      {multiSelect && (
                        <TableCell className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => handleSelectProduct(product)}
                          />
                        </TableCell>
                      )}
                      {!multiSelect && (
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleOpenPriceTables(e, product)}
                            title="Ver tabelas de preços"
                            disabled={loadingPriceTables === product.id}
                          >
                            {loadingPriceTables === product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <DollarSign className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs py-2">
                        {product.codigoProduto ?? product.id}
                      </TableCell>
                      <TableCell className="text-xs py-2">{product.descricao}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatCurrency(product.preco)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatPercent(product.descontoMaximo)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatNumber(product.estoque, 3)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatPercent(product.comissao)}</TableCell>
                      <TableCell className="text-xs py-2">{product.apresentacao ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.marca ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.un}</TableCell>
                      <TableCell className="text-xs py-2">{product.descricaoTabelaPreco ?? '-'}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatNumber(product.multiploDeVendas, 3)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatCurrencyOrDash(product.precoNacionalConsumidor)}</TableCell>
                      <TableCell className="text-xs py-2">{product.ean13 ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.divisaoDescricao ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.fornecedor ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.principioAtivo ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.codigoFabrica ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && products.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center text-sm text-muted-foreground">
                        Carregando mais...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Multi-select footer */}
        {multiSelect && (
          <div className="flex items-center justify-between pt-2 border-t flex-shrink-0">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} produto(s) selecionado(s)` : 'Nenhum produto selecionado'}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleImportSelected} disabled={selectedIds.size === 0}>
                Importar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Price Tables Modal */}
        <ProductPriceTablesModal
          open={priceTablesModalOpen}
          onOpenChange={setPriceTablesModalOpen}
          productDescription={selectedProductForPrices?.descricao}
          data={priceTablesData}
        />
      </DialogContent>
    </Dialog>
  );
};
