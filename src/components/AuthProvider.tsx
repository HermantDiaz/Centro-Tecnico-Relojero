"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";

const BUILD_VERSION = "CRM-ESTABLE-v10.8.11-TITANIUM-SINGLETON";
console.log(`🚀 ${BUILD_VERSION}: Protocolo de Escudo Singleton activo.`);

interface AuthContextType {
  user: User | null;
  rol: "admin" | "recepcion" | "tecnico" | null;
  activo: boolean;
  loading: boolean;
  sessionReady: boolean;
  isGracePeriod: boolean;
  lastFocusAt: number;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  rol: null,
  activo: true,
  loading: true,
  sessionReady: false,
  isGracePeriod: false,
  lastFocusAt: 0,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<"admin" | "recepcion" | "tecnico" | null>(null);
  const [activo, setActivo] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [lastFocusAt, setLastFocusAt] = useState(0);
  
  const subRef = useRef<any>(null); // Singleton Ref
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

  useEffect(() => {
    let mounted = true;
    let authTimeout: NodeJS.Timeout;
    let graceTimeout: NodeJS.Timeout;

    // v10.8.11: ESCUDO SINGLETON
    // Evitamos crear múltiples suscripciones duplicadas en modo estricto.
    if (subRef.current) {
        subRef.current.unsubscribe();
        subRef.current = null;
    }

    const initSesion = async () => {
      authTimeout = setTimeout(() => { if (mounted) setLoading(false); }, 4000);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          console.log(`🔐 ${BUILD_VERSION}: Auth Event -> ${event}`);
          if (!mounted) return;

          if (session) {
            setUser(session.user);
            setIsGracePeriod(false); 
            
            // Perfil paralelo (No bloquea la entrada al sistema)
            fetchUserProfile(session.user.id).then(profile => {
                if (profile && mounted) {
                    updateRoleAndStatus(profile.rol, profile.activo);
                    if (!profile.activo) {
                        supabase.auth.signOut();
                        window.location.href = "/login?error=Cuenta desactivada.";
                    }
                }
            });

            if (mounted) {
              setSessionReady(true);
              setLoading(false);
              clearTimeout(authTimeout);
            }
          } else {
            if (event === 'INITIAL_SESSION') {
               console.log(`⏳ ${BUILD_VERSION}: Periodo de Gracia Activo...`);
               setIsGracePeriod(true);
               graceTimeout = setTimeout(() => {
                 if (mounted && !user) {
                   console.log(`🚪 ${BUILD_VERSION}: Fin de Gracia. Login.`);
                   setIsGracePeriod(false);
                   setSessionReady(true);
                   setLoading(false);
                   clearTimeout(authTimeout);
                 }
               }, 2500);
            } else if (event === 'SIGNED_OUT') {
               setUser(null);
               updateRoleAndStatus(null, true);
               if (mounted) {
                  setSessionReady(true);
                  setLoading(false);
                  clearTimeout(authTimeout);
               }
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError' || err.message?.includes("Lock broken")) {
            console.warn(`🛡️ ${BUILD_VERSION}: Colisión de lock detectada y neutralizada.`);
            if (mounted) {
                setSessionReady(true);
                setLoading(false);
                clearTimeout(authTimeout);
            }
          } else {
            console.error("Auth Listener Error:", err);
          }
        }
      });

      subRef.current = subscription;
    };

    initSesion();

    const handleFocus = async () => {
      if (!mounted) return;
      setLastFocusAt(Date.now());
      try {
        await supabase.auth.getSession();
      } catch (err: any) {
        // Silenciamos AbortError
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
      clearTimeout(authTimeout);
      clearTimeout(graceTimeout);
      if (subRef.current) {
          subRef.current.unsubscribe();
          subRef.current = null;
      }
    };
  }, []);

  const isPublicRoute =
    pathname === "/login" ||
    pathname?.startsWith("/tienda") ||
    pathname?.startsWith("/rastreo") ||
    pathname?.startsWith("/catalogo");

  useEffect(() => {
    if (loading || !sessionReady || isGracePeriod) return;

    if (!user && !isPublicRoute) {
      console.log(`🔐 ${BUILD_VERSION}: SmartGuard -> Redirigiendo a Login.`);
      router.replace("/login");
    } else if (user && pathname === "/login") {
      console.log(`🔐 ${BUILD_VERSION}: SmartGuard -> Usuario autenticado, volviendo.`);
      router.replace("/");
    }
  }, [user, loading, sessionReady, isGracePeriod, pathname, isPublicRoute, router]);

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
    <AuthContext.Provider value={{ user, rol, activo, loading, sessionReady, isGracePeriod, lastFocusAt, signOut }}>
      {children}
      {loading && !isPublicRoute && (
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
