import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, FileSpreadsheet, Search, Layers, Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { tabelasPrecoService, TabelaPreco, TabelaPrecoItem } from '@/services/tabelasPrecoService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { authService } from '@/services/authService';

function fmt2(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RelatorioEscalaTab() {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);
  const [tabelaId, setTabelaId] = useState('');
  const [escalaFiltro, setEscalaFiltro] = useState<'todos' | 'com' | 'sem'>('todos');
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [fornecedorId, setFornecedorId] = useState('all');
  const [divisaoId, setDivisaoId] = useState('all');
  const [marca, setMarca] = useState('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<TabelaPrecoItem[]>([]);
  const [tabelaNome, setTabelaNome] = useState('');

  useEffect(() => {
    const empresa = authService.getEmpresa();
    if (!empresa) return;

    tabelasPrecoService.getAll('', 1, 500).then((r) => setTabelas(r.data)).catch(() => {});
    suppliersService.getAll('', 1, 500).then((r) => setFornecedores(r.data)).catch(() => {});
    divisionsService.getAll(undefined, undefined, 1, 500).then((r) => setDivisoes(r.data)).catch(() => {});
  }, []);

  const handleBuscar = async () => {
    if (!tabelaId) {
      toast.error('Selecione uma tabela de preço');
      return;
    }
    setLoading(true);
    setItens([]);
    try {
      const all: TabelaPrecoItem[] = [];
      let page = 1;
      const PAGE = 500;
      while (true) {
        const result = await tabelasPrecoService.getItens(Number(tabelaId), busca, page, PAGE, {
          status: 'todos',
          fornecedorId: fornecedorId !== 'all' ? Number(fornecedorId) : undefined,
          divisaoId: divisaoId !== 'all' ? Number(divisaoId) : undefined,
          marca: marca || undefined,
          escala: escalaFiltro !== 'todos' ? escalaFiltro : undefined,
        });
        all.push(...result.data);
        if (result.data.length < PAGE) break;
        page++;
      }
      setItens(all);
      const tabela = tabelas.find((t) => String(t.tabela_preco_id) === tabelaId);
      setTabelaNome(tabela ? `${tabela.codigo_tabela_preco} — ${tabela.descricao_tabela_preco}` : '');
      if (all.length === 0) toast.info('Nenhum produto encontrado');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = () => {
    if (!itens.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    const rows: Record<string, any>[] = [];
    for (const i of itens) {
      rows.push({
        Produto: i.codigo_produto,
        Descrição: i.descricao_produto,
        Apresentação: i.apresentacao,
        UN: i.un,
        Marca: i.marca,
        Divisão: i.divisao,
        Fornecedor: i.fornecedor,
        'Preço Venda': i.preco,
        Estoque: i.estoque,
        'Tem Escala': i.has_escala ? 'SIM' : 'NÃO',
        'Qtd Mín. Escala': '',
        'Desconto Escala (%)': '',
        'Comissão Escala (%)': '',
      });
      if (i.escala_tiers?.length) {
        for (const t of i.escala_tiers) {
          rows.push({
            Produto: '',
            Descrição: '',
            Apresentação: '',
            UN: '',
            Marca: '',
            Divisão: '',
            Fornecedor: '',
            'Preço Venda': '',
            Estoque: '',
            'Tem Escala': '',
            'Qtd Mín. Escala': t.quantidade,
            'Desconto Escala (%)': t.desconto,
            'Comissão Escala (%)': t.comissao,
          });
        }
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Escalonado');

    const filtroLabel = escalaFiltro === 'com' ? '_com_escala' : escalaFiltro === 'sem' ? '_sem_escala' : '';
    XLSX.writeFile(wb, `relatorio_escalonado${filtroLabel}.xlsx`);
  };

  const handleImprimir = () => {
    if (!itens.length) {
      toast.error('Nenhum dado para imprimir');
      return;
    }

    const rows = itens.map((item) => {
      const tiers = item.escala_tiers ?? [];
      return `
        <tr class="produto-row${item.has_escala ? ' com-escala' : ''}">
          <td class="mono">${item.codigo_produto}</td>
          <td>${item.descricao_produto}${item.produto_inativo ? ' <span class="inativo">(inativo)</span>' : ''}</td>
          <td>${item.apresentacao}</td>
          <td>${item.un}</td>
          <td>${item.marca}</td>
          <td>${item.divisao}</td>
          <td>${item.fornecedor}</td>
          <td class="num">${fmt2(item.preco)}</td>
          <td class="num">${item.estoque}</td>
          <td class="center escala-badge">${item.has_escala ? `SIM (${tiers.length})` : 'NÃO'}</td>
        </tr>
        ${tiers.map((t) => `
        <tr class="tier-row">
          <td colspan="7" class="tier-desc">↳ Qtd ≥ ${t.quantidade}</td>
          <td class="num tier-val">${fmt2(t.desconto)}% desc.</td>
          <td class="num tier-val">${fmt2(t.comissao)}% com.</td>
          <td></td>
        </tr>`).join('')}
      `;
    }).join('');

    const filtroLabel = escalaFiltro === 'com' ? 'Com escalonado' : escalaFiltro === 'sem' ? 'Sem escalonado' : 'Todos';
    const dataHora = new Date().toLocaleString('pt-BR');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Produtos Escalonados — ${tabelaNome}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; padding: 16px; }
    h1 { font-size: 14px; margin-bottom: 4px; }
    .meta { font-size: 9px; color: #555; margin-bottom: 10px; display: flex; gap: 20px; flex-wrap: wrap; }
    .stats { font-size: 9px; margin-bottom: 8px; display: flex; gap: 16px; }
    .stats span { padding: 2px 6px; border-radius: 3px; }
    .stats .total { background: #f3f4f6; }
    .stats .com { background: #dbeafe; color: #1d4ed8; }
    .stats .sem { background: #f9fafb; color: #555; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; text-align: left; padding: 4px 6px; border: 1px solid #d1d5db; font-size: 9px; font-weight: 600; }
    td { padding: 3px 6px; border: 1px solid #e5e7eb; vertical-align: middle; }
    .mono { font-family: monospace; }
    .num { text-align: right; font-family: monospace; }
    .center { text-align: center; }
    .inativo { color: #ef4444; font-size: 8px; }
    .com-escala { background: #eff6ff; }
    .escala-badge { font-weight: 600; color: #1d4ed8; }
    .tier-row td { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; font-size: 9px; }
    .tier-desc { padding-left: 20px; font-style: italic; }
    .tier-val { text-align: right; font-family: monospace; }
    @media print {
      body { padding: 8px; }
      @page { margin: 1cm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <h1>Produtos Escalonados</h1>
  <div class="meta">
    <span>Tabela: <strong>${tabelaNome}</strong></span>
    <span>Filtro: <strong>${filtroLabel}</strong></span>
    <span>Gerado em: <strong>${dataHora}</strong></span>
  </div>
  <div class="stats">
    <span class="total">Total: <strong>${itens.length}</strong></span>
    <span class="com">Com escala: <strong>${itens.filter((i) => i.has_escala).length}</strong></span>
    <span class="sem">Sem escala: <strong>${itens.filter((i) => !i.has_escala).length}</strong></span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Produto</th><th>Descrição</th><th>Apres.</th><th>UN</th>
        <th>Marca</th><th>Divisão</th><th>Fornecedor</th>
        <th style="text-align:right">Preço Venda</th>
        <th style="text-align:right">Estoque</th>
        <th style="text-align:center">Escalonado</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1100,height=750');
    if (!win) { toast.error('Permita popups para imprimir'); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  };

  const labelEscala = (item: (typeof itens)[0]) =>
    item.has_escala ? (
      <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
        <Layers className="h-3.5 w-3.5" /> SIM ({item.escala_tiers?.length ?? 0})
      </span>
    ) : (
      <span className="text-muted-foreground">NÃO</span>
    );

  const comEscala = itens.filter((i) => i.has_escala).length;
  const semEscala = itens.filter((i) => !i.has_escala).length;

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Relatório de Produtos com/sem Escalonado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Tabela de Preço *</label>
              <Select value={tabelaId} onValueChange={setTabelaId}>
                <SelectTrigger className="h-8 text-sm w-72">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tabelas.map((t) => (
                    <SelectItem key={t.tabela_preco_id} value={String(t.tabela_preco_id)}>
                      {t.codigo_tabela_preco} — {t.descricao_tabela_preco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Escalonado</label>
              <Select value={escalaFiltro} onValueChange={(v) => setEscalaFiltro(v as any)}>
                <SelectTrigger className="h-8 text-sm w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com">Com escalonado</SelectItem>
                  <SelectItem value="sem">Sem escalonado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Fornecedor</label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger className="h-8 text-sm w-52">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
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

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Divisão</label>
              <Select value={divisaoId} onValueChange={setDivisaoId}>
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
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

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Marca</label>
              <Input
                className="h-8 text-sm w-32"
                placeholder="Marca..."
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Busca</label>
              <Input
                className="h-8 text-sm w-44"
                placeholder="Código ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              />
            </div>

            <Button className="h-8" onClick={handleBuscar} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
              Buscar
            </Button>

            <Button variant="outline" className="h-8" onClick={handleExportar} disabled={!itens.length}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Exportar Excel
            </Button>

            <Button variant="outline" className="h-8" onClick={handleImprimir} disabled={!itens.length}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
          </div>

          {itens.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Tabela: <strong>{tabelaNome}</strong>
              </span>
              <span className="text-muted-foreground">
                Total: <strong>{itens.length}</strong> produto(s)
              </span>
              <span className="text-blue-600">
                Com escala: <strong>{comEscala}</strong>
              </span>
              <span className="text-muted-foreground">
                Sem escala: <strong>{semEscala}</strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {itens.length > 0 && (
        <div className="border rounded overflow-auto max-h-[calc(100vh-320px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/90 z-10">
              <TableRow>
                <TableHead className="w-20">Produto</TableHead>
                <TableHead className="min-w-[280px]">Descrição</TableHead>
                <TableHead className="w-24">Apres.</TableHead>
                <TableHead className="w-12">UN</TableHead>
                <TableHead className="w-28">Marca</TableHead>
                <TableHead className="w-36">Divisão</TableHead>
                <TableHead className="w-44">Fornecedor</TableHead>
                <TableHead className="w-28 text-right">Preço Venda</TableHead>
                <TableHead className="w-20 text-right">Estoque</TableHead>
                <TableHead className="w-28 text-center">Escalonado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <>
                  <TableRow key={item.produto_id} className={item.has_escala ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}>
                    <TableCell className="text-xs font-mono">{item.codigo_produto}</TableCell>
                    <TableCell className="text-xs">
                      <div>{item.descricao_produto}</div>
                      {item.produto_inativo && <span className="text-[10px] text-red-500">(inativo)</span>}
                    </TableCell>
                    <TableCell className="text-xs">{item.apresentacao}</TableCell>
                    <TableCell className="text-xs">{item.un}</TableCell>
                    <TableCell className="text-xs">{item.marca}</TableCell>
                    <TableCell className="text-xs">{item.divisao}</TableCell>
                    <TableCell className="text-xs">{item.fornecedor}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt2(item.preco)}</TableCell>
                    <TableCell className="text-xs text-right">{item.estoque}</TableCell>
                    <TableCell className="text-xs text-center">{labelEscala(item)}</TableCell>
                  </TableRow>
                  {item.escala_tiers?.map((tier, idx) => (
                    <TableRow key={`${item.produto_id}-tier-${idx}`} className="bg-blue-50/70 dark:bg-blue-950/30 border-t-0">
                      <TableCell colSpan={7} className="text-xs text-blue-700 dark:text-blue-300 pl-8 py-1 font-mono">
                        ↳ Qtd ≥ {tier.quantidade}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-blue-700 dark:text-blue-300 py-1">
                        {fmt2(tier.desconto)}% desc.
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-blue-700 dark:text-blue-300 py-1">
                        {fmt2(tier.comissao)}% com.
                      </TableCell>
                      <TableCell className="py-1" />
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
