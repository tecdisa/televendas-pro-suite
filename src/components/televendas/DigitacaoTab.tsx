import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Undo, Search, Plus, Trash2, Info, DollarSign, History, Package } from 'lucide-react';
import { toast } from 'sonner';
import { metadataService, type Operacao, type Tabela, type FormaPagamento, type PrazoPagto } from '@/services/metadataService';
import { authService } from '@/services/authService';
import { clientsService, type Client } from '@/services/clientsService';
import { productsService, type Product } from '@/services/productsService';
import { representativesService, type Representative } from '@/services/representativesService';
import { formatCurrency } from '@/utils/format';
import { ordersService } from '@/services/ordersService';
import { useStore } from '@/store/useStore';
import { ProductSearchDialog } from './ProductSearchDialog';
import { ClientInfoModal } from './ClientInfoModal';
import { ClientReceivablesModal } from './ClientReceivablesModal';
import { ClientPurchasesModal } from './ClientPurchasesModal';
import { ProductBatchModal } from './ProductBatchModal';
import type { PurchaseOrder } from '@/services/purchasesService';

type OrderItem = {
  produtoId: number;
  codigoProduto?: string;
  descricao: string;
  un: string;
  estoque?: number;
  tabelaId?: string | number;
  quant: number;
  descontoPerc: number;
  descontoMaximo?: number;
  preco: number;
  total: number;
  obs?: string;
};

interface DigitacaoTabProps {
  onClose?: () => void;
  onSaveSuccess?: () => void;
}

const createEmptyFormData = () => ({
  operacao: '',
  operacaoId: '' as string | number | '',
  clienteId: 0,
  clienteNome: '',
  representanteId: '',
  representanteNome: '',
  tabela: '',
  formaPagamento: '',
  formaPagtoId: '' as string | number | '',
  prazo: '',
  prazoPagtoId: '' as string | number | '',
  boleto: '',
  rede: '',
  especial: false,
});

const createEmptyNewItem = () =>
  ({
    produtoId: 0,
    quant: 1,
    descontoPerc: 0,
    descontoMaximo: undefined,
  }) as Partial<OrderItem>;

const createEmptyObservacoes = () => ({
  cliente: '',
  pedido: '',
  nf: ''
});

const extractFormaPagtoId = (data: any) =>
  data?.formaPagtoId ??
  data?.forma_pagto_id ??
  data?.formaPagamentoId ??
  data?.forma_pagamento_id ??
  data?.forma_pagamentoId ??
  data?.forma_pagtoId ??
  data?.formaPagamento?.id ??
  data?.forma_pagamento?.id ??
  null;

const extractPrazoPagtoId = (data: any) =>
  data?.prazoPagtoId ??
  data?.prazo_pagto_id ??
  data?.prazoPagamentoId ??
  data?.prazo_pagamento_id ??
  data?.prazo_pagamentoId ??
  data?.prazo_pagtoId ??
  data?.prazoPagamento?.id ??
  data?.prazo_pagamento?.id ??
  null;

