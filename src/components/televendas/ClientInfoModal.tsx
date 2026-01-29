import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { clientsService } from '@/services/clientsService';
import { metadataService } from '@/services/metadataService';

interface ClientInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: number;
}

interface ClientDetail {
  // Identificação
  codigo?: string;
  inativo?: boolean;
  cnpjCpf?: string;
  inscEstadual?: string;
  inscMunicipal?: string;
  rg?: string;
  nome?: string;
  fantasia?: string;
  endereco?: string;
  uf?: string;
  cidade?: string;
  bairro?: string;
  complemento?: string;
  cep?: string;
  telefone?: string;
  fax?: string;
  email?: string;
  site?: string;
  rota?: string;
  
  // Comercial
  contatos?: Array<{ nome?: string; celular?: string; aniversario?: string }>;
  segmento?: string;
  checkouts?: number;
  nielsen?: string;
  rede?: string;
  tabelas?: string;
  descontoFinanceiroBoleto?: number;
  observacaoComercial?: string;
  
  // Financeiro
  credito?: string;
  boleto?: boolean;
  prazo?: string;
  limite?: number;
  aberto?: number;
  disponivel?: number;
  observacaoFinanceiro?: string;
  
  // Itinerário
  representantes?: Array<{ id?: string | number; nome?: string }>;
}

type TabelaPreco = {
  id?: string | number;
  codigo?: string;
  descricao?: string;
  principal?: boolean;
};

const normalizeKey = (value: any) => String(value ?? '').trim();
const formatLabel = (codigo?: string | number | null, descricao?: string | null) => {
  const desc = String(descricao ?? '').trim();
  if (!desc) return '';
  const code = String(codigo ?? '').trim();
  return code ? `${code} - ${desc}` : desc;
};
const findByIdOrCodigo = (list: Array<{ id?: any; codigo?: any }>, value: any) => {
  const key = normalizeKey(value);
  if (!key) return undefined;
  return list.find((item) => normalizeKey(item.id) === key || normalizeKey(item.codigo) === key);
};

const ReadOnlyField = ({ label, value, className = '' }: { label: string; value?: string | number | null; className?: string }) => (
  <div className={className}>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    <Input 
      readOnly 
      value={value ?? ''} 
      className="h-8 text-sm bg-muted/30 cursor-default" 
    />
  </div>
);

