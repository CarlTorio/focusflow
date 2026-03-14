import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Download, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function DataPrivacySection() {
  const { user } = useAuth();

  const handleExport = async () => {
    if (!user) return;
    toast.info("Exporting your data...");
    const [tasks, notes, moods, schedules, alarms] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id),
      supabase.from("notes").select("*").eq("user_id", user.id),
      supabase.from("mood_entries").select("*").eq("user_id", user.id),
      supabase.from("task_schedules").select("*").eq("user_id", user.id),
      supabase.from("alarms").select("*").eq("user_id", user.id),
    ]);
    const exportData = {
      exported_at: new Date().toISOString(),
      tasks: tasks.data || [],
      notes: notes.data || [],
      mood_entries: moods.data || [],
      task_schedules: schedules.data || [],
      alarms: alarms.data || [],
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focusflow-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-primary" /> Data & Privacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleExport} variant="outline" className="w-full justify-start gap-3 rounded-xl">
          <Download className="h-4 w-4" /> Export My Data
        </Button>
        <a href="#" className="flex items-center gap-3 rounded-xl p-2.5 text-sm text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-4 w-4" /> Privacy Policy
        </a>
        <a href="#" className="flex items-center gap-3 rounded-xl p-2.5 text-sm text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-4 w-4" /> Terms of Use
        </a>
      </CardContent>
    </Card>
  );
}
