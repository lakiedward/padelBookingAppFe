export function sportEmoji(raw: string | undefined | null): string {
  const s = (raw ?? '').toString().toLowerCase().trim();

  // Direct map of common canonical keys
  const map: Record<string, string> = {
    'tennis': '🎾',
    'padel': '🎾',
    'basketball': '🏀',
    'volleyball': '🏐',
    'football': '⚽',
    'soccer': '⚽',
    'badminton': '🏸',
    'table tennis': '🏓',
    'table-tennis': '🏓',
  };

  if (map[s]) return map[s];

  // Heuristic includes-based fallback to handle varied labels from BE/FE
  if (s.includes('tennis') || s.includes('padel')) return '🎾';
  if (s.includes('basket')) return '🏀';
  if (s.includes('foot') || s.includes('soccer')) return '⚽';
  if (s.includes('volley')) return '🏐';
  if (s.includes('badminton')) return '🏸';
  if (s.includes('table')) return '🏓';

  return '🎯';
}
