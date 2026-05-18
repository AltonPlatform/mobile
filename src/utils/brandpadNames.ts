const ADJECTIVES = [
  'Quantum',
  'Stellar',
  'Nova',
  'Nexus',
  'Phantom',
  'Vertex',
  'Zenith',
  'Orion',
  'Apex',
  'Prism',
  'Cipher',
  'Pulse',
  'Radiant',
  'Solar',
  'Cosmic',
  'Neon',
  'Hyper',
  'Prime',
  'Atlas',
  'Vortex',
] as const;

const NOUNS = [
  'Chain',
  'Vault',
  'Bridge',
  'Shield',
  'Core',
  'Wave',
  'Flux',
  'Spark',
  'Grid',
  'Node',
  'Forge',
  'Pulse',
  'Realm',
  'Axis',
  'Link',
  'Mint',
  'Gate',
  'Peak',
  'Arc',
  'Bloom',
] as const;

const SUFFIXES = [
  'Protocol',
  'Token',
  'Fi',
  'Labs',
  'DAO',
  'Network',
] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length];
}

/** Deterministic name from seed (e.g. brandpad id) — for display fallback. */
export function generateBrandpadName(seed: string): string {
  const h = hashSeed(seed);
  const adj = pick(ADJECTIVES, h);
  const noun = pick(NOUNS, h >>> 8);
  const suffix = pick(SUFFIXES, h >>> 16);
  return `${adj} ${noun} ${suffix}`;
}

export function defaultBrandpadDescription(roundLabel?: string): string {
  if (roundLabel) {
    return `Auto-generated token for BrandPad ${roundLabel}.`;
  }
  return 'Auto-generated token for weekly BrandPad round.';
}
