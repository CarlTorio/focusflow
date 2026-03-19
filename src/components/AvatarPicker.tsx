import { AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface AvatarPickerProps {
  value: string;
  onChange: (id: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Choose your avatar</p>
      <div className="grid grid-cols-5 gap-3">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onChange(avatar.id)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-2xl border-2 p-1 transition-all",
              value === avatar.id
                ? "border-primary bg-primary/10 scale-105 shadow-md"
                : "border-transparent hover:border-primary/30 hover:bg-secondary"
            )}
          >
            <img
              src={avatar.src}
              alt={avatar.label}
              className="h-full w-full object-contain"
            />
            {value === avatar.id && (
              <div className="absolute -right-0.5 -top-0.5 rounded-full bg-primary p-0.5">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
