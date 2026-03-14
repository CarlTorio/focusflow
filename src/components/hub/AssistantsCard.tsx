import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AssistantsCard() {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm text-center">
      <h3 className="mb-2 text-lg font-bold text-foreground">Assistants</h3>
      <p className="mb-4 text-sm text-muted-foreground">You don't have any assistants yet</p>
      <Button variant="outline" className="rounded-xl border-primary text-primary hover:bg-primary-light">
        <Plus className="mr-2 h-4 w-4" />
        Add New Assistant
      </Button>
    </div>
  );
}
