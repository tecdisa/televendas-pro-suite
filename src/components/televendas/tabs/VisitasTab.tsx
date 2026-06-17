import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { representantes } from '@/mocks/data';

const visitasMock = [
  { id: 1, data: '2025-10-17', representante: 'ALEXANDRE FERREIRA', cliente: '10 REGIMENTO DE CAVALARIA', cidade: 'BELA VISTA', tipo: 'Visita programada', status: 'pendente' },
  { id: 2, data: '2025-10-17', representante: 'ALEXANDRE FERREIRA', cliente: 'CASA DE CARIDADE SAO VICENTE DE PAULO', cidade: 'CAMPO GRANDE', tipo: 'Acompanhamento', status: 'pendente' },
  { id: 3, data: '2025-10-16', representante: 'ALEXANDRE FERREIRA', cliente: 'CLINICA VIDA E SAUDE', cidade: 'DOURADOS', tipo: 'Visita realizada', status: 'realizada' },
];

export const VisitasTab = () => {
  const [filters, setFilters] = useState({
    data: '',
    cidade: '',
    representante: 'all'
  });

  console.log('VisitasTab rendering', { visitasMock });

  const handleRegistrarVisita = () => {
    toast.info('Abrindo formulário de registro de visita');
  };

  const handleNovoPedido = () => {
    toast.info('Criando novo pedido a partir de visita');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Data</label>
              <Input 
                type="date"
                value={filters.data}
                onChange={(e) => setFilters({...filters, data: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cidade</label>
              <Input 
                placeholder="Filtrar por cidade"
                value={filters.cidade}
                onChange={(e) => setFilters({...filters, cidade: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Força de Vendas</label>
              <Select value={filters.representante} onValueChange={(v) => setFilters({...filters, representante: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {representantes.map(r => (
                    <SelectItem key={r.id} value={r.nome}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {visitasMock.map((visita) => (
          <Card key={visita.id}>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{new Date(visita.data).toLocaleDateString('pt-BR')}</span>
                    <Badge variant={visita.status === 'realizada' ? 'default' : 'secondary'}>
                      {visita.status === 'realizada' ? 'Realizada' : 'Pendente'}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-lg">{visita.cliente}</p>
                    <p className="text-sm text-muted-foreground">{visita.cidade}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserCheck className="h-4 w-4" />
                    <span>{visita.representante}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{visita.tipo}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {visita.status === 'pendente' && (
                    <Button size="sm" variant="outline" onClick={handleRegistrarVisita} className="flex-1 sm:flex-none">
                      <UserCheck className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Registrar</span>
                    </Button>
                  )}
                  <Button variant="default" size="sm" onClick={handleNovoPedido} className="flex-1 sm:flex-none">
                    <Plus className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Novo Pedido</span>
                    <span className="sm:hidden">Pedido</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button variant="outline" onClick={handleRegistrarVisita} className="w-full sm:w-auto">
          <UserCheck className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Registrar Visita</span>
          <span className="sm:hidden">Registrar</span>
        </Button>
        <Button variant="default" onClick={handleNovoPedido} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Novo Pedido</span>
          <span className="sm:hidden">Pedido</span>
        </Button>
      </div>
    </div>
  );
};
