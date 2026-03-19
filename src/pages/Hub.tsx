import { MobileHeader } from "@/components/navigation/MobileHeader";
import { ProfileHero } from "@/components/hub/ProfileHero";
import { PerformanceAnalytics } from "@/components/hub/PerformanceAnalytics";
import { MoodTimeline } from "@/components/hub/MoodTimeline";
import { MoodInsights } from "@/components/hub/MoodInsights";
import { AssistantsCard } from "@/components/hub/AssistantsCard";
import { BreathingCTA } from "@/components/hub/BreathingCTA";

export default function Hub() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Today" />
      <ProfileHero />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <PerformanceAnalytics />
        <MoodTimeline />
        <MoodInsights />
        <AssistantsCard />
        <BreathingCTA />
      </div>
    </div>
  );
}
