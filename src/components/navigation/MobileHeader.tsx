import { Menu, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { SlideOverPanel } from "./SlideOverPanel";

export function MobileHeader({ title }: { title: string }) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-background px-4 md:hidden">
        <button onClick={() => setPanelOpen(true)} className="text-foreground">
          <Menu className="h-6 w-6" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(), "do MMMM yyyy")}</p>
        </div>
        <button className="text-muted-foreground">
          <RefreshCw className="h-5 w-5" />
        </button>
      </header>
      <SlideOverPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
