import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Plus, Pencil, Loader2, ChevronUp, ChevronDown, Package } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Mock data
const mockFornecedores = [
  { id: 1, nome: 'BIOKLEIN' },
  { id: 2, nome: 'CELLIV' },
  { id: 3, nome: '3B INDUSTRIA' },
  { id: 4, nome: 'AIRELA' },
];

const mockDivisoes = [
  { id: 1, descricao: 'MEDICAMENTOS' },
  { id: 2, descricao: 'HIGIENE' },
  { id: 3, descricao: 'DESCARTÁVEIS' },
];

const mockProdutos = [
  { id: 10483, codigoFabrica: '', descricao: '5 MAGNESIOS 500MG 60CAPS', un: 'UN', apresentacao: '', marca: 'BIOKLEIN', codFabrica: '', ean13: '7898753980211', ncm: '21069030', cest: '0000000', fatorCompra: 0, preco: 104.32, estoque: 150, fornecedorId: 1, fornecedor: 'BIOKLEIN', divisaoId: 1, divisao: 'MEDICAMENTOS', pesoBruto: 0.001, pesoLiquido: 0, fatorVenda: 1, multiploVendas: 1, controlaLote: false, inativo: false, lancamento: false, b2b: false, medicamento: false, principioAtivo: '', descricaoComplementar: '', custoNota: 0, precoVenda: 0, custoAdicional: 0, comissao: 0, freteCompra: 0, descontoMaximo: 0, pmc: 0, precoFabrica: 0, descontoPerc: 0, estoqueMinimo: 0, localizacao: '01' },
  { id: 10831, codigoFabrica: '', descricao: '7 MAGNESIOS 500MG 60CAPS', un: 'UN', apresentacao: '200X60CAPS', marca: 'CELLIV', codFabrica: '200X60CAPS', ean13: '7898722645790', ncm: '21069030', cest: '0000000', fatorCompra: 0, preco: 85.50, estoque: 200, fornecedorId: 2, fornecedor: 'CELLIV', divisaoId: 1, divisao: 'MEDICAMENTOS', pesoBruto: 0.002, pesoLiquido: 0.001, fatorVenda: 1, multiploVendas: 1, controlaLote: false, inativo: false, lancamento: false, b2b: false, medicamento: false, principioAtivo: '', descricaoComplementar: '', custoNota: 0, precoVenda: 0, custoAdicional: 0, comissao: 0, freteCompra: 0, descontoMaximo: 0, pmc: 0, precoFabrica: 0, descontoPerc: 0, estoqueMinimo: 0, localizacao: '01' },
  { id: 10590, codigoFabrica: '', descricao: 'ABAIXADOR DE LINGUA COLORIDO PCT C/10', un: 'UN', apresentacao: '50X10UN', marca: '3B INDUSTRIA', codFabrica: '50X10UN', ean13: '7898975719002', ncm: '90181990', cest: '0000000', fatorCompra: 0, preco: 5.20, estoque: 500, fornecedorId: 3, fornecedor: '3B INDUSTRIA', divisaoId: 3, divisao: 'DESCARTÁVEIS', pesoBruto: 0.050, pesoLiquido: 0.045, fatorVenda: 1, multiploVendas: 1, controlaLote: false, inativo: false, lancamento: false, b2b: false, medicamento: false, principioAtivo: '', descricaoComplementar: '', custoNota: 0, precoVenda: 0, custoAdicional: 0, comissao: 0, freteCompra: 0, descontoMaximo: 0, pmc: 0, precoFabrica: 0, descontoPerc: 0, estoqueMinimo: 0, localizacao: '01' },
  { id: 10283, codigoFabrica: '', descricao: 'ABCALCIUM B12 SUSP ORAL 240ML', un: 'UN', apresentacao: '36X240ML', marca: 'AIRELA', codFabrica: '36X240ML', ean13: '7894164005901', ncm: '21069030', cest: '0000000', fatorCompra: 0, preco: 22.80, estoque: 80, fornecedorId: 4, fornecedor: 'AIRELA', divisaoId: 1, divisao: 'MEDICAMENTOS', pesoBruto: 0.300, pesoLiquido: 0.240, fatorVenda: 1, multiploVendas: 1, controlaLote: true, inativo: false, lancamento: false, b2b: false, medicamento: true, principioAtivo: 'CALCIO + B12', descricaoComplementar: '', custoNota: 0, precoVenda: 0, custoAdicional: 0, comissao: 0, freteCompra: 0, descontoMaximo: 0, pmc: 0, precoFabrica: 0, descontoPerc: 0, estoqueMinimo: 10, localizacao: '02' },
  { id: 9113, codigoFabrica: '', descricao: 'ABCALCIUM D3 SAB MORANGO 240ML', un: 'UN', apresentacao: '36X240ML', marca: 'AIRELA', codFabrica: '36X240ML', ean13: '7894164008087', ncm: '21069030', cest: '0000000', fatorCompra: 0, preco: 24.50, estoque: 60, fornecedorId: 4, fornecedor: 'AIRELA', divisaoId: 1, divisao: 'MEDICAMENTOS', pesoBruto: 0.300, pesoLiquido: 0.240, fatorVenda: 1, multiploVendas: 1, controlaLote: true, inativo: false, lancamento: false, b2b: false, medicamento: true, principioAtivo: 'CALCIO + D3', descricaoComplementar: '', custoNota: 0, precoVenda: 0, custoAdicional: 0, comissao: 0, freteCompra: 0, descontoMaximo: 0, pmc: 0, precoFabrica: 0, descontoPerc: 0, estoqueMinimo: 10, localizacao: '02' },
  { id: 9156, codigoFabrica: '', descricao: 'ABCALCIUM KIDS SAB MORANGO 240ML', un: 'UN', apresentacao: '36X240ML', marca: 'AIRELA', codFabrica: '36X240ML', ean13: '7894164008094', ncm: '21069030', cest: '0000000', fatorCompra: 0, preco: 26.90, estoque: 45, fornecedorId: 4, fornecedor: 'AIRELA', divisaoId: 1, divisao: 'MEDICAMENTOS', pesoBruto: 0.300, pesoLiquido: 0.240, fatorVenda: 1, multiploVendas: 1, controlaLote: false, inativo: false, lancamento: true, b2b: false, medicamento: true, principioAtivo: 'CALCIO', descricaoComplementar: '', custoNota: 0, precoVenda: 0, custoAdicional: 0, comissao: 0, freteCompra: 0, descontoMaximo: 0, pmc: 0, precoFabrica: 0, descontoPerc: 0, estoqueMinimo: 5, localizacao: '02' },
  { id: 7771, codigoFabrica: '', descricao: 'ABCLER FLACONETE SAB ABACAXI 50X10ML', un: 'DP', apresentacao: '12X50X10ML', marca: 'AIRELA', codFabrica: '12X50X10ML', ean13: '7894164004089', ncm: '30039099', cest: '1300401', fatorCompra: 0, preco: 18.30, estoque: 120, fornecedorId: 4, fornecedor: 'AIRELA', divisaoId: 1, divisao: 'MEDICAMENTOS', pesoBruto: 0.600, pesoLiquido: 0.500, fatorVenda: 1, multiploVendas: 1, controlaLote: false, inativo: false, lancamento: false, b2b: true, medicamento: true, principioAtivo: '', descricaoComplementar: '', custoNota: 0, precoVenda: 0, custoAdicional: 0, comissao: 0, freteCompra: 0, descontoMaximo: 0, pmc: 0, precoFabrica: 0, descontoPerc: 0, estoqueMinimo: 0, localizacao: '01' },
  { id: 8502, codigoFabrica: '', descricao: 'ABERALGINA GTS 10ML', un: 'UN', apresentacao: '200X10ML', marca: 'AIRELA', codFabrica: '200X10ML', ean13: '7894164000050', ncm: '30039099', cest: '1300301', fatorCompra: 0, preco: 3.45, estoque: 300, fornecedorId: 4, fornecedor: 'AIRELA', divisaoId: 1, divisao: 'MEDICAMENTOS', pesoBruto: 0.015, pesoLiquido: 0.010, fatorVenda: 1, multiploVendas: 1, controlaLote: false, inativo: false, lancamento: false, b2b: false, medicamento: true, principioAtivo: 'DIPIRONA', descricaoComplementar: '', custoNota: 0, precoVenda: 0, custoAdicional: 0, comissao: 0, freteCompra: 0, descontoMaximo: 0, pmc: 0, precoFabrica: 0, descontoPerc: 0, estoqueMinimo: 20, localizacao: '03' },
];

