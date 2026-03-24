import { useState, useEffect } from 'react';
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
import { metadataService, Uf, Cidade, Rota, Rede, SegmentoVenda } from '@/services/metadataService';

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
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set());

  // Filters
  const [filters, setFilters] = useState({ search: '', uf: 'all', cidade: 'all', bairro: '' });
  const [filterUfs, setFilterUfs] = useState<Uf[]>([]);
  const [filterCidades, setFilterCidades] = useState<Cidade[]>([]);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [cidadesLoading, setCidadesLoading] = useState(false);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importFilters, setImportFilters] = useState({
    segmentoId: 'all',
    uf: 'all',
    cidade: 'all',
    bairro: '',
    redeId: 'all',
    rotaId: 'all',
  });
  const [importUfs, setImportUfs] = useState<Uf[]>([]);
  const [importCidades, setImportCidades] = useState<Cidade[]>([]);
  const [importSegmentos, setImportSegmentos] = useState<SegmentoVenda[]>([]);
  const [importRedes, setImportRedes] = useState<Rede[]>([]);
  const [importRotas, setImportRotas] = useState<Rota[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<Client[]>([]);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<number>>(new Set());

  // Copy modal
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFromRep, setCopyFromRep] = useState<Representante | null>(null);
  const [copyRepSearch, setCopyRepSearch] = useState('');
  const [copyRepList, setCopyRepList] = useState<Representante[]>([]);
  const [copyRepLoading, setCopyRepLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);

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

  // Load clients for the selected representative using dedicated endpoint
  const loadClients = async (overrideFilters?: typeof filters) => {
    if (!selectedRep) return;
    setClientsLoading(true);
    setSelectedClientIds(new Set());
    const f = overrideFilters ?? filters;
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
      setClients(result);
    } catch (e: any) {
      toast.error('Erro ao carregar clientes do representante');
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRep) {
      loadClients();
    } else {
      setClients([]);
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
    setImportFilters({ segmentoId: 'all', uf: 'all', cidade: 'all', bairro: '', redeId: 'all', rotaId: 'all' });
    setImportPreview([]);
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
    setImportSelectedIds(new Set());
    try {
      const f = importFilters;
      const searchFilters: any = {};
      if (f.segmentoId && f.segmentoId !== 'all') searchFilters.segmentoId = Number(f.segmentoId);
      if (f.uf && f.uf !== 'all') searchFilters.uf = f.uf;
      if (f.cidade && f.cidade !== 'all') searchFilters.cidade = f.cidade;
      if (f.bairro) searchFilters.bairro = f.bairro;
      if (f.redeId && f.redeId !== 'all') searchFilters.redeId = Number(f.redeId);
      if (f.rotaId && f.rotaId !== 'all') searchFilters.rotaId = Number(f.rotaId);
      const result = await clientsService.search(searchFilters, undefined, 1, 200);
      setImportPreview(result);
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
      // For each selected client, update their representanteId
      const promises = Array.from(importSelectedIds).map(clientId =>
        clientsService.update(clientId, { representanteId: String(selectedRep.representante_id) })
      );
      await Promise.all(promises);
      toast.success(`${importSelectedIds.size} cliente(s) importado(s) com sucesso`);
      setImportOpen(false);
      loadClients();
    } catch (e: any) {
      toast.error('Erro ao importar clientes');
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
                Clientes de {selectedRep.codigo_representante} - {selectedRep.nome_representante} ({clients.length})
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
                <Button size="sm" className="flex-1" onClick={() => loadClients()}>
                  <Search className="h-4 w-4 mr-1" /> Filtrar
                </Button>
                <Button size="sm" variant="outline" onClick={handleClearFilters}>Limpar</Button>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-[500px] overflow-auto border rounded">
              {clientsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selectedClientIds.size === clients.length && clients.length > 0} onCheckedChange={toggleAllClients} />
                      </TableHead>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-24">Cidade</TableHead>
                      <TableHead className="w-12">UF</TableHead>
                      <TableHead className="w-28">Bairro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Checkbox checked={selectedClientIds.has(c.id)} onCheckedChange={() => toggleClient(c.id)} />
                        </TableCell>
                        <TableCell className="text-xs">{c.codigoCliente || c.id}</TableCell>
                        <TableCell className="text-xs">{c.nome}</TableCell>
                        <TableCell className="text-xs">{c.cidade}</TableCell>
                        <TableCell className="text-xs">{c.uf}</TableCell>
                        <TableCell className="text-xs">{c.bairro}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Registro: {clients.length}</p>
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
                <Select value={importFilters.uf} onValueChange={v => setImportFilters({ ...importFilters, uf: v, cidade: 'all' })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {importUfs.map(u => <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                <Select value={importFilters.cidade} onValueChange={v => setImportFilters({ ...importFilters, cidade: v })} disabled={importFilters.uf === 'all'}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {importCidades.map(c => <SelectItem key={c.cidade_id} value={c.nome_cidade}>{c.nome_cidade}</SelectItem>)}
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
            </div>
            <Button size="sm" onClick={handleImportSearch} disabled={importPreviewLoading}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportConfirm} disabled={importLoading || importSelectedIds.size === 0}>
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
                <Button variant="ghost" size="sm" onClick={() => setCopyFromRep(null)}>Trocar</Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>Cancelar</Button>
            <Button onClick={handleCopyConfirm} disabled={copyLoading || !copyFromRep}>
              {copyLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Copiar todos os clientes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
