import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { LogOut, Search, FileText, Route, ClipboardList, Users, Truck, Layers, Grid3X3 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PesquisaTab } from '@/components/televendas/PesquisaTab';
import { DadosTab } from '@/components/televendas/DadosTab';
import { ItinerariosTab } from '@/components/televendas/ItinerariosTab';
import { VisitasTab } from '@/components/televendas/VisitasTab';
import { ClientesTab } from '@/components/televendas/ClientesTab';
import { FornecedoresTab } from '@/components/televendas/FornecedoresTab';
import { GruposTab } from '@/components/televendas/GruposTab';
import { DivisoesTab } from '@/components/televendas/DivisoesTab';
import { DigitacaoModal } from '@/components/televendas/DigitacaoModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from 'sonner';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';

const pageTitles: Record<string, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  pesquisa: { title: 'Pesquisa de Pedidos', icon: Search },
  dados: { title: 'Dados', icon: FileText },
  itinerarios: { title: 'Itinerários', icon: Route },
  visitas: { title: 'Visitas', icon: ClipboardList },
  clientes: { title: 'Cadastro de Clientes', icon: Users },
  fornecedores: { title: 'Cadastro de Fornecedores', icon: Truck },
  grupos: { title: 'Grupos de Produtos', icon: Layers },
  divisoes: { title: 'Divisões de Produtos', icon: Grid3X3 },
};

const Televendas = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'pesquisa';
  const [digitacaoOpen, setDigitacaoOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleLogout = () => {
    authService.logout();
    toast.success('Logout realizado com sucesso');
    navigate('/login');
  };

  const empresa = authService.getEmpresa();

  const renderContent = () => {
    switch (activeTab) {
      case 'pesquisa':
        return (
          <ErrorBoundary>
            <PesquisaTab onNavigateToDigitacao={() => setDigitacaoOpen(true)} />
          </ErrorBoundary>
        );
      case 'dados':
        return (
          <ErrorBoundary>
            <DadosTab />
          </ErrorBoundary>
        );
      case 'itinerarios':
        return (
          <ErrorBoundary>
            <ItinerariosTab />
          </ErrorBoundary>
        );
      case 'visitas':
        return (
          <ErrorBoundary>
            <VisitasTab />
          </ErrorBoundary>
        );
      case 'clientes':
        return (
          <ErrorBoundary>
            <ClientesTab />
          </ErrorBoundary>
        );
      case 'fornecedores':
        return (
          <ErrorBoundary>
            <FornecedoresTab />
          </ErrorBoundary>
        );
      case 'grupos':
        return (
          <ErrorBoundary>
            <GruposTab />
          </ErrorBoundary>
        );
      case 'divisoes':
        return (
          <ErrorBoundary>
            <DivisoesTab />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary>
            <PesquisaTab onNavigateToDigitacao={() => setDigitacaoOpen(true)} />
          </ErrorBoundary>
        );
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-50">
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-8 w-8" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-primary">ADS Vendas</h1>
                  {empresa && (
                    <p className="text-xs text-muted-foreground">
                      {empresa.fantasia?.trim() || empresa.razao_social?.trim()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
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
            {/* Page Title */}
            {pageTitles[activeTab] && (
              <div className="flex items-center gap-2 mb-4">
                {(() => {
                  const IconComponent = pageTitles[activeTab].icon;
                  return <IconComponent className="h-5 w-5 text-primary" />;
                })()}
                <h2 className="text-lg font-semibold text-foreground">
                  {pageTitles[activeTab].title}
                </h2>
              </div>
            )}
            {renderContent()}
          </main>

          <DigitacaoModal open={digitacaoOpen} onOpenChange={setDigitacaoOpen} />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Televendas;
