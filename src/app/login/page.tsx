"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } else {
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-black p-6 font-sans">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Branding Superior */}
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-white dark:bg-neutral-900 rounded-[2rem] shadow-2xl mb-6 border border-neutral-100 dark:border-neutral-800">
             <Image src="/logobuenoVectorizado.svg" alt="CTR Logo" width={64} height={64} className="dark:invert object-contain" />
          </div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-widest uppercase italic">Relojería IA</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mt-1 uppercase tracking-tighter">Acceso Administrativo Seguro</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-10 shadow-2xl border border-neutral-100 dark:border-neutral-800 relative group overflow-hidden">
          {/* Sutil gradiente de fondo en hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-neutral-50/50 to-white/0 dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500"></div>
          
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Correo Electrónico</label>
              <input 
                required
                type="email" 
                placeholder="relojeria@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-inner placeholder:font-normal placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Contraseña</label>
              <input 
                required
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-inner placeholder:font-normal placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
              />
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

        {/* Footer info */}
        <p className="text-center mt-10 text-[10px] font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest leading-loose">
          Solo personal autorizado.<br/>
          Si no tienes acceso, contacta al desarrollador.
        </p>
      </div>
    </div>
  );
}
