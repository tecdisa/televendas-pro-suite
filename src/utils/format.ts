export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (date: string): string => {
  // Datas vindas do backend (ex.: "2026-07-15" ou "2026-07-15T00:00:00.000Z") representam
  // um dia-calendário sem horário. Usar new Date(date).toLocaleDateString() interpreta a
  // string como meia-noite UTC e depois formata no fuso local do navegador, o que pode
  // exibir o dia anterior (ex.: 14/07 em vez de 15/07) em fusos atrás de UTC.
  // Por isso lemos os componentes em UTC em vez de local.
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const year = parsed.getUTCFullYear();
  return `${day}/${month}/${year}`;
};
