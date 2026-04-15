import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Televendas from "./pages/Televendas";
import EmpresaSelect from "./pages/EmpresaSelect";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { initNavigation } from "./utils/navigation";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize navigation safety checks
    initNavigation();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registre-se" element={<Register />} />
            <Route path="/register" element={<Register />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route 
              path="/empresa" 
              element={
                <ProtectedRoute>
                  <EmpresaSelect />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/televendas" 
              element={
                <ProtectedRoute requireEmpresa>
                  <Televendas />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
