const NON_ALNUM_DOCUMENT_REGEX = /[^0-9A-Z]+/g;
const ONLY_DIGITS_REGEX = /^\d+$/;
const REPEATED_DIGITS_REGEX = /^(\d)\1+$/;
export type CpfOrCnpjValidationError = 'cpf_incorreto' | 'documento_invalido';

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
  return normalized.length === 14 && isValidCnpjDigits(normalized);
};

export const isValidCpfDigits = (value: string): boolean => {
  if (!ONLY_DIGITS_REGEX.test(value) || value.length !== 11) return false;
  if (REPEATED_DIGITS_REGEX.test(value)) return false;

  const numbers = value.split('').map((digit) => Number(digit));
  let sum = 0;

  for (let index = 0; index < 9; index += 1) {
    sum += numbers[index] * (10 - index);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (numbers[9] !== checkDigit) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += numbers[index] * (11 - index);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  return numbers[10] === checkDigit;
};

export const isValidCnpjDigits = (value: string): boolean => {
  if (!ONLY_DIGITS_REGEX.test(value) || value.length !== 14) return false;
  if (REPEATED_DIGITS_REGEX.test(value)) return false;

  const numbers = value.split('').map((digit) => Number(digit));
  const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weightsSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += numbers[index] * weightsFirst[index];
  }
  let checkDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (numbers[12] !== checkDigit) return false;

  sum = 0;
  for (let index = 0; index < 13; index += 1) {
    sum += numbers[index] * weightsSecond[index];
  }
  checkDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return numbers[13] === checkDigit;
};

export const isValidCpf = (
  value: string | number | null | undefined,
): boolean => {
  const normalized = normalizeCnpjCpf(value);
  return normalized.length === 11 && isValidCpfDigits(normalized);
};

export const isValidCpfOrCnpj = (
  value: string | number | null | undefined,
): boolean => {
  return getCpfOrCnpjValidationError(value) === null;
};

export const getCpfOrCnpjValidationError = (
  value: string | number | null | undefined,
): CpfOrCnpjValidationError | null => {
  const normalized = normalizeCnpjCpf(value);
  if (!normalized) return 'documento_invalido';
  if (normalized.length === 11) {
    return isValidCpfDigits(normalized) ? null : 'cpf_incorreto';
  }
  if (normalized.length === 14) {
    return isValidCnpjDigits(normalized) ? null : 'documento_invalido';
  }
  return 'documento_invalido';
};

export const getCpfOrCnpjValidationMessage = (
  value: string | number | null | undefined,
): string | null => {
  const error = getCpfOrCnpjValidationError(value);
  if (!error) return null;
  return error === 'cpf_incorreto' ? 'CPF incorreto' : 'CNPJ/CPF inválido';
};
