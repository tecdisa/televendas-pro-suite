import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Plus, Pencil, Trash2, Info, Search, Loader2, ChevronDown, ChevronUp, Columns3, FileSpreadsheet, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { clientsService, Client } from '@/services/clientsService';
import { metadataService, Rota, Tabela, Uf, Cidade, SegmentoVenda, Rede, PrazoPagto, FormaPagamento } from '@/services/metadataService';
import { representativesService, Representative } from '@/services/representativesService';
import { operacoes } from '@/mocks/data';
import { ClientInfoModal } from '../overlays/ClientInfoModal';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  formatCnpjCpf,
  getCpfOrCnpjValidationMessage,
  isNumericCnpj,
  normalizeCnpjCpf,
} from '@/utils/cnpjCpf';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

const debounce = <T extends (...args: any[]) => void>(fn: T, wait = 300) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();
const toUpperTrimValue = (value: string | number | null | undefined) => String(value ?? '').trim().toUpperCase();
const formatPhone = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
};
const normalizePhoneDigits = (value: string | number | null | undefined) =>
  String(value ?? '').replace(/\D+/g, '').slice(0, 11);
const parseDecimalInput = (value: string | number | null | undefined) => {
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(raw)
    ? raw.replace(/\./g, '')
    : raw.replace(/,/g, '');
  return Number(normalized);
};
const formatCpf = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};
const formatRg = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 9);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}-${digits.slice(8)}`;
};
const formatCep = (value: string | number | null | undefined) => {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};
const handleUpperChange = (e: ChangeEvent<HTMLInputElement>) => {
  e.currentTarget.value = toUpperValue(e.currentTarget.value);
};
const handleCepChange = (e: ChangeEvent<HTMLInputElement>) => {
  e.currentTarget.value = formatCep(e.currentTarget.value);
};
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value: string) => emailRegex.test(value.trim());
const getTabelaLabel = (tabela: Tabela) => (tabela.codigo ? `${tabela.codigo} - ${tabela.descricao}` : tabela.descricao);
const summarizeSelection = (items: string[], emptyLabel = 'Selecione...') => {
  const filtered = Array.from(new Set(items.filter(Boolean)));
  if (filtered.length === 0) return emptyLabel;
  if (filtered.length <= 2) return filtered.join(', ');
  return `${filtered.slice(0, 2).join(', ')} +${filtered.length - 2}`;
};
const generateB2bSenha = (length = 12) => {
  const size = Math.min(Math.max(length, 1), 20);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: size }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};
const formatGridNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return parsed.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
const getLoggedCompanyUf = () => toUpperTrimValue(authService.getEmpresa()?.uf || '');

type ClientListFilters = {
  status: 'ativos' | 'inativos' | 'todos';
  searchMode: 'inicial' | 'contido';
  search: string;
  todos: boolean;
  clientesB2b: boolean;
  filtrarCidades: boolean;
  tipoPessoa: 'all' | 'fisica' | 'juridica';
  uf: string;
  cidade: string;
  bairro: string;
  classe: string;
  formaPagto: string;
  prazoPagto: string;
  rota: string;
  rede: string;
  tabelaPreco: string;
  naoPositivadoDesde: string;
  cadastroDe: string;
  cadastroAte: string;
};

const defaultClientFilters: ClientListFilters = {
  status: 'ativos',
  searchMode: 'contido',
  search: '',
  todos: false,
  clientesB2b: false,
  filtrarCidades: false,
  tipoPessoa: 'all',
  uf: 'all',
  cidade: 'all',
  bairro: '',
  classe: 'all',
  formaPagto: 'all',
  prazoPagto: 'all',
  rota: 'all',
  rede: 'all',
  tabelaPreco: 'all',
  naoPositivadoDesde: '',
  cadastroDe: '',
  cadastroAte: '',
};
const CLIENTES_FILTERS_COLLAPSE_STORAGE_KEY = 'televendas:clientes:filtersOpen';
const CLIENTES_PINNED_COLUMNS_STORAGE_KEY = 'televendas:clientes:pinnedColumns';
const CLIENTES_FIX_ACTIONS_STORAGE_KEY = 'televendas:clientes:fixActions';

const CLIENTS_GRID_COLUMNS = [
  { key: 'select', label: 'Seleção', width: 56, pinnable: true },
  { key: 'codigo', label: 'Código', width: 120, pinnable: true },
  { key: 'nome', label: 'Nome', width: 320, pinnable: true },
  { key: 'fantasia', label: 'Fantasia', width: 220, pinnable: true },
  { key: 'cnpjCpf', label: 'CNPJ/CPF', width: 150, pinnable: true },
  { key: 'pessoa', label: 'Pessoa', width: 80, pinnable: true },
  { key: 'cidade', label: 'Cidade', width: 160, pinnable: true },
  { key: 'uf', label: 'UF', width: 64, pinnable: true },
  { key: 'bairro', label: 'Bairro', width: 160, pinnable: true },
  { key: 'endereco', label: 'Endereço', width: 220, pinnable: true },
  { key: 'numero', label: 'Número', width: 96, pinnable: true },
  { key: 'cep', label: 'CEP', width: 120, pinnable: true },
  { key: 'telefone', label: 'Telefone', width: 140, pinnable: true },
  { key: 'whatsapp', label: 'WhatsApp', width: 140, pinnable: true },
  { key: 'email', label: 'Email', width: 220, pinnable: true },
  { key: 'comprador', label: 'Comprador', width: 180, pinnable: true },
  { key: 'segmento', label: 'Segmento', width: 160, pinnable: true },
  { key: 'rede', label: 'Rede', width: 160, pinnable: true },
  { key: 'rota', label: 'Rota', width: 160, pinnable: true },
  { key: 'formaPagto', label: 'Forma Pagto', width: 170, pinnable: true },
  { key: 'prazoPagto', label: 'Prazo Pagto', width: 170, pinnable: true },
  { key: 'limiteCredito', label: 'Limite Crédito', width: 128, pinnable: true },
  { key: 'credito', label: 'Crédito', width: 112, pinnable: true },
  { key: 'aberto', label: 'Aberto', width: 112, pinnable: true },
  { key: 'disponivel', label: 'Disponível', width: 112, pinnable: true },
  { key: 'b2b', label: 'B2B', width: 80, pinnable: true },
  { key: 'simples', label: 'Simples', width: 80, pinnable: true },
  { key: 'consumidorFinal', label: 'Consum. Final', width: 96, pinnable: true },
  { key: 'inativo', label: 'Inativo', width: 80, pinnable: true },
  { key: 'tabelasPreco', label: 'Tab. Preço', width: 140, pinnable: true },
  { key: 'acoes', label: 'Ações', width: 112, pinnable: false },
] as const;

type ClientsGridColumnKey = typeof CLIENTS_GRID_COLUMNS[number]['key'];
const PINNABLE_CLIENT_COLUMNS = CLIENTS_GRID_COLUMNS.filter(
  (column) => column.pinnable,
);

const createEmptyFormData = (defaultUf = '') => ({
  codigoCliente: '',
  inativo: false,
  simplesNacional: false,
  consumidorFinal: false,
  cnpjCpf: '',
  inscEstadual: '',
  inscMunicipal: '',
  rg: '',
  nome: '',
  fantasia: '',
  endereco: '',
  numero: '',
  bairro: '',
  uf: defaultUf,
  cidade: '',
  cidadeId: 0,
  cep: '',
  complemento: '',
  cobrancaEndereco: '',
  cobrancaEnderecoNumero: '',
  cobrancaEnderecoBairro: '',
  cobrancaEnderecoCidadeId: 0,
  cobrancaEnderecoCep: '',
  cobrancaEnderecoUf: '',
  cobrancaEnderecoComplemento: '',
  telefone: '',
  fax: '',
  whatsapp: '',
  email: '',
  emailDanfe: '',
  site: '',
  rota: '',
  rotaId: 0,
  b2bLiberado: false,
  b2bSenha: '',
  b2bTabelaId: 0,
  contato1Nome: '',
  contato1Celular: '',
  contato1Aniversario: '',
  contato2Nome: '',
  contato2Celular: '',
  contato2Aniversario: '',
  segmentoId: 1,
  checkouts: 0,
  redeId: 0,
  tabelaIds: [] as number[],
  tabelaPrincipalId: 0,
  representantes: [] as Array<{ id: string; nome: string }>,
  descontoFinanceiroBoleto: 0,
  observacaoComercial: '',
  credito: 0,
  boleto: false,
  prazo: '',
  aberto: 0,
  disponivel: 0,
  observacaoFinanceiro: '',
  formaPagtoId: 1,
  prazoPagtoId: 1,
});

const createEmptyAjusteGeralForm = () => ({
  formaPagtoChecked: false,
  formaPagtoId: '',
  prazoPagtoChecked: false,
  prazoPagtoId: '',
  segmentoChecked: false,
  segmentoId: '',
  rotaChecked: false,
  rotaId: '',
  redeChecked: false,
  redeId: '',
  cepChecked: false,
  cep: '',
  creditoChecked: false,
  credito: '',
  consumidorFinalChecked: false,
  consumidorFinal: 'false',
  inativoChecked: false,
  inativo: 'false',
  b2bLiberadoChecked: false,
  b2bLiberado: 'false',
  b2bTabelaChecked: false,
  b2bTabelaId: '',
  tabelaPrecoChecked: false,
  tabelaPrecoId: '',
  tabelaPrecoAcao: 'vincular' as 'vincular' | 'desvincular',
});

type AjusteGeralFormData = ReturnType<typeof createEmptyAjusteGeralForm>;
const normalizeCityKey = (value: string | null | undefined) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
const normalizeTabelaIds = (value: any, fallback?: any) => {
  const ids: number[] = [];
  const pushId = (id: any) => {
    const num = Number(id);
    if (Number.isFinite(num) && num > 0) ids.push(num);
  };
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item) return;
      if (typeof item === 'object') {
        pushId(
          item.id ??
            item.tabela_preco_id ??
            item.tabela_id ??
            item.tabelaId ??
            item.codigo ??
            item.cod
        );
        return;
      }
      pushId(item);
    });
  } else if (value && typeof value === 'object') {
    pushId(
      value.id ??
        value.tabela_preco_id ??
        value.tabela_id ??
        value.tabelaId ??
        value.codigo ??
        value.cod
    );
  } else if (value != null) {
    pushId(value);
  }
  if (!ids.length && fallback != null) pushId(fallback);
  return Array.from(new Set(ids));
};
const normalizeRepresentantes = (value: any, fallbackId?: any, fallbackNome?: any) => {
  const reps: Array<{ id: string; nome: string }> = [];
  const pushRep = (id: any, nome?: any) => {
    const idStr = String(id ?? '').trim();
    if (!idStr) return;
    if (reps.some((rep) => rep.id === idStr)) return;
    reps.push({ id: idStr, nome: toUpperValue(nome ?? '') });
  };
  if (Array.isArray(value)) {
    value.forEach((rep) => {
      if (!rep) return;
      if (typeof rep === 'object') {
        pushRep(
          rep.codigoRepresentante ??
            rep.codigo_representante ??
            rep.codigo ??
            rep.cod ??
            rep.matricula ??
            rep.id,
          rep.nome ?? rep.representante_nome ?? rep.representanteNome
        );
        return;
      }
      pushRep(rep);
    });
  } else if (value && typeof value === 'object') {
    pushRep(
      value.codigoRepresentante ??
        value.codigo_representante ??
        value.codigo ??
        value.cod ??
        value.matricula ??
        value.id ??
        value.representante_id ??
        value.representanteId,
      value.nome ?? value.representante_nome ?? value.representanteNome
    );
  }
  if (!reps.length && fallbackId != null) {
    pushRep(fallbackId, fallbackNome);
  }
  return reps;
};

const FormField = ({ label, value, onChange, type = 'text', className = '', upperCase = true }: { 
  label: string; 
  value?: string | number; 
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  upperCase?: boolean;
}) => (
  <div className={className}>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    <Input 
      type={type}
      value={value ?? ''} 
      onChange={(e) => onChange(upperCase ? toUpperValue(e.target.value) : e.target.value)}
      className="h-8 text-sm" 
    />
  </div>
);

export const ClientesTab = () => {
  const { canInsert } = useModuleCrudPermission('CLIENTES');
  const CLIENT_LIMIT = 100;
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsHasMore, setClientsHasMore] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const clientsRequestId = useRef(0);
  const [filters, setFilters] = useState<ClientListFilters>(defaultClientFilters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      if (typeof window === 'undefined') return true;
      const saved = window.localStorage.getItem(CLIENTES_FILTERS_COLLAPSE_STORAGE_KEY);
      if (saved === 'true') return true;
      if (saved === 'false') return false;
      return true;
    } catch {
      return true;
    }
  });
  const [pinnedColumns, setPinnedColumns] = useState<ClientsGridColumnKey[]>(
    () => {
      try {
        if (typeof window === 'undefined') return [];
        const saved = window.localStorage.getItem(
          CLIENTES_PINNED_COLUMNS_STORAGE_KEY,
        );
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((value) =>
          PINNABLE_CLIENT_COLUMNS.some((column) => column.key === value),
        );
      } catch {
        return [];
      }
    },
  );
  const [fixActionsColumn, setFixActionsColumn] = useState(() => {
    try {
      if (typeof window === 'undefined') return true;
      const saved = window.localStorage.getItem(CLIENTES_FIX_ACTIONS_STORAGE_KEY);
      if (saved === null) return true;
      return saved === 'true';
    } catch {
      return true;
    }
  });
  const [selectedOperacao, setSelectedOperacao] = useState('');
  const [ajusteGeralOpen, setAjusteGeralOpen] = useState(false);
  const [ajusteGeralLoading, setAjusteGeralLoading] = useState(false);
  const [ajusteGeralAlvo, setAjusteGeralAlvo] = useState<'selecionados' | 'view' | 'todos'>('selecionados');
  const [ajusteGeralForm, setAjusteGeralForm] = useState<AjusteGeralFormData>(
    createEmptyAjusteGeralForm(),
  );

  // Import / Export state
  const xlsxImportRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, any>[]>([]);
  const [parsedImportRows, setParsedImportRows] = useState<ImportClientRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ criados: number; atualizados: number; erros: Array<{ linha: number; cnpj_cpf: string; mensagem: string }> } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // CRUD dialogs & state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [cnpjDuplicateLoading, setCnpjDuplicateLoading] = useState(false);
  const [existingClientByCnpj, setExistingClientByCnpj] =
    useState<ExistingClientDuplicate | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [clientInfoOpen, setClientInfoOpen] = useState(false);
  const [clientInfoId, setClientInfoId] = useState<number | null>(null);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotasLoading, setRotasLoading] = useState(false);
  const [segmentos, setSegmentos] = useState<SegmentoVenda[]>([]);
  const [segmentosLoading, setSegmentosLoading] = useState(false);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [redesLoading, setRedesLoading] = useState(false);
  const [prazos, setPrazos] = useState<PrazoPagto[]>([]);
  const [prazosLoading, setPrazosLoading] = useState(false);
  const [prazosError, setPrazosError] = useState<string | null>(null);

  // Representantes
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [repSearchOpen, setRepSearchOpen] = useState(false);
  const [repSearch, setRepSearch] = useState('');
  const [loadingReps, setLoadingReps] = useState(false);
  const [repsError, setRepsError] = useState<string | null>(null);
  const [repPage, setRepPage] = useState(1);
  const [repHasMore, setRepHasMore] = useState(true);

  // Tabelas de preço
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [tabelasLoading, setTabelasLoading] = useState(false);
  const [tabelaSearchOpen, setTabelaSearchOpen] = useState(false);
  const [tabelaSearch, setTabelaSearch] = useState('');

  // UFs e Cidades
  const [ufsApi, setUfsApi] = useState<Uf[]>([]);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [cidadesApi, setCidadesApi] = useState<Cidade[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);
  const [cidadesCobranca, setCidadesCobranca] = useState<Cidade[]>([]);
  const [cidadesCobrancaLoading, setCidadesCobrancaLoading] = useState(false);

  // UFs e Cidades para filtros
  const [filterUfs, setFilterUfs] = useState<Uf[]>([]);
  const [filterUfsLoading, setFilterUfsLoading] = useState(false);
  const [filterCidades, setFilterCidades] = useState<Cidade[]>([]);
  const [filterCidadesLoading, setFilterCidadesLoading] = useState(false);
  const [filterRotas, setFilterRotas] = useState<Rota[]>([]);
  const [filterRedes, setFilterRedes] = useState<Rede[]>([]);
  const [filterFormas, setFilterFormas] = useState<FormaPagamento[]>([]);
  const formasMap = useMemo(
    () =>
      new Map(
        filterFormas.map((item) => [
          Number(item.id),
          item.descricao || item.descricao_forma_pagto || String(item.id),
        ]),
      ),
    [filterFormas],
  );
  const prazosMap = useMemo(
    () =>
      new Map(
        prazos.map((item) => [
          Number(item.id),
          item.descricao || item.descricao_prazo_pagto || String(item.id),
        ]),
      ),
    [prazos],
  );
  const segmentosMap = useMemo(
    () =>
      new Map(
        segmentos.map((item) => [
          Number(item.id),
          item.descricao || item.descricao_segmento || String(item.id),
        ]),
      ),
    [segmentos],
  );
  const redesMap = useMemo(
    () =>
      new Map(
        [...redes, ...filterRedes].map((item) => [
          Number(item.id),
          item.descricao || item.descricao_rede || String(item.id),
        ]),
      ),
    [filterRedes, redes],
  );
  const rotasMap = useMemo(
    () =>
      new Map(
        [...rotas, ...filterRotas].map((item) => [
          Number(item.id),
          item.descricao_rota || item.codigo_rota || String(item.id),
        ]),
      ),
    [filterRotas, rotas],
  );

  const onTabelaDialogChange = (open: boolean) => {
    setTabelaSearchOpen(open);
    if (!open) setTabelaSearch('');
  };

  const [formData, setFormData] = useState<ClientFormData>(() =>
    createEmptyFormData(getLoggedCompanyUf()),
  );
  const cnpjCpfFieldError = useMemo(() => {
    const cleaned = normalizeCnpjCpf(formData.cnpjCpf);
    if (!cleaned) return null;
    // Evita erro visual durante digitação parcial.
    if (cleaned.length < 11) return null;
    if (cleaned.length > 11 && cleaned.length < 14) return null;
    return getCpfOrCnpjValidationMessage(cleaned);
  }, [formData.cnpjCpf]);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pendingClose, setPendingClose] = useState<'create' | 'edit' | null>(null);
  const formSnapshotRef = useRef<string>(
    JSON.stringify(createEmptyFormData(getLoggedCompanyUf())),
  );
  const setFormSnapshot = (data: ClientFormData) => {
    formSnapshotRef.current = JSON.stringify(data);
  };
  const isFormDirty = () => JSON.stringify(formData) !== formSnapshotRef.current;
  const closeDialog = (type: 'create' | 'edit') => {
    if (type === 'create') setCreateOpen(false);
    else setEditOpen(false);
  };
  const requestCloseDialog = (type: 'create' | 'edit') => {
    if (isFormDirty()) {
      setPendingClose(type);
      setShowConfirmClose(true);
      return;
    }
    closeDialog(type);
  };
  const handleDialogOpenChange = (type: 'create' | 'edit') => (nextOpen: boolean) => {
    if (!nextOpen) {
      requestCloseDialog(type);
      return;
    }
    if (type === 'create') setCreateOpen(true);
    else setEditOpen(true);
  };
  const handleConfirmClose = () => {
    if (pendingClose) closeDialog(pendingClose);
    setPendingClose(null);
    setShowConfirmClose(false);
  };
  const handleCancelClose = () => {
    setPendingClose(null);
    setShowConfirmClose(false);
  };

  const cnpjLookupRef = useRef<(v: string) => void>();
  if (!cnpjLookupRef.current) {
    cnpjLookupRef.current = debounce(async (value: string) => {
      const cleaned = normalizeCnpjCpf(value);
      if (!isNumericCnpj(cleaned)) {
        setCnpjLookupLoading(false);
        return;
      }
      setCnpjLookupLoading(true);
      try {
        const result = await clientsService.lookupCnpj(cleaned);
        if (!result || !result.data) return;
        const d = result.data;
        const estab = d.estabelecimento ?? {};
        const cidadeObj = estab.cidade ?? {};
        const estadoObj = estab.estado ?? {};
        const tipoLogradouro = estab.tipo_logradouro ? String(estab.tipo_logradouro).trim() : '';
        const logradouro = estab.logradouro ? String(estab.logradouro).trim() : '';
        const cepFromCnpj = estab.cep ?? d.cep;
        const cepValue = cepFromCnpj ? normalizeCep(String(cepFromCnpj)) : '';
        const hasCep = cepValue.length === 8;
        setFormData((prevState) => {
          const prev = prevState;
          const enderecoFmt = [tipoLogradouro, logradouro].filter(Boolean).join(' ') || d.logradouro || prev.endereco;
          const complemento = estab.complemento ? String(estab.complemento).trim() : prev.complemento;
          const telefone1 = estab.telefone1 ? String(estab.telefone1).trim() : '';
          const ddd1 = estab.ddd1 ? String(estab.ddd1).trim() : '';
          const telefoneFmt = [ddd1, telefone1].filter(Boolean).join('');
          const faxFmt = estab.fax ? String(estab.fax).trim() : prev.fax;
          const nextCep = cepValue || normalizeCep(String(prev.cep));
          return {
            ...prev,
            cnpjCpf: formatCnpjCpf(cleaned),
            nome: toUpperValue(d.razao_social || prev.nome),
            fantasia: toUpperValue(d.nome_fantasia || estab.nome_fantasia || prev.fantasia),
            endereco: toUpperValue(enderecoFmt || d.logradouro || prev.endereco),
            numero: toUpperValue(estab.numero || d.numero || prev.numero || ''),
            bairro: toUpperValue(estab.bairro || d.bairro || prev.bairro),
            cidade: toUpperValue(cidadeObj.nome || estab.municipio || d.municipio || prev.cidade),
            uf: toUpperValue(estadoObj.sigla || estab.uf || d.uf || prev.uf),
            cep: formatCep(nextCep),
            complemento: toUpperValue(complemento),
            telefone: formatPhone(telefoneFmt || prev.telefone),
            fax: formatPhone(faxFmt),
            email: estab.email || prev.email,
            cidadeId: cidadeObj.id ?? 0,
          };
        });
        if (hasCep) {
          cepLookupRef.current?.(cepValue);
        }
        toast.success('Dados preenchidos pela consulta de CNPJ');
      } catch (e: any) {
        toast.error(String(e));
      } finally {
        setCnpjLookupLoading(false);
      }
    }, 600);
  }

  const cepLookupRef = useRef<(v: string) => void>();
  if (!cepLookupRef.current) {
    cepLookupRef.current = debounce(async (value: string) => {
      const cleaned = normalizeCep(value);
      if (cleaned.length !== 8) {
        setCepLookupLoading(false);
        return;
      }
      setCepLookupLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        if (!res.ok) {
          toast.error('Falha ao consultar CEP');
          return;
        }
        const data = await res.json();
        if (!data || data.erro) {
          toast.error('CEP nao encontrado');
          return;
        }
        setFormData((prev) => ({
          ...prev,
          cep: formatCep(cleaned),
          endereco: toUpperValue(data.logradouro || prev.endereco),
          complemento: toUpperValue(data.complemento || prev.complemento),
          bairro: toUpperValue(data.bairro || prev.bairro),
          cidade: data.localidade ? toUpperTrimValue(data.localidade) : prev.cidade,
          uf: data.uf ? toUpperValue(data.uf) : prev.uf,
          cidadeId: data.localidade || data.uf ? 0 : prev.cidadeId,
        }));
        toast.success('Endereco preenchido pelo CEP');
      } catch (e: any) {
        toast.error('Erro na consulta de CEP');
      } finally {
        setCepLookupLoading(false);
      }
    }, 600);
  }

  console.log('ClientesTab rendering', { clients });

  useEffect(() => {
    loadClients(undefined, true);
    loadFilterUfs();
    // Load rotas and redes for filter dropdowns
    metadataService.getRotas().then(setFilterRotas).catch(() => {});
    metadataService.getRedes().then(setFilterRedes).catch(() => {});
    metadataService.getFormasPagamento().then(setFilterFormas).catch(() => {});
    loadSegmentos();
    loadPrazos();
    loadTabelas();
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(CLIENTES_FILTERS_COLLAPSE_STORAGE_KEY, String(filtersOpen));
    } catch {}
  }, [filtersOpen]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        CLIENTES_PINNED_COLUMNS_STORAGE_KEY,
        JSON.stringify(pinnedColumns),
      );
    } catch {}
  }, [pinnedColumns]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        CLIENTES_FIX_ACTIONS_STORAGE_KEY,
        String(fixActionsColumn),
      );
    } catch {}
  }, [fixActionsColumn]);

  // Carregar rotas, tabelas e UFs quando abrir os dialogs de criação/edição
  useEffect(() => {
    if (createOpen || editOpen) {
      loadRotas();
      loadTabelas();
      loadUfs();
      loadSegmentos();
      loadRedes();
      loadPrazos();
    }
  }, [createOpen, editOpen]);

  // Carregar cidades quando UF mudar
  useEffect(() => {
    if (formData.uf && (createOpen || editOpen)) {
      loadCidades(formData.uf);
    } else {
      setCidadesApi([]);
    }
  }, [formData.uf, createOpen, editOpen]);

  useEffect(() => {
    if (!formData.cidade || cidadesApi.length === 0) return;
    const target = normalizeCityKey(formData.cidade);
    if (!target) return;
    const currentId = Number(formData.cidadeId) || 0;
    const idMatch = currentId > 0 && cidadesApi.some((c) => Number(c.cidade_id) === currentId);
    if (idMatch) return;
    const match = cidadesApi.find((c) => normalizeCityKey(c.nome_cidade) === target);
    if (!match) return;
    const nextId = Number(match.cidade_id) || 0;
    setFormData((prev) => {
      if (Number(prev.cidadeId) === nextId) return prev;
      return {
        ...prev,
        cidadeId: nextId,
        cidade: toUpperTrimValue(match.nome_cidade),
      };
    });
  }, [cidadesApi, formData.cidade, formData.cidadeId]);

  useEffect(() => {
    if (formData.cobrancaEnderecoUf && (createOpen || editOpen)) {
      loadCidadesCobranca(formData.cobrancaEnderecoUf);
    } else {
      setCidadesCobranca([]);
    }
  }, [formData.cobrancaEnderecoUf, createOpen, editOpen]);

  // Carregar cidades quando UF do filtro mudar
  useEffect(() => {
    if (filters.uf && filters.uf !== 'all') {
      loadFilterCidades(filters.uf);
    } else {
      setFilterCidades([]);
    }
  }, [filters.uf]);

  useEffect(() => {
    if (!createOpen && !editOpen) {
      setTabelaSearchOpen(false);
      setTabelaSearch('');
      setRepSearchOpen(false);
      setRepSearch('');
    }
  }, [createOpen, editOpen]);

  useEffect(() => {
    if (!createOpen) {
      setExistingClientByCnpj(null);
      setCnpjDuplicateLoading(false);
      return;
    }

    const cleaned = normalizeCnpjCpf(formData.cnpjCpf);
    if (getCpfOrCnpjValidationMessage(cleaned)) {
      setExistingClientByCnpj(null);
      setCnpjDuplicateLoading(false);
      return;
    }
    if (cleaned.length !== 11 && cleaned.length !== 14) {
      setExistingClientByCnpj(null);
      setCnpjDuplicateLoading(false);
      return;
    }

    let cancelled = false;
    setCnpjDuplicateLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const existing = await clientsService.findByCnpjCpf(cleaned);
        if (cancelled) return;
        setExistingClientByCnpj(
          existing
            ? {
                id: existing.id,
                codigoCliente: existing.codigoCliente,
                nome: existing.nome,
                inativo: existing.inativo,
              }
            : null,
        );
      } catch {
        if (!cancelled) setExistingClientByCnpj(null);
      } finally {
        if (!cancelled) setCnpjDuplicateLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [createOpen, formData.cnpjCpf]);

  // Carregar representantes quando abrir dialog de busca
  const REP_LIMIT = 100;
  const loadReps = async (reset = false) => {
    if (loadingReps) return;
    setLoadingReps(true);
    setRepsError(null);
    try {
      const nextPage = reset ? 1 : repPage + 1;
      const data = await representativesService.find(repSearch || undefined, nextPage, REP_LIMIT);
      setRepresentatives((prev) => {
        const combined = reset ? data : [...prev, ...data];
        const unique = combined.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);
        return unique;
      });
      setRepPage(nextPage);
      setRepHasMore(Array.isArray(data) && data.length === REP_LIMIT);
    } catch (e: any) {
      setRepsError(String(e));
    } finally {
      setLoadingReps(false);
    }
  };

  useEffect(() => {
    if (!repSearchOpen) return;
    loadReps(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repSearchOpen]);

  useEffect(() => {
    if (!repSearchOpen) return;
    const t = setTimeout(() => {
      loadReps(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repSearch]);

  const loadRotas = async () => {
    setRotasLoading(true);
    try {
      const data = await metadataService.getRotas();
      setRotas(data);
    } catch (e) {
      console.error('Erro ao carregar rotas:', e);
    } finally {
      setRotasLoading(false);
    }
  };

  const loadSegmentos = async () => {
    setSegmentosLoading(true);
    try {
      const data = await metadataService.getSegmentosVendas();
      setSegmentos(data);
    } catch (e) {
      console.error('Erro ao carregar segmentos de vendas:', e);
    } finally {
      setSegmentosLoading(false);
    }
  };

  const loadRedes = async () => {
    setRedesLoading(true);
    try {
      const data = await metadataService.getRedes();
      setRedes(data);
    } catch (e) {
      console.error('Erro ao carregar redes:', e);
    } finally {
      setRedesLoading(false);
    }
  };

  const loadPrazos = async () => {
    setPrazosLoading(true);
    setPrazosError(null);
    try {
      const data = await metadataService.getPrazos();
      setPrazos(data);
    } catch (e) {
      console.error('Erro ao carregar prazos:', e);
      setPrazosError(String(e));
    } finally {
      setPrazosLoading(false);
    }
  };

  const loadTabelas = async () => {
    setTabelasLoading(true);
    try {
      const data = await metadataService.getTabelas();
      const sorted = [...data].sort((a, b) =>
        a.descricao.localeCompare(b.descricao, 'pt-BR', { sensitivity: 'base' }),
      );
      setTabelas(sorted);
    } catch (e) {
      console.error('Erro ao carregar tabelas:', e);
    } finally {
      setTabelasLoading(false);
    }
  };

  const loadUfs = async () => {
    setUfsLoading(true);
    try {
      const data = await metadataService.getUfs();
      setUfsApi(data);
    } catch (e) {
      console.error('Erro ao carregar UFs:', e);
    } finally {
      setUfsLoading(false);
    }
  };

  const loadCidades = async (uf: string) => {
    setCidadesLoading(true);
    try {
      const data = await metadataService.getCidadesPorUf(uf);
      setCidadesApi(data);
    } catch (e) {
      console.error('Erro ao carregar cidades:', e);
    } finally {
      setCidadesLoading(false);
    }
  };

  const loadCidadesCobranca = async (uf: string) => {
    setCidadesCobrancaLoading(true);
    try {
      const data = await metadataService.getCidadesPorUf(uf);
      setCidadesCobranca(data);
    } catch (e) {
      console.error('Erro ao carregar cidades:', e);
    } finally {
      setCidadesCobrancaLoading(false);
    }
  };

  const loadFilterUfs = async () => {
    setFilterUfsLoading(true);
    try {
      const data = await metadataService.getUfs();
      setFilterUfs(data);
    } catch (e) {
      console.error('Erro ao carregar UFs para filtro:', e);
    } finally {
      setFilterUfsLoading(false);
    }
  };

  const loadFilterCidades = async (uf: string) => {
    setFilterCidadesLoading(true);
    try {
      const data = await metadataService.getCidadesPorUf(uf);
      setFilterCidades(data);
    } catch (e) {
      console.error('Erro ao carregar cidades para filtro:', e);
    } finally {
      setFilterCidadesLoading(false);
    }
  };

  const buildClientSearchFilters = (active: typeof filters) => {
    const trimmedSearch = active.search.trim();
    const effectiveStatus = active.todos ? 'todos' : active.status;
    const cidadeId =
      active.filtrarCidades && active.cidade !== 'all'
        ? filterCidades.find((c) => c.nome_cidade === active.cidade)?.cidade_id
        : undefined;
    return {
      query: trimmedSearch || undefined,
      tipoBusca: active.searchMode,
      buscarEmTodos: true,
      clientesB2b: active.clientesB2b ? true : undefined,
      pessoa: active.tipoPessoa === 'fisica' ? 'F' : active.tipoPessoa === 'juridica' ? 'J' : 'todos',
      uf: active.filtrarCidades && active.uf !== 'all' ? active.uf : undefined,
      cidade: active.filtrarCidades && active.cidade !== 'all' ? active.cidade : undefined,
      cidadeId,
      bairro: active.bairro ? active.bairro.trim() : undefined,
      classeId: active.classe !== 'all' ? Number(active.classe) : undefined,
      formaPagtoId: active.formaPagto !== 'all' ? Number(active.formaPagto) : undefined,
      prazoPagtoId: active.prazoPagto !== 'all' ? Number(active.prazoPagto) : undefined,
      tabelaPrecoId: active.tabelaPreco !== 'all' ? String(active.tabelaPreco) : undefined,
      rotaId: active.rota !== 'all' ? Number(active.rota) : undefined,
      redeId: active.rede !== 'all' ? Number(active.rede) : undefined,
      naoPositivadoDesde: active.naoPositivadoDesde || undefined,
      cadastradosDe: active.cadastroDe || undefined,
      cadastradosAte: active.cadastroAte || undefined,
      status: effectiveStatus,
    } as const;
  };

  const loadClients = async (nextFilters?: typeof filters, reset = false) => {
    if (clientsLoading) return;
    const active = nextFilters ?? filters;

    const nextPage = reset ? 1 : clientsPage + 1;
    if (reset) {
      setClients([]);
      setClientsPage(1);
      setClientsHasMore(true);
    }
    setClientsLoading(true);
    const requestId = ++clientsRequestId.current;
    try {
      const data = await clientsService.search(
        buildClientSearchFilters(active), undefined, nextPage, CLIENT_LIMIT,
      );
      if (requestId !== clientsRequestId.current) return;
      setClients((prev) => (reset ? data : [...prev, ...data]));
      setClientsPage(nextPage);
      setClientsHasMore(Array.isArray(data) && data.length === CLIENT_LIMIT);
    } catch (e: any) {
      if (requestId !== clientsRequestId.current) return;
      toast.error(String(e?.message || e || 'Erro ao carregar clientes'));
    } finally {
      if (requestId !== clientsRequestId.current) return;
      setClientsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(clients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (id: number, checked: boolean) => {
    setSelectedClients((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((clientId) => clientId !== id);
    });
  };

  const togglePinnedColumn = (columnKey: ClientsGridColumnKey, checked: boolean) => {
    if (!PINNABLE_CLIENT_COLUMNS.some((column) => column.key === columnKey)) return;
    setPinnedColumns((prev) => {
      if (checked) {
        if (prev.includes(columnKey)) return prev;
        return [...prev, columnKey];
      }
      return prev.filter((key) => key !== columnKey);
    });
  };

  const columnWidthMap = useMemo(() => {
    const map = new Map<ClientsGridColumnKey, number>();
    CLIENTS_GRID_COLUMNS.forEach((column) => map.set(column.key, column.width));
    return map;
  }, []);

  const pinnedLeftColumnsInOrder = useMemo(
    () =>
      CLIENTS_GRID_COLUMNS.filter(
        (column) =>
          column.key !== 'acoes' && pinnedColumns.includes(column.key),
      ).map((column) => column.key),
    [pinnedColumns],
  );

  const pinnedLeftOffsets = useMemo(() => {
    const offsets = new Map<ClientsGridColumnKey, number>();
    let left = 0;
    for (const key of pinnedLeftColumnsInOrder) {
      offsets.set(key, left);
      left += columnWidthMap.get(key) ?? 0;
    }
    return offsets;
  }, [columnWidthMap, pinnedLeftColumnsInOrder]);

  const getStickyHeadClass = (key: ClientsGridColumnKey) => {
    if (key === 'acoes') {
      return fixActionsColumn
        ? 'sticky right-0 z-30 bg-background shadow-[-1px_0_0_hsl(var(--border))]'
        : '';
    }
    return pinnedLeftOffsets.has(key)
      ? 'sticky z-30 bg-background shadow-[1px_0_0_hsl(var(--border))]'
      : '';
  };

  const getStickyCellClass = (key: ClientsGridColumnKey) => {
    if (key === 'acoes') {
      return fixActionsColumn
        ? 'sticky right-0 z-20 bg-background shadow-[-1px_0_0_hsl(var(--border))]'
        : '';
    }
    return pinnedLeftOffsets.has(key)
      ? 'sticky z-20 bg-background shadow-[1px_0_0_hsl(var(--border))] group-hover:bg-muted/50'
      : '';
  };

  const getStickyStyle = (key: ClientsGridColumnKey) => {
    const width = columnWidthMap.get(key) ?? 0;
    if (key === 'acoes') {
      if (!fixActionsColumn) return {};
      return { width, minWidth: width, maxWidth: width, right: 0 };
    }
    if (!pinnedLeftOffsets.has(key)) return {};
    return {
      width,
      minWidth: width,
      maxWidth: width,
      left: pinnedLeftOffsets.get(key) ?? 0,
    };
  };

  const handleCadastrarPara = () => {
    if (selectedClients.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }
    setDialogOpen(true);
  };

  const handleConfirmCadastro = () => {
    if (!selectedOperacao) {
      toast.error('Selecione uma operação');
      return;
    }
    toast.success(`Criando pedidos para ${selectedClients.length} cliente(s) com operação: ${selectedOperacao}`);
    setDialogOpen(false);
    setSelectedClients([]);
  };

  const openAjusteGeralDialog = () => {
    setAjusteGeralAlvo(selectedClients.length > 0 ? 'selecionados' : 'view');
    setAjusteGeralForm(createEmptyAjusteGeralForm());
    setAjusteGeralOpen(true);
  };

  const handleProcessAjusteGeral = async () => {
    if (ajusteGeralAlvo === 'selecionados' && selectedClients.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }

    const data: Record<string, any> = {};
    const errors: string[] = [];
    const parseId = (value: string, label: string) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        errors.push(`Selecione ${label}.`);
        return undefined;
      }
      return parsed;
    };

    if (ajusteGeralForm.formaPagtoChecked) {
      const id = parseId(ajusteGeralForm.formaPagtoId, 'uma forma de pagamento');
      if (id) data.formaPagtoId = id;
    }
    if (ajusteGeralForm.prazoPagtoChecked) {
      const id = parseId(ajusteGeralForm.prazoPagtoId, 'um prazo de pagamento');
      if (id) data.prazoPagtoId = id;
    }
    if (ajusteGeralForm.segmentoChecked) {
      const id = parseId(ajusteGeralForm.segmentoId, 'uma classe');
      if (id) data.segmentoId = id;
    }
    if (ajusteGeralForm.rotaChecked) {
      const id = parseId(ajusteGeralForm.rotaId, 'uma rota de entrega');
      if (id) data.rotaId = id;
    }
    if (ajusteGeralForm.redeChecked) {
      const id = parseId(ajusteGeralForm.redeId, 'uma rede');
      if (id) data.redeId = id;
    }
    if (ajusteGeralForm.cepChecked) {
      const cep = normalizeCep(ajusteGeralForm.cep);
      if (cep.length !== 8) errors.push('Informe um CEP válido com 8 dígitos.');
      else data.cep = cep;
    }
    if (ajusteGeralForm.creditoChecked) {
      const credito = parseDecimalInput(ajusteGeralForm.credito);
      if (!Number.isFinite(credito)) errors.push('Informe um crédito válido.');
      else data.credito = credito;
    }
    if (ajusteGeralForm.consumidorFinalChecked) {
      data.consumidorFinal = ajusteGeralForm.consumidorFinal === 'true';
    }
    if (ajusteGeralForm.inativoChecked) {
      data.inativo = ajusteGeralForm.inativo === 'true';
    }
    if (ajusteGeralForm.b2bLiberadoChecked) {
      data.b2bLiberado = ajusteGeralForm.b2bLiberado === 'true';
    }
    if (ajusteGeralForm.b2bTabelaChecked) {
      const id = parseId(ajusteGeralForm.b2bTabelaId, 'uma tabela B2B');
      if (id) data.b2bTabelaId = id;
    }
    if (ajusteGeralForm.tabelaPrecoChecked) {
      const id = parseId(ajusteGeralForm.tabelaPrecoId, 'uma tabela de preços');
      if (id) {
        data.tabelaPrecoId = id;
        data.tabelaPrecoAcao = ajusteGeralForm.tabelaPrecoAcao;
      }
    }

    const hasCheckedField =
      ajusteGeralForm.formaPagtoChecked ||
      ajusteGeralForm.prazoPagtoChecked ||
      ajusteGeralForm.segmentoChecked ||
      ajusteGeralForm.rotaChecked ||
      ajusteGeralForm.redeChecked ||
      ajusteGeralForm.cepChecked ||
      ajusteGeralForm.creditoChecked ||
      ajusteGeralForm.consumidorFinalChecked ||
      ajusteGeralForm.inativoChecked ||
      ajusteGeralForm.b2bLiberadoChecked ||
      ajusteGeralForm.b2bTabelaChecked ||
      ajusteGeralForm.tabelaPrecoChecked;

    if (!hasCheckedField) errors.push('Selecione ao menos um campo para atualizar.');
    if (!Object.keys(data).length && hasCheckedField)
      errors.push('Preencha os campos selecionados antes de processar.');

    if (errors.length) {
      toast.error(errors[0]);
      return;
    }

    setAjusteGeralLoading(true);
    try {
      let clienteIds: number[];
      if (ajusteGeralAlvo === 'selecionados') {
        clienteIds = selectedClients;
      } else if (ajusteGeralAlvo === 'view') {
        clienteIds = clients.map((c) => c.id);
      } else {
        // Busca todas as páginas com os filtros ativos
        const searchFilters = buildClientSearchFilters(filters);
        const all: Client[] = [];
        let page = 1;
        while (true) {
          const batch = await clientsService.search(searchFilters, undefined, page, CLIENT_LIMIT);
          all.push(...batch);
          if (batch.length < CLIENT_LIMIT) break;
          page++;
        }
        clienteIds = all.map((c) => c.id);
      }

      if (clienteIds.length === 0) {
        toast.error('Nenhum cliente encontrado para aplicar o ajuste.');
        return;
      }

      const result = await clientsService.bulkAdjust({ clienteIds, data });
      const totalAtualizados = Number(result?.totalAtualizados ?? clienteIds.length);
      toast.success(`Ajuste aplicado em ${totalAtualizados} cliente(s).`);
      setAjusteGeralOpen(false);
      setSelectedClients([]);
      await loadClients(undefined, true);
    } catch (e: any) {
      toast.error(String(e?.message || e || 'Erro ao aplicar ajuste geral'));
    } finally {
      setAjusteGeralLoading(false);
    }
  };

  const isClientsInitialLoading = clientsLoading && clients.length === 0;
  const isClientsLoadingMore = clientsLoading && clients.length > 0;

  const handleClientsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!clientsHasMore || clientsLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadClients(undefined, false);
    }
  };

  const tabelaSearchValue = tabelaSearch.trim().toUpperCase();
  const filteredTabelas = tabelas.filter((t) => {
    if (!tabelaSearchValue) return true;
    return getTabelaLabel(t).toUpperCase().includes(tabelaSearchValue);
  });
  const selectedTabelaLabels = tabelas
    .filter((t) => formData.tabelaIds.includes(Number(t.id)))
    .map((t) => getTabelaLabel(t));
  const tabelaSummary = summarizeSelection(
    selectedTabelaLabels.length ? selectedTabelaLabels : formData.tabelaIds.map(String),
    'Selecione uma ou mais tabelas'
  );
  const representanteSummary = summarizeSelection(
    formData.representantes.map((rep) => rep.nome || rep.id),
    'Selecione...'
  );
  const toggleTabelaId = (id: number, checked: boolean) => {
    setFormData((prev) => {
      const exists = prev.tabelaIds.includes(id);
      const nextIds = checked && !exists
        ? [...prev.tabelaIds, id]
        : (!checked && exists ? prev.tabelaIds.filter((item) => item !== id) : prev.tabelaIds);
      const nextPrincipal = nextIds.includes(prev.tabelaPrincipalId)
        ? prev.tabelaPrincipalId
        : (nextIds[0] ?? 0);
      return { ...prev, tabelaIds: nextIds, tabelaPrincipalId: nextPrincipal };
    });
  };

const normalizeCep = (v: string) => v.replace(/\D+/g, '').slice(0, 8);

const normalizeDateInput = (value: unknown) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (raw.includes('T')) return raw.split('T')[0];
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
};
const ensurePositiveId = (value: number | string | undefined | null, fallback = 1) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};
type ClientFormData = ReturnType<typeof createEmptyFormData>;
type ExistingClientDuplicate = Pick<Client, 'id' | 'codigoCliente' | 'nome' | 'inativo'>;

interface ImportClientRow {
  rowIndex: number;
  data: Record<string, any>;
  action: 'importar' | 'erro';
  cnpj: string;
  nome: string;
  obs: string;
}

function parseClientImportRows(data: Record<string, any>[]): ImportClientRow[] {
  return data.map((row, i) => {
    const cnpj = String(row['Cnpj_Cpf'] ?? row['cnpj_cpf'] ?? '').replace(/\D/g, '');
    const nome = String(row['Nome_RazaoSocial'] ?? row['nome'] ?? '').trim();
    if (!cnpj) return { rowIndex: i + 2, data: row, action: 'erro', cnpj: '', nome, obs: 'CNPJ/CPF obrigatório' };
    if (!nome) return { rowIndex: i + 2, data: row, action: 'erro', cnpj, nome: '', obs: 'Nome/Razão Social obrigatório' };
    return { rowIndex: i + 2, data: row, action: 'importar', cnpj, nome, obs: '' };
  });
}

const normalizeErrorMessages = (error: unknown): string[] => {
  if (!error) return ['Erro desconhecido'];
  if (Array.isArray(error)) return error.map((item) => String(item)).filter(Boolean);
  const message = typeof error === 'string' ? error : (error as any)?.message ?? String(error);
  const parts = String(message)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length ? parts : [String(message)];
};

const buildExistingClientDuplicateMessage = (
  client: ExistingClientDuplicate,
) => {
  const codigo = client.codigoCliente ? `${client.codigoCliente} - ` : '';
  const status = client.inativo ? ' (inativo)' : '';
  return `Já existe um cliente com este CNPJ/CPF: ${codigo}${client.nome}${status}.`;
};

const validateFormData = (data: ClientFormData): string[] => {
  const errors: string[] = [];
  const hasText = (value: string | number | null | undefined) => String(value ?? '').trim().length > 0;
  const isValidId = (value: number | string | null | undefined) =>
    Number.isFinite(Number(value)) && Number(value) > 0;

  if (!hasText(data.cnpjCpf)) errors.push('Informe o CNPJ/CPF.');
  if (hasText(data.cnpjCpf)) {
    const cnpjCpfError = getCpfOrCnpjValidationMessage(data.cnpjCpf);
    if (cnpjCpfError) errors.push(cnpjCpfError);
  }
  if (!hasText(data.nome)) errors.push('Informe a Razão Social/Nome.');
  if (!hasText(data.cep)) errors.push('Informe o CEP.');
  if (!hasText(data.telefone)) errors.push('Informe o telefone fixo.');

  const ufValue = String(data.uf ?? '').trim();
  if (!ufValue || ufValue.length < 2) errors.push('Informe a UF.');
  if (!isValidId(data.cidadeId)) errors.push('Selecione a cidade.');

  if (!hasText(data.endereco)) errors.push('Informe o endereço.');
  if (!hasText(data.bairro)) errors.push('Informe o bairro.');
  if (!isValidId(data.segmentoId)) errors.push('Selecione o segmento.');
  if (!isValidId(data.rotaId)) errors.push('Selecione a rota de entrega.');
  if (!isValidId(data.formaPagtoId)) errors.push('Selecione a forma de pagamento.');
  if (!hasText(data.prazo)) errors.push('Selecione o prazo máximo liberado.');
  if (!isValidId(data.prazoPagtoId)) errors.push('Selecione o prazo de pagamento.');
  if (!Array.isArray(data.tabelaIds) || data.tabelaIds.length === 0) errors.push('Selecione ao menos uma tabela de preços.');
  if (!Array.isArray(data.representantes) || data.representantes.length === 0) errors.push('Selecione o representante.');

  const emailValue = String(data.email ?? '').trim();
  if (emailValue && !isValidEmail(emailValue)) errors.push('Email inválido.');
  const emailDanfeValue = String(data.emailDanfe ?? '').trim();
  if (emailDanfeValue && !isValidEmail(emailDanfeValue)) errors.push('Email DANFE inválido.');

  return errors;
};
  const openCreateDialog = () => {
    if (!canInsert) return;
    setFormErrors([]);
    setExistingClientByCnpj(null);
    setCnpjDuplicateLoading(false);
    const empty = createEmptyFormData(getLoggedCompanyUf());
    setFormData(empty);
    setFormSnapshot(empty);
    setCidadesCobranca([]);
    setTabelaSearchOpen(false);
    setTabelaSearch('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setFormErrors([]);
    if (existingClientByCnpj) {
      setFormErrors([buildExistingClientDuplicateMessage(existingClientByCnpj)]);
      return;
    }
    const errors = validateFormData(formData);
    if (errors.length) {
      setFormErrors(errors);
      return;
    }
    const emailValue = formData.email.trim();
    const emailDanfeValue = formData.emailDanfe.trim();
    const tabelaId = formData.tabelaPrincipalId || formData.tabelaIds[0];
    const representanteIds = formData.representantes.map((rep) => rep.id).filter(Boolean);
    const representanteId = representanteIds[0];
    const redeId = ensurePositiveId(formData.redeId, 0);
    try {
      setFormLoading(true);
      const { representantes, tabelaIds, tabelaPrincipalId: _tp1, ...payloadBase } = formData;
      const payloadNormalized = {
        ...payloadBase,
        cnpjCpf: normalizeCnpjCpf(payloadBase.cnpjCpf),
        site: payloadBase.site?.trim() || undefined,
        telefone: normalizePhoneDigits(payloadBase.telefone),
        fax: normalizePhoneDigits(payloadBase.fax),
        whatsapp: normalizePhoneDigits(payloadBase.whatsapp),
        contato1Celular: normalizePhoneDigits(payloadBase.contato1Celular),
        contato2Celular: normalizePhoneDigits(payloadBase.contato2Celular),
        cobrancaEnderecoCep: normalizeCep(payloadBase.cobrancaEnderecoCep || ''),
        cobrancaEnderecoUf: toUpperTrimValue(payloadBase.cobrancaEnderecoUf || ''),
        cobrancaEnderecoCidadeId: Number(payloadBase.cobrancaEnderecoCidadeId) || 0,
      };
      delete (payloadNormalized as any).aberto;
      delete (payloadNormalized as any).disponivel;
      await clientsService.create({
        ...payloadNormalized,
        simplesNacional: Boolean(formData.simplesNacional),
        consumidorFinal: Boolean(formData.consumidorFinal),
        tabelaIds,
        tabelaId: tabelaId || undefined,
        representanteIds,
        representanteId: representanteId || undefined,
        redeId: redeId || undefined,
        email: emailValue || undefined,
        emailDanfe: emailDanfeValue || undefined,
        b2bLiberado: Boolean(formData.b2bLiberado),
        b2bSenha: formData.b2bSenha.trim() || undefined,
        b2bTabelaId: formData.b2bTabelaId ? Number(formData.b2bTabelaId) : undefined,
        cidadeId: Number(formData.cidadeId) || 0,
        segmentoId: ensurePositiveId(formData.segmentoId),
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: ensurePositiveId(formData.formaPagtoId),
        prazoPagtoId: ensurePositiveId(formData.prazoPagtoId),
      });
      toast.success('Cliente criado com sucesso');
      setCreateOpen(false);
      loadClients(undefined, true);
    } catch (e: any) {
      setFormErrors(normalizeErrorMessages(e));
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = async (clientId?: number) => {
    const id =
      clientId && Number.isFinite(clientId) && clientId > 0
        ? clientId
        : selectedClients.length === 1
        ? selectedClients[0]
        : null;
    if (!id) {
      toast.error('Selecione exatamente um cliente para editar');
      return;
    }
    setEditId(id);
    setFormSnapshot(formData);
    setFormErrors([]);
    setDetailLoading(true);
    setCidadesCobranca([]);
    setTabelaSearchOpen(false);
    setTabelaSearch('');
    setEditOpen(true);
    try {
      const detail = await clientsService.getDetail(id);
      // Try to map common fields; fallback to empty strings
      const d = detail || {};
      const tabelasArr = d.tabelas ?? d.tabelas_preco ?? d.tabelasPreco ?? d.tabelas_precos ?? d.tabelasPrecos;
      const tabelaIds = normalizeTabelaIds(tabelasArr, d.tabela_id ?? d.tabelaId);
      const principalEntry = Array.isArray(tabelasArr) && tabelasArr.find((t: any) => t.principal === true);
      const tabelaPrincipalId = principalEntry
        ? Number(principalEntry.tabela_preco_id ?? principalEntry.id ?? 0)
        : (tabelaIds[0] ?? 0);
      const representantes = normalizeRepresentantes(
        d.representantes ?? d.representante,
        d.representante_codigo ?? d.representanteCod ?? d.representante_cod ?? d.representante_id ?? d.representanteId ?? d.representante?.id,
        d.representante_nome ?? d.representanteNome ?? d.representante?.nome
      );
      const nextFormData: ClientFormData = {
        codigoCliente: toUpperValue(d.codigo_cliente ?? d.codigoCliente ?? d.codigo ?? ''),
        inativo: Boolean(d.inativo),
        simplesNacional: Boolean(d.simples_nacional ?? d.simplesNacional ?? false),
        consumidorFinal: Boolean(d.consumidor_final ?? d.consumidorFinal ?? false),
        cnpjCpf: formatCnpjCpf(d.cnpj_cpf ?? d.cnpjCpf ?? d.cnpj ?? d.cpf ?? ''),
        inscEstadual: toUpperValue(d.inscricao_estadual ?? d.inscEstadual ?? d.insc_estadual ?? ''),
          inscMunicipal: toUpperValue(d.inscricao_municipal ?? d.inscMunicipal ?? d.insc_municipal ?? ''),
          rg: formatRg(d.rg ?? ''),
          nome: toUpperValue(d.nome ?? d.razao_social ?? ''),
          fantasia: toUpperValue(d.fantasia ?? ''),
          endereco: toUpperValue(d.endereco ?? d.logradouro ?? ''),
          numero: toUpperValue((d as any)?.numero ?? (d as any)?.num ?? ''),
          bairro: toUpperTrimValue(d.bairro ?? ''),
          uf: toUpperValue(d.uf ?? d.estado ?? ''),
          cidade: toUpperTrimValue(d.cidade ?? ''),
          cidadeId: Number(d.cidade_id ?? d.cidadeId ?? 0),
          cep: formatCep(d.cep ?? ''),
          complemento: toUpperTrimValue(d.complemento ?? ''),
          cobrancaEndereco: toUpperValue(
            d.cobranca_endereco ?? d.cobrancaEndereco ?? '',
          ),
          cobrancaEnderecoNumero: toUpperValue(
            d.cobranca_endereco_numero ?? d.cobrancaEnderecoNumero ?? '',
          ),
          cobrancaEnderecoBairro: toUpperTrimValue(
            d.cobranca_endereco_bairro ?? d.cobrancaEnderecoBairro ?? '',
          ),
          cobrancaEnderecoCidadeId: Number(
            d.cobranca_endereco_cidade_id ?? d.cobrancaEnderecoCidadeId ?? 0,
          ),
          cobrancaEnderecoCep: formatCep(
            d.cobranca_endereco_cep ?? d.cobrancaEnderecoCep ?? '',
          ),
          cobrancaEnderecoUf: toUpperValue(
            d.cobranca_endereco_uf ?? d.cobrancaEnderecoUf ?? '',
          ),
          cobrancaEnderecoComplemento: toUpperTrimValue(
            d.cobranca_endereco_complemento ??
              d.cobrancaEnderecoComplemento ??
              '',
          ),
          telefone: formatPhone(d.fone ?? d.telefone ?? ''),
          fax: formatPhone(d.fax ?? ''),
          whatsapp: formatPhone(d.whatsapp ?? ''),
          email: String(d.email ?? '').trim(),
          emailDanfe: String(d.email_danfe ?? d.emailDanfe ?? '').trim(),
          site: String(d.site ?? ''),
          rota: toUpperValue(d.rota ?? ''),
          rotaId: Number(d.rota_id ?? d.rotaId ?? 0),
          b2bLiberado: Boolean(d.b2b_liberado ?? d.b2bLiberado ?? false),
          b2bSenha: String(d.b2b_senha ?? d.b2bSenha ?? '').trim(),
          b2bTabelaId: Number(d.b2b_tabela_id ?? d.b2bTabelaId ?? 0),
          contato1Nome: toUpperTrimValue(d.contato ?? d.comprador_nome ?? d.contato1Nome ?? d.contatos?.[0]?.nome ?? ''),
          contato1Celular: formatPhone(d.contato1Celular ?? d.comprador_fone ?? d.celular ?? d.contatos?.[0]?.celular ?? ''),
          contato1Aniversario: normalizeDateInput(
            d.contato1Aniversario ??
            d.contato1_aniversario ??
            d.contato1_data_aniversario ??
            d.comprador_data_nascimento ??
            d.compradorDataNascimento ??
            d.contatos?.[0]?.aniversario ??
            ''
          ),
          contato2Nome: toUpperValue(d.contato2_nome ?? d.contato2Nome ?? d.contatos?.[1]?.nome ?? ''),
          contato2Celular: formatPhone(d.contato2_celular ?? d.contato2Celular ?? d.contatos?.[1]?.celular ?? ''),
          contato2Aniversario: normalizeDateInput(
            d.contato2Aniversario ??
            d.contato2_aniversario ??
            d.contato2_data_aniversario ??
            d.contatos?.[1]?.aniversario ??
            ''
          ),
          segmentoId: ensurePositiveId(d.segmento_id ?? d.segmentoId),
          checkouts: Number(d.checkouts ?? 0),
        redeId: ensurePositiveId(d.rede_id ?? d.redeId ?? d.rede, 0),
        tabelaIds,
        tabelaPrincipalId,
        representantes,
        descontoFinanceiroBoleto: Number(d.desconto_financeiro_boleto ?? d.descontoFinanceiroBoleto ?? 0),
        observacaoComercial: toUpperValue(d.observacao_comercial ?? d.observacaoComercial ?? ''),
          credito: Number(d.credito ?? 0) || 0,
          boleto: Boolean(d.boleto),
          prazo: String(d.prazo ?? '').trim(),
          aberto: Number(d.aberto ?? 0),
          disponivel: (Number(d.credito ?? 0) || 0) - Number(d.aberto ?? 0),
          observacaoFinanceiro: toUpperValue(d.observacao_financeiro ?? d.observacaoFinanceiro ?? ''),
        formaPagtoId: ensurePositiveId(d.forma_pagto_id ?? d.formaPagtoId),
        prazoPagtoId: ensurePositiveId(d.prazo_pagto_id ?? d.prazoPagtoId),
      };
      setFormData(nextFormData);
      setFormSnapshot(nextFormData);
    } catch (e: any) {
      setFormErrors(normalizeErrorMessages(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!editId) return;
    setFormErrors([]);
    const errors = validateFormData(formData);
    if (errors.length) {
      setFormErrors(errors);
      return;
    }
    const emailValue = formData.email.trim();
    const emailDanfeValue = formData.emailDanfe.trim();
    const tabelaId = formData.tabelaPrincipalId || formData.tabelaIds[0];
    const representanteIds = formData.representantes.map((rep) => rep.id).filter(Boolean);
    const representanteId = representanteIds[0];
    const redeId = ensurePositiveId(formData.redeId, 0);
    try {
      setFormLoading(true);
      const { representantes, tabelaIds, tabelaPrincipalId: _tp2, ...payloadBase } = formData;
      const payloadNormalized = {
        ...payloadBase,
        cnpjCpf: normalizeCnpjCpf(payloadBase.cnpjCpf),
        site: payloadBase.site?.trim() || undefined,
        telefone: normalizePhoneDigits(payloadBase.telefone),
        fax: normalizePhoneDigits(payloadBase.fax),
        whatsapp: normalizePhoneDigits(payloadBase.whatsapp),
        contato1Celular: normalizePhoneDigits(payloadBase.contato1Celular),
        contato2Celular: normalizePhoneDigits(payloadBase.contato2Celular),
        cobrancaEnderecoCep: normalizeCep(payloadBase.cobrancaEnderecoCep || ''),
        cobrancaEnderecoUf: toUpperTrimValue(payloadBase.cobrancaEnderecoUf || ''),
        cobrancaEnderecoCidadeId: Number(payloadBase.cobrancaEnderecoCidadeId) || 0,
      };
      delete (payloadNormalized as any).aberto;
      delete (payloadNormalized as any).disponivel;
      await clientsService.update(editId, {
        ...payloadNormalized,
        simplesNacional: Boolean(formData.simplesNacional),
        consumidorFinal: Boolean(formData.consumidorFinal),
        tabelaIds,
        tabelaId: tabelaId || undefined,
        representanteIds,
        representanteId: representanteId || undefined,
        redeId: redeId || undefined,
        email: emailValue || undefined,
        emailDanfe: emailDanfeValue || undefined,
        b2bLiberado: Boolean(formData.b2bLiberado),
        b2bSenha: formData.b2bSenha.trim() || undefined,
        b2bTabelaId: formData.b2bTabelaId ? Number(formData.b2bTabelaId) : undefined,
        cidadeId: Number(formData.cidadeId) || 0,
        segmentoId: ensurePositiveId(formData.segmentoId),
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: ensurePositiveId(formData.formaPagtoId),
        prazoPagtoId: ensurePositiveId(formData.prazoPagtoId),
      });
      toast.success('Cliente atualizado com sucesso');
      setEditOpen(false);
      loadClients(undefined, true);
    } catch (e: any) {
      setFormErrors(normalizeErrorMessages(e));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (clientId?: number) => {
    const targetIds =
      clientId && Number.isFinite(clientId) && clientId > 0
        ? [clientId]
        : selectedClients;
    if (targetIds.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }
    try {
      for (const id of targetIds) {
        await clientsService.remove(id);
      }
      if (targetIds.length === 1) toast.success('Cliente excluído com sucesso');
      else toast.success(`${targetIds.length} cliente(s) excluído(s)`);
      if (!clientId) setSelectedClients([]);
      loadClients(undefined, true);
    } catch (e: any) {
      toast.error(String(e));
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const EXPORT_HEADERS = [
        'Cnpj_Cpf', 'Inscr_estadual', 'Nome_RazaoSocial', 'Fantasia',
        'Fone_fixo', 'Celular', 'Whatsapp', 'Endereco', 'Numero', 'Bairro',
        'Complemento', 'cidade', 'uf', 'cep', 'CodigoIbge', 'email', 'email_danfe',
        'CodigoSegmento', 'CodigoRepresentante', 'CodigoRota', 'consumidor_final', 'observacao',
      ];
      const txt = (v: string | null | undefined) => ({ t: 's' as const, v: v ?? '' });
      const rows = clients.map((c) => [
        txt(c.cnpjCpf),
        txt(c.inscricaoEstadual),
        c.nome ?? '',
        c.fantasia ?? '',
        txt(c.fone),
        txt(c.celular),
        txt(c.whatsapp),
        c.endereco ?? '',
        c.numero ?? '',
        c.bairro ?? '',
        c.complemento ?? '',
        c.cidade ?? '',
        c.uf ?? '',
        txt(c.cep),
        '',
        c.email ?? '',
        c.emailDanfe ?? '',
        '',
        c.representanteCodigo ?? (c.representantes?.[0] as any)?.codigoRepresentante ?? '',
        c.rota?.codigo_rota ?? '',
        c.consumidorFinal ? 'SIM' : 'NÃO',
        c.observacaoComercial ?? '',
      ]);

      const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      XLSX.writeFile(wb, 'clientes.xlsx');
    } catch {
      toast.error('Erro ao exportar clientes');
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        if (!data.length) { toast.error('Planilha vazia'); return; }
        const parsed = parseClientImportRows(data);
        setImportRows(data);
        setParsedImportRows(parsed);
        setImportResult(null);
        setImportOpen(true);
      } catch {
        toast.error('Erro ao ler a planilha');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    const validRows = parsedImportRows.filter((r) => r.action === 'importar').map((r) => r.data);
    if (!validRows.length) return;
    setImportLoading(true);
    try {
      const result = await clientsService.importar(validRows);
      setImportResult(result);
      if (!result.erros.length) {
        toast.success(`Importação concluída: ${result.criados} criado(s), ${result.atualizados} atualizado(s)`);
        setImportOpen(false);
        loadClients(undefined, true);
      }
    } catch (e: any) {
      toast.error(String(e));
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                value={filters.status}
                onValueChange={(v: 'ativos' | 'inativos' | 'todos') => {
                  const nextFilters = { ...filters, status: v, todos: v === 'todos' };
                  setFilters(nextFilters);
                  loadClients(nextFilters, true);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-6">
              <label className="text-sm font-medium mb-1 block">Pesquisa</label>
              <Input
                placeholder="Digite para pesquisar..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && loadClients(undefined, true)}
              />
            </div>
            <div className="md:col-span-2">
              <Button variant="default" onClick={() => loadClients(undefined, true)} className="w-full min-h-11 rounded-lg md:min-h-10 md:rounded-md">
                <Search className="h-4 w-4 mr-2" /> Buscar
              </Button>
            </div>
            <div className="md:col-span-2">
              <Button
                variant="outline"
                className="w-full min-h-11 rounded-lg md:min-h-10 md:rounded-md"
                onClick={() => {
                  const next = { ...defaultClientFilters };
                  setFilters(next);
                  setFilterCidades([]);
                  loadClients(next, true);
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardContent>
        <div className="px-6 pb-3">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full min-h-11 justify-between rounded-lg border bg-muted/40 px-4 text-sm font-semibold text-foreground hover:bg-muted/40 hover:text-foreground md:min-h-10 md:rounded-md"
            >
              <span>Mais filtros</span>
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1 block">Tipo de busca</label>
              <RadioGroup
                value={filters.searchMode}
                onValueChange={(v: 'inicial' | 'contido') => setFilters({ ...filters, searchMode: v })}
                className="flex flex-row gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="inicial" id="searchModeInicial" />
                  <label htmlFor="searchModeInicial" className="text-sm">Inicial</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="contido" id="searchModeContido" />
                  <label htmlFor="searchModeContido" className="text-sm">Contido</label>
                </div>
              </RadioGroup>
            </div>
            <div className="md:col-span-2 flex items-center gap-2 pt-5">
              <Checkbox
                id="todosFilters"
                checked={filters.todos}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setFilters((prev) => ({
                    ...prev,
                    todos: isChecked,
                    status: isChecked ? 'todos' : (prev.status === 'todos' ? 'ativos' : prev.status),
                  }));
                }}
              />
              <label htmlFor="todosFilters" className="text-sm">Todos</label>
            </div>
            <div className="md:col-span-2 flex items-center gap-2 pt-5">
              <Checkbox
                id="clientesB2b"
                checked={filters.clientesB2b}
                onCheckedChange={(checked) => setFilters({ ...filters, clientesB2b: checked === true })}
              />
              <label htmlFor="clientesB2b" className="text-sm">Clientes B2B</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Bairro</label>
              <Input
                value={filters.bairro}
                onChange={(e) => setFilters({ ...filters, bairro: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && loadClients(undefined, true)}
              />
            </div>
            <div className="md:col-span-4">
              <label className="text-sm font-medium mb-1 block">Cidades</label>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="col-span-1 md:col-span-2 flex items-center justify-center">
                  <Checkbox
                    id="filtrarCidades"
                    checked={filters.filtrarCidades}
                    onCheckedChange={(checked) => setFilters({ ...filters, filtrarCidades: checked === true })}
                  />
                </div>
                <div className="col-span-1 md:col-span-3">
                  <Select
                    value={filters.uf}
                    onValueChange={(v) => setFilters({ ...filters, uf: v, cidade: 'all' })}
                    disabled={filterUfsLoading || !filters.filtrarCidades}
                  >
                    <SelectTrigger><SelectValue placeholder={filterUfsLoading ? '...' : 'UF'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {filterUfs.map((uf) => (
                        <SelectItem key={uf.uf} value={uf.uf}>{uf.uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 md:col-span-7">
                  <Select
                    value={filters.cidade}
                    onValueChange={(v) => setFilters({ ...filters, cidade: v })}
                    disabled={filterCidadesLoading || filters.uf === 'all' || !filters.filtrarCidades}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filterCidadesLoading ? 'Carregando...' : (!filters.filtrarCidades ? 'Desativado' : (filters.uf === 'all' ? 'Selecione UF' : 'Todas'))} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {filterCidades.map((cidade) => (
                        <SelectItem key={cidade.cidade_id} value={cidade.nome_cidade}>{cidade.nome_cidade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Segmento</label>
              <Select value={filters.classe} onValueChange={(v) => setFilters({ ...filters, classe: v })}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {segmentos.map((segmento) => (
                    <SelectItem key={String(segmento.id)} value={String(segmento.id)}>
                      {segmento.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1 block">Forma de pagamento</label>
              <Select value={filters.formaPagto} onValueChange={(v) => setFilters({ ...filters, formaPagto: v })}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {filterFormas.map((f) => (
                    <SelectItem key={String(f.id)} value={String(f.id)}>{f.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1 block">Prazo de pagamento</label>
              <Select value={filters.prazoPagto} onValueChange={(v) => setFilters({ ...filters, prazoPagto: v })}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {prazos.map((p) => (
                    <SelectItem key={String(p.id)} value={String(p.id)}>{p.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Pessoa F/J</label>
              <Select value={filters.tipoPessoa} onValueChange={(v: ClientListFilters['tipoPessoa']) => {
                const next = { ...filters, tipoPessoa: v };
                setFilters(next);
                loadClients(next, true);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="fisica">Física</SelectItem>
                  <SelectItem value="juridica">Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="text-sm font-medium mb-1 block">Rede</label>
              <Select value={filters.rede} onValueChange={(v) => setFilters({ ...filters, rede: v })}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {filterRedes.map((r) => (
                    <SelectItem key={String(r.id)} value={String(r.id)}>{r.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4">
              <label className="text-sm font-medium mb-1 block">Rota</label>
              <Select value={filters.rota} onValueChange={(v) => setFilters({ ...filters, rota: v })}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {filterRotas.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.label || r.descricao_rota || r.codigo_rota || String(r.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4">
              <label className="text-sm font-medium mb-1 block">Tabelas de Preços</label>
              <Select value={filters.tabelaPreco} onValueChange={(v) => setFilters({ ...filters, tabelaPreco: v })}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {tabelas.map((t) => (
                    <SelectItem key={String(t.id)} value={String(t.id)}>{getTabelaLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="text-sm font-medium mb-1 block">Não positivado desde</label>
              <Input
                type="date"
                value={filters.naoPositivadoDesde}
                onChange={(e) => setFilters({ ...filters, naoPositivadoDesde: e.target.value })}
              />
            </div>
            <div className="md:col-span-4">
              <label className="text-sm font-medium mb-1 block">Cadastrados em (de)</label>
              <Input
                type="date"
                value={filters.cadastroDe}
                onChange={(e) => setFilters({ ...filters, cadastroDe: e.target.value })}
              />
            </div>
            <div className="md:col-span-4">
              <label className="text-sm font-medium mb-1 block">Cadastrados em (até)</label>
              <Input
                type="date"
                value={filters.cadastroAte}
                onChange={(e) => setFilters({ ...filters, cadastroAte: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          </div>
        </CardContent>
        </CollapsibleContent>
      </Card>
      </Collapsible>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Clientes ({clients.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Columns3 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Fixar colunas</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Colunas fixas</div>
                    <div className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-sm">Fixar ações à direita</span>
                      <Checkbox
                        checked={fixActionsColumn}
                        onCheckedChange={(checked) =>
                          setFixActionsColumn(checked === true)
                        }
                      />
                    </div>
                    <ScrollArea className="h-56 pr-2">
                      <div className="space-y-2">
                        {PINNABLE_CLIENT_COLUMNS.map((column) => (
                          <label
                            key={column.key}
                            className="flex items-center justify-between rounded-md border p-2 text-sm"
                          >
                            <span>{column.label}</span>
                            <Checkbox
                              checked={pinnedColumns.includes(column.key)}
                              onCheckedChange={(checked) =>
                                togglePinnedColumn(column.key, checked === true)
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="secondary"
                size="sm"
                onClick={openAjusteGeralDialog}
                disabled={selectedClients.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ajuste Geral ({selectedClients.length})</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exportLoading || clients.length === 0} className="flex-1 sm:flex-none">
                {exportLoading ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <Download className="h-4 w-4 sm:mr-2" />}
                <span className="hidden sm:inline">Exportar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => xlsxImportRef.current?.click()} className="flex-1 sm:flex-none">
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Importar</span>
              </Button>
              <input ref={xlsxImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
              <Button variant="default" size="sm" onClick={openCreateDialog} className="flex-1 sm:flex-none" disabled={!canInsert}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-auto scrollbar-thin" onScroll={handleClientsScroll}>
            <Table className="min-w-[2700px]">
              <TableHeader>
                <TableRow>
                  <TableHead
                    style={getStickyStyle('select')}
                    className={cn('w-12 px-2', getStickyHeadClass('select'))}
                  >
                    <Checkbox
                      checked={selectedClients.length === clients.length && clients.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('codigo')}
                    className={cn('w-24', getStickyHeadClass('codigo'))}
                  >
                    Código
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('nome')}
                    className={cn('min-w-[260px]', getStickyHeadClass('nome'))}
                  >
                    Nome
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('fantasia')}
                    className={cn('min-w-[220px]', getStickyHeadClass('fantasia'))}
                  >
                    Fantasia
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('cnpjCpf')}
                    className={cn('min-w-[150px]', getStickyHeadClass('cnpjCpf'))}
                  >
                    CNPJ/CPF
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('pessoa')}
                    className={cn('w-20', getStickyHeadClass('pessoa'))}
                  >
                    Pessoa
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('cidade')}
                    className={cn('min-w-[160px]', getStickyHeadClass('cidade'))}
                  >
                    Cidade
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('uf')}
                    className={cn('w-16', getStickyHeadClass('uf'))}
                  >
                    UF
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('bairro')}
                    className={cn('min-w-[160px]', getStickyHeadClass('bairro'))}
                  >
                    Bairro
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('endereco')}
                    className={cn('min-w-[220px]', getStickyHeadClass('endereco'))}
                  >
                    Endereço
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('numero')}
                    className={cn('w-24', getStickyHeadClass('numero'))}
                  >
                    Número
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('cep')}
                    className={cn('min-w-[120px]', getStickyHeadClass('cep'))}
                  >
                    CEP
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('telefone')}
                    className={cn('min-w-[140px]', getStickyHeadClass('telefone'))}
                  >
                    Telefone
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('whatsapp')}
                    className={cn('min-w-[140px]', getStickyHeadClass('whatsapp'))}
                  >
                    WhatsApp
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('email')}
                    className={cn('min-w-[220px]', getStickyHeadClass('email'))}
                  >
                    Email
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('comprador')}
                    className={cn('min-w-[180px]', getStickyHeadClass('comprador'))}
                  >
                    Comprador
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('segmento')}
                    className={cn('min-w-[160px]', getStickyHeadClass('segmento'))}
                  >
                    Segmento
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('rede')}
                    className={cn('min-w-[160px]', getStickyHeadClass('rede'))}
                  >
                    Rede
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('rota')}
                    className={cn('min-w-[160px]', getStickyHeadClass('rota'))}
                  >
                    Rota
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('formaPagto')}
                    className={cn('min-w-[170px]', getStickyHeadClass('formaPagto'))}
                  >
                    Forma Pagto
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('prazoPagto')}
                    className={cn('min-w-[170px]', getStickyHeadClass('prazoPagto'))}
                  >
                    Prazo Pagto
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('limiteCredito')}
                    className={cn('w-32 text-right', getStickyHeadClass('limiteCredito'))}
                  >
                    Limite Crédito
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('credito')}
                    className={cn('w-28 text-right', getStickyHeadClass('credito'))}
                  >
                    Crédito
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('aberto')}
                    className={cn('w-28 text-right', getStickyHeadClass('aberto'))}
                  >
                    Aberto
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('disponivel')}
                    className={cn('w-28 text-right', getStickyHeadClass('disponivel'))}
                  >
                    Disponível
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('b2b')}
                    className={cn('w-20 text-center', getStickyHeadClass('b2b'))}
                  >
                    B2B
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('simples')}
                    className={cn('w-20 text-center', getStickyHeadClass('simples'))}
                  >
                    Simples
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('consumidorFinal')}
                    className={cn('w-24 text-center', getStickyHeadClass('consumidorFinal'))}
                  >
                    Consum. Final
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('inativo')}
                    className={cn('w-20 text-center', getStickyHeadClass('inativo'))}
                  >
                    Inativo
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('tabelasPreco')}
                    className={cn('w-36', getStickyHeadClass('tabelasPreco'))}
                  >
                    Tab. Preço
                  </TableHead>
                  <TableHead
                    style={getStickyStyle('acoes')}
                    className={cn('text-center w-28 min-w-[112px]', getStickyHeadClass('acoes'))}
                  >
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isClientsInitialLoading ? (
                  <TableRow>
                    <TableCell colSpan={30} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={30} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => {
                    const formaPagtoLabel =
                      client.formaPagtoId != null
                        ? formasMap.get(Number(client.formaPagtoId)) || String(client.formaPagtoId)
                        : '-';
                    const prazoPagtoLabel =
                      client.prazoPagtoId != null
                        ? prazosMap.get(Number(client.prazoPagtoId)) || String(client.prazoPagtoId)
                        : '-';
                    const segmentoLabel =
                      client.segmentoId != null
                        ? segmentosMap.get(Number(client.segmentoId)) || String(client.segmentoId)
                        : '-';
                    const redeLabel =
                      client.redeId != null
                        ? redesMap.get(Number(client.redeId)) || String(client.redeId)
                        : '-';
                    const rotaLabel =
                      client.rotaId != null
                        ? rotasMap.get(Number(client.rotaId)) || String(client.rotaId)
                        : '-';

                    return (
                      <TableRow key={client.id} className="group">
                        <TableCell
                          style={getStickyStyle('select')}
                          className={cn('px-2', getStickyCellClass('select'))}
                        >
                          <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('codigo')}
                          className={cn('font-mono text-xs', getStickyCellClass('codigo'))}
                        >
                          {client.codigoCliente ?? ''}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('nome')}
                          className={cn('font-medium', getStickyCellClass('nome'))}
                        >
                          <div className="truncate whitespace-nowrap" title={client.nome}>
                            {client.nome}
                          </div>
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('fantasia')}
                          className={cn(getStickyCellClass('fantasia'))}
                        >
                          {client.fantasia || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('cnpjCpf')}
                          className={cn(getStickyCellClass('cnpjCpf'))}
                        >
                          {client.cnpjCpf || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('pessoa')}
                          className={cn(getStickyCellClass('pessoa'))}
                        >
                          {client.tipoPessoa || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('cidade')}
                          className={cn(getStickyCellClass('cidade'))}
                        >
                          {client.cidade || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('uf')}
                          className={cn(getStickyCellClass('uf'))}
                        >
                          {client.uf || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('bairro')}
                          className={cn(getStickyCellClass('bairro'))}
                        >
                          {client.bairro || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('endereco')}
                          className={cn(getStickyCellClass('endereco'))}
                        >
                          {client.endereco || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('numero')}
                          className={cn(getStickyCellClass('numero'))}
                        >
                          {client.numero || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('cep')}
                          className={cn(getStickyCellClass('cep'))}
                        >
                          {client.cep || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('telefone')}
                          className={cn(getStickyCellClass('telefone'))}
                        >
                          {client.fone || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('whatsapp')}
                          className={cn(getStickyCellClass('whatsapp'))}
                        >
                          {client.whatsapp || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('email')}
                          className={cn(getStickyCellClass('email'))}
                        >
                          {client.email || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('comprador')}
                          className={cn(getStickyCellClass('comprador'))}
                        >
                          {client.compradorNome || '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('segmento')}
                          className={cn(getStickyCellClass('segmento'))}
                        >
                          {segmentoLabel}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('rede')}
                          className={cn(getStickyCellClass('rede'))}
                        >
                          {redeLabel}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('rota')}
                          className={cn(getStickyCellClass('rota'))}
                        >
                          {rotaLabel}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('formaPagto')}
                          className={cn(getStickyCellClass('formaPagto'))}
                        >
                          {formaPagtoLabel}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('prazoPagto')}
                          className={cn(getStickyCellClass('prazoPagto'))}
                        >
                          {prazoPagtoLabel}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('limiteCredito')}
                          className={cn('text-right', getStickyCellClass('limiteCredito'))}
                        >
                          {formatGridNumber(client.limiteCredito)}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('credito')}
                          className={cn('text-right', getStickyCellClass('credito'))}
                        >
                          {formatGridNumber(client.credito)}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('aberto')}
                          className={cn('text-right', getStickyCellClass('aberto'))}
                        >
                          {formatGridNumber(client.aberto)}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('disponivel')}
                          className={cn('text-right', getStickyCellClass('disponivel'))}
                        >
                          {formatGridNumber(client.disponivel)}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('b2b')}
                          className={cn('text-center', getStickyCellClass('b2b'))}
                        >
                          {client.b2bLiberado ? 'Sim' : 'Não'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('simples')}
                          className={cn('text-center', getStickyCellClass('simples'))}
                        >
                          {client.simplesNacional ? 'Sim' : 'Não'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('consumidorFinal')}
                          className={cn('text-center', getStickyCellClass('consumidorFinal'))}
                        >
                          {client.consumidorFinal ? 'Sim' : 'Não'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('inativo')}
                          className={cn('text-center', getStickyCellClass('inativo'))}
                        >
                          {client.inativo ? 'Sim' : 'Não'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('tabelasPreco')}
                          className={cn('font-mono text-xs', getStickyCellClass('tabelasPreco'))}
                        >
                          {client.tabelasCodigos?.length
                            ? client.tabelasCodigos.join(', ')
                            : '-'}
                        </TableCell>
                        <TableCell
                          style={getStickyStyle('acoes')}
                          className={cn('w-28 min-w-[112px] text-center', getStickyCellClass('acoes'))}
                        >
                          <TooltipProvider>
                            <div className="flex items-center justify-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setClientInfoId(client.id); setClientInfoOpen(true); }}>
                                    <Info className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Visualizar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openEditDialog(client.id)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDelete(client.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {isClientsLoadingMore && (
                  <TableRow>
                    <TableCell colSpan={30} className="text-center py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* <div className="flex justify-end">
        <Button onClick={handleCadastrarPara} disabled={selectedClients.length === 0}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cadastrar para ({selectedClients.length})
        </Button>
      </div> */}

      <Dialog
        open={ajusteGeralOpen}
        onOpenChange={(open) => {
          if (ajusteGeralLoading) return;
          setAjusteGeralOpen(open);
        }}
      >
        <DialogContent className="w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ajuste Geral</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md p-3 bg-muted/40">
            <p className="text-xs font-medium text-muted-foreground mb-2">Aplicar para</p>
            <RadioGroup
              value={ajusteGeralAlvo}
              onValueChange={(v) => setAjusteGeralAlvo(v as typeof ajusteGeralAlvo)}
              className="flex flex-col sm:flex-row gap-3"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="selecionados" disabled={selectedClients.length === 0} />
                <span className="text-sm">
                  Selecionados{selectedClients.length > 0 ? ` (${selectedClients.length})` : ''}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="view" />
                <span className="text-sm">Todos na view ({clients.length}{clientsHasMore ? '+' : ''})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="todos" />
                <span className="text-sm">Todos os filtrados</span>
              </label>
            </RadioGroup>
          </div>
          <div className="max-h-[60vh] overflow-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.formaPagtoChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        formaPagtoChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Forma pagto</label>
                </div>
                <Select
                  value={ajusteGeralForm.formaPagtoId || 'none'}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      formaPagtoId: value === 'none' ? '' : value,
                    }))
                  }
                  disabled={!ajusteGeralForm.formaPagtoChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {filterFormas.map((forma) => (
                      <SelectItem key={String(forma.id)} value={String(forma.id)}>
                        {forma.codigo ? `${forma.codigo} - ${forma.descricao}` : forma.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.prazoPagtoChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        prazoPagtoChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Prazo pagto</label>
                </div>
                <Select
                  value={ajusteGeralForm.prazoPagtoId || 'none'}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      prazoPagtoId: value === 'none' ? '' : value,
                    }))
                  }
                  disabled={!ajusteGeralForm.prazoPagtoChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {prazos.map((prazo) => (
                      <SelectItem key={String(prazo.id)} value={String(prazo.id)}>
                        {prazo.codigo ? `${prazo.codigo} - ${prazo.descricao}` : prazo.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.segmentoChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        segmentoChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Segmento</label>
                </div>
                <Select
                  value={ajusteGeralForm.segmentoId || 'none'}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      segmentoId: value === 'none' ? '' : value,
                    }))
                  }
                  disabled={!ajusteGeralForm.segmentoChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {segmentos.map((segmento) => (
                      <SelectItem key={String(segmento.id)} value={String(segmento.id)}>
                        {segmento.codigo ? `${segmento.codigo} - ${segmento.descricao}` : segmento.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.rotaChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        rotaChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Rota entrega</label>
                </div>
                <Select
                  value={ajusteGeralForm.rotaId || 'none'}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      rotaId: value === 'none' ? '' : value,
                    }))
                  }
                  disabled={!ajusteGeralForm.rotaChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {filterRotas.map((rota) => (
                      <SelectItem key={String(rota.id)} value={String(rota.id)}>
                        {rota.label || rota.descricao_rota || rota.codigo_rota || String(rota.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.redeChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        redeChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Rede</label>
                </div>
                <Select
                  value={ajusteGeralForm.redeId || 'none'}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      redeId: value === 'none' ? '' : value,
                    }))
                  }
                  disabled={!ajusteGeralForm.redeChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {filterRedes.map((rede) => (
                      <SelectItem key={String(rede.id)} value={String(rede.id)}>
                        {rede.codigo ? `${rede.codigo} - ${rede.descricao}` : rede.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.cepChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        cepChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">CEP</label>
                </div>
                <Input
                  value={ajusteGeralForm.cep}
                  onChange={(e) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      cep: formatCep(e.target.value),
                    }))
                  }
                  disabled={!ajusteGeralForm.cepChecked}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.creditoChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        creditoChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Crédito</label>
                </div>
                <Input
                  value={ajusteGeralForm.credito}
                  onChange={(e) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      credito: e.target.value,
                    }))
                  }
                  disabled={!ajusteGeralForm.creditoChecked}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.consumidorFinalChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        consumidorFinalChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Consumidor final</label>
                </div>
                <Select
                  value={ajusteGeralForm.consumidorFinal}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      consumidorFinal: value,
                    }))
                  }
                  disabled={!ajusteGeralForm.consumidorFinalChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.inativoChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        inativoChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Inativos</label>
                </div>
                <Select
                  value={ajusteGeralForm.inativo}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      inativo: value,
                    }))
                  }
                  disabled={!ajusteGeralForm.inativoChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.b2bLiberadoChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        b2bLiberadoChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">B2B</label>
                </div>
                <Select
                  value={ajusteGeralForm.b2bLiberado}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      b2bLiberado: value,
                    }))
                  }
                  disabled={!ajusteGeralForm.b2bLiberadoChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Liberado</SelectItem>
                    <SelectItem value="false">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.b2bTabelaChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        b2bTabelaChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Tabela B2B</label>
                </div>
                <Select
                  value={ajusteGeralForm.b2bTabelaId || 'none'}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      b2bTabelaId: value === 'none' ? '' : value,
                    }))
                  }
                  disabled={!ajusteGeralForm.b2bTabelaChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {tabelas.map((tabela) => (
                      <SelectItem key={String(tabela.id)} value={String(tabela.id)}>
                        {getTabelaLabel(tabela)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={ajusteGeralForm.tabelaPrecoChecked}
                    onCheckedChange={(checked) =>
                      setAjusteGeralForm((prev) => ({
                        ...prev,
                        tabelaPrecoChecked: checked === true,
                      }))
                    }
                  />
                  <label className="text-sm font-medium">Tabela de Preços</label>
                </div>
                <Select
                  value={ajusteGeralForm.tabelaPrecoAcao}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      tabelaPrecoAcao: value as 'vincular' | 'desvincular',
                    }))
                  }
                  disabled={!ajusteGeralForm.tabelaPrecoChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vincular">Vincular</SelectItem>
                    <SelectItem value="desvincular">Desvincular</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={ajusteGeralForm.tabelaPrecoId || 'none'}
                  onValueChange={(value) =>
                    setAjusteGeralForm((prev) => ({
                      ...prev,
                      tabelaPrecoId: value === 'none' ? '' : value,
                    }))
                  }
                  disabled={!ajusteGeralForm.tabelaPrecoChecked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a tabela" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {tabelas.map((tabela) => (
                      <SelectItem key={String(tabela.id)} value={String(tabela.id)}>
                        {getTabelaLabel(tabela)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAjusteGeralOpen(false)}
              disabled={ajusteGeralLoading}
            >
              Cancelar
            </Button>
            <Button variant="default" onClick={handleProcessAjusteGeral} disabled={ajusteGeralLoading}>
              {ajusteGeralLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Processar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Pedido para Clientes Selecionados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Operação</label>
              <Select value={selectedOperacao} onValueChange={setSelectedOperacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a operação" />
                </SelectTrigger>
                <SelectContent>
                  {operacoes.map(op => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Será criado um pedido para cada um dos {selectedClients.length} cliente(s) selecionado(s).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="default" onClick={handleConfirmCadastro}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client */}
      <Dialog open={createOpen} onOpenChange={handleDialogOpenChange('create')}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Cadastrar novo cliente</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="identificacao" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="comerciais">Dados Comerciais</TabsTrigger>
              <TabsTrigger value="complementares">Dados complementares</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 px-2 pb-2">
              {/* =================== Identificação =================== */}
              <TabsContent value="identificacao" className="m-0 space-y-4">
                {/* CNPJ/CPF + Tipo + Código */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CNPJ / CPF *</label>
                    <div className="flex gap-1">
                      <Input
                        className="h-8 text-sm flex-1"
                        value={formData.cnpjCpf}
                        onChange={(e) => {
                          const next = formatCnpjCpf(e.target.value);
                          setFormData({ ...formData, cnpjCpf: next });
                          cnpjLookupRef.current?.(next);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => cnpjLookupRef.current?.(formData.cnpjCpf)}
                        disabled={cnpjLookupLoading}
                      >
                        {cnpjLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {existingClientByCnpj ? (
                      <p className="mt-1 text-xs text-destructive">
                        {buildExistingClientDuplicateMessage(existingClientByCnpj)}
                      </p>
                    ) : cnpjCpfFieldError ? (
                      <p className="mt-1 text-xs text-destructive">{cnpjCpfFieldError}</p>
                    ) : cnpjDuplicateLoading ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Verificando cliente existente...
                      </p>
                    ) : null}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
                    <Input className="h-8 text-sm bg-muted" value={formData.codigoCliente} readOnly />
                  </div>
                  <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                    <Checkbox checked={!formData.inativo} onCheckedChange={(checked) => setFormData({ ...formData, inativo: checked !== true })} />
                    <label className="text-sm">Ativo</label>
                  </div>
                </div>

                {/* Razão Social + Simples Nacional */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-9">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Razão Social/Nome *</label>
                    <Input className="h-8 text-sm" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                  </div>
                  <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                    <Checkbox
                      checked={formData.simplesNacional}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, simplesNacional: checked === true })
                      }
                    />
                    <label className="text-sm">Simples nacional</label>
                  </div>
                </div>

                {/* Nome Fantasia + Consumidor final */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-9">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome Fantasia</label>
                    <Input className="h-8 text-sm" value={formData.fantasia} onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })} />
                  </div>
                  <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                    <Checkbox
                      checked={formData.consumidorFinal}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, consumidorFinal: checked === true })
                      }
                    />
                    <label className="text-sm">Consumidor final</label>
                  </div>
                </div>

                {/* Inscrições + Contribuinte + Suframa */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. estadual</label>
                    <Input className="h-8 text-sm" value={formData.inscEstadual} onChange={(e) => setFormData({ ...formData, inscEstadual: e.target.value })} />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. municipal</label>
                    <Input className="h-8 text-sm" value={formData.inscMunicipal} onChange={(e) => setFormData({ ...formData, inscMunicipal: e.target.value })} />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <Select defaultValue="contribuinte">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="contribuinte">Contribuinte ICM</SelectItem>
                        <SelectItem value="nao">Não contribuinte</SelectItem>
                        <SelectItem value="isento">Isento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Suframa</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                </div>

                {/* Seção Endereço */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Endereço</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Cep *</label>
                    <div className="flex gap-1">
                      <Input
                        className="h-8 text-sm"
                        placeholder="-"
                        value={formData.cep}
                        onChange={(e) => {
                          const next = formatCep(e.target.value);
                          setFormData({ ...formData, cep: next });
                          cepLookupRef.current?.(next);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => cepLookupRef.current?.(formData.cep)}
                        disabled={cepLookupLoading}
                      >
                        {cepLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-9">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço *</label>
                    <Input className="h-8 text-sm" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
                    <Input className="h-8 text-sm" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">UF *</label>
                    <Select
                      value={formData.uf}
                      onValueChange={(v) => setFormData({ ...formData, uf: toUpperValue(v), cidade: '', cidadeId: 0 })}
                      disabled={ufsLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {ufsApi.map(u => (
                          <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade *</label>
                    <Select
                      value={formData.cidadeId ? String(formData.cidadeId) : ''}
                      onValueChange={(v) => {
                        const cid = cidadesApi.find(c => String(c.cidade_id) === v);
                        setFormData({ ...formData, cidadeId: parseInt(v) || 0, cidade: toUpperValue(cid?.nome_cidade || '') });
                      }}
                      disabled={cidadesLoading || !formData.uf}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={cidadesLoading ? 'Carregando...' : (formData.uf ? 'Selecione' : 'Selecione UF')} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-60">
                        {cidadesApi.map(c => (
                          <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro *</label>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <Input className="h-8 text-sm" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Complem.</label>
                    <Input className="h-8 text-sm" value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} />
                  </div>
                </div>

                {/* Seção Telefones */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Telefones</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Fixo *</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })} />
                  </div>
                </div>

                <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} className="max-w-lg" upperCase={false} />
                <FormField label="Email Danfe" value={formData.emailDanfe} onChange={(v) => setFormData({ ...formData, emailDanfe: v })} className="max-w-lg" upperCase={false} />
                <FormField label="Site" value={formData.site} onChange={(v) => setFormData({ ...formData, site: v })} className="max-w-lg" upperCase={false} />

                <div className="max-w-lg">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Rota entrega *</label>
                  <Select
                    value={formData.rotaId ? String(formData.rotaId) : ''}
                    onValueChange={(v) => setFormData({ ...formData, rotaId: parseInt(v) || 0 })}
                    disabled={rotasLoading}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={rotasLoading ? 'Carregando...' : 'Selecione a rota'} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="0">Nenhuma</SelectItem>
                      {rotas.map((rota) => (
                        <SelectItem key={rota.id} value={String(rota.id)}>
                          {rota.codigo_rota ? `${rota.codigo_rota} - ${rota.label}` : rota.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* =================== Dados Complementares =================== */}
              <TabsContent value="complementares" className="m-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">RG</label>
                    <Input
                      className="h-8 text-sm"
                      value={formData.rg}
                      onChange={(e) =>
                        setFormData({ ...formData, rg: formatRg(e.target.value) })
                      }
                    />
                  </div>
                </div>

                {/* Seção Cobrança */}
                <div className="border-b border-primary/50 pb-1 mt-4">
                  <span className="text-sm font-medium text-primary">Cobrança</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-12">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
                    <Input
                      className="h-8 text-sm"
                      value={formData.cobrancaEndereco}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cobrancaEndereco: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
                    <Input
                      className="h-8 text-sm"
                      value={formData.cobrancaEnderecoNumero}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cobrancaEnderecoNumero: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-1 md:col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                    <Input
                      className="h-8 text-sm"
                      value={formData.cobrancaEnderecoBairro}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cobrancaEnderecoBairro: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Complemento</label>
                    <Input
                      className="h-8 text-sm"
                      value={formData.cobrancaEnderecoComplemento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cobrancaEnderecoComplemento: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
                    <Select
                      value={formData.cobrancaEnderecoUf}
                      onValueChange={(v) => {
                        setFormData({
                          ...formData,
                          cobrancaEnderecoUf: toUpperValue(v),
                          cobrancaEnderecoCidadeId: 0,
                        });
                      }}
                      disabled={ufsLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {ufsApi.map(u => (
                          <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                    <Select
                      value={
                        formData.cobrancaEnderecoCidadeId
                          ? String(formData.cobrancaEnderecoCidadeId)
                          : ''
                      }
                      onValueChange={(v) => {
                        setFormData({
                          ...formData,
                          cobrancaEnderecoCidadeId: parseInt(v) || 0,
                        });
                      }}
                      disabled={
                        cidadesCobrancaLoading || !formData.cobrancaEnderecoUf
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue
                          placeholder={
                            cidadesCobrancaLoading
                              ? 'Carregando...'
                              : formData.cobrancaEnderecoUf
                              ? 'Selecione'
                              : 'Selecione UF'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-60">
                        {cidadesCobranca.map(c => (
                          <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="-"
                      value={formData.cobrancaEnderecoCep}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cobrancaEnderecoCep: formatCep(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              {/* =================== Dados Comerciais =================== */}
              <TabsContent value="comerciais" className="m-0 space-y-4">
                {/* Contatos */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contatos</label>
                    <Input className="h-8 text-sm" value={formData.contato1Nome} onChange={(e) => setFormData({ ...formData, contato1Nome: e.target.value })} />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.contato1Celular} onChange={(e) => setFormData({ ...formData, contato1Celular: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Aniversário</label>
                    <Input type="date" className="h-8 text-sm" value={formData.contato1Aniversario} onChange={(e) => setFormData({ ...formData, contato1Aniversario: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-5">
                    <Input className="h-8 text-sm" value={formData.contato2Nome} onChange={(e) => setFormData({ ...formData, contato2Nome: e.target.value })} />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.contato2Celular} onChange={(e) => setFormData({ ...formData, contato2Celular: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <Input type="date" className="h-8 text-sm" value={formData.contato2Aniversario} onChange={(e) => setFormData({ ...formData, contato2Aniversario: e.target.value })} />
                  </div>
                </div>

                {/* Segmentos / Checkouts / Dependência / Rede */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mt-4">
                  <div className="col-span-1 md:col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Segmentos *</label>
                    <Select
                      value={formData.segmentoId ? String(formData.segmentoId) : ''}
                      onValueChange={(v) => setFormData({ ...formData, segmentoId: parseInt(v) || 0 })}
                      disabled={segmentosLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={segmentosLoading ? 'Carregando...' : 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {segmentos.map((segmento) => (
                          <SelectItem key={segmento.id} value={String(segmento.id)}>
                            {segmento.codigo ? `${segmento.codigo} - ${segmento.descricao}` : segmento.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Checkouts</label>
                    <Input type="number" className="h-8 text-sm text-right" value={formData.checkouts} onChange={(e) => setFormData({ ...formData, checkouts: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Dependência</label>
                    <Input type="number" className="h-8 text-sm text-right" defaultValue={0} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Rede</label>
                    <Select
                      value={formData.redeId !== undefined && formData.redeId !== null ? String(formData.redeId) : ''}
                      onValueChange={(v) => setFormData({ ...formData, redeId: parseInt(v) || 0 })}
                      disabled={redesLoading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={redesLoading ? 'Carregando...' : 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="0">Nenhuma</SelectItem>
                        {redes.map((rede) => (
                          <SelectItem key={rede.id} value={String(rede.id)}>
                            {rede.codigo ? `${rede.codigo} - ${rede.descricao}` : rede.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tabelas de preços / Tabela Principal / Permite venda */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mt-4">
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tabela de preços *</label>
                    <Dialog open={tabelaSearchOpen && createOpen} onOpenChange={onTabelaDialogChange}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-8 text-sm">
                          {tabelaSummary}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Selecionar tabelas de preço</DialogTitle>
                        </DialogHeader>
                        <Input
                          placeholder="Buscar tabela..."
                          value={tabelaSearch}
                          onChange={(e) => setTabelaSearch(e.target.value)}
                          autoFocus
                        />
                        <ScrollArea className="h-64 mt-2">
                          {tabelasLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Carregando tabelas...</div>
                          ) : tabelas.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma tabela disponível</div>
                          ) : filteredTabelas.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma tabela encontrada</div>
                          ) : (
                            <div className="space-y-1">
                              {filteredTabelas.map((t) => {
                                const tId = Number(t.id);
                                const checked = formData.tabelaIds.includes(tId);
                                const label = getTabelaLabel(t);
                                return (
                                  <label
                                    key={t.id}
                                    className={cn('flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer', checked && 'bg-muted')}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => toggleTabelaId(tId, value === true)}
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                        <DialogFooter>
                          <Button onClick={() => onTabelaDialogChange(false)}>Confirmar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tabela principal *</label>
                    <Select
                      value={formData.tabelaPrincipalId ? String(formData.tabelaPrincipalId) : ''}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, tabelaPrincipalId: Number(v) }))}
                      disabled={formData.tabelaIds.length === 0}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {tabelas
                          .filter((t) => formData.tabelaIds.includes(Number(t.id)))
                          .map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>{getTabelaLabel(t)}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Permite venda nas empresas (ex: 01,02..)</label>
                    <Input className="h-8 text-sm" onChange={handleUpperChange} />
                  </div>
                </div>

                {/* Representante */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Representante *</label>
                    <Dialog open={repSearchOpen && createOpen} onOpenChange={setRepSearchOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-8 text-sm">
                          {representanteSummary}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Buscar representante</DialogTitle>
                        </DialogHeader>
                        <Input
                          placeholder="Digite nome ou código..."
                          value={repSearch}
                          onChange={(e) => setRepSearch(e.target.value)}
                          autoFocus
                        />
                        <ScrollArea className="h-64 mt-2" onScrollCapture={(e) => {
                          const el = e.currentTarget;
                          if (repHasMore && !loadingReps && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                            loadReps(false);
                          }
                        }}>
                          {loadingReps ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Carregando representantes...</div>
                          ) : repsError ? (
                            <div className="py-6 text-center text-sm text-red-600">{repsError}</div>
                          ) : representatives.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Nenhum representante encontrado</div>
                          ) : (
                            <div className="space-y-1">
                              {representatives.map((r) => {
                                const repId = String(r.codigoRepresentante || r.id);
                                const repNome = toUpperValue(r.nome);
                                const checked = formData.representantes.some((rep) => rep.id === repId);
                                return (
                                  <label
                                    key={r.id}
                                    className={cn('flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer', checked && 'bg-muted')}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        const isChecked = value === true;
                                        setFormData((prev) => {
                                          const exists = prev.representantes.some((rep) => rep.id === repId);
                                          const nextRepresentantes = isChecked && !exists
                                            ? [...prev.representantes, { id: repId, nome: repNome }]
                                            : (!isChecked && exists
                                              ? prev.representantes.filter((rep) => rep.id !== repId)
                                              : prev.representantes);
                                          return { ...prev, representantes: nextRepresentantes };
                                        });
                                      }}
                                    />
                                    <span>{`${r.codigoRepresentante || r.id} - ${repNome}`}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                        <DialogFooter>
                          <Button onClick={() => setRepSearchOpen(false)}>Confirmar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Prazo máximo + Descontos */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de pagamento *</label>
                    <Select
                      value={String(ensurePositiveId(formData.formaPagtoId))}
                      onValueChange={(v) =>
                        setFormData({ ...formData, formaPagtoId: ensurePositiveId(v, 0) })
                      }
                      disabled={filterFormas.length === 0}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {filterFormas.map((forma) => (
                          <SelectItem key={String(forma.id)} value={String(forma.id)}>
                            {forma.codigo ? `${forma.codigo} - ${forma.descricao}` : forma.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo máximo liberado *</label>
                    <Select
                      value={formData.prazoPagtoId ? String(formData.prazoPagtoId) : ''}
                      onValueChange={(v) => {
                        const match = prazos.find((p) => String(p.id) === v);
                        setFormData({ ...formData, prazoPagtoId: match ? ensurePositiveId(match.id, 0) : 0, prazo: match ? String(match.descricao) : '' });
                      }}
                      disabled={prazosLoading || !!prazosError}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={prazosLoading ? 'Carregando...' : prazosError ? 'Erro ao carregar' : 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {prazos.map((p) => (
                          <SelectItem key={`${p.id}-${p.codigo || p.descricao}`} value={String(p.id)}>
                            {p.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">% Desconto máximo na nota fiscal</label>
                    <div className="flex items-center gap-1">
                      <Input type="number" className="h-8 text-sm text-right" value={formData.descontoFinanceiroBoleto} onChange={(e) => setFormData({ ...formData, descontoFinanceiroBoleto: parseFloat(e.target.value) || 0 })} />
                      <span className="text-sm">(%)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Crédito</label>
                    <Input
                      type="number"
                      className="h-8 text-sm text-right"
                      value={formData.credito}
                      onChange={(e) =>
                        setFormData((prev) => {
                          const credito = parseFloat(e.target.value) || 0;
                          return {
                            ...prev,
                            credito,
                            disponivel: credito - (Number(prev.aberto) || 0),
                          };
                        })
                      }
                    />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Aberto</label>
                    <Input
                      type="number"
                      className="h-8 text-sm text-right bg-muted"
                      value={formData.aberto}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Disponível</label>
                    <Input
                      type="number"
                      className="h-8 text-sm text-right bg-muted"
                      value={(Number(formData.credito) || 0) - (Number(formData.aberto) || 0)}
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="col-span-1 md:col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">% Despesas nota fiscal</label>
                    <div className="flex items-center gap-1">
                      <Input type="number" className="h-8 text-sm text-right" defaultValue={0} />
                      <span className="text-sm">(%)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-6"></div>
                  <div className="col-span-1 md:col-span-6">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">% Frete nota fiscal</label>
                    <div className="flex items-center gap-1">
                      <Input type="number" className="h-8 text-sm text-right" defaultValue={0} />
                      <span className="text-sm">(%)</span>
                    </div>
                  </div>
                </div>

                {/* B2B */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mt-4">
                  <div className="col-span-1 md:col-span-12 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.b2bLiberado}
                        onCheckedChange={(c) => setFormData({ ...formData, b2bLiberado: c as boolean })}
                      />
                      <label className="text-sm">Liberado venda no B2B</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Senha B2B</label>
                      <Input
                        className="h-8 text-sm w-32"
                        value={formData.b2bSenha}
                        onChange={(e) => setFormData({ ...formData, b2bSenha: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3"
                        onClick={() => setFormData((prev) => ({ ...prev, b2bSenha: generateB2bSenha() }))}
                      >
                        Gerar senha
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Tabela B2B</label>
                      <Select
                        value={formData.b2bTabelaId ? String(formData.b2bTabelaId) : ''}
                        onValueChange={(v) => setFormData({ ...formData, b2bTabelaId: Number(v) || 0 })}
                      >
                        <SelectTrigger className="h-8 text-sm w-44">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {tabelas.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {getTabelaLabel(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="border-t pt-4 mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs. Comercial</label>
                    <Textarea
                      className="min-h-[80px] text-sm"
                      value={formData.observacaoComercial}
                      onChange={(e) => setFormData({ ...formData, observacaoComercial: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs. Financeiro</label>
                    <Textarea
                      className="min-h-[80px] text-sm"
                      value={formData.observacaoFinanceiro}
                      onChange={(e) => setFormData({ ...formData, observacaoFinanceiro: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          {formErrors.length > 0 && (
            <div className="text-sm text-destructive mt-2 space-y-1">
              {formErrors.map((err, index) => (
                <div key={`${err}-${index}`}>{err}</div>
              ))}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => requestCloseDialog('create')} disabled={formLoading}>Cancelar</Button>
            <Button
              variant="default"
              onClick={submitCreate}
              disabled={
                formLoading ||
                cnpjDuplicateLoading ||
                Boolean(existingClientByCnpj)
              }
            >
              {formLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client - mesmo layout */}
      <Dialog open={editOpen} onOpenChange={handleDialogOpenChange('edit')}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Carregando dados do cliente...</div>
          ) : (
            <Tabs defaultValue="identificacao" className="flex-1 min-h-0 flex flex-col">
              <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="identificacao">Identificação</TabsTrigger>
                <TabsTrigger value="comerciais">Dados Comerciais</TabsTrigger>
                <TabsTrigger value="complementares">Dados complementares</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4 px-2 pb-2">
                {/* Identificação */}
                <TabsContent value="identificacao" className="m-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">CNPJ / CPF *</label>
                      <div className="flex gap-1">
                        <Input
                          className="h-8 text-sm flex-1"
                          value={formData.cnpjCpf}
                          onChange={(e) =>
                            setFormData({ ...formData, cnpjCpf: formatCnpjCpf(e.target.value) })
                          }
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => cnpjLookupRef.current?.(formData.cnpjCpf)}
                          disabled={cnpjLookupLoading}
                        >
                          {cnpjLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                      {cnpjCpfFieldError ? (
                        <p className="mt-1 text-xs text-destructive">{cnpjCpfFieldError}</p>
                      ) : null}
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
                      <Input className="h-8 text-sm bg-muted" value={formData.codigoCliente} readOnly />
                    </div>
                    <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                      <Checkbox checked={!formData.inativo} onCheckedChange={(checked) => setFormData({ ...formData, inativo: checked !== true })} />
                      <label className="text-sm">Ativo</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-9">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Razão Social/Nome *</label>
                      <Input className="h-8 text-sm" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                    </div>
                    <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                      <Checkbox
                        checked={formData.simplesNacional}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, simplesNacional: checked === true })
                        }
                      />
                      <label className="text-sm">Simples nacional</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-9">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome Fantasia</label>
                      <Input className="h-8 text-sm" value={formData.fantasia} onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })} />
                    </div>
                    <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                      <Checkbox
                        checked={formData.consumidorFinal}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, consumidorFinal: checked === true })
                        }
                      />
                      <label className="text-sm">Consumidor final</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. estadual</label>
                      <Input className="h-8 text-sm" value={formData.inscEstadual} onChange={(e) => setFormData({ ...formData, inscEstadual: e.target.value })} />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Inscr. municipal</label>
                      <Input className="h-8 text-sm" value={formData.inscMunicipal} onChange={(e) => setFormData({ ...formData, inscMunicipal: e.target.value })} />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <Select defaultValue="contribuinte">
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="contribuinte">Contribuinte ICM</SelectItem>
                          <SelectItem value="nao">Não contribuinte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Suframa</label>
                      <Input className="h-8 text-sm" onChange={handleUpperChange} />
                    </div>
                  </div>

                  <div className="border-b border-primary/50 pb-1 mt-4">
                    <span className="text-sm font-medium text-primary">Endereço</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Cep *</label>
                      <div className="flex gap-1">
                        <Input
                          className="h-8 text-sm"
                          value={formData.cep}
                          onChange={(e) => {
                            const next = formatCep(e.target.value);
                            setFormData({ ...formData, cep: next });
                            cepLookupRef.current?.(next);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => cepLookupRef.current?.(formData.cep)}
                          disabled={cepLookupLoading}
                        >
                          {cepLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-9">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço *</label>
                      <Input className="h-8 text-sm" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
                      <Input className="h-8 text-sm" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">UF *</label>
                      <Select
                        value={formData.uf}
                        onValueChange={(v) => setFormData({ ...formData, uf: toUpperValue(v), cidade: '', cidadeId: 0 })}
                        disabled={ufsLoading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {ufsApi.map(u => (
                            <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-5">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade *</label>
                      <Select
                        value={formData.cidadeId ? String(formData.cidadeId) : ''}
                        onValueChange={(v) => {
                          const cid = cidadesApi.find(c => String(c.cidade_id) === v);
                          setFormData({ ...formData, cidadeId: parseInt(v) || 0, cidade: toUpperValue(cid?.nome_cidade || '') });
                        }}
                        disabled={cidadesLoading || !formData.uf}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={cidadesLoading ? 'Carregando...' : (formData.uf ? 'Selecione' : 'Selecione UF')} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 max-h-60">
                          {cidadesApi.map(c => (
                            <SelectItem key={c.cidade_id} value={String(c.cidade_id)}>{c.nome_cidade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro *</label>
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <Input className="h-8 text-sm" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                    </div>
                  </div>

                  <FormField label="Complem." value={formData.complemento} onChange={(v) => setFormData({ ...formData, complemento: v })} className="max-w-md" />

                  <div className="border-b border-primary/50 pb-1 mt-4">
                    <span className="text-sm font-medium text-primary">Telefones</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Fixo *</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })} />
                  </div>
                </div>

                  <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} className="max-w-lg" upperCase={false} />
                  <FormField label="Email Danfe" value={formData.emailDanfe} onChange={(v) => setFormData({ ...formData, emailDanfe: v })} className="max-w-lg" upperCase={false} />
                  <FormField label="Site" value={formData.site} onChange={(v) => setFormData({ ...formData, site: v })} className="max-w-lg" upperCase={false} />

                  <div className="max-w-lg">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Rota entrega *</label>
                    <Select value={formData.rotaId ? String(formData.rotaId) : ''} onValueChange={(v) => setFormData({ ...formData, rotaId: parseInt(v) || 0 })} disabled={rotasLoading}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={rotasLoading ? 'Carregando...' : 'Selecione'} /></SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="0">Nenhuma</SelectItem>
                        {rotas.map((rota) => (
                          <SelectItem key={rota.id} value={String(rota.id)}>{rota.codigo_rota ? `${rota.codigo_rota} - ${rota.label}` : rota.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                {/* Dados Complementares */}
                <TabsContent value="complementares" className="m-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">RG</label>
                      <Input
                        className="h-8 text-sm"
                        value={formData.rg}
                        onChange={(e) =>
                          setFormData({ ...formData, rg: formatRg(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <div className="border-b border-primary/50 pb-1 mt-4">
                    <span className="text-sm font-medium text-primary">Cobrança</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-12">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
                      <Input
                        className="h-8 text-sm"
                        value={formData.cobrancaEndereco}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cobrancaEndereco: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
                      <Input
                        className="h-8 text-sm"
                        value={formData.cobrancaEnderecoNumero}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cobrancaEnderecoNumero: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-1 md:col-span-5">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                      <Input
                        className="h-8 text-sm"
                        value={formData.cobrancaEnderecoBairro}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cobrancaEnderecoBairro: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Complemento</label>
                      <Input
                        className="h-8 text-sm"
                        value={formData.cobrancaEnderecoComplemento}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cobrancaEnderecoComplemento: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
                      <Select
                        value={formData.cobrancaEnderecoUf}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            cobrancaEnderecoUf: toUpperValue(v),
                            cobrancaEnderecoCidadeId: 0,
                          })
                        }
                        disabled={ufsLoading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {ufsApi.map((u) => (
                            <SelectItem key={u.uf} value={u.uf}>
                              {u.uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-5">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                      <Select
                        value={
                          formData.cobrancaEnderecoCidadeId
                            ? String(formData.cobrancaEnderecoCidadeId)
                            : ''
                        }
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            cobrancaEnderecoCidadeId: parseInt(v) || 0,
                          })
                        }
                        disabled={
                          cidadesCobrancaLoading || !formData.cobrancaEnderecoUf
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue
                            placeholder={
                              cidadesCobrancaLoading
                                ? 'Carregando...'
                                : formData.cobrancaEnderecoUf
                                ? 'Selecione'
                                : 'Selecione UF'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 max-h-60">
                          {cidadesCobranca.map((c) => (
                            <SelectItem
                              key={c.cidade_id}
                              value={String(c.cidade_id)}
                            >
                              {c.nome_cidade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-5">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
                      <Input
                        className="h-8 text-sm"
                        placeholder="-"
                        value={formData.cobrancaEnderecoCep}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cobrancaEnderecoCep: formatCep(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Dados Comerciais */}
                <TabsContent value="comerciais" className="m-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contatos</label>
                      <Input className="h-8 text-sm" value={formData.contato1Nome} onChange={(e) => setFormData({ ...formData, contato1Nome: e.target.value })} />
                  </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Celular</label>
                      <Input className="h-8 text-sm" placeholder="( )" value={formData.contato1Celular} onChange={(e) => setFormData({ ...formData, contato1Celular: formatPhone(e.target.value) })} />
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Aniversário</label>
                      <Input type="date" className="h-8 text-sm" value={formData.contato1Aniversario} onChange={(e) => setFormData({ ...formData, contato1Aniversario: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-5">
                      <Input className="h-8 text-sm" value={formData.contato2Nome} onChange={(e) => setFormData({ ...formData, contato2Nome: e.target.value })} />
                  </div>
                    <div className="col-span-1 md:col-span-3">
                      <Input className="h-8 text-sm" placeholder="( )" value={formData.contato2Celular} onChange={(e) => setFormData({ ...formData, contato2Celular: formatPhone(e.target.value) })} />
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <Input type="date" className="h-8 text-sm" value={formData.contato2Aniversario} onChange={(e) => setFormData({ ...formData, contato2Aniversario: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mt-4">
                    <div className="col-span-1 md:col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Segmentos *</label>
                      <Select
                        value={formData.segmentoId ? String(formData.segmentoId) : ''}
                        onValueChange={(v) => setFormData({ ...formData, segmentoId: parseInt(v) || 0 })}
                        disabled={segmentosLoading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={segmentosLoading ? 'Carregando...' : 'Selecione'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {segmentos.map((segmento) => (
                            <SelectItem key={segmento.id} value={String(segmento.id)}>
                              {segmento.codigo ? `${segmento.codigo} - ${segmento.descricao}` : segmento.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Checkouts</label>
                      <Input type="number" className="h-8 text-sm text-right" value={formData.checkouts} onChange={(e) => setFormData({ ...formData, checkouts: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Dependência</label>
                      <Input type="number" className="h-8 text-sm text-right" defaultValue={0} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Rede</label>
                      <Select
                        value={formData.redeId !== undefined && formData.redeId !== null ? String(formData.redeId) : ''}
                        onValueChange={(v) => setFormData({ ...formData, redeId: parseInt(v) || 0 })}
                        disabled={redesLoading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={redesLoading ? 'Carregando...' : 'Selecione'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="0">Nenhuma</SelectItem>
                          {redes.map((rede) => (
                            <SelectItem key={rede.id} value={String(rede.id)}>
                              {rede.codigo ? `${rede.codigo} - ${rede.descricao}` : rede.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Tabela de preços *</label>
                      <Dialog open={tabelaSearchOpen && editOpen} onOpenChange={onTabelaDialogChange}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start h-8 text-sm">
                            {tabelaSummary}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Selecionar tabelas de preço</DialogTitle>
                          </DialogHeader>
                          <Input
                            placeholder="Buscar tabela..."
                            value={tabelaSearch}
                            onChange={(e) => setTabelaSearch(e.target.value)}
                            autoFocus
                          />
                          <ScrollArea className="h-64 mt-2">
                            {tabelasLoading ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">Carregando tabelas...</div>
                            ) : tabelas.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma tabela disponível</div>
                            ) : filteredTabelas.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma tabela encontrada</div>
                            ) : (
                              <div className="space-y-1">
                                {filteredTabelas.map((t) => {
                                  const tId = Number(t.id);
                                  const checked = formData.tabelaIds.includes(tId);
                                  const label = getTabelaLabel(t);
                                  return (
                                    <label
                                      key={t.id}
                                      className={cn('flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer', checked && 'bg-muted')}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) => toggleTabelaId(tId, value === true)}
                                      />
                                      <span>{label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </ScrollArea>
                          <DialogFooter>
                            <Button onClick={() => onTabelaDialogChange(false)}>Confirmar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Tabela principal *</label>
                      <Select
                        value={formData.tabelaPrincipalId ? String(formData.tabelaPrincipalId) : ''}
                        onValueChange={(v) => setFormData((prev) => ({ ...prev, tabelaPrincipalId: Number(v) }))}
                        disabled={formData.tabelaIds.length === 0}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {tabelas
                            .filter((t) => formData.tabelaIds.includes(Number(t.id)))
                            .map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>{getTabelaLabel(t)}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Representante *</label>
                      <Dialog open={repSearchOpen && editOpen} onOpenChange={setRepSearchOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start h-8 text-sm">
                            {representanteSummary}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Buscar representante</DialogTitle>
                          </DialogHeader>
                          <Input
                            placeholder="Digite nome ou código..."
                            value={repSearch}
                            onChange={(e) => setRepSearch(e.target.value)}
                            autoFocus
                          />
                          <ScrollArea className="h-64 mt-2" onScrollCapture={(e) => {
                            const el = e.currentTarget;
                            if (repHasMore && !loadingReps && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                              loadReps(false);
                            }
                          }}>
                            {loadingReps ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">Carregando representantes...</div>
                            ) : repsError ? (
                              <div className="py-6 text-center text-sm text-red-600">{repsError}</div>
                          ) : representatives.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Nenhum representante encontrado</div>
                          ) : (
                            <div className="space-y-1">
                              {representatives.map((r) => {
                                const repId = String(r.codigoRepresentante || r.id);
                                const repNome = toUpperValue(r.nome);
                                const checked = formData.representantes.some((rep) => rep.id === repId);
                                return (
                                  <label
                                    key={r.id}
                                    className={cn('flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer', checked && 'bg-muted')}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        const isChecked = value === true;
                                        setFormData((prev) => {
                                          const exists = prev.representantes.some((rep) => rep.id === repId);
                                          const nextRepresentantes = isChecked && !exists
                                            ? [...prev.representantes, { id: repId, nome: repNome }]
                                            : (!isChecked && exists
                                              ? prev.representantes.filter((rep) => rep.id !== repId)
                                              : prev.representantes);
                                          return { ...prev, representantes: nextRepresentantes };
                                        });
                                      }}
                                    />
                                    <span>{`${r.codigoRepresentante || r.id} - ${repNome}`}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          </ScrollArea>
                          <DialogFooter>
                            <Button onClick={() => setRepSearchOpen(false)}>Confirmar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de pagamento *</label>
                      <Select
                        value={String(ensurePositiveId(formData.formaPagtoId))}
                        onValueChange={(v) =>
                          setFormData({ ...formData, formaPagtoId: ensurePositiveId(v, 0) })
                        }
                        disabled={filterFormas.length === 0}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {filterFormas.map((forma) => (
                            <SelectItem key={String(forma.id)} value={String(forma.id)}>
                              {forma.codigo ? `${forma.codigo} - ${forma.descricao}` : forma.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo máximo liberado *</label>
                      <Select
                        value={formData.prazoPagtoId ? String(formData.prazoPagtoId) : ''}
                        onValueChange={(v) => {
                          const match = prazos.find((p) => String(p.id) === v);
                          setFormData({ ...formData, prazoPagtoId: match ? ensurePositiveId(match.id, 0) : 0, prazo: match ? String(match.descricao) : '' });
                        }}
                        disabled={prazosLoading || !!prazosError}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={prazosLoading ? 'Carregando...' : prazosError ? 'Erro ao carregar' : 'Selecione'} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {prazos.map((p) => (
                            <SelectItem key={`${p.id}-${p.codigo || p.descricao}`} value={String(p.id)}>
                              {p.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-6">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">% Desconto máximo na nota fiscal</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          className="h-8 text-sm text-right"
                          value={formData.descontoFinanceiroBoleto}
                          onChange={(e) => setFormData({ ...formData, descontoFinanceiroBoleto: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-sm">(%)</span>
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-6" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Crédito</label>
                      <Input
                        type="number"
                        className="h-8 text-sm text-right"
                        value={formData.credito}
                        onChange={(e) =>
                          setFormData((prev) => {
                            const credito = parseFloat(e.target.value) || 0;
                            return {
                              ...prev,
                              credito,
                              disponivel: credito - (Number(prev.aberto) || 0),
                            };
                          })
                        }
                      />
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Aberto</label>
                      <Input
                        type="number"
                        className="h-8 text-sm text-right bg-muted"
                        value={formData.aberto}
                        readOnly
                        disabled
                      />
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Disponível</label>
                      <Input
                        type="number"
                        className="h-8 text-sm text-right bg-muted"
                        value={(Number(formData.credito) || 0) - (Number(formData.aberto) || 0)}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mt-4">
                    <div className="col-span-1 md:col-span-12 flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.b2bLiberado}
                          onCheckedChange={(c) => setFormData({ ...formData, b2bLiberado: c as boolean })}
                        />
                        <label className="text-sm">Liberado venda no B2B</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Senha B2B</label>
                        <Input
                          className="h-8 text-sm w-32"
                          value={formData.b2bSenha}
                          onChange={(e) => setFormData({ ...formData, b2bSenha: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3"
                          onClick={() => setFormData((prev) => ({ ...prev, b2bSenha: generateB2bSenha() }))}
                        >
                          Gerar senha
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Tabela B2B</label>
                        <Select
                          value={formData.b2bTabelaId ? String(formData.b2bTabelaId) : ''}
                          onValueChange={(v) => setFormData({ ...formData, b2bTabelaId: Number(v) || 0 })}
                        >
                          <SelectTrigger className="h-8 text-sm w-44"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {tabelas.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {getTabelaLabel(t)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs. Comercial</label>
                      <Textarea className="min-h-[80px] text-sm" value={formData.observacaoComercial} onChange={(e) => setFormData({ ...formData, observacaoComercial: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Obs. Financeiro</label>
                      <Textarea className="min-h-[80px] text-sm" value={formData.observacaoFinanceiro} onChange={(e) => setFormData({ ...formData, observacaoFinanceiro: e.target.value })} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
          {formErrors.length > 0 && (
            <div className="text-sm text-destructive mt-2 space-y-1">
              {formErrors.map((err, index) => (
                <div key={`${err}-${index}`}>{err}</div>
              ))}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => requestCloseDialog('edit')} disabled={formLoading}>Cancelar</Button>
            <Button variant="default" onClick={submitEdit} disabled={formLoading}>{formLoading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as alterações não salvas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClientInfoModal
        open={clientInfoOpen}
        onOpenChange={setClientInfoOpen}
        clienteId={clientInfoId}
      />

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setImportRows([]); setParsedImportRows([]); setImportResult(null); } }}>
        <DialogContent className="w-[95vw] max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Importar Clientes
            </DialogTitle>
          </DialogHeader>

          {!importResult ? (
            <>
              {/* Summary */}
              {(() => {
                const toImport = parsedImportRows.filter((r) => r.action === 'importar').length;
                const toError = parsedImportRows.filter((r) => r.action === 'erro').length;
                return (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-green-600 font-medium">{toImport} a importar</span>
                    {toError > 0 && <span className="text-red-600 font-medium">{toError} com erro (ignorados)</span>}
                    <span className="text-muted-foreground text-xs self-center">
                      Chave: CNPJ/CPF — existentes serão atualizados, novos serão criados
                    </span>
                  </div>
                );
              })()}

              {/* Preview table */}
              <div className="max-h-[50vh] overflow-auto border rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium whitespace-nowrap">Ação</th>
                      <th className="px-2 py-1 text-left font-medium">#</th>
                      <th className="px-2 py-1 text-left font-medium whitespace-nowrap">CNPJ/CPF</th>
                      <th className="px-2 py-1 text-left font-medium whitespace-nowrap">Nome / Razão Social</th>
                      {importRows[0] && Object.keys(importRows[0])
                        .filter((h) => !['Cnpj_Cpf','cnpj_cpf','Nome_RazaoSocial','nome'].includes(h))
                        .map((h) => (
                          <th key={h} className="px-2 py-1 text-left font-medium whitespace-nowrap">{h}</th>
                        ))}
                      <th className="px-2 py-1 text-left font-medium">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedImportRows.map((r) => {
                      const isErr = r.action === 'erro';
                      return (
                        <tr key={r.rowIndex} className={isErr ? 'border-t bg-red-50 dark:bg-red-950/20' : 'border-t bg-green-50/30 dark:bg-green-950/10'}>
                          <td className="px-2 py-1 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${isErr ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                              {isErr ? 'Erro' : 'Importar'}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-muted-foreground">{r.rowIndex}</td>
                          <td className="px-2 py-1 font-mono whitespace-nowrap">{r.cnpj || <span className="text-red-500 italic">—</span>}</td>
                          <td className="px-2 py-1 whitespace-nowrap">{r.nome || <span className="text-red-500 italic">—</span>}</td>
                          {Object.entries(r.data)
                            .filter(([k]) => !['Cnpj_Cpf','cnpj_cpf','Nome_RazaoSocial','nome'].includes(k))
                            .map(([k, v]) => (
                              <td key={k} className="px-2 py-1 whitespace-nowrap">{String(v ?? '')}</td>
                            ))}
                          <td className={`px-2 py-1 whitespace-nowrap ${isErr ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            {r.obs || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importLoading}>Cancelar</Button>
                <Button
                  onClick={handleImport}
                  disabled={importLoading || parsedImportRows.filter((r) => r.action === 'importar').length === 0}
                >
                  {importLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {parsedImportRows.filter((r) => r.action === 'importar').length} linha(s)
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* Result summary */}
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-green-600 font-medium">Criados: {importResult.criados}</span>
                <span className="text-blue-600 font-medium">Atualizados: {importResult.atualizados}</span>
                {importResult.erros.length > 0 && (
                  <span className="text-red-600 font-medium">Erros: {importResult.erros.length}</span>
                )}
              </div>

              {/* Full result table per row */}
              {(() => {
                const backendErrMap = new Map(importResult.erros.map((e) => [e.linha, e.mensagem]));
                const rows = parsedImportRows.map((r) => {
                  if (r.action === 'erro') return { ...r, resultAction: 'erro' as const, resultObs: r.obs };
                  const beErr = backendErrMap.get(r.rowIndex);
                  if (beErr) return { ...r, resultAction: 'erro' as const, resultObs: beErr };
                  return { ...r, resultAction: 'ok' as const, resultObs: '' };
                });
                return (
                  <div className="max-h-[45vh] overflow-auto border rounded-md">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium">Status</th>
                          <th className="px-2 py-1 text-left font-medium">#</th>
                          <th className="px-2 py-1 text-left font-medium whitespace-nowrap">CNPJ/CPF</th>
                          <th className="px-2 py-1 text-left font-medium whitespace-nowrap">Nome / Razão Social</th>
                          <th className="px-2 py-1 text-left font-medium">Obs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const isErr = r.resultAction === 'erro';
                          return (
                            <tr key={r.rowIndex} className={isErr ? 'border-t bg-red-50 dark:bg-red-950/20' : 'border-t'}>
                              <td className="px-2 py-1">
                                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${isErr ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                                  {isErr ? 'Erro' : 'OK'}
                                </span>
                              </td>
                              <td className="px-2 py-1 text-muted-foreground">{r.rowIndex}</td>
                              <td className="px-2 py-1 font-mono">{r.cnpj}</td>
                              <td className="px-2 py-1">{r.nome}</td>
                              <td className={`px-2 py-1 ${isErr ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                {r.resultObs || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              <DialogFooter>
                <Button onClick={() => { setImportOpen(false); loadClients(undefined, true); }}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
