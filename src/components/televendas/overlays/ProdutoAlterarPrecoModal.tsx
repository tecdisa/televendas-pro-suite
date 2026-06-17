import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { tabelasPrecoService, type PrecoPorProduto } from '@/services/tabelasPrecoService';
import type { Product } from '@/services/productsService';

interface ProdutoAlterarPrecoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: Product | null;
}

type RowDraft = PrecoPorProduto & {
  _precoVenda: string;
  _descontoMaximo: string;
  _comissao: string;
  _despesa: string;
  _lucro: string;
  _frete: string;
  _majoracao: string;
  _quantidadeMinima: string;
  _permiteDebitoCredito: boolean;
  _dirty: boolean;
};

// Larguras fixas das colunas em px
const COL_WIDTHS = {
  tabela:    220,
  despesa:    88,
  lucro:      88,
  comissao:   88,
  frete:      80,
  majoracao:  88,
  preco:     110,
  desconto:   88,
  qtdMin:     80,
  debCred:    72,
} as const;

const TABLE_MIN_WIDTH = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0);

function toRow(p: PrecoPorProduto): RowDraft {
  const precoVenda = p.pvs > 0 ? p.pvs : p.preco;
  return {
    ...p,
    _precoVenda:      precoVenda.toFixed(2).replace('.', ','),
    _descontoMaximo:  (p.desconto_maximo ?? 0).toFixed(2).replace('.', ','),
    _comissao:        (p.comissao ?? 0).toFixed(2).replace('.', ','),
    _despesa:         p.despesa.toFixed(2).replace('.', ','),
    _lucro:           p.lucro.toFixed(2).replace('.', ','),
    _frete:           p.frete.toFixed(2).replace('.', ','),
    _majoracao:       p.majoracao.toFixed(2).replace('.', ','),
    _quantidadeMinima: String(p.quantidade_minima ?? 0),
    _permiteDebitoCredito: p.permite_debito_credito,
    _dirty: false,
  };
}

function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0;
}

// Input numérico reutilizável com formatação no blur
function NumInput({
  value,
  onChange,
  onBlur,
  decimals = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  decimals?: number;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        const formatted = parseDecimal(e.target.value).toFixed(decimals).replace('.', ',');
        onChange(formatted);
        onBlur?.(formatted);
      }}
      className="h-7 text-right text-xs tabular-nums px-1.5"
      style={{ width: '100%' }}
    />
  );
}

