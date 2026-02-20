import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { representativesService, Representante, RepresentanteFornecedorItem } from '@/services/representativesService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, RotateCcw, Search } from 'lucide-react';

const FORNECEDORES_LIMIT = 200;

const formatObjetivo = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function RepresentantesPastasTab() {
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [repLoading, setRepLoading] = useState(false);
  const [repSearch, setRepSearch] = useState('');
  const [selectedRepresentanteId, setSelectedRepresentanteId] = useState<string>('');

  const [searchFornecedor, setSearchFornecedor] = useState('');
  const [fornecedores, setFornecedores] = useState<RepresentanteFornecedorItem[]>([]);
  const [fornecedoresLoading, setFornecedoresLoading] = useState(false);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);
  const [objetivosByFornecedor, setObjetivosByFornecedor] = useState<Record<number, number>>({});
  const [includeDialogOpen, setIncludeDialogOpen] = useState(false);
  const [includeSearch, setIncludeSearch] = useState('');
  const [includeLoading, setIncludeLoading] = useState(false);
  const [includeResults, setIncludeResults] = useState<Fornecedor[]>([]);
  const [includeSubmittingId, setIncludeSubmittingId] = useState<number | null>(null);

  const fornecedorReqRef = useRef(0);

  const loadRepresentantes = async (query = '') => {
    setRepLoading(true);
    try {
      const result = await representativesService.getAll(query, 1, 200, 'ativos');
      setRepresentantes(result.data);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar representantes');
    } finally {
      setRepLoading(false);
    }
  };

  const loadFornecedores = async (representanteId: string, query = '') => {
    const reqId = ++fornecedorReqRef.current;
    if (!representanteId) {
      setFornecedores([]);
      setSelectedFornecedorId(null);
      setFornecedoresLoading(false);
      return;
    }

    setFornecedoresLoading(true);
    try {
      const result = await representativesService.getFornecedores(representanteId, {
        q: query,
        page: 1,
        limit: FORNECEDORES_LIMIT,
      });
      if (reqId !== fornecedorReqRef.current) return;
      setFornecedores(result.data);
      setSelectedFornecedorId(null);
    } catch (error: any) {
      if (reqId !== fornecedorReqRef.current) return;
      setFornecedores([]);
      toast.error(error?.message || 'Erro ao carregar fornecedores do representante');
    } finally {
      if (reqId === fornecedorReqRef.current) {
        setFornecedoresLoading(false);
      }
    }
  };

  useEffect(() => {
    loadRepresentantes();
  }, []);

  useEffect(() => {
    if (representantes.length === 0) {
      setSelectedRepresentanteId('');
      return;
    }
    const hasSelected = representantes.some((r) => String(r.representante_id) === selectedRepresentanteId);
    if (!hasSelected) {
      setSelectedRepresentanteId(String(representantes[0].representante_id));
    }
  }, [representantes, selectedRepresentanteId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadFornecedores(selectedRepresentanteId, searchFornecedor.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [selectedRepresentanteId, searchFornecedor]);

  const fornecedoresLista = useMemo(() => fornecedores.map((item) => item.fornecedor), [fornecedores]);

  useEffect(() => {
    setObjetivosByFornecedor((prev) => {
      const next: Record<number, number> = {};
      fornecedoresLista.forEach((fornecedor) => {
        next[fornecedor.fornecedor_id] = prev[fornecedor.fornecedor_id] ?? 0;
      });
      return next;
    });
  }, [fornecedoresLista]);

  const handleRepSearch = () => {
    loadRepresentantes(repSearch.trim());
  };

  const handleRepSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleRepSearch();
    }
  };

  const linkedFornecedorIds = useMemo(() => new Set(fornecedoresLista.map((f) => f.fornecedor_id)), [fornecedoresLista]);

  const availableIncludeResults = useMemo(
    () => includeResults.filter((fornecedor) => !linkedFornecedorIds.has(fornecedor.fornecedor_id)),
    [includeResults, linkedFornecedorIds]
  );

  const loadFornecedoresParaInclusao = async (query = '') => {
    setIncludeLoading(true);
    try {
      const result = await suppliersService.getAll(query, 1, 100, 'ativos');
      setIncludeResults(result.data);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar fornecedores');
    } finally {
      setIncludeLoading(false);
    }
  };

  const openIncludeDialog = async () => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione um representante');
      return;
    }
    setIncludeDialogOpen(true);
    setIncludeSearch('');
    await loadFornecedoresParaInclusao('');
  };

  const handleIncludeSearch = () => {
    loadFornecedoresParaInclusao(includeSearch.trim());
  };

  const handleIncludeSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleIncludeSearch();
    }
  };

  const handleIncludeFornecedor = async (fornecedorId: number) => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione um representante');
      return;
    }
    setIncludeSubmittingId(fornecedorId);
    try {
      await representativesService.addFornecedor(selectedRepresentanteId, fornecedorId);
      toast.success('Fornecedor incluído com sucesso');
      await loadFornecedores(selectedRepresentanteId, searchFornecedor.trim());
      setIncludeResults((prev) => prev.filter((item) => item.fornecedor_id !== fornecedorId));
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao incluir fornecedor');
    } finally {
      setIncludeSubmittingId(null);
    }
  };

  const handleZerarObjetivos = () => {
    if (fornecedoresLista.length === 0) {
      toast.error('Nenhum fornecedor para zerar objetivo');
      return;
    }
    setObjetivosByFornecedor((prev) => {
      const next = { ...prev };
      fornecedoresLista.forEach((fornecedor) => {
        next[fornecedor.fornecedor_id] = 0;
      });
      return next;
    });
    toast.success('Objetivos zerados');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-8">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Buscar representante</label>
          <div className="flex gap-2">
            <Input
              className="h-9 text-sm"
              placeholder="Buscar por nome, CPF/CNPJ ou código..."
              value={repSearch}
              onChange={(event) => setRepSearch(event.target.value)}
              onKeyDown={handleRepSearchKeyDown}
            />
            <Button onClick={handleRepSearch} disabled={repLoading} className="shrink-0">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>
        </div>
        <div className="md:col-span-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Representante</label>
          <Select value={selectedRepresentanteId} onValueChange={setSelectedRepresentanteId} disabled={repLoading || representantes.length === 0}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={repLoading ? 'Carregando representantes...' : 'Selecione um representante'} />
            </SelectTrigger>
            <SelectContent>
              {representantes.map((representante) => (
                <SelectItem key={representante.representante_id} value={String(representante.representante_id)}>
                  {(representante.codigo_representante || '-')} - {representante.nome_representante}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
        <div className="md:col-span-9">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Buscar fornecedor</label>
          <Input
            className="h-9 text-sm"
            placeholder="Nome, código, CPF/CNPJ..."
            value={searchFornecedor}
            onChange={(event) => setSearchFornecedor(event.target.value)}
          />
        </div>
        <div className="md:col-span-3 md:self-end">
          <div className="flex gap-2">
            <Button className="h-9 flex-1" onClick={openIncludeDialog} disabled={!selectedRepresentanteId}>
              <Plus className="mr-2 h-4 w-4" />
              Incluir
            </Button>
            <Button variant="outline" className="h-9 flex-1" onClick={handleZerarObjetivos} disabled={fornecedoresLista.length === 0}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Zerar
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="max-h-[60vh] overflow-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-32 text-right">Objetivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedoresLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : fornecedoresLista.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Nenhum fornecedor encontrado para este representante
                  </TableCell>
                </TableRow>
              ) : (
                fornecedoresLista.map((fornecedor) => (
                  <TableRow
                    key={fornecedor.fornecedor_id}
                    className={selectedFornecedorId === fornecedor.fornecedor_id ? 'bg-primary/10' : ''}
                    onClick={() => setSelectedFornecedorId(fornecedor.fornecedor_id)}
                  >
                    <TableCell className="font-mono text-xs">{fornecedor.codigo_fornecedor || '-'}</TableCell>
                    <TableCell className="text-sm">{fornecedor.nome_fornecedor}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatObjetivo(objetivosByFornecedor[fornecedor.fornecedor_id] ?? 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={includeDialogOpen} onOpenChange={setIncludeDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Incluir fornecedor no representante</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                className="h-9 text-sm"
                placeholder="Buscar fornecedor por nome, código ou CPF/CNPJ..."
                value={includeSearch}
                onChange={(event) => setIncludeSearch(event.target.value)}
                onKeyDown={handleIncludeSearchKeyDown}
              />
              <Button onClick={handleIncludeSearch} disabled={includeLoading} className="shrink-0">
                <Search className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
            </div>

            <div className="overflow-hidden rounded-md border">
              <div className="max-h-[50vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-44">CNPJ/CPF</TableHead>
                      <TableHead className="w-28 text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {includeLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : availableIncludeResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          Nenhum fornecedor disponível para inclusão
                        </TableCell>
                      </TableRow>
                    ) : (
                      availableIncludeResults.map((fornecedor) => (
                        <TableRow key={fornecedor.fornecedor_id}>
                          <TableCell className="font-mono text-xs">{fornecedor.codigo_fornecedor || '-'}</TableCell>
                          <TableCell className="text-sm">{fornecedor.nome_fornecedor}</TableCell>
                          <TableCell className="font-mono text-xs">{fornecedor.cnpj_cpf || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleIncludeFornecedor(fornecedor.fornecedor_id)}
                              disabled={includeSubmittingId === fornecedor.fornecedor_id}
                            >
                              {includeSubmittingId === fornecedor.fornecedor_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Incluir'
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
