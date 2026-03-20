import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { syncPendingMutations } from "@/lib/offlineStorage";

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  avatar_url: string | null;
  onboarding_completed?: boolean;
  theme_mode?: string;
  theme_color?: string;
  theme_intensity?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (user: User) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const fallbackProfile = {
        id: user.id,
        email: user.email ?? null,
        first_name: user.user_metadata?.first_name ?? "",
        last_name: user.user_metadata?.last_name ?? "",
        nickname: user.user_metadata?.nickname ?? user.user_metadata?.first_name ?? null,
        avatar_url: user.user_metadata?.avatar_id ?? "avatar-01",
      };

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert(fallbackProfile)
        .select("*")
        .maybeSingle();

      if (insertError) throw insertError;
      setProfile((inserted ?? fallbackProfile) as Profile);
      return;
    }

    setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  const hydrateAuthenticatedState = async (nextSession: Session) => {
    setSession(nextSession);
    setUser(nextSession.user);

    try {
      await fetchProfile(nextSession.user);
    } catch {
      setProfile(null);
    }

    try {
      await syncPendingMutations();
    } catch (error) {
      console.error("[auth] Failed to sync pending local changes:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (nextSession?.user) {
          await hydrateAuthenticatedState(nextSession);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: nextSession } }) => {
      if (nextSession?.user) {
        await hydrateAuthenticatedState(nextSession);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
