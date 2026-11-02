import { createContext, useContext, useState } from "react";

/** which mobile drawer is open: page navigation, or this page's filters */
export type MobileMenu = "nav" | "filters" | null;

interface MobileMenuValue {
  open: MobileMenu;
  setOpen: (_open: MobileMenu) => void;
  /** Extra content rendered inside the drawer (e.g. the learn filters). */
  slot: React.ReactNode;
  setSlot: (_node: React.ReactNode) => void;
}

const MobileMenuContext = createContext<MobileMenuValue | null>(null);

export function MobileMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<MobileMenu>(null);
  const [slot, setSlot] = useState<React.ReactNode>(null);
  return (
    <MobileMenuContext.Provider value={{ open, setOpen, slot, setSlot }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext);
  if (!ctx)
    throw new Error("useMobileMenu must be used within MobileMenuProvider");
  return ctx;
}
