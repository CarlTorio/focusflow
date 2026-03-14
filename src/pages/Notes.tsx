import { MobileHeader } from "@/components/navigation/MobileHeader";

export default function Notes() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Notes" />
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Notes</h1>
        <p className="mt-2 text-muted-foreground">Your notes with star system will appear here.</p>
      </div>
    </div>
  );
}
