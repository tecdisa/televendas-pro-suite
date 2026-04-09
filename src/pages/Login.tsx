import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import {
  authService,
  Empresa,
  getEmpresaDisplayName,
  getMasterDisplayName,
  groupEmpresasByMaster,
} from '@/services/authService';

const Login = () => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [masterId, setMasterId] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const navigate = useNavigate();

  const masterGroups = useMemo(() => groupEmpresasByMaster(empresas), [empresas]);
  const selectedMaster = useMemo(
    () =>
      masterGroups.find(
        (item) => item.empresa_master_id === Number(masterId),
      ),
    [masterGroups, masterId],
  );
  const empresasDoMaster = selectedMaster?.empresas ?? [];
  const selectingMaster = empresas.length > 0 && masterGroups.length > 1 && !selectedMaster;
  const selectingEmpresa = empresas.length > 0 && !selectingMaster;

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
      if (!empresas.length) {
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

        const groups = groupEmpresasByMaster(empresasDisponiveis);
        const preferredMasterId = Number(
          result.user?.payload?.user?.empresa_master_id,
        );
        const preferredGroup = groups.find(
          (item) => item.empresa_master_id === preferredMasterId,
        );
        const defaultGroup = preferredGroup ?? groups[0];

        setEmpresas(empresasDisponiveis);

        if (groups.length > 1) {
          setMasterId('');
          setEmpresaId('');
          toast.info('Selecione a empresa master para continuar');
          return;
        }

        setMasterId(defaultGroup ? String(defaultGroup.empresa_master_id) : '');
        const empresasDaMaster = defaultGroup?.empresas ?? [];
        if (empresasDaMaster.length === 1) {
          await concluirLoginComEmpresa(empresasDaMaster[0]);
          return;
        }

        setEmpresaId(String(empresasDaMaster[0]?.empresa_id ?? ''));
        toast.info('Selecione a unidade operacional para continuar');
        return;
      }

      if (selectingMaster) {
        if (!selectedMaster) {
          toast.error('Selecione a empresa master');
          return;
        }

        if (selectedMaster.empresas.length === 1) {
          await concluirLoginComEmpresa(selectedMaster.empresas[0]);
          return;
        }

        setEmpresaId(String(selectedMaster.empresas[0].empresa_id));
        toast.info('Selecione a unidade operacional para continuar');
        return;
      }

      const empresa = empresasDoMaster.find(
        (item) => String(item.empresa_id) === empresaId,
      );
      if (!empresa) {
        toast.error('Selecione a unidade operacional');
        return;
      }

      await concluirLoginComEmpresa(empresa);
    } catch {
      toast.error('Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  const resetEmpresaSelection = () => {
    authService.logout();
    setEmpresas([]);
    setMasterId('');
    setEmpresaId('');
  };

  const handleBack = () => {
    if (!empresas.length) {
      return;
    }

    if (selectingEmpresa && masterGroups.length > 1) {
      setMasterId('');
      setEmpresaId('');
      return;
    }

    resetEmpresaSelection();
  };

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
              {selectingMaster
                ? 'Selecione a empresa master para continuar'
                : selectingEmpresa
                ? 'Selecione a unidade operacional para continuar'
                : 'Entre com suas credenciais para acessar o sistema'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!empresas.length ? (
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
              ) : selectingMaster ? (
                <div className="space-y-2">
                  <Label htmlFor="master">Empresa master</Label>
                  <Select value={masterId} onValueChange={setMasterId}>
                    <SelectTrigger id="master">
                      <SelectValue placeholder="Selecione a empresa master" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterGroups.map((master) => (
                        <SelectItem
                          key={master.empresa_master_id}
                          value={String(master.empresa_master_id)}
                        >
                          {`${getMasterDisplayName(master)} (${master.uf})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="master-display">Empresa master</Label>
                    <Input
                      id="master-display"
                      readOnly
                      className="bg-muted"
                      value={
                        selectedMaster
                          ? `${getMasterDisplayName(selectedMaster)} (${selectedMaster.uf})`
                          : ''
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empresa">Unidade operacional</Label>
                    <Select value={empresaId} onValueChange={setEmpresaId}>
                      <SelectTrigger id="empresa">
                        <SelectValue placeholder="Selecione a unidade operacional" />
                      </SelectTrigger>
                      <SelectContent>
                        {empresasDoMaster.map((empresa) => (
                          <SelectItem
                            key={empresa.empresa_id}
                            value={String(empresa.empresa_id)}
                          >
                            {`${getEmpresaDisplayName(empresa)} (${empresa.uf})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? 'Entrando...'
                  : selectingMaster
                  ? 'Continuar'
                  : selectingEmpresa
                  ? 'Acessar sistema'
                  : 'Entrar'}
              </Button>

              {empresas.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Voltar
              </Button>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="text-sm text-center text-muted-foreground">
                  Nao tem conta?{' '}
                  <Link
                    to="/registre-se"
                    className="text-primary underline underline-offset-4"
                  >
                    Registre-se
                  </Link>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  Exemplo: usuário <strong>vend1@tecdisa.com</strong> / senha <strong>admin123</strong>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
