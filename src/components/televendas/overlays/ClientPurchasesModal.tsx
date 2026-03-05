import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Copy } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { purchasesService, type PurchaseOrder, type PurchaseItem, type PurchaseSummary } from '@/services/purchasesService';
import { formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

interface ClientPurchasesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: number;
  clienteNome?: string;
  onDuplicateOrder?: (order: PurchaseOrder) => void;
}

export const ClientPurchasesModal = ({ 
  open, 
  onOpenChange, 
  clienteId,
  clienteNome,
  onDuplicateOrder
}: ClientPurchasesModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary>({
    compras: 0,
    devolucoes: 0,
    devolucoesPerc: 0,
    bonificacoes: 0,
    bonificacoesPerc: 0,
    trocas: 0,
    trocasPerc: 0,
  });
  
  const [dateFrom, setDateFrom] = useState<Date>(subMonths(new Date(), 6));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (!open || !clienteId) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSelectedOrder(null);
      try {
        const result = await purchasesService.getByClienteId(clienteId, {
          dataInicio: format(dateFrom, 'yyyy-MM-dd'),
          dataFim: format(dateTo, 'yyyy-MM-dd'),
        });
        setOrders(result.orders);
        setSummary(result.summary);
      } catch (e: any) {
        setError(String(e) || 'Erro ao carregar últimas compras');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, clienteId, dateFrom, dateTo]);

  const handleSelectOrder = async (order: PurchaseOrder) => {
    setSelectedOrder(order);
    
    // If order doesn't have items loaded, fetch them
    if (!order.itens || order.itens.length === 0) {
      setLoadingItems(true);
      try {
        const detail = await purchasesService.getOrderDetail(order.id);
        setSelectedOrder(detail);
        // Update order in list with items
        setOrders(prev => prev.map(o => o.id === order.id ? detail : o));
      } catch (e) {
        toast.error('Erro ao carregar itens do pedido');
      } finally {
        setLoadingItems(false);
      }
    }
  };

  const handleDuplicate = () => {
    if (!selectedOrder) {
      toast.error('Selecione um pedido para duplicar');
      return;
    }
    
    if (onDuplicateOrder) {
      onDuplicateOrder(selectedOrder);
      onOpenChange(false);
      toast.success('Pedido carregado para duplicação');
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Últimas Compras</DialogTitle>
        </DialogHeader>
        
        {/* Period Filter */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-2">
          <span className="text-sm font-medium">Período</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal h-8",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => date && setDateFrom(date)}
                initialFocus
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-sm">a</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal h-8",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(date) => date && setDateTo(date)}
                initialFocus
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {loading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">{error}</div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <Tabs defaultValue="pedidos" className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between flex-shrink-0">
                <TabsList>
                  <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
                  <TabsTrigger value="itens">Itens do pedido</TabsTrigger>
                </TabsList>
                
                <Button 
                  size="sm" 
                  onClick={handleDuplicate}
                  disabled={!selectedOrder}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Duplicar Pedido
                </Button>
              </div>

              <div className="flex-1 min-h-0 overflow-auto mt-2">
                {/* Orders Tab */}
                <TabsContent value="pedidos" className="m-0 h-full">
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-24">Data</TableHead>
                          <TableHead className="w-20">Pedido</TableHead>
                          <TableHead className="w-16">Repr.</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="w-16">Oper.</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="w-20">Prazo</TableHead>
                          <TableHead className="w-24 text-right">Total</TableHead>
                          <TableHead className="w-16">N.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.length > 0 ? (
                          orders.map((order) => (
                            <TableRow 
                              key={order.id}
                              className={cn(
                                "cursor-pointer",
                                selectedOrder?.id === order.id && "bg-primary/10"
                              )}
                              onClick={() => handleSelectOrder(order)}
                            >
                              <TableCell className="text-xs">{formatDate(order.data)}</TableCell>
                              <TableCell className="text-xs">{order.pedido}</TableCell>
                              <TableCell className="text-xs">{order.representanteCodigo}</TableCell>
                              <TableCell className="text-xs truncate max-w-[150px]">{order.representanteNome}</TableCell>
                              <TableCell className="text-xs">{order.operacao}</TableCell>
                              <TableCell className="text-xs truncate max-w-[150px]">{order.operacaoDescricao}</TableCell>
                              <TableCell className="text-xs">{order.prazo}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(order.total || 0)}</TableCell>
                              <TableCell className="text-xs">{order.numero}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                              Nenhuma compra encontrada no período
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Items Tab */}
                <TabsContent value="itens" className="m-0 h-full">
                  {loadingItems ? (
                    <div className="space-y-2 p-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : selectedOrder?.itens && selectedOrder.itens.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-24">Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-16">UN</TableHead>
                            <TableHead className="w-20 text-right">Qtd</TableHead>
                            <TableHead className="w-24 text-right">Preço</TableHead>
                            <TableHead className="w-16 text-right">Desc%</TableHead>
                            <TableHead className="w-24 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.itens.map((item, idx) => (
                            <TableRow key={item.id || idx}>
                              <TableCell className="text-xs">{item.codigoProduto}</TableCell>
                              <TableCell className="text-xs truncate max-w-[200px]">{item.descricao}</TableCell>
                              <TableCell className="text-xs">{item.un}</TableCell>
                              <TableCell className="text-xs text-right">{item.quant}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(item.preco)}</TableCell>
                              <TableCell className="text-xs text-right">{item.descontoPerc?.toFixed(2) || '0.00'}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(item.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      {selectedOrder ? 'Nenhum item encontrado' : 'Selecione um pedido para ver os itens'}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            {/* Summary Footer */}
            <div className="flex-shrink-0 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm whitespace-nowrap">Compras</label>
                <Input 
                  readOnly 
                  value={formatCurrency(summary.compras)} 
                  className="h-8 text-right bg-muted/30 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm whitespace-nowrap">Bonificações</label>
                <Input 
                  readOnly 
                  value={formatCurrency(summary.bonificacoes)} 
                  className="h-8 w-24 text-right bg-muted/30 text-sm"
                />
                <Input 
                  readOnly 
                  value={summary.bonificacoesPerc.toFixed(3)} 
                  className="h-8 w-20 text-right bg-muted/30 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm whitespace-nowrap">Devoluções</label>
                <Input 
                  readOnly 
                  value={formatCurrency(summary.devolucoes)} 
                  className="h-8 w-24 text-right bg-muted/30 text-sm"
                />
                <Input 
                  readOnly 
                  value={summary.devolucoesPerc.toFixed(3)} 
                  className="h-8 w-20 text-right bg-muted/30 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm whitespace-nowrap">Trocas</label>
                <Input 
                  readOnly 
                  value={formatCurrency(summary.trocas)} 
                  className="h-8 w-24 text-right bg-muted/30 text-sm"
                />
                <Input 
                  readOnly 
                  value={summary.trocasPerc.toFixed(3)} 
                  className="h-8 w-20 text-right bg-muted/30 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
