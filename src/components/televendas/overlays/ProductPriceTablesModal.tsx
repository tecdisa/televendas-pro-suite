import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';
import { formatCurrency } from '@/utils/format';

export interface ProductPriceTableEntry {
  empresaId: number;
  tabelaPrecoId: number;
  codigoTabela: string;
  descricaoTabela: string;
  preco: number;
  precoAplicado: number;
  descontoMaximo: number;
  comissao: number;
  prazoMedio: number;
  somenteVendaAvista: boolean;
  pedidoMinimo: number;
  indiceFinanceiro: number;
  validade: string | null;
  formaPagtoId: number | null;
  prazoPagtoId: number | null;
  permiteBonificacao: boolean;
  permiteDebitoCredito: boolean;
  permiteVendaEspecial: boolean;
  produtoEmPromocao: boolean;
  quantidadeMinima: number;
  inativo: boolean;
}

interface ProductPriceTablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productDescription?: string;
  data: ProductPriceTableEntry[];
}

export async function fetchProductPriceTables(produtoId: number): Promise<ProductPriceTableEntry[]> {
  const empresa = authService.getEmpresa();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  const token = authService.getToken();
  if (!token) return Promise.reject('Token ausente');

  try {
    const url = `${API_BASE}/api/produtos/${encodeURIComponent(produtoId)}/tabelas-precos?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    const res = await apiClient.fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      let message = 'Erro ao buscar tabelas de preço do produto';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }
    const data = await res.json();
    const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    
    return arr.map((raw: any): ProductPriceTableEntry => ({
      empresaId: Number(raw?.empresa_id ?? 0),
      tabelaPrecoId: Number(raw?.tabela_preco_id ?? 0),
      codigoTabela: String(raw?.codigo_tabela_preco ?? '').trim(),
      descricaoTabela: String(raw?.descricao_tabela_preco ?? '').trim(),
      preco: Number(raw?.preco ?? 0),
      precoAplicado: Number(raw?.preco_aplicado ?? 0),
      descontoMaximo: Number(raw?.desconto_maximo ?? 0),
      comissao: Number(raw?.comissao ?? 0),
      prazoMedio: Number(raw?.prazo_medio ?? 0),
      somenteVendaAvista: Boolean(raw?.somente_venda_avista ?? false),
      pedidoMinimo: Number(raw?.pedido_minimo ?? 0),
      indiceFinanceiro: Number(raw?.indice_financeiro ?? 0),
      validade: raw?.validade ?? null,
      formaPagtoId: raw?.forma_pagto_id ?? null,
      prazoPagtoId: raw?.prazo_pagto_id ?? null,
      permiteBonificacao: Boolean(raw?.permite_bonificacao ?? false),
      permiteDebitoCredito: Boolean(raw?.permite_debito_credito ?? false),
      permiteVendaEspecial: Boolean(raw?.permite_venda_especial ?? false),
      produtoEmPromocao: Boolean(raw?.produto_em_promocao ?? false),
      quantidadeMinima: Number(raw?.quantidade_minima ?? 0),
      inativo: Boolean(raw?.inativo ?? false),
    })).filter((entry: ProductPriceTableEntry) => !entry.inativo);
  } catch (e) {
    return Promise.reject('Erro de conexão ao buscar tabelas de preço');
  }
}

export const ProductPriceTablesModal = ({
  open,
  onOpenChange,
  productDescription,
  data,
}: ProductPriceTablesModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            Tabelas de Preços
            {productDescription && (
              <span className="ml-2 font-normal text-sm text-muted-foreground">
                - {productDescription}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-lg">
          {data.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma tabela de preço encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[70px] text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[150px]">Descrição</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[90px]">Preço</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[80px]">Desc.Máx%</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[70px]">Com.%</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-[70px]">Venda Esp.</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-[50px]">Bonif.</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-[50px]">D/C</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry, idx) => (
                  <TableRow key={`${entry.tabelaPrecoId}-${idx}`} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono py-1.5">
                      {entry.codigoTabela}
                    </TableCell>
                    <TableCell className="text-xs py-1.5">{entry.descricaoTabela}</TableCell>
                    <TableCell className="text-xs text-right py-1.5 font-mono">
                      {formatCurrency(entry.precoAplicado)}
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5 font-mono">
                      {entry.descontoMaximo.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5 font-mono">
                      {entry.comissao.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      <Checkbox checked={entry.permiteVendaEspecial} disabled className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      <Checkbox checked={entry.permiteBonificacao} disabled className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      <Checkbox checked={entry.permiteDebitoCredito} disabled className="h-4 w-4" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
