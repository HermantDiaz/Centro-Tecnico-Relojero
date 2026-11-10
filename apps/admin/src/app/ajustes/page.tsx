"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSettings, EmpresaConfig } from "@/hooks/useSettings";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { Moon, Sun, Monitor, Save, Receipt, Wallet, Building2, Paintbrush, Plus, Trash2 } from "lucide-react";

interface Subcategoria {
  id: string;
  nombre: string;
  descripcion: string;
  categoria_padre: string;
}

const CATEGORIAS_GASTO = ["Compras e Inventario", "Operaciones Fijas", "Planilla y Comisiones", "Marketing y Publicidad", "Servicios Básicos", "Impuestos y Finanzas", "Otros"];

export default function AjustesPage() {
  const { rol } = useAuth();
  const { theme, setTheme } = useTheme();
  const { empresa, refreshConfig } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'apariencia' | 'empresa' | 'finanzas'>('apariencia');

  // Estado local para edición de admin
  const [editConfig, setEditConfig] = useState<EmpresaConfig>(empresa);
  const [saving, setSaving] = useState(false);

  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [newSubcatName, setNewSubcatName] = useState("");
  const [newSubcatDesc, setNewSubcatDesc] = useState("");
  const [newSubcatCatPadre, setNewSubcatCatPadre] = useState("Otros");

  const fetchSubcategorias = async () => {
    const { data } = await supabase.from('caja_subcategorias').select('*').order('created_at', { ascending: false });
    if (data) setSubcategorias(data);
  };

  useEffect(() => {
    setMounted(true);
    setEditConfig(empresa);
    fetchSubcategorias();
  }, [empresa]);

  if (!mounted) return null;

  const handleCreateSubcategoria = async () => {
    if (!newSubcatName.trim()) return;
    const { error } = await supabase.from('caja_subcategorias').insert([{ nombre: newSubcatName, descripcion: newSubcatDesc, categoria_padre: newSubcatCatPadre }]);
    if (error) {
      alert("Error: " + error.message);
    } else {
      setNewSubcatName("");
      setNewSubcatDesc("");
      setNewSubcatCatPadre("Otros");
      fetchSubcategorias();
    }
  };

  const handleDeleteSubcategoria = async (id: string) => {
    if(!confirm('¿Eliminar esta subcategoría?')) return;
    const { error } = await supabase.from('caja_subcategorias').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else fetchSubcategorias();
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('empresa_config')
        .update({
          nombre_empresa: editConfig.nombre_empresa,
          eslogan: editConfig.eslogan,
          direccion_telefono: editConfig.direccion_telefono,
          mensaje_despedida: editConfig.mensaje_despedida,
          moneda_principal: editConfig.moneda_principal
        })
        .eq('id', 'default');

      if (error) throw error;
      alert("Configuración actualizada con éxito. Todos los dispositivos se sincronizarán.");
      await refreshConfig();
    } catch (e: any) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-900 overflow-x-hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-600 mb-2">Sistema / Preferencias</p>
          <h1 className="text-5xl font-black text-neutral-900 dark:text-white tracking-tighter uppercase italic">Ajustes</h1>
        </div>
        {rol === 'admin' && activeTab !== 'apariencia' && (
           <button 
             onClick={handleSaveConfig}
             disabled={saving}
             className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
           >
             <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
           </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-[2rem] w-fit border border-neutral-200 dark:border-neutral-800">
        <button
            onClick={() => setActiveTab('apariencia')}
            className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'apariencia' 
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-lg scale-[1.03]" 
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
        >
            <Paintbrush className="w-3.5 h-3.5" /> Apariencia
        </button>
        {rol === 'admin' && (
          <>
            <button
                onClick={() => setActiveTab('empresa')}
                className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'empresa' 
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-lg scale-[1.03]" 
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
            >
                <Building2 className="w-3.5 h-3.5" /> Empresa y Recibos
            </button>
            <button
                onClick={() => setActiveTab('finanzas')}
                className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'finanzas' 
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-lg scale-[1.03]" 
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
            >
                <Wallet className="w-3.5 h-3.5" /> Finanzas
            </button>
          </>
        )}
      </div>

      {/* Contenido - Apariencia */}
      {activeTab === 'apariencia' && (
        <div className="bg-white dark:bg-neutral-900 rounded-[3rem] p-10 md:p-12 border border-neutral-100 dark:border-neutral-800 shadow-2xl">
           <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter mb-8">Tema Visual</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button 
                onClick={() => setTheme('light')}
                className={`p-8 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-4 transition-all ${theme === 'light' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
              >
                 <Sun className={`w-10 h-10 ${theme === 'light' ? 'text-amber-500' : 'text-neutral-400'}`} />
                 <span className="text-xs font-black uppercase tracking-widest">Claro</span>
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`p-8 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-4 transition-all ${theme === 'dark' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
              >
                 <Moon className={`w-10 h-10 ${theme === 'dark' ? 'text-indigo-500' : 'text-neutral-400'}`} />
                 <span className="text-xs font-black uppercase tracking-widest">Oscuro</span>
              </button>
              <button 
                onClick={() => setTheme('system')}
                className={`p-8 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-4 transition-all ${theme === 'system' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
              >
                 <Monitor className={`w-10 h-10 ${theme === 'system' ? 'text-emerald-500' : 'text-neutral-400'}`} />
                 <span className="text-xs font-black uppercase tracking-widest">Sistema</span>
              </button>
           </div>
        </div>
      )}

      {/* Contenido - Empresa */}
      {activeTab === 'empresa' && rol === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white dark:bg-neutral-900 rounded-[3rem] p-10 md:p-12 border border-neutral-100 dark:border-neutral-800 shadow-2xl">
             <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter mb-8">Datos del Ticket</h3>
             <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Nombre Comercial</label>
                  <input type="text" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-black text-lg" value={editConfig.nombre_empresa} onChange={(e) => setEditConfig({...editConfig, nombre_empresa: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Eslogan o Razón Social</label>
                  <input type="text" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-bold text-sm" value={editConfig.eslogan} onChange={(e) => setEditConfig({...editConfig, eslogan: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Dirección y Teléfono</label>
                  <input type="text" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-bold text-sm" value={editConfig.direccion_telefono} onChange={(e) => setEditConfig({...editConfig, direccion_telefono: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Mensaje de Despedida (Pie de Recibo)</label>
                  <textarea rows={2} className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-bold text-sm" value={editConfig.mensaje_despedida} onChange={(e) => setEditConfig({...editConfig, mensaje_despedida: e.target.value})} />
                </div>
             </div>
          </div>
          
          {/* Previsualización del Ticket */}
          <div className="bg-neutral-100 dark:bg-neutral-950 rounded-[3rem] p-10 md:p-12 border border-neutral-200 dark:border-neutral-900 shadow-inner flex flex-col items-center justify-center relative">
             <div className="absolute top-8 right-8 flex items-center gap-2 opacity-50">
               <Receipt className="w-4 h-4" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em]">Live Preview</span>
             </div>
             
             {/* Mockup del Recibo */}
             <div className="bg-white text-black p-6 rounded-2xl shadow-xl border-t-[6px] border-black w-full max-w-[280px]">
                <div className="text-center mb-5 pb-4 border-b border-dashed border-neutral-300">
                    <div className="text-lg font-black uppercase tracking-[.1em] mb-1 italic">{editConfig.nombre_empresa}</div>
                    <p className="text-[8px] uppercase font-bold text-neutral-500 tracking-widest">{editConfig.eslogan}</p>
                    <p className="text-[7px] text-neutral-500 mt-1">{editConfig.direccion_telefono}</p>
                </div>
                <div className="space-y-2 opacity-50">
                    <div className="flex justify-between border-b border-neutral-100 pb-1"><span className="text-[7px] font-black uppercase">Recibo No.</span><span className="text-[8px] font-black">#DEMO-123</span></div>
                    <div className="flex justify-between border-b border-neutral-100 pb-1"><span className="text-[7px] font-black uppercase">Cliente</span><span className="text-[8px] font-black">PÚBLICO EN GENERAL</span></div>
                    <div className="flex justify-between border-b border-neutral-100 pb-1"><span className="text-[7px] font-black uppercase">Total</span><span className="text-[8px] font-black">{editConfig.moneda_principal} 1,500.00</span></div>
                </div>
                <div className="mt-6 text-center border-t border-neutral-200 pt-4">
                    <p className="text-[7px] font-black text-neutral-500 uppercase italic leading-loose">{editConfig.mensaje_despedida}</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Contenido - Finanzas */}
      {activeTab === 'finanzas' && rol === 'admin' && (
        <div className="space-y-10">
            <div className="bg-white dark:bg-neutral-900 rounded-[3rem] p-10 md:p-12 border border-neutral-100 dark:border-neutral-800 shadow-2xl">
               <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter mb-8">Configuración Regional</h3>
               <div className="max-w-md">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Moneda Principal del Sistema</label>
                  <select 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-black text-2xl uppercase tracking-widest cursor-pointer" 
                    value={editConfig.moneda_principal} 
                    onChange={(e) => setEditConfig({...editConfig, moneda_principal: e.target.value})}
                  >
                      <option value="C$">C$ (Córdobas)</option>
                      <option value="$">$ (Dólares)</option>
                      <option value="€">€ (Euros)</option>
                  </select>
                  <p className="text-[10px] text-neutral-400 mt-4 font-medium px-2">Nota: Esto actualizará el símbolo visual en todos los módulos (Caja, Inventario, Reparaciones) instantáneamente para todos los usuarios.</p>
               </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-[3rem] p-10 md:p-12 border border-neutral-100 dark:border-neutral-800 shadow-2xl">
               <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter mb-8">Subcategorías de Gastos</h3>
               <p className="text-xs text-neutral-500 mb-8">Administra las subcategorías (ej. Refrescos, Transporte) para poder rastrear fugas de dinero en los reportes. Solo tú puedes crear nuevas.</p>
               
               <div className="flex flex-col md:flex-row gap-4 mb-8">
                   <select className="flex-1 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-4 font-bold text-sm uppercase tracking-widest text-neutral-600 dark:text-neutral-300" value={newSubcatCatPadre} onChange={e => setNewSubcatCatPadre(e.target.value)}>
                       {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <input type="text" placeholder="Nombre (ej. Gasolina)" className="flex-1 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-4 font-bold text-sm" value={newSubcatName} onChange={e => setNewSubcatName(e.target.value)} />
                   <input type="text" placeholder="Descripción (Opcional)" className="flex-1 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-4 font-bold text-sm" value={newSubcatDesc} onChange={e => setNewSubcatDesc(e.target.value)} />
                   <button onClick={handleCreateSubcategoria} className="bg-black dark:bg-white text-white dark:text-black rounded-2xl px-6 py-4 font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2">
                       <Plus className="w-4 h-4" /> Agregar
                   </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {subcategorias.map(sub => (
                       <div key={sub.id} className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center group">
                           <div>
                               <p className="font-black text-sm">{sub.nombre}</p>
                               <div className="flex gap-2 items-center mt-1">
                                 <span className="text-[8px] px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-full font-black uppercase tracking-widest">{sub.categoria_padre}</span>
                                 {sub.descripcion && <span className="text-[10px] text-neutral-400">{sub.descripcion}</span>}
                               </div>
                           </div>
                           <button onClick={() => handleDeleteSubcategoria(sub.id)} className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                               <Trash2 className="w-4 h-4" />
                           </button>
                       </div>
                   ))}
                   {subcategorias.length === 0 && (
                       <div className="col-span-full text-center py-8 text-neutral-400 text-sm font-bold">
                           No hay subcategorías creadas todavía.
                       </div>
                   )}
               </div>
            </div>
        </div>
      )}

    </div>
  );
}
