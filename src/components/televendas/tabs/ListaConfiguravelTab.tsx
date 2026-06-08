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

const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;
type Letra = typeof LETRAS[number];

interface TabelaSlot { letra: Letra; tabelaId: string }

interface MergedItem extends Omit<ListaItem, 'preco' | 'desconto_maximo' | 'pvs'> {
  precos: Partial<Record<Letra, number>>;
  descontos: Partial<Record<Letra, number>>;
  pvsMap: Partial<Record<Letra, number>>;
}

interface GrupoMerged { label: string; itens: MergedItem[] }

const ORDENS: { value: OrdemLista; label: string; agrupador: AgrupadorKey }[] = [
  { value: 'divisao_descricao', label: 'Divisão + Descrição', agrupador: 'divisao' },
  { value: 'marca',             label: 'Marca + Descrição',   agrupador: 'marca' },
  { value: 'fornecedor',        label: 'Fornecedor + Descrição', agrupador: 'fornecedor' },
  { value: 'descricao',         label: 'Descrição',           agrupador: '' },
  { value: 'produto',           label: 'Código do Produto',   agrupador: '' },
];

function agruparMerged(items: MergedItem[], agrupador: AgrupadorKey): GrupoMerged[] {
  if (!agrupador) return [{ label: '', itens: items }];
  const map = new Map<string, MergedItem[]>();
  for (const item of items) {
    const key = (item[agrupador as keyof MergedItem] as string) || '(Sem ' + agrupador + ')';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([label, itens]) => ({ label, itens }));
}

function buildMerged(
  resultsByLetra: Array<{ letra: Letra; items: ListaItem[] }>,
  agrupador: AgrupadorKey,
): GrupoMerged[] {
  const map = new Map<number, MergedItem>();
  for (const { letra, items } of resultsByLetra) {
    for (const item of items) {
      if (!map.has(item.produto_id)) {
        map.set(item.produto_id, {
          produto_id: item.produto_id,
          codigo_produto: item.codigo_produto,
          descricao_produto: item.descricao_produto,
          apresentacao: item.apresentacao,
          un: item.un,
          marca: item.marca,
          codigo_fabrica: item.codigo_fabrica,
          ean13: item.ean13,
          multiplo_de_vendas: item.multiplo_de_vendas,
          estoque: item.estoque,
          divisao: item.divisao,
          grupo: item.grupo,
          fornecedor: item.fornecedor,
          comissao: item.comissao,
          quantidade_minima: item.quantidade_minima,
          permite_bonificacao: item.permite_bonificacao,
          permite_debito_credito: item.permite_debito_credito,
          permite_venda_especial: item.permite_venda_especial,
          produto_em_promocao: item.produto_em_promocao,
          custo: item.custo,
          precos: {},
          descontos: {},
          pvsMap: {},
        });
      }
      const m = map.get(item.produto_id)!;
      m.precos[letra] = item.preco;
      m.descontos[letra] = item.desconto_maximo;
      m.pvsMap[letra] = item.pvs;
    }
  }
  return agruparMerged(Array.from(map.values()), agrupador);
}

function prUnit(item: MergedItem, letra: Letra): number {
  const preco = item.precos[letra] ?? 0;
  const muv = item.multiplo_de_vendas ?? 1;
  return muv > 1 ? preco / muv : preco;
}

