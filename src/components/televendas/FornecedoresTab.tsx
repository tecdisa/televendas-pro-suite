import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { suppliersService, Fornecedor } from '@/services/suppliersService';

export function FornecedoresTab() {
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState('');

  const loadFornecedores = async () => {
    setLoading(true);
    try {
      const data = await suppliersService.getAll(search);
      setFornecedores(data);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFornecedores();
  }, []);

  const handleSearch = () => {
    loadFornecedores();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Fornecedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Buscar por nome, código ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="sm:inline">Buscar</span>
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Fantasia</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : fornecedores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum fornecedor encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    fornecedores.map((f) => (
                      <TableRow key={f.fornecedor_id}>
                        <TableCell className="font-mono text-xs">{f.codigo_fornecedor || '-'}</TableCell>
                        <TableCell className="font-medium">{f.nome_fornecedor}</TableCell>
                        <TableCell className="hidden sm:table-cell">{f.fantasia || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{f.cnpj_cpf || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
