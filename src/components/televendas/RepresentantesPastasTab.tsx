import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { representativesService, Representante, RepresentanteFornecedorItem } from '@/services/representativesService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Loader2, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';

const FORNECEDORES_LIMIT = 200;

const formatObjetivo = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseObjetivoInput = (value: string): number | null => {
  const raw = value.replace(/\s/g, '');
  if (!raw) return 0;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

export function RepresentantesPastasTab() {
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [repLoading, setRepLoading] = useState(false);
  const [repSearch, setRepSearch] = useState('');
  const [selectedRepresentanteId, setSelectedRepresentanteId] = useState<string>('');

  const [searchFornecedor, setSearchFornecedor] = useState('');
  const [fornecedores, setFornecedores] = useState<RepresentanteFornecedorItem[]>([]);
  const [fornecedoresLoading, setFornecedoresLoading] = useState(false);
  const [objetivoDraftByFornecedor, setObjetivoDraftByFornecedor] = useState<Record<number, string>>({});
  const [selectedFornecedorById, setSelectedFornecedorById] = useState<Record<number, boolean>>({});
  const [saveObjetivoLoading, setSaveObjetivoLoading] = useState<number | null>(null);
  const [removeFornecedorLoadingId, setRemoveFornecedorLoadingId] = useState<number | null>(null);
  const [removeSelecionadosLoading, setRemoveSelecionadosLoading] = useState(false);
  const [includeDialogOpen, setIncludeDialogOpen] = useState(false);
  const [includeSearch, setIncludeSearch] = useState('');
  const [includeLoading, setIncludeLoading] = useState(false);
  const [includeResults, setIncludeResults] = useState<Fornecedor[]>([]);
  const [includeSubmittingId, setIncludeSubmittingId] = useState<number | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyRepSearch, setCopyRepSearch] = useState('');
  const [copyRepLoading, setCopyRepLoading] = useState(false);
  const [copyRepList, setCopyRepList] = useState<Representante[]>([]);
  const [copyFromRepId, setCopyFromRepId] = useState<string>('');
  const [copySubmitting, setCopySubmitting] = useState(false);

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
    const objetivoAtual = Number(fornecedores[0]?.representante?.objetivo_de_venda ?? 0);
    const objetivoFormatado = Number.isFinite(objetivoAtual)
      ? objetivoAtual.toFixed(2)
      : '0.00';
    setObjetivoDraftByFornecedor((prev) => {
      const next: Record<number, string> = {};
      fornecedoresLista.forEach((fornecedor) => {
        next[fornecedor.fornecedor_id] = prev[fornecedor.fornecedor_id] ?? objetivoFormatado;
      });
      return next;
    });
    setSelectedFornecedorById((prev) => {
      const next: Record<number, boolean> = {};
      fornecedoresLista.forEach((fornecedor) => {
        if (prev[fornecedor.fornecedor_id]) {
          next[fornecedor.fornecedor_id] = true;
        }
      });
      return next;
    });
  }, [fornecedores, fornecedoresLista]);

  const handleRepSearch = () => {
    loadRepresentantes(repSearch.trim());
  };

  const handleRepSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleRepSearch();
    }
  };

  const linkedFornecedorIds = useMemo(() => new Set(fornecedoresLista.map((f) => f.fornecedor_id)), [fornecedoresLista]);
  const totalSelecionados = useMemo(
    () => fornecedoresLista.filter((fornecedor) => selectedFornecedorById[fornecedor.fornecedor_id]).length,
    [fornecedoresLista, selectedFornecedorById],
  );
  const allSelecionados = fornecedoresLista.length > 0 && totalSelecionados === fornecedoresLista.length;

  const availableIncludeResults = useMemo(
    () => includeResults.filter((fornecedor) => !linkedFornecedorIds.has(fornecedor.fornecedor_id)),
    [includeResults, linkedFornecedorIds]
  );
  const filteredCopyReps = useMemo(() => {
    const term = copyRepSearch.trim().toUpperCase();
    if (!term) return copyRepList;
    return copyRepList.filter(
      (representante) =>
        representante.nome_representante.toUpperCase().includes(term) ||
        (representante.codigo_representante || '').toUpperCase().includes(term) ||
        (representante.cnpj_cpf || '').includes(copyRepSearch.trim()),
    );
  }, [copyRepList, copyRepSearch]);
  const copyFromRep = useMemo(
    () =>
      copyRepList.find(
        (representante) => String(representante.representante_id) === copyFromRepId,
      ) ?? null,
    [copyRepList, copyFromRepId]
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
    setObjetivoDraftByFornecedor((prev) => {
      const next = { ...prev };
      fornecedoresLista.forEach((fornecedor) => {
        next[fornecedor.fornecedor_id] = '0.00';
      });
      return next;
    });
    toast.success('Objetivos zerados no formulário');
  };

  const handleSaveObjetivo = async (fornecedorId: number) => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione um representante');
      return;
    }

    const rawValue = objetivoDraftByFornecedor[fornecedorId] ?? '0';
    const objetivo = parseObjetivoInput(rawValue);
    if (objetivo === null) {
      toast.error('Objetivo inválido');
      return;
    }

    setSaveObjetivoLoading(fornecedorId);
    try {
      await representativesService.update(Number(selectedRepresentanteId), {
        objetivo_de_venda: objetivo,
      });
      setObjetivoDraftByFornecedor((prev) => {
        const next = { ...prev };
        fornecedoresLista.forEach((fornecedor) => {
          next[fornecedor.fornecedor_id] = objetivo.toFixed(2);
        });
        return next;
      });
      toast.success('Objetivo atualizado');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar objetivo');
    } finally {
      setSaveObjetivoLoading(null);
    }
  };

  const handleToggleFornecedor = (fornecedorId: number, checked: boolean) => {
    setSelectedFornecedorById((prev) => {
      const next = { ...prev };
      if (checked) next[fornecedorId] = true;
      else delete next[fornecedorId];
      return next;
    });
  };

  const handleToggleAllFornecedores = (checked: boolean) => {
    if (!checked) {
      setSelectedFornecedorById({});
      return;
    }
    const next: Record<number, boolean> = {};
    fornecedoresLista.forEach((fornecedor) => {
      next[fornecedor.fornecedor_id] = true;
    });
    setSelectedFornecedorById(next);
  };

  const handleExcluirFornecedor = async (fornecedorId: number) => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione um representante');
      return;
    }
    if (!confirm('Deseja excluir este fornecedor da pasta do representante?')) return;

    setRemoveFornecedorLoadingId(fornecedorId);
    try {
      await representativesService.removeFornecedor(selectedRepresentanteId, fornecedorId);
      setSelectedFornecedorById((prev) => {
        const next = { ...prev };
        delete next[fornecedorId];
        return next;
      });
      toast.success('Fornecedor excluído da pasta');
      await loadFornecedores(selectedRepresentanteId, searchFornecedor.trim());
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir fornecedor da pasta');
    } finally {
      setRemoveFornecedorLoadingId(null);
    }
  };

  const handleExcluirSelecionados = async () => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione um representante');
      return;
    }
    const ids = fornecedoresLista
      .map((fornecedor) => fornecedor.fornecedor_id)
      .filter((id) => selectedFornecedorById[id]);
    if (ids.length === 0) {
      toast.error('Selecione ao menos um fornecedor');
      return;
    }
    if (!confirm(`Deseja excluir ${ids.length} fornecedor(es) da pasta?`)) return;

    setRemoveSelecionadosLoading(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => representativesService.removeFornecedor(selectedRepresentanteId, id)),
      );
      const removidos = results.filter((result) => result.status === 'fulfilled').length;
      const falhas = results.length - removidos;
      if (removidos > 0) {
        toast.success(`${removidos} fornecedor(es) excluído(s) da pasta`);
      }
      if (falhas > 0) {
        toast.error(`Falha ao excluir ${falhas} fornecedor(es)`);
      }
      setSelectedFornecedorById({});
      await loadFornecedores(selectedRepresentanteId, searchFornecedor.trim());
    } finally {
      setRemoveSelecionadosLoading(false);
    }
  };

  const openCopyDialog = async () => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione um representante');
      return;
    }
    setCopyDialogOpen(true);
    setCopyRepSearch('');
    setCopyFromRepId('');
    setCopyRepLoading(true);
    try {
      const result = await representativesService.getAll('', 1, 200, 'ativos');
      setCopyRepList(
        result.data.filter(
          (representante) =>
            String(representante.representante_id) !== selectedRepresentanteId,
        ),
      );
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar representantes');
      setCopyRepList([]);
    } finally {
      setCopyRepLoading(false);
    }
  };

  const handleCopyFornecedores = async () => {
    if (!selectedRepresentanteId || !copyFromRep) {
      toast.error('Selecione um representante de origem');
      return;
    }

    setCopySubmitting(true);
    try {
      const result = await representativesService.copyFornecedores(
        selectedRepresentanteId,
        copyFromRep.representante_id,
      );
      toast.success(
        `Copiados: ${result.totalCriados} | Ignorados (duplicados): ${result.totalIgnorados}`,
      );
      setCopyDialogOpen(false);
      await loadFornecedores(selectedRepresentanteId, searchFornecedor.trim());
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao copiar fornecedores');
    } finally {
      setCopySubmitting(false);
    }
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
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-9" onClick={openIncludeDialog} disabled={!selectedRepresentanteId}>
              <Plus className="mr-2 h-4 w-4" />
              Incluir
            </Button>
            <Button variant="outline" className="h-9" onClick={openCopyDialog} disabled={!selectedRepresentanteId}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar
            </Button>
            <Button variant="outline" className="h-9" onClick={handleZerarObjetivos} disabled={fornecedoresLista.length === 0}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Zerar
            </Button>
            <Button
              variant="destructive"
              className="h-9"
              onClick={handleExcluirSelecionados}
              disabled={removeSelecionadosLoading || totalSelecionados === 0}
            >
              {removeSelecionadosLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir ({totalSelecionados})
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="max-h-[60vh] overflow-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allSelecionados
                        ? true
                        : totalSelecionados > 0
                        ? 'indeterminate'
                        : false
                    }
                    onCheckedChange={(checked) => handleToggleAllFornecedores(checked === true)}
                    aria-label="Selecionar todos os fornecedores"
                  />
                </TableHead>
                <TableHead className="w-28">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-56">Objetivo</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedoresLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : fornecedoresLista.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum fornecedor encontrado para este representante
                  </TableCell>
                </TableRow>
              ) : (
                fornecedoresLista.map((fornecedor) => (
                  <TableRow key={fornecedor.fornecedor_id}>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={Boolean(selectedFornecedorById[fornecedor.fornecedor_id])}
                        onCheckedChange={(checked) =>
                          handleToggleFornecedor(fornecedor.fornecedor_id, checked === true)
                        }
                        aria-label={`Selecionar fornecedor ${fornecedor.nome_fornecedor}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{fornecedor.codigo_fornecedor || '-'}</TableCell>
                    <TableCell className="text-sm">{fornecedor.nome_fornecedor}</TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-8 text-xs"
                          value={objetivoDraftByFornecedor[fornecedor.fornecedor_id] ?? '0.00'}
                          onChange={(event) =>
                            setObjetivoDraftByFornecedor((prev) => ({
                              ...prev,
                              [fornecedor.fornecedor_id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleSaveObjetivo(fornecedor.fornecedor_id);
                            }
                          }}
                          placeholder={formatObjetivo(0)}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSaveObjetivo(fornecedor.fornecedor_id)}
                          disabled={saveObjetivoLoading === fornecedor.fornecedor_id}
                        >
                          {saveObjetivoLoading === fornecedor.fornecedor_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleExcluirFornecedor(fornecedor.fornecedor_id)}
                        disabled={removeFornecedorLoadingId === fornecedor.fornecedor_id}
                      >
                        {removeFornecedorLoadingId === fornecedor.fornecedor_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Copiar fornecedores de outro representante</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              className="h-9 text-sm"
              placeholder="Buscar representante por nome, código ou CPF/CNPJ..."
              value={copyRepSearch}
              onChange={(event) => setCopyRepSearch(event.target.value)}
            />

            <div className="overflow-hidden rounded-md border">
              <div className="max-h-[50vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-40">CNPJ/CPF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {copyRepLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filteredCopyReps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                          Nenhum representante disponível para cópia
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCopyReps.map((representante) => {
                        const isSelected =
                          String(representante.representante_id) === copyFromRepId;
                        return (
                          <TableRow
                            key={representante.representante_id}
                            className={`cursor-pointer ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/70'}`}
                            onClick={() =>
                              setCopyFromRepId(String(representante.representante_id))
                            }
                          >
                            <TableCell className="font-mono text-xs">
                              {representante.codigo_representante || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {representante.nome_representante}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {representante.cnpj_cpf || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleCopyFornecedores} disabled={copySubmitting || !copyFromRep}>
                {copySubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar cópia
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
