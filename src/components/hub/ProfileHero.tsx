import { useAuth } from "@/contexts/AuthContext";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import { DecorativeShapes } from "@/components/DecorativeShapes";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function ProfileHero() {
  const { profile } = useAuth();
  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase()
    : "?";
  const fullName = profile
    ? `${profile.last_name?.toUpperCase()}, ${profile.first_name?.toUpperCase()}`
    : "User";

  return (
    <div className="relative overflow-hidden bg-primary-light px-4 pb-8 pt-6">
      <DecorativeShapes opacity={0.06} />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-medium text-2xl font-bold text-primary-foreground">
            {initials}
          </div>
          <button className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        <h2 className="text-lg font-bold text-foreground">{fullName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, {getGreeting()}</p>
        <span className="mt-3 rounded-full bg-primary-light px-4 py-1.5 text-xs font-medium text-primary-dark">
          {format(new Date(), "EEEE do MMMM")}
        </span>
      </div>
    </div>
  );
}
