import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Tag, Plus, Pencil, Trash2, Loader2, List } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { tabelasPrecoService, TabelaPreco, TabelaPrecoItem } from '@/services/tabelasPrecoService';
import { metadataService, FormaPagamento, PrazoPagto } from '@/services/metadataService';
import { productsService, Product } from '@/services/productsService';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

const PAGE_LIMIT = 100;

function formatDecimal(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
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
  permite_bonificacao: false,
  permite_debito_credito: false,
  permite_venda_especial: false,
  produto_em_promocao: false,
};

type ItemFormData = typeof initialItemFormData;

export function TabelasPrecoTab() {
  const { canInsert } = useModuleCrudPermission('TABELAS_PRECO');

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

  const [itensOpen, setItensOpen] = useState(false);
  const [itensTabela, setItensTabela] = useState<TabelaPreco | null>(null);
  const [itens, setItens] = useState<TabelaPrecoItem[]>([]);
  const [itensLoading, setItensLoading] = useState(false);
  const [itensSearch, setItensSearch] = useState('');
  const [itensPage, setItensPage] = useState(1);
  const [itensHasMore, setItensHasMore] = useState(true);
  const [deleteItemLoading, setDeleteItemLoading] = useState<number | null>(null);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TabelaPrecoItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [itemFormData, setItemFormData] = useState<ItemFormData>(initialItemFormData);
  const [itemFormLoading, setItemFormLoading] = useState(false);

  const loadMetadata = useCallback(async () => {
    try {
      const [fp, pz] = await Promise.all([
        metadataService.getFormasPagamento(),
        metadataService.getPrazos(),
      ]);
      setFormasPagamento(fp);
      setPrazos(pz);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const loadTabelas = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) {
      setTabelas([]);
      setPage(1);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await tabelasPrecoService.getAll(search, nextPage, PAGE_LIMIT, filtroStatus);
      setTabelas((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error) {
      console.error('Erro ao carregar tabelas de preço:', error);
      toast.error('Erro ao carregar tabelas de preço');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabelas(true);
  }, [filtroStatus]);

  const handleSearch = () => loadTabelas(true);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditId(null);
  };

  const openCreate = () => {
    if (!canInsert) return;
    resetForm();
    setCreateOpen(true);
  };

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
    } finally {
      setFormLoading(false);
    }
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
    if (!formData.descricao_tabela_preco.trim()) {
      toast.error('Preencha os campos obrigatórios: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      await tabelasPrecoService.create(buildPayload());
      toast.success('Tabela de preço criada com sucesso');
      setCreateOpen(false);
      resetForm();
      loadTabelas(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar tabela de preço');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!formData.descricao_tabela_preco.trim()) {
      toast.error('Preencha os campos obrigatórios: Descrição');
      return;
    }
    setFormLoading(true);
    try {
      await tabelasPrecoService.update(editId, buildPayload());
      toast.success('Tabela de preço atualizada com sucesso');
      setEditOpen(false);
      resetForm();
      loadTabelas(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar tabela de preço');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta tabela de preço?')) return;
    setDeleteLoading(id);
    try {
      await tabelasPrecoService.delete(id);
      toast.success('Tabela de preço excluída com sucesso');
      loadTabelas(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir tabela de preço');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadTabelas();
    }
  };

  const loadItens = async (reset = false) => {
    if (!itensTabela) return;
    if (itensLoading) return;
    setItensLoading(true);
    if (reset) {
      setItens([]);
      setItensPage(1);
      setItensHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : itensPage + 1;
      const result = await tabelasPrecoService.getItens(itensTabela.tabela_preco_id, itensSearch, nextPage, PAGE_LIMIT);
      setItens((prev) => (reset ? result.data : [...prev, ...result.data]));
      setItensPage(nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setItensHasMore(nextHasMore);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar itens da tabela');
    } finally {
      setItensLoading(false);
    }
  };

  const openItens = (t: TabelaPreco) => {
    setItensTabela(t);
    setItens([]);
    setItensSearch('');
    setItensPage(1);
    setItensHasMore(true);
    setItensOpen(true);
  };

  useEffect(() => {
    if (itensOpen && itensTabela) {
      loadItens(true);
    }
  }, [itensOpen, itensTabela]);

  const handleItensSearch = () => loadItens(true);
  const handleItensKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleItensSearch();
  };

  const handleItensScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!itensHasMore || itensLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadItens();
    }
  };

  const handleDeleteItem = async (produtoId: number) => {
    if (!itensTabela) return;
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    setDeleteItemLoading(produtoId);
    try {
      await tabelasPrecoService.deleteItem(itensTabela.tabela_preco_id, produtoId);
      toast.success('Item excluído com sucesso');
      loadItens(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir item');
    } finally {
      setDeleteItemLoading(null);
    }
  };

  const openAddItem = () => {
    setEditingItem(null);
    setSelectedProduct(null);
    setProductSearch('');
    setProductResults([]);
    setItemFormData(initialItemFormData);
    setItemDialogOpen(true);
  };

  const openEditItem = (item: TabelaPrecoItem) => {
    setEditingItem(item);
    setSelectedProduct({
      id: item.produto_id,
      descricao: item.descricao_produto,
      codigoProduto: item.codigo_produto,
      un: '',
      preco: item.preco,
    });
    setProductSearch('');
    setProductResults([]);
    setItemFormData({
      preco: item.preco ? String(item.preco) : '',
      desconto_maximo: item.desconto_maximo ? String(item.desconto_maximo) : '',
      comissao: item.comissao ? String(item.comissao) : '',
      quantidade_minima: item.quantidade_minima ? String(item.quantidade_minima) : '',
      pvs: item.pvs ? String(item.pvs) : '',
      permite_bonificacao: item.permite_bonificacao,
      permite_debito_credito: item.permite_debito_credito,
      permite_venda_especial: item.permite_venda_especial,
      produto_em_promocao: item.produto_em_promocao,
    });
    setItemDialogOpen(true);
  };

  const searchProducts = async (q: string) => {
    if (!q.trim()) {
      setProductResults([]);
      return;
    }
    setProductSearchLoading(true);
    try {
      const results = await productsService.search({ descricao: q.trim() }, 1, 20);
      setProductResults(results);
    } catch {
      setProductResults([]);
    } finally {
      setProductSearchLoading(false);
    }
  };

  const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') searchProducts(productSearch);
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
    if (!selectedProduct) {
      toast.error('Selecione um produto');
      return;
    }
    setItemFormLoading(true);
    try {
      const payload = {
        produto_id: selectedProduct.id,
        preco: itemFormData.preco !== '' ? Number(itemFormData.preco) : undefined,
        desconto_maximo: itemFormData.desconto_maximo !== '' ? Number(itemFormData.desconto_maximo) : undefined,
        comissao: itemFormData.comissao !== '' ? Number(itemFormData.comissao) : undefined,
        quantidade_minima: itemFormData.quantidade_minima !== '' ? Number(itemFormData.quantidade_minima) : undefined,
        pvs: itemFormData.pvs !== '' ? Number(itemFormData.pvs) : undefined,
        permite_bonificacao: itemFormData.permite_bonificacao,
        permite_debito_credito: itemFormData.permite_debito_credito,
        permite_venda_especial: itemFormData.permite_venda_especial,
        produto_em_promocao: itemFormData.produto_em_promocao,
      };

      if (editingItem) {
        await tabelasPrecoService.updateItem(itensTabela.tabela_preco_id, editingItem.produto_id, payload);
        toast.success('Item atualizado com sucesso');
      } else {
        await tabelasPrecoService.upsertItem(itensTabela.tabela_preco_id, payload);
        toast.success('Item adicionado com sucesso');
      }
      setItemDialogOpen(false);
      loadItens(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar item');
    } finally {
      setItemFormLoading(false);
    }
  };

  const isInitialLoading = loading && tabelas.length === 0;
  const isLoadingMore = loading && tabelas.length > 0;
  const isItensInitialLoading = itensLoading && itens.length === 0;
  const isItensLoadingMore = itensLoading && itens.length > 0;

  const formContent = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
          <Input
            className="h-8 text-sm"
            placeholder="Auto-gerado"
            value={formData.codigo_tabela_preco}
            onChange={(e) => setFormData({ ...formData, codigo_tabela_preco: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="col-span-1 md:col-span-8">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
          <Input
            className="h-8 text-sm"
            value={formData.descricao_tabela_preco}
            onChange={(e) => setFormData({ ...formData, descricao_tabela_preco: e.target.value.toUpperCase() })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo médio (dias)</label>
          <Input
            className="h-8 text-sm"
            type="number"
            min="0"
            value={formData.prazo_medio}
            onChange={(e) => setFormData({ ...formData, prazo_medio: e.target.value })}
          />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Pedido mínimo</label>
          <Input
            className="h-8 text-sm"
            type="number"
            min="0"
            step="0.01"
            value={formData.pedido_minimo}
            onChange={(e) => setFormData({ ...formData, pedido_minimo: e.target.value })}
          />
        </div>
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Índice financeiro</label>
          <Input
            className="h-8 text-sm"
            type="number"
            min="0"
            step="0.001"
            value={formData.indice_financeiro}
            onChange={(e) => setFormData({ ...formData, indice_financeiro: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Validade</label>
          <Input
            className="h-8 text-sm"
            type="date"
            value={formData.validade}
            onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
          />
        </div>
        <div className="col-span-1 md:col-span-8">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de pagamento</label>
          <Select
            value={formData.forma_pagto_id}
            onValueChange={(v) => setFormData({ ...formData, forma_pagto_id: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma</SelectItem>
              {formasPagamento.map((fp) => (
                <SelectItem key={String(fp.id)} value={String(fp.id)}>
                  {fp.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-12">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo de pagamento</label>
          <Select
            value={formData.prazo_pagto_id}
            onValueChange={(v) => setFormData({ ...formData, prazo_pagto_id: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {prazos.map((pz) => (
                <SelectItem key={String(pz.id)} value={String(pz.id)}>
                  {pz.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-6 pt-1">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.somente_venda_avista}
            onCheckedChange={(checked) => setFormData({ ...formData, somente_venda_avista: checked === true })}
          />
          <label className="text-sm">Somente venda à vista</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={!formData.inativo}
            onCheckedChange={(checked) => setFormData({ ...formData, inativo: checked !== true })}
          />
          <label className="text-sm">Ativo</label>
        </div>
      </div>
    </div>
  );

  const itemFormContent = (
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
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setSelectedProduct(null);
                  setItemFormData((prev) => ({ ...prev, preco: '' }));
                }}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  className="h-8 text-sm flex-1"
                  placeholder="Buscar produto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={handleProductSearchKeyDown}
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => searchProducts(productSearch)}
                  disabled={productSearchLoading}
                >
                  {productSearchLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              {productResults.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-auto">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 border-b last:border-b-0"
                      onClick={() => selectProduct(p)}
                    >
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
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Preço</label>
          <Input
            className="h-8 text-sm"
            type="number"
            min="0"
            step="0.01"
            value={itemFormData.preco}
            onChange={(e) => setItemFormData({ ...itemFormData, preco: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Desc. máx. %</label>
          <Input
            className="h-8 text-sm"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={itemFormData.desconto_maximo}
            onChange={(e) => setItemFormData({ ...itemFormData, desconto_maximo: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Comissão %</label>
          <Input
            className="h-8 text-sm"
            type="number"
            min="0"
            step="0.01"
            value={itemFormData.comissao}
            onChange={(e) => setItemFormData({ ...itemFormData, comissao: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Qtd. mínima</label>
          <Input
            className="h-8 text-sm"
            type="number"
            min="0"
            step="1"
            value={itemFormData.quantidade_minima}
            onChange={(e) => setItemFormData({ ...itemFormData, quantidade_minima: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">PVS</label>
          <Input
            className="h-8 text-sm"
            type="number"
            min="0"
            step="0.01"
            value={itemFormData.pvs}
            onChange={(e) => setItemFormData({ ...itemFormData, pvs: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={itemFormData.permite_bonificacao}
            onCheckedChange={(checked) => setItemFormData({ ...itemFormData, permite_bonificacao: checked === true })}
          />
          <label className="text-sm">Permite bonificação</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={itemFormData.permite_debito_credito}
            onCheckedChange={(checked) => setItemFormData({ ...itemFormData, permite_debito_credito: checked === true })}
          />
          <label className="text-sm">Permite déb./créd.</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={itemFormData.permite_venda_especial}
            onCheckedChange={(checked) => setItemFormData({ ...itemFormData, permite_venda_especial: checked === true })}
          />
          <label className="text-sm">Venda especial</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={itemFormData.produto_em_promocao}
            onCheckedChange={(checked) => setItemFormData({ ...itemFormData, produto_em_promocao: checked === true })}
          />
          <label className="text-sm">Promoção</label>
        </div>
      </div>
    </div>
  );

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
            <Input
              placeholder="Buscar por código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as 'ativos' | 'inativos' | 'todos')}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
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
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : tabelas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhuma tabela de preço encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      tabelas.map((t) => (
                        <TableRow key={t.tabela_preco_id} className={t.inativo ? 'opacity-50' : ''}>
                          <TableCell className="font-mono text-xs">{t.codigo_tabela_preco || '-'}</TableCell>
                          <TableCell className="font-medium">{t.descricao_tabela_preco}</TableCell>
                          <TableCell className="text-right text-sm">{t.prazo_medio != null ? `${t.prazo_medio}d` : '-'}</TableCell>
                          <TableCell className="text-center">
                            {t.somente_venda_avista ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Sim</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Não</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">{t.pedido_minimo > 0 ? formatDecimal(t.pedido_minimo) : '-'}</TableCell>
                          <TableCell className="text-right text-sm">{t.indice_financeiro > 0 ? formatDecimal(t.indice_financeiro, 3) : '-'}</TableCell>
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
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleDelete(t.tabela_preco_id)}
                                      disabled={deleteLoading === t.tabela_preco_id}
                                    >
                                      {deleteLoading === t.tabela_preco_id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
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
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Tabela de Preço</DialogTitle>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Tabela de Preço</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.descricao_tabela_preco ? (
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

      <Dialog open={itensOpen} onOpenChange={setItensOpen}>
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Itens da Tabela: {itensTabela?.descricao_tabela_preco}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Buscar por código ou descrição do produto..."
                value={itensSearch}
                onChange={(e) => setItensSearch(e.target.value)}
                onKeyDown={handleItensKeyDown}
                className="flex-1"
              />
              <Button onClick={handleItensSearch} disabled={itensLoading} size="sm" className="w-full sm:w-auto">
                <Search className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
              <Button onClick={openAddItem} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar item
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden">
              <div className="max-h-[50vh] overflow-auto scrollbar-thin" onScroll={handleItensScroll}>
                <div className="overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-24 text-right">Preço</TableHead>
                        <TableHead className="w-24 text-right">Desc. máx. %</TableHead>
                        <TableHead className="w-24 text-right">Comissão %</TableHead>
                        <TableHead className="w-24 text-right">Qtd. mín.</TableHead>
                        <TableHead className="w-20 text-center">Promoção</TableHead>
                        <TableHead className="w-20 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isItensInitialLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : itens.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum item encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        itens.map((item) => (
                          <TableRow key={item.produto_id}>
                            <TableCell className="font-mono text-xs">{item.codigo_produto || '-'}</TableCell>
                            <TableCell className="text-sm">{item.descricao_produto}</TableCell>
                            <TableCell className="text-right text-sm">{formatDecimal(item.preco)}</TableCell>
                            <TableCell className="text-right text-sm">{formatDecimal(item.desconto_maximo)}</TableCell>
                            <TableCell className="text-right text-sm">{formatDecimal(item.comissao)}</TableCell>
                            <TableCell className="text-right text-sm">{item.quantidade_minima || '-'}</TableCell>
                            <TableCell className="text-center">
                              {item.produto_em_promocao ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Sim</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Não</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <TooltipProvider>
                                <div className="flex items-center justify-center gap-0.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleDeleteItem(item.produto_id)}
                                        disabled={deleteItemLoading === item.produto_id}
                                      >
                                        {deleteItemLoading === item.produto_id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                        )}
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
                      {isItensLoadingMore && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
          </DialogHeader>
          {itemFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
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
