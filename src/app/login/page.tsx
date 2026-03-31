"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth(); // Esperar a que la sesión global esté lista

  // El redireccionamiento es reactivo al estado global para evitar cierres prematuros
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!email.includes("@")) {
      setError("Por favor, ingresa un correo electrónico válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message === "Invalid login credentials" 
        ? "Credenciales incorrectas. Verifica tu correo y contraseña." 
        : loginError.message
      );
      setLoading(false); // Solo liberamos el botón si hay error
    } else {
      // SI HAY ÉXITO: 
      // No hacemos router.push manual. Dejamos que el onAuthStateChange del AuthProvider haga su magia,
      // lea el perfil, asigne el rol, y modifique el context { user }. 
      // Eso disparará el useEffect de arriba y nos llevará a "/" de forma 100% segura.
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-black p-6 font-sans">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Branding Superior: Solo Logo */}
        <div className="text-center mb-10">
          <div className="inline-block p-6 bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl mb-4 border border-neutral-100 dark:border-neutral-800 transform hover:scale-105 transition-transform duration-500">
             <Image src="/logobuenoVectorizado.svg" alt="CTR Logo" width={80} height={80} style={{ width: '80px', height: '80px' }} className="dark:invert object-contain" priority />
          </div>
          <p className="text-neutral-400 dark:text-neutral-500 text-[10px] font-black uppercase tracking-[0.3em] mt-4">Acceso Seguro</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-10 shadow-2xl border border-neutral-100 dark:border-neutral-800 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-neutral-50/50 to-white/0 dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500"></div>
          
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Correo Electrónico</label>
              <input 
                required
                type="email" 
                placeholder="usuario@relojeria.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-inner"
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Contraseña</label>
              <input 
                required
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-inner"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 bottom-4 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
                title={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl animate-in shake duration-300">
                <p className="text-[10px] text-red-600 dark:text-red-400 font-black uppercase leading-tight">{error}</p>
              </div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-black/20 dark:shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 group"
            >
              <span className="group-hover:tracking-[0.3em] transition-all duration-300">
                {loading ? "VERIFICANDO..." : "INGRESAR AL SISTEMA"}
              </span>
            </button>
          </form>
        </div>

        <p className="text-center mt-10 text-[9px] font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest leading-loose">
           Propiedad Exclusiva de CTR Relojería<br/>
           © 2026 Sistema Administrativo IA
        </p>
      </div>
    </div>
  );
}
