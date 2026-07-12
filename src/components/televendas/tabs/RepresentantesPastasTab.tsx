import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { representativesService, Representante, RepresentanteFornecedorItem, FornecedorDivisaoItem } from '@/services/representativesService';
import { suppliersService, Fornecedor } from '@/services/suppliersService';
import { divisionsService, Divisao } from '@/services/divisionsService';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Copy, Layers, Loader2, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';

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
  const [selectedRepresentanteId, setSelectedRepresentanteId] = useState<string>('');
  const [repSearchOpen, setRepSearchOpen] = useState(false);
  const [repSearch, setRepSearch] = useState('');

  const [fornecedores, setFornecedores] = useState<RepresentanteFornecedorItem[]>([]);
  const [fornecedoresLoading, setFornecedoresLoading] = useState(false);
  const [objetivoDraftByFornecedor, setObjetivoDraftByFornecedor] = useState<Record<number, string>>({});
  const [selectedFornecedorById, setSelectedFornecedorById] = useState<Record<number, boolean>>({});
  const [saveObjetivoLoading, setSaveObjetivoLoading] = useState<number | null>(null);
  const [removeFornecedorLoadingId, setRemoveFornecedorLoadingId] = useState<number | null>(null);
  const [removeSelecionadosLoading, setRemoveSelecionadosLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void | Promise<void> } | null>(null);
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

  // Divisões modal state
  const [divisoesOpen, setDivisoesOpen] = useState(false);
  const [divisoesFornecedor, setDivisoesFornecedor] = useState<RepresentanteFornecedorItem | null>(null);
  const [divisoesItems, setDivisoesItems] = useState<FornecedorDivisaoItem[]>([]);
  const [divisoesLoading, setDivisoesLoading] = useState(false);
  const [divisoesTab, setDivisoesTab] = useState<'pesquisa' | 'dados'>('pesquisa');
  const [divisoesCatalog, setDivisoesCatalog] = useState<Divisao[]>([]);
  const [divisaoFormDivisaoId, setDivisaoFormDivisaoId] = useState('');
  const [divisaoFormLoading, setDivisaoFormLoading] = useState(false);
  const [divisaoDeleteLoading, setDivisaoDeleteLoading] = useState<number | null>(null);

  const fornecedorReqRef = useRef(0);
  const refreshRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRepresentantes = async (query = '') => {
    setRepLoading(true);
    try {
      const result = await representativesService.getAll(query, 1, 200, 'ativos');
      setRepresentantes(result.data);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar força de vendas');
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
      toast.error(error?.message || 'Erro ao carregar fornecedores da força de vendas');
    } finally {
      if (reqId === fornecedorReqRef.current) {
        setFornecedoresLoading(false);
      }
    }
  };

  const refreshFornecedoresView = async (
    representanteId: string,
    expectedIncrease = 0,
  ) => {
    if (!representanteId) return;

    await loadFornecedores(representanteId, '');

    if (refreshRetryTimerRef.current) {
      clearTimeout(refreshRetryTimerRef.current);
      refreshRetryTimerRef.current = null;
    }

    // Retry curto para refletir importações/cópias imediatamente em cenários com atraso de leitura.
    if (expectedIncrease > 0) {
      refreshRetryTimerRef.current = setTimeout(() => {
        loadFornecedores(representanteId, '');
      }, 450);
    }
  };

  useEffect(() => {
    loadRepresentantes();
  }, []);

  useEffect(() => {
    return () => {
      if (refreshRetryTimerRef.current) {
        clearTimeout(refreshRetryTimerRef.current);
      }
    };
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
    loadFornecedores(selectedRepresentanteId, '');
  }, [selectedRepresentanteId]);

  const fornecedoresLista = useMemo(() => fornecedores.map((item) => item.fornecedor), [fornecedores]);

  useEffect(() => {
    setObjetivoDraftByFornecedor((prev) => {
      const next: Record<number, string> = {};
      fornecedores.forEach((item) => {
        const fornecedorId = item.fornecedor.fornecedor_id;
        const objetivoAtual = Number(item.objetivo_de_venda ?? 0);
        next[fornecedorId] =
          prev[fornecedorId] ??
          (Number.isFinite(objetivoAtual) ? objetivoAtual.toFixed(2) : '0.00');
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

  const linkedFornecedorIds = useMemo(() => new Set(fornecedoresLista.map((f) => f.fornecedor_id)), [fornecedoresLista]);
  const totalSelecionados = useMemo(
    () => fornecedoresLista.filter((fornecedor) => selectedFornecedorById[fornecedor.fornecedor_id]).length,
    [fornecedoresLista, selectedFornecedorById],
  );
  const allSelecionados = fornecedoresLista.length > 0 && totalSelecionados === fornecedoresLista.length;
  const selectedRepresentante = useMemo(
    () =>
      representantes.find(
        (representante) => String(representante.representante_id) === selectedRepresentanteId,
      ) ?? null,
    [representantes, selectedRepresentanteId],
  );
  const filteredRepresentantes = useMemo(() => {
    const term = repSearch.trim().toUpperCase();
    if (!term) return representantes;
    return representantes.filter(
      (representante) =>
        representante.nome_representante.toUpperCase().includes(term) ||
        (representante.codigo_representante || '').toUpperCase().includes(term) ||
        (representante.cnpj_cpf || '').includes(repSearch.trim()),
    );
  }, [representantes, repSearch]);

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
      const result = await suppliersService.getAll(query, 1, 100, 'ativos', true);
      setIncludeResults(result.data);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar fornecedores');
    } finally {
      setIncludeLoading(false);
    }
  };

  const openIncludeDialog = async () => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione uma força de vendas');
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
      toast.error('Selecione uma força de vendas');
      return;
    }
    setIncludeSubmittingId(fornecedorId);
    try {
      await representativesService.addFornecedor(selectedRepresentanteId, fornecedorId);
      toast.success('Fornecedor incluído com sucesso');
      await refreshFornecedoresView(selectedRepresentanteId, 1);
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
      toast.error('Selecione uma força de vendas');
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
      await representativesService.updateFornecedorObjetivo(
        Number(selectedRepresentanteId),
        fornecedorId,
        objetivo,
      );
      setFornecedores((prev) =>
        prev.map((item) =>
          item.fornecedor.fornecedor_id === fornecedorId
            ? { ...item, objetivo_de_venda: objetivo }
            : item,
        ),
      );
      setObjetivoDraftByFornecedor((prev) => {
        return {
          ...prev,
          [fornecedorId]: objetivo.toFixed(2),
        };
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

  const handleExcluirFornecedor = (fornecedorId: number) => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione uma força de vendas');
      return;
    }
    setConfirmDialog({
      message: 'Deseja excluir este fornecedor da pasta da força de vendas?',
      onConfirm: async () => {
        setRemoveFornecedorLoadingId(fornecedorId);
        try {
          await representativesService.removeFornecedor(selectedRepresentanteId, fornecedorId);
          setSelectedFornecedorById((prev) => {
            const next = { ...prev };
            delete next[fornecedorId];
            return next;
          });
          toast.success('Fornecedor excluído da pasta');
          await loadFornecedores(selectedRepresentanteId, '');
        } catch (error: any) {
          toast.error(error?.message || 'Erro ao excluir fornecedor da pasta');
        } finally {
          setRemoveFornecedorLoadingId(null);
        }
      },
    });
  };

  const handleExcluirSelecionados = () => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione uma força de vendas');
      return;
    }
    const ids = fornecedoresLista
      .map((fornecedor) => fornecedor.fornecedor_id)
      .filter((id) => selectedFornecedorById[id]);
    if (ids.length === 0) {
      toast.error('Selecione ao menos um fornecedor');
      return;
    }
    setConfirmDialog({
      message: `Deseja excluir ${ids.length} fornecedor(es) da pasta?`,
      onConfirm: async () => {
        setRemoveSelecionadosLoading(true);
        try {
          const results = await Promise.allSettled(
            ids.map((id) => representativesService.removeFornecedor(selectedRepresentanteId, id)),
          );
          const removidos = results.filter((result) => result.status === 'fulfilled').length;
          const falhas = results.length - removidos;
          if (removidos > 0) toast.success(`${removidos} fornecedor(es) excluído(s) da pasta`);
          if (falhas > 0) toast.error(`Falha ao excluir ${falhas} fornecedor(es)`);
          setSelectedFornecedorById({});
          await loadFornecedores(selectedRepresentanteId, '');
        } finally {
          setRemoveSelecionadosLoading(false);
        }
      },
    });
  };

  const openCopyDialog = async () => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione uma força de vendas');
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
      toast.error(error?.message || 'Erro ao carregar força de vendas');
      setCopyRepList([]);
    } finally {
      setCopyRepLoading(false);
    }
  };

  const handleCopyFornecedores = async () => {
    if (!selectedRepresentanteId || !copyFromRep) {
      toast.error('Selecione uma força de vendas de origem');
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
      await refreshFornecedoresView(
        selectedRepresentanteId,
        Number(result.totalCriados ?? 0),
      );
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao copiar fornecedores');
    } finally {
      setCopySubmitting(false);
    }
  };

  const loadDivisoesFornecedor = async (item: RepresentanteFornecedorItem) => {
    setDivisoesLoading(true);
    try {
      const res = await representativesService.getFornecedorDivisoes(
        item.representante.representante_id,
        item.fornecedor.fornecedor_id,
      );
      setDivisoesItems(res.data);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar divisões');
    } finally {
      setDivisoesLoading(false);
    }
  };

  const openDivisoes = async (item: RepresentanteFornecedorItem) => {
    setDivisoesFornecedor(item);
    setDivisoesItems([]);
    setDivisoesTab('pesquisa');
    setDivisaoFormDivisaoId('');
    setDivisoesOpen(true);
    loadDivisoesFornecedor(item);
    if (divisoesCatalog.length === 0) {
      try {
        const res = await divisionsService.getAll(undefined, undefined, 1, 500);
        setDivisoesCatalog(res.data);
      } catch {}
    }
  };

  const handleAddDivisao = async () => {
    if (!divisoesFornecedor || !divisaoFormDivisaoId) {
      toast.error('Selecione a divisão');
      return;
    }
    setDivisaoFormLoading(true);
    try {
      await representativesService.addFornecedorDivisao(
        divisoesFornecedor.representante.representante_id,
        divisoesFornecedor.fornecedor.fornecedor_id,
        Number(divisaoFormDivisaoId),
      );
      toast.success('Divisão adicionada');
      setDivisaoFormDivisaoId('');
      setDivisoesTab('pesquisa');
      loadDivisoesFornecedor(divisoesFornecedor);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao adicionar divisão');
    } finally {
      setDivisaoFormLoading(false);
    }
  };

  const handleDeleteDivisao = (item: FornecedorDivisaoItem) => {
    if (!divisoesFornecedor) return;
    setConfirmDialog({
      message: `Excluir divisão "${item.descricao_divisao || item.codigo_divisao}"?`,
      onConfirm: async () => {
        setDivisaoDeleteLoading(item.id);
        try {
          await representativesService.removeFornecedorDivisao(
            divisoesFornecedor.representante.representante_id,
            divisoesFornecedor.fornecedor.fornecedor_id,
            item.id,
          );
          toast.success('Divisão excluída');
          loadDivisoesFornecedor(divisoesFornecedor);
        } catch (e: any) {
          toast.error(e?.message || 'Erro ao excluir divisão');
        } finally {
          setDivisaoDeleteLoading(null);
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Força de Vendas:</label>
        <Dialog open={repSearchOpen} onOpenChange={setRepSearchOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[360px] justify-start h-9 text-sm"
              disabled={repLoading || representantes.length === 0}
            >
              <Search className="h-4 w-4 mr-2" />
              <span className="truncate">
                {selectedRepresentante
                  ? `${selectedRepresentante.codigo_representante || '-'} - ${selectedRepresentante.nome_representante}`
                  : repLoading
                  ? 'Carregando força de vendas...'
                  : 'Buscar força de vendas'}
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Buscar Força de Vendas</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Digite nome, código ou CPF/CNPJ..."
              value={repSearch}
              onChange={(e) => setRepSearch(e.target.value)}
              autoFocus
            />
            <ScrollArea className="h-64 mt-2">
              {repLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Carregando força de vendas...
                </div>
              ) : filteredRepresentantes.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma força de vendas encontrada
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredRepresentantes.map((representante) => {
                    const isSelected =
                      String(representante.representante_id) === selectedRepresentanteId;
                    return (
                      <button
                        key={representante.representante_id}
                        type="button"
                        className={`w-full rounded px-2 py-2 text-left text-sm ${
                          isSelected ? 'bg-muted' : 'hover:bg-muted/70'
                        }`}
                        onClick={() => {
                          setSelectedRepresentanteId(String(representante.representante_id));
                          setRepSearchOpen(false);
                          setRepSearch('');
                        }}
                      >
                        <div className="font-medium">
                          {(representante.codigo_representante || '-')} - {representante.nome_representante}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {representante.cnpj_cpf || '-'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {selectedRepresentante && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">
                Fornecedores de {selectedRepresentante.codigo_representante} - {selectedRepresentante.nome_representante} ({fornecedoresLista.length})
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={openIncludeDialog}>
                  <Plus className="h-4 w-4 mr-1" /> Incluir
                </Button>
                <Button size="sm" variant="outline" onClick={openCopyDialog}>
                  <Copy className="h-4 w-4 mr-1" /> Copiar de outro
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleZerarObjetivos}
                  disabled={fornecedoresLista.length === 0}
                >
                  <RotateCcw className="h-4 w-4 mr-1" /> Zerar
                </Button>
                {totalSelecionados > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleExcluirSelecionados}
                    disabled={removeSelecionadosLoading}
                  >
                    {removeSelecionadosLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Remover ({totalSelecionados})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-auto border rounded">
              {fornecedoresLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : fornecedoresLista.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum fornecedor encontrado para esta força de vendas
                </p>
              ) : (
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
                          onCheckedChange={(checked) =>
                            handleToggleAllFornecedores(checked === true)
                          }
                          aria-label="Selecionar todos os fornecedores"
                        />
                      </TableHead>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-56">Objetivo</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fornecedores.map((item) => {
                      const fornecedor = item.fornecedor;
                      return (
                      <TableRow key={fornecedor.fornecedor_id}>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={Boolean(
                              selectedFornecedorById[fornecedor.fornecedor_id],
                            )}
                            onCheckedChange={(checked) =>
                              handleToggleFornecedor(
                                fornecedor.fornecedor_id,
                                checked === true,
                              )
                            }
                            aria-label={`Selecionar fornecedor ${fornecedor.nome_fornecedor}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {fornecedor.codigo_fornecedor || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {fornecedor.nome_fornecedor}
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-8 text-xs"
                              value={
                                objetivoDraftByFornecedor[fornecedor.fornecedor_id] ??
                                '0.00'
                              }
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
                              onClick={() =>
                                handleSaveObjetivo(fornecedor.fornecedor_id)
                              }
                              disabled={
                                saveObjetivoLoading === fornecedor.fornecedor_id
                              }
                            >
                              {saveObjetivoLoading === fornecedor.fornecedor_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Divisões"
                              onClick={() => openDivisoes(item)}
                            >
                              <Layers className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleExcluirFornecedor(fornecedor.fornecedor_id)
                              }
                              disabled={
                                removeFornecedorLoadingId === fornecedor.fornecedor_id
                              }
                            >
                              {removeFornecedorLoadingId === fornecedor.fornecedor_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Registro: {fornecedoresLista.length}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={includeDialogOpen} onOpenChange={setIncludeDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Incluir fornecedor na força de vendas</DialogTitle>
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
              <Button variant="default" onClick={handleIncludeSearch} disabled={includeLoading} className="shrink-0">
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
                              variant="default"
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
        <DialogContent className="w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Copiar fornecedores de outra força de vendas</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              className="h-9 text-sm"
              placeholder="Buscar força de vendas por nome, código ou CPF/CNPJ..."
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
                          Nenhuma força de vendas disponível para cópia
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
              <Button variant="default" onClick={handleCopyFornecedores} disabled={copySubmitting || !copyFromRep}>
                {copySubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar cópia
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={divisoesOpen} onOpenChange={(v) => { setDivisoesOpen(v); if (!v) { setDivisoesFornecedor(null); setDivisaoFormDivisaoId(''); } }}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Divisões do Fornecedor
              {divisoesFornecedor && (
                <span className="text-muted-foreground font-normal text-sm ml-1">
                  — {divisoesFornecedor.fornecedor.codigo_fornecedor} {divisoesFornecedor.fornecedor.nome_fornecedor}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex border-b">
            {(['pesquisa', 'dados'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setDivisoesTab(tab); if (tab === 'dados') setDivisaoFormDivisaoId(''); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  divisoesTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'pesquisa' ? 'Pesquisa' : 'Dados da divisão'}
              </button>
            ))}
          </div>

          {divisoesTab === 'pesquisa' && (
            <div className="space-y-3">
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr className="border-b">
                      <th className="w-12 px-2 py-1.5 text-left">Id</th>
                      <th className="w-24 px-2 py-1.5 text-left">Divisão</th>
                      <th className="px-2 py-1.5 text-left">Descrição</th>
                      <th className="w-16 px-2 py-1.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisoesLoading ? (
                      <tr><td colSpan={4} className="text-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </td></tr>
                    ) : divisoesItems.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">
                        Nenhuma divisão cadastrada
                      </td></tr>
                    ) : (
                      divisoesItems.map((d) => (
                        <tr key={d.id} className="border-b hover:bg-muted/30">
                          <td className="px-2 py-1.5 font-mono">{d.id}</td>
                          <td className="px-2 py-1.5 font-mono">{d.codigo_divisao || '-'}</td>
                          <td className="px-2 py-1.5">{d.descricao_divisao || '-'}</td>
                          <td className="px-2 py-1.5 text-center">
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              disabled={divisaoDeleteLoading === d.id}
                              onClick={() => handleDeleteDivisao(d)}
                            >
                              {divisaoDeleteLoading === d.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Trash2 className="h-3 w-3" />}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Registros: {divisoesItems.length}</span>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { setDivisoesTab('dados'); setDivisaoFormDivisaoId(''); }}>
                  <Plus className="h-3.5 w-3.5" />
                  Nova divisão
                </Button>
              </div>
            </div>
          )}

          {divisoesTab === 'dados' && (
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-right">Divisão</label>
                <Select value={divisaoFormDivisaoId} onValueChange={setDivisaoFormDivisaoId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4}>
                    {divisoesCatalog.map((d) => (
                      <SelectItem key={d.divisao_id} value={String(d.divisao_id)}>
                        {d.descricao_divisao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            {divisoesTab === 'dados' ? (
              <>
                <Button variant="outline" onClick={() => { setDivisaoFormDivisaoId(''); setDivisoesTab('pesquisa'); }}>
                  Cancelar
                </Button>
                <Button onClick={handleAddDivisao} disabled={divisaoFormLoading}>
                  {divisaoFormLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Adicionar
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setDivisoesOpen(false)}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialog !== null} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { const fn = confirmDialog?.onConfirm; setConfirmDialog(null); fn?.(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
