import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const db = supabase as any;

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
  const queryClient = useQueryClient();
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (m: MoodOption) => {
    setSelectedMood(m);
  };

  const handleSubmit = async () => {
    if (!user || !selectedMood) return;
    setSubmitting(true);
    const { error } = await db.from("mood_entries").insert({
      user_id: user.id,
      mood: selectedMood.mood,
      mood_zone: selectedMood.zone,
      note: note.trim() || null,
      logged_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to log mood");
    } else {
      toast.success(`Mood logged: ${selectedMood.mood} ${selectedMood.emoji}`);
      queryClient.invalidateQueries({ queryKey: ["mood-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["mood-insights"] });
    }
    setSelectedMood(null);
    setNote("");
    onClose();
  };

  const handleClose = () => {
    setSelectedMood(null);
    setNote("");
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-foreground/30" onClick={handleClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-card p-6 shadow-lg md:bottom-auto md:left-1/2 md:top-1/2 md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-primary">Mood Tracking</p>
            <h3 className="text-xl font-bold text-foreground">
              {selectedMood ? "Add a note (optional)" : "Update Mood Status"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedMood
                ? `You selected: ${selectedMood.mood} ${selectedMood.emoji}`
                : "Track your moods to understand your mental health better"}
            </p>
          </div>
          <button onClick={handleClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {selectedMood ? (
          <div className="space-y-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's on your mind? (optional)"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMood(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Log Mood"}
              </button>
            </div>
          </div>
        ) : (
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
                  <p className="text-xs text-muted-foreground">Tap to select</p>
                </div>
                <span className="text-2xl">{m.emoji}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
