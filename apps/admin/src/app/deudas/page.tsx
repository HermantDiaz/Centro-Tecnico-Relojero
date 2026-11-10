"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useCaja } from "@/hooks/useCaja";
import { supabase } from "@/lib/supabase";
import { HandCoins, Plus, Wallet, X, Receipt, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAudit } from "@/hooks/useAudit";

const TIPOS_DEUDA = ["Proveedor", "Impuesto", "Prestamo", "Otro"] as const;

interface DeudaEmpresa {
    id: string;
    acreedor: string;
    monto_total: number;
    saldo_pendiente: number;
    tipo: typeof TIPOS_DEUDA[number];
    fecha_vencimiento: string;
    estado: 'Pendiente' | 'Parcial' | 'Saldada';
    notas: string;
}

interface CuentaTesoreria {
    id: string;
    nombre: string;
    tipo: string;
    saldo: number;
}

export default function DeudasPage() {
  const { rol, user, loading: authLoading } = useAuth();
  const { session, loading: cajaLoading, addMovimiento } = useCaja();
  const router = useRouter();
  const { logEvent } = useAudit();
  
  const [cuentas, setCuentas] = useState<CuentaTesoreria[]>([]);
  const [deudas, setDeudas] = useState<DeudaEmpresa[]>([]);
  
  const [isDeudaModalOpen, setIsDeudaModalOpen] = useState(false);
  const [nuevaDeuda, setNuevaDeuda] = useState({ acreedor: "", monto: "", tipo: "Proveedor" as any, vencimiento: "", notas: "" });
  const [pagoDeudaData, setPagoDeudaData] = useState<{deudaId: string, monto: string, origen: string, acreedor: string, saldoMaximo: number} | null>(null);
  
  const [historialDeudaData, setHistorialDeudaData] = useState<{deuda: DeudaEmpresa, abonos: any[]} | null>(null);

  const fetchData = useCallback(async () => {
    // 1. Cuentas Tesorería
    const { data: cts } = await supabase.from('tesoreria_cuentas').select('*').order('nombre');
    if (cts) setCuentas(cts);

    // 2. Deudas
    const { data: dds } = await supabase.from('deudas_empresa').select('*').order('fecha_vencimiento');
    if (dds) setDeudas(dds);
  }, []);

  useEffect(() => {
    if (user && rol === 'admin') {
        fetchData();
    }
  }, [user, rol, fetchData]);

  if (authLoading || cajaLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-black dark:border-t-white rounded-full animate-spin"></div>
    </div>
  );

  if (rol !== 'admin') {
      if (!authLoading) router.push('/');
      return null;
  }

  const handleAddDeuda = async () => {
      try {
          const { error } = await supabase.from('deudas_empresa').insert([{
              acreedor: nuevaDeuda.acreedor,
              monto_total: Number(nuevaDeuda.monto),
              saldo_pendiente: Number(nuevaDeuda.monto),
              tipo: nuevaDeuda.tipo,
              fecha_vencimiento: nuevaDeuda.vencimiento,
              notas: nuevaDeuda.notas,
              estado: 'Pendiente'
          }]);
          if (error) throw error;
          setIsDeudaModalOpen(false);
          setNuevaDeuda({ acreedor: "", monto: "", tipo: "Proveedor", vencimiento: "", notas: "" });
          fetchData();
          await logEvent('CREADO', 'Deudas', `Se registró nueva deuda con ${nuevaDeuda.acreedor} por $${nuevaDeuda.monto}`);
      } catch (e: any) { alert(e.message); }
  }

  const handleAbonarDeuda = async () => {
      if (!session) {
          alert("Debes abrir la caja diaria en el Módulo de Finanzas antes de poder registrar un pago bancario/efectivo.");
          return;
      }
      if (!pagoDeudaData || !pagoDeudaData.monto) return;
      
      const montoPagar = Number(pagoDeudaData.monto);
      if (montoPagar <= 0) {
          alert("El abono debe ser mayor a 0.");
          return;
      }
      if (montoPagar > pagoDeudaData.saldoMaximo) {
          alert(`No puedes abonar más del saldo pendiente ($${pagoDeudaData.saldoMaximo.toFixed(2)}).`);
          return;
      }

      const origenSelec = cuentas.find(c => c.nombre === pagoDeudaData.origen);
      if (!origenSelec) {
          alert(`Cuenta de origen (${pagoDeudaData.origen}) no encontrada.`);
          return;
      }
      if (origenSelec.saldo < montoPagar) {
          alert(`FONDOS INSUFICIENTES: Tienes $${origenSelec.saldo.toFixed(2)} disponibles en ${pagoDeudaData.origen}, pero intentas abonar $${montoPagar.toFixed(2)}.`);
          return;
      }

      try {
          // 1. Generar Egreso en Caja
          await addMovimiento({
              tipo: 'egreso',
              monto: montoPagar,
              utilidad_neta: 0,
              concepto: `PAGO DEUDA: ${pagoDeudaData.acreedor}`,
              categoria: 'Otros',
              metodo_pago: pagoDeudaData.origen as any,
              es_traslado: false
          });

          // 2. Actualizar Deuda
          const nuevoSaldo = pagoDeudaData.saldoMaximo - montoPagar;
          const { error } = await supabase.from('deudas_empresa')
              .update({
                  saldo_pendiente: nuevoSaldo,
                  estado: nuevoSaldo <= 0 ? 'Saldada' : (nuevoSaldo < (pagoDeudaData.saldoMaximo) ? 'Parcial' : 'Pendiente')
              })
              .eq('id', pagoDeudaData.deudaId);
          
          if (error) throw error;

          // 3. Auditoría
          await logEvent('PAGO DEUDA', 'Deudas', `Se abonaron $${montoPagar.toFixed(2)} a ${pagoDeudaData.acreedor} desde ${pagoDeudaData.origen}. Saldo restante: $${nuevoSaldo.toFixed(2)}`);

          alert('Abono registrado exitosamente.');
          setPagoDeudaData(null);
          fetchData();
      } catch (e: any) {
          alert(`Error al abonar: ${e.message}`);
      }
  };

  const handleVerHistorial = async (d: DeudaEmpresa) => {
      try {
          const { data, error } = await supabase
              .from('caja_movimientos')
              .select('*')
              .ilike('concepto', `%PAGO DEUDA: ${d.acreedor}%`)
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          setHistorialDeudaData({ deuda: d, abonos: data || [] });
      } catch (e: any) { 
          alert("Error cargando historial: " + e.message); 
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-900 overflow-x-hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-600 mb-2">Administración Pasiva</p>
          <h1 className="text-5xl font-black text-neutral-900 dark:text-white tracking-tighter uppercase italic">Deudas & Pasivos</h1>
        </div>
        <button onClick={() => setIsDeudaModalOpen(true)} className="px-8 py-4 bg-amber-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-amber-600/20 active:scale-95 transition-all flex items-center gap-3">
            <Plus className="w-5 h-5" /> Nueva Obligación
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                      <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400">Acreedor</th>
                      <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400">Tipo / Naturaleza</th>
                      <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400">Vencimiento</th>
                      <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Saldo Pendiente</th>
                      <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Estado</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {deudas.map(d => (
                      <tr key={d.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors group">
                          <td className="px-10 py-7">
                              <p className="text-md font-black text-neutral-900 dark:text-white uppercase tracking-tight">{d.acreedor}</p>
                              <p className="text-[10px] text-neutral-400 font-bold italic mt-1">{d.notas || "Sin anotaciones"}</p>
                          </td>
                          <td className="px-10 py-7">
                              <span className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner">
                                  {d.tipo}
                              </span>
                          </td>
                          <td className="px-10 py-7">
                              <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${new Date(d.fecha_vencimiento) < new Date() ? 'bg-rose-500 animate-pulse' : 'bg-neutral-300'}`}></div>
                                  <span className="text-xs font-black text-neutral-500 uppercase tracking-tighter">{new Date(d.fecha_vencimiento).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}</span>
                              </div>
                          </td>
                          <td className="px-10 py-7 text-right">
                              <div className="flex justify-end gap-3 items-center">
                                  <div className="text-right mr-2">
                                    <p className="text-lg font-black text-rose-600 italic tracking-tighter">${Number(d.saldo_pendiente).toFixed(2)}</p>
                                    <p className="text-[8px] text-neutral-400 font-black uppercase">Original: ${Number(d.monto_total).toFixed(2)}</p>
                                  </div>
                                  <div className="flex gap-2">
                                      <button 
                                        onClick={() => handleVerHistorial(d)} 
                                        className="p-3 bg-neutral-100 hover:bg-blue-500 hover:text-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 dark:hover:bg-blue-500 dark:hover:text-white rounded-[1rem] transition-all shadow-sm group relative"
                                        title="Ver historial de abonos"
                                      >
                                          <History className="w-5 h-5" />
                                      </button>
                                      {d.estado !== 'Saldada' && (
                                          <button 
                                            onClick={() => setPagoDeudaData({deudaId: d.id, monto: "", origen: "Efectivo", acreedor: d.acreedor, saldoMaximo: Number(d.saldo_pendiente)})} 
                                            className="p-3 bg-neutral-100 hover:bg-emerald-500 hover:text-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 dark:hover:bg-emerald-500 dark:hover:text-white rounded-[1rem] transition-all shadow-sm group relative"
                                            title="Abonar a Deuda"
                                          >
                                              💸
                                          </button>
                                      )}
                                  </div>
                              </div>
                          </td>
                          <td className="px-10 py-7 text-right w-24">
                              <span className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                  d.estado === 'Pendiente' ? 'bg-rose-100 text-rose-600 border border-rose-200' :
                                  d.estado === 'Parcial' ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                                  'bg-emerald-100 text-emerald-600 border border-emerald-200'
                              }`}>
                                  {d.estado}
                              </span>
                          </td>
                      </tr>
                  ))}
                  {deudas.length === 0 && (
                      <tr>
                          <td colSpan={5} className="px-8 py-32 text-center">
                              <Receipt className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                              <p className="text-neutral-400 italic font-medium">Empresa libre de obligaciones externas.</p>
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>

      {/* Modal Nueva Deuda */}
      {isDeudaModalOpen && (
          <div onClick={() => setIsDeudaModalOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-300 border border-neutral-100 dark:border-neutral-800 relative">
                  <button onClick={() => setIsDeudaModalOpen(false)} className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all z-[60]">
                      <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-4 mb-8 border-b pb-4 border-neutral-50 dark:border-neutral-800">
                      <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-amber-500/30">🤝</div>
                      <div>
                        <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter leading-none">Nueva ObligaciOn</h3>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Registro de pasivos</p>
                      </div>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Acreedor / Entidad</label>
                          <input placeholder="Ej: Importadora X, DGI" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl p-4 font-black text-sm" value={nuevaDeuda.acreedor} onChange={(e) => setNuevaDeuda({...nuevaDeuda, acreedor: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Monto ($)</label>
                              <input type="number" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl p-4 font-black text-xl italic text-rose-500" value={nuevaDeuda.monto} onChange={(e) => setNuevaDeuda({...nuevaDeuda, monto: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Tipo</label>
                              <select className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl p-4 font-black text-[10px] uppercase tracking-widest" value={nuevaDeuda.tipo} onChange={(e) => setNuevaDeuda({...nuevaDeuda, tipo: e.target.value as any})}>
                                  {TIPOS_DEUDA.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Vencimiento</label>
                          <input type="date" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl p-4 font-black text-xs" value={nuevaDeuda.vencimiento} onChange={(e) => setNuevaDeuda({...nuevaDeuda, vencimiento: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Anotaciones</label>
                          <textarea rows={2} className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl p-3 font-bold text-xs" value={nuevaDeuda.notas} onChange={(e) => setNuevaDeuda({...nuevaDeuda, notas: e.target.value})} />
                      </div>
                      <div className="pt-2">
                        <button onClick={handleAddDeuda} className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-2">Confirmar Pasivo</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Abonar Deuda */}
      {pagoDeudaData && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[3.5rem] p-10 relative overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 scale-in-center">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Wallet className="w-32 h-32 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter mb-6 relative z-10">Abonar a Deuda</h2>
                  
                  <div className="p-5 bg-neutral-100 dark:bg-neutral-800 rounded-3xl mb-6 relative z-10 border border-neutral-200 dark:border-neutral-700">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Acreedor</p>
                      <p className="text-xl font-black text-neutral-900 dark:text-white truncate tracking-tight">{pagoDeudaData.acreedor}</p>
                      <div className="flex justify-between items-end mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                          <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider">Saldo Pendiente</span>
                          <span className="text-3xl font-black text-rose-500 italic tracking-tighter">${pagoDeudaData.saldoMaximo.toFixed(2)}</span>
                      </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                      <div>
                         <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Monto a Abonar</label>
                         <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-neutral-400 text-xl">$</span>
                            <input 
                              type="number" 
                              step="0.01" 
                              max={pagoDeudaData.saldoMaximo} 
                              value={pagoDeudaData.monto} 
                              onChange={e => setPagoDeudaData({...pagoDeudaData, monto: e.target.value})} 
                              className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl pl-10 pr-5 py-4 text-2xl font-black shadow-inner text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                              placeholder="0.00" 
                            />
                         </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Origen de Fondos</label>
                          <select 
                            value={pagoDeudaData.origen} 
                            onChange={e => setPagoDeudaData({...pagoDeudaData, origen: e.target.value})} 
                            className="w-full bg-neutral-50 dark:bg-neutral-800 rounded-2xl px-5 py-4 text-sm font-bold shadow-inner appearance-none border border-transparent focus:border-emerald-500 outline-none transition-all"
                          >
                              {cuentas.map(c => (
                                  <option key={c.id} value={c.nombre}>{c.tipo} ({c.nombre}) - Saldo: ${c.saldo.toFixed(2)}</option>
                              ))}
                          </select>
                      </div>
                      <div className="flex gap-4 pt-4 mt-8 border-t border-neutral-100 dark:border-neutral-800">
                          <button onClick={() => setPagoDeudaData(null)} className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] uppercase tracking-widest font-black rounded-[2rem] hover:bg-neutral-200 transition-colors cursor-pointer">Cancelar</button>
                          <button onClick={handleAbonarDeuda} className="flex-1 py-4 bg-emerald-500 text-white text-[10px] uppercase tracking-widest font-black rounded-[2rem] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer">Pagar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Historial Abonos */}
      {historialDeudaData && (
          <div onClick={() => setHistorialDeudaData(null)} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[3rem] p-10 relative overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-300">
                  <button onClick={() => setHistorialDeudaData(null)} className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all z-[60]">
                      <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-4 mb-8 border-b pb-4 border-neutral-50 dark:border-neutral-800">
                      <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-500/30">
                          <History className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter leading-none">Historial de Abonos</h3>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1">{historialDeudaData.deuda.acreedor}</p>
                      </div>
                  </div>
                  
                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 space-y-4">
                      {historialDeudaData.abonos.length === 0 ? (
                          <div className="py-10 text-center text-neutral-400 italic font-medium">
                              No hay abonos registrados para esta deuda.
                          </div>
                      ) : (
                          historialDeudaData.abonos.map((abono, idx) => (
                              <div key={idx} className="p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                  <div>
                                      <p className="text-sm font-black text-neutral-900 dark:text-white uppercase">{new Date(abono.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Origen: {abono.metodo_pago}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-xl font-black text-emerald-500 italic">-${Number(abono.monto).toFixed(2)}</p>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
