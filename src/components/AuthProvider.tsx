"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  rol: "admin" | "recepcion" | "tecnico" | null;
  activo: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  rol: null,
  activo: true,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<"admin" | "recepcion" | "tecnico" | null>(null);
  const [activo, setActivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from("perfiles")
      .select("rol, activo")
      .eq("id", userId)
      .single();
    
    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          if (!profile.activo) {
            await supabase.auth.signOut();
            setUser(null);
            setRol(null);
            setActivo(false);
            router.push("/login?error=Cuenta desactivada. Contacta al administrador.");
          } else {
            setUser(session.user);
            setRol(profile.rol);
            setActivo(true);
          }
        }
      } else {
        setUser(null);
        setRol(null);
        setActivo(true);
      }
      setLoading(false);

      if (!session && pathname !== "/login") {
        router.push("/login");
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            if (!profile.activo) {
              await supabase.auth.signOut();
              setUser(null);
              setRol(null);
              setActivo(false);
              router.push("/login?error=Cuenta desactivada.");
            } else {
              setUser(session.user);
              setRol(profile.rol);
              setActivo(true);
            }
          }
        } else {
          setUser(null);
          setRol(null);
          setActivo(true);
        }
        setLoading(false);
        
        if (!session && pathname !== "/login") {
          router.push("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, rol, activo, loading, signOut }}>
      {loading ? (
        <div className="fixed inset-0 bg-white dark:bg-black z-[100] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 border-4 border-neutral-100 dark:border-neutral-900 border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-widest uppercase italic">Relojería IA</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2 font-medium">Validando integridad de acceso...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
