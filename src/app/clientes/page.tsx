"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users, Search, Plus, Phone, Clock, DollarSign, X, Loader2, ChevronRight, 
  ExternalLink, MessageCircle, BarChart3, TrendingUp, Calendar, Watch
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

// --- Types ---
interface Reparacion {
  id: string;
  numero_recibo: string;
  marca: string;
  modelo_descripcion: string;
  estado: string;
  precio_final: number;
  saldo_pendiente: number;
  fecha_ingreso: string;
}

interface Cliente {
  id: string;
  nombre_completo: string;
  telefono: string;
  created_at: string;
  reparaciones: Reparacion[];
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const { user, sessionReady, lastFocusAt } = useAuth();

  useEffect(() => {
    // v10.8.5: Se utiliza user?.id como dependencia para evitar disparos por refresco de token.
    if (user?.id && sessionReady) {
      fetchInitialData();
    }
  }, [user?.id, sessionReady]); // Sincronización estable por ID

  async function fetchInitialData(retries = 3) {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch clients and join repairs
      const { data, error } = await supabase
        .from('clientes')
        .select(`*, reparaciones!reparaciones_cliente_id_fkey(*)`)
        .order('nombre_completo', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (e: any) {
      const isTransient = 
        e.name === 'AbortError' || 
        e.message?.includes("Lock broken") || 
        e.message?.includes("fetch") ||
        e.code === 'PGRST301';

      if (retries > 0 && isTransient) {
        console.warn(`🔄 Clientes (v10.8.12): Re-sync detectado, reintentando...`, retries);
        await new Promise(r => setTimeout(r, 800));
        return fetchInitialData(retries - 1);
      }
      console.error("Error crítico en fetchClientes (Clientes):", e);
    } finally {
      setIsLoading(false);
    }
  }

  // --- Logic ---
  const filteredClientes = clientes.filter(c => 
    (c.nombre_completo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telefono || "").includes(searchTerm)
  );

  const stats = {
    total: clientes.length,
    frecuentes: clientes.filter(c => c.reparaciones.length > 2).length,
    conDeuda: clientes.filter(c => c.reparaciones.some(r => r.saldo_pendiente > 0)).length,
    totalReparaciones: clientes.reduce((acc, c) => acc + c.reparaciones.length, 0)
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'entregado': return 'bg-emerald-500/10 text-emerald-500';
      case 'en reparacion': return 'bg-amber-500/10 text-amber-500';
      case 'en diagnostico': return 'bg-blue-500/10 text-blue-500';
      case 'listo': return 'bg-purple-500/10 text-purple-500';
      case 'garantia': return 'bg-red-500/10 text-red-500';
      default: return 'bg-neutral-500/10 text-neutral-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-black p-6 lg:p-10 space-y-10 transition-colors duration-500">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-neutral-900 dark:text-white leading-none">
            Directorio <span className="text-neutral-300 dark:text-neutral-800">Clientes</span>
          </h1>
          <p className="text-neutral-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3 ml-1 flex items-center gap-2">
            <Users className="w-3 h-3" /> Gestión de Clientes
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-1.5 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-xl focus-within:ring-2 focus-within:ring-black/5 transition-all">
          <div className="pl-4 text-neutral-400">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="BUSCAR CLIENTE O TELÉFONO..." 
            className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest w-64 md:w-72 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clientes", val: stats.total, icon: Users, color: "text-blue-500" },
          { label: "Clientes VIP (+2)", val: stats.frecuentes, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Con Pendientes", val: stats.conDeuda, icon: DollarSign, color: "text-red-500" },
          { label: "Relojes Procesados", val: stats.totalReparaciones, icon: BarChart3, color: "text-amber-500" },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900/50 p-6 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm group hover:scale-[1.02] transition-all duration-500">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className="text-neutral-200 dark:text-neutral-800 font-black text-2xl">0{i+1}</span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">{s.label}</p>
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">{s.val}</h3>
          </div>
        ))}
      </div>

