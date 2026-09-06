import { create } from 'zustand';

export type QuickViewEntityType = 'user' | 'asset' | 'license' | 'service' | 'ticket' | 'vendor';

interface QuickViewState {
  isOpen: boolean;
  entityType: QuickViewEntityType | null;
  entityId: string | null;
  openQuickView: (type: QuickViewEntityType, id: string) => void;
  closeQuickView: () => void;
}

export const useQuickViewStore = create<QuickViewState>((set) => ({
  isOpen: false,
  entityType: null,
  entityId: null,
  openQuickView: (type, id) => {
    if (!type || !id) return;
    set({
      isOpen: true,
      entityType: type,
      entityId: String(id).trim(),
    });
  },
  closeQuickView: () => {
    set({
      isOpen: false,
      entityType: null,
      entityId: null,
    });
  },
}));
