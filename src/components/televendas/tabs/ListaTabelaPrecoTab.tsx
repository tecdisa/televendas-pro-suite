import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Printer, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { tabelasPrecoService, ListaItem, OrdemLista } from '@/services/tabelasPrecoService';
import { metadataService, type Tabela } from '@/services/metadataService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { groupsService, Grupo } from '@/services/groupsService';
import { authService } from '@/services/authService';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import * as XLSX from 'xlsx';

function fmt2(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type AgrupadorKey = 'divisao' | 'marca' | 'fornecedor' | 'grupo' | '';

interface GrupoItem { label: string; itens: ListaItem[] }

const ORDENS: { value: OrdemLista; label: string; agrupador: AgrupadorKey }[] = [
  { value: 'divisao_descricao', label: 'Divisão + Descrição', agrupador: 'divisao' },
  { value: 'marca',             label: 'Marca + Descrição',   agrupador: 'marca' },
  { value: 'fornecedor',        label: 'Fornecedor + Descrição', agrupador: 'fornecedor' },
  { value: 'descricao',         label: 'Descrição',           agrupador: '' },
  { value: 'produto',           label: 'Código do Produto',   agrupador: '' },
];

function agrupar(items: ListaItem[], agrupador: AgrupadorKey): GrupoItem[] {
  if (!agrupador) return [{ label: '', itens: items }];
  const map = new Map<string, ListaItem[]>();
  for (const item of items) {
    const key = (item[agrupador] as string) || '(Sem ' + agrupador + ')';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([label, itens]) => ({ label, itens }));
}

export function ListaTabelaPrecoTab() {
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);

  const [tabelaId, setTabelaId] = useState('');
  const [fornecedorIds, setFornecedorIds] = useState<string[]>([]);
  const [divisaoIds, setDivisaoIds] = useState<string[]>([]);
  const [grupoIds, setGrupoIds] = useState<string[]>([]);
  const [marca, setMarca] = useState('');
  const [ordem, setOrdem] = useState<OrdemLista>('divisao_descricao');
  const [somente_estoque, setSomenteEstoque] = useState(false);
  const [somente_promocao, setSomentePromocao] = useState(false);

  const [grupos_dados, setGruposDados] = useState<GrupoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tabelaLabel, setTabelaLabel] = useState('');

  const empresa = authService.getEmpresa();
  const nomeEmpresa = empresa?.nome_empresa ?? '';
  const hoje = new Date().toLocaleDateString('pt-BR');
  const totalItens = grupos_dados.reduce((s, g) => s + g.itens.length, 0);
  const ordemAtual = ORDENS.find((o) => o.value === ordem) ?? ORDENS[0];

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

  const fornecedorOptions: MultiSelectOption[] = fornecedores.map((f) => ({ value: String(f.fornecedor_id), label: f.nome_fornecedor }));
  const divisaoOptions: MultiSelectOption[] = divisoes.map((d) => ({ value: String(d.divisao_id), label: d.descricao_divisao }));
  const grupoOptions: MultiSelectOption[] = grupos.map((g) => ({ value: String(g.grupo_id), label: g.descricao_grupo }));

  async function handleListar() {
    if (!tabelaId) { toast.error('Selecione a tabela'); return; }
    const lab = tabelas.find((t) => String(t.id) === tabelaId)?.descricao ?? '';
    setTabelaLabel(lab);
    setIsLoading(true);
    try {
      const data = await tabelasPrecoService.listaTabelaPreco(Number(tabelaId), {
        fornecedorIds: fornecedorIds.length ? fornecedorIds : undefined,
        divisaoIds: divisaoIds.length ? divisaoIds : undefined,
        grupoIds: grupoIds.length ? grupoIds : undefined,
        marca: marca.trim() || undefined,
        ordem,
        somente_estoque: somente_estoque || undefined,
        somente_promocao: somente_promocao || undefined,
      });
      setGruposDados(agrupar(data, ordemAtual.agrupador));
      if (!data.length) toast.info('Nenhum produto encontrado para os filtros selecionados');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar lista');
    } finally {
      setIsLoading(false);
    }
  }

  function handleImprimir() {
    if (!grupos_dados.length) { toast.error('Realize a listagem antes de imprimir'); return; }

    const linhas = grupos_dados.map((g) => {
      const header = g.label ? `<tr><td colspan="10" style="font-weight:bold;padding:6px 4px 2px;font-size:11pt;text-transform:uppercase;border-top:1px solid #ccc">${g.label}</td></tr>` : '';
      const rows = g.itens.map((item) => `<tr>
        <td style="padding:1px 4px 1px 16px;font-family:monospace">${item.codigo_produto}</td>
        <td style="padding:1px 4px">${item.descricao_produto}</td>
        <td style="padding:1px 4px">${item.apresentacao || ''}</td>
        <td style="padding:1px 4px;text-align:center">${item.un}</td>
        <td style="padding:1px 4px">${item.marca || ''}</td>
        <td style="padding:1px 4px">${item.codigo_fabrica || ''}</td>
        <td style="padding:1px 4px;text-align:right">${item.multiplo_de_vendas ?? 1}</td>
        <td style="padding:1px 4px;text-align:right">${fmt2(item.comissao)}</td>
        <td style="padding:1px 4px;text-align:right;font-weight:600">${fmt2(item.preco)}</td>
        <td style="padding:1px 4px;text-align:right;color:#666">${fmt2(item.desconto_maximo)}</td>
      </tr>`).join('');
      return header + rows;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lista de Preços</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10pt;color:#000;margin:0;padding:10mm}
        table{width:100%;border-collapse:collapse}
        th{border-bottom:1.5px solid #000;padding:3px 4px;font-size:10pt}
        td{padding:1px 4px;font-size:9.5pt}
        tr:nth-child(even){background:#f9f9f9}
        @media print{@page{margin:10mm;size:A4 landscape}}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:baseline">
        <div style="font-weight:bold;font-size:11pt">${nomeEmpresa}</div>
        <div style="font-weight:bold;font-size:14pt">LISTA DE PREÇOS</div>
        <div style="font-size:10pt">${hoje}</div>
      </div>
      <div style="font-size:9pt;color:#555;margin-bottom:10px">Tabela: <strong>${tabelaLabel}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;Ordem: ${ordemAtual.label}</div>
      <table>
        <thead><tr>
          <th style="text-align:left;width:52px">Produto</th>
          <th style="text-align:left">Descrição</th>
          <th style="text-align:left;width:90px">Apres.</th>
          <th style="text-align:center;width:28px">UN</th>
          <th style="text-align:left;width:70px">Marca</th>
          <th style="text-align:left;width:70px">Cod.Fab</th>
          <th style="text-align:right;width:36px">Muv</th>
          <th style="text-align:right;width:44px">%Com</th>
          <th style="text-align:right;width:60px">Preço</th>
          <th style="text-align:right;width:44px">%Desc</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <div style="margin-top:8px;font-size:9pt;color:#555">${totalItens} produto(s)</div>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1100,height=750');
    if (win) { win.document.write(html); win.document.close(); }
  }

  function handleExportarExcel() {
    if (!grupos_dados.length) { toast.error('Realize a listagem antes de exportar'); return; }

    const wb = XLSX.utils.book_new();
    const infoRows: (string | number)[][] = [
      [nomeEmpresa],
      ['LISTA DE PREÇOS'],
      [`Tabela: ${tabelaLabel}`, '', '', '', `Ordem: ${ordemAtual.label}`],
      [`Data: ${hoje}`],
      [],
    ];

    const header = ['Produto', 'Descrição', 'Apresentação', 'UN', 'Marca', 'Cod.Fab', 'Muv', '%Comissão', 'Preço', '%Desc Máx', 'Estoque'];

    const dataRows: (string | number)[][] = [];
    for (const g of grupos_dados) {
      if (g.label) dataRows.push([g.label, '', '', '', '', '', '', '', '', '', '']);
      for (const item of g.itens) {
        dataRows.push([
          item.codigo_produto,
          item.descricao_produto,
          item.apresentacao,
          item.un,
          item.marca,
          item.codigo_fabrica,
          item.multiplo_de_vendas ?? 1,
          item.comissao,
          item.preco,
          item.desconto_maximo,
          item.estoque,
        ]);
      }
    }

    const wsData = [...infoRows, header, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 10 }, { wch: 40 }, { wch: 16 }, { wch: 6 },
      { wch: 16 }, { wch: 12 }, { wch: 6 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 10 },
    ];

    const dataStartRow = infoRows.length + 1;
    const numCols = [6, 7, 8, 9, 10];
    for (let r = dataStartRow; r < wsData.length; r++) {
      for (const c of numCols) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        if (ws[cellAddr] && typeof ws[cellAddr].v === 'number') {
          ws[cellAddr].t = 'n';
          ws[cellAddr].z = '#,##0.00';
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Preços');
    const fileName = `lista_precos_${tabelaLabel.replace(/\s+/g, '_')}_${hoje.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Arquivo Excel exportado com sucesso');
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 border rounded-lg p-4 bg-muted/30">
        {/* Tabela */}
        <div className="flex flex-col gap-1 min-w-[200px]">
          <Label className="text-xs font-semibold">Tabela *</Label>
          <Select value={tabelaId} onValueChange={setTabelaId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
            <SelectContent>
              {tabelas.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.descricao}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Fornecedor multi */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <Label className="text-xs">Fornecedor</Label>
          <MultiSelect options={fornecedorOptions} selected={fornecedorIds} onChange={setFornecedorIds} placeholder="Todos" searchPlaceholder="Buscar fornecedor..." />
        </div>

        {/* Divisão multi */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <Label className="text-xs">Divisão</Label>
          <MultiSelect options={divisaoOptions} selected={divisaoIds} onChange={setDivisaoIds} placeholder="Todas" searchPlaceholder="Buscar divisão..." />
        </div>

        {/* Grupo multi */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <Label className="text-xs">Grupo</Label>
          <MultiSelect options={grupoOptions} selected={grupoIds} onChange={setGrupoIds} placeholder="Todos" searchPlaceholder="Buscar grupo..." />
        </div>

        {/* Marca */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <Label className="text-xs">Marca</Label>
          <Input className="h-8 text-xs" placeholder="Filtrar por marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
        </div>

        {/* Ordem */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <Label className="text-xs">Ordenação</Label>
          <Select value={ordem} onValueChange={(v) => setOrdem(v as OrdemLista)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ORDENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col gap-1.5 self-end pb-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={somente_estoque} onCheckedChange={(v) => setSomenteEstoque(Boolean(v))} />
            Somente em estoque
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={somente_promocao} onCheckedChange={(v) => setSomentePromocao(Boolean(v))} />
            Somente em promoção
          </label>
        </div>

        {/* Botões */}
        <div className="flex items-end gap-2 self-end">
          <Button size="sm" onClick={handleListar} disabled={isLoading || !tabelaId}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
            Listar
          </Button>
          {grupos_dados.length > 0 && (<>
            <Button variant="outline" size="sm" onClick={handleImprimir}>
              <Printer className="h-4 w-4 mr-1" />Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportarExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
            </Button>
          </>)}
        </div>

        {grupos_dados.length > 0 && (
          <span className="text-xs text-muted-foreground self-end pb-1">{totalItens} produto(s)</span>
        )}
      </div>

      {/* Legenda */}
      {grupos_dados.length > 0 && (
        <div className="text-xs text-muted-foreground px-1">
          Tabela: <strong>{tabelaLabel}</strong> &nbsp;|&nbsp; Ordem: {ordemAtual.label}
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
              <th className="w-8 px-2 py-2 text-center">UN</th>
              <th className="w-24 px-2 py-2 text-left">Marca</th>
              <th className="w-24 px-2 py-2 text-left">Cod.Fab</th>
              <th className="w-12 px-2 py-2 text-right">Muv</th>
              <th className="w-16 px-2 py-2 text-right">%Com</th>
              <th className="w-20 px-2 py-2 text-right font-semibold">Preço</th>
              <th className="w-16 px-2 py-2 text-right text-muted-foreground">%Desc</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-16"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
            ) : !tabelaId ? (
              <tr><td colSpan={10} className="text-center py-16 text-muted-foreground">Selecione uma tabela e clique em Listar</td></tr>
            ) : grupos_dados.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-16 text-muted-foreground">Nenhum produto encontrado</td></tr>
            ) : (
              grupos_dados.map((g, gi) => (
                <>
                  {g.label && (
                    <tr key={`h-${gi}`} className="bg-muted/60">
                      <td colSpan={10} className="px-2 py-1 font-semibold uppercase text-[11px] tracking-wide">{g.label}</td>
                    </tr>
                  )}
                  {g.itens.map((item) => (
                    <tr key={item.produto_id} className="border-b hover:bg-muted/20">
                      <td className="px-2 py-0.5 pl-4 font-mono text-[11px]">{item.codigo_produto}</td>
                      <td className="px-2 py-0.5 max-w-0">
                        <span className="block truncate" title={item.descricao_produto}>{item.descricao_produto}</span>
                      </td>
                      <td className="px-2 py-0.5 text-muted-foreground">{item.apresentacao || '-'}</td>
                      <td className="px-2 py-0.5 text-center text-muted-foreground">{item.un}</td>
                      <td className="px-2 py-0.5 text-muted-foreground">{item.marca || '-'}</td>
                      <td className="px-2 py-0.5 text-muted-foreground font-mono text-[11px]">{item.codigo_fabrica || '-'}</td>
                      <td className="px-2 py-0.5 text-right text-muted-foreground">{item.multiplo_de_vendas ?? 1}</td>
                      <td className="px-2 py-0.5 text-right text-muted-foreground">{fmt2(item.comissao)}</td>
                      <td className="px-2 py-0.5 text-right font-semibold">{fmt2(item.preco)}</td>
                      <td className="px-2 py-0.5 text-right text-muted-foreground">{fmt2(item.desconto_maximo)}</td>
                    </tr>
                  ))}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
