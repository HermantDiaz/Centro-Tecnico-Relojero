"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";

const BUILD_VERSION = "CRM-ESTABLE-v10.8-TITANIUM-STABLE";
console.log(`🚀 ${BUILD_VERSION}: Protocolo de Blindaje de Sesión activo.`);

interface AuthContextType {
  user: User | null;
  rol: "admin" | "recepcion" | "tecnico" | null;
  activo: boolean;
  loading: boolean;
  sessionReady: boolean;
  lastFocusAt: number;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  rol: null,
  activo: true,
  loading: true,
  sessionReady: false,
  lastFocusAt: 0,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // v10.8: Estado inicial neutral (Evita error de hidratación)
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<"admin" | "recepcion" | "tecnico" | null>(null);
  const [activo, setActivo] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [lastFocusAt, setLastFocusAt] = useState(0);
  
  const router = useRouter();
  const pathname = usePathname();

  const updateRoleAndStatus = (newRol: any, newActivo: boolean) => {
    setRol(newRol);
    setActivo(newActivo);
    if (typeof window !== 'undefined') {
      if (newRol) sessionStorage.setItem('ctr-v1-rol', newRol);
      else sessionStorage.removeItem('ctr-v1-rol');
      sessionStorage.setItem('ctr-v1-activo', String(newActivo));
    }
  };

  async function fetchUserProfile(userId: string, retries = 3): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("perfiles")
        .select("rol, activo")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    } catch (error: any) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 400));
        return fetchUserProfile(userId, retries - 1);
      }
      return null;
    }
  }

  // --- EFECTO 1: MONTAJE Y SINCRONIZACIÓN (SOLO CLIENTE) ---
  useEffect(() => {
    let mounted = true;
    let authTimeout: NodeJS.Timeout;

    const initSesion = async () => {
      // Failsafe: No dejar la pantalla de carga más de 4s
      authTimeout = setTimeout(() => { if (mounted) setLoading(false); }, 4000);

      // 1. HIDRATACIÓN GENESIS (Memoria local)
      const stored = sessionStorage.getItem('ctr-v1-token');
      const cachedRol = sessionStorage.getItem('ctr-v1-rol') as any;
      const cachedActivo = sessionStorage.getItem('ctr-v1-activo') !== 'false';

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.access_token && parsed.user) {
            console.log(`🛡️ ${BUILD_VERSION}: Sincronización post-montaje OK.`);
            setUser(parsed.user);
            if (cachedRol) setRol(cachedRol);
            setActivo(cachedActivo);

            // Inyectamos al SDK para que las consultas RLS funcionen
            await supabase.auth.setSession({
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token
            });
          }
        } catch (e) {
          console.warn("Titan Mount Sync Error", e);
        }
      }

      // 2. LISTENER ÚNICO DE SUPABASE (Singleton)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔐 ${BUILD_VERSION}: Auth Event -> ${event}`);
        if (!mounted) return;

        if (session) {
          sessionStorage.setItem('ctr-v1-token', JSON.stringify(session));
          setUser(session.user);
          
          const profile = await fetchUserProfile(session.user.id);
          if (profile && mounted) {
            updateRoleAndStatus(profile.rol, profile.activo);
            if (!profile.activo) {
              await supabase.auth.signOut();
              window.location.href = "/login?error=Cuenta desactivada.";
            }
          }

          if (mounted) {
            setSessionReady(true);
            setLoading(false);
            clearTimeout(authTimeout);
          }
        } else {
          // Si no hay sesión, limpiamos y marcamos listo
          if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
             console.log(`🔐 ${BUILD_VERSION}: No se detectó sesión activa.`);
             sessionStorage.removeItem('ctr-v1-token');
             setUser(null);
             updateRoleAndStatus(null, true);
             if (mounted) {
                setSessionReady(true);
                setLoading(false);
                clearTimeout(authTimeout);
             }
          }
        }
      });

      return () => { subscription.unsubscribe(); };
    };

    initSesion();

    // 3. HEARTBEAT (Focus de ventana)
    const handleFocus = async () => {
      setLastFocusAt(Date.now());
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && mounted) {
        const stored = sessionStorage.getItem('ctr-v1-token');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            await supabase.auth.setSession({
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token
            });
          } catch {}
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
      clearTimeout(authTimeout);
    };
  }, []);

  // --- EFECTO 2: GUARDIA DE REDIRECCIÓN (SMART GUARD) ---
  // Este efecto solo se preocupa de DONDE estamos, basándose en QUIEN somos.
  useEffect(() => {
    if (loading || !sessionReady) return; // No emitir juicios mientras cargamos

    if (!user && pathname !== "/login") {
      console.log(`🔐 ${BUILD_VERSION}: SmartGuard -> Redirigiendo a Login.`);
      router.replace("/login");
    } else if (user && pathname === "/login") {
      console.log(`🔐 ${BUILD_VERSION}: SmartGuard -> Usuario autenticado, volviendo.`);
      router.replace("/");
    }
  }, [user, loading, sessionReady, pathname, router]);

  const signOut = async () => {
    setUser(null);
    updateRoleAndStatus(null, true);
    sessionStorage.clear();
    
    try {
      await supabase.auth.signOut().catch(() => {});
      router.replace("/login");
      setTimeout(() => { if (typeof window !== 'undefined') window.location.href = "/login"; }, 200);
    } catch (err) {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, rol, activo, loading, sessionReady, lastFocusAt, signOut }}>
      {children}

      {/* Pantalla Splash Sincronizada */}
      {loading && (
        <div className="fixed inset-0 bg-white dark:bg-neutral-950 z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 border-4 border-neutral-100 dark:border-neutral-900 border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-widest uppercase italic border-r-4 border-neutral-900 dark:border-white pr-4">Relojería IA</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-[10px] mt-4 font-bold uppercase tracking-[0.4em] animate-pulse">Protegiendo sistema TITANIUM...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
