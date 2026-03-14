import { useState } from "react";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAlarmContext } from "@/contexts/AlarmContext";
import { supabase } from "@/lib/supabase";
import { AlarmManagement } from "@/components/alarms/AlarmManagement";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, Moon, Clock, Coffee, AlertTriangle, LogOut, User, Palette } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { notificationPermission, requestPermission } = useAlarmContext();
  const navigate = useNavigate();

  const [quietEnabled, setQuietEnabled] = useState(!!(profile as any)?.quiet_hours_start);
  const [quietStart, setQuietStart] = useState((profile as any)?.quiet_hours_start || "22:00");
  const [quietEnd, setQuietEnd] = useState((profile as any)?.quiet_hours_end || "07:00");
  const [breakEnabled, setBreakEnabled] = useState(true);
  const [breakInterval, setBreakInterval] = useState(Number((profile as any)?.break_interval_hours) || 2);
  const [taskReminderEnabled, setTaskReminderEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(5);
  const [dueWarningsEnabled, setDueWarningsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSaveNotifSettings = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        quiet_hours_start: quietEnabled ? quietStart : null,
        quiet_hours_end: quietEnabled ? quietEnd : null,
        break_interval_hours: breakEnabled ? breakInterval : null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved");
      refreshProfile();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Settings" />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground text-heading hidden md:block">Settings</h1>

        {/* Notification Permission */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationPermission === "granted" ? (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                <Bell className="h-4 w-4" />
                Notifications enabled
              </div>
            ) : notificationPermission === "denied" ? (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <BellOff className="h-4 w-4" />
                Notifications blocked. Enable them in your browser settings.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enable notifications to receive task reminders and alarms
                </p>
                <Button onClick={requestPermission} size="sm" className="gap-1.5">
                  <Bell className="h-4 w-4" />
                  Enable Notifications
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-5 w-5 text-primary" />
              Quiet Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Enable quiet hours</Label>
              <Switch checked={quietEnabled} onCheckedChange={setQuietEnabled} />
            </div>
            {quietEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className="rounded-xl" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Reminders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-primary" />
              Task Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Remind me before tasks</Label>
              <Switch checked={taskReminderEnabled} onCheckedChange={setTaskReminderEnabled} />
            </div>
            {taskReminderEnabled && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Minutes before</Label>
                <div className="flex gap-2">
                  {[5, 10, 15, 30].map((m) => (
                    <button
                      key={m}
                      onClick={() => setReminderMinutes(m)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        reminderMinutes === m ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      )}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Due date warnings</Label>
              <Switch checked={dueWarningsEnabled} onCheckedChange={setDueWarningsEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* Break Reminders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coffee className="h-5 w-5 text-primary" />
              Break Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Remind me to take breaks</Label>
              <Switch checked={breakEnabled} onCheckedChange={setBreakEnabled} />
            </div>
            {breakEnabled && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">After every</Label>
                <div className="flex gap-2">
                  {[1, 1.5, 2, 3].map((h) => (
                    <button
                      key={h}
                      onClick={() => setBreakInterval(h)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        breakInterval === h ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      )}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={handleSaveNotifSettings} disabled={saving} className="w-full rounded-xl">
          {saving ? "Saving..." : "Save Notification Settings"}
        </Button>

        {/* Alarms Section */}
        <div className="pt-4">
          <AlarmManagement />
        </div>

        {/* Logout */}
        <Card>
          <CardContent className="pt-6">
            <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20">
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
