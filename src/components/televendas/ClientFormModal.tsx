import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Save, Undo2, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { clientsService } from '@/services/clientsService';
import { metadataService, Rota } from '@/services/metadataService';

// =================== Types & Helpers ===================
interface ClientFormData {
  // Identificação
  codigoCliente: string;
  tipoCliente: string;
  inativo: boolean;
  cnpjCpf: string;
  razaoSocialNome: string;
  nomeFantasia: string;
  simplesNacional: boolean;
  consumidorFinal: boolean;
  inscEstadual: string;
  contribuinteIcm: string;
  suframa: string;
  // Endereço
  cep: string;
  endereco: string;
  uf: string;
  cidade: string;
  bairro: string;
  complemento: string;
  // Telefones
  telefoneFixo: string;
  celular: string;
  whatsapp: string;
  email: string;
  emailDanfe: string;
  site: string;
  rotaId: number;
  // Dados complementares
  proprietario: string;
  cpfProprietario: string;
  rgProprietario: string;
  aniversario: string;
  inicioAtividade: string;
  enderecoComplementar: string;
  enderecoParaEntrega: boolean;
  ufComplementar: string;
  cidadeComplementar: string;
  cepComplementar: string;
  bairroComplementar: string;
  emailComplementar: string;
  // Referências bancárias
  banco1: string;
  conta1: string;
  agencia1: string;
  banco2: string;
  conta2: string;
  agencia2: string;
  // Referências comerciais
  refComercial1: string;
  refComercial2: string;
  refComercial3: string;
  refComercial4: string;
  // Sócios
  socio1Nome: string;
  socio1Perc: number;
  socio2Nome: string;
  socio2Perc: number;
  socio3Nome: string;
  socio3Perc: number;
  capitalSocial: string;
  contador: string;
  telefoneContador: string;
  // Cobrança
  enderecoCobranca: string;
  bairroCobranca: string;
  ufCobranca: string;
  cidadeCobranca: string;
  cepCobranca: string;
  // Dados Comerciais
  contato1Nome: string;
  contato1Celular: string;
  contato1Aniversario: string;
  contato2Nome: string;
  contato2Celular: string;
  contato2Aniversario: string;
  classe: string;
  nielsen: string;
  rede: string;
  checkouts: number;
  dependencia: number;
  tabelaPrecos: string;
  tabelaPrecosId: string;
  permiteVendaEmpresas: string;
  representante: string;
  prazoMaximoLiberado: string;
  boletoBancario: boolean;
  descontoMaximoNotaFiscal: number;
  despesasNotaFiscal: number;
  freteNotaFiscal: number;
  liberadoVendaB2B: boolean;
  senhaB2B: string;
  tabelaB2B: string;
  observacao: string;
}

const createEmptyFormData = (): ClientFormData => ({
  codigoCliente: '',
  tipoCliente: 'Cliente',
  inativo: false,
  cnpjCpf: '',
  razaoSocialNome: '',
  nomeFantasia: '',
  simplesNacional: false,
  consumidorFinal: false,
  inscEstadual: '',
  contribuinteIcm: 'Contribuinte ICM',
  suframa: '',
  cep: '',
  endereco: '',
  uf: '',
  cidade: '',
  bairro: '',
  complemento: '',
  telefoneFixo: '',
  celular: '',
  whatsapp: '',
  email: '',
  emailDanfe: '',
  site: '',
  rotaId: 0,
  proprietario: '',
  cpfProprietario: '',
  rgProprietario: '',
  aniversario: '',
  inicioAtividade: '',
  enderecoComplementar: '',
  enderecoParaEntrega: false,
  ufComplementar: '',
  cidadeComplementar: '',
  cepComplementar: '',
  bairroComplementar: '',
  emailComplementar: '',
  banco1: '',
  conta1: '',
  agencia1: '',
  banco2: '',
  conta2: '',
  agencia2: '',
  refComercial1: '',
  refComercial2: '',
  refComercial3: '',
  refComercial4: '',
  socio1Nome: '',
  socio1Perc: 0,
  socio2Nome: '',
  socio2Perc: 0,
  socio3Nome: '',
  socio3Perc: 0,
  capitalSocial: '',
  contador: '',
  telefoneContador: '',
  enderecoCobranca: '',
  bairroCobranca: '',
  ufCobranca: '',
  cidadeCobranca: '',
  cepCobranca: '',
  contato1Nome: '',
  contato1Celular: '',
  contato1Aniversario: '',
  contato2Nome: '',
  contato2Celular: '',
  contato2Aniversario: '',
  classe: '',
  nielsen: '',
  rede: '',
  checkouts: 0,
  dependencia: 0,
  tabelaPrecos: '',
  tabelaPrecosId: '',
  permiteVendaEmpresas: '',
  representante: '',
  prazoMaximoLiberado: '30/40/50 DD',
  boletoBancario: false,
  descontoMaximoNotaFiscal: 0,
  despesasNotaFiscal: 0,
  freteNotaFiscal: 0,
  liberadoVendaB2B: false,
  senhaB2B: '',
  tabelaB2B: '',
  observacao: '',
});

