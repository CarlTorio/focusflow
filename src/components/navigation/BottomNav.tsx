import { Home, CalendarDays, Clock, CheckSquare, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";

const tabs = [
  { label: "Hub", icon: Home, to: "/hub" },
  { label: "Planner", icon: CalendarDays, to: "/planner" },
  { label: "Focus", icon: Clock, to: "/focus" },
  { label: "Todos", icon: CheckSquare, to: "/todos" },
  { label: "Notes", icon: FileText, to: "/notes" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute -top-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
                )}
                <tab.icon className={`${isActive ? "h-6 w-6" : "h-5 w-5"} transition-all`} />
                <span className="font-medium">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
