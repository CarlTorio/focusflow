import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  X, Sun, Moon, Monitor, CalendarDays, Mail, Settings, UserPen,
  Crown, HelpCircle, BookOpen, Star, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SlideOverPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, signOut } = useAuth();
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
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary-dark">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground">
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
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border p-2 text-xs text-muted-foreground"
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-px bg-border" />

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {[
            { icon: CalendarDays, label: "Planners" },
            { icon: Mail, label: "Invitations" },
            { icon: Settings, label: "Settings" },
            { icon: UserPen, label: "Edit Profile" },
          ].map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-secondary"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              {item.label}
            </button>
          ))}

          <div className="my-2 h-px bg-border" />

          {[
            { icon: Crown, label: "Get Premium" },
            { icon: HelpCircle, label: "Support" },
            { icon: BookOpen, label: "Documentation" },
            { icon: Star, label: "Leave a Review" },
          ].map((item) => (
            <button
              key={item.label}
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
