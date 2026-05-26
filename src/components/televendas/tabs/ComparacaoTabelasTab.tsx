import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { tabelasPrecoService, ComparacaoItem } from '@/services/tabelasPrecoService';
import { metadataService, type Tabela } from '@/services/metadataService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { groupsService, Grupo } from '@/services/groupsService';
import { authService } from '@/services/authService';

function fmt2(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface GrupoItem {
  divisao: string;
  itens: ComparacaoItem[];
}

function agrupar(items: ComparacaoItem[]): GrupoItem[] {
  const map = new Map<string, ComparacaoItem[]>();
  for (const item of items) {
    const key = item.divisao || '(Sem divisão)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([divisao, itens]) => ({ divisao, itens }));
}

export function ComparacaoTabelasTab() {
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);

  const [tabelaAId, setTabelaAId] = useState('');
  const [tabelaBId, setTabelaBId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [divisaoId, setDivisaoId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [marca, setMarca] = useState('');

  const [grupos_dados, setGruposDados] = useState<GrupoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tabelaALabel, setTabelaALabel] = useState('A');
  const [tabelaBLabel, setTabelaBLabel] = useState('B');


  useEffect(() => {
    Promise.all([
      metadataService.getTabelas(),
      suppliersService.getAll('', 1, 1000, 'ativos', true),
      divisionsService.getAll('', 1, 1000, 'ativos'),
      groupsService.getAll('', 1, 1000, 'ativos'),
    ]).then(([t, f, d, g]) => {
      setTabelas(t);
      setFornecedores(f.data);
      setDivisoes(d.data);
      setGrupos(g.data);
    }).catch(() => toast.error('Erro ao carregar filtros'));
  }, []);

  async function handleComparar() {
    if (!tabelaAId) { toast.error('Selecione a Tabela A'); return; }
    if (!tabelaBId) { toast.error('Selecione a Tabela B'); return; }
    if (tabelaAId === tabelaBId) { toast.error('As tabelas devem ser diferentes'); return; }

    const labA = tabelas.find((t) => String(t.id) === tabelaAId)?.descricao ?? 'A';
    const labB = tabelas.find((t) => String(t.id) === tabelaBId)?.descricao ?? 'B';
    setTabelaALabel(labA);
    setTabelaBLabel(labB);

    setIsLoading(true);
    try {
      const data = await tabelasPrecoService.comparacaoTabelas(Number(tabelaAId), Number(tabelaBId), {
        fornecedorId: fornecedorId && fornecedorId !== '_all' ? Number(fornecedorId) : undefined,
        divisaoId: divisaoId && divisaoId !== '_all' ? Number(divisaoId) : undefined,
        grupoId: grupoId && grupoId !== '_all' ? Number(grupoId) : undefined,
        marca: marca.trim() || undefined,
      });
      setGruposDados(agrupar(data));
      if (!data.length) toast.info('Nenhum produto encontrado para os filtros selecionados');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao comparar tabelas');
    } finally {
      setIsLoading(false);
    }
  }

  function handleImprimir() {
    if (!grupos_dados.length) { toast.error('Realize a comparação antes de imprimir'); return; }

    const linhasGrupos = grupos_dados.map((g) => {
      const linhasItens = g.itens.map((item) => {
        const corDif = item.dif_reais < 0 ? '#cc0000' : item.dif_reais > 0 ? '#006600' : '#000';
        return `<tr>
          <td style="padding:1px 4px 1px 16px;font-family:monospace">${item.codigo_produto}</td>
          <td style="padding:1px 4px">${item.descricao_produto}</td>
          <td style="padding:1px 4px">${item.apresentacao || ''}</td>
          <td style="padding:1px 4px;text-align:center">${item.un}</td>
          <td style="padding:1px 4px;text-align:right">${fmt2(item.preco_a)}</td>
          <td style="padding:1px 4px;text-align:right;color:#666">${fmt2(item.desconto_a)}</td>
          <td style="padding:1px 4px;text-align:right">${fmt2(item.preco_b)}</td>
          <td style="padding:1px 4px;text-align:right;color:#666">${fmt2(item.desconto_b)}</td>
          <td style="padding:1px 4px;text-align:right;color:${corDif};font-weight:600">${fmt2(item.dif_reais)}</td>
          <td style="padding:1px 4px;text-align:right;color:${corDif};font-weight:600">${fmt2(item.dif_pct)}</td>
        </tr>`;
      }).join('');
      return `<tr><td colspan="10" style="font-weight:bold;padding:6px 4px 2px;font-size:11pt;text-transform:uppercase;border-top:1px solid #ccc">${g.divisao}</td></tr>${linhasItens}`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comparação de Tabelas</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; margin: 0; padding: 10mm; }
        table { width: 100%; border-collapse: collapse; }
        th { border-bottom: 1.5px solid #000; padding: 3px 4px; font-size: 10pt; }
        td { padding: 1px 4px; font-size: 9.5pt; }
        tr:nth-child(even) { background: #f9f9f9; }
        @media print { @page { margin: 10mm; size: A4 landscape; } }
      </style></head><body>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:baseline">
        <div style="font-weight:bold;font-size:11pt">${nomeEmpresa}</div>
        <div style="font-weight:bold;font-size:14pt">COMPARAÇÃO DE TABELAS</div>
        <div style="font-size:10pt">${hoje}</div>
      </div>
      <div style="text-align:center;font-size:9pt;color:#555;margin-bottom:10px">
        A: ${tabelaALabel} &nbsp;|&nbsp; B: ${tabelaBLabel}
      </div>
      <table>
        <thead><tr>
          <th style="text-align:left;width:52px">Produto</th>
          <th style="text-align:left">Descrição</th>
          <th style="text-align:left;width:90px">Apresentação</th>
          <th style="text-align:center;width:30px">UN</th>
          <th style="text-align:right;width:55px">A</th>
          <th style="text-align:right;width:40px">Desc A</th>
          <th style="text-align:right;width:55px">B</th>
          <th style="text-align:right;width:40px">Desc B</th>
          <th style="text-align:right;width:60px">Dif. R$</th>
          <th style="text-align:right;width:44px">(%)</th>
        </tr></thead>
        <tbody>${linhasGrupos}</tbody>
      </table>
      <div style="margin-top:8px;font-size:9pt;color:#555">${totalItens} produto(s)</div>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1100,height=750');
    if (win) { win.document.write(html); win.document.close(); }
  }

  const empresa = authService.getEmpresa();
  const nomeEmpresa = empresa?.nome_empresa ?? '';
  const hoje = new Date().toLocaleDateString('pt-BR');
  const totalItens = grupos_dados.reduce((s, g) => s + g.itens.length, 0);

  return (
    <>
      {/* UI principal */}
      <div className="flex flex-col h-full gap-4 p-4">
        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-4 border rounded-lg p-4 bg-muted/30">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <Label className="text-xs font-semibold">Tabela A *</Label>
            <Select value={tabelaAId} onValueChange={setTabelaAId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione tabela A" />
              </SelectTrigger>
              <SelectContent>
                {tabelas.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[200px]">
            <Label className="text-xs font-semibold">Tabela B *</Label>
            <Select value={tabelaBId} onValueChange={setTabelaBId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione tabela B" />
              </SelectTrigger>
              <SelectContent>
                {tabelas.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <Label className="text-xs">Fornecedor</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
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

          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label className="text-xs">Divisão</Label>
            <Select value={divisaoId} onValueChange={setDivisaoId}>
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

          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label className="text-xs">Grupo</Label>
            <Select value={grupoId} onValueChange={setGrupoId}>
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

          <div className="flex flex-col gap-1 min-w-[120px]">
            <Label className="text-xs">Marca</Label>
            <Input className="h-8 text-xs" placeholder="Filtrar por marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          </div>

          <Button size="sm" onClick={handleComparar} disabled={isLoading || !tabelaAId || !tabelaBId}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
            Comparar
          </Button>

          {grupos_dados.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleImprimir}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
          )}

          {grupos_dados.length > 0 && (
            <span className="text-xs text-muted-foreground self-end pb-1">{totalItens} produto(s)</span>
          )}
        </div>

        {/* Legenda tabelas */}
        {grupos_dados.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground px-1">
            <span><strong>A</strong> = {tabelaALabel}</span>
            <span><strong>B</strong> = {tabelaBLabel}</span>
          </div>
        )}

        {/* Tabela */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
            <thead className="sticky top-0 bg-muted/90 z-10">
              <tr className="border-b">
                <th className="w-20 px-2 py-2 text-left">Produto</th>
                <th className="px-2 py-2 text-left">Descrição</th>
                <th className="w-28 px-2 py-2 text-left">Apresentação</th>
                <th className="w-10 px-2 py-2 text-center">UN</th>
                <th className="w-20 px-2 py-2 text-right">Preço A</th>
                <th className="w-16 px-2 py-2 text-right text-muted-foreground">Desc A</th>
                <th className="w-20 px-2 py-2 text-right">Preço B</th>
                <th className="w-16 px-2 py-2 text-right text-muted-foreground">Desc B</th>
                <th className="w-20 px-2 py-2 text-right">Dif. R$</th>
                <th className="w-16 px-2 py-2 text-right">Dif. %</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="text-center py-16"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
              ) : !tabelaAId || !tabelaBId ? (
                <tr><td colSpan={10} className="text-center py-16 text-muted-foreground">Selecione as duas tabelas e clique em Comparar</td></tr>
              ) : grupos_dados.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16 text-muted-foreground">Nenhum produto encontrado</td></tr>
              ) : (
                grupos_dados.map((g) => (
                  <>
                    <tr key={`h-${g.divisao}`} className="bg-muted/60">
                      <td colSpan={10} className="px-2 py-1 font-semibold uppercase text-[11px] tracking-wide">
                        {g.divisao}
                      </td>
                    </tr>
                    {g.itens.map((item) => (
                      <tr key={item.produto_id} className="border-b hover:bg-muted/20">
                        <td className="px-2 py-0.5 pl-4 font-mono text-[11px]">{item.codigo_produto}</td>
                        <td className="px-2 py-0.5 max-w-0">
                          <span className="block truncate" title={item.descricao_produto}>{item.descricao_produto}</span>
                        </td>
                        <td className="px-2 py-0.5 text-muted-foreground">{item.apresentacao || '-'}</td>
                        <td className="px-2 py-0.5 text-center text-muted-foreground">{item.un}</td>
                        <td className="px-2 py-0.5 text-right">{fmt2(item.preco_a)}</td>
                        <td className="px-2 py-0.5 text-right text-muted-foreground">{fmt2(item.desconto_a)}</td>
                        <td className="px-2 py-0.5 text-right">{fmt2(item.preco_b)}</td>
                        <td className="px-2 py-0.5 text-right text-muted-foreground">{fmt2(item.desconto_b)}</td>
                        <td className={`px-2 py-0.5 text-right font-medium ${item.dif_reais < 0 ? 'text-red-600' : item.dif_reais > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {fmt2(item.dif_reais)}
                        </td>
                        <td className={`px-2 py-0.5 text-right font-medium ${item.dif_pct < 0 ? 'text-red-600' : item.dif_pct > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {fmt2(item.dif_pct)}
                        </td>
                      </tr>
                    ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
