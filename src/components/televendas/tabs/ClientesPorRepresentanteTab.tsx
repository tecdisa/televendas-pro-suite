import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Download, Copy, Trash2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { representativesService, Representante } from '@/services/representativesService';
import { clientsService, Client } from '@/services/clientsService';
import { metadataService, Uf, Cidade, Rota, Rede, SegmentoVenda, FormaPagamento, PrazoPagto } from '@/services/metadataService';

const formatGridNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function ClientesPorRepresentanteTab() {
  const PAGE_LIMIT = 100;

  // Representative selection
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [repLoading, setRepLoading] = useState(false);
  const [repSearch, setRepSearch] = useState('');
  const [selectedRep, setSelectedRep] = useState<Representante | null>(null);

  // Client listing for selected representative
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsLoadingMore, setClientsLoadingMore] = useState(false);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsHasMore, setClientsHasMore] = useState(false);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filters, setFilters] = useState({ search: '', uf: 'all', cidade: 'all', bairro: '' });
  const activeFiltersRef = useRef(filters);
  const [filterUfs, setFilterUfs] = useState<Uf[]>([]);
  const [filterCidades, setFilterCidades] = useState<Cidade[]>([]);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [cidadesLoading, setCidadesLoading] = useState(false);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importFilters, setImportFilters] = useState({
    segmentoId: 'all',
    uf: 'all',
    cidadeId: 'all',
    bairro: '',
    redeId: 'all',
    rotaId: 'all',
    dataCadastroDe: '',
    dataCadastroAte: '',
  });
  const [importUfs, setImportUfs] = useState<Uf[]>([]);
  const [importCidades, setImportCidades] = useState<Cidade[]>([]);
  const [importSegmentos, setImportSegmentos] = useState<SegmentoVenda[]>([]);
  const [importRedes, setImportRedes] = useState<Rede[]>([]);
  const [importRotas, setImportRotas] = useState<Rota[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<Client[]>([]);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [importHasSearched, setImportHasSearched] = useState(false);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<number>>(new Set());

  // Copy modal
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFromRep, setCopyFromRep] = useState<Representante | null>(null);
  const [copyRepSearch, setCopyRepSearch] = useState('');
  const [copyRepList, setCopyRepList] = useState<Representante[]>([]);
  const [copyRepLoading, setCopyRepLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);

  // Lookup tables for grid columns
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [prazos, setPrazos] = useState<PrazoPagto[]>([]);
  const [segmentos, setSegmentos] = useState<SegmentoVenda[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);

  const formasMap = useMemo(() => new Map(formas.map((f) => [Number(f.id), f.descricao || String(f.id)])), [formas]);
  const prazosMap = useMemo(() => new Map(prazos.map((p) => [Number(p.id), p.descricao || String(p.id)])), [prazos]);
  const segmentosMap = useMemo(() => new Map(segmentos.map((s) => [Number(s.id), s.descricao || String(s.id)])), [segmentos]);
  const redesMap = useMemo(() => new Map(redes.map((r) => [Number(r.id), r.descricao || String(r.id)])), [redes]);
  const rotasMap = useMemo(() => new Map(rotas.map((r) => [Number(r.id), r.descricao_rota || r.codigo_rota || String(r.id)])), [rotas]);

  // Load representatives
  const loadRepresentantes = async (query?: string) => {
    setRepLoading(true);
    try {
      const result = await representativesService.getAll(query, 1, 200);
      setRepresentantes(result.data);
    } catch (e: any) {
      toast.error('Erro ao carregar representante');
    } finally {
      setRepLoading(false);
    }
  };

  useEffect(() => {
    loadRepresentantes();
    loadFilterUfs();
    Promise.all([
      metadataService.getSegmentosVendas(),
      metadataService.getRedes(),
      metadataService.getRotas(),
      metadataService.getFormasPagamento(),
      metadataService.getPrazos(),
    ]).then(([segs, rds, rts, frms, przs]) => {
      setSegmentos(segs);
      setRedes(rds);
      setRotas(rts);
      setFormas(frms);
      setPrazos(przs);
    }).catch(() => {});
  }, []);

  // Load filter UFs
  const loadFilterUfs = async () => {
    setUfsLoading(true);
    try {
      const data = await metadataService.getUfs();
      setFilterUfs(data);
    } catch { } finally {
      setUfsLoading(false);
    }
  };

  // Load filter cidades when UF changes
  useEffect(() => {
    if (filters.uf && filters.uf !== 'all') {
      setCidadesLoading(true);
      metadataService.getCidadesPorUf(filters.uf).then(setFilterCidades).catch(() => { }).finally(() => setCidadesLoading(false));
    } else {
      setFilterCidades([]);
    }
  }, [filters.uf]);

  // Load first page of clients (resets list)
  const loadClients = async (overrideFilters?: typeof filters) => {
    if (!selectedRep) return;
    const f = overrideFilters ?? filters;
    activeFiltersRef.current = f;
    setClientsLoading(true);
    setClients([]);
    setSelectedClientIds(new Set());
    setClientsPage(1);
    setClientsHasMore(false);
    setClientsTotal(0);
    try {
      const result = await clientsService.getByRepresentante({
        representanteId: selectedRep.representante_id,
        q: f.search || undefined,
        uf: f.uf && f.uf !== 'all' ? f.uf : undefined,
        cidade: f.cidade && f.cidade !== 'all' ? f.cidade : undefined,
        bairro: f.bairro || undefined,
        page: 1,
        limit: PAGE_LIMIT,
      });
      setClients(result.data);
      setClientsTotal(result.total);
      setClientsPage(2);
      setClientsHasMore(result.data.length === PAGE_LIMIT);
    } catch {
      toast.error('Erro ao carregar clientes do representante');
    } finally {
      setClientsLoading(false);
    }
  };

  // Load next page and append
  const loadMoreClients = useCallback(async () => {
    if (!selectedRep || clientsLoadingMore || !clientsHasMore) return;
    setClientsLoadingMore(true);
    const f = activeFiltersRef.current;
    try {
      const result = await clientsService.getByRepresentante({
        representanteId: selectedRep.representante_id,
        q: f.search || undefined,
        uf: f.uf && f.uf !== 'all' ? f.uf : undefined,
        cidade: f.cidade && f.cidade !== 'all' ? f.cidade : undefined,
        bairro: f.bairro || undefined,
        page: clientsPage,
        limit: PAGE_LIMIT,
      });
      setClients(prev => [...prev, ...result.data]);
      setClientsPage(prev => prev + 1);
      setClientsHasMore(result.data.length === PAGE_LIMIT);
    } catch {
      toast.error('Erro ao carregar mais clientes');
    } finally {
      setClientsLoadingMore(false);
    }
  }, [selectedRep, clientsPage, clientsHasMore, clientsLoadingMore]);

  // IntersectionObserver para scroll infinito
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreClients(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreClients]);

  useEffect(() => {
    if (selectedRep) {
      loadClients();
    } else {
      setClients([]);
      setClientsHasMore(false);
    }
  }, [selectedRep]);

  const handleSelectRep = (rep: Representante) => {
    setSelectedRep(rep);
    setFilters({ search: '', uf: 'all', cidade: 'all', bairro: '' });
  };

  const handleClearFilters = () => {
    const def = { search: '', uf: 'all', cidade: 'all', bairro: '' };
    setFilters(def);
    setFilterCidades([]);
    loadClients(def);
  };

  // Toggle selection
  const toggleClient = (id: number) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAllClients = () => {
    if (selectedClientIds.size === clients.length) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(clients.map(c => c.id)));
    }
  };

  // === IMPORT MODAL ===
  const openImportModal = async () => {
    setImportOpen(true);
    setImportFilters({ segmentoId: 'all', uf: 'all', cidadeId: 'all', bairro: '', redeId: 'all', rotaId: 'all' });
    setImportPreview([]);
    setImportHasSearched(false);
    setImportSelectedIds(new Set());
    // Load metadata for import filters
    try {
      const [ufs, segmentos, redes, rotas] = await Promise.all([
        metadataService.getUfs(),
        metadataService.getSegmentosVendas(),
        metadataService.getRedes(),
        metadataService.getRotas(),
      ]);
      setImportUfs(ufs);
      setImportSegmentos(segmentos);
      setImportRedes(redes);
      setImportRotas(rotas);
    } catch { }
  };

  // Load import cidades
  useEffect(() => {
    if (importFilters.uf && importFilters.uf !== 'all') {
      metadataService.getCidadesPorUf(importFilters.uf).then(setImportCidades).catch(() => { });
    } else {
      setImportCidades([]);
    }
  }, [importFilters.uf]);

  const handleImportSearch = async () => {
    setImportPreviewLoading(true);
    setImportHasSearched(true);
    setImportSelectedIds(new Set());
    try {
      const f = importFilters;
      const searchFilters: any = {};
      searchFilters.status = 'todos';
      if (f.segmentoId && f.segmentoId !== 'all') searchFilters.classeId = Number(f.segmentoId);
      if (f.uf && f.uf !== 'all') searchFilters.uf = f.uf;
      if (f.cidadeId && f.cidadeId !== 'all') {
        const cidadeId = Number(f.cidadeId);
        searchFilters.cidadeId = cidadeId;
        const cidadeSel = importCidades.find((c) => c.cidade_id === cidadeId);
        if (cidadeSel?.nome_cidade) searchFilters.cidade = cidadeSel.nome_cidade;
      }
      if (f.bairro) searchFilters.bairro = f.bairro;
      if (f.redeId && f.redeId !== 'all') searchFilters.redeId = Number(f.redeId);
      if (f.rotaId && f.rotaId !== 'all') searchFilters.rotaId = Number(f.rotaId);
      if (f.dataCadastroDe) searchFilters.cadastradosDe = f.dataCadastroDe;
      if (f.dataCadastroAte) searchFilters.cadastradosAte = f.dataCadastroAte;
      // Backend caps at 100/page — paginate until all records are fetched
      const PAGE_SIZE = 100;
      let currentPage = 1;
      const all: Client[] = [];
      while (true) {
        const batch = await clientsService.search(searchFilters, undefined, currentPage, PAGE_SIZE);
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        currentPage++;
      }
      setImportPreview(all);
    } catch (e: any) {
      toast.error('Erro ao buscar clientes para importar');
    } finally {
      setImportPreviewLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!selectedRep || importSelectedIds.size === 0) {
      toast.error('Selecione ao menos um cliente para importar');
      return;
    }
    setImportLoading(true);
    try {
      const result = await representativesService.importarClientes(
        selectedRep.representante_id,
        Array.from(importSelectedIds),
      );
      toast.success(`${result.totalCriados} cliente(s) importado(s)${result.totalIgnorados ? ` (${result.totalIgnorados} já vinculados)` : ''}`);
      setImportOpen(false);
      loadClients();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao importar clientes');
    } finally {
      setImportLoading(false);
    }
  };

  const toggleImportClient = (id: number) => {
    setImportSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAllImportClients = () => {
    if (importSelectedIds.size === importPreview.length) {
      setImportSelectedIds(new Set());
    } else {
      setImportSelectedIds(new Set(importPreview.map(c => c.id)));
    }
  };

  // === COPY MODAL ===
  const openCopyModal = async () => {
    setCopyOpen(true);
    setCopyFromRep(null);
    setCopyRepSearch('');
    setCopyRepLoading(true);
    try {
      const result = await representativesService.getAll('', 1, 200);
      setCopyRepList(result.data.filter(r => r.representante_id !== selectedRep?.representante_id));
    } catch { } finally {
      setCopyRepLoading(false);
    }
  };

  const handleCopyRepSelect = (rep: Representante) => {
    setCopyFromRep(rep);
  };

  const handleCopyConfirm = async () => {
    if (!selectedRep || !copyFromRep) {
      toast.error('Selecione um representante de origem');
      return;
    }
    setCopyLoading(true);
    try {
      const result = await representativesService.copyClientes(
        selectedRep.representante_id,
        copyFromRep.representante_id,
      );
      toast.success(
        `Copiados: ${result.totalCriados ?? 0} | Ignorados (duplicados): ${result.totalIgnorados ?? 0}`
      );
      setCopyOpen(false);
      loadClients();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao copiar clientes');
    } finally {
      setCopyLoading(false);
    }
  };


  // Remove client from representative
  const handleRemoveClients = async () => {
    if (!selectedRep || selectedClientIds.size === 0) return;
    if (!confirm(`Deseja remover ${selectedClientIds.size} cliente(s) deste representante?`)) return;
    try {
      const promises = Array.from(selectedClientIds).map(clientId =>
        representativesService.removeClienteRepresentante(clientId, selectedRep.representante_id)
      );
      await Promise.all(promises);
      toast.success(`${selectedClientIds.size} cliente(s) removido(s)`);
      loadClients();
    } catch {
      toast.error('Erro ao remover clientes');
    }
  };

  // Filtered copy rep list
  const filteredCopyReps = copyRepSearch
    ? copyRepList.filter(r =>
      r.nome_representante.toUpperCase().includes(copyRepSearch.toUpperCase()) ||
      (r.codigo_representante || '').includes(copyRepSearch)
    )
    : copyRepList;

  // Filtered reps for the main dropdown
  const filteredReps = repSearch
    ? representantes.filter(r =>
        r.nome_representante.toUpperCase().includes(repSearch.toUpperCase()) ||
        (r.codigo_representante || '').includes(repSearch)
      )
    : representantes;

  return (
    <div className="space-y-4">
      {/* Representante - seleção */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Representante:</label>
        <Select
          value={selectedRep ? String(selectedRep.representante_id) : ''}
          onValueChange={(val) => {
            const rep = representantes.find(r => String(r.representante_id) === val);
            if (rep) handleSelectRep(rep);
          }}
        >
          <SelectTrigger className="h-9 text-sm w-full sm:w-[360px]">
            <SelectValue placeholder={repLoading ? 'Carregando...' : 'Selecione um representante'} />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1.5">
              <Input
                placeholder="Buscar..."
                value={repSearch}
                onChange={e => setRepSearch(e.target.value)}
                className="h-7 text-sm"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
              />
            </div>
            {filteredReps.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum encontrado</p>
            ) : (
              filteredReps.map(r => (
                <SelectItem key={r.representante_id} value={String(r.representante_id)}>
                  {r.codigo_representante} - {r.nome_representante}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {selectedRep && (
          <Button variant="ghost" size="sm" onClick={() => { setSelectedRep(null); setRepSearch(''); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* Client listing (only when rep is selected) */}
      {selectedRep && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Clientes de {selectedRep.codigo_representante} - {selectedRep.nome_representante} ({clientsTotal})
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openImportModal}>
                  <Download className="h-4 w-4 mr-1" /> Importar
                </Button>
                <Button size="sm" variant="outline" onClick={openCopyModal}>
                  <Copy className="h-4 w-4 mr-1" /> Copiar de outro
                </Button>
                {selectedClientIds.size > 0 && (
                  <Button size="sm" variant="destructive" onClick={handleRemoveClients}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remover ({selectedClientIds.size})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
              <Input
                placeholder="Buscar cliente..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && loadClients()}
                className="h-8 text-sm"
              />
              <Select value={filters.uf} onValueChange={v => setFilters({ ...filters, uf: v, cidade: 'all' })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={ufsLoading ? 'Carregando...' : 'UF'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos UFs</SelectItem>
                  {filterUfs.map(u => <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.cidade} onValueChange={v => setFilters({ ...filters, cidade: v })} disabled={filters.uf === 'all'}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={cidadesLoading ? 'Carregando...' : 'Cidade'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {filterCidades.map(c => <SelectItem key={c.cidade_id} value={c.nome_cidade}>{c.nome_cidade}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                placeholder="Bairro"
                value={filters.bairro}
                onChange={e => setFilters({ ...filters, bairro: e.target.value })}
                className="h-8 text-sm"
              />
              <div className="flex gap-1">
                <Button variant="default" size="sm" className="flex-1" onClick={() => loadClients()}>
                  <Search className="h-4 w-4 mr-1" /> Buscar
                </Button>
                <Button size="sm" variant="outline" onClick={handleClearFilters}>Limpar filtros</Button>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-[500px] overflow-auto border rounded">
              {clientsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-10 px-2">
                          <Checkbox checked={selectedClientIds.size === clients.length && clients.length > 0} onCheckedChange={toggleAllClients} />
                        </TableHead>
                        <TableHead className="w-28">Código</TableHead>
                        <TableHead className="min-w-[240px]">Nome</TableHead>
                        <TableHead className="w-44">Fantasia</TableHead>
                        <TableHead className="w-36">CNPJ/CPF</TableHead>
                        <TableHead className="w-16">Pessoa</TableHead>
                        <TableHead className="w-32">Cidade</TableHead>
                        <TableHead className="w-12">UF</TableHead>
                        <TableHead className="w-36">Bairro</TableHead>
                        <TableHead className="w-44">Endereço</TableHead>
                        <TableHead className="w-20">Número</TableHead>
                        <TableHead className="w-24">CEP</TableHead>
                        <TableHead className="w-32">Telefone</TableHead>
                        <TableHead className="w-32">WhatsApp</TableHead>
                        <TableHead className="w-44">Email</TableHead>
                        <TableHead className="w-36">Comprador</TableHead>
                        <TableHead className="w-36">Segmento</TableHead>
                        <TableHead className="w-36">Rede</TableHead>
                        <TableHead className="w-36">Rota</TableHead>
                        <TableHead className="w-40">Forma Pagto</TableHead>
                        <TableHead className="w-40">Prazo Pagto</TableHead>
                        <TableHead className="w-28 text-right">Limite Créd.</TableHead>
                        <TableHead className="w-24 text-right">Crédito</TableHead>
                        <TableHead className="w-24 text-right">Aberto</TableHead>
                        <TableHead className="w-24 text-right">Disponível</TableHead>
                        <TableHead className="w-16 text-center">B2B</TableHead>
                        <TableHead className="w-16 text-center">Simples</TableHead>
                        <TableHead className="w-24 text-center">Cons. Final</TableHead>
                        <TableHead className="w-16 text-center">Inativo</TableHead>
                        <TableHead className="w-36">Tab. Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map(c => {
                        const formaPagtoLabel = c.formaPagtoId != null ? formasMap.get(Number(c.formaPagtoId)) || String(c.formaPagtoId) : '-';
                        const prazoPagtoLabel = c.prazoPagtoId != null ? prazosMap.get(Number(c.prazoPagtoId)) || String(c.prazoPagtoId) : '-';
                        const segmentoLabel = c.segmentoId != null ? segmentosMap.get(Number(c.segmentoId)) || String(c.segmentoId) : '-';
                        const redeLabel = c.redeId != null ? redesMap.get(Number(c.redeId)) || String(c.redeId) : '-';
                        const rotaLabel = c.rotaId != null ? rotasMap.get(Number(c.rotaId)) || String(c.rotaId) : '-';
                        return (
                          <TableRow key={c.id} className="text-xs">
                            <TableCell className="px-2">
                              <Checkbox checked={selectedClientIds.has(c.id)} onCheckedChange={() => toggleClient(c.id)} />
                            </TableCell>
                            <TableCell className="font-mono">{c.codigoCliente ?? ''}</TableCell>
                            <TableCell className="font-medium">
                              <div className="truncate whitespace-nowrap max-w-[240px]" title={c.nome}>{c.nome}</div>
                            </TableCell>
                            <TableCell>{c.fantasia || '-'}</TableCell>
                            <TableCell>{c.cnpjCpf || '-'}</TableCell>
                            <TableCell>{c.tipoPessoa || '-'}</TableCell>
                            <TableCell>{c.cidade || '-'}</TableCell>
                            <TableCell>{c.uf || '-'}</TableCell>
                            <TableCell>{c.bairro || '-'}</TableCell>
                            <TableCell>{c.endereco || '-'}</TableCell>
                            <TableCell>{c.numero || '-'}</TableCell>
                            <TableCell>{c.cep || '-'}</TableCell>
                            <TableCell>{c.fone || '-'}</TableCell>
                            <TableCell>{c.whatsapp || '-'}</TableCell>
                            <TableCell>{c.email || '-'}</TableCell>
                            <TableCell>{c.compradorNome || '-'}</TableCell>
                            <TableCell>{segmentoLabel}</TableCell>
                            <TableCell>{redeLabel}</TableCell>
                            <TableCell>{rotaLabel}</TableCell>
                            <TableCell>{formaPagtoLabel}</TableCell>
                            <TableCell>{prazoPagtoLabel}</TableCell>
                            <TableCell className="text-right font-mono">{formatGridNumber(c.limiteCredito)}</TableCell>
                            <TableCell className="text-right font-mono">{formatGridNumber(c.credito)}</TableCell>
                            <TableCell className="text-right font-mono">{formatGridNumber(c.aberto)}</TableCell>
                            <TableCell className="text-right font-mono">{formatGridNumber(c.disponivel)}</TableCell>
                            <TableCell className="text-center">{c.b2bLiberado ? 'Sim' : 'Não'}</TableCell>
                            <TableCell className="text-center">{c.simplesNacional ? 'Sim' : 'Não'}</TableCell>
                            <TableCell className="text-center">{c.consumidorFinal ? 'Sim' : 'Não'}</TableCell>
                            <TableCell className="text-center">{c.inativo ? 'Sim' : 'Não'}</TableCell>
                            <TableCell className="font-mono">
                              {c.tabelasCodigos?.length ? c.tabelasCodigos.join(', ') : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div ref={sentinelRef} className="py-2 flex justify-center">
                    {clientsLoadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Carregados: {clients.length} / Total: {clientsTotal}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Import Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar clientes do cadastro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Segmento</label>
                <Select value={importFilters.segmentoId} onValueChange={v => setImportFilters({ ...importFilters, segmentoId: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {importSegmentos.map(s => <SelectItem key={String(s.id)} value={String(s.id)}>{s.descricao}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
                <Select value={importFilters.uf} onValueChange={v => setImportFilters({ ...importFilters, uf: v, cidadeId: 'all' })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {importUfs.map(u => <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                <Select value={importFilters.cidadeId} onValueChange={v => setImportFilters({ ...importFilters, cidadeId: v })} disabled={importFilters.uf === 'all'}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {importCidades.map(c => <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                <Input className="h-8 text-sm" value={importFilters.bairro} onChange={e => setImportFilters({ ...importFilters, bairro: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Rede</label>
                <Select value={importFilters.redeId} onValueChange={v => setImportFilters({ ...importFilters, redeId: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {importRedes.map(r => <SelectItem key={String(r.id)} value={String(r.id)}>{r.descricao}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Rota</label>
                <Select value={importFilters.rotaId} onValueChange={v => setImportFilters({ ...importFilters, rotaId: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {importRotas.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cadastrado de</label>
                <Input type="date" className="h-8 text-sm" value={importFilters.dataCadastroDe} onChange={e => setImportFilters({ ...importFilters, dataCadastroDe: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cadastrado até</label>
                <Input type="date" className="h-8 text-sm" value={importFilters.dataCadastroAte} onChange={e => setImportFilters({ ...importFilters, dataCadastroAte: e.target.value })} />
              </div>
            </div>
            <Button variant="default" size="sm" onClick={handleImportSearch} disabled={importPreviewLoading}>
              {importPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
              Buscar clientes
            </Button>

            {importPreview.length > 0 && (
              <div className="max-h-[300px] overflow-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={importSelectedIds.size === importPreview.length} onCheckedChange={toggleAllImportClients} />
                      </TableHead>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-24">Cidade</TableHead>
                      <TableHead className="w-12">UF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map(c => (
                      <TableRow key={c.id}>
                        <TableCell><Checkbox checked={importSelectedIds.has(c.id)} onCheckedChange={() => toggleImportClient(c.id)} /></TableCell>
                        <TableCell className="text-xs">{c.codigoCliente || c.id}</TableCell>
                        <TableCell className="text-xs">{c.nome}</TableCell>
                        <TableCell className="text-xs">{c.cidade}</TableCell>
                        <TableCell className="text-xs">{c.uf}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {importHasSearched && !importPreviewLoading && importPreview.length === 0 && (
              <div className="text-sm text-muted-foreground border rounded p-4 text-center">
                Nenhum cliente encontrado para os filtros informados.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button variant="default" onClick={handleImportConfirm} disabled={importLoading || importSelectedIds.size === 0}>
              {importLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Importar {importSelectedIds.size > 0 ? `(${importSelectedIds.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Modal */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Copiar clientes de outro representante</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-auto">
            {!copyFromRep ? (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar representante..."
                    value={copyRepSearch}
                    onChange={e => setCopyRepSearch(e.target.value)}
                    className="h-8 text-sm max-w-md"
                  />
                </div>
                <div className="max-h-[300px] overflow-auto border rounded">
                  {copyRepLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : filteredCopyReps.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum representante encontrado</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Código</TableHead>
                          <TableHead>Nome</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCopyReps.map(r => (
                          <TableRow key={r.representante_id} className="cursor-pointer hover:bg-muted/70" onClick={() => handleCopyRepSelect(r)}>
                            <TableCell className="text-xs">{r.codigo_representante}</TableCell>
                            <TableCell className="text-xs">{r.nome_representante}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {copyFromRep.codigo_representante} - {copyFromRep.nome_representante}
                </span>
                <Button variant="outline" size="sm" onClick={() => setCopyFromRep(null)}>Trocar</Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>Cancelar</Button>
            <Button variant="default" onClick={handleCopyConfirm} disabled={copyLoading || !copyFromRep}>
              {copyLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Copiar todos os clientes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
