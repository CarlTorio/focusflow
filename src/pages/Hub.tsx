import { MobileHeader } from "@/components/navigation/MobileHeader";
import { ProfileHero } from "@/components/hub/ProfileHero";
import { MoodCheckCard } from "@/components/hub/MoodCheckCard";
import { ProgressToday } from "@/components/hub/ProgressToday";
import { MoodTimeline } from "@/components/hub/MoodTimeline";
import { AssistantsCard } from "@/components/hub/AssistantsCard";
import { BreathingCTA } from "@/components/hub/BreathingCTA";

export default function Hub() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Today" />
      <ProfileHero />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <MoodCheckCard />
        <ProgressToday />
        <MoodTimeline />
        <AssistantsCard />
        <BreathingCTA />
      </div>
    </div>
  );
}
