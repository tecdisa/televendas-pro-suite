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

type Modelo = 'representante' | 'cliente';

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

// Pr.Unit = preco / multiplo (quando multiplo > 1)
function prUnit(item: ListaItem) {
  const muv = item.multiplo_de_vendas ?? 1;
  return muv > 1 ? item.preco / muv : item.preco;
}

export function ListaTabelaPrecoTab() {
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);

  const [tabelaId, setTabelaId] = useState('');
  const [modelo, setModelo] = useState<Modelo>('representante');
  const [fornecedorIds, setFornecedorIds] = useState<string[]>([]);
  const [excetoFornecedorIds, setExcetoFornecedorIds] = useState<string[]>([]);
  const [divisaoIds, setDivisaoIds] = useState<string[]>([]);
  const [excetoDivisaoIds, setExcetoDivisaoIds] = useState<string[]>([]);
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
  const modeloLabel = modelo === 'representante' ? 'Lista de Preços (Representante)' : 'Lista de Preços (Cliente)';

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
        excetoFornecedorIds: excetoFornecedorIds.length ? excetoFornecedorIds : undefined,
        divisaoIds: divisaoIds.length ? divisaoIds : undefined,
        excetoDivisaoIds: excetoDivisaoIds.length ? excetoDivisaoIds : undefined,
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

  // ── Impressão ─────────────────────────────────────────────────────────────
  function handleImprimir() {
    if (!grupos_dados.length) { toast.error('Realize a listagem antes de imprimir'); return; }

    const linhas = grupos_dados.map((g) => {
      const header = g.label
        ? `<tr><td colspan="99" style="font-weight:bold;padding:6px 4px 2px;font-size:10.5pt;text-transform:uppercase;border-top:1px solid #ccc">${g.label}</td></tr>`
        : '';

      const rows = modelo === 'representante'
        ? g.itens.map((item) => `<tr>
            <td style="padding:1px 6px 1px 16px;font-family:monospace">${item.codigo_produto}</td>
            <td style="padding:1px 4px">${item.descricao_produto}</td>
            <td style="padding:1px 4px">${item.apresentacao || ''}</td>
            <td style="padding:1px 4px;text-align:center">${item.un}</td>
            <td style="padding:1px 4px">${item.marca || ''}</td>
            <td style="padding:1px 4px">${item.codigo_fabrica || ''}</td>
            <td style="padding:1px 4px;text-align:right">${item.multiplo_de_vendas ?? 1}</td>
            <td style="padding:1px 4px;text-align:center">${item.permite_bonificacao ? 'P' : 'N'}</td>
            <td style="padding:1px 4px;text-align:center">${item.permite_debito_credito ? 'X' : ''}</td>
            <td style="padding:1px 4px;text-align:right">${fmt2(item.comissao)}</td>
            <td style="padding:1px 4px;text-align:right;font-weight:600">${fmt2(item.preco)}</td>
            <td style="padding:1px 4px;text-align:right">${fmt2(item.desconto_maximo)}</td>
            <td style="padding:1px 4px;text-align:right">${fmt2(prUnit(item))}</td>
          </tr>`).join('')
        : g.itens.map((item) => `<tr>
            <td style="padding:1px 6px 1px 16px;font-family:monospace">${item.codigo_produto}</td>
            <td style="padding:1px 4px">${item.descricao_produto}</td>
            <td style="padding:1px 4px">${item.apresentacao || ''}</td>
            <td style="padding:1px 4px">${item.marca || ''}</td>
            <td style="padding:1px 4px;font-family:monospace">${item.ean13 || ''}</td>
            <td style="padding:1px 4px">${item.codigo_fabrica || ''}</td>
            <td style="padding:1px 4px;text-align:center">${item.un}</td>
            <td style="padding:1px 4px;text-align:right;font-weight:600">${fmt2(item.preco)}</td>
            <td style="padding:1px 4px;text-align:right">${fmt2(prUnit(item))}</td>
          </tr>`).join('');

      return header + rows;
    }).join('');

    const theadRep = `<tr>
      <th style="text-align:left;width:52px">Produto</th>
      <th style="text-align:left">Descrição</th>
      <th style="text-align:left;width:76px">Apres.</th>
      <th style="text-align:center;width:26px">UN</th>
      <th style="text-align:left;width:64px">Marca</th>
      <th style="text-align:left;width:64px">Cod.Fab</th>
      <th style="text-align:right;width:32px">Muv</th>
      <th style="text-align:center;width:28px">Pno</th>
      <th style="text-align:center;width:24px">DC</th>
      <th style="text-align:right;width:40px">%Com</th>
      <th style="text-align:right;width:56px">Preço</th>
      <th style="text-align:right;width:40px">%Desc</th>
      <th style="text-align:right;width:52px">Pr.Unit</th>
    </tr>`;

    const theadCli = `<tr>
      <th style="text-align:left;width:52px">Produto</th>
      <th style="text-align:left">Descrição</th>
      <th style="text-align:left;width:76px">Apres.</th>
      <th style="text-align:left;width:64px">Marca</th>
      <th style="text-align:left;width:100px">EAN</th>
      <th style="text-align:left;width:64px">Cod.Fab.</th>
      <th style="text-align:center;width:26px">Un</th>
      <th style="text-align:right;width:56px">Pr.Emb.</th>
      <th style="text-align:right;width:52px">Pr.Unit.</th>
    </tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${modeloLabel}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:9.5pt;color:#000;margin:0;padding:0}
        table{width:100%;border-collapse:collapse}
        th{border-bottom:1.5px solid #000;padding:3px 4px;font-size:9.5pt}
        td{padding:1px 4px;font-size:9pt}
        tbody tr:nth-child(even) td{background:#f9f9f9}
        thead td{border:none!important;background:#fff!important;padding:1px 4px}
        thead{display:table-header-group}
        @page{margin:8mm 8mm 12mm 8mm;size:A4 landscape}
        @page{@bottom-right{content:"Página " counter(page) " / " counter(pages);font-size:8pt;color:#555}}
      </style></head><body>
      <table>
        <thead>
          <tr>
            <td colspan="99" style="padding:4px 4px 1px">
              <div style="display:flex;justify-content:space-between;align-items:baseline">
                <span style="font-size:9.5pt">${nomeEmpresa}</span>
                <span style="font-weight:bold;font-size:13pt">${modeloLabel}</span>
                <span style="font-size:9pt">${hoje}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="99" style="padding:0 4px 5px;font-size:9pt;text-align:center;border-bottom:1px solid #ccc">
              Tabela: <strong>${tabelaLabel}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;Ordem: ${ordemAtual.label}
            </td>
          </tr>
          ${modelo === 'representante' ? theadRep : theadCli}
        </thead>
        <tbody>${linhas}</tbody>
      </table>
      <div style="margin-top:6px;font-size:8.5pt;color:#555">${totalItens} produto(s)</div>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (win) { win.document.write(html); win.document.close(); }
  }

  // ── Excel ─────────────────────────────────────────────────────────────────
  function handleExportarExcel() {
    if (!grupos_dados.length) { toast.error('Realize a listagem antes de exportar'); return; }

    const wb = XLSX.utils.book_new();
    const infoRows: (string | number)[][] = [
      [nomeEmpresa],
      [modeloLabel],
      [`Tabela: ${tabelaLabel}`, '', '', '', `Ordem: ${ordemAtual.label}`],
      [`Data: ${hoje}`],
      [],
    ];

    const headerRep = ['Produto', 'Descrição', 'Apresentação', 'UN', 'Marca', 'Cod.Fab', 'Muv', 'Pno', 'DC', '%Comissão', 'Preço', '%Desc', 'Pr.Unit'];
    const headerCli = ['Produto', 'Descrição', 'Apresentação', 'Marca', 'EAN', 'Cod.Fab.', 'UN', 'Pr.Emb.', 'Pr.Unit.'];

    const dataRows: (string | number)[][] = [];
    for (const g of grupos_dados) {
      if (g.label) dataRows.push([g.label]);
      for (const item of g.itens) {
        if (modelo === 'representante') {
          dataRows.push([
            item.codigo_produto, item.descricao_produto, item.apresentacao, item.un,
            item.marca, item.codigo_fabrica,
            item.multiplo_de_vendas ?? 1,
            item.permite_bonificacao ? 'P' : 'N',
            item.permite_debito_credito ? 'X' : '',
            item.comissao, item.preco, item.desconto_maximo, prUnit(item),
          ]);
        } else {
          dataRows.push([
            item.codigo_produto, item.descricao_produto, item.apresentacao,
            item.marca, item.ean13, item.codigo_fabrica, item.un,
            item.preco, prUnit(item),
          ]);
        }
      }
    }

    const header = modelo === 'representante' ? headerRep : headerCli;
    const wsData = [...infoRows, header, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    if (modelo === 'representante') {
      ws['!cols'] = [{ wch: 10 }, { wch: 38 }, { wch: 14 }, { wch: 5 }, { wch: 14 }, { wch: 12 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 12 }];
    } else {
      ws['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 5 }, { wch: 12 }, { wch: 12 }];
    }

    const numColsRep = [9, 10, 11, 12];
    const numColsCli = [7, 8];
    const numCols = modelo === 'representante' ? numColsRep : numColsCli;
    const dataStartRow = infoRows.length + 1;
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
    const fileName = `lista_precos_${modelo}_${tabelaLabel.replace(/\s+/g, '_')}_${hoje.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Arquivo Excel exportado com sucesso');
  }

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-start gap-3 border rounded-lg p-4 bg-muted/30">

        {/* Linha 1 */}
        <div className="flex flex-wrap items-end gap-3 w-full">
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

          {/* Modelo */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <Label className="text-xs font-semibold">Modelo</Label>
            <Select value={modelo} onValueChange={(v) => setModelo(v as Modelo)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="representante">Modelo Representante</SelectItem>
                <SelectItem value="cliente">Modelo Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ordenação */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <Label className="text-xs">Ordenação</Label>
            <Select value={ordem} onValueChange={(v) => setOrdem(v as OrdemLista)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Marca */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <Label className="text-xs">Marca</Label>
            <Input className="h-8 text-xs" placeholder="Filtrar por marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
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
        </div>

        {/* Linha 2: Fornecedor + Exceto */}
        <div className="flex flex-wrap items-end gap-2 w-full">
          <div className="flex flex-col gap-1 min-w-[180px] flex-1 max-w-[280px]">
            <Label className="text-xs">Fornecedor</Label>
            <MultiSelect options={fornecedorOptions} selected={fornecedorIds} onChange={setFornecedorIds} placeholder="Todos" searchPlaceholder="Buscar fornecedor..." />
          </div>
          <div className="flex flex-col gap-1 min-w-[180px] flex-1 max-w-[280px]">
            <Label className="text-xs text-muted-foreground">Exceto Fornecedor</Label>
            <MultiSelect options={fornecedorOptions} selected={excetoFornecedorIds} onChange={setExcetoFornecedorIds} placeholder="Nenhum" searchPlaceholder="Buscar fornecedor..." />
          </div>

          <div className="flex flex-col gap-1 min-w-[160px] flex-1 max-w-[260px]">
            <Label className="text-xs">Divisão</Label>
            <MultiSelect options={divisaoOptions} selected={divisaoIds} onChange={setDivisaoIds} placeholder="Todas" searchPlaceholder="Buscar divisão..." />
          </div>
          <div className="flex flex-col gap-1 min-w-[160px] flex-1 max-w-[260px]">
            <Label className="text-xs text-muted-foreground">Exceto Divisão</Label>
            <MultiSelect options={divisaoOptions} selected={excetoDivisaoIds} onChange={setExcetoDivisaoIds} placeholder="Nenhuma" searchPlaceholder="Buscar divisão..." />
          </div>

          <div className="flex flex-col gap-1 min-w-[140px] flex-1 max-w-[220px]">
            <Label className="text-xs">Grupo</Label>
            <MultiSelect options={grupoOptions} selected={grupoIds} onChange={setGrupoIds} placeholder="Todos" searchPlaceholder="Buscar grupo..." />
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-2 w-full">
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
            <span className="text-xs text-muted-foreground">{totalItens} produto(s)</span>
          </>)}
        </div>
      </div>

      {/* Legenda */}
      {grupos_dados.length > 0 && (
        <div className="text-xs text-muted-foreground px-1">
          <strong>{modeloLabel}</strong> &nbsp;|&nbsp; Tabela: <strong>{tabelaLabel}</strong> &nbsp;|&nbsp; Ordem: {ordemAtual.label}
        </div>
      )}

      {/* Tabela */}
      <div className="flex-1 overflow-auto border rounded-lg">
        {modelo === 'representante' ? (
          <table className="w-full text-xs border-collapse" style={{ minWidth: 860 }}>
            <thead className="sticky top-0 bg-muted/90 z-10">
              <tr className="border-b">
                <th className="w-20 px-2 py-2 text-left">Produto</th>
                <th className="px-2 py-2 text-left">Descrição</th>
                <th className="w-24 px-2 py-2 text-left">Apres.</th>
                <th className="w-8 px-2 py-2 text-center">UN</th>
                <th className="w-20 px-2 py-2 text-left">Marca</th>
                <th className="w-20 px-2 py-2 text-left">Cod.Fab</th>
                <th className="w-10 px-2 py-2 text-right">Muv</th>
                <th className="w-10 px-2 py-2 text-center" title="Permite Bonificação">Pno</th>
                <th className="w-10 px-2 py-2 text-center" title="Permite Déb/Créd">DC</th>
                <th className="w-14 px-2 py-2 text-right">%Com</th>
                <th className="w-20 px-2 py-2 text-right font-semibold">Preço</th>
                <th className="w-14 px-2 py-2 text-right">%Desc</th>
                <th className="w-20 px-2 py-2 text-right">Pr.Unit</th>
              </tr>
            </thead>
            <tbody>{renderRows('representante')}</tbody>
          </table>
        ) : (
          <table className="w-full text-xs border-collapse" style={{ minWidth: 780 }}>
            <thead className="sticky top-0 bg-muted/90 z-10">
              <tr className="border-b">
                <th className="w-20 px-2 py-2 text-left">Produto</th>
                <th className="px-2 py-2 text-left">Descrição</th>
                <th className="w-24 px-2 py-2 text-left">Apres.</th>
                <th className="w-20 px-2 py-2 text-left">Marca</th>
                <th className="w-32 px-2 py-2 text-left">EAN</th>
                <th className="w-24 px-2 py-2 text-left">Cod.Fab.</th>
                <th className="w-8 px-2 py-2 text-center">UN</th>
                <th className="w-20 px-2 py-2 text-right font-semibold">Pr.Emb.</th>
                <th className="w-20 px-2 py-2 text-right">Pr.Unit.</th>
              </tr>
            </thead>
            <tbody>{renderRows('cliente')}</tbody>
          </table>
        )}
      </div>
    </div>
  );

  function renderRows(m: Modelo) {
    if (isLoading) return <tr><td colSpan={13} className="text-center py-16"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>;
    if (!tabelaId) return <tr><td colSpan={13} className="text-center py-16 text-muted-foreground">Selecione uma tabela e clique em Listar</td></tr>;
    if (grupos_dados.length === 0) return <tr><td colSpan={13} className="text-center py-16 text-muted-foreground">Nenhum produto encontrado</td></tr>;

    return grupos_dados.map((g, gi) => (
      <>
        {g.label && (
          <tr key={`h-${gi}`} className="bg-muted/60">
            <td colSpan={13} className="px-2 py-1 font-semibold uppercase text-[11px] tracking-wide">{g.label}</td>
          </tr>
        )}
        {g.itens.map((item) =>
          m === 'representante' ? (
            <tr key={item.produto_id} className="border-b hover:bg-muted/20">
              <td className="px-2 py-0.5 pl-4 font-mono text-[11px]">{item.codigo_produto}</td>
              <td className="px-2 py-0.5 max-w-0"><span className="block truncate" title={item.descricao_produto}>{item.descricao_produto}</span></td>
              <td className="px-2 py-0.5 text-muted-foreground">{item.apresentacao || '-'}</td>
              <td className="px-2 py-0.5 text-center text-muted-foreground">{item.un}</td>
              <td className="px-2 py-0.5 text-muted-foreground">{item.marca || '-'}</td>
              <td className="px-2 py-0.5 text-muted-foreground font-mono text-[11px]">{item.codigo_fabrica || '-'}</td>
              <td className="px-2 py-0.5 text-right text-muted-foreground">{item.multiplo_de_vendas ?? 1}</td>
              <td className="px-2 py-0.5 text-center font-medium">{item.permite_bonificacao ? 'P' : 'N'}</td>
              <td className="px-2 py-0.5 text-center text-muted-foreground">{item.permite_debito_credito ? 'X' : ''}</td>
              <td className="px-2 py-0.5 text-right text-muted-foreground">{fmt2(item.comissao)}</td>
              <td className="px-2 py-0.5 text-right font-semibold">{fmt2(item.preco)}</td>
              <td className="px-2 py-0.5 text-right text-muted-foreground">{fmt2(item.desconto_maximo)}</td>
              <td className="px-2 py-0.5 text-right text-muted-foreground">{fmt2(prUnit(item))}</td>
            </tr>
          ) : (
            <tr key={item.produto_id} className="border-b hover:bg-muted/20">
              <td className="px-2 py-0.5 pl-4 font-mono text-[11px]">{item.codigo_produto}</td>
              <td className="px-2 py-0.5 max-w-0"><span className="block truncate" title={item.descricao_produto}>{item.descricao_produto}</span></td>
              <td className="px-2 py-0.5 text-muted-foreground">{item.apresentacao || '-'}</td>
              <td className="px-2 py-0.5 text-muted-foreground">{item.marca || '-'}</td>
              <td className="px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{item.ean13 || '-'}</td>
              <td className="px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{item.codigo_fabrica || '-'}</td>
              <td className="px-2 py-0.5 text-center text-muted-foreground">{item.un}</td>
              <td className="px-2 py-0.5 text-right font-semibold">{fmt2(item.preco)}</td>
              <td className="px-2 py-0.5 text-right text-muted-foreground">{fmt2(prUnit(item))}</td>
            </tr>
          )
        )}
      </>
    ));
  }
}