export function ListaConfiguravelTab() {
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);

  // Slots de tabelas (A-E)
  const [slots, setSlots] = useState<TabelaSlot[]>(
    LETRAS.map((letra) => ({ letra, tabelaId: '' })),
  );

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
  const [incluir_custo, setIncluirCusto] = useState(false);
  const [preco_final, setPrecoFinal] = useState(false);
  const [comprasApartirDe, setComprasApartirDe] = useState('');
  const [comprasAtivo, setComprasAtivo] = useState(false);

  const [grupos_dados, setGruposDados] = useState<GrupoMerged[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [slotsLabels, setSlotsLabels] = useState<Partial<Record<Letra, string>>>({});

  const empresa = authService.getEmpresa();
  const nomeEmpresa = empresa?.nome_empresa ?? '';
  const hoje = new Date().toLocaleDateString('pt-BR');
  const ordemAtual = ORDENS.find((o) => o.value === ordem) ?? ORDENS[0];
  const slotsAtivos = slots.filter((s) => s.tabelaId !== '');
  const totalItens = grupos_dados.reduce((s, g) => s + g.itens.length, 0);
  const modeloLabel = modelo === 'representante' ? 'Lista Configurável (Representante)' : 'Lista Configurável (Cliente)';

  const fornecedorOptions: MultiSelectOption[] = fornecedores.map((f) => ({ value: String(f.fornecedor_id), label: f.nome_fornecedor }));
  const divisaoOptions: MultiSelectOption[] = divisoes.map((d) => ({ value: String(d.divisao_id), label: d.descricao_divisao }));
  const grupoOptions: MultiSelectOption[] = grupos.map((g) => ({ value: String(g.grupo_id), label: g.descricao_grupo }));

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

  function updateSlot(idx: number, tabelaId: string) {
    setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, tabelaId } : s));
  }

  async function handleListar() {
    if (!slotsAtivos.length) { toast.error('Selecione ao menos uma tabela'); return; }
    setIsLoading(true);
    const filters = {
      fornecedorIds: fornecedorIds.length ? fornecedorIds : undefined,
      excetoFornecedorIds: excetoFornecedorIds.length ? excetoFornecedorIds : undefined,
      divisaoIds: divisaoIds.length ? divisaoIds : undefined,
      excetoDivisaoIds: excetoDivisaoIds.length ? excetoDivisaoIds : undefined,
      grupoIds: grupoIds.length ? grupoIds : undefined,
      marca: marca.trim() || undefined,
      ordem,
      somente_estoque: somente_estoque || undefined,
      somente_promocao: somente_promocao || undefined,
    };
    try {
      const results = await Promise.all(
        slotsAtivos.map(async ({ letra, tabelaId }) => ({
          letra,
          items: await tabelasPrecoService.listaTabelaPreco(Number(tabelaId), filters),
        })),
      );

      // Build labels map
      const labMap: Partial<Record<Letra, string>> = {};
      for (const { letra, tabelaId } of slotsAtivos) {
        labMap[letra] = tabelas.find((t) => String(t.id) === tabelaId)?.descricao ?? tabelaId;
      }
      setSlotsLabels(labMap);

      const merged = buildMerged(results, ordemAtual.agrupador);
      setGruposDados(merged);
      if (!merged.reduce((s, g) => s + g.itens.length, 0))
        toast.info('Nenhum produto encontrado para os filtros selecionados');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar lista');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Impressão ──────────────────────────────────────────────────────────────
  function handleImprimir() {
    if (!grupos_dados.length) { toast.error('Realize a listagem antes de imprimir'); return; }

    const letras = slotsAtivos.map((s) => s.letra);

    const buildHeaderRep = () => {
      const priceCols = letras.map((l) =>
        `<th style="text-align:right;width:56px">Preço&nbsp;${l}</th>
         <th style="text-align:right;width:40px">%Desc&nbsp;${l}</th>
         <th style="text-align:right;width:52px">Pr.Un.&nbsp;${l}</th>
         ${preco_final ? `<th style="text-align:right;width:52px">Pr.Final&nbsp;${l}</th>` : ''}`
      ).join('');
      return `<tr>
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
        ${incluir_custo ? '<th style="text-align:right;width:52px">Custo</th>' : ''}
        ${priceCols}
      </tr>`;
    };

    const buildHeaderCli = () => {
      const priceCols = letras.map((l) =>
        `<th style="text-align:right;width:56px">Pr.Emb.&nbsp;${l}</th>
         <th style="text-align:right;width:52px">Pr.Un.&nbsp;${l}</th>
         ${preco_final ? `<th style="text-align:right;width:52px">Pr.Final&nbsp;${l}</th>` : ''}`
      ).join('');
      return `<tr>
        <th style="text-align:left;width:52px">Produto</th>
        <th style="text-align:left">Descrição</th>
        <th style="text-align:left;width:76px">Apres.</th>
        <th style="text-align:left;width:64px">Marca</th>
        <th style="text-align:left;width:100px">EAN</th>
        <th style="text-align:left;width:64px">Cod.Fab.</th>
        <th style="text-align:center;width:26px">UN</th>
        ${priceCols}
      </tr>`;
    };

    const buildRows = () => grupos_dados.map((g) => {
      const header = g.label
        ? `<tr><td colspan="99" style="font-weight:bold;padding:6px 4px 2px;font-size:10.5pt;border-top:1px solid #ccc;text-transform:uppercase">${g.label}</td></tr>`
        : '';
      const rows = g.itens.map((item) => {
        if (modelo === 'representante') {
          const priceCells = letras.map((l) =>
            `<td style="padding:1px 4px;text-align:right;font-weight:600">${fmt2(item.precos[l] ?? 0)}</td>
             <td style="padding:1px 4px;text-align:right">${fmt2(item.descontos[l] ?? 0)}</td>
             <td style="padding:1px 4px;text-align:right">${fmt2(prUnit(item, l))}</td>
             ${preco_final ? `<td style="padding:1px 4px;text-align:right">${fmt2(item.pvsMap[l] ?? 0)}</td>` : ''}`
          ).join('');
          return `<tr>
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
            ${incluir_custo ? `<td style="padding:1px 4px;text-align:right">${fmt2(item.custo)}</td>` : ''}
            ${priceCells}
          </tr>`;
        } else {
          const priceCells = letras.map((l) =>
            `<td style="padding:1px 4px;text-align:right;font-weight:600">${fmt2(item.precos[l] ?? 0)}</td>
             <td style="padding:1px 4px;text-align:right">${fmt2(prUnit(item, l))}</td>
             ${preco_final ? `<td style="padding:1px 4px;text-align:right">${fmt2(item.pvsMap[l] ?? 0)}</td>` : ''}`
          ).join('');
          return `<tr>
            <td style="padding:1px 6px 1px 16px;font-family:monospace">${item.codigo_produto}</td>
            <td style="padding:1px 4px">${item.descricao_produto}</td>
            <td style="padding:1px 4px">${item.apresentacao || ''}</td>
            <td style="padding:1px 4px">${item.marca || ''}</td>
            <td style="padding:1px 4px;font-family:monospace">${item.ean13 || ''}</td>
            <td style="padding:1px 4px">${item.codigo_fabrica || ''}</td>
            <td style="padding:1px 4px;text-align:center">${item.un}</td>
            ${priceCells}
          </tr>`;
        }
      }).join('');
      return header + rows;
    }).join('');

    const tabelasInfo = letras.map((l) => `${l}: ${slotsLabels[l] ?? ''}`).join(' &nbsp;|&nbsp; ');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${modeloLabel}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:9pt;color:#000;margin:0;padding:0}
        table{width:100%;border-collapse:collapse}
        th{border-bottom:1.5px solid #000;padding:3px 4px;font-size:9pt}
        td{padding:1px 4px;font-size:8.5pt}
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
                <span style="font-size:9pt">${nomeEmpresa}</span>
                <span style="font-weight:bold;font-size:12pt">${modeloLabel}</span>
                <span style="font-size:8.5pt">${hoje}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="99" style="padding:0 4px 5px;font-size:8.5pt;text-align:center;border-bottom:1px solid #ccc">
              ${tabelasInfo} &nbsp;|&nbsp; Ordem: ${ordemAtual.label}
            </td>
          </tr>
          ${modelo === 'representante' ? buildHeaderRep() : buildHeaderCli()}
        </thead>
        <tbody>${buildRows()}</tbody>
      </table>
      <div style="margin-top:6px;font-size:8pt;color:#555">${totalItens} produto(s)</div>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (win) { win.document.write(html); win.document.close(); }
  }

  // ── Excel ──────────────────────────────────────────────────────────────────
  function handleExportarExcel() {
    if (!grupos_dados.length) { toast.error('Realize a listagem antes de exportar'); return; }

    const letras = slotsAtivos.map((s) => s.letra);
    const wb = XLSX.utils.book_new();

    const infoRows: (string | number)[][] = [
      [nomeEmpresa],
      [modeloLabel],
      letras.map((l) => `${l}: ${slotsLabels[l] ?? ''}`),
      [`Ordem: ${ordemAtual.label}`, '', `Data: ${hoje}`],
      [],
    ];

    let header: string[];
    if (modelo === 'representante') {
      const priceCols = letras.flatMap((l) => [
        `Preço ${l}`, `%Desc ${l}`, `Pr.Unit ${l}`,
        ...(preco_final ? [`Pr.Final ${l}`] : []),
      ]);
      header = [
        'Produto', 'Descrição', 'Apresentação', 'UN', 'Marca', 'Cod.Fab', 'Muv', 'Pno', 'DC', '%Com',
        ...(incluir_custo ? ['Custo'] : []),
        ...priceCols,
      ];
    } else {
      const priceCols = letras.flatMap((l) => [
        `Pr.Emb. ${l}`, `Pr.Unit. ${l}`,
        ...(preco_final ? [`Pr.Final ${l}`] : []),
      ]);
      header = ['Produto', 'Descrição', 'Apresentação', 'Marca', 'EAN', 'Cod.Fab.', 'UN', ...priceCols];
    }

    const dataRows: (string | number)[][] = [];
    for (const g of grupos_dados) {
      if (g.label) dataRows.push([g.label]);
      for (const item of g.itens) {
        if (modelo === 'representante') {
          const priceCells = letras.flatMap((l) => [
            item.precos[l] ?? 0, item.descontos[l] ?? 0, prUnit(item, l),
            ...(preco_final ? [item.pvsMap[l] ?? 0] : []),
          ]);
          dataRows.push([
            item.codigo_produto, item.descricao_produto, item.apresentacao, item.un,
            item.marca, item.codigo_fabrica, item.multiplo_de_vendas ?? 1,
            item.permite_bonificacao ? 'P' : 'N',
            item.permite_debito_credito ? 'X' : '',
            item.comissao,
            ...(incluir_custo ? [item.custo] : []),
            ...priceCells,
          ]);
        } else {
          const priceCells = letras.flatMap((l) => [
            item.precos[l] ?? 0, prUnit(item, l),
            ...(preco_final ? [item.pvsMap[l] ?? 0] : []),
          ]);
          dataRows.push([
            item.codigo_produto, item.descricao_produto, item.apresentacao,
            item.marca, item.ean13, item.codigo_fabrica, item.un,
            ...priceCells,
          ]);
        }
      }
    }

    const wsData = [...infoRows, header, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Col widths
    const fixedWidthsRep = [10, 38, 14, 5, 14, 12, 5, 5, 5, 8, ...(incluir_custo ? [12] : [])];
    const priceWidthsRep = letras.flatMap(() => [12, 8, 12, ...(preco_final ? [12] : [])]);
    const fixedWidthsCli = [10, 40, 14, 14, 14, 12, 5];
    const priceWidthsCli = letras.flatMap(() => [12, 12, ...(preco_final ? [12] : [])]);
    ws['!cols'] = (modelo === 'representante'
      ? [...fixedWidthsRep, ...priceWidthsRep]
      : [...fixedWidthsCli, ...priceWidthsCli]
    ).map((wch) => ({ wch }));

    XLSX.utils.book_append_sheet(wb, ws, 'Lista Configurável');
    const fileName = `lista_configuravel_${modelo}_${hoje.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Arquivo Excel exportado com sucesso');
  }

  // ── Contagem de colunas (para colSpan) ────────────────────────────────────
  const nSlots = Math.max(slotsAtivos.length, 1);
  const priceColsPerSlotRep = 3 + (preco_final ? 1 : 0);
  const priceColsPerSlotCli = 2 + (preco_final ? 1 : 0);
  const colCountRep = 10 + (incluir_custo ? 1 : 0) + nSlots * priceColsPerSlotRep;
  const colCountCli = 7 + nSlots * priceColsPerSlotCli;
  const colCount = modelo === 'representante' ? colCountRep : colCountCli;

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 border rounded-lg p-4 bg-muted/30">

        {/* Linha 1: Modelo + Ordenação + Marca + checkboxes */}
        <div className="flex flex-wrap items-end gap-3">
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

          <div className="flex flex-col gap-1 min-w-[180px]">
            <Label className="text-xs">Ordenação</Label>
            <Select value={ordem} onValueChange={(v) => setOrdem(v as OrdemLista)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[120px]">
            <Label className="text-xs">Marca</Label>
            <Input className="h-8 text-xs" placeholder="Filtrar por marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 self-end pb-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer whitespace-nowrap">
              <Checkbox checked={somente_estoque} onCheckedChange={(v) => setSomenteEstoque(Boolean(v))} />
              Somente em estoque
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer whitespace-nowrap">
              <Checkbox checked={somente_promocao} onCheckedChange={(v) => setSomentePromocao(Boolean(v))} />
              Somente em promoção
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer whitespace-nowrap">
              <Checkbox checked={incluir_custo} onCheckedChange={(v) => setIncluirCusto(Boolean(v))} />
              Incluir custo nota
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer whitespace-nowrap">
              <Checkbox checked={preco_final} onCheckedChange={(v) => setPrecoFinal(Boolean(v))} />
              Preço Final (PVS)
            </label>
          </div>
        </div>

        {/* Linha 2: Fornecedor + Divisão + Grupo */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1 min-w-[180px] flex-1 max-w-[260px]">
            <Label className="text-xs">Fornecedor</Label>
            <MultiSelect options={fornecedorOptions} selected={fornecedorIds} onChange={setFornecedorIds} placeholder="Todos" searchPlaceholder="Buscar fornecedor..." />
          </div>
          <div className="flex flex-col gap-1 min-w-[180px] flex-1 max-w-[260px]">
            <Label className="text-xs text-muted-foreground">Exceto Fornecedor</Label>
            <MultiSelect options={fornecedorOptions} selected={excetoFornecedorIds} onChange={setExcetoFornecedorIds} placeholder="Nenhum" searchPlaceholder="Buscar fornecedor..." />
          </div>
          <div className="flex flex-col gap-1 min-w-[160px] flex-1 max-w-[240px]">
            <Label className="text-xs">Divisão</Label>
            <MultiSelect options={divisaoOptions} selected={divisaoIds} onChange={setDivisaoIds} placeholder="Todas" searchPlaceholder="Buscar divisão..." />
          </div>
          <div className="flex flex-col gap-1 min-w-[160px] flex-1 max-w-[240px]">
            <Label className="text-xs text-muted-foreground">Exceto Divisão</Label>
            <MultiSelect options={divisaoOptions} selected={excetoDivisaoIds} onChange={setExcetoDivisaoIds} placeholder="Nenhuma" searchPlaceholder="Buscar divisão..." />
          </div>
          <div className="flex flex-col gap-1 min-w-[140px] flex-1 max-w-[220px]">
            <Label className="text-xs">Grupo</Label>
            <MultiSelect options={grupoOptions} selected={grupoIds} onChange={setGrupoIds} placeholder="Todos" searchPlaceholder="Buscar grupo..." />
          </div>
        </div>

        {/* Linha 3: Compras a partir de */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Compras a partir de</Label>
            <div className="flex items-center gap-2">
              <Checkbox checked={comprasAtivo} onCheckedChange={(v) => setComprasAtivo(Boolean(v))} />
              <Input
                type="date"
                className="h-8 text-xs w-36"
                value={comprasApartirDe}
                onChange={(e) => setComprasApartirDe(e.target.value)}
                disabled={!comprasAtivo}
              />
            </div>
          </div>
        </div>

        {/* Linha 4: Tabelas (A-E) */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs font-semibold">Tabelas *</Label>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot, idx) => (
              <div key={slot.letra} className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground w-4">{slot.letra}</span>
                <Select value={slot.tabelaId || '__none__'} onValueChange={(v) => updateSlot(idx, v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs w-[200px]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {tabelas.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleListar} disabled={isLoading || !slotsAtivos.length}>
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
          <strong>{modeloLabel}</strong>
          {slotsAtivos.map((s) => (
            <span key={s.letra}> &nbsp;|&nbsp; <strong>{s.letra}:</strong> {slotsLabels[s.letra]}</span>
          ))}
          &nbsp;|&nbsp; Ordem: {ordemAtual.label}
        </div>
      )}

      {/* Tabela */}
      <div className="flex-1 overflow-auto border rounded-lg">
        {modelo === 'representante' ? (
          <table className="w-full text-xs border-collapse" style={{ minWidth: 800 + slotsAtivos.length * 320 }}>
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
                {incluir_custo && <th className="w-20 px-2 py-2 text-right bg-amber-50 dark:bg-amber-950/30">Custo</th>}
                {slotsAtivos.map((s) => (
                  <>
                    <th key={`p${s.letra}`} className="w-20 px-2 py-2 text-right font-semibold">Preço&nbsp;{s.letra}</th>
                    <th key={`d${s.letra}`} className="w-14 px-2 py-2 text-right">%Desc&nbsp;{s.letra}</th>
                    <th key={`u${s.letra}`} className="w-20 px-2 py-2 text-right">Pr.Un.&nbsp;{s.letra}</th>
                    {preco_final && <th key={`f${s.letra}`} className="w-20 px-2 py-2 text-right text-blue-600">PVS&nbsp;{s.letra}</th>}
                  </>
                ))}
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        ) : (
          <table className="w-full text-xs border-collapse" style={{ minWidth: 600 + slotsAtivos.length * 200 }}>
            <thead className="sticky top-0 bg-muted/90 z-10">
              <tr className="border-b">
                <th className="w-20 px-2 py-2 text-left">Produto</th>
                <th className="px-2 py-2 text-left">Descrição</th>
                <th className="w-24 px-2 py-2 text-left">Apres.</th>
                <th className="w-20 px-2 py-2 text-left">Marca</th>
                <th className="w-32 px-2 py-2 text-left">EAN</th>
                <th className="w-24 px-2 py-2 text-left">Cod.Fab.</th>
                <th className="w-8 px-2 py-2 text-center">UN</th>
                {slotsAtivos.map((s) => (
                  <>
                    <th key={`p${s.letra}`} className="w-20 px-2 py-2 text-right font-semibold">Pr.Emb.&nbsp;{s.letra}</th>
                    <th key={`u${s.letra}`} className="w-20 px-2 py-2 text-right">Pr.Un.&nbsp;{s.letra}</th>
                    {preco_final && <th key={`f${s.letra}`} className="w-20 px-2 py-2 text-right text-blue-600">PVS&nbsp;{s.letra}</th>}
                  </>
                ))}
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        )}
      </div>
    </div>
  );

  function renderRows() {
    if (isLoading)
      return <tr><td colSpan={colCount} className="text-center py-16"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>;
    if (!slotsAtivos.length)
      return <tr><td colSpan={colCount} className="text-center py-16 text-muted-foreground">Selecione ao menos uma tabela e clique em Listar</td></tr>;
    if (!grupos_dados.length)
      return <tr><td colSpan={colCount} className="text-center py-16 text-muted-foreground">Nenhum produto encontrado</td></tr>;

    const letras = slotsAtivos.map((s) => s.letra);

    return grupos_dados.map((g, gi) => (
      <>
        {g.label && (
          <tr key={`h-${gi}`} className="bg-muted/60">
            <td colSpan={colCount} className="px-2 py-1 font-semibold uppercase text-[11px] tracking-wide">{g.label}</td>
          </tr>
        )}
        {g.itens.map((item) =>
          modelo === 'representante' ? (
            <tr key={item.produto_id} className="border-b hover:bg-muted/20">
              <td className="px-2 py-0.5 pl-4 font-mono text-[11px]">{item.codigo_produto}</td>
              <td className="px-2 py-0.5 max-w-0"><span className="block truncate" title={item.descricao_produto}>{item.descricao_produto}</span></td>
              <td className="px-2 py-0.5 text-muted-foreground">{item.apresentacao || '-'}</td>
              <td className="px-2 py-0.5 text-center text-muted-foreground">{item.un}</td>
              <td className="px-2 py-0.5 text-muted-foreground">{item.marca || '-'}</td>
              <td className="px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{item.codigo_fabrica || '-'}</td>
              <td className="px-2 py-0.5 text-right text-muted-foreground">{item.multiplo_de_vendas ?? 1}</td>
              <td className="px-2 py-0.5 text-center font-medium">{item.permite_bonificacao ? 'P' : 'N'}</td>
              <td className="px-2 py-0.5 text-center text-muted-foreground">{item.permite_debito_credito ? 'X' : ''}</td>
              <td className="px-2 py-0.5 text-right text-muted-foreground">{fmt2(item.comissao)}</td>
              {incluir_custo && <td className="px-2 py-0.5 text-right bg-amber-50/50 dark:bg-amber-950/20">{fmt2(item.custo)}</td>}
              {letras.map((l) => (
                <>
                  <td key={`p${l}`} className="px-2 py-0.5 text-right font-semibold">{item.precos[l] !== undefined ? fmt2(item.precos[l]!) : '—'}</td>
                  <td key={`d${l}`} className="px-2 py-0.5 text-right text-muted-foreground">{item.descontos[l] !== undefined ? fmt2(item.descontos[l]!) : '—'}</td>
                  <td key={`u${l}`} className="px-2 py-0.5 text-right text-muted-foreground">{item.precos[l] !== undefined ? fmt2(prUnit(item, l)) : '—'}</td>
                  {preco_final && <td key={`f${l}`} className="px-2 py-0.5 text-right text-blue-600">{item.pvsMap[l] !== undefined ? fmt2(item.pvsMap[l]!) : '—'}</td>}
                </>
              ))}
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
              {letras.map((l) => (
                <>
                  <td key={`p${l}`} className="px-2 py-0.5 text-right font-semibold">{item.precos[l] !== undefined ? fmt2(item.precos[l]!) : '—'}</td>
                  <td key={`u${l}`} className="px-2 py-0.5 text-right text-muted-foreground">{item.precos[l] !== undefined ? fmt2(prUnit(item, l)) : '—'}</td>
                  {preco_final && <td key={`f${l}`} className="px-2 py-0.5 text-right text-blue-600">{item.pvsMap[l] !== undefined ? fmt2(item.pvsMap[l]!) : '—'}</td>}
                </>
              ))}
            </tr>
          )
        )}
      </>
    ));
  }
}
