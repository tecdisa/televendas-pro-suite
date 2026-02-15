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
  Clock,
  Target,
  Route,
  CreditCard,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavChild {
  title: string;
  tab: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
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
      { title: 'Clientes', tab: 'clientes', icon: Users },
      { title: 'Fornecedores', tab: 'fornecedores', icon: Truck },
      { title: 'Representantes', tab: 'representantes', icon: UserCheck },
      { title: 'Grupos', tab: 'grupos', icon: Layers },
      { title: 'Divisões', tab: 'divisoes', icon: Grid3X3 },
      { title: 'Redes', tab: 'redes', icon: Network },
      { title: 'Prazos Pagamento', tab: 'prazos', icon: Clock },
      { title: 'Formas Pagamento', tab: 'formas-pagamento', icon: CreditCard },
      { title: 'Segmentos Venda', tab: 'segmentos', icon: Target },
      { title: 'Rotas Clientes', tab: 'rotas', icon: Route },
      { title: 'Clientes por Representante', tab: 'clientes-representante', icon: Users },
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

  const isGroupActive = (group: NavGroup) =>
    group.children.some((c) => c.tab === activeTab);

  return (
    <nav ref={navRef} className="hidden md:flex items-center gap-1">
      {navGroups.map((group) => {
        const isSingleChild = group.children.length === 1;
        return (
          <div key={group.title} className="relative">
            <button
              onClick={() => {
                if (isSingleChild) {
                  onTabChange(group.children[0].tab);
                  setOpenGroup(null);
                } else {
                  setOpenGroup(openGroup === group.title ? null : group.title);
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
                {group.children.map((child) => (
                  <button
                    key={child.tab}
                    onClick={() => {
                      onTabChange(child.tab);
                      setOpenGroup(null);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors whitespace-nowrap',
                      child.tab === activeTab && 'bg-primary/10 text-primary font-medium'
                    )}
                  >
                    <child.icon className="h-4 w-4" />
                    <span>{child.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
