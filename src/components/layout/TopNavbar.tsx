import { useState, useRef, useEffect } from 'react';
import {
  Users,
  Truck,
  Package,
  ShoppingCart,
  UserPlus,
  Layers,
  Grid3X3,
  UserCheck,
  Network,
  MapPinned,
  Clock,
  Target,
  Route,
  CreditCard,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  UserRoundCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavChild {
  title: string;
  tab?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
}

export interface NavGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavChild[];
}

export const navGroups: NavGroup[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    children: [
      { title: 'Painel Geral', tab: 'dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Cadastro',
    icon: UserPlus,
    children: [
      {
        title: 'Clientes',
        icon: Users,
        children: [
          { title: 'Todos', tab: 'clientes', icon: Users },
          { title: 'Por Fornecedor', tab: 'clientes-representante', icon: UserCheck },
          { title: 'Redes', tab: 'redes', icon: Network },
          { title: 'Cidades', tab: 'cidades', icon: MapPinned },
          { title: 'Segmentos Venda', tab: 'segmentos', icon: Target },
          { title: 'Rotas Clientes', tab: 'rotas', icon: Route },
          { title: 'Prazos', tab: 'prazos', icon: Clock },
          { title: 'Formas Pagamento', tab: 'formas-pagamento', icon: CreditCard },
        ],
      },
      { title: 'Fornecedores', tab: 'fornecedores', icon: Truck },
      { title: 'Força de Vendas', tab: 'representantes', icon: UserCheck },
      { title: 'Usuarios', tab: 'usuarios', icon: UserRoundCog },
      {
        title: 'Produtos',
        icon: Package,
        children: [
          { title: 'Produtos', tab: 'produtos', icon: Package },
          { title: 'Grupos', tab: 'grupos', icon: Layers },
          { title: 'Divisões', tab: 'divisoes', icon: Grid3X3 },
          { title: 'Estoques', tab: 'estoques', icon: Package },
        ],
      },
    ],
  },
  {
    title: 'Vendas',
    icon: ShoppingCart,
    children: [
      { title: 'Pedidos', tab: 'pesquisa', icon: Package },
    ],
  },
];

interface TopNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TopNavbar({ activeTab, onTabChange }: TopNavbarProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [expandedChild, setExpandedChild] = useState<string | null>(null);

  const isChildActive = (child: NavChild): boolean => {
    if (child.tab) return child.tab === activeTab;
    return child.children?.some(c => isChildActive(c)) ?? false;
  };

  const isGroupActive = (group: NavGroup) =>
    group.children.some((c) => isChildActive(c));

  return (
    <nav ref={navRef} className="hidden md:flex items-center gap-1">
      {navGroups.map((group) => {
        const isSingleChild = group.children.length === 1 && !group.children[0].children;
        return (
          <div key={group.title} className="relative">
            <button
              onClick={() => {
                if (isSingleChild) {
                  onTabChange(group.children[0].tab!);
                  setOpenGroup(null);
                } else {
                  const next = openGroup === group.title ? null : group.title;
                  setOpenGroup(next);
                  // Auto-expand nested child if we're on one of its routes
                  if (next) {
                    const activeNested = group.children.find(c => c.children && isChildActive(c));
                    setExpandedChild(activeNested?.title ?? null);
                  } else {
                    setExpandedChild(null);
                  }
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                'text-muted-foreground hover:text-foreground',
                isGroupActive(group) && 'text-foreground',
                openGroup === group.title && 'text-foreground'
              )}
            >
              <group.icon className="h-4 w-4" />
              <span>{group.title}</span>
              {!isSingleChild && (
                <ChevronDown className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  openGroup === group.title && 'rotate-180'
                )} />
              )}
            </button>

            {/* Dropdown */}
            {!isSingleChild && openGroup === group.title && (
              <div className="absolute top-full left-0 mt-1 min-w-[240px] bg-popover border rounded-md shadow-lg py-1 z-50">
                {group.children.map((child) =>
                  child.children ? (
                    <div key={child.title} className="relative">
                      <button
                        onClick={() => setExpandedChild(expandedChild === child.title ? null : child.title)}
                        onMouseEnter={() => setExpandedChild(child.title)}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors whitespace-nowrap',
                          isChildActive(child) && 'text-primary font-medium'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <child.icon className="h-4 w-4" />
                          <span>{child.title}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      {expandedChild === child.title && (
                        <div className="absolute left-full top-0 ml-1 min-w-[200px] bg-popover border rounded-md shadow-lg py-1 z-50">
                          {child.children.map((sub) => (
                            <button
                              key={sub.tab}
                              onClick={() => {
                                onTabChange(sub.tab!);
                                setOpenGroup(null);
                                setExpandedChild(null);
                              }}
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors whitespace-nowrap',
                                sub.tab === activeTab && 'bg-primary/10 text-primary font-medium'
                              )}
                            >
                              <sub.icon className="h-4 w-4" />
                              <span>{sub.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      key={child.tab}
                      onClick={() => {
                        onTabChange(child.tab!);
                        setOpenGroup(null);
                        setExpandedChild(null);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors whitespace-nowrap',
                        child.tab === activeTab && 'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      <child.icon className="h-4 w-4" />
                      <span>{child.title}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