type MockProduct = typeof mockProdutos[0];

const initialFormData: MockProduct = {
  id: 0, codigoFabrica: '', descricao: '', un: 'UN', apresentacao: '', marca: '', codFabrica: '', ean13: '', ncm: '', cest: '', fatorCompra: 0, preco: 0, estoque: 0, fornecedorId: 0, fornecedor: '', divisaoId: 0, divisao: '', pesoBruto: 0.001, pesoLiquido: 0, fatorVenda: 1, multiploVendas: 1, controlaLote: false, inativo: false, lancamento: false, b2b: false, medicamento: false, principioAtivo: '', descricaoComplementar: '', custoNota: 0, precoVenda: 0, custoAdicional: 0, comissao: 0, freteCompra: 0, descontoMaximo: 0, pmc: 0, precoFabrica: 0, descontoPerc: 0, estoqueMinimo: 0, localizacao: '01',
};

export function ProdutosTab() {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<MockProduct[]>(mockProdutos);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MockProduct | null>(null);
  const [formData, setFormData] = useState<MockProduct>(initialFormData);

  const [filters, setFilters] = useState({
    status: 'ativos' as 'ativos' | 'inativos' | 'todos',
    searchType: 'descricao' as 'descricao' | 'codigo' | 'ean' | 'codFabrica',
    search: '',
    fornecedor: 'all',
    divisao: 'all',
    tipoItem: 'all',
    marca: '',
    cest: '',
    ncm: '',
    pno: '',
    comFoto: false,
    semFoto: false,
    b2b: false,
    excetoB2b: false,
    lancamento: false,
    medicamento: false,
    excetoMedicamento: false,
    buscaTipo: 'contido' as 'inicial' | 'contido',
    similar: '',
    cadastroDe: '',
    cadastroAte: '',
    consolidarEmpresas: false,
  });

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      let result = [...mockProdutos];
      if (filters.status === 'ativos') result = result.filter(p => !p.inativo);
      else if (filters.status === 'inativos') result = result.filter(p => p.inativo);
      if (filters.search) {
        const term = filters.search.toUpperCase();
        if (filters.buscaTipo === 'inicial') {
          result = result.filter(p => p.descricao.toUpperCase().startsWith(term));
        } else {
          result = result.filter(p => p.descricao.toUpperCase().includes(term));
        }
      }
      if (filters.fornecedor !== 'all') result = result.filter(p => String(p.fornecedorId) === filters.fornecedor);
      if (filters.divisao !== 'all') result = result.filter(p => String(p.divisaoId) === filters.divisao);
      if (filters.marca) result = result.filter(p => p.marca.toUpperCase().includes(filters.marca.toUpperCase()));
      if (filters.b2b) result = result.filter(p => p.b2b);
      if (filters.excetoB2b) result = result.filter(p => !p.b2b);
      if (filters.lancamento) result = result.filter(p => p.lancamento);
      if (filters.medicamento) result = result.filter(p => p.medicamento);
      if (filters.excetoMedicamento) result = result.filter(p => !p.medicamento);
      setProdutos(result);
      setLoading(false);
    }, 300);
  };

  const handleClear = () => {
    setFilters({
      status: 'ativos', searchType: 'descricao', search: '', fornecedor: 'all', divisao: 'all', tipoItem: 'all', marca: '', cest: '', ncm: '', pno: '', comFoto: false, semFoto: false, b2b: false, excetoB2b: false, lancamento: false, medicamento: false, excetoMedicamento: false, buscaTipo: 'contido', similar: '', cadastroDe: '', cadastroAte: '', consolidarEmpresas: false,
    });
    setProdutos(mockProdutos);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({ ...initialFormData });
    setDialogOpen(true);
  };

  const openEdit = (p: MockProduct) => {
    setEditingProduct(p);
    setFormData({ ...p });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.descricao.trim()) {
      toast.error('Preencha a descrição do produto');
      return;
    }
    if (editingProduct) {
      setProdutos(prev => prev.map(p => p.id === editingProduct.id ? { ...formData } : p));
      toast.success('Produto atualizado com sucesso');
    } else {
      const newId = Math.max(...produtos.map(p => p.id)) + 1;
      setProdutos(prev => [...prev, { ...formData, id: newId }]);
      toast.success('Produto criado com sucesso');
    }
    setDialogOpen(false);
  };

  const updateFilter = (key: string, value: any) => setFilters(prev => ({ ...prev, [key]: value }));
  const updateForm = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent gap-2">
                  <CardTitle className="cursor-pointer text-base">Filtros</CardTitle>
                  {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>
                <Button size="sm" onClick={handleSearch} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                  Pesquisar
                </Button>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Novo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {/* Row 1: Status, Search type, Search field, Search button */}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-2">
                  <Label className="text-xs">Status</Label>
                  <Select value={filters.status} onValueChange={v => updateFilter('status', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativos">Ativos</SelectItem>
                      <SelectItem value="inativos">Inativos</SelectItem>
                      <SelectItem value="todos">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Buscar por</Label>
                  <Select value={filters.searchType} onValueChange={v => updateFilter('searchType', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="descricao">Descrição</SelectItem>
                      <SelectItem value="codigo">Código</SelectItem>
                      <SelectItem value="ean">EAN</SelectItem>
                      <SelectItem value="codFabrica">Cód. Fábrica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">&nbsp;</Label>
                  <Input className="h-8 text-xs" placeholder="Buscar..." value={filters.search} onChange={e => updateFilter('search', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="col-span-2 flex gap-2 items-center pt-4">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" name="buscaTipo" checked={filters.buscaTipo === 'inicial'} onChange={() => updateFilter('buscaTipo', 'inicial')} className="h-3 w-3" /> Inicial
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" name="buscaTipo" checked={filters.buscaTipo === 'contido'} onChange={() => updateFilter('buscaTipo', 'contido')} className="h-3 w-3" /> Contido
                  </label>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Similar</Label>
                  <Input className="h-8 text-xs" value={filters.similar} onChange={e => updateFilter('similar', e.target.value)} />
                </div>
              </div>

              {/* Row 2: Fornecedor, CEST, Checkboxes */}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-xs">Fornecedor</Label>
                  <Select value={filters.fornecedor} onValueChange={v => updateFilter('fornecedor', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {mockFornecedores.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">CEST</Label>
                  <Input className="h-8 text-xs" value={filters.cest} onChange={e => updateFilter('cest', e.target.value)} />
                </div>
                <div className="col-span-7 flex flex-wrap gap-x-4 gap-y-1 pt-3">
                  {[
                    { key: 'comFoto', label: 'Com foto' },
                    { key: 'semFoto', label: 'Sem foto' },
                    { key: 'b2b', label: 'B2B' },
                    { key: 'lancamento', label: 'Lançamento' },
                    { key: 'excetoB2b', label: 'Exceto B2B' },
                    { key: 'medicamento', label: 'Medicamento' },
                    { key: 'excetoMedicamento', label: 'Exceto Medicamento' },
                    { key: 'consolidarEmpresas', label: 'Consolidar Empresas' },
                  ].map(cb => (
                    <label key={cb.key} className="flex items-center gap-1.5 text-xs">
                      <Checkbox checked={(filters as any)[cb.key]} onCheckedChange={v => updateFilter(cb.key, v)} className="h-3.5 w-3.5" />
                      {cb.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Row 3: Divisoes, NCM, Tipo do item */}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-xs">Divisões</Label>
                  <Select value={filters.divisao} onValueChange={v => updateFilter('divisao', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {mockDivisoes.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.descricao}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">NCM</Label>
                  <Input className="h-8 text-xs" value={filters.ncm} onChange={e => updateFilter('ncm', e.target.value)} placeholder=". ." />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Tipo do Item</Label>
                  <Select value={filters.tipoItem} onValueChange={v => updateFilter('tipoItem', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="mercadoria">Mercadoria para Revenda</SelectItem>
                      <SelectItem value="uso_consumo">Uso e Consumo</SelectItem>
                      <SelectItem value="ativo">Ativo Imobilizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">PNO</Label>
                  <Input className="h-8 text-xs" value={filters.pno} onChange={e => updateFilter('pno', e.target.value)} />
                </div>
              </div>

              {/* Row 4: Marca, Cadastrados em */}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-xs">Marca</Label>
                  <Input className="h-8 text-xs" value={filters.marca} onChange={e => updateFilter('marca', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Cadastrados de</Label>
                  <Input type="date" className="h-8 text-xs" value={filters.cadastroDe} onChange={e => updateFilter('cadastroDe', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">até</Label>
                  <Input type="date" className="h-8 text-xs" value={filters.cadastroAte} onChange={e => updateFilter('cadastroAte', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Listing */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-420px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">S</TableHead>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-14">UN</TableHead>
                  <TableHead className="w-28">Apresentação</TableHead>
                  <TableHead className="w-28">Marca</TableHead>
                  <TableHead className="w-28">Cód.Fábrica</TableHead>
                  <TableHead className="w-32">Ean</TableHead>
                  <TableHead className="w-24">NCM</TableHead>
                  <TableHead className="w-20">CEST</TableHead>
                  <TableHead className="w-20 text-right">Fator Compra</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : produtos.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
                ) : (
                  produtos.map(p => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onDoubleClick={() => openEdit(p)}>
                      <TableCell><Checkbox className="h-3.5 w-3.5" /></TableCell>
                      <TableCell className="text-xs font-mono">{p.id}</TableCell>
                      <TableCell className="text-xs truncate max-w-[300px]">{p.descricao}</TableCell>
                      <TableCell className="text-xs">{p.un}</TableCell>
                      <TableCell className="text-xs">{p.apresentacao}</TableCell>
                      <TableCell className="text-xs">{p.marca}</TableCell>
                      <TableCell className="text-xs">{p.codFabrica}</TableCell>
                      <TableCell className="text-xs font-mono">{p.ean13}</TableCell>
                      <TableCell className="text-xs font-mono">{p.ncm}</TableCell>
                      <TableCell className="text-xs font-mono">{p.cest}</TableCell>
                      <TableCell className="text-xs text-right">{p.fatorCompra}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingProduct ? 'Dados do produto' : 'Novo produto'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="caracteristicas" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="caracteristicas">Características</TabsTrigger>
              <TabsTrigger value="custos">Custos e Dados fiscais</TabsTrigger>
              <TabsTrigger value="complementar">Descrição complementar</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-2">
              {/* Tab: Características */}
              <TabsContent value="caracteristicas" className="mt-0 space-y-4 px-1">
                {/* Row: Código, Cód Fábrica, NCM, CEST */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-2">
                    <Label className="text-xs">Código</Label>
                    <Input className="h-8 text-xs" value={formData.id || ''} disabled />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Código Fábrica</Label>
                    <Input className="h-8 text-xs" value={formData.codigoFabrica} onChange={e => updateForm('codigoFabrica', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">NCM *</Label>
                    <Input className="h-8 text-xs" value={formData.ncm} onChange={e => updateForm('ncm', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">CEST</Label>
                    <Input className="h-8 text-xs" value={formData.cest} onChange={e => updateForm('cest', e.target.value)} />
                  </div>
                  <div className="col-span-3 flex flex-wrap gap-x-3 gap-y-1 pt-3">
                    <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={formData.inativo} onCheckedChange={v => updateForm('inativo', v)} className="h-3.5 w-3.5" />Produto Inativo</label>
                  </div>
                </div>

                {/* Row: EAN, DUN14 */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Label className="text-xs">Código de Barras (Ean)</Label>
                    <Input className="h-8 text-xs" value={formData.ean13} onChange={e => updateForm('ean13', e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Dun14</Label>
                    <Input className="h-8 text-xs" value={formData.codFabrica} onChange={e => updateForm('codFabrica', e.target.value)} />
                  </div>
                  <div className="col-span-4 flex flex-wrap gap-x-3 gap-y-1 pt-3">
                    <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={formData.b2b} onCheckedChange={v => updateForm('b2b', v)} className="h-3.5 w-3.5" />B2B</label>
                    <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={formData.medicamento} onCheckedChange={v => updateForm('medicamento', v)} className="h-3.5 w-3.5" />Medicamento</label>
                    <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={formData.lancamento} onCheckedChange={v => updateForm('lancamento', v)} className="h-3.5 w-3.5" />Lançamento</label>
                  </div>
                </div>

                {/* Row: Tipo do item, Descrição, Marca */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Label className="text-xs font-semibold">Tipo do item *</Label>
                    <Select value={filters.tipoItem} onValueChange={v => updateFilter('tipoItem', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Mercadoria para Revenda</SelectItem>
                        <SelectItem value="uso_consumo">Uso e Consumo</SelectItem>
                        <SelectItem value="ativo">Ativo Imobilizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs font-semibold">Descrição *</Label>
                    <Input className="h-8 text-xs" value={formData.descricao} onChange={e => updateForm('descricao', e.target.value.toUpperCase())} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Marca</Label>
                    <Input className="h-8 text-xs" value={formData.marca} onChange={e => updateForm('marca', e.target.value.toUpperCase())} />
                  </div>
                </div>

                {/* Row: Apresentação, Unidade, Peso, Fator */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">1ª Apresentação</Label>
                    <Input className="h-8 text-xs" value={formData.apresentacao} onChange={e => updateForm('apresentacao', e.target.value.toUpperCase())} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold">Unidade *</Label>
                    <Select value={formData.un} onValueChange={v => updateForm('un', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['UN', 'CX', 'PC', 'KG', 'LT', 'DP', 'FR', 'TB', 'CT'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Peso bruto (KG)</Label>
                    <Input type="number" step="0.001" className="h-8 text-xs" value={formData.pesoBruto} onChange={e => updateForm('pesoBruto', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Fator compra</Label>
                    <Input type="number" className="h-8 text-xs" value={formData.fatorCompra} onChange={e => updateForm('fatorCompra', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3"><div /></div>
                  <div className="col-span-2"><div /></div>
                  <div className="col-span-2">
                    <Label className="text-xs">Peso líquido (KG)</Label>
                    <Input type="number" step="0.001" className="h-8 text-xs" value={formData.pesoLiquido} onChange={e => updateForm('pesoLiquido', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Fator Venda</Label>
                    <Input type="number" className="h-8 text-xs" value={formData.fatorVenda} onChange={e => updateForm('fatorVenda', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                {/* Row: Fornecedor, Divisão, Múltiplo */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs font-semibold">Fornecedor *</Label>
                    <Select value={String(formData.fornecedorId || 'none')} onValueChange={v => {
                      const forn = mockFornecedores.find(f => String(f.id) === v);
                      updateForm('fornecedorId', forn ? forn.id : 0);
                      updateForm('fornecedor', forn ? forn.nome : '');
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {mockFornecedores.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.id} - {f.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs font-semibold">Divisão *</Label>
                    <Select value={String(formData.divisaoId || 'none')} onValueChange={v => {
                      const div = mockDivisoes.find(d => String(d.id) === v);
                      updateForm('divisaoId', div ? div.id : 0);
                      updateForm('divisao', div ? div.descricao : '');
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {mockDivisoes.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.descricao}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Múltiplo de venda (MUV)</Label>
                    <Input type="number" className="h-8 text-xs" value={formData.multiploVendas} onChange={e => updateForm('multiploVendas', parseInt(e.target.value) || 1)} />
                  </div>
                </div>

                {/* Row: Princípio Ativo */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8">
                    <Label className="text-xs">Princípio ativo</Label>
                    <Input className="h-8 text-xs" value={formData.principioAtivo} onChange={e => updateForm('principioAtivo', e.target.value.toUpperCase())} />
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Custos e Dados fiscais */}
              <TabsContent value="custos" className="mt-0 space-y-4 px-1">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs font-semibold">Custo nota *</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs" value={formData.custoNota} onChange={e => updateForm('custoNota', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Preço de venda</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs" value={formData.precoVenda} onChange={e => updateForm('precoVenda', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">PMC</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs" value={formData.pmc} onChange={e => updateForm('pmc', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Pr. Fab.</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs" value={formData.precoFabrica} onChange={e => updateForm('precoFabrica', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">(%) Desconto</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs" value={formData.descontoPerc} onChange={e => updateForm('descontoPerc', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">Custo Adicional</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs" value={formData.custoAdicional} onChange={e => updateForm('custoAdicional', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">(%) Comissão</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs" value={formData.comissao} onChange={e => updateForm('comissao', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">(%) Frete compra</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs" value={formData.freteCompra} onChange={e => updateForm('freteCompra', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">(%) Desconto máximo</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs" value={formData.descontoMaximo} onChange={e => updateForm('descontoMaximo', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3 pt-3">
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox checked={formData.controlaLote} onCheckedChange={v => updateForm('controlaLote', v)} className="h-3.5 w-3.5" />
                      Controlar lotes
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">Estoque mínimo</Label>
                    <Input type="number" className="h-8 text-xs" value={formData.estoqueMinimo} onChange={e => updateForm('estoqueMinimo', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs font-semibold">Localização *</Label>
                    <Input className="h-8 text-xs" value={formData.localizacao} onChange={e => updateForm('localizacao', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Descrição complementar */}
              <TabsContent value="complementar" className="mt-0 px-1">
                <Textarea className="min-h-[200px] text-xs" placeholder="Descrição complementar do produto..." value={formData.descricaoComplementar} onChange={e => updateForm('descricaoComplementar', e.target.value)} />
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>
              {editingProduct ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
