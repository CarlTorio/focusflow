import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Brain, ArrowRight, Loader2 } from "lucide-react";
import { DecorativeShapes } from "@/components/DecorativeShapes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/hub", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      console.log("[Login] Attempting sign in for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("[Login] Auth error:", error.message);
        // User-friendly error messages
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Incorrect email or password. Please try again.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Please verify your email address before logging in.");
        } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          toast.error("Unable to connect to server. Please check your internet connection and try again.");
        } else {
          toast.error(error.message);
        }
      } else if (data?.session) {
        console.log("[Login] Success, session established");
        toast.success("Welcome back!");
        navigate("/hub", { replace: true });
      } else {
        console.warn("[Login] No error but no session returned");
        toast.error("Login failed. Please try again.");
      }
    } catch (err: any) {
      console.error("[Login] Unexpected error:", err);
      if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
        toast.error("Unable to connect to server. Please check your internet connection and try again.");
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    toast.info("Google Sign In is coming soon!");
  };

  // Show nothing while checking existing session
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <DecorativeShapes opacity={0.08} />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-heading text-foreground">FocusFlow</h1>
          </div>
          <p className="text-muted-foreground">Your ADHD Life Management System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border-border bg-card focus-visible:ring-primary"
            required
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-border bg-card focus-visible:ring-primary"
            required
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary-dark"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <Link to="/register" className="font-medium text-primary hover:text-primary-dark">
            Register for free
          </Link>
          <Link to="/forgot-password" className="font-medium text-primary hover:text-primary-dark">
            Forgot Password?
          </Link>
        </div>

        <div className="relative flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex h-12 w-full items-center justify-between rounded-xl bg-foreground font-semibold text-background hover:opacity-90"
        >
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign in with Google</span>
          </div>
          <ArrowRight className="h-5 w-5" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <a href="#" className="hover:underline">Terms of Use</a>
          {" | "}
          <a href="#" className="hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