export const ProdutoAlterarPrecoModal = ({
  open,
  onOpenChange,
  produto,
}: ProdutoAlterarPrecoModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RowDraft[]>([]);

  useEffect(() => {
    if (!open || !produto) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tabelasPrecoService.getPrecosPorProduto(produto.id);
        setRows(data.map(toRow));
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar preços');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, produto]);

  const updateRow = useCallback(
    (tabelaPrecoId: number, field: keyof RowDraft, value: string | boolean) => {
      setRows((prev) =>
        prev.map((r) =>
          r.tabela_preco_id === tabelaPrecoId
            ? { ...r, [field]: value, _dirty: true }
            : r,
        ),
      );
    },
    [],
  );

  const handleSave = async () => {
    const dirty = rows.filter((r) => r._dirty);
    if (dirty.length === 0) { onOpenChange(false); return; }
    setSaving(true);
    let erros = 0;
    for (const row of dirty) {
      try {
        const precoVenda = parseDecimal(row._precoVenda);
        await tabelasPrecoService.updateItem(row.tabela_preco_id, row.produto_id, {
          pvs:                   precoVenda,
          preco:                 precoVenda,
          desconto_maximo:       parseDecimal(row._descontoMaximo),
          comissao:              parseDecimal(row._comissao),
          despesa:               parseDecimal(row._despesa),
          lucro:                 parseDecimal(row._lucro),
          frete:                 parseDecimal(row._frete),
          majoracao:             parseDecimal(row._majoracao),
          quantidade_minima:     parseInt(row._quantidadeMinima, 10) || 0,
          permite_debito_credito: row._permiteDebitoCredito,
        });
      } catch (e: any) {
        erros++;
        console.error(`Erro ao salvar tabela ${row.tabela_preco_id}:`, e);
      }
    }
    setSaving(false);
    if (erros === 0) {
      toast.success(`${dirty.length} tabela(s) atualizada(s)`);
      onOpenChange(false);
    } else {
      toast.error(`${erros} de ${dirty.length} tabela(s) com erro ao salvar`);
    }
  };

  const custoCompra = rows.length > 0 ? rows[0].custo_compra : null;

  // Estilo de célula de header: altura e alinhamento fixos
  const thStyle = (w: number, align: 'left' | 'right' | 'center' = 'right'): React.CSSProperties => ({
    width: w,
    minWidth: w,
    maxWidth: w,
    textAlign: align,
    padding: '6px 4px',
    fontWeight: 600,
    fontSize: '0.72rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    backgroundColor: 'var(--muted)',
    borderBottom: '1px solid var(--border)',
  });

  // Estilo de célula de body
  const tdStyle = (w: number): React.CSSProperties => ({
    width: w,
    minWidth: w,
    maxWidth: w,
    padding: '3px 4px',
    verticalAlign: 'middle',
    borderBottom: '1px solid var(--border)',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-6xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-base">Alterar preços de venda</DialogTitle>
              {produto && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {produto.codigoProduto} — {produto.descricao}
                </p>
              )}
            </div>
            {custoCompra !== null && (
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Custo de compra</p>
                <p className="text-sm font-semibold tabular-nums">
                  {custoCompra.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                </p>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2 p-5">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-10">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              Produto não encontrado em nenhuma tabela de preço
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  minWidth: TABLE_MIN_WIDTH,
                  width: '100%',
                }}
              >
                <colgroup>
                  <col style={{ width: COL_WIDTHS.tabela }} />
                  <col style={{ width: COL_WIDTHS.despesa }} />
                  <col style={{ width: COL_WIDTHS.lucro }} />
                  <col style={{ width: COL_WIDTHS.comissao }} />
                  <col style={{ width: COL_WIDTHS.frete }} />
                  <col style={{ width: COL_WIDTHS.majoracao }} />
                  <col style={{ width: COL_WIDTHS.preco }} />
                  <col style={{ width: COL_WIDTHS.desconto }} />
                  <col style={{ width: COL_WIDTHS.qtdMin }} />
                  <col style={{ width: COL_WIDTHS.debCred }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thStyle(COL_WIDTHS.tabela,  'left')}>Tabela de Preço</th>
                    <th style={thStyle(COL_WIDTHS.despesa)}>% Desp. Fixa</th>
                    <th style={thStyle(COL_WIDTHS.lucro)}>% Lucro Líq.</th>
                    <th style={thStyle(COL_WIDTHS.comissao)}>% Comissão</th>
                    <th style={thStyle(COL_WIDTHS.frete)}>% Frete</th>
                    <th style={thStyle(COL_WIDTHS.majoracao)}>% Majoração</th>
                    <th style={thStyle(COL_WIDTHS.preco)}>Preço Venda</th>
                    <th style={thStyle(COL_WIDTHS.desconto)}>% Desc. Máx.</th>
                    <th style={thStyle(COL_WIDTHS.qtdMin)}>Qtd. Mín.</th>
                    <th style={thStyle(COL_WIDTHS.debCred, 'center')}>Déb/Créd</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.tabela_preco_id}
                      style={{
                        backgroundColor: row._dirty
                          ? 'color-mix(in srgb, var(--color-amber-400, #fbbf24) 12%, transparent)'
                          : undefined,
                      }}
                    >
                      <td style={tdStyle(COL_WIDTHS.tabela)}>
                        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 600 }}>{row.codigo_tabela_preco}</span>
                          {row.descricao_tabela_preco && (
                            <span style={{ color: 'var(--muted-foreground)', marginLeft: 4, fontSize: '0.72rem' }}>
                              {row.descricao_tabela_preco}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle(COL_WIDTHS.despesa)}>
                        <NumInput
                          value={row._despesa}
                          onChange={(v) => updateRow(row.tabela_preco_id, '_despesa', v)}
                        />
                      </td>
                      <td style={tdStyle(COL_WIDTHS.lucro)}>
                        <NumInput
                          value={row._lucro}
                          onChange={(v) => updateRow(row.tabela_preco_id, '_lucro', v)}
                        />
                      </td>
                      <td style={tdStyle(COL_WIDTHS.comissao)}>
                        <NumInput
                          value={row._comissao}
                          onChange={(v) => updateRow(row.tabela_preco_id, '_comissao', v)}
                        />
                      </td>
                      <td style={tdStyle(COL_WIDTHS.frete)}>
                        <NumInput
                          value={row._frete}
                          onChange={(v) => updateRow(row.tabela_preco_id, '_frete', v)}
                        />
                      </td>
                      <td style={tdStyle(COL_WIDTHS.majoracao)}>
                        <NumInput
                          value={row._majoracao}
                          onChange={(v) => updateRow(row.tabela_preco_id, '_majoracao', v)}
                        />
                      </td>
                      <td style={tdStyle(COL_WIDTHS.preco)}>
                        <NumInput
                          value={row._precoVenda}
                          onChange={(v) => updateRow(row.tabela_preco_id, '_precoVenda', v)}
                        />
                      </td>
                      <td style={tdStyle(COL_WIDTHS.desconto)}>
                        <NumInput
                          value={row._descontoMaximo}
                          onChange={(v) => updateRow(row.tabela_preco_id, '_descontoMaximo', v)}
                        />
                      </td>
                      <td style={tdStyle(COL_WIDTHS.qtdMin)}>
                        <NumInput
                          value={row._quantidadeMinima}
                          onChange={(v) => updateRow(row.tabela_preco_id, '_quantidadeMinima', v)}
                          decimals={0}
                        />
                      </td>
                      <td style={{ ...tdStyle(COL_WIDTHS.debCred), textAlign: 'center' }}>
                        <Checkbox
                          checked={row._permiteDebitoCredito}
                          onCheckedChange={(v) =>
                            updateRow(row.tabela_preco_id, '_permiteDebitoCredito', Boolean(v))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="default" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
