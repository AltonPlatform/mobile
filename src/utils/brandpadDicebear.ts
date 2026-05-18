/** DiceBear Personas — transparent PNG avatars for brandpad / backers. */

export function brandpadIconUrl(seed: string, size = 128): string {
  const params = new URLSearchParams({
    seed,
    backgroundColor: 'transparent',
    size: String(size),
  });
  return `https://api.dicebear.com/9.x/personas/png?${params.toString()}`;
}

export function backerAvatarUrl(userId: number, size = 40): string {
  return brandpadIconUrl(`backer-${userId}`, size);
}
