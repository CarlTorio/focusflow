import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Camera, Image, Pencil, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";

export function ProfileSection() {
  const { profile, refreshProfile, user } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarColor, setAvatarColor] = useState((profile as any)?.avatar_url || "");

  const initials = `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() || "?";

  const avatarColors = [
    "bg-primary", "bg-primary-dark", "bg-success", "bg-warning", "bg-destructive",
    "bg-accent", "bg-primary-medium", "bg-muted-foreground",
  ];

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", profile.id);

    if (error) { toast.error("Failed to update profile"); }
    else { toast.success("Profile updated"); refreshProfile(); }

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        toast.error("Passwords don't match");
        setSaving(false);
        return;
      }
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) toast.error("Failed to update password");
      else { toast.success("Password updated"); setNewPassword(""); setConfirmPassword(""); }
    }
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    toast.success("Avatar updated");
    refreshProfile();
    setAvatarModalOpen(false);
  };

  const handleDeleteData = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      "Are you sure? This will permanently delete all your data including tasks, notes, alarms, and mood entries. This action cannot be undone."
    );
    if (!confirmed) return;
    // Delete user data from all tables
    await Promise.all([
      supabase.from("task_schedules").delete().eq("user_id", user.id),
      supabase.from("tasks").delete().eq("user_id", user.id),
      supabase.from("notes").delete().eq("user_id", user.id),
      supabase.from("mood_entries").delete().eq("user_id", user.id),
      supabase.from("alarms").delete().eq("user_id", user.id),
    ]);
    toast.success("All data deleted");
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar */}
          <div className="flex justify-center">
            <button onClick={() => setAvatarModalOpen(true)} className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-medium text-2xl font-bold text-primary-foreground">
                {profile?.avatar_url && !profile.avatar_url.startsWith("bg-") ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Pencil className="h-3.5 w-3.5" />
              </div>
            </button>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">First Name</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email Address</Label>
            <Input value={profile?.email || ""} readOnly className="rounded-xl bg-muted text-muted-foreground" />
          </div>

          {/* Password */}
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold text-foreground">Update Your Password</p>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="rounded-xl pr-10"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="w-full rounded-xl">
            {saving ? "Saving..." : "Save Profile"}
          </Button>

          <Button onClick={handleDeleteData} variant="ghost" className="w-full rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20">
            Delete My Data
          </Button>
        </CardContent>
      </Card>

      {/* Avatar Modal */}
      {avatarModalOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-foreground/30" onClick={() => setAvatarModalOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-card p-6 shadow-lg md:bottom-auto md:left-1/2 md:top-1/2 md:max-w-sm md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground">Profile Picture</h3>
              <p className="text-sm text-muted-foreground">Your profile picture is used to identify you in the app</p>
            </div>
            <div className="space-y-3">
              {/* Color selector for initials avatar */}
              <p className="text-xs font-medium text-muted-foreground">Avatar color</p>
              <div className="flex flex-wrap gap-2">
                {avatarColors.map(c => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className={`h-10 w-10 rounded-full ${c} ${avatarColor === c ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                  />
                ))}
              </div>

              {/* Camera option */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary">
                <Camera className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Camera</p>
                  <p className="text-xs text-muted-foreground">Take a picture with your device</p>
                </div>
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleImageUpload} />
              </label>

              {/* Image library */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary">
                <Image className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Image Library</p>
                  <p className="text-xs text-muted-foreground">Select an image from your device</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <Button onClick={() => setAvatarModalOpen(false)} variant="outline" className="mt-4 w-full rounded-xl">
              Close
            </Button>
          </div>
        </>
      )}
    </>
  );
}
