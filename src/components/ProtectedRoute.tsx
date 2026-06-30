import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '@/services/authService';


interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmpresa?: boolean;
}

export const ProtectedRoute = ({ children, requireEmpresa = false }: ProtectedRouteProps) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasEmpresa, setHasEmpresa] = useState(false);

  useEffect(() => {
    // Force synchronous check to avoid race conditions
    const checkAuth = () => {
      try {
        const authenticated = authService.isAuthenticated();
        const token = authService.getToken();
        const empresa = authService.getEmpresa();
        
        setIsAuthenticated(authenticated && !!token);
        setHasEmpresa(!!empresa);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setHasEmpresa(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [location.pathname]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireEmpresa && !hasEmpresa && !authService.isMasterAdmin()) {
    return <Navigate to="/empresa" replace />;
  }

  return <>{children}</>;
};
