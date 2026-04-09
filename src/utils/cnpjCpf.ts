const NON_ALNUM_DOCUMENT_REGEX = /[^0-9A-Z]+/g;
const ONLY_DIGITS_REGEX = /^\d+$/;

const applyMask = (
  value: string,
  groups: readonly number[],
  separators: readonly string[],
) => {
  if (!value) return '';

  let cursor = 0;
  let masked = '';

  for (let index = 0; index < groups.length && cursor < value.length; index += 1) {
    const groupSize = groups[index];
    const piece = value.slice(cursor, cursor + groupSize);

    if (!piece) break;

    masked += piece;
    cursor += piece.length;

    if (
      piece.length === groupSize &&
      cursor < value.length &&
      separators[index]
    ) {
      masked += separators[index];
    }
  }

  return masked;
};

export const stripDocumentMask = (
  value: string | number | null | undefined,
): string =>
  String(value ?? '')
    .toUpperCase()
    .replace(NON_ALNUM_DOCUMENT_REGEX, '');

export const isDigitsOnlyDocument = (value: string): boolean =>
  ONLY_DIGITS_REGEX.test(value);

export const normalizeCnpjCpf = (
  value: string | number | null | undefined,
): string => {
  const cleaned = stripDocumentMask(value);
  if (!cleaned) return '';

  if (isDigitsOnlyDocument(cleaned) && cleaned.length <= 11) {
    return cleaned.slice(0, 11);
  }

  return cleaned.slice(0, 14);
};

export const formatCnpjCpf = (
  value: string | number | null | undefined,
): string => {
  const normalized = normalizeCnpjCpf(value);
  if (!normalized) return '';

  if (isDigitsOnlyDocument(normalized) && normalized.length <= 11) {
    return applyMask(normalized, [3, 3, 3, 2], ['.', '.', '-']);
  }

  return applyMask(normalized, [2, 3, 3, 4, 2], ['.', '.', '/', '-']);
};

export const isNumericCnpj = (
  value: string | number | null | undefined,
): boolean => {
  const normalized = normalizeCnpjCpf(value);
  return normalized.length === 14 && isDigitsOnlyDocument(normalized);
};
