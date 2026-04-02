import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Product, productsService } from '@/services/productsService';
import { StockEntry, stocksService } from '@/services/stocksService';

interface StockFormData {
  produto_id: number;
  codigo_produto: string;
  descricao_produto: string;
  unidade: string;
  estoque: number;
  quantidade_reservada: number;
  custo_medio: number;
  custo_nota: number;
  custo_compra: number;
  codigo_situacao_icms: string;
  cst: string;
  csosn: string;
  aliquota_icms: number;
  aliquota_icms_credito: number;
  pfcp: number;
  pauta_icms: number;
  reducao_st: number;
  reducao_convenio: number;
  repasse_icms: boolean;
  cst_pis: string;
  cst_cofins: string;
  aliquota_pis: number;
  aliquota_cofins: number;
  ibs_cbs: string;
  ibs_cbs_classif_trib: string;
}

const initialFormData: StockFormData = {
  produto_id: 0,
  codigo_produto: '',
  descricao_produto: '',
  unidade: 'UN',
  estoque: 0,
  quantidade_reservada: 0,
  custo_medio: 0,
  custo_nota: 0,
  custo_compra: 0,
  codigo_situacao_icms: '',
  cst: '',
  csosn: '',
  aliquota_icms: 0,
  aliquota_icms_credito: 0,
  pfcp: 0,
  pauta_icms: 0,
  reducao_st: 0,
  reducao_convenio: 0,
  repasse_icms: false,
  cst_pis: '',
  cst_cofins: '',
  aliquota_pis: 0,
  aliquota_cofins: 0,
  ibs_cbs: '',
  ibs_cbs_classif_trib: '',
};

function mapStockToForm(stock: StockEntry): StockFormData {
  return {
    produto_id: Number(stock.produto_id) || 0,
    codigo_produto: String(stock.codigo_produto ?? '').trim(),
    descricao_produto: String(stock.descricao_produto ?? '').trim(),
    unidade: String(stock.unidade ?? 'UN').trim() || 'UN',
    estoque: Number(stock.estoque ?? 0) || 0,
    quantidade_reservada: Number(stock.quantidade_reservada ?? 0) || 0,
    custo_medio: Number(stock.custo_medio ?? 0) || 0,
    custo_nota: Number(stock.custo_nota ?? 0) || 0,
    custo_compra: Number(stock.custo_compra ?? 0) || 0,
    codigo_situacao_icms: String(stock.codigo_situacao_icms ?? '').trim(),
    cst: String(stock.cst ?? '').trim(),
    csosn: String(stock.csosn ?? '').trim(),
    aliquota_icms: Number(stock.aliquota_icms ?? 0) || 0,
    aliquota_icms_credito: Number(stock.aliquota_icms_credito ?? 0) || 0,
    pfcp: Number(stock.pfcp ?? 0) || 0,
    pauta_icms: Number(stock.pauta_icms ?? 0) || 0,
    reducao_st: Number(stock.reducao_st ?? 0) || 0,
    reducao_convenio: Number(stock.reducao_convenio ?? 0) || 0,
    repasse_icms: Boolean(stock.repasse_icms ?? false),
    cst_pis: String(stock.cst_pis ?? '').trim(),
    cst_cofins: String(stock.cst_cofins ?? '').trim(),
    aliquota_pis: Number(stock.aliquota_pis ?? 0) || 0,
    aliquota_cofins: Number(stock.aliquota_cofins ?? 0) || 0,
    ibs_cbs: String(stock.ibs_cbs ?? '').trim(),
    ibs_cbs_classif_trib: String(stock.ibs_cbs_classif_trib ?? '').trim(),
  };
}

const toFixedNumber = (value: number, decimals = 3) =>
  Number.isFinite(value) ? value.toFixed(decimals) : '0.000';

