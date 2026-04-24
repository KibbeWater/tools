import { useCallback, useState } from 'react';
import type { DiscMeta } from './discs';

export interface DiscReplacement {
  key: string; // uuid — stable list key
  disc: DiscMeta;
  source: File;
  mono: boolean;
  gainDb: number;
  trimStart: number; // seconds
  trimEnd: number; // seconds, 0 = "to end"
  fadeInSec: number;
  fadeOutSec: number;
  quality: number; // -1..10
  durationSec?: number;
}

export interface PackState {
  name: string;
  description: string;
  iconFile: File | null;
}

export function defaultReplacement(disc: DiscMeta, source: File): DiscReplacement {
  return {
    key: cryptoRandom(),
    disc,
    source,
    mono: false,
    gainDb: 0,
    trimStart: 0,
    trimEnd: 0,
    fadeInSec: 0,
    fadeOutSec: 0,
    quality: 5,
  };
}

export function cryptoRandom(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export interface ReplacementListApi {
  items: DiscReplacement[];
  add: (item: DiscReplacement) => void;
  update: (key: string, patch: Partial<DiscReplacement>) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export function useReplacementList(): ReplacementListApi {
  const [items, setItems] = useState<DiscReplacement[]>([]);
  const add = useCallback((item: DiscReplacement) => {
    setItems((prev) => [...prev, item]);
  }, []);
  const update = useCallback((key: string, patch: Partial<DiscReplacement>) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? ({ ...i, ...patch } as DiscReplacement) : i)),
    );
  }, []);
  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);
  const clear = useCallback(() => setItems([]), []);
  return { items, add, update, remove, clear };
}
