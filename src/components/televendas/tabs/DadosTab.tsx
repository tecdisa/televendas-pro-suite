import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Copy, FolderOpen } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ordersService } from '@/services/ordersService';

export const DadosTab = () => {
  const { selectedOrders, orders, setOrders } = useStore();
  const selectedOrder = orders.find(o => selectedOrders.includes(o.id));

  if (!selectedOrder) {
    return (
      <div className="p-8 text-center border rounded-lg bg-card">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Nenhum Pedido Selecionado</h3>
        <p className="text-muted-foreground">Selecione um pedido na aba Pesquisa para visualizar os detalhes</p>
      </div>
    );
  }

  const handleDuplicate = async () => {
    try {
      const newOrder = await ordersService.duplicate(selectedOrder.id);
      setOrders([...orders, newOrder]);
      toast.success(`Pedido ${newOrder.id} duplicado com sucesso!`);
    } catch (error) {
      toast.error('Erro ao duplicar pedido');
    }
  };

  const handleReopen = () => {
    toast.info('Funcionalidade de reabrir pedido em desenvolvimento');
  };

  const operacaoLabel = selectedOrder.operacaoCodigo || selectedOrder.operacao;
  const representanteCodigo = selectedOrder.representanteCodigo ?? '';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dados do Pedido #{selectedOrder.id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Pedido:</span>
              <p className="text-sm font-semibold">{selectedOrder.id}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Data:</span>
              <p className="text-sm">{new Date(selectedOrder.data).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Especial:</span>
              <p className="text-sm">{selectedOrder.especial ? <Badge variant="secondary">Sim</Badge> : 'Não'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Representante:</span>
              <p className="text-sm">
                {representanteCodigo ? `${representanteCodigo} - ` : ''}
                {selectedOrder.representanteNome || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Cliente:</span>
              <p className="text-sm">{selectedOrder.clienteNome}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Operação:</span>
              <p className="text-sm">{operacaoLabel}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Tabela:</span>
              <p className="text-sm">{selectedOrder.tabela || 'PADRÃO'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Forma Pagamento:</span>
              <p className="text-sm">{selectedOrder.formaPagamento || 'À VISTA'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Prazo:</span>
              <p className="text-sm">{selectedOrder.prazo || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>AV</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>UN</TableHead>
                <TableHead className="text-center">C</TableHead>
                <TableHead className="text-right">Quant.</TableHead>
                <TableHead className="text-right">%Desc</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
              {selectedOrder.itens.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.codigoProduto ?? ''}</TableCell>
                  <TableCell>{item.av}</TableCell>
                  <TableCell>{item.descricao}</TableCell>
                  <TableCell>{item.un}</TableCell>
                  <TableCell className="text-center">{item.c}</TableCell>
                  <TableCell className="text-right">{item.quant}</TableCell>
                  <TableCell className="text-right">{item.descontoPerc.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.preco)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.liquido)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          <div className="mt-6 space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total Bruto:</span>
              <span className="text-sm">{formatCurrency(selectedOrder.totais.bruto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Descontos:</span>
              <span className="text-sm">{formatCurrency(selectedOrder.totais.descontos)} ({selectedOrder.totais.descontosPerc?.toFixed(2) || 0}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">ICMS Repasse:</span>
              <span className="text-sm">{formatCurrency(selectedOrder.totais.icmsRepasse)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total do Pedido:</span>
              <span>{formatCurrency(selectedOrder.totais.liquido)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button variant="outline" onClick={() => toast.info('Verificação de inconsistências em desenvolvimento')} size="sm" className="w-full sm:w-auto">
          <AlertTriangle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Inconsistência</span>
          <span className="sm:hidden">Verificar</span>
        </Button>
        <Button variant="outline" onClick={handleDuplicate} size="sm" className="w-full sm:w-auto">
          <Copy className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Duplicar Pedido</span>
          <span className="sm:hidden">Duplicar</span>
        </Button>
        <Button variant="outline" onClick={handleReopen} size="sm" className="w-full sm:w-auto">
          <FolderOpen className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Reabrir Pedido</span>
          <span className="sm:hidden">Reabrir</span>
        </Button>
      </div>
    </div>
  );
};
