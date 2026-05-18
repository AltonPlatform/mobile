/** Ported from frontend/src/hooks/functions.ts */

export const sumFormat = (sum: number | null): string => {
  if (sum === null) {
    sum = 0;
  }

  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let tier = 0;

  while (sum >= 1000 && tier < suffixes.length - 1) {
    sum /= 1000;
    tier++;
  }

  const precision = sum < 100 ? 2 : 1;
  const formattedSum = sum.toFixed(precision);

  return parseFloat(formattedSum).toString() + suffixes[tier];
};

export const localeFormat = (
  sum: number | null,
  locale: string = 'en-US',
): string => {
  if (sum === null) {
    sum = 0;
  }
  return sum.toLocaleString(locale, {maximumFractionDigits: 2});
};

export const formatSpeed = (speed: number): string => {
  if (speed >= 1) {
    return `${speed} T/S`;
  }
  if (speed >= 1e-3) {
    return `${speed * 1e3} mT/S`;
  }
  if (speed >= 1e-6) {
    return `${speed * 1e6} μT/S`;
  }
  if (speed >= 1e-9) {
    return `${speed * 1e9} nT/S`;
  }
  return `${speed} T/S`;
};
