"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  rol: "admin" | "recepcion" | "tecnico" | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  rol: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<"admin" | "recepcion" | "tecnico" | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", userId)
      .single();
    
    if (error) {
      console.error("Error fetching role:", error);
      // Si no hay perfil, creamos uno básico de solo lectura o admin si es el primero (opcional)
      // Por ahora, asumimos que el admin existe.
      return null;
    }
    return data?.rol;
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const userRol = await fetchUserProfile(session.user.id);
        setRol(userRol);
      } else {
        setUser(null);
        setRol(null);
      }
      setLoading(false);

      if (!session && pathname !== "/login") {
        router.push("/login");
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setUser(session.user);
          const userRol = await fetchUserProfile(session.user.id);
          setRol(userRol);
        } else {
          setUser(null);
          setRol(null);
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
    <AuthContext.Provider value={{ user, rol, loading, signOut }}>
      {loading ? (
        <div className="fixed inset-0 bg-white dark:bg-black z-[100] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 border-4 border-neutral-100 dark:border-neutral-900 border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-widest uppercase italic">Relojería IA</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2 font-medium font-mono">Verificando credenciales de seguridad...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
