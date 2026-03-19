import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  X, Sun, Moon, Monitor, CalendarDays, Mail, Settings, UserPen,
  LogOut, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SlideOverPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, user, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const navigate = useNavigate();

  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase()
    : "?";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-foreground/30" onClick={onClose} />
      <div className="fixed left-0 top-0 z-50 flex h-full w-4/5 max-w-sm flex-col bg-card shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-foreground">
              {profile?.first_name || profile?.nickname || "User"} {profile?.last_name || ""}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.email || user?.email || "No email"}
            </p>
          </div>
          <button onClick={onClose} className="ml-2 shrink-0 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-4">
          {[
            { icon: Monitor, label: "System" },
            { icon: Sun, label: "Light" },
            { icon: Moon, label: "Dark" },
          ].map((t) => (
            <button
              key={t.label}
              onClick={() => setMode(t.label.toLowerCase() as "system" | "light" | "dark")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-xl border p-2 text-xs transition-colors",
                mode === t.label.toLowerCase()
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-px bg-border" />

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {[
            { icon: CalendarDays, label: "Planners", to: "/planner" },
            { icon: Bell, label: "Alarms", to: "/alarm" },
            { icon: Mail, label: "Notes", to: "/notes" },
            { icon: Settings, label: "Settings", to: "/settings" },
            { icon: UserPen, label: "Edit Profile", to: "/settings" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                navigate(item.to);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-secondary"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              {item.label}
            </button>
          ))}

          <div className="my-2 h-px bg-border" />

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>

        <p className="p-4 text-center text-xs text-muted-foreground">Version 1.0.0</p>
      </div>
    </>
  );
}
