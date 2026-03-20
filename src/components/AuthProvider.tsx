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
        router.replace("/login");
        // Failsafe: Si el router de Next falla en redirigir una página protegida
        setTimeout(() => {
          if (window.location.pathname !== "/login") window.location.href = "/login";
        }, 500);
      }
    };

    checkUser();

    // Failsafe: Máximo 5 segundos de carga inicial
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          // Establecer usuario básico de inmediato para evitar estados nulos
          setUser(session.user);
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            if (!profile.activo) {
              await supabase.auth.signOut();
              setUser(null);
              setRol(null);
              setActivo(false);
              router.push("/login?error=Cuenta desactivada.");
            } else {
              setRol(profile.rol);
              setActivo(true);
            }
          } else {
              // Si no hay perfil, lo tratamos como técnico por seguridad o lo expulsamos
              setRol('tecnico'); 
          }
        } else {
          setUser(null);
          setRol(null);
          setActivo(true);
        }
        setLoading(false);
        
        if (!session && pathname !== "/login") {
          router.replace("/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [pathname, router]);

  // Nuevo efecto: Si estamos en /login, NUNCA debemos estar en loading permanentemente
  useEffect(() => {
    if (pathname === "/login") {
      setLoading(false);
    }
  }, [pathname]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRol(null);
      setActivo(true);
      router.replace("/login");
      // Failsafe: Hard redirect
      setTimeout(() => {
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 1000);
    } catch (err) {
      console.error("Error signing out:", err);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, rol, activo, loading, signOut }}>
      {loading ? (
        <div className="fixed inset-0 bg-white dark:bg-black z-[100] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 border-4 border-neutral-100 dark:border-neutral-900 border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-widest uppercase italic border-r-4 border-neutral-900 dark:border-white pr-4">Relojería IA</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-4 font-bold uppercase tracking-[0.4em] animate-pulse">Sincronizando seguridad...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
