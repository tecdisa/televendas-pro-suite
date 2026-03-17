import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authService, Empresa } from '@/services/authService';

const Login = () => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isAuthenticated()) return;
    if (authService.getEmpresa()) navigate('/televendas');
    else navigate('/empresa');
  }, [navigate]);

  const concluirLoginComEmpresa = async (empresa: Empresa) => {
    const result = await authService.login(usuario, senha, empresa.empresa_id);
    if (!result.success) {
      toast.error(String(result.error));
      return false;
    }
    authService.setEmpresa(empresa);
    toast.success('Login realizado com sucesso!');
    navigate('/televendas');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (empresas.length > 1) {
        const empresa = empresas.find((item) => String(item.empresa_id) === empresaId);
        if (!empresa) {
          toast.error('Selecione a empresa');
          return;
        }
        await concluirLoginComEmpresa(empresa);
        return;
      }

      const result = await authService.login(usuario, senha);
      if (!result.success) {
        toast.error(String(result.error));
        return;
      }

      const empresasDisponiveis = await authService.getEmpresas();
      if (!empresasDisponiveis.length) {
        authService.logout();
        toast.error('Nenhuma empresa disponível para este usuário');
        return;
      }

      if (empresasDisponiveis.length === 1) {
        await concluirLoginComEmpresa(empresasDisponiveis[0]);
        return;
      }

      setEmpresas(empresasDisponiveis);
      setEmpresaId(String(empresasDisponiveis[0].empresa_id));
      toast.info('Selecione a empresa para continuar');
    } catch {
      toast.error('Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  const resetEmpresaSelection = () => {
    authService.logout();
    setEmpresas([]);
    setEmpresaId('');
  };

  const selectingEmpresa = empresas.length > 1;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-3 sm:p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="space-y-1 text-center px-4 sm:px-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <LogIn className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">Sistema ADS Vendas</CardTitle>
          <CardDescription className="text-sm">
            {selectingEmpresa
              ? 'Selecione a empresa para continuar'
              : 'Entre com suas credenciais para acessar o sistema'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!selectingEmpresa ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="usuario">Usuário</Label>
                  <Input
                    id="usuario"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select value={empresaId} onValueChange={setEmpresaId}>
                  <SelectTrigger id="empresa">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem
                        key={empresa.empresa_id}
                        value={String(empresa.empresa_id)}
                      >
                        {(empresa.fantasia?.trim() || empresa.razao_social?.trim()) +
                          ` (${empresa.uf})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : selectingEmpresa ? 'Continuar' : 'Entrar'}
            </Button>

            {selectingEmpresa ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={resetEmpresaSelection}
                disabled={loading}
              >
                Voltar
              </Button>
            ) : (
              <div className="text-xs text-center text-muted-foreground mt-4">
                Exemplo: usuário <strong>vend1@tecdisa.com</strong> / senha <strong>admin123</strong>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
