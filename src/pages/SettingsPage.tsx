import { MobileHeader } from "@/components/navigation/MobileHeader";

export default function SettingsPage() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Settings" />
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-muted-foreground">App settings will appear here.</p>
      </div>
    </div>
  );
}
