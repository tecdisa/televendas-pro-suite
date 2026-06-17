import { useEffect, useRef, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authService } from '@/services/authService';
import { metadataService, type Cidade, type Uf } from '@/services/metadataService';
import { usersService, type UsuarioCadastroFormData } from '@/services/usersService';
import { formatCnpjCpf, getCpfOrCnpjValidationMessage } from '@/utils/cnpjCpf';

const onlyDigits = (value: string | null | undefined) =>
  String(value ?? '').replace(/\D+/g, '');

const toUpperValue = (value: string | null | undefined) =>
  String(value ?? '').toUpperCase();

const normalizeCityKey = (value: string | null | undefined) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();

const debounce = <T extends (...args: any[]) => void>(fn: T, wait = 300) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const maskCep = (value: string | null | undefined) => {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
};

const maskPhone = (value: string | null | undefined) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
};

const initialFormData: UsuarioCadastroFormData = {
  usuario: '',
  nome: '',
  email: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade_id: null,
  uf: '',
  cep: '',
  cnpj_cpf: '',
  fantasia: '',
  fone: '',
  whatsapp: '',
};

export function PerfilTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UsuarioCadastroFormData>(initialFormData);
  const [passwordData, setPasswordData] = useState({
    senhaAtual: '',
    senhaNova: '',
    confirmarSenha: '',
  });
  const [ufsApi, setUfsApi] = useState<Uf[]>([]);
  const [ufsLoading, setUfsLoading] = useState(false);
  const [cidadesApi, setCidadesApi] = useState<Cidade[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);
  const [cepLookupLoading, setCepLookupLoading] = useState(false);

  const loadUfs = async () => {
    setUfsLoading(true);
    try {
      const data = await metadataService.getUfs();
      setUfsApi(data);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar UFs');
    } finally {
      setUfsLoading(false);
    }
  };

  const loadCidades = async (uf: string) => {
    if (!uf?.trim()) {
      setCidadesApi([]);
      return;
    }

    setCidadesLoading(true);
    try {
      const data = await metadataService.getCidadesPorUf(uf);
      setCidadesApi(data);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar cidades');
    } finally {
      setCidadesLoading(false);
    }
  };

  const resolveCidadeId = async (uf: string, nomeCidade?: string) => {
    if (!uf) return 0;
    try {
      const cidades = await metadataService.getCidadesPorUf(uf);
      setCidadesApi(cidades);
      if (!nomeCidade) return 0;
      const target = normalizeCityKey(nomeCidade);
      if (!target) return 0;
      const match = cidades.find(
        (cidade) => normalizeCityKey(cidade.nome_cidade) === target,
      );
      return match ? Number(match.cidade_id) || 0 : 0;
    } catch {
      return 0;
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const detail = await usersService.getMyProfile();
      setFormData({
        usuario_id: detail.usuario_id,
        usuario: detail.usuario || '',
        nome: detail.nome || '',
        email: detail.email || '',
        endereco: detail.endereco || '',
        numero: detail.numero || '',
        complemento: detail.complemento || '',
        bairro: detail.bairro || '',
        cidade_id: detail.cidade_id ?? null,
        uf: detail.uf || '',
        cep: maskCep(detail.cep || ''),
        cnpj_cpf: formatCnpjCpf(detail.cnpj_cpf || ''),
        fantasia: detail.fantasia || '',
        fone: maskPhone(detail.fone || ''),
        whatsapp: maskPhone(detail.whatsapp || ''),
      });
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const cepLookupRef = useRef<(value: string) => void>();
  if (!cepLookupRef.current) {
    cepLookupRef.current = debounce(async (value: string) => {
      const cleaned = onlyDigits(value).slice(0, 8);
      if (cleaned.length !== 8) {
        setCepLookupLoading(false);
        return;
      }

      setCepLookupLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        if (!response.ok) {
          toast.error('Falha ao consultar CEP');
          return;
        }

        const data = await response.json();
        if (!data || data.erro) {
          toast.error('CEP nao encontrado');
          return;
        }

        const ufValue = data.uf ? toUpperValue(data.uf) : '';
        const cidadeNome = data.localidade ? String(data.localidade) : '';
        const cidadeId = ufValue ? await resolveCidadeId(ufValue, cidadeNome) : 0;

        setFormData((prev) => ({
          ...prev,
          cep: maskCep(cleaned),
          endereco: toUpperValue(data.logradouro || prev.endereco),
          complemento: toUpperValue(data.complemento || prev.complemento),
          bairro: toUpperValue(data.bairro || prev.bairro),
          uf: ufValue || prev.uf,
          cidade_id: cidadeId || prev.cidade_id,
        }));
        toast.success('Endereco preenchido pelo CEP');
      } catch {
        toast.error('Erro na consulta de CEP');
      } finally {
        setCepLookupLoading(false);
      }
    }, 600);
  }

  useEffect(() => {
    loadUfs();
    loadProfile();
  }, []);

  useEffect(() => {
    if (!formData.uf?.trim()) {
      setCidadesApi([]);
      return;
    }
    loadCidades(formData.uf);
  }, [formData.uf]);

  const handleSave = async () => {
    if (!formData.usuario?.trim()) {
      toast.error('Preencha o usuario');
      return;
    }
    if (!formData.nome?.trim()) {
      toast.error('Preencha o nome');
      return;
    }
    if (!formData.email?.trim()) {
      toast.error('Preencha o e-mail');
      return;
    }
    const cnpjCpfError = formData.cnpj_cpf?.trim()
      ? getCpfOrCnpjValidationMessage(formData.cnpj_cpf)
      : null;
    if (cnpjCpfError) {
      toast.error(cnpjCpfError);
      return;
    }

    const senhaAtual = passwordData.senhaAtual.trim();
    const senhaNova = passwordData.senhaNova.trim();
    const confirmarSenha = passwordData.confirmarSenha.trim();
    const hasPasswordChange = Boolean(senhaAtual || senhaNova || confirmarSenha);
    if (hasPasswordChange) {
      if (!senhaAtual) {
        toast.error('Informe a senha atual');
        return;
      }
      if (!senhaNova) {
        toast.error('Informe a nova senha');
        return;
      }
      if (senhaNova.length < 6) {
        toast.error('A nova senha deve ter no mínimo 6 caracteres');
        return;
      }
      if (senhaNova.length > 72) {
        toast.error('A nova senha deve ter no máximo 72 caracteres');
        return;
      }
      if (confirmarSenha !== senhaNova) {
        toast.error('A confirmação da nova senha não confere');
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await usersService.updateMyProfile({
        usuario: formData.usuario.trim(),
        nome: formData.nome.trim(),
        email: formData.email.trim().toLowerCase(),
        endereco: formData.endereco?.trim() || null,
        numero: formData.numero?.trim() || null,
        complemento: formData.complemento?.trim() || null,
        bairro: formData.bairro?.trim() || null,
        cidade_id: formData.cidade_id ?? null,
        uf: formData.uf?.trim().toUpperCase() || null,
        cep: formData.cep || null,
        cnpj_cpf: formData.cnpj_cpf || null,
        fantasia: formData.fantasia?.trim() || null,
        fone: formData.fone || null,
        whatsapp: formData.whatsapp || null,
        senha_atual: hasPasswordChange ? senhaAtual : undefined,
        senha: hasPasswordChange ? senhaNova : undefined,
      });

      const session = authService.getSession();
      if (session) {
        const nextSession = {
          ...session,
          usuario: updated.usuario || session.usuario,
          nome: updated.nome || session.nome,
        };
        localStorage.setItem('session', JSON.stringify(nextSession));
      }

      toast.success('Perfil atualizado com sucesso');
      setPasswordData({
        senhaAtual: '',
        senhaNova: '',
        confirmarSenha: '',
      });
      await loadProfile();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Meu Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Carregando perfil...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-6">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Usuario *</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.usuario}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, usuario: event.target.value }))
                  }
                />
              </div>
              <div className="col-span-1 md:col-span-6">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.nome}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, nome: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-12">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  E-mail *
                </label>
                <Input
                  type="email"
                  className="h-8 text-sm"
                  value={formData.email ?? ''}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-6">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fantasia</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.fantasia ?? ''}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      fantasia: toUpperValue(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="col-span-1 md:col-span-6">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  CNPJ/CPF
                </label>
                <Input
                  className="h-8 text-sm"
                  value={formData.cnpj_cpf ?? ''}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      cnpj_cpf: formatCnpjCpf(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-6">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fone</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.fone ?? ''}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, fone: maskPhone(event.target.value) }))
                  }
                />
              </div>
              <div className="col-span-1 md:col-span-6">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Whatsapp</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.whatsapp ?? ''}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      whatsapp: maskPhone(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="border-b border-primary/50 pb-1 mt-4">
              <span className="text-sm font-medium text-primary">Seguranca</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Senha atual
                </label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  className="h-8 text-sm"
                  value={passwordData.senhaAtual}
                  onChange={(event) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      senhaAtual: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-span-1 md:col-span-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Nova senha
                </label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="h-8 text-sm"
                  value={passwordData.senhaNova}
                  onChange={(event) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      senhaNova: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-span-1 md:col-span-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Confirmar nova senha
                </label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="h-8 text-sm"
                  value={passwordData.confirmarSenha}
                  onChange={(event) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      confirmarSenha: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="border-b border-primary/50 pb-1 mt-4">
              <span className="text-sm font-medium text-primary">Endereco</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-8">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereco</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.endereco ?? ''}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: toUpperValue(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="col-span-1 md:col-span-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Numero</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.numero ?? ''}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, numero: toUpperValue(event.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Complemento</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.complemento ?? ''}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      complemento: toUpperValue(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="col-span-1 md:col-span-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.bairro ?? ''}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, bairro: toUpperValue(event.target.value) }))
                  }
                />
              </div>
              <div className="col-span-1 md:col-span-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
                <Input
                  className="h-8 text-sm"
                  value={formData.cep ?? ''}
                  onChange={(event) => {
                    const nextCep = maskCep(event.target.value);
                    setFormData((prev) => ({ ...prev, cep: nextCep }));
                    cepLookupRef.current?.(nextCep);
                  }}
                />
                {cepLookupLoading && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Buscando endereco pelo CEP...
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
                <Select
                  value={formData.uf ?? ''}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      uf: value,
                      cidade_id: null,
                    }))
                  }
                  disabled={ufsLoading}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={ufsLoading ? '...' : 'UF'} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {ufsApi.map((uf) => (
                      <SelectItem key={uf.uf} value={uf.uf}>
                        {uf.uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 md:col-span-6">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                <Select
                  value={formData.cidade_id ? String(formData.cidade_id) : 'none'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      cidade_id: value === 'none' ? null : Number(value),
                    }))
                  }
                  disabled={cidadesLoading || !formData.uf}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue
                      placeholder={
                        cidadesLoading
                          ? 'Carregando...'
                          : formData.uf
                          ? 'Selecione'
                          : 'Selecione UF'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50 max-h-60">
                    <SelectItem value="none">Selecione</SelectItem>
                    {cidadesApi.map((cidade) => (
                      <SelectItem
                        key={cidade.cidade_id}
                        value={String(cidade.cidade_id)}
                      >
                        {cidade.nome_cidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="default" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar perfil
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
