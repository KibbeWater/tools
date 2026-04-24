export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const v of inputs) {
    if (!v) continue;
    if (typeof v === 'string' || typeof v === 'number') {
      out.push(String(v));
    } else if (Array.isArray(v)) {
      const s = cn(...v);
      if (s) out.push(s);
    } else if (typeof v === 'object') {
      for (const k of Object.keys(v)) if (v[k]) out.push(k);
    }
  }
  return out.join(' ');
}
