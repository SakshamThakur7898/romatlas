import { useEffect, useState } from 'react';
import { create } from 'zustand';

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title === 'ROMAtlas' ? 'ROMAtlas — The Android ecosystem, organized' : `${title} — ROMAtlas`;
    if (description) {
      let el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!el) {
        el = document.createElement('meta');
        el.name = 'description';
        document.head.appendChild(el);
      }
      el.content = description;
    }
  }, [title, description]);
}

interface SearchState {
  open: boolean;
  setOpen: (open: boolean) => void;
}
export const useSearchStore = create<SearchState>((set) => ({ open: false, setOpen: (open) => set({ open }) }));
