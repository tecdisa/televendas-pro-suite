import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Users,
  Truck,
  Search,
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
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  children?: { title: string; path: string; icon?: React.ComponentType<{ className?: string }> }[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Vendas',
    icon: ShoppingCart,
    children: [
      { title: 'Pedidos', path: '/televendas?tab=pesquisa', icon: Package },
    ],
  },
  {
    title: 'Cadastro',
    icon: UserPlus,
    children: [
      { title: 'Clientes', path: '/televendas?tab=clientes', icon: Users },
      { title: 'Fornecedores', path: '/televendas?tab=fornecedores', icon: Truck },
      { title: 'Representantes', path: '/televendas?tab=representantes', icon: UserCheck },
      { title: 'Grupos', path: '/televendas?tab=grupos', icon: Layers },
      { title: 'Divisões', path: '/televendas?tab=divisoes', icon: Grid3X3 },
      { title: 'Redes', path: '/televendas?tab=redes', icon: Network },
      { title: 'Prazos Pagamento', path: '/televendas?tab=prazos', icon: Clock },
      { title: 'Formas Pagamento', path: '/televendas?tab=formas-pagamento', icon: CreditCard },
      { title: 'Segmentos Venda', path: '/televendas?tab=segmentos', icon: Target },
      { title: 'Rotas Clientes', path: '/televendas?tab=rotas', icon: Route },
    ],
  },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Vendas: true,
    Cadastro: true,
  });

  const isActive = (path?: string) => {
    if (!path) return false;
    const tab = new URL(path, 'http://x').searchParams.get('tab');
    return tab === activeTab;
  };

  const isGroupActive = (item: MenuItem) => {
    return item.children?.some((child) => isActive(child.path));
  };

  const handleClick = (path: string) => {
    const tab = new URL(path, 'http://x').searchParams.get('tab');
    if (tab) {
      onTabChange(tab);
    }
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.children ? (
                  <Collapsible
                    key={item.title}
                    open={openGroups[item.title] ?? isGroupActive(item)}
                    onOpenChange={() => toggleGroup(item.title)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={cn(
                            'w-full justify-between',
                            isGroupActive(item) && 'bg-muted text-primary font-medium'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </span>
                          {!collapsed &&
                            (openGroups[item.title] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            ))}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.path}>
                              <SidebarMenuSubButton
                                onClick={() => handleClick(child.path)}
                                className={cn(
                                  'cursor-pointer',
                                  isActive(child.path) &&
                                    'bg-primary/10 text-primary font-medium'
                                )}
                              >
                                {child.icon && <child.icon className="h-4 w-4 mr-2" />}
                                <span>{child.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => item.path && handleClick(item.path)}
                      className={cn(
                        'cursor-pointer',
                        isActive(item.path) && 'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
