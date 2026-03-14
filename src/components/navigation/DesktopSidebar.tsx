import {
  Home, Clock, CalendarDays, CheckSquare, FileText,
  Box, UserPlus, Settings, Palette, RotateCcw,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const mainNav = [
  { label: "Hub", icon: Home, to: "/hub" },
  { label: "Now", icon: Clock, to: "/focus" },
  { label: "Plan", icon: CalendarDays, to: "/planner" },
  { label: "Todos", icon: CheckSquare, to: "/todos" },
  { label: "Notes", icon: FileText, to: "/notes" },
];

const secondaryNav = [
  { label: "Templates", icon: Box, disabled: true },
  { label: "Invite", icon: UserPlus, disabled: true },
  { label: "Settings", icon: Settings, to: "/settings" },
  { label: "Theme", icon: Palette, disabled: true },
  { label: "Undo", icon: RotateCcw, disabled: true },
];

export function DesktopSidebar() {
  const { profile } = useAuth();
  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase()
    : "?";

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[72px] flex-col items-center border-r border-border bg-card py-4 md:flex">
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
        FF
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {mainNav.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              `relative flex w-14 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] transition-colors ${
                isActive
                  ? "bg-primary-light text-primary font-semibold"
                  : "text-muted-foreground hover:bg-secondary"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        <div className="my-2 h-px w-8 bg-border" />

        {secondaryNav.map((item) =>
          item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `flex w-14 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:bg-secondary"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ) : (
            <div
              key={item.label}
              className="flex w-14 cursor-not-allowed flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] text-muted-foreground/50"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </div>
          )
        )}
      </nav>

      <div className="mt-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary-dark">
        {initials}
      </div>
    </aside>
  );
}
