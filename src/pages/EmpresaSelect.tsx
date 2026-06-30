import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import {
  authService,
  Empresa,
  getEmpresaDisplayName,
  getEmpresaMasterId,
  getMasterDisplayName,
  groupEmpresasByMaster,
} from '@/services/authService';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const EmpresaSelect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [masterId, setMasterId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const forceSwitch = searchParams.get('trocar') === '1';
  const isMasterAdmin = authService.isMasterAdmin();

  const masterGroups = useMemo(() => groupEmpresasByMaster(empresas), [empresas]);
  const selectedMaster = useMemo(
    () =>
      masterGroups.find(
        (item) => item.empresa_master_id === Number(masterId),
      ),
    [masterGroups, masterId],
  );
  const selectingMaster = masterGroups.length > 1 && !selectedMaster;
  const empresasDoMaster = selectedMaster?.empresas ?? [];
  const selectedEmpresa = useMemo(
    () =>
      empresasDoMaster.find((e) => String(e.empresa_id) === selectedId),
    [empresasDoMaster, selectedId],
  );

  useEffect(() => {
    const atual = authService.getEmpresa();
    if (atual && !forceSwitch) {
      navigate('/televendas');
      return;
    }

    setLoading(true);
    authService
      .getEmpresas()
      .then((list) => {
        setEmpresas(list);
        if (!list.length) {
          toast.error('Nenhuma empresa disponível para este usuário');
          return;
        }

        const groups = groupEmpresasByMaster(list);
        const currentMasterId = atual ? getEmpresaMasterId(atual) : null;
        const currentGroup = groups.find(
          (group) => group.empresa_master_id === currentMasterId,
        );

        if (groups.length > 1) {
          setMasterId(currentGroup ? String(currentGroup.empresa_master_id) : '');
          setSelectedId(
            atual && currentGroup ? String(atual.empresa_id) : undefined,
          );
          return;
        }

        const singleGroup = groups[0];
        if (!singleGroup) return;
        setMasterId(String(singleGroup.empresa_master_id));

        const fallbackEmpresa =
          atual &&
          singleGroup.empresas.some(
            (empresa) => empresa.empresa_id === atual.empresa_id,
          )
            ? atual
            : singleGroup.empresas[0];

        if (!fallbackEmpresa) return;

        setSelectedId(String(fallbackEmpresa.empresa_id));
        if (singleGroup.empresas.length === 1) {
          authService.setEmpresa(fallbackEmpresa);
          if (forceSwitch) toast.success('Unidade operacional alterada');
          navigate('/televendas');
        }
      })
      .catch((err) => toast.error(String(err)))
      .finally(() => setLoading(false));
  }, [forceSwitch, navigate]);

  const handleConfirm = () => {
    if (selectingMaster) {
      if (!selectedMaster) {
        toast.error('Selecione uma empresa master');
        return;
      }

      if (selectedMaster.empresas.length === 1) {
        authService.setEmpresa(selectedMaster.empresas[0]);
        toast.success(
          forceSwitch ? 'Unidade operacional alterada' : 'Empresa selecionada',
        );
        navigate('/televendas');
        return;
      }

      setSelectedId(String(selectedMaster.empresas[0].empresa_id));
      return;
    }

    if (!selectedEmpresa) {
      toast.error('Selecione uma unidade operacional');
      return;
    }
    authService.setEmpresa(selectedEmpresa);
    toast.success(
      forceSwitch ? 'Unidade operacional alterada' : 'Empresa selecionada',
    );
    navigate('/televendas');
  };

  const handleBack = () => {
    if (!selectingMaster && masterGroups.length > 1) {
      setMasterId('');
      setSelectedId(undefined);
      return;
    }
    navigate('/televendas');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-3 sm:p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="space-y-1 text-center px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-bold">
            {selectingMaster
              ? 'Selecione a Empresa Master'
              : 'Selecione a Unidade Operacional'}
          </CardTitle>
          <CardDescription>
            {selectingMaster
              ? 'Escolha a master para continuar'
              : 'Escolha a unidade operacional em que você vai operar'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 space-y-4">
          {selectingMaster ? (
            <div className="space-y-2">
              <Label htmlFor="master">Empresa master</Label>
              <Select
                value={masterId}
                onValueChange={(v) => {
                  setMasterId(v);
                  setSelectedId(undefined);
                }}
                disabled={loading || masterGroups.length === 0}
              >
                <SelectTrigger id="master">
                  <SelectValue
                    placeholder={loading ? 'Carregando...' : 'Selecione'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {masterGroups.map((group) => (
                    <SelectItem
                      key={group.empresa_master_id}
                      value={String(group.empresa_master_id)}
                    >
                      {`${getMasterDisplayName(group)} (${group.uf})`}
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
                <Label htmlFor="empresa-operacional">Unidade operacional</Label>
                <Select
                  value={selectedId}
                  onValueChange={(v) => setSelectedId(v)}
                  disabled={loading || empresasDoMaster.length === 0}
                >
                  <SelectTrigger id="empresa-operacional">
                    <SelectValue
                      placeholder={loading ? 'Carregando...' : 'Selecione'}
                    />
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
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={loading || empresas.length === 0}
          >
            {selectingMaster ? 'Continuar' : 'Acessar sistema'}
          </Button>
          {isMasterAdmin && (
            <Button
              variant="outline"
              className="w-full border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
              onClick={() => {
                authService.setEmpresa(null);
                navigate('/televendas?tab=admin');
              }}
              disabled={loading}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Acessar Painel Master
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleBack}
            disabled={loading}
          >
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmpresaSelect;
