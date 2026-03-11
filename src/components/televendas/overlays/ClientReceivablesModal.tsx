import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { receivablesService, type Receivable } from '@/services/receivablesService';
import { formatCurrency } from '@/utils/format';

interface ClientReceivablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: number;
}

type Situacao = 'a_receber' | 'recebido' | 'todos';
export const ClientReceivablesModal = ({ open, onOpenChange, clienteId }: ClientReceivablesModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Receivable[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    if (!open || !clienteId) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSelectedIds(new Set());
      try {
        const result = await receivablesService.getByClienteId(clienteId, {
          page: 1,
          limit: 100,
        });
        setData(result);
      } catch (e: any) {
        setError(String(e) || 'Erro ao carregar contas a receber');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, clienteId]);

  const handleToggleSelect = (id: string | number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Calculate totals
  const totalSelecionado = data
    .filter(r => selectedIds.has(r.id ?? r.areceber_id))
    .reduce((sum, r) => sum + (r.saldo || 0), 0);

  const totalGeral = data.reduce((sum, r) => sum + (r.saldo || 0), 0);

  const totalCorrigido = totalGeral;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Conta a Receber</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">{error}</div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Table */}
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">Sel</TableHead>
                    <TableHead className="w-16">Tipo</TableHead>
                    <TableHead className="w-24">Número</TableHead>
                    <TableHead className="w-28">Nosso Número</TableHead>
                    <TableHead className="w-20 text-right">NF</TableHead>
                    <TableHead className="w-28">Emissão</TableHead>
                    <TableHead className="w-28">Vencimento</TableHead>
                    <TableHead className="w-20 text-right">Valor</TableHead>
                    <TableHead className="w-20 text-right">Saldo</TableHead>
                    <TableHead className="w-28">Pagamento</TableHead>
                    <TableHead className="w-20 text-center">Cartório</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length > 0 ? (
                    data.map((item) => (
                      <TableRow 
                        key={item.id ?? item.areceber_id} 
                        className={selectedIds.has(item.id ?? item.areceber_id) ? 'bg-primary/10' : ''}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(item.id ?? item.areceber_id)}
                            onCheckedChange={() => handleToggleSelect(item.id ?? item.areceber_id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{item.documento_tipo?.trim() || '-'}</TableCell>
                        <TableCell className="text-xs">{item.documento_numero ?? '-'}</TableCell>
                        <TableCell className="text-xs truncate max-w-[160px]">{item.nosso_numero_boleto?.trim() || '-'}</TableCell>
                        <TableCell className="text-xs text-right">{item.nf || ''}</TableCell>
                        <TableCell className="text-xs">{formatDate(item.emissao)}</TableCell>
                        <TableCell className="text-xs">{formatDate(item.vencto)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(item.valor || 0)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(item.saldo || 0)}</TableCell>
                        <TableCell className="text-xs">{formatDate(item.datapagto || undefined) || '-'}</TableCell>
                        <TableCell className="text-xs text-center">
                          {item.emcartorio ? 'Sim' : 'Não'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                        Nenhuma conta a receber encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer with filters and totals */}
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t pt-4">
              {/* Totals */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Seleção</label>
                  <Input 
                    readOnly 
                    value={formatCurrency(totalSelecionado)} 
                    className="w-28 h-8 text-right bg-muted/30 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Total</label>
                  <Input 
                    readOnly 
                    value={formatCurrency(totalGeral)} 
                    className="w-28 h-8 text-right bg-muted/30 text-sm"
                  />
                </div>
                <Input 
                  readOnly 
                  value={formatCurrency(totalGeral)} 
                  className="w-28 h-8 text-right bg-primary/10 border-primary text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <div className="flex items-center gap-2">
                <label className="text-sm">Corrigido</label>
                <Input 
                  readOnly 
                  value={formatCurrency(totalCorrigido)} 
                  className="w-28 h-8 text-right bg-muted/30 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
