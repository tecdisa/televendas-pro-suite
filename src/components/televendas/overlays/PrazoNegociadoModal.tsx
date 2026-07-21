import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, CalendarClock } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import type { OrderParcela } from '@/services/ordersService';

interface PrazoNegociadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalPedido: number;
  dataPedido: string; // ISO yyyy-mm-dd, base para sugestão de datas
  numeroParcelasSugerido?: number;
  prazosEmDiasSugerido?: number[];
  parcelasIniciais?: OrderParcela[];
  onConfirm: (parcelas: OrderParcela[]) => void;
}

const addDays = (baseIso: string, dias: number) => {
  const base = baseIso ? new Date(`${baseIso}T00:00:00Z`) : new Date();
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
};

const buildSugestao = (
  totalPedido: number,
  dataPedido: string,
  numeroParcelas?: number,
  prazosEmDias?: number[],
): OrderParcela[] => {
  const n = prazosEmDias && prazosEmDias.length > 0
    ? prazosEmDias.length
    : (numeroParcelas && numeroParcelas > 0 ? numeroParcelas : 1);
  const dias = prazosEmDias && prazosEmDias.length > 0
    ? prazosEmDias
    : Array.from({ length: n }, (_, i) => (i + 1) * 30);

  const valorParcela = Math.floor((totalPedido / n) * 100) / 100;
  const parcelas: OrderParcela[] = Array.from({ length: n }, (_, i) => ({
    parcela: i + 1,
    vencto: addDays(dataPedido, dias[i] ?? (i + 1) * 30),
    valor: valorParcela,
  }));
  // Ajusta a última parcela para fechar exatamente o total (arredondamentos)
  const somaSemUltima = parcelas.slice(0, -1).reduce((s, p) => s + p.valor, 0);
  if (parcelas.length > 0) {
    parcelas[parcelas.length - 1].valor = Math.round((totalPedido - somaSemUltima) * 100) / 100;
  }
  return parcelas;
};

export const PrazoNegociadoModal = ({
  open,
  onOpenChange,
  totalPedido,
  dataPedido,
  numeroParcelasSugerido,
  prazosEmDiasSugerido,
  parcelasIniciais,
  onConfirm,
}: PrazoNegociadoModalProps) => {
  const [parcelas, setParcelas] = useState<OrderParcela[]>([]);

  useEffect(() => {
    if (!open) return;
    if (parcelasIniciais && parcelasIniciais.length > 0) {
      setParcelas(parcelasIniciais.map((p) => ({ ...p })));
    } else {
      setParcelas(buildSugestao(totalPedido, dataPedido, numeroParcelasSugerido, prazosEmDiasSugerido));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalNegociado = parcelas.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
  const diferenca = Math.round((totalNegociado - totalPedido) * 100) / 100;
  const fecha = Math.abs(diferenca) < 0.01;

  const updateParcela = (idx: number, patch: Partial<OrderParcela>) => {
    setParcelas((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const addParcela = () => {
    setParcelas((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          parcela: prev.length + 1,
          vencto: last ? addDays(last.vencto, 30) : addDays(dataPedido, 30),
          valor: 0,
        },
      ];
    });
  };

  const removeParcela = (idx: number) => {
    setParcelas((prev) =>
      prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, parcela: i + 1 })),
    );
  };

  const handleConfirm = () => {
    if (!fecha || parcelas.length === 0) return;
    onConfirm(parcelas);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Prazo Negociado
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Informe as parcelas negociadas com o cliente (data e valor de cada uma). A soma precisa
            fechar com o total do pedido.
          </p>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/80">
                <tr>
                  <th className="px-3 py-2 text-left w-14">Parc.</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="w-10 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {parcelas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhuma parcela definida
                    </td>
                  </tr>
                ) : (
                  parcelas.map((p, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-1.5 font-mono">{p.parcela}</td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={p.vencto}
                          onChange={(e) => updateParcela(idx, { vencto: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="h-8 text-xs text-right"
                          value={p.valor}
                          onChange={(e) => updateParcela(idx, { valor: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeParcela(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Button variant="outline" size="sm" onClick={addParcela}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar parcela
          </Button>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total do pedido</span>
              <span className="font-medium">{formatCurrency(totalPedido)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total negociado</span>
              <span className="font-medium">{formatCurrency(totalNegociado)}</span>
            </div>
            {!fecha && (
              <div className="flex justify-between text-destructive">
                <span>Diferença</span>
                <span className="font-medium">{formatCurrency(diferenca)}</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!fecha || parcelas.length === 0}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
