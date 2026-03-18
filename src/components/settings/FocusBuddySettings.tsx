import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FocusBuddySettings() {
  const { profile, refreshProfile } = useAuth();

  const [enabled, setEnabled] = useState((profile as any)?.nudge_enabled !== false);
  const [frequency, setFrequency] = useState<string>((profile as any)?.nudge_frequency || "normal");
  const [taskStart, setTaskStart] = useState(true);
  const [breakReminders, setBreakReminders] = useState(true);
  const [overwhelm, setOverwhelm] = useState(true);
  const [celebrations, setCelebrations] = useState(true);
  const [endOfDay, setEndOfDay] = useState(true);
  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await db
      .from("profiles")
      .update({
        nudge_enabled: enabled,
        nudge_frequency: frequency,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) toast.error("Failed to save");
    else {
      toast.success("Focus Buddy settings saved");
      refreshProfile();
    }
  };

  const frequencies = [
    { value: "minimal", label: "Minimal" },
    { value: "normal", label: "Normal" },
    { value: "frequent", label: "Frequent" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" />
          Focus Buddy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable Focus Buddy</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Frequency</Label>
              <div className="flex gap-2">
                {frequencies.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFrequency(f.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      frequency === f.value ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { label: "Task start reminders", value: taskStart, set: setTaskStart },
                { label: "Break reminders", value: breakReminders, set: setBreakReminders },
                { label: "Overwhelm detection", value: overwhelm, set: setOverwhelm },
                { label: "Progress celebrations", value: celebrations, set: setCelebrations },
                { label: "End of day summary", value: endOfDay, set: setEndOfDay },
                { label: "Smart suggestions", value: smartSuggestions, set: setSmartSuggestions },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <Label className="text-sm">{item.label}</Label>
                  <Switch checked={item.value} onCheckedChange={item.set} />
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Focus Buddy Settings"}
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
