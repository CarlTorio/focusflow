import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Brain, Eye, EyeOff } from "lucide-react";
import { DecorativeShapes } from "@/components/DecorativeShapes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "@/components/AvatarPicker";
import { toast } from "sonner";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("avatar-01");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"info" | "avatar">("info");
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: firstName,
          last_name: lastName,
          nickname: nickname || firstName,
          avatar_id: selectedAvatar,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Check your email to confirm.");
      navigate("/login");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <DecorativeShapes opacity={0.08} />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-heading text-foreground">FocusFlow</h1>
          </div>
          <p className="text-muted-foreground">
            {step === "info" ? "Create your account" : "Pick your avatar"}
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {step === "info" ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 rounded-xl border-border bg-card focus-visible:ring-primary"
                  required
                />
                <Input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 rounded-xl border-border bg-card focus-visible:ring-primary"
                  required
                />
              </div>
              <Input
                placeholder="Nickname (how you'd like to be called)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="h-12 rounded-xl border-border bg-card focus-visible:ring-primary"
              />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-border bg-card focus-visible:ring-primary"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-border bg-card pr-12 focus-visible:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 rounded-xl border-border bg-card focus-visible:ring-primary"
                required
              />
              <Button
                type="button"
                onClick={() => {
                  if (!firstName || !lastName || !email || !password || !confirmPassword) {
                    toast.error("Please fill in all required fields");
                    return;
                  }
                  if (password !== confirmPassword) {
                    toast.error("Passwords do not match");
                    return;
                  }
                  setStep("avatar");
                }}
                className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary-dark"
              >
                Next: Choose Avatar
              </Button>
            </>
          ) : (
            <>
              <AvatarPicker value={selectedAvatar} onChange={setSelectedAvatar} />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("info")}
                  className="h-12 flex-1 rounded-xl"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary-dark"
                >
                  {loading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </>
          )}
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