const debounce = <T extends (...args: any[]) => void>(fn: T, wait = 300) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const normalizeCep = (v: string) => v.replace(/\D+/g, '').slice(0, 8);
const normalizeCnpj = (v: string) => v.replace(/\D+/g, '').slice(0, 14);

// =================== Components ===================
interface FormRowProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

const FormRow = ({ label, required, children, className = '' }: FormRowProps) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <label className="text-sm text-muted-foreground whitespace-nowrap min-w-[100px] text-right">
      {label}{required && <span className="text-destructive">*</span>}
    </label>
    {children}
  </div>
);

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b border-primary/50 pb-1 mb-3">
    <span className="text-sm font-medium text-primary">{children}</span>
  </div>
);

// =================== Main Component ===================
interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  clientId?: number | null;
  onSuccess?: () => void;
}

export const ClientFormModal = ({
  open,
  onOpenChange,
  mode,
  clientId,
  onSuccess,
}: ClientFormModalProps) => {
  const [formData, setFormData] = useState<ClientFormData>(createEmptyFormData());
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotasLoading, setRotasLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('identificacao');

  const cnpjLookupRef = useRef<(v: string) => void>();
  if (!cnpjLookupRef.current) {
    cnpjLookupRef.current = debounce(async (value: string) => {
      const cleaned = normalizeCnpj(value);
      if (cleaned.length !== 14) return;
      try {
        const result = await clientsService.lookupCnpj(cleaned);
        if (!result || !result.data) return;
        const d = result.data;
        setFormData((prev) => {
          const estab = d.estabelecimento ?? {};
          const cidadeObj = estab.cidade ?? {};
          const estadoObj = estab.estado ?? {};
          const tipoLogradouro = estab.tipo_logradouro ? String(estab.tipo_logradouro).trim() : '';
          const logradouro = estab.logradouro ? String(estab.logradouro).trim() : '';
          const enderecoFmt = [tipoLogradouro, logradouro].filter(Boolean).join(' ') || d.logradouro || prev.endereco;
          const telefone1 = estab.telefone1 ? String(estab.telefone1).trim() : '';
          const ddd1 = estab.ddd1 ? String(estab.ddd1).trim() : '';
          const telefoneFmt = ddd1 && telefone1 ? `(${ddd1}) ${telefone1}` : prev.telefoneFixo;

          return {
            ...prev,
            cnpjCpf: cleaned,
            razaoSocialNome: d.razao_social || prev.razaoSocialNome,
            nomeFantasia: d.nome_fantasia || estab.nome_fantasia || prev.nomeFantasia,
            endereco: enderecoFmt,
            bairro: estab.bairro || d.bairro || prev.bairro,
            cidade: cidadeObj.nome || estab.municipio || d.municipio || prev.cidade,
            uf: estadoObj.sigla || estab.uf || d.uf || prev.uf,
            cep: estab.cep ? normalizeCep(String(estab.cep)) : (d.cep ? normalizeCep(String(d.cep)) : prev.cep),
            complemento: estab.complemento ? String(estab.complemento).trim() : prev.complemento,
            telefoneFixo: telefoneFmt,
            email: estab.email || prev.email,
          };
        });
        toast.success('Dados preenchidos pela consulta de CNPJ');
      } catch (e: any) {
        toast.error(String(e));
      }
    }, 600);
  }

  useEffect(() => {
    if (open) {
      setActiveTab('identificacao');
      loadRotas();
      if (mode === 'create') {
        setFormData(createEmptyFormData());
        setError(null);
      } else if (mode === 'edit' && clientId) {
        loadClientDetail(clientId);
      }
    }
  }, [open, mode, clientId]);

  const loadRotas = async () => {
    setRotasLoading(true);
    try {
      const data = await metadataService.getRotas();
      setRotas(data);
    } catch (e) {
      console.error('Erro ao carregar rotas:', e);
    } finally {
      setRotasLoading(false);
    }
  };

  const loadClientDetail = async (id: number) => {
    setDetailLoading(true);
    setError(null);
    try {
      const d = await clientsService.getDetail(id) || {};
      setFormData({
        codigoCliente: String(d.codigo_cliente ?? d.codigoCliente ?? d.codigo ?? ''),
        tipoCliente: String(d.tipo_cliente ?? d.tipoCliente ?? 'Cliente'),
        inativo: Boolean(d.inativo),
        cnpjCpf: String(d.cnpj_cpf ?? d.cnpjCpf ?? d.cnpj ?? d.cpf ?? ''),
        razaoSocialNome: String(d.nome ?? d.razao_social ?? ''),
        nomeFantasia: String(d.fantasia ?? d.nome_fantasia ?? ''),
        simplesNacional: Boolean(d.simples_nacional ?? d.simplesNacional),
        consumidorFinal: Boolean(d.consumidor_final ?? d.consumidorFinal),
        inscEstadual: String(d.inscricao_estadual ?? d.inscEstadual ?? d.insc_estadual ?? ''),
        contribuinteIcm: String(d.contribuinte_icm ?? d.contribuinteIcm ?? 'Contribuinte ICM'),
        suframa: String(d.suframa ?? ''),
        cep: String(d.cep ?? ''),
        endereco: String(d.endereco ?? d.logradouro ?? ''),
        uf: String(d.uf ?? d.estado ?? ''),
        cidade: String(d.cidade ?? ''),
        bairro: String(d.bairro ?? ''),
        complemento: String(d.complemento ?? ''),
        telefoneFixo: String(d.fone ?? d.telefone ?? ''),
        celular: String(d.celular ?? ''),
        whatsapp: String(d.whatsapp ?? ''),
        email: String(d.email ?? ''),
        emailDanfe: String(d.email_danfe ?? d.emailDanfe ?? ''),
        site: String(d.site ?? ''),
        rotaId: Number(d.rota_id ?? d.rotaId ?? 0),
        proprietario: String(d.proprietario ?? ''),
        cpfProprietario: String(d.cpf_proprietario ?? d.cpfProprietario ?? ''),
        rgProprietario: String(d.rg_proprietario ?? d.rgProprietario ?? d.rg ?? ''),
        aniversario: String(d.aniversario ?? ''),
        inicioAtividade: String(d.inicio_atividade ?? d.inicioAtividade ?? ''),
        enderecoComplementar: String(d.endereco_complementar ?? d.enderecoComplementar ?? ''),
        enderecoParaEntrega: Boolean(d.endereco_para_entrega ?? d.enderecoParaEntrega),
        ufComplementar: String(d.uf_complementar ?? d.ufComplementar ?? ''),
        cidadeComplementar: String(d.cidade_complementar ?? d.cidadeComplementar ?? ''),
        cepComplementar: String(d.cep_complementar ?? d.cepComplementar ?? ''),
        bairroComplementar: String(d.bairro_complementar ?? d.bairroComplementar ?? ''),
        emailComplementar: String(d.email_complementar ?? d.emailComplementar ?? ''),
        banco1: String(d.banco1 ?? ''),
        conta1: String(d.conta1 ?? ''),
        agencia1: String(d.agencia1 ?? ''),
        banco2: String(d.banco2 ?? ''),
        conta2: String(d.conta2 ?? ''),
        agencia2: String(d.agencia2 ?? ''),
        refComercial1: String(d.ref_comercial1 ?? d.refComercial1 ?? ''),
        refComercial2: String(d.ref_comercial2 ?? d.refComercial2 ?? ''),
        refComercial3: String(d.ref_comercial3 ?? d.refComercial3 ?? ''),
        refComercial4: String(d.ref_comercial4 ?? d.refComercial4 ?? ''),
        socio1Nome: String(d.socio1_nome ?? d.socio1Nome ?? ''),
        socio1Perc: Number(d.socio1_perc ?? d.socio1Perc ?? 0),
        socio2Nome: String(d.socio2_nome ?? d.socio2Nome ?? ''),
        socio2Perc: Number(d.socio2_perc ?? d.socio2Perc ?? 0),
        socio3Nome: String(d.socio3_nome ?? d.socio3Nome ?? ''),
        socio3Perc: Number(d.socio3_perc ?? d.socio3Perc ?? 0),
        capitalSocial: String(d.capital_social ?? d.capitalSocial ?? ''),
        contador: String(d.contador ?? ''),
        telefoneContador: String(d.telefone_contador ?? d.telefoneContador ?? ''),
        enderecoCobranca: String(d.endereco_cobranca ?? d.enderecoCobranca ?? ''),
        bairroCobranca: String(d.bairro_cobranca ?? d.bairroCobranca ?? ''),
        ufCobranca: String(d.uf_cobranca ?? d.ufCobranca ?? ''),
        cidadeCobranca: String(d.cidade_cobranca ?? d.cidadeCobranca ?? ''),
        cepCobranca: String(d.cep_cobranca ?? d.cepCobranca ?? ''),
        contato1Nome: String(d.contato ?? d.contatos?.[0]?.nome ?? ''),
        contato1Celular: String(d.celular ?? d.contatos?.[0]?.celular ?? ''),
        contato1Aniversario: String(d.contatos?.[0]?.aniversario ?? ''),
        contato2Nome: String(d.contatos?.[1]?.nome ?? ''),
        contato2Celular: String(d.contatos?.[1]?.celular ?? ''),
        contato2Aniversario: String(d.contatos?.[1]?.aniversario ?? ''),
        classe: String(d.classe ?? ''),
        nielsen: String(d.nielsen ?? ''),
        rede: String(d.rede_id ?? d.rede ?? ''),
        checkouts: Number(d.checkouts ?? 0),
        dependencia: Number(d.dependencia ?? 0),
        tabelaPrecos: String(d.tabelas ?? d.tabela_precos ?? ''),
        tabelaPrecosId: String(d.tabela_precos_id ?? d.tabelaPrecosId ?? ''),
        permiteVendaEmpresas: String(d.permite_venda_empresas ?? d.permiteVendaEmpresas ?? ''),
        representante: String(d.representante ?? ''),
        prazoMaximoLiberado: String(d.prazo_maximo_liberado ?? d.prazoMaximoLiberado ?? d.prazo ?? '30/40/50 DD'),
        boletoBancario: Boolean(d.boleto_bancario ?? d.boletoBancario ?? d.boleto),
        descontoMaximoNotaFiscal: Number(d.desconto_maximo_nota_fiscal ?? d.descontoMaximoNotaFiscal ?? d.desconto_financeiro_boleto ?? 0),
        despesasNotaFiscal: Number(d.despesas_nota_fiscal ?? d.despesasNotaFiscal ?? 0),
        freteNotaFiscal: Number(d.frete_nota_fiscal ?? d.freteNotaFiscal ?? 0),
        liberadoVendaB2B: Boolean(d.liberado_venda_b2b ?? d.liberadoVendaB2B),
        senhaB2B: String(d.senha_b2b ?? d.senhaB2B ?? ''),
        tabelaB2B: String(d.tabela_b2b ?? d.tabelaB2B ?? ''),
        observacao: String(d.observacao ?? d.observacao_comercial ?? d.observacaoComercial ?? ''),
      });
    } catch (e: any) {
      setError(String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!formData.razaoSocialNome || !formData.cnpjCpf) {
      setError('Preencha Razão Social/Nome e CNPJ/CPF');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...formData,
        nome: formData.razaoSocialNome,
        fantasia: formData.nomeFantasia,
        telefone: formData.telefoneFixo,
        rotaId: Number(formData.rotaId) || 0,
      };
      if (mode === 'create') {
        await clientsService.create(payload);
        toast.success('Cliente criado com sucesso');
      } else if (clientId) {
        await clientsService.update(clientId, payload);
        toast.success('Cliente atualizado com sucesso');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (mode === 'create') {
      setFormData(createEmptyFormData());
    } else if (clientId) {
      loadClientDetail(clientId);
    }
  };

  const updateField = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{mode === 'create' ? 'Cadastrar novo cliente' : 'Editar cliente'}</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
          <Button variant="outline" size="sm" disabled className="gap-1">
            <Pencil className="h-3.5 w-3.5" />
            Alterar
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={loading} className="gap-1">
            <Save className="h-3.5 w-3.5" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={loading} className="gap-1">
            <Undo2 className="h-3.5 w-3.5" />
            Desfazer
          </Button>
        </div>

        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center py-10 text-muted-foreground">
            Carregando dados do cliente...
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4">
              <TabsList className="h-auto p-0 bg-transparent border-b rounded-none">
                <TabsTrigger 
                  value="identificacao" 
                  className="data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-b-0 rounded-t px-4 py-1.5 text-sm"
                >
                  Identificação
                </TabsTrigger>
                <TabsTrigger 
                  value="complementares" 
                  className="data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-b-0 rounded-t px-4 py-1.5 text-sm"
                >
                  Dados complementares
                </TabsTrigger>
                <TabsTrigger 
                  value="comerciais" 
                  className="data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-b-0 rounded-t px-4 py-1.5 text-sm"
                >
                  Dados Comerciais
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* =================== Identificação =================== */}
              <TabsContent value="identificacao" className="m-0 space-y-4">
                {/* CNPJ / CPF row */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="CNPJ / CPF" required className="col-span-5">
                    <Input
                      className="h-8 text-sm flex-1"
                      value={formData.cnpjCpf}
                      onChange={(e) => {
                        updateField('cnpjCpf', e.target.value);
                        cnpjLookupRef.current?.(e.target.value);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => cnpjLookupRef.current?.(formData.cnpjCpf)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </FormRow>
                  <div className="col-span-3 flex items-center gap-2">
                    <Select value={formData.tipoCliente} onValueChange={(v) => updateField('tipoCliente', v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Cliente">Cliente</SelectItem>
                        <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                        <SelectItem value="Ambos">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Código</label>
                    <Input className="h-8 text-sm w-20" value={formData.codigoCliente} onChange={(e) => updateField('codigoCliente', e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-[108px]">
                  <Checkbox checked={formData.inativo} onCheckedChange={(c) => updateField('inativo', c as boolean)} />
                  <label className="text-sm">Cliente Inativo</label>
                </div>

                {/* Razão Social / Nome */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Razão Social/Nome" required className="col-span-8">
                    <Input className="h-8 text-sm flex-1" value={formData.razaoSocialNome} onChange={(e) => updateField('razaoSocialNome', e.target.value)} />
                  </FormRow>
                  <div className="col-span-4 flex items-center gap-2 justify-end">
                    <Checkbox checked={formData.simplesNacional} onCheckedChange={(c) => updateField('simplesNacional', c as boolean)} />
                    <label className="text-sm whitespace-nowrap">Simples nacional</label>
                  </div>
                </div>

                {/* Nome Fantasia */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Nome Fantasia" className="col-span-8">
                    <Input className="h-8 text-sm flex-1" value={formData.nomeFantasia} onChange={(e) => updateField('nomeFantasia', e.target.value)} />
                  </FormRow>
                  <div className="col-span-4 flex items-center gap-2 justify-end">
                    <Checkbox checked={formData.consumidorFinal} onCheckedChange={(c) => updateField('consumidorFinal', c as boolean)} />
                    <label className="text-sm whitespace-nowrap">Consumidor final</label>
                  </div>
                </div>

                {/* Inscr. estadual / Contribuinte / Suframa */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Inscr. estadual" className="col-span-4">
                    <Input className="h-8 text-sm flex-1" value={formData.inscEstadual} onChange={(e) => updateField('inscEstadual', e.target.value)} />
                  </FormRow>
                  <div className="col-span-4">
                    <Select value={formData.contribuinteIcm} onValueChange={(v) => updateField('contribuinteIcm', v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Contribuinte ICM">Contribuinte ICM</SelectItem>
                        <SelectItem value="Não contribuinte">Não contribuinte</SelectItem>
                        <SelectItem value="Isento">Isento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Suframa</label>
                    <Input className="h-8 text-sm flex-1" value={formData.suframa} onChange={(e) => updateField('suframa', e.target.value)} />
                  </div>
                </div>

                {/* Endereço Section */}
                <SectionHeader>Endereço</SectionHeader>
                
                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Cep" required className="col-span-4">
                    <Input className="h-8 text-sm w-24" value={formData.cep} onChange={(e) => updateField('cep', e.target.value)} placeholder="-" />
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Search className="h-4 w-4" />
                    </Button>
                  </FormRow>
                </div>

                <FormRow label="Endereço" required>
                  <Input className="h-8 text-sm flex-1" value={formData.endereco} onChange={(e) => updateField('endereco', e.target.value)} />
                </FormRow>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-2">
                    <Select value={formData.uf} onValueChange={(v) => updateField('uf', v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Input className="h-8 text-sm" placeholder="Cidade" value={formData.cidade} onChange={(e) => updateField('cidade', e.target.value)} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Bairro</label>
                  </div>
                  <div className="col-span-3">
                    <Input className="h-8 text-sm" value={formData.bairro} onChange={(e) => updateField('bairro', e.target.value)} />
                  </div>
                </div>

                <FormRow label="Complem.">
                  <Input className="h-8 text-sm w-80" value={formData.complemento} onChange={(e) => updateField('complemento', e.target.value)} />
                </FormRow>

                {/* Telefones Section */}
                <SectionHeader>Telefones</SectionHeader>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Fixo" required className="col-span-4">
                    <Input className="h-8 text-sm flex-1" placeholder="( )" value={formData.telefoneFixo} onChange={(e) => updateField('telefoneFixo', e.target.value)} />
                  </FormRow>
                  <div className="col-span-4 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Celular</label>
                    <Input className="h-8 text-sm flex-1" placeholder="( )" value={formData.celular} onChange={(e) => updateField('celular', e.target.value)} />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">WhatsApp</label>
                    <Input className="h-8 text-sm flex-1" placeholder="( )" value={formData.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} />
                  </div>
                </div>

                <FormRow label="Email">
                  <Input className="h-8 text-sm w-96" value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
                </FormRow>

                <FormRow label="Email Danfe">
                  <Input className="h-8 text-sm w-96" value={formData.emailDanfe} onChange={(e) => updateField('emailDanfe', e.target.value)} />
                </FormRow>

                <FormRow label="Site">
                  <Input className="h-8 text-sm w-96" value={formData.site} onChange={(e) => updateField('site', e.target.value)} />
                </FormRow>

                <FormRow label="Rota entrega" required>
                  <Select
                    value={formData.rotaId ? String(formData.rotaId) : ''}
                    onValueChange={(v) => updateField('rotaId', parseInt(v) || 0)}
                    disabled={rotasLoading}
                  >
                    <SelectTrigger className="h-8 text-sm w-80">
                      <SelectValue placeholder={rotasLoading ? 'Carregando...' : 'Selecione a rota'} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="0">Nenhuma</SelectItem>
                      {rotas.map((rota) => (
                        <SelectItem key={rota.id} value={String(rota.id)}>
                          {rota.codigo_rota ? `${rota.codigo_rota} - ${rota.label}` : rota.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              </TabsContent>

              {/* =================== Dados Complementares =================== */}
              <TabsContent value="complementares" className="m-0 space-y-4">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Proprietário" className="col-span-6">
                    <Input className="h-8 text-sm flex-1" value={formData.proprietario} onChange={(e) => updateField('proprietario', e.target.value)} />
                  </FormRow>
                  <div className="col-span-6 flex items-center gap-2 justify-end">
                    <label className="text-sm text-muted-foreground">Aniversário</label>
                    <Input type="date" className="h-8 text-sm w-40" value={formData.aniversario} onChange={(e) => updateField('aniversario', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="CPF" className="col-span-4">
                    <Input className="h-8 text-sm flex-1" value={formData.cpfProprietario} onChange={(e) => updateField('cpfProprietario', e.target.value)} />
                  </FormRow>
                  <div className="col-span-3 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">RG</label>
                    <Input className="h-8 text-sm flex-1" value={formData.rgProprietario} onChange={(e) => updateField('rgProprietario', e.target.value)} />
                  </div>
                  <div className="col-span-5 flex items-center gap-2 justify-end">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">Início de atividade</label>
                    <Input type="date" className="h-8 text-sm w-40" value={formData.inicioAtividade} onChange={(e) => updateField('inicioAtividade', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Endereço" className="col-span-7">
                    <Input className="h-8 text-sm flex-1" value={formData.enderecoComplementar} onChange={(e) => updateField('enderecoComplementar', e.target.value)} />
                  </FormRow>
                  <div className="col-span-5 flex items-center gap-2 justify-end">
                    <Checkbox checked={formData.enderecoParaEntrega} onCheckedChange={(c) => updateField('enderecoParaEntrega', c as boolean)} />
                    <label className="text-sm whitespace-nowrap">Endereço para entrega</label>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-2">
                    <Select value={formData.ufComplementar} onValueChange={(v) => updateField('ufComplementar', v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" placeholder="Cidade" value={formData.cidadeComplementar} onChange={(e) => updateField('cidadeComplementar', e.target.value)} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">CEP</label>
                    <Input className="h-8 text-sm" placeholder="-" value={formData.cepComplementar} onChange={(e) => updateField('cepComplementar', e.target.value)} />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Bairro</label>
                    <Input className="h-8 text-sm flex-1" value={formData.bairroComplementar} onChange={(e) => updateField('bairroComplementar', e.target.value)} />
                  </div>
                </div>

                <FormRow label="Email">
                  <Input className="h-8 text-sm w-80" value={formData.emailComplementar} onChange={(e) => updateField('emailComplementar', e.target.value)} />
                </FormRow>

                {/* Referências */}
                <SectionHeader>Referências</SectionHeader>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Banco" className="col-span-4">
                    <Input className="h-8 text-sm flex-1" value={formData.banco1} onChange={(e) => updateField('banco1', e.target.value)} />
                  </FormRow>
                  <div className="col-span-4 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Conta</label>
                    <Input className="h-8 text-sm flex-1" value={formData.conta1} onChange={(e) => updateField('conta1', e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" placeholder="Agência" value={formData.agencia1} onChange={(e) => updateField('agencia1', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4 ml-[108px]">
                    <Input className="h-8 text-sm" value={formData.banco2} onChange={(e) => updateField('banco2', e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" value={formData.conta2} onChange={(e) => updateField('conta2', e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <Input className="h-8 text-sm" value={formData.agencia2} onChange={(e) => updateField('agencia2', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-start mt-4">
                  <div className="col-span-6 space-y-2">
                    <label className="text-sm text-muted-foreground ml-[108px]">Referências Comerciais</label>
                    <Input className="h-8 text-sm ml-[108px]" value={formData.refComercial1} onChange={(e) => updateField('refComercial1', e.target.value)} />
                    <Input className="h-8 text-sm ml-[108px]" value={formData.refComercial2} onChange={(e) => updateField('refComercial2', e.target.value)} />
                    <Input className="h-8 text-sm ml-[108px]" value={formData.refComercial3} onChange={(e) => updateField('refComercial3', e.target.value)} />
                    <Input className="h-8 text-sm ml-[108px]" value={formData.refComercial4} onChange={(e) => updateField('refComercial4', e.target.value)} />
                  </div>
                  <div className="col-span-6 space-y-2">
                    <label className="text-sm text-muted-foreground">Sócios</label>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" value={formData.socio1Nome} onChange={(e) => updateField('socio1Nome', e.target.value)} />
                      <Input type="number" className="h-8 text-sm w-16 text-right" value={formData.socio1Perc} onChange={(e) => updateField('socio1Perc', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" value={formData.socio2Nome} onChange={(e) => updateField('socio2Nome', e.target.value)} />
                      <Input type="number" className="h-8 text-sm w-16 text-right" value={formData.socio2Perc} onChange={(e) => updateField('socio2Perc', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" value={formData.socio3Nome} onChange={(e) => updateField('socio3Nome', e.target.value)} />
                      <Input type="number" className="h-8 text-sm w-16 text-right" value={formData.socio3Perc} onChange={(e) => updateField('socio3Perc', parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>

                <FormRow label="Cap. social">
                  <Input className="h-8 text-sm flex-1" value={formData.capitalSocial} onChange={(e) => updateField('capitalSocial', e.target.value)} />
                </FormRow>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Contador" className="col-span-7">
                    <Input className="h-8 text-sm flex-1" value={formData.contador} onChange={(e) => updateField('contador', e.target.value)} />
                  </FormRow>
                  <div className="col-span-5 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Telefone</label>
                    <Input className="h-8 text-sm flex-1" placeholder="( )" value={formData.telefoneContador} onChange={(e) => updateField('telefoneContador', e.target.value)} />
                  </div>
                </div>

                {/* Cobrança */}
                <SectionHeader>Cobrança</SectionHeader>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Endereço" className="col-span-7">
                    <Input className="h-8 text-sm flex-1" value={formData.enderecoCobranca} onChange={(e) => updateField('enderecoCobranca', e.target.value)} />
                  </FormRow>
                  <div className="col-span-5 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Bairro</label>
                    <Input className="h-8 text-sm flex-1" value={formData.bairroCobranca} onChange={(e) => updateField('bairroCobranca', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-2 ml-[108px]">
                    <Select value={formData.ufCobranca} onValueChange={(v) => updateField('ufCobranca', v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Input className="h-8 text-sm" placeholder="Cidade" value={formData.cidadeCobranca} onChange={(e) => updateField('cidadeCobranca', e.target.value)} />
                  </div>
                  <div className="col-span-5 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">CEP</label>
                    <Input className="h-8 text-sm w-28" placeholder="-" value={formData.cepCobranca} onChange={(e) => updateField('cepCobranca', e.target.value)} />
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* =================== Dados Comerciais =================== */}
              <TabsContent value="comerciais" className="m-0 space-y-4">
                {/* Contatos */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Contatos" className="col-span-5">
                    <Input className="h-8 text-sm flex-1" value={formData.contato1Nome} onChange={(e) => updateField('contato1Nome', e.target.value)} />
                  </FormRow>
                  <div className="col-span-3 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Celular</label>
                    <Input className="h-8 text-sm flex-1" placeholder="( )" value={formData.contato1Celular} onChange={(e) => updateField('contato1Celular', e.target.value)} />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Aniversário</label>
                    <Input type="date" className="h-8 text-sm w-36" value={formData.contato1Aniversario} onChange={(e) => updateField('contato1Aniversario', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 ml-[108px]">
                    <Input className="h-8 text-sm" value={formData.contato2Nome} onChange={(e) => updateField('contato2Nome', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Input className="h-8 text-sm" placeholder="( )" value={formData.contato2Celular} onChange={(e) => updateField('contato2Celular', e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <Input type="date" className="h-8 text-sm w-36" value={formData.contato2Aniversario} onChange={(e) => updateField('contato2Aniversario', e.target.value)} />
                  </div>
                </div>

                {/* Classe / Nielsen / Rede / Checkouts / Dependência */}
                <div className="grid grid-cols-12 gap-3 items-center mt-4">
                  <FormRow label="Classe" required className="col-span-5">
                    <Select value={formData.classe} onValueChange={(v) => updateField('classe', v)}>
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormRow>
                  <div className="col-span-7 flex items-center gap-4 justify-end">
                    <label className="text-sm text-muted-foreground">Checkouts</label>
                    <Input type="number" className="h-8 text-sm w-20 text-right" value={formData.checkouts} onChange={(e) => updateField('checkouts', parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Nielsen" className="col-span-5">
                    <Select value={formData.nielsen} onValueChange={(v) => updateField('nielsen', v)}>
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormRow>
                  <div className="col-span-7 flex items-center gap-4 justify-end">
                    <label className="text-sm text-muted-foreground">Dependência</label>
                    <Input type="number" className="h-8 text-sm w-20 text-right" value={formData.dependencia} onChange={(e) => updateField('dependencia', parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Rede" className="col-span-5">
                    <Select value={formData.rede} onValueChange={(v) => updateField('rede', v)}>
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="propria">Própria</SelectItem>
                        <SelectItem value="associada">Associada</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormRow>
                </div>

                {/* Tabelas de preços / Permite venda */}
                <div className="grid grid-cols-12 gap-3 items-center mt-4">
                  <FormRow label="Tabelas de preços" required className="col-span-6">
                    <Input className="h-8 text-sm w-32" value={formData.tabelaPrecos} onChange={(e) => updateField('tabelaPrecos', e.target.value)} />
                    <Select value={formData.tabelaPrecosId} onValueChange={(v) => updateField('tabelaPrecosId', v)}>
                      <SelectTrigger className="h-8 text-sm w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormRow>
                  <div className="col-span-6 flex items-center gap-2 justify-end">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">Permite venda nas empresas (ex: 01,02..)</label>
                    <Input className="h-8 text-sm w-48" value={formData.permiteVendaEmpresas} onChange={(e) => updateField('permiteVendaEmpresas', e.target.value)} />
                  </div>
                </div>

                {/* Representante */}
                <FormRow label="Representante" required>
                  <Select value={formData.representante} onValueChange={(v) => updateField('representante', v)}>
                    <SelectTrigger className="h-8 text-sm w-80">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="rep1">Representante 1</SelectItem>
                      <SelectItem value="rep2">Representante 2</SelectItem>
                    </SelectContent>
                  </Select>
                </FormRow>

                {/* Prazo máximo / Descontos */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <FormRow label="Prazo máximo liberado" className="col-span-6">
                    <Select value={formData.prazoMaximoLiberado} onValueChange={(v) => updateField('prazoMaximoLiberado', v)}>
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="30/40/50 DD">30/40/50 DD</SelectItem>
                        <SelectItem value="30/60/90 DD">30/60/90 DD</SelectItem>
                        <SelectItem value="A VISTA">A VISTA</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormRow>
                  <div className="col-span-6 flex items-center gap-2 justify-end">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">% Desconto máximo na nota fiscal</label>
                    <Input type="number" className="h-8 text-sm w-20 text-right" value={formData.descontoMaximoNotaFiscal.toFixed(2)} onChange={(e) => updateField('descontoMaximoNotaFiscal', parseFloat(e.target.value) || 0)} />
                    <span className="text-sm">(%)</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6 ml-[108px] flex items-center gap-2">
                    <Checkbox checked={formData.boletoBancario} onCheckedChange={(c) => updateField('boletoBancario', c as boolean)} />
                    <label className="text-sm">Boleto bancário</label>
                  </div>
                  <div className="col-span-6 flex items-center gap-2 justify-end">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">% Despesas nota fiscal</label>
                    <Input type="number" className="h-8 text-sm w-20 text-right" value={formData.despesasNotaFiscal.toFixed(2)} onChange={(e) => updateField('despesasNotaFiscal', parseFloat(e.target.value) || 0)} />
                    <span className="text-sm">(%)</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6"></div>
                  <div className="col-span-6 flex items-center gap-2 justify-end">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">% Frete nota fiscal</label>
                    <Input type="number" className="h-8 text-sm w-20 text-right" value={formData.freteNotaFiscal.toFixed(2)} onChange={(e) => updateField('freteNotaFiscal', parseFloat(e.target.value) || 0)} />
                    <span className="text-sm">(%)</span>
                  </div>
                </div>

                {/* B2B */}
                <div className="grid grid-cols-12 gap-3 items-center mt-4">
                  <div className="col-span-12 flex items-center gap-4">
                    <Checkbox checked={formData.liberadoVendaB2B} onCheckedChange={(c) => updateField('liberadoVendaB2B', c as boolean)} />
                    <label className="text-sm">Liberado venda no B2B</label>
                    <label className="text-sm text-muted-foreground ml-4">Senha B2B</label>
                    <Input className="h-8 text-sm w-40" value={formData.senhaB2B} onChange={(e) => updateField('senhaB2B', e.target.value)} />
                    <label className="text-sm text-muted-foreground">Tabela B2B</label>
                    <Select value={formData.tabelaB2B} onValueChange={(v) => updateField('tabelaB2B', v)}>
                      <SelectTrigger className="h-8 text-sm w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observação */}
                <div className="mt-4 border-t pt-4">
                  <FormRow label="Obs.">
                    <Textarea 
                      className="flex-1 min-h-[100px] text-sm" 
                      value={formData.observacao} 
                      onChange={(e) => updateField('observacao', e.target.value)} 
                    />
                  </FormRow>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}

        {error && <div className="text-sm text-destructive px-4 pb-2">{error}</div>}
      </DialogContent>
    </Dialog>
  );
};
