import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { itinerarios, representantes } from '@/mocks/data';

export const ItinerariosTab = () => {
  const [filteredData, setFilteredData] = useState(itinerarios);
  const [filters, setFilters] = useState({
    representante: 'all',
    cidade: '',
    clienteId: '',
    visita: ''
  });

  console.log('ItinerariosTab rendering', { itinerarios, filteredData });

  useEffect(() => {
    let filtered = [...itinerarios];

    if (filters.representante && filters.representante !== 'all') {
      filtered = filtered.filter(i => i.representanteId === filters.representante);
    }
    if (filters.cidade) {
      filtered = filtered.filter(i => i.cidade.toLowerCase().includes(filters.cidade.toLowerCase()));
    }
    if (filters.clienteId) {
      filtered = filtered.filter(i => i.id.toString().includes(filters.clienteId));
    }
    if (filters.visita) {
      filtered = filtered.filter(i => i.visita.toLowerCase().includes(filters.visita.toLowerCase()));
    }

    setFilteredData(filtered);
  }, [filters]);

  const handleReagendar = (codigoCliente: string) => {
    toast.info(`Reagendando visita para cliente (código ${codigoCliente})`);
  };

  const handleNovoPedido = (codigoCliente: string) => {
    toast.info(`Criando novo pedido para cliente (código ${codigoCliente})`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Representante</label>
              <Select value={filters.representante} onValueChange={(v) => setFilters({...filters, representante: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {representantes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{`${r.id} - ${r.nome}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <label className="text-sm font-medium mb-2 block">Código do Cliente</label>
              <Input 
                placeholder="Código do cliente"
                value={filters.clienteId}
                onChange={(e) => setFilters({...filters, clienteId: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Visita</label>
              <Input 
                placeholder="Tipo de visita"
                value={filters.visita}
                onChange={(e) => setFilters({...filters, visita: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itinerários ({filteredData.length} clientes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead className="hidden lg:table-cell">Fone</TableHead>
                  <TableHead className="hidden sm:table-cell w-20">Horário</TableHead>
                  <TableHead className="hidden lg:table-cell w-24">Dt. Base</TableHead>
                  <TableHead className="w-24">Visita</TableHead>
                  <TableHead className="text-right w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const codigoCliente = (item as any).codigoCliente ?? '';
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{codigoCliente}</TableCell>
                      <TableCell className="font-medium">{item.razaoSocial}</TableCell>
                      <TableCell className="hidden md:table-cell">{item.contato}</TableCell>
                      <TableCell className="hidden lg:table-cell">{item.fone}</TableCell>
                      <TableCell className="hidden sm:table-cell">{item.horario}</TableCell>
                      <TableCell className="hidden lg:table-cell">{new Date(item.dtBase).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{item.visita}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleReagendar(codigoCliente)} className="h-7 px-2">
                            <Calendar className="h-3 w-3" />
                            <span className="hidden xl:inline ml-1">Re-agendar</span>
                          </Button>
                          <Button size="sm" onClick={() => handleNovoPedido(codigoCliente)} className="h-7 px-2">
                            <Plus className="h-3 w-3" />
                            <span className="hidden xl:inline ml-1">Pedido</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Total de clientes: {filteredData.length}
      </div>
    </div>
  );
};
