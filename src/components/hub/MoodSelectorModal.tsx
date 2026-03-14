import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { X } from "lucide-react";

interface MoodOption {
  mood: string;
  emoji: string;
  zone: "green" | "yellow" | "orange" | "red";
}

const moods: MoodOption[] = [
  { mood: "joyful", emoji: "😂", zone: "green" },
  { mood: "inspired", emoji: "😎", zone: "green" },
  { mood: "optimistic", emoji: "😍", zone: "green" },
  { mood: "content", emoji: "🙂", zone: "green" },
  { mood: "happy", emoji: "😛", zone: "green" },
  { mood: "hopeful", emoji: "😬", zone: "green" },
  { mood: "bored", emoji: "🤖", zone: "yellow" },
  { mood: "neutral", emoji: "😐", zone: "yellow" },
  { mood: "restless", emoji: "🙄", zone: "yellow" },
  { mood: "uncertain", emoji: "😟", zone: "orange" },
  { mood: "frustrated", emoji: "😤", zone: "orange" },
  { mood: "anxious", emoji: "😰", zone: "orange" },
  { mood: "worried", emoji: "😱", zone: "orange" },
  { mood: "sad", emoji: "😭", zone: "red" },
  { mood: "stressed", emoji: "😣", zone: "red" },
  { mood: "angry", emoji: "😡", zone: "red" },
  { mood: "overwhelmed", emoji: "🤯", zone: "red" },
  { mood: "meltdown", emoji: "😧", zone: "red" },
];

const zoneColors: Record<string, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  orange: "bg-warning",
  red: "bg-destructive",
};

export function MoodSelectorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();

  const handleSelect = async (m: MoodOption) => {
    if (!user) return;
    const { error } = await supabase.from("mood_entries").insert({
      user_id: user.id,
      mood: m.mood,
      mood_zone: m.zone,
    });
    if (error) {
      toast.error("Failed to log mood");
    } else {
      toast.success(`Mood logged: ${m.mood} ${m.emoji}`);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-foreground/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-card p-6 shadow-lg md:bottom-auto md:left-1/2 md:top-1/2 md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-primary">Mood Tracking</p>
            <h3 className="text-xl font-bold text-foreground">Update Mood Status</h3>
            <p className="text-sm text-muted-foreground">
              Track your moods to understand your mental health better
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {moods.map((m) => (
            <button
              key={m.mood}
              onClick={() => handleSelect(m)}
              className="flex w-full items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
            >
              <div className={`h-10 w-1 rounded-full ${zoneColors[m.zone]}`} />
              <div className="flex-1 text-left">
                <p className="font-medium capitalize text-foreground">{m.mood}</p>
                <p className="text-xs text-muted-foreground">Tap to update mood</p>
              </div>
              <span className="text-2xl">{m.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
