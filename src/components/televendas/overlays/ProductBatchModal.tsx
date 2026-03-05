import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { productsService, type ProductBatch } from '@/services/productsService';
import { format, parseISO } from 'date-fns';

interface ProductBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtoId: number;
  produtoDescricao: string;
  estoqueAtual?: number;
}

export const ProductBatchModal = ({
  open,
  onOpenChange,
  produtoId,
  estoqueAtual = 0,
}: ProductBatchModalProps) => {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !produtoId) return;

    const loadBatches = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await productsService.getLotes(produtoId);
        setBatches(data);
      } catch (e: any) {
        setError(typeof e === 'string' ? e : 'Erro ao carregar lotes');
        setBatches([]);
      } finally {
        setLoading(false);
      }
    };

    loadBatches();
  }, [open, produtoId]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  // Calculate total stock from batches
  const totalFromBatches = batches.reduce((sum, b) => sum + (b.quantidadeAtual ?? b.quantidadeLote ?? 0), 0);
  // Use estoqueAtual if provided and valid, otherwise use total from batches
  const displayStock = typeof estoqueAtual === 'number' && estoqueAtual > 0 ? estoqueAtual : totalFromBatches;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle>Estoque</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          {/* Current stock header */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Estoque atual</span>
            <Input
              readOnly
              value={displayStock.toFixed(0)}
              className="w-24 h-8 text-center bg-muted/50"
            />
          </div>

          {/* Batches table */}
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-medium py-2">Lote</TableHead>
                  <TableHead className="text-primary-foreground font-medium py-2">Validade</TableHead>
                  <TableHead className="text-primary-foreground font-medium py-2 text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-destructive py-4">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      Nenhum lote encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((batch, idx) => (
                    <TableRow key={idx} className="bg-primary/10 hover:bg-primary/20">
                      <TableCell className="py-2">{batch.lote}</TableCell>
                      <TableCell className="py-2">{formatDate(batch.dataValidade)}</TableCell>
                      <TableCell className="py-2 text-right">
                        {(batch.quantidadeAtual ?? batch.quantidadeLote).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
