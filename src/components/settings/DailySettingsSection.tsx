import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DailySettingsSection() {
  const { profile, refreshProfile } = useAuth();
  const p = profile as any;

  const [dailyLimit, setDailyLimit] = useState(p?.daily_hour_limit || 8);
  const [workStart, setWorkStart] = useState(p?.working_hours_start || "08:00");
  const [workEnd, setWorkEnd] = useState(p?.working_hours_end || "18:00");
  const [breakInterval, setBreakInterval] = useState(Number(p?.break_interval_hours) || 2);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await (supabase as any).from("profiles").update({
      daily_hour_limit: dailyLimit,
      working_hours_start: workStart,
      working_hours_end: workEnd,
      break_interval_hours: breakInterval,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error("Failed to save");
    else { toast.success("Daily settings saved"); refreshProfile(); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-5 w-5 text-primary" /> Daily Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm">Maximum hours per day</Label>
          <div className="flex flex-wrap gap-2">
            {[4, 5, 6, 7, 8, 10, 12].map(h => (
              <button key={h} onClick={() => setDailyLimit(h)} className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                dailyLimit === h ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              )}>
                {h}h
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">When this limit is reached, no more tasks can be scheduled</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Work starts</Label>
            <Input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Work ends</Label>
            <Input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Tasks will be auto-scheduled within these hours</p>

        <div className="space-y-1">
          <Label className="text-sm">Suggest a break every</Label>
          <div className="flex gap-2">
            {[1, 1.5, 2, 3].map(h => (
              <button key={h} onClick={() => setBreakInterval(h)} className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                breakInterval === h ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              )}>
                {h}h
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Focus Buddy will gently remind you to take breaks</p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
          {saving ? "Saving..." : "Save Daily Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
