import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService, getEmpresaDisplayName } from '@/services/authService';
import { usersService, type UsuarioPermissao } from '@/services/usersService';
import { Button } from '@/components/ui/button';
import { LogOut, Search, FileText, Route, ClipboardList, Users, Truck, Layers, Grid3X3, UserCheck, Network, Clock, Target, CreditCard, Menu, LayoutDashboard, Package, MapPinned, Building2, UserRoundCog, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DashboardTab,
  PerfilTab,
  PesquisaTab,
  DadosTab,
  ItinerariosTab,
  VisitasTab,
  ClientesTab,
  FornecedoresTab,
  RepresentantesTab,
  UsuariosTab,
  CidadesTab,
  GruposTab,
  DivisoesTab,
  RedesTab,
  PrazosPagamentosTab,
  FormasPagamentoTab,
  SegmentosVendasTab,
  RotasClientesTab,
  ClientesPorRepresentanteTab,
  ProdutosTab,
  EstoquesTab,
  TabelasPrecoTab,
  AtualizacaoLinearPrecoTab,
  ComparacaoTabelasTab,
} from '@/components/televendas/tabs';
import { DigitacaoModal } from '@/components/televendas/overlays';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from 'sonner';
import { TopNavbar, getNavGroups, type NavChild } from '@/components/layout/TopNavbar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

const pageTitles: Record<string, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  dashboard: { title: 'Dashboard', icon: LayoutDashboard },
  perfil: { title: 'Meu Perfil', icon: UserRoundCog },
  pesquisa: { title: 'Pesquisa de Pedidos', icon: Search },
  dados: { title: 'Dados', icon: FileText },
  itinerarios: { title: 'Itinerários', icon: Route },
  visitas: { title: 'Visitas', icon: ClipboardList },
  clientes: { title: 'Cadastro de Clientes', icon: Users },
  fornecedores: { title: 'Cadastro de Fornecedores', icon: Truck },
  representantes: { title: 'Cadastro de Força de Vendas', icon: UserCheck },
  usuarios: { title: 'Cadastro de Usuarios', icon: UserRoundCog },
  cidades: { title: 'Cadastro de Cidades', icon: MapPinned },
  grupos: { title: 'Grupos de Produtos', icon: Layers },
  divisoes: { title: 'Divisões de Produtos', icon: Grid3X3 },
  redes: { title: 'Redes', icon: Network },
  prazos: { title: 'Prazos de Pagamento', icon: Clock },
  'formas-pagamento': { title: 'Formas de Pagamento', icon: CreditCard },
  segmentos: { title: 'Segmentos de Venda', icon: Target },
  rotas: { title: 'Rotas de Clientes', icon: Route },
  produtos: { title: 'Cadastro de Produtos', icon: Layers },
  estoques: { title: 'Cadastro de Estoques', icon: Package },
  'clientes-representante': { title: 'Clientes por Representante', icon: Users },
  'tabelas-preco': { title: 'Tabelas de Preço', icon: CreditCard },
  'ajuste-linear-preco': { title: 'Atualização Linear de Preços', icon: CreditCard },
  'comparacao-tabelas': { title: 'Comparação de Tabelas', icon: CreditCard },
};

const TAB_TO_FUNCAO: Record<string, string | null> = {
  dashboard: null,
  perfil: null,
  dados: null,
  itinerarios: null,
  visitas: null,
  pesquisa: 'PEDIDOS',
  clientes: 'CLIENTES',
  'clientes-representante': 'CLIENTES_REPRESENTANTES',
  fornecedores: 'FORNECEDORES',
  representantes: 'FORCA_DE_VENDAS',
  usuarios: 'USUARIOS',
  cidades: 'CIDADES',
  grupos: 'GRUPOS',
  divisoes: 'DIVISOES',
  redes: 'REDES',
  prazos: 'PRAZOS',
  'formas-pagamento': 'FORMAS_PAGAMENTO',
  segmentos: 'SEGMENTOS_VENDA',
  rotas: 'ROTAS_CLIENTES',
  produtos: 'PRODUTOS',
  estoques: 'ESTOQUES',
  'tabelas-preco': null,
  'ajuste-linear-preco': null,
  'comparacao-tabelas': null,
};

