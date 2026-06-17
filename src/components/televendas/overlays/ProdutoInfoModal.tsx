import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';
import { productsService } from '@/services/productsService';
import type { Product } from '@/services/productsService';
import { ProdutoAlterarPrecoModal } from './ProdutoAlterarPrecoModal';

interface ProdutoInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtoId: number;
}

const ReadOnlyField = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) => (
  <div className={className}>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    <Input readOnly value={value ?? ''} className="h-8 text-sm bg-muted/30 cursor-default" />
  </div>
);

const formatDecimal = (value?: number | null, decimals = 3) => {
  if (value === null || value === undefined) return '';
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return '';
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
};

export const ProdutoInfoModal = ({ open, onOpenChange, produtoId }: ProdutoInfoModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Product | null>(null);
  const [precoModalOpen, setPrecoModalOpen] = useState(false);

  useEffect(() => {
    if (!open || !produtoId) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const produto = await productsService.getCadastroById(produtoId);
        setData(produto);
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar produto');
      } finally {
        setLoading(false);
      }
    };
    void fetchDetail();
  }, [open, produtoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle>
              {data ? `${data.codigoProduto ?? ''} — ${data.descricao}` : 'Produto'}
            </DialogTitle>
            {data && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setPrecoModalOpen(true)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Alterar preços
              </Button>
            )}
          </div>
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
          <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
              <TabsTrigger value="estoque">Estoque / Custos</TabsTrigger>
              <TabsTrigger value="kit">
                Kit {data?.kitItens && data.kitItens.length > 0 ? `(${data.kitItens.length})` : ''}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              {/* Geral */}
              <TabsContent value="geral" className="m-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <ReadOnlyField label="Código" value={data?.codigoProduto} />
                  <ReadOnlyField label="UN" value={data?.un} />
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox checked={!(data?.inativo ?? false)} disabled />
                    <label className="text-sm">Ativo</label>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox checked={data?.lancamento ?? false} disabled />
                    <label className="text-sm">Lançamento</label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <ReadOnlyField label="Descrição" value={data?.descricao} className="md:col-span-2" />
                  <ReadOnlyField label="Apresentação" value={data?.apresentacao} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="Marca" value={data?.marca} className="md:col-span-2" />
                  <ReadOnlyField label="Código fábrica" value={data?.codigoFabrica} />
                  <ReadOnlyField label="EAN13" value={data?.ean13} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="DUN14" value={data?.dun14} />
                  <ReadOnlyField label="Princípio ativo" value={data?.principioAtivo} className="md:col-span-2" />
                  <ReadOnlyField label="Cadastrado em" value={formatDate((data as any)?.data_cadastro)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ReadOnlyField label="Fornecedor" value={data?.fornecedor} />
                  <ReadOnlyField label="Divisão" value={data?.divisaoDescricao ?? data?.categoria} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <ReadOnlyField label="Múltiplo de vendas" value={data?.multiploDeVendas} />
                  <ReadOnlyField label="Fator compra" value={data?.fatorCompra} />
                  <ReadOnlyField label="Fator venda" value={data?.fatorVenda} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ReadOnlyField label="Peso bruto (kg)" value={formatDecimal(data?.pesoBruto)} />
                  <ReadOnlyField label="Peso líquido (kg)" value={formatDecimal(data?.pesoLiquido)} />
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox checked={data?.permiteVendaB2b ?? false} disabled />
                    <label className="text-sm">Permite B2B</label>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox checked={data?.permiteVendaB2c ?? false} disabled />
                    <label className="text-sm">Permite B2C</label>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox checked={data?.controlaLote ?? false} disabled />
                    <label className="text-sm">Controla lote</label>
                  </div>
                </div>

                {data?.descricaoComplementar && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Descrição complementar
                    </label>
                    <Textarea
                      readOnly
                      value={data.descricaoComplementar}
                      className="min-h-[80px] text-sm bg-muted/30 cursor-default resize-none"
                    />
                  </div>
                )}
              </TabsContent>

              {/* Fiscal */}
              <TabsContent value="fiscal" className="m-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="NCM" value={data?.ncm} />
                  <ReadOnlyField label="CEST" value={data?.cest} />
                  <ReadOnlyField label="Origem" value={data?.origemProduto} />
                  <ReadOnlyField label="Tipo item" value={data?.tipoItem} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="CST" value={data?.cst} />
                  <ReadOnlyField label="CSOSN" value={data?.csosn} />
                  <ReadOnlyField label="Sit. ICMS" value={data?.codigoSituacaoIcms} />
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox checked={data?.repasseIcms ?? false} disabled />
                    <label className="text-sm">Repasse ICMS</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="Alíq. ICMS (%)" value={formatDecimal(data?.aliquotaIcms, 2)} />
                  <ReadOnlyField label="Alíq. ICMS crédito (%)" value={formatDecimal(data?.aliquotaIcmsCredito, 2)} />
                  <ReadOnlyField label="FCP (%)" value={formatDecimal(data?.pfcp, 2)} />
                  <ReadOnlyField label="Pauta ICMS" value={formatCurrency(data?.pautaIcms)} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="Redução ST (%)" value={formatDecimal(data?.reducaoSt, 2)} />
                  <ReadOnlyField label="Redução convênio (%)" value={formatDecimal(data?.reducaoConvenio, 2)} />
                  <ReadOnlyField label="CST PIS" value={data?.cstPis} />
                  <ReadOnlyField label="CST COFINS" value={data?.cstCofins} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="Alíq. PIS (%)" value={formatDecimal(data?.aliquotaPis, 2)} />
                  <ReadOnlyField label="Alíq. COFINS (%)" value={formatDecimal(data?.aliquotaCofins, 2)} />
                  <ReadOnlyField label="IBS/CBS" value={data?.ibsCbs} />
                  <ReadOnlyField label="Classif. trib." value={data?.ibsCbsClassifTrib} />
                </div>

                {data?.mensagemNotaFiscal && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Mensagem nota fiscal
                    </label>
                    <Textarea
                      readOnly
                      value={data.mensagemNotaFiscal}
                      className="min-h-[80px] text-sm bg-muted/30 cursor-default resize-none"
                    />
                  </div>
                )}
              </TabsContent>

              {/* Estoque / Custos */}
              <TabsContent value="estoque" className="m-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ReadOnlyField label="Estoque" value={formatDecimal(data?.estoque)} />
                  <ReadOnlyField label="Qtd reservada" value={formatDecimal(data?.quantidadeReservada)} />
                  <ReadOnlyField
                    label="Disponível"
                    value={formatDecimal(
                      data?.disponivel ?? ((data?.estoque ?? 0) - (data?.quantidadeReservada ?? 0)),
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ReadOnlyField label="Custo médio" value={formatCurrency(data?.custoMedio)} />
                  <ReadOnlyField label="Custo nota" value={formatCurrency(data?.custoNota)} />
                  <ReadOnlyField label="Custo compra" value={formatCurrency(data?.custoCompra)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ReadOnlyField
                    label="Preço nac. consumidor"
                    value={formatCurrency(data?.precoNacionalConsumidor)}
                  />
                  <ReadOnlyField label="Preço fábrica" value={formatCurrency(data?.precoFabrica)} />
                </div>
              </TabsContent>

              {/* Kit */}
              <TabsContent value="kit" className="m-0">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-20">UN</TableHead>
                        <TableHead className="w-28 text-right">Quantidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.kitItens && data.kitItens.length > 0 ? (
                        data.kitItens.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">
                              {item.codigoProduto || item.produtoItemId || '-'}
                            </TableCell>
                            <TableCell>{item.descricao || '-'}</TableCell>
                            <TableCell>{item.un || '-'}</TableCell>
                            <TableCell className="text-right">
                              {formatDecimal(Number(item.quantidade))}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-sm text-muted-foreground"
                          >
                            Produto não possui itens de kit
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

      <ProdutoAlterarPrecoModal
        open={precoModalOpen}
        onOpenChange={setPrecoModalOpen}
        produto={data}
      />
    </Dialog>
  );
};
