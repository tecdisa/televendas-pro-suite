import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Truck, ShoppingCart, Package, TrendingUp, DollarSign, Clock, CheckCircle, CalendarIcon } from 'lucide-react';
import { ordersService, Order } from '@/services/ordersService';
import { clientsService } from '@/services/clientsService';
import { suppliersService } from '@/services/suppliersService';
import { representativesService } from '@/services/representativesService';
import { formatCurrency } from '@/utils/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DashboardData {
  totalPedidos: number;
  pedidosPendentes: number;
  pedidosFaturados: number;
  valorTotal: number;
  totalClientes: number;
  totalFornecedores: number;
  totalRepresentantes: number;
  topClientes: { nome: string; valor: number; pedidos: number }[];
  vendasPorRepresentante: { nome: string; valor: number; pedidos: number }[];
  pedidosPorSituacao: { name: string; value: number }[];
}

const CHART_COLORS = [
  'hsl(214, 95%, 44%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(280, 65%, 50%)',
  'hsl(190, 90%, 40%)',
  'hsl(330, 70%, 50%)',
  'hsl(60, 80%, 45%)',
];

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      try {
        const filters: any = {};
        if (dataInicio) filters.dataInicio = format(dataInicio, 'yyyy-MM-dd');
        if (dataFim) filters.dataFim = format(dataFim, 'yyyy-MM-dd');

        // Fetch all data in parallel
        const [orders, clients, suppliers, reps] = await Promise.allSettled([
          ordersService.list(Object.keys(filters).length ? filters : undefined, 1, 500),
          clientsService.find(undefined, 1, 1),
          suppliersService.getAll(undefined, 1, 1),
          representativesService.getAll(undefined, 1, 1),
        ]);

        const ordersList: Order[] = orders.status === 'fulfilled' ? orders.value : [];
        // For clients/suppliers/reps we just need the count from the API response
        const clientCount = clients.status === 'fulfilled' ? (clients.value as any)?.length ?? 0 : 0;
        const supplierResult = suppliers.status === 'fulfilled' ? suppliers.value : { data: [], total: 0 };
        const repResult = reps.status === 'fulfilled' ? reps.value : { data: [], total: 0 };

        // Calculate KPIs from orders
        const totalPedidos = ordersList.length;
        const pedidosPendentes = ordersList.filter((o) => !o.faturado && !o.cancelado).length;
        const pedidosFaturados = ordersList.filter((o) => o.faturado).length;
        const valorTotal = ordersList.reduce((sum, o) => sum + (o.valor || 0), 0);

        // Top clients by value
        const clientMap = new Map<string, { nome: string; valor: number; pedidos: number }>();
        ordersList.forEach((o) => {
          const key = o.clienteNome || `Cliente ${o.clienteId}`;
          const existing = clientMap.get(key) || { nome: key, valor: 0, pedidos: 0 };
          existing.valor += o.valor || 0;
          existing.pedidos += 1;
          clientMap.set(key, existing);
        });
        const topClientes = Array.from(clientMap.values())
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 10);

        // Sales by representative
        const repMap = new Map<string, { nome: string; valor: number; pedidos: number }>();
        ordersList.forEach((o) => {
          const key = o.representanteNome || `Rep ${o.representanteId}`;
          const existing = repMap.get(key) || { nome: key, valor: 0, pedidos: 0 };
          existing.valor += o.valor || 0;
          existing.pedidos += 1;
          repMap.set(key, existing);
        });
        const vendasPorRepresentante = Array.from(repMap.values())
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 10);

        // Orders by status
        const situacaoMap = new Map<string, number>();
        ordersList.forEach((o) => {
          const sit = o.situacao || 'Outros';
          situacaoMap.set(sit, (situacaoMap.get(sit) || 0) + 1);
        });
        const pedidosPorSituacao = Array.from(situacaoMap.entries()).map(([name, value]) => ({
          name,
          value,
        }));

        setData({
          totalPedidos,
          pedidosPendentes,
          pedidosFaturados,
          valorTotal,
          totalClientes: clientCount,
          totalFornecedores: supplierResult.total ?? supplierResult.data.length,
          totalRepresentantes: repResult.total ?? repResult.data.length,
          topClientes,
          vendasPorRepresentante,
          pedidosPorSituacao,
        });
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [dataInicio, dataFim]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border rounded-md p-2 shadow-md text-sm">
        <p className="font-medium">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'Valor' ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Date Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Data Início</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataInicio ? format(dataInicio, 'dd/MM/yyyy') : 'Selecionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Data Fim</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataFim ? format(dataFim, 'dd/MM/yyyy') : 'Selecionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataFim} onSelect={setDataFim} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        {(dataInicio || dataFim) && (
          <Button variant="ghost" size="sm" onClick={() => { setDataInicio(undefined); setDataFim(undefined); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Pedidos"
          value={data?.totalPedidos ?? 0}
          icon={ShoppingCart}
          loading={loading}
        />
        <KpiCard
          title="Valor Total"
          value={data ? formatCurrency(data.valorTotal) : 'R$ 0,00'}
          icon={DollarSign}
          loading={loading}
        />
        <KpiCard
          title="Pendentes"
          value={data?.pedidosPendentes ?? 0}
          icon={Clock}
          description="Pedidos aguardando faturamento"
          loading={loading}
        />
        <KpiCard
          title="Faturados"
          value={data?.pedidosFaturados ?? 0}
          icon={CheckCircle}
          description="Pedidos já faturados"
          loading={loading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          title="Clientes"
          value={data?.totalClientes ?? 0}
          icon={Users}
          loading={loading}
        />
        <KpiCard
          title="Fornecedores"
          value={data?.totalFornecedores ?? 0}
          icon={Truck}
          loading={loading}
        />
        <KpiCard
          title="Representantes"
          value={data?.totalRepresentantes ?? 0}
          icon={Package}
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Clientes por Valor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.topClientes.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.topClientes}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={140}
                    fontSize={11}
                    tickFormatter={(v) => v.length > 20 ? v.slice(0, 20) + '…' : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" name="Valor" fill="hsl(214, 95%, 44%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>

        {/* Pedidos por Situação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Pedidos por Situação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.pedidosPorSituacao.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.pedidosPorSituacao}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {data.pedidosPorSituacao.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend fontSize={12} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendas por Representante */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vendas por Representante
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : data?.vendasPorRepresentante.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.vendasPorRepresentante}
                margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="nome"
                  fontSize={11}
                  tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + '…' : v}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor" name="Valor" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">Nenhum dado disponível</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