function normalizeFuncaoKey(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildAllowedTabs(
  isMasterAdmin: boolean,
  canManageUsers: boolean,
  permissoes: UsuarioPermissao[],
): Set<string> {
  const allTabs = Object.keys(pageTitles);
  if (isMasterAdmin) return new Set(allTabs);

  const canSelectByFuncao = new Map(
    permissoes.map((item) => [
      normalizeFuncaoKey(item.funcao),
      Boolean(item.can_select),
    ]),
  );

  const allowed = new Set<string>();
  allTabs.forEach((tab) => {
    if (tab === 'usuarios' && !canManageUsers) {
      return;
    }
    const funcao = normalizeFuncaoKey(TAB_TO_FUNCAO[tab]);
    if (!funcao) {
      allowed.add(tab);
      return;
    }
    if (canSelectByFuncao.get(funcao)) {
      allowed.add(tab);
    }
  });

  if (canManageUsers) {
    allowed.add('usuarios');
  }

  if (!allowed.size) {
    allowed.add('dashboard');
    allowed.add('perfil');
  }

  return allowed;
}

const Televendas = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [digitacaoOpen, setDigitacaoOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [permissoesUsuario, setPermissoesUsuario] = useState<UsuarioPermissao[]>([]);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const isMasterAdmin = authService.isMasterAdmin();
  const canManageUsers = authService.isAdmin();
  const allowedTabs = useMemo(
    () => buildAllowedTabs(isMasterAdmin, canManageUsers, permissoesUsuario),
    [isMasterAdmin, canManageUsers, permissoesUsuario],
  );
  const availableNavGroups = useMemo(
    () => getNavGroups({ canManageUsers, allowedTabs }),
    [canManageUsers, allowedTabs],
  );
  const effectiveTab = allowedTabs.has(activeTab) ? activeTab : 'dashboard';

  useEffect(() => {
    let cancelled = false;
    const loadPermissions = async () => {
      try {
        if (isMasterAdmin) {
          if (!cancelled) {
            setPermissoesUsuario([]);
            setPermissionsReady(true);
          }
          return;
        }
        const permissoes = await usersService.getMyPermissions();
        if (!cancelled) {
          setPermissoesUsuario(permissoes);
          setPermissionsReady(true);
        }
      } catch (error: any) {
        if (!cancelled) {
          setPermissoesUsuario([]);
          setPermissionsReady(true);
          toast.error(error?.message || 'Erro ao carregar permissoes do usuario');
        }
      }
    };
    loadPermissions();
    return () => {
      cancelled = true;
    };
  }, [isMasterAdmin]);

  useEffect(() => {
    if (!permissionsReady) return;
    if (!allowedTabs.has(activeTab)) {
      toast.error('Você não possui permissão para acessar este módulo');
      setSearchParams({ tab: 'dashboard' });
    }
  }, [activeTab, allowedTabs, permissionsReady, setSearchParams]);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
    setMobileMenuOpen(false);
    setMobileExpanded(null);
  };

  const handleLogout = () => {
    authService.logout();
    toast.success('Logout realizado com sucesso');
    navigate('/login');
  };

  const empresa = authService.getEmpresa();
  const session = authService.getSession();
  const usuarioLogado =
    session?.nome?.trim() ||
    session?.usuario?.trim() ||
    'Não identificado';
  const empresaLogada = empresa
    ? getEmpresaDisplayName(empresa)
    : 'Não selecionada';

  const renderContent = () => {
    switch (effectiveTab) {
      case 'dashboard':
        return <ErrorBoundary><DashboardTab /></ErrorBoundary>;
      case 'perfil':
        return <ErrorBoundary><PerfilTab /></ErrorBoundary>;
      case 'pesquisa':
        return <ErrorBoundary><PesquisaTab onNavigateToDigitacao={() => setDigitacaoOpen(true)} /></ErrorBoundary>;
      case 'dados':
        return <ErrorBoundary><DadosTab /></ErrorBoundary>;
      case 'itinerarios':
        return <ErrorBoundary><ItinerariosTab /></ErrorBoundary>;
      case 'visitas':
        return <ErrorBoundary><VisitasTab /></ErrorBoundary>;
      case 'clientes':
        return <ErrorBoundary><ClientesTab /></ErrorBoundary>;
      case 'fornecedores':
        return <ErrorBoundary><FornecedoresTab /></ErrorBoundary>;
      case 'representantes':
        return <ErrorBoundary><RepresentantesTab /></ErrorBoundary>;
      case 'usuarios':
        return <ErrorBoundary><UsuariosTab /></ErrorBoundary>;
      case 'cidades':
        return <ErrorBoundary><CidadesTab /></ErrorBoundary>;
      case 'grupos':
        return <ErrorBoundary><GruposTab /></ErrorBoundary>;
      case 'divisoes':
        return <ErrorBoundary><DivisoesTab /></ErrorBoundary>;
      case 'redes':
        return <ErrorBoundary><RedesTab /></ErrorBoundary>;
      case 'prazos':
        return <ErrorBoundary><PrazosPagamentosTab /></ErrorBoundary>;
      case 'formas-pagamento':
        return <ErrorBoundary><FormasPagamentoTab /></ErrorBoundary>;
      case 'segmentos':
        return <ErrorBoundary><SegmentosVendasTab /></ErrorBoundary>;
      case 'rotas':
        return <ErrorBoundary><RotasClientesTab /></ErrorBoundary>;
      case 'clientes-representante':
        return <ErrorBoundary><ClientesPorRepresentanteTab /></ErrorBoundary>;
      case 'produtos':
        return <ErrorBoundary><ProdutosTab /></ErrorBoundary>;
      case 'estoques':
        return <ErrorBoundary><EstoquesTab /></ErrorBoundary>;
      case 'tabelas-preco':
        return <ErrorBoundary><TabelasPrecoTab /></ErrorBoundary>;
      case 'ajuste-linear-preco':
        return <ErrorBoundary><AtualizacaoLinearPrecoTab /></ErrorBoundary>;
      case 'comparacao-tabelas':
        return <ErrorBoundary><ComparacaoTabelasTab /></ErrorBoundary>;
      default:
        return <ErrorBoundary><DashboardTab /></ErrorBoundary>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      {/* Header with top navbar */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <nav className="pt-12 px-2">
                  {availableNavGroups.map((group) => (
                    <div key={group.title} className="mb-4">
                      <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.title}
                      </p>
                      {group.children.map((child) =>
                        child.children ? (
                          <div key={child.title}>
                            <button
                              onClick={() => setMobileExpanded(mobileExpanded === child.title ? null : child.title)}
                              className={cn(
                                'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                                child.children.some(c => c.tab === activeTab)
                                  ? 'text-primary font-medium'
                                  : 'text-foreground hover:bg-muted'
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <child.icon className="h-4 w-4" />
                                <span>{child.title}</span>
                              </span>
                              <ChevronRight className={cn(
                                'h-3.5 w-3.5 transition-transform',
                                mobileExpanded === child.title && 'rotate-90'
                              )} />
                            </button>
                            {mobileExpanded === child.title && child.children.map((sub) => (
                              <button
                                key={sub.tab}
                                onClick={() => handleTabChange(sub.tab!)}
                                className={cn(
                                  'w-full flex items-center gap-2 pl-8 pr-3 py-2 rounded-md text-sm transition-colors',
                                  sub.tab === activeTab
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-foreground hover:bg-muted'
                                )}
                              >
                                <sub.icon className="h-4 w-4" />
                                <span>{sub.title}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            key={child.tab}
                            onClick={() => handleTabChange(child.tab!)}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                              child.tab === activeTab
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-foreground hover:bg-muted'
                            )}
                          >
                            <child.icon className="h-4 w-4" />
                            <span>{child.title}</span>
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-primary">ADS Vendas</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[260px] sm:max-w-[360px] flex items-center gap-1.5">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {usuarioLogado}
                </span>
                <span className="shrink-0">|</span>
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {empresaLogada}
                </span>
              </p>
            </div>

            {/* Desktop top navbar */}
            <TopNavbar
              activeTab={effectiveTab}
              onTabChange={handleTabChange}
              groups={availableNavGroups}
            />
          </div>

          <div className="flex items-center gap-2">
            <span
              className="hidden lg:inline-flex items-center text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded"
              title={`Build: ${__BUILD_DATE__}`}
            >
              {__GIT_HASH__}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange('perfil')}
            >
              <UserRoundCog className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Meu Perfil</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/empresa?trocar=1')}
            >
              <Building2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Trocar Empresa</span>
            </Button>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        {pageTitles[effectiveTab] && (
          <div className="flex items-center gap-2 mb-4">
            {(() => {
              const IconComponent = pageTitles[effectiveTab].icon;
              return <IconComponent className="h-5 w-5 text-primary" />;
            })()}
            <h2 className="text-lg font-semibold text-foreground">
              {pageTitles[effectiveTab].title}
            </h2>
          </div>
        )}
        {renderContent()}
      </main>

      <DigitacaoModal open={digitacaoOpen} onOpenChange={setDigitacaoOpen} />
    </div>
  );
};

export default Televendas;
