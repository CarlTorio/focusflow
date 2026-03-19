import { useAuth } from "@/contexts/AuthContext";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function ProfileHero() {
  const { profile } = useAuth();
  const displayName = (profile as any)?.nickname || profile?.first_name || "there";

  return (
    <div className="px-4 py-6">
      <h2 className="text-lg font-bold text-foreground">
        {getGreeting()}, {displayName}!
      </h2>
    </div>
  );
}