      {/* Main Content: Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-neutral-200" />
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400">Sincronizando base de datos...</p>
          </div>
        ) : filteredClientes.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-center p-8">
            <div className="p-6 rounded-full bg-neutral-50 dark:bg-neutral-800 mb-4">
              <Users className="w-10 h-10 text-neutral-200" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Sin coincidencias</h3>
            <p className="text-neutral-400 font-bold max-w-xs text-xs">No hemos encontrado clientes con ese nombre o número de teléfono.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-50 dark:border-neutral-800">
                  <th className="p-8 text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400">Identidad</th>
                  <th className="p-8 text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400">Contacto</th>
                  <th className="p-8 text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400">Volumen</th>
                  <th className="p-8 text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400">Estado Cuenta</th>
                  <th className="p-8 text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/10">
                {filteredClientes.map((c) => {
                  const totalDeuda = c.reparaciones.reduce((sum, r) => sum + r.saldo_pendiente, 0);
                  return (
                    <tr 
                      key={c.id} 
                      className="group cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
                      onClick={() => setSelectedCliente(c)}
                    >
                      <td className="p-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-base shadow-lg">
                            {c.nombre_completo.charAt(0)}
                          </div>
                          <div>
                            <p className="text-base font-black uppercase tracking-tighter text-neutral-900 dark:text-white group-hover:translate-x-1 transition-transform">{c.nombre_completo}</p>
                            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mt-0.5">Registrado {new Date(c.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 text-xs font-bold text-neutral-600 dark:text-neutral-400 tabular-nums">
                        {c.telefono}
                      </td>
                      <td className="p-8">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[9px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap">
                          {c.reparaciones.length} Relojes
                        </span>
                      </td>
                      <td className="p-8">
                        <p className={`text-lg font-black tabular-nums ${totalDeuda > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          ${totalDeuda}
                        </p>
                      </td>
                      <td className="p-8 text-right">
                        <button className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-neutral-400 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal / Sidebar */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-xl h-full p-10 overflow-y-auto shadow-2xl animate-in slide-in-from-right-10 duration-700">
            <div className="flex justify-between items-center mb-10">
              <button 
                onClick={() => setSelectedCliente(null)} 
                className="p-3 rounded-full bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex gap-4">
                <a 
                  href={`https://wa.me/${selectedCliente.telefono.replace(/\s+/g, '')}`} 
                  target="_blank" 
                  className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                {selectedCliente.reparaciones.some(r => r.estado === 'listo') && (
                  <button 
                    onClick={async () => {
                      if (!confirm("¿Deseas marcar TODOS los relojes LISTOS como ENTREGADOS?")) return;
                      try {
                        const readyIds = selectedCliente.reparaciones.filter(r => r.estado === 'listo').map(r => r.id);
                        
                        // 1. Update repairs
                        await supabase.from('reparaciones').update({ estado: 'entregado' }).in('id', readyIds);
                        
                        // 2. Create History Records
                        const historyEntries = readyIds.map(id => ({
                          reparacion_id: id,
                          usuario_id: user?.id || null,
                          evento: "Entrega Express",
                          estado_anterior: "listo",
                          estado_nuevo: "entregado",
                          notas: "Entrega masiva desde el perfil de cliente."
                        }));
                        await supabase.from('historial_reparaciones').insert(historyEntries);

                        alert("¡Entrega masiva completada!");
                        fetchInitialData();
                        setSelectedCliente(null);
                      } catch (err: any) { alert(err.message); }
                    }}
                    className="px-6 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-black/10"
                  >
                    <Clock className="w-4 h-4" /> Entregar todo
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-10">
              <div className="text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-4xl mx-auto shadow-2xl mb-4">
                  {selectedCliente.nombre_completo.charAt(0)}
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-1">{selectedCliente.nombre_completo}</h2>
                <div className="flex items-center justify-center gap-3 text-neutral-500 font-bold uppercase tracking-widest text-[9px]">
                  <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {selectedCliente.telefono}</span>
                  <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Miembro {new Date(selectedCliente.created_at).getFullYear()}</span>
                </div>
              </div>

              {/* History Section */}
              <div className="space-y-5 pt-10 border-t dark:border-neutral-800">
                <div className="flex justify-between items-end">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter">Historial de Servicios</h3>
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">{selectedCliente.reparaciones.length} REGISTROS</span>
                </div>

                <div className="grid gap-3">
                  {selectedCliente.reparaciones.length === 0 ? (
                    <div className="p-10 rounded-[1.5rem] bg-neutral-50 dark:bg-neutral-800/50 text-center text-neutral-400 font-bold text-xs italic">
                      No hay relojes registrados para este cliente.
                    </div>
                  ) : (
                    selectedCliente.reparaciones.map((rep) => (
                      <div key={rep.id} className="p-6 rounded-[2rem] bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between group hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base ${getStatusColor(rep.estado)}`}>
                            <Watch className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-tighter">{rep.marca}</p>
                            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mt-0.5">{rep.modelo_descripcion || 'Modelo Genérico'}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${getStatusColor(rep.estado)}`}>
                                {rep.estado}
                              </span>
                              <span className="text-[7px] font-black text-neutral-400 uppercase tracking-widest tabular-nums font-mono">
                                #{rep.numero_recibo} • {new Date(rep.fecha_ingreso).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black tabular-nums">${rep.precio_final}</p>
                          {rep.saldo_pendiente > 0 && (
                            <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mt-1">Saldo: ${rep.saldo_pendiente}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="pt-10">
                <Link 
                  href={`/reparaciones?cliente=${selectedCliente.nombre_completo}`}
                  className="w-full py-4 rounded-[1.5rem] bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 hover:translate-y-[-2px] transition-all shadow-xl"
                >
                  <Plus className="w-4 h-4" /> Registrar Nuevo Reloj
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
