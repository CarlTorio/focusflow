import { useState, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { PrioritySection } from "@/components/todos/PrioritySection";
import { AddTaskModal } from "@/components/todos/AddTaskModal";
import { FloatingActionButton } from "@/components/todos/FloatingActionButton";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/hooks/useTasks";
import type { CreateTaskInput } from "@/hooks/useTasks";

const SECTIONS = [
  { priority: "high" as const, label: "HIGH", dotColor: "#EF4444", placeholder: "Needs immediate attention" },
  { priority: "medium" as const, label: "MEDIUM", dotColor: "#F59E0B", placeholder: "Things you should get done soon" },
  { priority: "low" as const, label: "LOW", dotColor: "#10B981", placeholder: "Low priority todos" },
  { priority: "none" as const, label: "NONE", dotColor: "#9CA3AF", placeholder: "General todos without priority" },
];

export default function Todos() {
  const { tasks, isLoading, createTask, completeTask, uncompleteTask } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultPriority, setDefaultPriority] = useState<"high" | "medium" | "low">("low");

  const grouped = useMemo(() => {
    const active = tasks.filter(t => t.status !== "completed");
    const completed = tasks.filter(t => t.status === "completed");
    const byPriority: Record<string, typeof active> = { high: [], medium: [], low: [], none: [] };
    active.forEach(t => {
      (byPriority[t.priority] || byPriority.none).push(t);
    });
    return { ...byPriority, completed };
  }, [tasks]);

  const handleAdd = (priority: "high" | "medium" | "low") => {
    setDefaultPriority(priority);
    setModalOpen(true);
  };

  const handleSave = (input: CreateTaskInput) => {
    createTask.mutate(input);
    setModalOpen(false);
  };

  const totalActive = tasks.filter(t => t.status !== "completed").length;
  const isEmpty = tasks.length === 0 && !isLoading;

  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Todos" />
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Desktop title */}
        <h1 className="mb-6 hidden text-2xl font-bold text-foreground font-heading md:block">Todos</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground font-heading">No tasks yet!</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tap the + button to create your first task</p>
          </div>
        ) : (
          <div className="space-y-6">
            {SECTIONS.map(s => (
              <PrioritySection
                key={s.priority}
                label={s.label}
                color={s.dotColor}
                dotColor={s.dotColor}
                tasks={grouped[s.priority] || []}
                placeholder={s.placeholder}
                onAdd={() => handleAdd(s.priority)}
                onComplete={id => completeTask.mutate(id)}
                onUncomplete={id => uncompleteTask.mutate(id)}
              />
            ))}
            <PrioritySection
              label="COMPLETED"
              color="#9CA3AF"
              dotColor="#9CA3AF"
              tasks={grouped.completed}
              placeholder="No completed tasks yet"
              defaultOpen={false}
              onAdd={() => {}}
              onComplete={id => completeTask.mutate(id)}
              onUncomplete={id => uncompleteTask.mutate(id)}
              showAdd={false}
            />
          </div>
        )}
      </div>

      <FloatingActionButton onClick={() => handleAdd("none")} />

      <AddTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        defaultPriority={defaultPriority}
        isSaving={createTask.isPending}
      />
    </div>
  );
}
