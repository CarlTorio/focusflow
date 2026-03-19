import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Camera } from "lucide-react";
import { format } from "date-fns";
import { DecorativeShapes } from "@/components/DecorativeShapes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function ProfileHero() {
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase()
    : "?";
  const fullName = profile
    ? `${profile.last_name?.toUpperCase()}, ${profile.first_name?.toUpperCase()}`
    : "User";

  const avatarUrl = profile?.avatar_url || null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBust } as any)
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative overflow-hidden bg-primary-light px-4 pb-8 pt-6">
      <DecorativeShapes opacity={0.06} />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-medium text-2xl font-bold text-primary-foreground overflow-hidden cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
        <h2 className="text-lg font-bold text-foreground">{fullName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {getGreeting()}, {(profile as any)?.nickname || profile?.first_name || "there"}!
        </p>
        <span className="mt-3 rounded-full bg-primary-light px-4 py-1.5 text-xs font-medium text-primary-dark">
          {format(new Date(), "EEEE do MMMM")}
        </span>
      </div>
    </div>
  );
}
