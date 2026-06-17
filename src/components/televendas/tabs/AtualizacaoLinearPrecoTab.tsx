import { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Calculator, Save } from 'lucide-react';
import { toast } from 'sonner';
import { tabelasPrecoService } from '@/services/tabelasPrecoService';
import { metadataService, type Tabela } from '@/services/metadataService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { groupsService, Grupo } from '@/services/groupsService';

interface ItemAjuste {
  produto_id: number;
  codigo_produto: string;
  descricao_produto: string;
  apresentacao: string;
  marca: string;
  preco: number;
  novo_preco: number | null;
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AtualizacaoLinearPrecoTab() {
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);

  const [tabelaId, setTabelaId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [divisaoId, setDivisaoId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [marca, setMarca] = useState('');
  const [percentual, setPercentual] = useState('');

  const [items, setItems] = useState<ItemAjuste[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSalvando, setIsSalvando] = useState(false);
  const [calculado, setCalculado] = useState(false);

  useEffect(() => {
    Promise.all([
      metadataService.getTabelas(),
      suppliersService.getAll('', 1, 1000, 'ativos', true),
      divisionsService.getAll('', undefined, 1, 1000, 'ativos'),
      groupsService.getAll('', 1, 1000, 'ativos'),
    ]).then(([t, f, d, g]) => {
      setTabelas(t);
      setFornecedores(f.data);
      setDivisoes(d.data);
      setGrupos(g.data);
    }).catch(() => toast.error('Erro ao carregar filtros'));
  }, []);

  const loadItems = useCallback(async (tabId: string) => {
    if (!tabId) return;
    setIsLoading(true);
    setCalculado(false);
    try {
      const fId = fornecedorId && fornecedorId !== '_all' ? Number(fornecedorId) : undefined;
      const dId = divisaoId && divisaoId !== '_all' ? Number(divisaoId) : undefined;
      const gId = grupoId && grupoId !== '_all' ? Number(grupoId) : undefined;
      const data = await tabelasPrecoService.listItensAjuste(Number(tabId), {
        fornecedorId: fId,
        divisaoId: dId,
        grupoId: gId,
        marca: marca.trim() || undefined,
      });
      setItems(data.map((r) => ({
        produto_id: r.produto_id,
        codigo_produto: r.codigo_produto,
        descricao_produto: r.descricao_produto,
        apresentacao: r.apresentacao,
        marca: (r as any).marca || '',
        preco: Number(r.preco ?? 0),
        novo_preco: null,
      })));
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar itens');
    } finally {
      setIsLoading(false);
    }
  }, [fornecedorId, divisaoId, grupoId, marca]);

  // Carrega automaticamente ao selecionar tabela
  useEffect(() => {
    if (tabelaId) loadItems(tabelaId);
    else setItems([]);
  }, [tabelaId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCalcular() {
    if (!items.length) { toast.error('Carregue os itens primeiro'); return; }
    const pct = parseFloat(percentual.replace(',', '.'));
    if (isNaN(pct)) { toast.error('Informe o percentual de ajuste'); return; }
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        novo_preco: parseFloat((i.preco * (1 + pct / 100)).toFixed(2)),
      }))
    );
    setCalculado(true);
  }