export const ClientInfoModal = ({ open, onOpenChange, clienteId }: ClientInfoModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClientDetail | null>(null);
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);
  const [tabelasError, setTabelasError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clienteId) return;
    
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      setTabelasError(null);
      setTabelas([]);
      try {
        const [
          raw,
          tabelasRaw,
          segmentos,
          redes,
          prazos,
          rotas,
          tabelasMeta,
        ] = await Promise.all([
          clientsService.getDetail(clienteId),
          clientsService.getTabelasPrecos(clienteId).catch((e) => {
            setTabelasError(String(e) || 'Erro ao carregar tabelas de preço');
            return [];
          }),
          metadataService.getSegmentosVendas().catch(() => []),
          metadataService.getRedes().catch(() => []),
          metadataService.getPrazos().catch(() => []),
          metadataService.getRotas().catch(() => []),
          metadataService.getTabelas().catch(() => []),
        ]);
        const segmentoId = raw?.segmento_id ?? raw?.segmentoId ?? raw?.segmento;
        const segmentoDesc =
          raw?.segmento?.descricao ??
          raw?.segmento?.descricao_segmento ??
          raw?.segmento_descricao ??
          raw?.segmentoDescricao ??
          '';
        const segmentoMatch = findByIdOrCodigo(segmentos, segmentoId);
        const segmentoLabel =
          segmentoDesc ||
          (segmentoMatch ? formatLabel(segmentoMatch.codigo, segmentoMatch.descricao) : '') ||
          (segmentoId ? `Segmento ${segmentoId}` : '');

        const redeId = raw?.rede_id ?? raw?.redeId ?? raw?.rede;
        const redeDesc =
          raw?.rede?.descricao ??
          raw?.rede?.descricao_rede ??
          raw?.rede_descricao ??
          raw?.redeDescricao ??
          '';
        const redeMatch = findByIdOrCodigo(redes, redeId);
        const redeLabel =
          redeDesc ||
          (redeMatch ? formatLabel(redeMatch.codigo, redeMatch.descricao) : '') ||
          (redeId ? `Rede ${redeId}` : '');

        const prazoId =
          raw?.prazo_pagto_id ??
          raw?.prazoPagtoId ??
          raw?.prazo_pagto ??
          raw?.prazo;
        const prazoDesc =
          raw?.prazo?.descricao ??
          raw?.prazo?.descricao_prazo_pagto ??
          raw?.prazo_descricao ??
          raw?.prazoDescricao ??
          '';
        const prazoMatch = findByIdOrCodigo(prazos, prazoId);
        const prazoLabel =
          prazoDesc ||
          (prazoMatch ? formatLabel(prazoMatch.codigo, prazoMatch.descricao) : '') ||
          (prazoId ? `Prazo ${prazoId}` : '');

        const rotaDesc =
          raw?.rota?.descricao_rota ??
          raw?.rota?.descricao ??
          raw?.rota_descricao ??
          '';
        const rotaId = raw?.rota_id ?? raw?.rotaId ?? raw?.rota;
        const rotaMatch = Array.isArray(rotas)
          ? rotas.find((r) =>
              normalizeKey(r.id) === normalizeKey(rotaId) ||
              normalizeKey(r.codigo_rota) === normalizeKey(rotaId)
            )
          : undefined;
        const rotaLabel = rotaDesc
          ? (raw?.rota?.codigo_rota ? `${raw.rota.codigo_rota} - ${String(rotaDesc).trim()}` : String(rotaDesc).trim())
          : rotaMatch
            ? (rotaMatch.codigo_rota ? `${rotaMatch.codigo_rota} - ${rotaMatch.label}` : rotaMatch.label)
            : (rotaId ? `Rota ${rotaId}` : '');

        const b2bTabelaId = raw?.b2b_tabela_id ?? raw?.b2bTabelaId ?? raw?.b2bTabela;
        const b2bTabelaDesc =
          raw?.b2b_tabela?.descricao ??
          raw?.b2b_tabela_descricao ??
          raw?.tabela_descricao ??
          raw?.b2bTabelaDescricao ??
          '';
        const b2bTabelaMatch = findByIdOrCodigo(tabelasMeta, b2bTabelaId);
        const b2bTabelaLabel =
          b2bTabelaDesc ||
          (b2bTabelaMatch ? formatLabel(b2bTabelaMatch.codigo, b2bTabelaMatch.descricao) : '') ||
          (b2bTabelaId ? `Tabela ${b2bTabelaId}` : '');
        // Normalize data from API
        const detail: ClientDetail = {
          // Identificação
          codigo: raw?.codigo_cliente ?? raw?.codigo ?? raw?.codigoCliente ?? '',
          inativo: raw?.inativo ?? false,
          cnpjCpf: raw?.cnpj_cpf ?? raw?.cnpjCpf ?? '',
          inscEstadual: raw?.inscricao_estadual ?? raw?.insc_estadual ?? raw?.inscEstadual ?? '',
          inscMunicipal: raw?.inscricao_municipal ?? raw?.insc_municipal ?? raw?.inscMunicipal ?? '',
          rg: raw?.rg ?? '',
          nome: raw?.nome ?? '',
          fantasia: raw?.fantasia ?? '',
          endereco: raw?.endereco ? `${raw.endereco}${raw.numero ? ', ' + raw.numero : ''}` : '',
          uf: raw?.uf ?? '',
          cidade: raw?.cidade ?? '',
          bairro: raw?.bairro ?? '',
          complemento: raw?.complemento ?? '',
          cep: raw?.cep ?? '',
          telefone: raw?.fone ?? raw?.telefone ?? '',
          fax: raw?.fax ?? '',
          email: raw?.email ?? '',
          site: raw?.site ?? '',
          rota: rotaLabel,
          
          // Comercial
          contatos: raw?.comprador_nome ? [{
            nome: raw.comprador_nome,
            celular: raw?.celular ?? raw?.whatsapp ?? raw?.comprador_fone ?? '',
            aniversario: raw?.comprador_data_nascimento ?? '',
          }] : [],
          segmento: segmentoLabel,
          checkouts: raw?.checkouts ?? 0,
          nielsen: raw?.nielsen ?? '',
          rede: redeLabel,
          tabelas: b2bTabelaLabel,
          descontoFinanceiroBoleto: raw?.desconto_financeiro_boleto ?? raw?.descontoFinanceiroBoleto ?? 0,
          observacaoComercial: raw?.observacao_comercial ?? raw?.observacaoComercial ?? raw?.observacao ?? '',
          
          // Financeiro
          credito: raw?.b2b_liberado ? 'Liberado' : 'Bloqueado',
          boleto: raw?.boleto ?? raw?.usa_boleto ?? false,
          prazo: prazoLabel,
          limite: raw?.limite_credito ?? raw?.limite ?? 0,
          aberto: raw?.aberto ?? raw?.valor_aberto ?? 0,
          disponivel: raw?.disponivel ?? raw?.limite_disponivel ?? 0,
          observacaoFinanceiro: raw?.observacao_financeiro ?? raw?.observacaoFinanceiro ?? '',
          
          // Itinerário
          representantes: Array.isArray(raw?.representantes) ? raw.representantes.map((r: any) => ({
            id: r?.codigo_representante ?? r?.id ?? '',
            nome: r?.nome ?? '',
          })) : [],
        };
        setData(detail);
        const tabelasParsed = Array.isArray(tabelasRaw) ? tabelasRaw : [];
        setTabelas(tabelasParsed.map((t: any) => ({
          id: t?.tabela_preco_id ?? t?.id ?? t?.tabela_id ?? '',
          codigo: t?.codigo_tabela_preco ?? t?.codigo ?? t?.cod ?? '',
          descricao: (t?.descricao_tabela_preco ?? t?.descricao ?? t?.tabela ?? '').toString().trim(),
          principal: Boolean(t?.principal ?? false),
        })));
      } catch (e: any) {
        setError(String(e) || 'Erro ao carregar dados do cliente');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [open, clienteId]);

  const formatCurrency = (value?: number) => {
    if (value == null) return '';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Informações Cadastrais</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">{error}</div>
        ) : (
          <Tabs defaultValue="identificacao" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="itinerario">Representantes</TabsTrigger>
              <TabsTrigger value="tabelas">Tabelas</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              {/* Identificação */}
              <TabsContent value="identificacao" className="m-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="Código" value={data?.codigo} />
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox checked={data?.inativo ?? false} disabled />
                    <label className="text-sm">Inativo</label>
                  </div>
                  <ReadOnlyField label="CNPJ/CPF" value={data?.cnpjCpf} className="col-span-1" />
                  <ReadOnlyField label="Insc. Est." value={data?.inscEstadual} />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="Nome" value={data?.nome} className="col-span-2 md:col-span-3" />
                  <ReadOnlyField label="Insc. Mun." value={data?.inscMunicipal} />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="Fantasia" value={data?.fantasia} className="col-span-2 md:col-span-3" />
                  <ReadOnlyField label="RG" value={data?.rg} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="Endereço" value={data?.endereco} className="md:col-span-3" />
                  <ReadOnlyField label="Bairro" value={data?.bairro} />
                </div>
                
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="UF" value={data?.uf} className="col-span-1" />
                  <ReadOnlyField label="Cidade" value={data?.cidade} className="col-span-2" />
                  <ReadOnlyField label="CEP" value={data?.cep} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ReadOnlyField label="Complemento" value={data?.complemento} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <ReadOnlyField label="Telefone" value={data?.telefone} />
                  <ReadOnlyField label="Fax" value={data?.fax} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ReadOnlyField label="Email" value={data?.email} />
                  <ReadOnlyField label="Site" value={data?.site} />
                </div>
                
                <ReadOnlyField label="Rota" value={data?.rota} />
              </TabsContent>

              {/* Comercial */}
              <TabsContent value="comercial" className="m-0 space-y-4">
                {(data?.contatos && data.contatos.length > 0) && (
                  <div className="space-y-2">
                    {data.contatos.slice(0, 2).map((contato, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-3">
                        <ReadOnlyField label={idx === 0 ? "Contatos" : ""} value={contato.nome} />
                        <ReadOnlyField label={idx === 0 ? "Celular" : ""} value={contato.celular} />
                        <ReadOnlyField label={idx === 0 ? "Aniversário" : ""} value={contato.aniversario} />
                      </div>
                    ))}
                  </div>
                )}
                
                {(!data?.contatos || data.contatos.length === 0) && (
                  <div className="grid grid-cols-3 gap-3">
                    <ReadOnlyField label="Contatos" value="" />
                    <ReadOnlyField label="Celular" value="" />
                    <ReadOnlyField label="Aniversário" value="" />
                  </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ReadOnlyField label="Segmentos" value={data?.segmento} className="md:col-span-2" />
                  <ReadOnlyField label="Checkouts" value={data?.checkouts} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ReadOnlyField label="Nielsen" value={data?.nielsen} />
                  <ReadOnlyField label="Rede" value={data?.rede} />
                </div>
                
                <ReadOnlyField label="Tabelas" value={data?.tabelas} />
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
                  <Textarea 
                    readOnly 
                    value={data?.observacaoComercial ?? ''} 
                    className="min-h-[120px] text-sm bg-muted/30 cursor-default resize-none"
                  />
                </div>
              </TabsContent>

              {/* Financeiro */}
              <TabsContent value="financeiro" className="m-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <ReadOnlyField label="Crédito" value={data?.credito} />
                  <div className="flex items-center gap-2 pb-1">
                    <Checkbox checked={data?.boleto ?? false} disabled />
                    <label className="text-sm">Boleto</label>
                  </div>
                  <ReadOnlyField label="Prazo" value={data?.prazo} />
                  <div className="flex items-end gap-2">
                    <ReadOnlyField label="Desc. fin. boleto" value={formatCurrency(data?.descontoFinanceiroBoleto)} className="flex-1" />
                    <span className="text-sm pb-2">(%)</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:justify-end">
                  <div className="md:col-start-3">
                    <ReadOnlyField label="Limite" value={formatCurrency(data?.limite)} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-start-3">
                    <ReadOnlyField label="Aberto" value={formatCurrency(data?.aberto)} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-start-3">
                    <ReadOnlyField label="Disponível" value={formatCurrency(data?.disponivel)} />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
                  <Textarea 
                    readOnly 
                    value={data?.observacaoFinanceiro ?? ''} 
                    className="min-h-[150px] text-sm bg-muted/30 cursor-default resize-none"
                  />
                </div>
              </TabsContent>

              {/* Itinerário */}
              <TabsContent value="itinerario" className="m-0">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Repr_id</TableHead>
                        <TableHead>Nome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.representantes && data.representantes.length > 0) ? (
                        data.representantes.map((rep, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{rep.id}</TableCell>
                            <TableCell>{rep.nome}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                            Nenhum representante cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Tabelas de preço */}
              <TabsContent value="tabelas" className="m-0">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-24 text-right">Principal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabelasError ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-destructive">
                            {tabelasError}
                          </TableCell>
                        </TableRow>
                      ) : (tabelas && tabelas.length > 0) ? (
                        tabelas.map((t, idx) => (
                          <TableRow key={`${t.id ?? idx}`}>
                            <TableCell className="font-mono text-xs">{t.codigo || t.id || '-'}</TableCell>
                            <TableCell>{t.descricao || '-'}</TableCell>
                            <TableCell className="text-right">
                              <span className={`text-xs px-2 py-0.5 rounded ${t.principal ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                {t.principal ? 'Sim' : 'Não'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                            Nenhuma tabela de preço cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
