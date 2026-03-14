import { MobileHeader } from "@/components/navigation/MobileHeader";

export default function Todos() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Todos" />
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Todos</h1>
        <p className="mt-2 text-muted-foreground">Your priority-based todo list will appear here.</p>
      </div>
    </div>
  );
}
