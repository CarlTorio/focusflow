import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { DecorativeShapes } from "@/components/DecorativeShapes";
import wavingAvatar from "@/assets/waving-avatar.png";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function ProfileHero() {
  const { profile } = useAuth();

  const firstName = profile?.first_name || "User";

  return (
    <div className="relative overflow-hidden bg-primary-light px-4 pb-8 pt-6">
      <DecorativeShapes opacity={0.06} />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-2">
          <img
            src={wavingAvatar}
            alt="Waving avatar"
            className="h-24 w-24 object-contain"
          />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {getGreeting()}, {firstName}! 👋
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back</p>
        <span className="mt-3 rounded-full bg-primary-light px-4 py-1.5 text-xs font-medium text-primary-dark">
          {format(new Date(), "EEEE do MMMM")}
        </span>
      </div>
    </div>
  );
}
