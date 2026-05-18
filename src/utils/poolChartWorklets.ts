/** Форматтеры для react-native-wagmi-charts — только worklet-совместимый код. */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const BIGINT_SUFFIXES = ['', 'K', 'M', 'B', 'T'];

function sumFormatWorklet(sum: number): string {
  'worklet';
  let tier = 0;
  let v = sum;
  while (v >= 1000 && tier < BIGINT_SUFFIXES.length - 1) {
    v /= 1000;
    tier++;
  }
  const precision = v < 100 ? 2 : 1;
  return parseFloat(v.toFixed(precision)).toString() + BIGINT_SUFFIXES[tier];
}

function formatPoolSpotWorklet(spot: string): string {
  'worklet';
  const s = spot.trim();
  if (!s) {
    return '—';
  }

  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n === 0) {
      return '0';
    }
    const abs = Math.abs(n);
    if (abs >= 1000) {
      return sumFormatWorklet(n);
    }
    if (abs >= 1) {
      return parseFloat(n.toFixed(4)).toString();
    }
    if (abs >= 0.0001) {
      return parseFloat(n.toFixed(6)).toString();
    }
    return n.toExponential(3);
  }

  if (s.length <= 14) {
    return s;
  }
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export function formatChartPrice({
  value,
}: {
  value: string;
  formatted: string;
}): string {
  'worklet';
  return formatPoolSpotWorklet(value);
}

export function formatChartDatetime({
  value,
}: {
  value: number;
  formatted: string;
}): string {
  'worklet';
  if (value <= 0) {
    return '';
  }
  try {
    const d = new Date(value);
    const month = MONTHS[d.getMonth()] ?? '';
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const hh = hours < 10 ? `0${hours}` : `${hours}`;
    const mm = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${month} ${day}, ${hh}:${mm}`;
  } catch {
    return '';
  }
}
