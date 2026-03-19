import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Pencil, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AvatarPicker } from "@/components/AvatarPicker";
import { getAvatarById } from "@/lib/avatars";

export function ProfileSection() {
  const { profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || "avatar-01");

  const currentAvatar = getAvatarById(selectedAvatar);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, nickname, avatar_url: selectedAvatar })
      .eq("id", profile.id);

    if (error) toast.error("Failed to update profile");
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

  const handleAvatarSave = async () => {
    if (!profile) return;
    await supabase.from("profiles").update({ avatar_url: selectedAvatar }).eq("id", profile.id);
    toast.success("Avatar updated");
    refreshProfile();
    setAvatarModalOpen(false);
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
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary overflow-hidden">
                <img src={currentAvatar.src} alt={currentAvatar.label} className="h-full w-full object-contain" />
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
            <Label className="text-xs text-muted-foreground">Nickname</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="What should we call you?" className="rounded-xl" />
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
        </CardContent>
      </Card>

      {/* Avatar Picker Modal */}
      {avatarModalOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-foreground/30" onClick={() => setAvatarModalOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-card p-6 shadow-lg md:bottom-auto md:left-1/2 md:top-1/2 md:max-w-sm md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
            <h3 className="mb-4 text-lg font-bold text-foreground">Change Avatar</h3>
            <AvatarPicker value={selectedAvatar} onChange={setSelectedAvatar} />
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setAvatarModalOpen(false)} variant="outline" className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleAvatarSave} className="flex-1 rounded-xl">
                Save
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
