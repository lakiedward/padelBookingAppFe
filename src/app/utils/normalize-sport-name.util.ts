export function normalizeSportName(raw: string | undefined | null): string {
  const s = (raw ?? '').toString().toLowerCase().trim();

  const map: Record<string, string> = {
    'tennis': 'tennis',
    'padel': 'padel',
    'basketball': 'basketball',
    'volleyball': 'volleyball',
    'football': 'football',
    'soccer': 'football',
    'badminton': 'badminton',
    'squash': 'squash',
    'handball': 'handball',
    'pingpong': 'pingpong',
    'table tennis': 'pingpong',
    'table-tennis': 'pingpong',
  };

  if (map[s]) return map[s];

  if (s.includes('padel')) return 'padel';
  if (s.includes('tennis')) return 'tennis';
  if (s.includes('basket')) return 'basketball';
  if (s.includes('foot') || s.includes('soccer')) return 'football';
  if (s.includes('volley')) return 'volleyball';
  if (s.includes('badminton')) return 'badminton';
  if (s.includes('squash')) return 'squash';
  if (s.includes('handball')) return 'handball';
  if (s.includes('table') || s.includes('ping')) return 'pingpong';

  return '🎯';
}
