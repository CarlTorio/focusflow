import { MobileHeader } from "@/components/navigation/MobileHeader";
import { ProfileHero } from "@/components/hub/ProfileHero";
import { DueDateNotifications } from "@/components/hub/DueDateNotifications";
import { RoutineWeeklyCard } from "@/components/hub/RoutineWeeklyCard";
import { TaskSummaryCard } from "@/components/hub/TaskSummaryCard";
import { WeeklyPerformanceCard } from "@/components/hub/WeeklyPerformanceCard";

export default function Hub() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Today" />
      <ProfileHero />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <DueDateNotifications />
        <RoutineWeeklyCard />
        <TaskSummaryCard />
        <WeeklyPerformanceCard />
      </div>
    </div>
  );
}