export const DigitacaoTab = ({ onClose, onSaveSuccess }: DigitacaoTabProps) => {
  const { orders, setOrders, currentOrder, setCurrentOrder } = useStore();
  const [formData, setFormData] = useState(createEmptyFormData);
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<OrderItem>>(createEmptyNewItem);
  const [observacoes, setObservacoes] = useState(createEmptyObservacoes);
  const [unitPriceDrafts, setUnitPriceDrafts] = useState<Record<number, string>>({});

  // Operações (metadata)
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [loadingOperacoes, setLoadingOperacoes] = useState(false);
  const [operacoesError, setOperacoesError] = useState<string | null>(null);

  // Tabelas (metadata)
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [loadingTabelas, setLoadingTabelas] = useState(false);
  const [tabelasError, setTabelasError] = useState<string | null>(null);
  const selectedTabela = tabelas.find((t) => String(t.id) === String(formData.tabela));
  const prazoMax = selectedTabela && typeof selectedTabela.prazoMedio === 'number' && selectedTabela.prazoMedio > 0
    ? selectedTabela.prazoMedio
    : undefined;
  const getDefaultTabelaId = () => {
    if (formData.tabela) return String(formData.tabela);
    const principal = tabelas.find((t) => t.principal);
    return principal ? String(principal.id) : undefined;
  };

  const getPreferredTabelaForItem = (item?: Partial<OrderItem>) => {
    if (item?.tabelaId != null && String(item.tabelaId).trim() !== '') {
      return String(item.tabelaId);
    }
    const selectedTabela = getDefaultTabelaId();
    return selectedTabela || '';
  };

  // Formas de pagamento (metadata)
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loadingFormas, setLoadingFormas] = useState(false);
  const [formasError, setFormasError] = useState<string | null>(null);
  
  // Prazos de pagamento (metadata)
  const [prazos, setPrazos] = useState<PrazoPagto[]>([]);
  const [loadingPrazos, setLoadingPrazos] = useState(false);
  const [prazosError, setPrazosError] = useState<string | null>(null);

  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientInfoOpen, setClientInfoOpen] = useState(false);
  const [clientReceivablesOpen, setClientReceivablesOpen] = useState(false);
  const [clientPurchasesOpen, setClientPurchasesOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState<OrderItem | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productCodeInput, setProductCodeInput] = useState('');
  const [loadingProductByCode, setLoadingProductByCode] = useState(false);
  const [newItemTabelaId, setNewItemTabelaId] = useState<string>('');
  const [newItemPreco, setNewItemPreco] = useState<number | null>(null);
  const [loadingNewItemPreco, setLoadingNewItemPreco] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientPage, setClientPage] = useState(1);
  const [clientHasMore, setClientHasMore] = useState(true);
  // Guarda ID de forma de pagamento preferida do cliente selecionado para aplicar quando as formas carregarem
  const [preferredFormaId, setPreferredFormaId] = useState<string | number | null>(null);
  const [preferredPrazoId, setPreferredPrazoId] = useState<string | number | null>(null);
  const prevOrderIdRef = useRef<number | null>(null);

  const parametrosAppMobile = useMemo(() => authService.getParametrosAppMobile(), []);
  const bloqueiaDescontoAcimaTabela = useMemo(
    () => Boolean(parametrosAppMobile?.bloqueia_desconto_acima_tabela),
    [parametrosAppMobile?.bloqueia_desconto_acima_tabela],
  );
  const normalizeMaxDesconto = useCallback(
    (val?: number) => (typeof val === 'number' && !Number.isNaN(val) ? val : undefined),
    [],
  );
  const clampDesconto = useCallback(
    (valor: number, max?: number) => {
      // Never allow negative discounts
      if (valor < 0) {
        toast.error('Desconto não pode ser negativo.');
        return 0;
      }
      if (!bloqueiaDescontoAcimaTabela) return valor;
      const maxValue = normalizeMaxDesconto(max);
      if (maxValue == null) return valor;
      if (valor > maxValue) {
        toast.error(
          `Desconto acima do limite permitido (${maxValue.toFixed(2)}%). Política da empresa bloqueia descontos acima da tabela.`,
        );
        return maxValue;
      }
      return valor;
    },
    [bloqueiaDescontoAcimaTabela, normalizeMaxDesconto],
  );

  const resetFormState = useCallback(() => {
    setFormData(createEmptyFormData());
    setItems([]);
    setNewItem(createEmptyNewItem());
    setObservacoes(createEmptyObservacoes());
    setPreferredFormaId(null);
    setPreferredPrazoId(null);
    setProductCodeInput('');
    setNewItemTabelaId('');
    setNewItemPreco(null);
  }, []);

  const handleDuplicateOrder = useCallback((purchaseOrder: PurchaseOrder) => {
    // Map purchase order items to order items format
    const mappedItems: OrderItem[] = (purchaseOrder.itens || []).map((item) => ({
      produtoId: item.produtoId,
      codigoProduto: item.codigoProduto || '',
      descricao: item.descricao,
      un: item.un || '',
      quant: item.quant,
      descontoPerc: item.descontoPerc || 0,
      descontoMaximo: normalizeMaxDesconto((item as any)?.descontoMaximo ?? (item as any)?.desconto_maximo ?? (item as any)?.desconto_max),
      preco: item.preco,
      total: item.total,
    }));
    
    setItems(mappedItems);
    toast.success(`${mappedItems.length} itens carregados do pedido ${purchaseOrder.pedido}`);
  }, []);

  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [repSearchOpen, setRepSearchOpen] = useState(false);
  const [repSearch, setRepSearch] = useState('');
  const [loadingReps, setLoadingReps] = useState(false);
  const [repsError, setRepsError] = useState<string | null>(null);
  const [repPage, setRepPage] = useState(1);
  const [repHasMore, setRepHasMore] = useState(true);

  const CLIENT_LIMIT = 100;
  const loadClients = async (reset = false) => {
    if (loadingClients) return;
    setLoadingClients(true);
    setClientsError(null);
    try {
      const nextPage = reset ? 1 : clientPage + 1;
      const data = await clientsService.find(clientSearch || undefined, nextPage, CLIENT_LIMIT);
      setClients((prev) => {
        const combined = reset ? data : [...prev, ...data];
        // dedupe by id
        const seen = new Set<number>();
        return combined.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
      });
      setClientPage(nextPage);
      setClientHasMore(Array.isArray(data) && data.length === CLIENT_LIMIT);
    } catch (e: any) {
      setClientsError(String(e));
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    // Carrega operações ao montar
    const loadOps = async () => {
      if (loadingOperacoes) return;
      setLoadingOperacoes(true);
      setOperacoesError(null);
      try {
        const ops = await metadataService.getOperacoes();
        setOperacoes(ops);
        // Preseleciona operação '001' se disponível e/ou preenche operacaoId
        if (Array.isArray(ops) && ops.length > 0) {
          setFormData((prev) => {
            // Se já temos operacaoId, tenta preencher descrição se estiver vazia
            if (prev.operacaoId) {
              const match = ops.find(
                (op) =>
                  String(op.id) === String(prev.operacaoId) ||
                  String(op.codigo) === String(prev.operacao),
              );
              if (!prev.operacao && match?.descricao) {
                return { ...prev, operacao: match.descricao };
              }
              return prev;
            }

            // Se já existe valor em operacao, tenta casar por descricao ou codigo
            if (prev.operacao) {
              const match =
                ops.find((op) => op.descricao === prev.operacao) ||
                ops.find((op) => String(op.codigo) === String(prev.operacao));
              if (match) {
                return { ...prev, operacaoId: match.id, operacao: match.descricao || prev.operacao };
              }
            }

            // Caso contrário, usa '001' ou a primeira
            const preferred =
              ops.find((op) => String(op.codigo || '').trim() === '001') ||
              ops.find((op) => String(op.id || '').trim() === '001') ||
              ops[0] ||
              null;

            if (!preferred) return prev;
            return {
              ...prev,
              operacao: preferred.descricao || preferred.codigo,
              operacaoId: preferred.id,
            };
          });
        }
      } catch (e: any) {
        setOperacoesError(String(e));
      } finally {
        setLoadingOperacoes(false);
      }
    };
    loadOps();
  }, []);

  // Se veio um pedido para edição, busca detalhes via API e preenche o formulário e itens
  useEffect(() => {
    if (!currentOrder) return;
    let active = true;
    const orderId = currentOrder.id;
    const fill = async () => {
      try {
        const detail = await ordersService.getById(orderId);
        if (!active) return;
        const detailFormaId = extractFormaPagtoId(detail);
        const detailPrazoId = extractPrazoPagtoId(detail);
        setFormData((prev) => ({
          ...prev,
          operacao: detail.operacao || detail.operacaoDescricao || detail.operacaoCodigo || prev.operacao,
          operacaoId: detail.operacaoId ?? prev.operacaoId ?? '',
          clienteId: detail.clienteId || 0,
          clienteNome: detail.clienteNome || '',
          representanteId: detail.representanteId ?? detail.representanteCodigo ?? '',
          representanteNome: detail.representanteNome || '',
          tabela: detail.tabela || prev.tabela || '',
          formaPagamento: detail.formaPagamento || prev.formaPagamento || '',
          formaPagtoId: detailFormaId ?? prev.formaPagtoId ?? '',
          prazo: detail.prazo || prev.prazo || '',
          prazoPagtoId: detailPrazoId ?? prev.prazoPagtoId ?? '',
          boleto: '',
          rede: detail.rede || '',
        }));
        if (detailFormaId != null) setPreferredFormaId(detailFormaId);
        if (detailPrazoId != null) setPreferredPrazoId(detailPrazoId);
        const detailItens = Array.isArray(detail.itens) ? detail.itens : [];
        const fallbackItens = Array.isArray(currentOrder.itens) ? currentOrder.itens : [];
        const itensSource = detailItens.length > 0 ? detailItens : fallbackItens;
        const mapped = itensSource.map((it: any) => ({
          produtoId: it.produtoId,
          codigoProduto:
            it.codigoProduto ??
            it.codigo_produto ??
            it.produto_codigo ??
            it.produtoCod ??
            it.produto_cod ??
            '',
          descricao: it.descricao,
          un: it.un,
          quant: it.quant,
          descontoPerc: Number(it.descontoPerc ?? 0) || 0,
          preco: it.preco,
          estoque: typeof it.estoque === 'number' ? it.estoque : undefined,
          total: it.total,
          obs: it.obs,
          descontoMaximo: normalizeMaxDesconto((it as any)?.descontoMaximo ?? (it as any)?.desconto_maximo ?? (it as any)?.desconto_max),
          tabelaId:
            it.tabela_preco_id ??
            it.tabela_precoId ??
            it.tabela_preco ??
            it.tabelaPrecoId ??
            it.tabelaPreco_id ??
            it.tabelaId ??
            it.tabela_id ??
            it.tabela,
        })) as OrderItem[];
        setItems(mapped);
        setObservacoes({
          cliente: detail.observacaoCliente || '',
          pedido: detail.observacaoPedido || '',
          nf: detail.observacaoNF || '',
        });
      } catch {
        if (!active) return;
        // Fallback: preenche com o que já temos
        const fallbackFormaId = extractFormaPagtoId(currentOrder);
        const fallbackPrazoId = extractPrazoPagtoId(currentOrder);
        setFormData((prev) => ({
          ...prev,
          operacao: currentOrder.operacao || prev.operacao,
          clienteId: currentOrder.clienteId || 0,
          clienteNome: currentOrder.clienteNome || '',
          representanteId: currentOrder.representanteId ?? currentOrder.representanteCodigo ?? '',
          representanteNome: currentOrder.representanteNome || '',
          tabela: currentOrder.tabela || prev.tabela || '',
          formaPagamento: currentOrder.formaPagamento || prev.formaPagamento || '',
          formaPagtoId: fallbackFormaId ?? prev.formaPagtoId ?? '',
          prazo: currentOrder.prazo || prev.prazo || '',
          prazoPagtoId: fallbackPrazoId ?? prev.prazoPagtoId ?? '',
          boleto: '',
          rede: currentOrder.rede || '',
        }));
        if (fallbackFormaId != null) setPreferredFormaId(fallbackFormaId);
        if (fallbackPrazoId != null) setPreferredPrazoId(fallbackPrazoId);
        const mapped = (currentOrder.itens || []).map((it: any) => ({
          produtoId: it.produtoId,
          codigoProduto:
            it.codigoProduto ??
            it.codigo_produto ??
            it.produto_codigo ??
            it.produtoCod ??
            it.produto_cod ??
            '',
          descricao: it.descricao,
          un: it.un,
          quant: it.quant,
          descontoPerc: Number(it.descontoPerc ?? 0) || 0,
          preco: it.preco,
          estoque: typeof (it as any)?.estoque === 'number' ? (it as any).estoque : undefined,
          total: it.total,
          obs: it.obs,
          descontoMaximo: normalizeMaxDesconto((it as any)?.descontoMaximo ?? (it as any)?.desconto_maximo ?? (it as any)?.desconto_max),
          tabelaId:
            (it as any)?.tabela_preco_id ??
            (it as any)?.tabela_precoId ??
            (it as any)?.tabela_preco ??
            (it as any)?.tabelaPrecoId ??
            (it as any)?.tabelaPreco_id ??
            (it as any)?.tabelaId ??
            (it as any)?.tabela_id ??
            (it as any)?.tabela,
        })) as OrderItem[];
        setItems(mapped);
        setObservacoes({
          cliente: currentOrder.observacaoCliente || '',
          pedido: currentOrder.observacaoPedido || '',
          nf: currentOrder.observacaoNF || '',
        });
      }
    };
    fill();
    return () => {
      active = false;
    };
  }, [currentOrder]);

  useEffect(() => {
    const prevId = prevOrderIdRef.current;
    if (!currentOrder && prevId !== null) {
      resetFormState();
    }
    prevOrderIdRef.current = currentOrder?.id ?? null;
  }, [currentOrder, resetFormState]);

  // Carrega formas de pagamento ao montar
  useEffect(() => {
    const loadFormas = async () => {
      if (loadingFormas) return;
      setLoadingFormas(true);
      setFormasError(null);
      try {
        const fps = await metadataService.getFormasPagamento();
        setFormas(fps);
      } catch (e: any) {
        setFormasError(String(e));
      } finally {
        setLoadingFormas(false);
      }
    };
    loadFormas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega prazos ao montar
  useEffect(() => {
    const loadPrazos = async () => {
      if (loadingPrazos) return;
      setLoadingPrazos(true);
      setPrazosError(null);
      try {
        const ps = await metadataService.getPrazos();
        setPrazos(ps);
      } catch (e: any) {
        setPrazosError(String(e));
      } finally {
        setLoadingPrazos(false);
      }
    };
    loadPrazos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega tabelas ao montar
  useEffect(() => {
    // Carrega tabelas de preço quando um cliente é selecionado
    const loadTabelasCliente = async () => {
      if (!formData.clienteId) {
        setTabelas([]);
        setFormData((prev) => ({ ...prev, tabela: '' }));
        return;
      }
      if (loadingTabelas) return;
      setLoadingTabelas(true);
      setTabelasError(null);
      try {
        const tabs = await metadataService.getTabelasByCliente(formData.clienteId);
        setTabelas(tabs);
        const principal = tabs.find((t) => t.principal);
        setFormData((prev) => {
          if (prev.tabela) return prev;
          return { ...prev, tabela: principal ? String(principal.id) : '' };
        });
      } catch (e: any) {
        setTabelasError(String(e));
        setTabelas([]);
        setFormData((prev) => ({ ...prev, tabela: '' }));
      } finally {
        setLoadingTabelas(false);
      }
    };
    loadTabelasCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.clienteId]);

  // Ao trocar a tabela, garante que prazo atual respeita o máximo
  useEffect(() => {
    if (typeof prazoMax !== 'number') return;
    const n = Math.floor(Number(formData.prazo) || 0);
    if (n > prazoMax) {
      setFormData((prev) => ({ ...prev, prazo: String(prazoMax) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tabela, prazoMax]);

  useEffect(() => {
    if (!clientSearchOpen) return;
    // initial load when opening dialog
    loadClients(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearchOpen]);

  useEffect(() => {
    if (!clientSearchOpen) return;
    const t = setTimeout(() => {
      loadClients(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearch]);

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
        const seen = new Set<string>();
        return combined.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
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

  const filteredClients = clients; // server already filters by q

  // Cache de tabelas por produto para dropdown por item
  const [itemTabelas, setItemTabelas] = useState<Record<number, Tabela[]>>({});
  const [itemTabelasLoading, setItemTabelasLoading] = useState<Record<number, boolean>>({});
  const [itemTabelasError, setItemTabelasError] = useState<Record<number, string | null>>({});

  const ensureItemTabelas = async (productId: number): Promise<Tabela[]> => {
    if (!productId) return [];
    if (itemTabelas[productId]) return itemTabelas[productId];
    if (itemTabelasLoading[productId]) return itemTabelas[productId] || [];
    setItemTabelasLoading((prev) => ({ ...prev, [productId]: true }));
    setItemTabelasError((prev) => ({ ...prev, [productId]: null }));
    try {
      const tabs = await metadataService.getTabelasByProduto(productId);
      setItemTabelas((prev) => ({ ...prev, [productId]: tabs }));
      // Define padrão nos itens do mesmo produto se ainda não houver seleção
      setItems((prev) => prev.map((it) => {
        if (it.produtoId !== productId || it.tabelaId) return it;
        const preferId = getDefaultTabelaId();
        const prefer = tabs.find((t) => String(t.id) === String(preferId));
        const principal = tabs.find((t) => t.principal);
        const chosen = prefer || principal || tabs[0];
        return chosen ? { ...it, tabelaId: chosen.id } : it;
      }));
      return tabs;
    } catch (e: any) {
      setItemTabelasError((prev) => ({ ...prev, [productId]: String(e) }));
      return [];
    } finally {
      setItemTabelasLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };


  // Garante cache de tabelas por produto para todos itens atuais
  useEffect(() => {
    items.forEach((it) => {
      if (it?.produtoId) ensureItemTabelas(it.produtoId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Preenche itens carregados (edição) com tabela do pedido se backend não enviou
  useEffect(() => {
    if (!items || items.length === 0) return;
    const selectedTabela = getDefaultTabelaId();
    if (!selectedTabela) return;
    setItems((prev) =>
      prev.map((p) => {
        if (p.tabelaId != null && String(p.tabelaId).trim() !== '') return p;
        return { ...p, tabelaId: selectedTabela };
      })
    );
  }, [items.length, formData.tabela]);

  const filteredRepresentatives = representatives; // server already filters by q

  const handleSelectClient = (client: Client) => {
    const firstRep = Array.isArray(client.representantes) ? client.representantes[0] : null;
    const repIdFromClient = client.representanteId ?? client.representanteCodigo ?? firstRep?.id ?? firstRep?.codigoRepresentante ?? '';
    const repNomeFromClient = client.representanteNome ?? firstRep?.nome ?? '';
    setFormData((prev) => ({
      ...prev,
      clienteId: client.id,
      clienteNome: client.nome,
      representanteId: repIdFromClient || prev.representanteId || '',
      representanteNome: repNomeFromClient || prev.representanteNome || '',
      tabela: '',
      formaPagamento: '',
      formaPagtoId: client.formaPagtoId ?? '',
      prazo: '',
      prazoPagtoId: client.prazoPagtoId ?? '',
    }));
    // Se o cliente não trouxe representante, tenta buscar detalhes para preencher automaticamente
    if (!repIdFromClient) {
      clientsService.getDetail(client.id).then((detail) => {
        if (!detail) return;
        const repsArr = Array.isArray(detail?.representantes) ? detail.representantes : [];
        const firstRepDetail = repsArr[0] || null;
        const repObj = detail?.representante && typeof detail.representante === 'object' ? detail.representante : null;
        const repId =
          firstRepDetail?.codigoRepresentante ??
          firstRepDetail?.codigo_representante ??
          firstRepDetail?.codigo ??
          firstRepDetail?.id ??
          detail?.representanteCodigo ??
          detail?.representante_codigo ??
          detail?.codigo_representante ??
          detail?.codigoRepresentante ??
          detail?.representanteId ??
          detail?.representante_id ??
          repObj?.codigo ??
          repObj?.id ??
          null;
        const repNome = detail?.representanteNome ?? firstRepDetail?.nome ?? repObj?.nome ?? '';
        if (!repId && !repNome) return;
        setFormData((prev) => {
          // Garante que o cliente ainda é o selecionado
          if (prev.clienteId !== client.id) return prev;
          return {
            ...prev,
            representanteId: repId ? String(repId).trim() : prev.representanteId,
            representanteNome: repNome ? String(repNome).trim() : prev.representanteNome,
          };
        });
      }).catch(() => {});
    }
    // Marca forma preferida e tenta aplicar imediatamente se já temos a lista
    const pf = client.formaPagtoId ?? null;
    setPreferredFormaId(pf);
    if (pf != null && formas && formas.length > 0) {
      const match = formas.find((f) => String(f.id) === String(pf));
      if (match) {
        setFormData((prev) => ({ ...prev, formaPagamento: match.descricao }));
      }
    }
    // Marca prazo preferido e tenta aplicar imediatamente se já temos a lista
    const pp = client.prazoPagtoId ?? null;
    setPreferredPrazoId(pp);
    if (pp != null && prazos && prazos.length > 0) {
      const matchPrazo = prazos.find((p) => String(p.id) === String(pp));
      if (matchPrazo) {
        setFormData((prev) => ({ ...prev, prazo: matchPrazo.descricao }));
      }
    }
    setClientSearchOpen(false);
    setClientSearch('');
  };

  // Aplica forma de pagamento preferida quando a lista de formas estiver carregada
  useEffect(() => {
    if (preferredFormaId == null) return;
    if (!formas || formas.length === 0) return;
    const match = formas.find((f) => String(f.id) === String(preferredFormaId));
    if (match) {
      setFormData((prev) => ({
        ...prev,
        formaPagamento: match.descricao,
        formaPagtoId: match.id,
      }));
      setPreferredFormaId(null);
    }
  }, [formas, preferredFormaId]);

  // Se o backend não enviou formaPagtoId, tenta inferir pelo nome/código quando as formas carregarem
  useEffect(() => {
    if (formData.formaPagtoId) return;
    if (!formData.formaPagamento) return;
    if (!formas || formas.length === 0) return;
    const match =
      formas.find((f) => f.descricao === formData.formaPagamento) ||
      formas.find((f) => String(f.codigo || '').trim() === String(formData.formaPagamento).trim());
    if (match) {
      setFormData((prev) => ({
        ...prev,
        formaPagamento: match.descricao,
        formaPagtoId: match.id,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formas, formData.formaPagamento]);

  // Aplica prazo preferido quando a lista de prazos estiver carregada
  useEffect(() => {
    if (preferredPrazoId == null) return;
    if (!prazos || prazos.length === 0) return;
    const match = prazos.find((p) => String(p.id) === String(preferredPrazoId));
    if (match) {
      setFormData((prev) => ({
        ...prev,
        prazo: match.descricao,
        prazoPagtoId: match.id,
      }));
      setPreferredPrazoId(null);
    }
  }, [prazos, preferredPrazoId]);

  // Se o backend não enviou prazoPagtoId, tenta inferir pelo nome/código quando os prazos carregarem
  useEffect(() => {
    if (formData.prazoPagtoId) return;
    if (!formData.prazo) return;
    if (!prazos || prazos.length === 0) return;
    const match =
      prazos.find((p) => p.descricao === formData.prazo) ||
      prazos.find((p) => String(p.codigo || '').trim() === String(formData.prazo).trim());
    if (match) {
      setFormData((prev) => ({
        ...prev,
        prazo: match.descricao,
        prazoPagtoId: match.id,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prazos, formData.prazo]);

  const handleSelectProduct = (product: Product) => {
    const maxDesconto = normalizeMaxDesconto(product.descontoMaximo);
    const descontoPerc = clampDesconto(newItem.descontoPerc || 0, maxDesconto);
    setNewItem({
      ...newItem,
      produtoId: product.id,
      codigoProduto: product.codigoProduto ?? '',
      descricao: product.descricao,
      un: product.un,
      preco: product.preco,
      estoque: typeof product.estoque === 'number' ? product.estoque : undefined,
      descontoMaximo: maxDesconto,
      descontoPerc,
    });
    setNewItemPreco(product.preco);
    // Set default tabela if available
    const defaultTabela = getDefaultTabelaId();
    if (defaultTabela) {
      setNewItemTabelaId(defaultTabela);
    }
    setProductSearchOpen(false);
  };

  // Fetch price when tabela changes for new item
  const handleNewItemTabelaChange = async (tabelaId: string) => {
    setNewItemTabelaId(tabelaId);
    if (!newItem.produtoId || !tabelaId) {
      setNewItemPreco(newItem.preco ?? null);
      return;
    }
    setLoadingNewItemPreco(true);
    try {
      const preco = await productsService.getPrecoByTabela(newItem.produtoId, Number(tabelaId));
      setNewItemPreco(preco);
      setNewItem(prev => ({ ...prev, preco, tabelaId }));
    } catch (e) {
      console.error('Erro ao buscar preço:', e);
      setNewItemPreco(newItem.preco ?? null);
    } finally {
      setLoadingNewItemPreco(false);
    }
  };

  const calculateItemTotal = (item: Partial<OrderItem>) => {
    if (!item.preco || !item.quant) return 0;
    const desconto = (item.descontoPerc || 0) / 100;
    return item.preco * item.quant * (1 - desconto);
  };

  const calculateUnitPrice = (item: Partial<OrderItem>) => {
    const base = Number(item.preco) || 0;
    if (!base) return 0;
    const desconto = Number(item.descontoPerc) || 0;
    const unit = base * (1 - desconto / 100);
    const rounded = Math.round(unit * 100) / 100;
    return Number.isFinite(rounded) ? rounded : 0;
  };

  const calculateDescontoFromUnitPrice = (base: number, unit: number) => {
    if (!base || !Number.isFinite(base) || base <= 0) return 0;
    const perc = ((base - unit) / base) * 100;
    return Number.isFinite(perc) ? perc : 0;
  };

  const formatMoneyInput = (value: number) => {
    const num = Number.isFinite(value) ? value : 0;
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseMoneyInput = (value: string) => {
    const cleaned = value.replace(/[^\d,.-]/g, '');
    if (!cleaned) return 0;
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    const sepIndex = Math.max(lastComma, lastDot);
    if (sepIndex >= 0) {
      const intPart = cleaned.slice(0, sepIndex).replace(/[^\d-]/g, '');
      const fracPart = cleaned.slice(sepIndex + 1).replace(/[^\d]/g, '');
      const normalized = `${intPart || '0'}.${fracPart}`;
      return Number(normalized) || 0;
    }
    const normalized = cleaned.replace(/[^\d-]/g, '');
    return Number(normalized) || 0;
  };

  const selectZeroValue = (input: HTMLInputElement) => {
    if (Number(input.value) === 0) {
      input.select();
    }
  };

  const handleAddItemWithProduct = async (productToAdd?: Partial<OrderItem>) => {
    const itemToAdd = productToAdd || newItem;
    
    if (!formData.operacao || !formData.clienteId || !formData.representanteId) {
      toast.error('Preencha operação, cliente e representante antes de adicionar itens');
      return;
    }
    
    if (!itemToAdd.produtoId || !itemToAdd.quant) {
      toast.error('Preencha produto e quantidade');
      return;
    }

    // Garante que a descrição do produto seja carregada se estiver vazia
    if (!itemToAdd.descricao && itemToAdd.produtoId) {
      try {
        const products = await productsService.search({ codigoProduto: itemToAdd.codigoProduto || String(itemToAdd.produtoId) }, 1, 1);
        if (products.length > 0) {
          itemToAdd.descricao = products[0].descricao;
          itemToAdd.un = itemToAdd.un || products[0].un;
        }
      } catch (e) {
        console.error('Erro ao buscar descrição do produto:', e);
      }
    }

    if (!itemToAdd.descricao) {
      toast.error('Não foi possível identificar o produto. Selecione-o pela busca.');
      return;
    }

    const normalizeCodigo = (val?: string | null) => String(val ?? '').trim();
    const newCodigoNorm = normalizeCodigo(itemToAdd.codigoProduto);

    const produtoId = typeof itemToAdd.produtoId === 'number' ? itemToAdd.produtoId : Number(itemToAdd.produtoId);
    const quant = Math.max(0, Number(itemToAdd.quant) || 0);
    const descricao = itemToAdd.descricao || '';
    const un = itemToAdd.un || '';
    const maxDesconto = normalizeMaxDesconto(itemToAdd.descontoMaximo);
    const descontoPerc = clampDesconto(itemToAdd.descontoPerc || 0, maxDesconto);
    const preco = itemToAdd.preco || 0;
    const obs = itemToAdd.obs;
    const tabelaSelecionada = getPreferredTabelaForItem(itemToAdd);
    const tabs = await ensureItemTabelas(produtoId);
    if (tabs && tabelaSelecionada && String(tabelaSelecionada).trim() !== '') {
      const hasTabela = tabs.some((t) => String(t.id) === String(tabelaSelecionada));
      if (!hasTabela) {
        toast.error('Produto não existe na tabela selecionada. Selecione outra tabela.');
        return;
      }
    }
    if (tabs && tabs.length === 0) {
      toast.error('Produto não possui tabela de preço disponível. Selecione outra tabela ou produto.');
      return;
    }

    const findSameProductIndex = (list: OrderItem[]) =>
      list.findIndex((it) => {
        const sameId = produtoId && Number(it.produtoId) === produtoId;
        const sameCodigo =
          newCodigoNorm &&
          normalizeCodigo(it.codigoProduto) === newCodigoNorm;
        return sameId || sameCodigo;
      });

    const existingIndexForStock = findSameProductIndex(items);
    const existingQtd = existingIndexForStock !== -1 ? items[existingIndexForStock].quant || 0 : 0;
    const estoqueDisponivel = itemToAdd.estoque ?? (existingIndexForStock !== -1 ? items[existingIndexForStock].estoque : undefined);
    if (estoqueDisponivel != null && quant + existingQtd > estoqueDisponivel) {
      toast.warning('Quantidade solicitada excede o estoque disponível');
    }

    const resolvedTabelaId = (() => {
      if (tabs && tabs.length > 0) {
        const selectedStr = String(tabelaSelecionada || '').trim();
        if (selectedStr && tabs.some((t) => String(t.id) === selectedStr)) return selectedStr;
        const defaultTabela = getDefaultTabelaId();
        if (defaultTabela && tabs.some((t) => String(t.id) === String(defaultTabela))) {
          return String(defaultTabela);
        }
        const principal = tabs.find((t) => t.principal);
        if (principal) return String(principal.id);
        return String(tabs[0].id);
      }
      return String(tabelaSelecionada || '').trim();
    })();

    let precoTabela = preco;
    if (resolvedTabelaId) {
      try {
        precoTabela = await productsService.getPrecoByTabela(
          produtoId,
          Number(resolvedTabelaId),
        );
      } catch (e: any) {
        toast.error(
          String(e) ||
            'Não foi possível buscar o preço para a tabela selecionada',
        );
      }
    }

    const existingIndex = findSameProductIndex(items);
    if (existingIndex === -1) {
      setItems((prev) => {
        if (!produtoId || !quant) return prev;
        const base: OrderItem = {
          produtoId,
          codigoProduto: itemToAdd.codigoProduto ?? '',
          descricao,
          un,
          estoque: itemToAdd.estoque,
          tabelaId: resolvedTabelaId || tabelaSelecionada,
          quant,
          descontoPerc,
          preco: precoTabela,
          descontoMaximo: maxDesconto,
          total: 0,
          obs,
        };
        const total = calculateItemTotal(base);
        const withTotal = { ...base, total };
        return [...prev, withTotal];
      });
    } else {
      const currentItem = items[existingIndex];
      const tabelaSelecionadaStr = tabelaSelecionada ? String(tabelaSelecionada) : '';
      const currentTabelaStr = currentItem.tabelaId != null ? String(currentItem.tabelaId) : '';
      const resolvedTabelaStr = resolvedTabelaId ? String(resolvedTabelaId) : '';
      let tabelaToApply = currentTabelaStr || tabelaSelecionadaStr || resolvedTabelaStr;
      let tabelaChanged = false;
      if (resolvedTabelaStr && resolvedTabelaStr !== currentTabelaStr) {
        tabelaToApply = resolvedTabelaStr;
        tabelaChanged = true;
      }

      let precoToApply = currentItem.preco;
      if (tabelaChanged && tabelaToApply) {
        try {
          precoToApply = await productsService.getPrecoByTabela(
            produtoId,
            Number(tabelaToApply),
          );
        } catch (e: any) {
          toast.error(
            String(e) ||
              'Não foi possível atualizar o preço para a tabela selecionada',
          );
        }
      }

      setItems((prev) => {
        const matchIndex = findSameProductIndex(prev);
        if (matchIndex === -1) return prev;
        const current = prev[matchIndex];
        const mergedQuant = (current.quant || 0) + quant;
        const codigoProduto = current.codigoProduto || itemToAdd.codigoProduto || '';
        const merged: OrderItem = {
          ...current,
          quant: mergedQuant,
          tabelaId: tabelaToApply || current.tabelaId,
          preco: tabelaChanged ? precoToApply : current.preco,
          codigoProduto,
          descricao: current.descricao || descricao,
          un: current.un || un,
          estoque: current.estoque ?? itemToAdd.estoque,
          descontoMaximo: current.descontoMaximo ?? maxDesconto,
        };
        merged.descontoPerc = clampDesconto(merged.descontoPerc, merged.descontoMaximo);
        const total = calculateItemTotal(merged);
        const next = [...prev];
        next[matchIndex] = { ...merged, total };
        return next;
      });
    }

    if (typeof itemToAdd.produtoId === 'number' && itemToAdd.produtoId > 0) {
      ensureItemTabelas(itemToAdd.produtoId);
    }
    setNewItem({ produtoId: 0, quant: 1, descontoPerc: 0, descontoMaximo: undefined });
    setProductCodeInput('');
    setNewItemTabelaId('');
    setNewItemPreco(null);
  };

  const handleAddItem = async () => {
    // Se tiver código digitado manualmente mas nenhum produto selecionado, busca pelo código
    if (productCodeInput.trim() && !newItem.produtoId) {
      if (!formData.clienteId) {
        toast.error('Selecione um cliente antes de adicionar itens');
        return;
      }
      setLoadingProductByCode(true);
      try {
        const products = await productsService.search({ codigoProduto: productCodeInput.trim() }, 1, 1);
        if (products.length === 0) {
          toast.error('Produto não encontrado com este código');
          setLoadingProductByCode(false);
          return;
        }
        const product = products[0];
        // Use the selected tabela if available, otherwise get the price for the default tabela
        let precoFinal = product.preco;
        const tabelaToUse = newItemTabelaId || getDefaultTabelaId();
        if (tabelaToUse) {
          try {
            precoFinal = await productsService.getPrecoByTabela(product.id, Number(tabelaToUse));
          } catch {
            precoFinal = product.preco;
          }
        }
        const itemToAdd: Partial<OrderItem> = {
          produtoId: product.id,
          codigoProduto: product.codigoProduto ?? '',
          descricao: product.descricao,
          un: product.un,
          preco: precoFinal,
          tabelaId: tabelaToUse,
          estoque: typeof product.estoque === 'number' ? product.estoque : undefined,
          quant: newItem.quant || 1,
          descontoPerc: newItem.descontoPerc || 0,
          descontoMaximo: normalizeMaxDesconto(product.descontoMaximo),
        };
        setLoadingProductByCode(false);
        await handleAddItemWithProduct(itemToAdd);
        return;
      } catch (e: any) {
        toast.error(e?.message || 'Erro ao buscar produto');
        setLoadingProductByCode(false);
        return;
      }
    }
    
    // Se já tem produto selecionado, adiciona normalmente
    await handleAddItemWithProduct();
  };

  const handleUpdateItem = (index: number, patch: Partial<OrderItem>) => {
    setItems((prev) => {
      const updated = [...prev];
      const currentBase = { ...updated[index] } as OrderItem;
      const maxDesconto = normalizeMaxDesconto(
        patch.descontoMaximo ?? currentBase.descontoMaximo,
      );
      const descontoPerc =
        patch.descontoPerc != null
          ? clampDesconto(patch.descontoPerc, maxDesconto)
          : currentBase.descontoPerc;
      const current = {
        ...currentBase,
        ...patch,
        descontoPerc,
        descontoMaximo: maxDesconto ?? currentBase.descontoMaximo,
      } as OrderItem;
      if (current.estoque != null && current.quant > current.estoque) {
        toast.warning('Quantidade solicitada excede o estoque disponível');
      }
      const total = calculateItemTotal(current);
      updated[index] = { ...current, total };
      return updated;
    });
  };

  const handleUpdateItemUnitPrice = (index: number, unitPrice: number) => {
    const current = items[index];
    if (!current) return;
    const base = Number(current.preco) || 0;
    if (!base) {
      handleUpdateItem(index, { preco: unitPrice, descontoPerc: 0 });
      return;
    }
    const descontoPerc = calculateDescontoFromUnitPrice(base, unitPrice);
    handleUpdateItem(index, { descontoPerc });
  };

  const updateUnitPriceDraft = (index: number, value: string) => {
    setUnitPriceDrafts((prev) => ({ ...prev, [index]: value }));
  };

  const clearUnitPriceDraft = (index: number) => {
    setUnitPriceDrafts((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleChangeItemTabela = async (index: number, tabelaId: string) => {
    const current = items[index];
    // Atualiza primeiro a tabela selecionada no item
    handleUpdateItem(index, { tabelaId });

    if (!current || !current.produtoId) return;
    const tabelaNum = Number(tabelaId);
    if (!tabelaNum) return;

    try {
      const novoPreco = await productsService.getPrecoByTabela(
        current.produtoId,
        tabelaNum,
      );
      handleUpdateItem(index, { preco: novoPreco });
    } catch (e: any) {
      toast.error(
        String(e) ||
          'Não foi possível atualizar o preço para a tabela selecionada',
      );
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = items.reduce((acc, item) => {
    const bruto = (item.preco || 0) * (item.quant || 0);
    const desconto = bruto * ((item.descontoPerc || 0) / 100);
    return {
      bruto: acc.bruto + bruto,
      descontos: acc.descontos + desconto,
      liquido: acc.liquido + item.total
    };
  }, { bruto: 0, descontos: 0, liquido: 0 });

  const handleSave = async () => {
    if (!formData.operacao || !formData.clienteId || !formData.representanteId || items.length === 0) {
      toast.error('Preencha operação, cliente, representante e adicione pelo menos um item');
      return;
    }
    // Valida prazo máximo conforme a tabela selecionada
    const prazoNum = Math.floor(Number(formData.prazo) || 0);
    if (typeof prazoMax === 'number' && prazoNum > prazoMax) {
      toast.error(`Prazo não pode exceder ${prazoMax} dias para a tabela selecionada`);
      return;
    }

    const order = {
      data: new Date().toISOString().split('T')[0],
      operacao: formData.operacao,
      operacaoId: formData.operacaoId ? Number(formData.operacaoId) || undefined : undefined,
      clienteId: formData.clienteId,
      clienteNome: formData.clienteNome,
      representanteId: formData.representanteId,
      representanteNome: formData.representanteNome,
      situacao: 'Pendentes',
      especial: formData.especial,
      tabela: formData.tabela,
      formaPagamento: formData.formaPagamento,
      formaPagtoId: formData.formaPagtoId ? Number(formData.formaPagtoId) || undefined : undefined,
      prazo: formData.prazo,
      prazoPagtoId: formData.prazoPagtoId ? Number(formData.prazoPagtoId) || undefined : undefined,
      boleto: false,
      rede: formData.rede,
      valor: totals.liquido,
      itens: items.map((item, idx) => ({
        produtoId: item.produtoId,
        descricao: item.descricao,
        av: 1,
        un: item.un,
        c: 1,
        quant: item.quant,
        descontoPerc: item.descontoPerc,
        preco: item.preco,
        liquido: item.quant ? (item.total / item.quant) : 0,
        total: item.total,
        obs: item.obs,
        // campos auxiliares para o serviço montar o payload do backend
        tabela_preco_id: item.tabelaId ?? (formData.tabela ? Number(formData.tabela) : undefined),
        valor_bruto_calc: (item.preco || 0) * (item.quant || 0),
      })),
      totais: {
        bruto: totals.bruto,
        descontos: totals.descontos,
        descontosPerc: totals.bruto > 0 ? (totals.descontos / totals.bruto) * 100 : 0,
        icmsRepasse: 0,
        liquido: totals.liquido
      },
      observacoes
    };

    try {
      let saved;
      if (currentOrder && currentOrder.id) {
        // Atualiza (mock possui update; backend pode não ter ainda)
        saved = await ordersService.update(currentOrder.id, order as any);
        // Atualiza array local
        setOrders(orders.map(o => (o.id === currentOrder.id ? { ...(o as any), ...saved } : o)) as any);
        toast.success(`Pedido ${currentOrder.id} atualizado com sucesso!`);
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } else {
        saved = await ordersService.create(order as any);
        setOrders([saved, ...orders]);
        toast.success(`Pedido ${saved.id} criado com sucesso!`);
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      }
      
      // Reset form
      resetFormState();
      setCurrentOrder(null);
    } catch (error) {
      toast.error('Erro ao criar pedido');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dados do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Operação *</label>
              <Select
                value={formData.operacao}
                onValueChange={(v) => {
                  const match =
                    operacoes.find((op) => op.descricao === v) ||
                    operacoes.find(
                      (op) => String(op.codigo || '').trim() === String(v).trim(),
                    );
                  setFormData({
                    ...formData,
                    operacao: v,
                    operacaoId: match ? match.id : '',
                  });
                }}
                disabled={loadingOperacoes || !!operacoesError}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingOperacoes ? 'Carregando...' : operacoesError ? 'Erro ao carregar' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {operacoes.filter((op) => String(op.descricao || '').trim().length > 0).map((op) => (
                    <SelectItem key={`${op.id}-${op.codigo}`} value={op.descricao}>
                      {op.codigo ? `${op.codigo} - ${op.descricao}` : op.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cliente *</label>
              <div className="flex gap-1">
                <Dialog open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start min-w-0 overflow-hidden">
                      <Search className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate">{formData.clienteNome || 'Buscar cliente'}</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Buscar Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input 
                        placeholder="Digite nome ou código..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        autoFocus
                      />
                      <div className="max-h-96 overflow-auto" onScroll={(e) => {
                        const el = e.currentTarget;
                        if (clientHasMore && !loadingClients && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                          loadClients(false);
                        }
                      }}>
                        {loadingClients ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">Carregando clientes...</div>
                        ) : clientsError ? (
                          <div className="py-6 text-center text-sm text-red-600">{clientsError}</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Cidade</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredClients.map((client) => (
                                <TableRow
                                  key={client.id}
                                  className="cursor-pointer"
                                  onClick={() => handleSelectClient(client)}
                                >
                                  <TableCell>{client.codigoCliente ?? ''}</TableCell>
                                  <TableCell>{client.nome}</TableCell>
                                  <TableCell>{client.cidade}</TableCell>
                                </TableRow>
                              ))}
                              {filteredClients.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                                    Nenhum cliente encontrado
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setClientInfoOpen(true)}
                  disabled={!formData.clienteId}
                  title="Informações do cliente"
                >
                  <Info className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setClientReceivablesOpen(true)}
                  disabled={!formData.clienteId}
                  title="Contas a Receber"
                >
                  <DollarSign className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setClientPurchasesOpen(true)}
                  disabled={!formData.clienteId}
                  title="Últimas Compras"
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Representante *</label>
              <Dialog open={repSearchOpen} onOpenChange={setRepSearchOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="h-4 w-4 mr-2" />
                    {formData.representanteNome || 'Buscar representante'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Buscar Representante</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Digite nome ou código..."
                      value={repSearch}
                      onChange={(e) => setRepSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="max-h-96 overflow-auto" onScroll={(e) => {
                      const el = e.currentTarget;
                      if (repHasMore && !loadingReps && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                        loadReps(false);
                      }
                    }}>
                      {loadingReps ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">Carregando representantes...</div>
                      ) : repsError ? (
                        <div className="py-6 text-center text-sm text-red-600">{repsError}</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Nome</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRepresentatives.map((r) => (
                              <TableRow
                                key={r.id}
                                className="cursor-pointer"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    representanteId: r.id,
                                    representanteNome: r.nome,
                                  });
                                  setRepSearchOpen(false);
                                  setRepSearch('');
                                }}
                              >
                                <TableCell>{r.codigoRepresentante ?? ''}</TableCell>
                                <TableCell>{r.nome}</TableCell>
                              </TableRow>
                            ))}
                            {filteredRepresentatives.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                                  Nenhum representante encontrado
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tabela</label>
              <Select
                value={formData.tabela}
                onValueChange={(v) => setFormData({ ...formData, tabela: v })}
                disabled={loadingTabelas || !!tabelasError || !formData.clienteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.clienteId ? 'Selecione um cliente' : (loadingTabelas ? 'Carregando...' : tabelasError ? 'Erro ao carregar' : 'Selecione')} />
                </SelectTrigger>
                <SelectContent>
                  {tabelas
                    .filter((t) => String(t.descricao || '').trim().length > 0)
                    .map((t) => (
                      <SelectItem key={`${t.id}-${t.descricao}`} value={String(t.id)}>
                        {t.descricao}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Forma Pagamento</label>
              <Select
                value={formData.formaPagamento}
                onValueChange={(v) => {
                  const match =
                    formas.find((f) => f.descricao === v) ||
                    formas.find(
                      (f) =>
                        String(f.codigo || '').trim() === String(v).trim(),
                    );
                  setFormData({
                    ...formData,
                    formaPagamento: v,
                    formaPagtoId: match ? match.id : '',
                  });
                }}
                disabled={loadingFormas || !!formasError}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingFormas ? 'Carregando...' : formasError ? 'Erro ao carregar' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {formas
                    .filter((f) => !f.inativo && String(f.descricao || '').trim().length > 0)
                    .map((f) => (
                      <SelectItem key={`${f.id}-${f.codigo || f.descricao}`} value={String(f.descricao)}>
                        {f.descricao}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Prazo</label>
              <Select
                value={formData.prazo}
                onValueChange={(v) => {
                  const match =
                    prazos?.find((p) => p.descricao === v) ||
                    prazos?.find(
                      (p) =>
                        String(p.codigo || '').trim() === String(v).trim(),
                    );
                  setFormData({
                    ...formData,
                    prazo: v,
                    prazoPagtoId: match ? match.id : '',
                  });
                }}
                disabled={loadingPrazos || !!prazosError}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingPrazos ? 'Carregando...' : prazosError ? 'Erro ao carregar' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {prazos?.map((p) => (
                    <SelectItem key={`${p.id}-${p.codigo || p.descricao}`} value={String(p.descricao)}>
                      {p.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeof prazoMax === 'number' && (
                <p className="text-xs text-muted-foreground mt-1">Prazo máximo permitido pela tabela: {prazoMax} dias</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="especial"
                checked={formData.especial}
                onCheckedChange={(checked) => setFormData({ ...formData, especial: checked === true })}
              />
              <label 
                htmlFor="especial" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Pedido Especial
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 sm:gap-3 items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">Cód. Produto</label>
              <Input
                value={productCodeInput}
                onChange={(e) => {
                  setProductCodeInput(e.target.value);
                  // Limpa produto selecionado se digitar código manualmente
                  if (newItem.produtoId) {
                    setNewItem({ ...newItem, produtoId: 0, descricao: '', codigoProduto: '', preco: 0, descontoMaximo: undefined });
                    setNewItemPreco(null);
                  }
                }}
                placeholder="Código"
                disabled={!formData.clienteId}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              />
            </div>
            <div className="col-span-2 lg:col-span-3">
              <label className="text-sm font-medium mb-2 block">Produto</label>
              <ProductSearchDialog
                open={productSearchOpen}
                onOpenChange={setProductSearchOpen}
                onSelectProduct={(product) => {
                  handleSelectProduct(product);
                  setProductCodeInput(product.codigoProduto ?? String(product.id));
                }}
                selectedTabelaId={formData.tabela}
                availableTabelas={tabelas}
                trigger={
                  <Button 
                    variant="outline" 
                    className="w-full justify-start min-w-0"
                    disabled={!formData.clienteId}
                  >
                    <Search className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">
                      {newItem.descricao || (formData.clienteId ? 'Buscar' : 'Sel. cliente')}
                    </span>
                  </Button>
                }
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Tabela</label>
              <Select
                value={newItemTabelaId}
                onValueChange={handleNewItemTabelaChange}
                disabled={!newItem.produtoId || tabelas.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tabela" />
                </SelectTrigger>
                <SelectContent>
                  {tabelas.map((t) => (
                    <SelectItem key={String(t.id)} value={String(t.id)}>
                      {t.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Preço</label>
              <Input
                type="text"
                value={loadingNewItemPreco ? '...' : (newItemPreco != null ? formatCurrency(newItemPreco) : '')}
                readOnly
                className="bg-muted/50 text-right"
                placeholder="R$ 0,00"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Quant.</label>
              <Input 
                type="number"
                value={newItem.quant || ''}
                onChange={(e) => setNewItem({...newItem, quant: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">%Desc</label>
              <Input 
                type="number"
                inputMode="decimal"
                value={Number.isFinite(newItem.descontoPerc) ? newItem.descontoPerc : 0}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  const nextVal = Number.isFinite(parsed) ? parsed : 0;
                  const limited = clampDesconto(nextVal, newItem.descontoMaximo);
                  setNewItem({ ...newItem, descontoPerc: limited });
                }}
                min={0}
                max={100}
                step="any"
              />
            </div>
            <div>
              <Button
                onClick={handleAddItem}
                className="w-full"
                disabled={!formData.operacao || !formData.clienteId || !formData.representanteId || loadingProductByCode}
              >
                {loadingProductByCode ? (
                  <span className="animate-pulse">Buscando...</span>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead className="text-right">Quant.</TableHead>
                <TableHead className="text-right">%Desc</TableHead>
                <TableHead className="text-right">Pr.Unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.codigoProduto ?? ''}</TableCell>
                  <TableCell>{item.descricao}</TableCell>
                  <TableCell>
                    {(() => {
                      const tabs = itemTabelas[item.produtoId] || [];
                      const loading = !!itemTabelasLoading[item.produtoId];
                      const error = itemTabelasError[item.produtoId];
                      const valueTabela = item.tabelaId != null && String(item.tabelaId).trim() !== ''
                        ? String(item.tabelaId)
                        : getPreferredTabelaForItem(item);
                      return (
                        <Select
                          value={valueTabela}
                          onValueChange={(v) => handleChangeItemTabela(idx, v)}
                          disabled={loading || !!error}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={loading ? '...' : error ? 'Erro' : 'Sel.'} />
                          </SelectTrigger>
                          <SelectContent>
                            {tabs
                              .filter((t) => String(t.descricao || '').trim().length > 0)
                              .map((t) => (
                                <SelectItem key={`${t.id}-${t.descricao}`} value={String(t.id)}>
                                  {t.descricao}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="h-8 w-24 ml-auto text-right"
                      value={item.quant}
                      onChange={(e) => handleUpdateItem(idx, { quant: parseFloat(e.target.value) || 0 })}
                      min={0}
                      step="any"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="h-8 w-20 text-right"
                        value={item.descontoPerc}
                        onChange={(e) => handleUpdateItem(idx, { descontoPerc: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => selectZeroValue(e.currentTarget)}
                        onMouseDown={(e) => {
                          if (Number(e.currentTarget.value) === 0) {
                            e.preventDefault();
                            selectZeroValue(e.currentTarget);
                          }
                        }}
                        min={0}
                        max={100}
                        step="any"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-28 ml-auto text-right"
                      value={
                        unitPriceDrafts[idx] ?? formatMoneyInput(calculateUnitPrice(item))
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateUnitPriceDraft(idx, raw);
                        if (raw.trim() !== '') {
                          handleUpdateItemUnitPrice(idx, parseMoneyInput(raw));
                        }
                      }}
                      onFocus={(e) => {
                        if (unitPriceDrafts[idx] == null) {
                          updateUnitPriceDraft(
                            idx,
                            formatMoneyInput(calculateUnitPrice(item)),
                          );
                          requestAnimationFrame(() => e.currentTarget.select());
                        }
                      }}
                      onBlur={() => {
                        const raw = unitPriceDrafts[idx];
                        if (raw != null && raw.trim() !== '') {
                          handleUpdateItemUnitPrice(idx, parseMoneyInput(raw));
                        }
                        clearUnitPriceDraft(idx);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedBatchItem(item);
                          setBatchModalOpen(true);
                        }}
                        title="Ver lotes"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Itens: {items.length}</span>
              <span>Preço tabela: {formatCurrency(totals.bruto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Descontos:</span>
              <span>{formatCurrency(totals.descontos)} ({totals.bruto > 0 ? ((totals.descontos / totals.bruto) * 100).toFixed(2) : 0}%)</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total Líquido:</span>
              <span>{formatCurrency(totals.liquido)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Observação Cliente</label>
            <Textarea 
              value={observacoes.cliente}
              onChange={(e) => setObservacoes({...observacoes, cliente: e.target.value})}
              rows={1}
              className="min-h-[40px] resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Observação Pedido</label>
            <Textarea 
              value={observacoes.pedido}
              onChange={(e) => setObservacoes({...observacoes, pedido: e.target.value})}
              rows={1}
              className="min-h-[40px] resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Observação NF</label>
            <Textarea 
              value={observacoes.nf}
              onChange={(e) => setObservacoes({...observacoes, nf: e.target.value})}
              rows={1}
              className="min-h-[40px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button variant="outline" onClick={() => toast.info('Desfazer não implementado')} size="sm" className="w-full sm:w-auto">
          <Undo className="h-4 w-4 sm:mr-2" />
          <span>Desfazer</span>
        </Button>
        <Button onClick={handleSave} size="sm" className="w-full sm:w-auto" disabled={!!(currentOrder && currentOrder.transmitido)}>
          <Save className="h-4 w-4 sm:mr-2" />
          <span>Salvar Pedido</span>
        </Button>
      </div>

      <ClientInfoModal 
        open={clientInfoOpen} 
        onOpenChange={setClientInfoOpen} 
        clienteId={formData.clienteId} 
      />

      <ClientReceivablesModal 
        open={clientReceivablesOpen} 
        onOpenChange={setClientReceivablesOpen} 
        clienteId={formData.clienteId} 
      />

      <ClientPurchasesModal 
        open={clientPurchasesOpen} 
        onOpenChange={setClientPurchasesOpen} 
        clienteId={formData.clienteId}
        clienteNome={formData.clienteNome}
        onDuplicateOrder={handleDuplicateOrder}
      />

      <ProductBatchModal
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        produtoId={selectedBatchItem?.produtoId ?? 0}
        produtoDescricao={selectedBatchItem?.descricao ?? ''}
        estoqueAtual={selectedBatchItem?.estoque}
      />
    </div>
  );
};
