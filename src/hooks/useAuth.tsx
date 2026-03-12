import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type AppRole = Enums<"app_role">;

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole | null;
  restaurantId: string | null;
  profile: Profile | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (authUser: User) => {
    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .single();

    // Fetch role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .maybeSingle();

    setUser({
      id: authUser.id,
      email: authUser.email || "",
      name: profile?.name || authUser.email?.split("@")[0] || "",
      role: roleData?.role || null,
      restaurantId: profile?.restaurant_id || null,
      profile,
    });
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(() => fetchUserData(session.user), 0);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchUserData(session.user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