export function EstoquesTab() {
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockEntry[]>([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingStock, setEditingStock] = useState<StockEntry | null>(null);
  const [formData, setFormData] = useState<StockFormData>(initialFormData);
  const [deleteStock, setDeleteStock] = useState<StockEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('none');

  const loadStocks = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await stocksService.getAll(search, 1, 500, status);
      setStocks(result.data || []);
      setTotalStocks(result.total ?? (result.data || []).length);
    } catch (error: any) {
      console.error('Erro ao carregar estoques:', error);
      toast.error(error?.message || 'Erro ao carregar estoques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingStock(null);
    setProductSearch('');
    setProductResults([]);
    setSelectedProductId('none');
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = async (stock: StockEntry) => {
    setSubmitting(true);
    try {
      const detail = await stocksService.getById(stock.produto_id);
      if (!detail) {
        toast.error('Estoque não encontrado');
        return;
      }
      setEditingStock(detail);
      setFormData(mapStockToForm(detail));
      setDialogOpen(true);
    } catch (error: any) {
      console.error('Erro ao carregar estoque:', error);
      toast.error(error?.message || 'Erro ao carregar estoque');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = async () => {
    await loadStocks();
  };

  const handleClear = async () => {
    setSearch('');
    setStatus('ativos');
    try {
      setLoading(true);
      const result = await stocksService.getAll('', 1, 500, 'ativos');
      setStocks(result.data || []);
      setTotalStocks(result.total ?? (result.data || []).length);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar estoques');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchProducts = async () => {
    if (!productSearch.trim()) {
      toast.error('Digite algo para buscar o produto');
      return;
    }
    setProductSearchLoading(true);
    try {
      const result = await productsService.listCadastro(
        { status: 'ativos', search: productSearch.trim() },
        1,
        20,
      );
      setProductResults(result.data || []);
      setSelectedProductId('none');
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      toast.error(error?.message || 'Erro ao buscar produtos');
    } finally {
      setProductSearchLoading(false);
    }
  };

  const applySelectedProduct = (productIdValue: string) => {
    setSelectedProductId(productIdValue);
    const selected = productResults.find((item) => item.id === Number(productIdValue));
    if (!selected) return;
    setFormData((prev) => ({
      ...prev,
      produto_id: selected.id,
      codigo_produto: String(selected.codigoProduto ?? '').trim(),
      descricao_produto: String(selected.descricao ?? '').trim(),
      unidade: String(selected.un ?? 'UN').trim() || 'UN',
    }));
  };

  const updateForm = (key: keyof StockFormData, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!formData.produto_id) {
      toast.error('Selecione o produto do estoque');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        produto_id: formData.produto_id,
        estoque: formData.estoque,
        quantidade_reservada: formData.quantidade_reservada,
        custo_medio: formData.custo_medio,
        custo_nota: formData.custo_nota,
        custo_compra: formData.custo_compra,
        codigo_situacao_icms: formData.codigo_situacao_icms.trim() || null,
        cst: formData.cst.trim() || null,
        csosn: formData.csosn.trim() || null,
        aliquota_icms: formData.aliquota_icms,
        aliquota_icms_credito: formData.aliquota_icms_credito,
        pfcp: formData.pfcp,
        pauta_icms: formData.pauta_icms,
        reducao_st: formData.reducao_st,
        reducao_convenio: formData.reducao_convenio,
        repasse_icms: formData.repasse_icms,
        cst_pis: formData.cst_pis.trim() || null,
        cst_cofins: formData.cst_cofins.trim() || null,
        aliquota_pis: formData.aliquota_pis,
        aliquota_cofins: formData.aliquota_cofins,
        ibs_cbs: formData.ibs_cbs.trim() || null,
        ibs_cbs_classif_trib: formData.ibs_cbs_classif_trib.trim() || null,
      };

      if (editingStock) {
        await stocksService.update(editingStock.produto_id, payload);
        toast.success('Estoque atualizado com sucesso');
      } else {
        await stocksService.create(payload);
        toast.success('Estoque criado com sucesso');
      }

      setDialogOpen(false);
      resetForm();
      await loadStocks();
    } catch (error: any) {
      console.error('Erro ao salvar estoque:', error);
      toast.error(error?.message || 'Erro ao salvar estoque');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteStock) return;
    setDeleteLoading(true);
    try {
      await stocksService.delete(deleteStock.produto_id);
      toast.success('Estoque excluído com sucesso');
      setDeleteStock(null);
      await loadStocks();
    } catch (error: any) {
      console.error('Erro ao excluir estoque:', error);
      toast.error(error?.message || 'Erro ao excluir estoque');
    } finally {
      setDeleteLoading(false);
    }
  };

  const disponivel = Number(formData.estoque || 0) - Number(formData.quantidade_reservada || 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Estoques ({totalStocks})
            </CardTitle>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Estoque
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-7">
              <label className="text-sm font-medium mb-1 block">Pesquisa</label>
              <Input
                placeholder="Código, descrição, EAN, código de fábrica..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={status} onValueChange={(v: 'ativos' | 'inativos' | 'todos') => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Button onClick={() => void handleSearch()} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="md:col-span-2">
              <Button variant="outline" onClick={() => void handleClear()} className="w-full">
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-14">UN</TableHead>
                  <TableHead className="w-28 text-right">Estoque</TableHead>
                  <TableHead className="w-28 text-right">Reservado</TableHead>
                  <TableHead className="w-28 text-right">Disponível</TableHead>
                  <TableHead className="w-28 text-right">Custo Médio</TableHead>
                  <TableHead className="w-20 text-center">Repasse</TableHead>
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
                ) : stocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum estoque encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  stocks.map((stock) => (
                    <TableRow key={stock.produto_id}>
                      <TableCell className="text-xs">{stock.codigo_produto || stock.produto_id}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{stock.descricao_produto}</div>
                        {stock.marca ? (
                          <div className="text-[11px] text-muted-foreground">{stock.marca}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">{stock.unidade}</TableCell>
                      <TableCell className="text-xs text-right">{toFixedNumber(stock.estoque, 3)}</TableCell>
                      <TableCell className="text-xs text-right">{toFixedNumber(stock.quantidade_reservada, 3)}</TableCell>
                      <TableCell className="text-xs text-right">{toFixedNumber(stock.disponivel, 3)}</TableCell>
                      <TableCell className="text-xs text-right">{toFixedNumber(Number(stock.custo_medio ?? 0), 5)}</TableCell>
                      <TableCell className="text-xs text-center">{stock.repasse_icms ? 'Sim' : 'Não'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => void openEdit(stock)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            onClick={() => setDeleteStock(stock)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingStock ? 'Editar Estoque' : 'Novo Estoque'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editingStock ? (
              <div className="rounded-md border p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-8">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Buscar produto</label>
                    <Input
                      className="h-9 text-sm"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void handleSearchProducts()}
                      placeholder="Descrição, código, EAN..."
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => void handleSearchProducts()}
                      disabled={productSearchLoading}
                    >
                      {productSearchLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Buscar produto
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Produto</label>
                  <Select value={selectedProductId} onValueChange={applySelectedProduct}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      {productResults.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {(product.codigoProduto || product.id) + ' - ' + product.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
                <Input className="h-9 text-sm bg-muted" value={formData.codigo_produto} readOnly />
              </div>
              <div className="md:col-span-8">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Produto</label>
                <Input className="h-9 text-sm bg-muted" value={formData.descricao_produto} readOnly />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">UN</label>
                <Input className="h-9 text-sm bg-muted" value={formData.unidade} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Estoque</label>
                <Input
                  type="number"
                  step="0.001"
                  className="h-9 text-sm"
                  value={formData.estoque}
                  onChange={(e) => updateForm('estoque', Number(e.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantidade reservada</label>
                <Input
                  type="number"
                  step="0.001"
                  className="h-9 text-sm bg-muted"
                  value={formData.quantidade_reservada}
                  readOnly
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Disponível</label>
                <Input className="h-9 text-sm bg-muted" value={toFixedNumber(disponivel, 3)} readOnly />
              </div>
              <div className="md:col-span-3 flex items-center gap-2 pt-6">
                <Checkbox
                  checked={formData.repasse_icms}
                  onCheckedChange={(checked) => updateForm('repasse_icms', Boolean(checked))}
                />
                <label className="text-sm">Repasse ICMS</label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Código situação ICMS</label>
                <Input className="h-9 text-sm" maxLength={6} value={formData.codigo_situacao_icms} onChange={(e) => updateForm('codigo_situacao_icms', e.target.value.toUpperCase())} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Custo médio</label>
                <Input type="number" step="0.00001" className="h-9 text-sm" value={formData.custo_medio} onChange={(e) => updateForm('custo_medio', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Custo nota</label>
                <Input type="number" step="0.00001" className="h-9 text-sm" value={formData.custo_nota} onChange={(e) => updateForm('custo_nota', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Custo compra</label>
                <Input type="number" step="0.00001" className="h-9 text-sm" value={formData.custo_compra} onChange={(e) => updateForm('custo_compra', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">CST</label>
                <Input className="h-9 text-sm" maxLength={2} value={formData.cst} onChange={(e) => updateForm('cst', e.target.value.toUpperCase())} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">CSOSN</label>
                <Input className="h-9 text-sm" maxLength={3} value={formData.csosn} onChange={(e) => updateForm('csosn', e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Aliq. ICMS</label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={formData.aliquota_icms} onChange={(e) => updateForm('aliquota_icms', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Aliq. ICMS crédito</label>
                <Input type="number" step="0.0001" className="h-9 text-sm" value={formData.aliquota_icms_credito} onChange={(e) => updateForm('aliquota_icms_credito', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">PFCP</label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={formData.pfcp} onChange={(e) => updateForm('pfcp', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Pauta ICMS</label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={formData.pauta_icms} onChange={(e) => updateForm('pauta_icms', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Redução ST</label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={formData.reducao_st} onChange={(e) => updateForm('reducao_st', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Redução convênio</label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={formData.reducao_convenio} onChange={(e) => updateForm('reducao_convenio', Number(e.target.value) || 0)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">CST PIS</label>
                <Input className="h-9 text-sm" maxLength={2} value={formData.cst_pis} onChange={(e) => updateForm('cst_pis', e.target.value.toUpperCase())} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">CST COFINS</label>
                <Input className="h-9 text-sm" maxLength={2} value={formData.cst_cofins} onChange={(e) => updateForm('cst_cofins', e.target.value.toUpperCase())} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">PIS Alíquota</label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={formData.aliquota_pis} onChange={(e) => updateForm('aliquota_pis', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">COFINS Alíquota</label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={formData.aliquota_cofins} onChange={(e) => updateForm('aliquota_cofins', Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">IBS/CBS</label>
                <Input className="h-9 text-sm" maxLength={3} value={formData.ibs_cbs} onChange={(e) => updateForm('ibs_cbs', e.target.value.toUpperCase())} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">IBS/CBS Classif. Trib.</label>
                <Input className="h-9 text-sm" maxLength={6} value={formData.ibs_cbs_classif_trib} onChange={(e) => updateForm('ibs_cbs_classif_trib', e.target.value.toUpperCase())} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingStock ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteStock)} onOpenChange={(open) => !open && setDeleteStock(null)}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Estoque</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o estoque de{' '}
            <strong>{deleteStock?.descricao_produto || deleteStock?.codigo_produto}</strong>?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStock(null)} disabled={deleteLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
