"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  rol: "admin" | "recepcion" | "tecnico" | null;
  activo: boolean;
  loading: boolean;
  sessionReady: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  rol: null,
  activo: true,
  loading: true,
  sessionReady: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<"admin" | "recepcion" | "tecnico" | null>(null);
  const [activo, setActivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Recuperar estado persistido inmediatamente al cargar para evitar el flash "---"
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedRol = localStorage.getItem('ctr-v1-rol') as any;
      const cachedActivo = localStorage.getItem('ctr-v1-activo');
      if (cachedRol) setRol(cachedRol);
      if (cachedActivo !== null) setActivo(cachedActivo === 'true');
    }
  }, []);

  // Funcin para persistir el rol
  const updateRoleAndStatus = (newRol: any, newActivo: boolean) => {
    setRol(newRol);
    setActivo(newActivo);
    if (typeof window !== 'undefined') {
      if (newRol) localStorage.setItem('ctr-v1-rol', newRol);
      else localStorage.removeItem('ctr-v1-rol');
      localStorage.setItem('ctr-v1-activo', String(newActivo));
    }
  };

  async function fetchUserProfile(userId: string, retries = 5): Promise<any> {
    try {
      // Intentamos recuperar la sesin activa justo antes del fetch para asegurar que el JWT est en los headers
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase
        .from("perfiles")
        .select("rol, activo")
        .eq("id", userId)
        .single();
      
      if (error) {
        // Si es un error de permisos o lock, reintentamos con un refresco de token forzado en el ltimo intento
        if (error.code === 'PGRST116' || error.message?.includes("Lock broken") || error.message?.includes("JWT")) {
          throw error;
        }
        throw error;
      }
      return data;
    } catch (error: any) {
      if (retries > 0) {
        const delay = retries === 1 ? 1000 : 300; // Escalado de reintentos
        await new Promise(r => setTimeout(r, delay));
        if (retries === 1) await supabase.auth.refreshSession(); // ltimo intento: Forzar refresco
        return fetchUserProfile(userId, retries - 1);
      }
      console.error("CRITICAL: Error fetching profile after retries:", error);
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;
    const authTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("DIAGNOSTIC: --- SAFETY TIMEOUT REACHED ---");
        console.warn("Reason: Supabase did not reply in 3 seconds.");
        setLoading(false);
      }
    }, 3000);

    async function initializeAuth() {
      console.log("DIAGNOSTIC: 1. initializeAuth (BOOT START)");
      try {
        // Pequeo retraso para dejar que los locks del navegador se asienten tras F5
        await new Promise(r => setTimeout(r, 200));

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.message.includes("Lock broken")) {
            console.warn("Auth: Lock broken on init, waiting for onAuthStateChange.");
            // En este caso NO llamamos a setLoading(false) todava, 
            // dejamos que el listener lo haga
            return; 
          }
          throw error;
        }

        if (session && mounted) {
          setUser(session.user);
          const profile = await fetchUserProfile(session.user.id);
          if (profile && mounted) {
            updateRoleAndStatus(profile.rol, profile.activo);
            if (!profile.activo) {
              await supabase.auth.signOut();
              router.replace("/login?error=Cuenta desactivada.");
            }
          }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        // Solo desbloqueamos si no hubo error de lock (que se maneja por eventos)
        if (mounted) {
          console.log("DIAGNOSTIC: 2. initializeAuth (FINALLY REACHED - Barrier Open)");
          setSessionReady(true);
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth Event: ${event}`, !!session);
      if (!mounted) return;

      if (session) {
        setUser(session.user);
        
        // Carga de perfil con reintentos para manejar el Lock del navegador
        const handleProfile = async () => {
          const profile = await fetchUserProfile(session.user.id);
          if (profile && mounted) {
            updateRoleAndStatus(profile.rol, profile.activo);
            if (!profile.activo) {
              await supabase.auth.signOut();
              router.replace("/login?error=Cuenta desactivada.");
            }
          }
          if (mounted) {
            setSessionReady(true);
            setLoading(false);
          }
        };

        if (event === 'INITIAL_SESSION') {
          // No bloqueamos el loading principal si ya tenemos rol cacheado
          // Pero disparamos la verificacin en segundo plano
          setTimeout(handleProfile, 10);
        } else {
          await handleProfile();
        }
      } else {
        // --- LA CLAVE ---
        // Si no hay sesin en INITIAL_SESSION, no nos rendimos inmediatamente.
        // Podra ser un retraso del SDK o un lock.
        if (event === 'INITIAL_SESSION') {
          console.log("Auth: No session on initial event, checking storage...");
          const rawToken = localStorage.getItem('ctr-v1-token');
          if (rawToken) {
            console.log("Auth: Found token in storage, waiting for secondary sync...");
            // No hacemos nada, dejamos que initializeAuth o un evento posterior lo maneje
            return;
          }
        }

        // Si realmente no hay sesin (SIGNED_OUT o INITIAL definitivo)
        setUser(null);
        updateRoleAndStatus(null, true);
        if (mounted) setLoading(false);
        
        if (pathname !== "/login" && event !== 'INITIAL_SESSION') {
          router.replace("/login");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(authTimeout);
    };
  }, [router]); // Quitamos pathname de aqu para que no reinicie el listener al navegar

  // Efecto separado para manejo de rutas
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  // Nuevo efecto: Si estamos en /login, NUNCA debemos estar en loading permanentemente
  useEffect(() => {
    if (pathname === "/login") {
      setLoading(false);
    }
  }, [pathname]);

  const signOut = async () => {
    // Primero limpiamos localmente para feedback inmediato
    setUser(null);
    updateRoleAndStatus(null, true);
    localStorage.removeItem('ctr-v1-rol');
    localStorage.removeItem('ctr-v1-activo');
    
    try {
      // Intentamos cerrar sesion en el servidor (no bloqueamos si falla)
      supabase.auth.signOut().catch(e => console.error("SignOut server error:", e));
      router.replace("/login");
      
      // Failsafe: Hard redirect si router falla
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 500);
    } catch (err) {
      console.error("SignOut local error:", err);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, rol, activo, loading, sessionReady, signOut }}>
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