  async function handleSalvar() {
    if (!calculado || !items.length) { toast.error('Calcule os novos preços antes de salvar'); return; }
    setIsSalvando(true);
    try {
      const updates = items
        .filter((i) => i.novo_preco !== null)
        .map((i) => ({ produto_id: i.produto_id, preco: i.novo_preco! }));
      const result = await tabelasPrecoService.ajusteLinear(Number(tabelaId), updates);
      toast.success(`${result.atualizados} preços atualizados com sucesso`);
      setCalculado(false);
      setItems((prev) => prev.map((i) => ({ ...i, novo_preco: null, preco: i.novo_preco ?? i.preco })));
      setPercentual('');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setIsSalvando(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 border rounded-lg p-4 bg-muted/30">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <Label className="text-xs">Tabela *</Label>
          <Select value={tabelaId} onValueChange={(v) => { setTabelaId(v); setCalculado(false); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione a tabela" />
            </SelectTrigger>
            <SelectContent>
              {tabelas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.descricao}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[180px]">
          <Label className="text-xs">Fornecedor</Label>
          <Select value={fornecedorId} onValueChange={(v) => { setFornecedorId(v); setCalculado(false); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f.fornecedor_id} value={String(f.fornecedor_id)}>{f.nome_fornecedor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[160px]">
          <Label className="text-xs">Divisão</Label>
          <Select value={divisaoId} onValueChange={(v) => { setDivisaoId(v); setCalculado(false); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {divisoes.map((d) => (
                <SelectItem key={d.divisao_id} value={String(d.divisao_id)}>{d.descricao_divisao}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[160px]">
          <Label className="text-xs">Grupo</Label>
          <Select value={grupoId} onValueChange={(v) => { setGrupoId(v); setCalculado(false); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {grupos.map((g) => (
                <SelectItem key={g.grupo_id} value={String(g.grupo_id)}>{g.descricao_grupo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[140px]">
          <Label className="text-xs">Marca</Label>
          <Input className="h-8 text-xs" placeholder="Filtrar por marca" value={marca} onChange={(e) => { setMarca(e.target.value); setCalculado(false); }} />
        </div>

        <Button variant="outline" size="sm" onClick={() => loadItems(tabelaId)} disabled={!tabelaId || isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
          Buscar
        </Button>
      </div>

      {/* Ação de ajuste */}
      <div className="flex items-center gap-3 border rounded-lg p-4 bg-muted/30">
        <Label className="text-sm font-medium whitespace-nowrap">% Ajuste de pr. venda</Label>
        <Input
          className="h-8 w-28 text-xs text-right"
          placeholder="0,00"
          value={percentual}
          onChange={(e) => { setPercentual(e.target.value); setCalculado(false); }}
          onKeyDown={(e) => e.key === 'Enter' && handleCalcular()}
        />
        <Button variant="outline" size="sm" onClick={handleCalcular} disabled={isLoading || !items.length}>
          <Calculator className="h-4 w-4 mr-1" />
          Calcular
        </Button>
        <Button variant="default" size="sm" onClick={handleSalvar} disabled={isSalvando || !calculado || !items.length}>
          {isSalvando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar
        </Button>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">{items.length} produto{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Tabela de preview */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-muted/90 z-10">
            <tr className="border-b">
              <th className="w-20 px-2 py-2 text-left">Código</th>
              <th className="px-2 py-2 text-left">Descrição</th>
              <th className="w-28 px-2 py-2 text-left">Apresentação</th>
              <th className="w-24 px-2 py-2 text-left">Marca</th>
              <th className="w-24 px-2 py-2 text-right">Preço Atual</th>
              <th className="w-24 px-2 py-2 text-right font-semibold">Novo Preço</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : !tabelaId ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-muted-foreground">
                  Selecione uma tabela de preço para começar
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-muted-foreground">
                  Nenhum produto encontrado para os filtros selecionados
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.produto_id} className="border-b hover:bg-muted/30">
                  <td className="px-2 py-1 font-mono text-[11px]">{item.codigo_produto}</td>
                  <td className="px-2 py-1 max-w-0">
                    <span className="block truncate" title={item.descricao_produto}>{item.descricao_produto}</span>
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">{item.apresentacao || '-'}</td>
                  <td className="px-2 py-1 text-muted-foreground">{item.marca || '-'}</td>
                  <td className="px-2 py-1 text-right text-muted-foreground">{fmt(item.preco)}</td>
                  <td className="px-2 py-1 text-right font-medium text-primary">
                    {item.novo_preco !== null ? fmt(item.novo_preco) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
