import { MobileHeader } from "@/components/navigation/MobileHeader";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { ThemeSection } from "@/components/settings/ThemeSection";
import { DataPrivacySection } from "@/components/settings/DataPrivacySection";
import { AboutSection } from "@/components/settings/AboutSection";

export default function SettingsPage() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Settings" />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground text-heading hidden md:block">Settings</h1>

        <ProfileSection />
        <ThemeSection />
        <DataPrivacySection />
        <AboutSection />
      </div>
    </div>
  );
}