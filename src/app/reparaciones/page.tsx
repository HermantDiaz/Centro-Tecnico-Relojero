"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Upload, Search, Filter, Clock, CheckCircle2, AlertCircle, Wrench,
  User, Phone, Calendar, DollarSign, ArrowRight, MoreVertical, X, Loader2, AlertTriangle, Printer, Edit2, ChevronRight, Save, Trash2
} from "lucide-react";
import Papa from "papaparse";

// --- Types ---
interface Reparacion {
  id: string;
  numero_recibo: string;
  cliente_id: string;
  fecha_ingreso: string;
  tipo_reloj: string;
  marca: string;
  modelo_descripcion: string;
  problema_cliente: string;
  diagnostico_tecnico: string;
  estado: string;
  fecha_compromiso: string;
  precio_final: number;
  abono: number;
  saldo_pendiente: number;
  veces_garantia: number;
  tecnico_asignado_id: string;
  clientes: {
    nombre_completo: string;
    telefono: string;
  };
}

export default function ReparacionesPage() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReparacion, setSelectedReparacion] = useState<Reparacion | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importStatus, setImportStatus] = useState<any>(null);

  const [form, setForm] = useState({
    numero_recibo: "",
    nombre_cliente: "",
    telefono_cliente: "",
    tipo_reloj: "Mecánico",
    marca: "",
    modelo: "",
    problema: "",
    diagnostico: "",
    precio_final: "0",
    abono: "0",
    estado: "recibido",
    fecha_ingreso: new Date().toISOString().split('T')[0],
    fecha_compromiso: "",
    veces_garantia: 0
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reparaciones')
        .select(`*, clientes (*)` )
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReparaciones(data || []);

      const { data: pData } = await supabase.from('perfiles').select('id, nombre');
      setPerfiles(pData || []);
    } catch (e: any) {
      console.error("Fetch error:", e.message);
    } finally {
      setIsLoading(false);
    }
  }

  // --- Importer ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus({ message: "Analizando CSV...", type: 'info', progress: 0 });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let success = 0; let errors = 0;

        for (let i = 0; i < rows.length; i++) {
          try {
            const row = rows[i];
            const getVal = (opts: string[]) => {
              for(const o of opts) {
                const found = Object.keys(row).find(k => k.toLowerCase().trim() === o.toLowerCase().trim());
                if (found) return row[found];
              }
              return "";
            };

            const nombre = getVal(['Nombre de Cliente', 'Nombre', 'Cliente', 'Nombre Cliente']);
            const recibo = getVal(['Numero de recibo', 'Recibo', 'Ticket', 'N° Recibo', 'N° de recibo', 'id']);
            if (!nombre || !recibo) { errors++; continue; }

            const { data: cData, error: cErr } = await supabase.from('clientes').upsert({ 
              nombre_completo: String(nombre).trim(), 
              telefono: String(getVal(['telefono', 'Teléfono', 'Celular']) || "").trim() 
            }, { onConflict: 'nombre_completo' }).select('id');
            
            if (cErr) throw cErr;

            const { error: rErr } = await supabase.from('reparaciones').insert({
              numero_recibo: String(recibo).trim(),
              cliente_id: cData?.[0]?.id,
              marca: getVal(['Marca']),
              modelo_descripcion: getVal(['Modelo/descripcion breve', 'Modelo']),
              estado: (getVal(['Estado']) || 'recibido').toLowerCase(),
              precio_final: parseFloat(String(getVal(['precio final', 'Precio'])).replace(/[^0-9.]/g, '')) || 0,
              abono: parseFloat(String(getVal(['abono', 'Adelanto'])).replace(/[^0-9.]/g, '')) || 0,
              problema_cliente: getVal(['problema segun cliente', 'Problema']),
              diagnostico_tecnico: getVal(['diagnostico tecnico', 'Diagnóstico']),
              veces_garantia: parseInt(getVal(['veces en garantia', 'Garantía'])) || 0,
              fecha_ingreso: getVal(['Fecha de ingreso', 'Ingreso']) ? new Date(getVal(['Fecha de ingreso', 'Ingreso'])).toISOString() : undefined,
              fecha_compromiso: getVal(['Fecha de compromiso', 'Compromiso']) ? new Date(getVal(['Fecha de compromiso', 'Compromiso'])).toISOString() : undefined,
            });

            if (rErr) throw rErr;
            success++;
          } catch (err: any) { errors++; }
          setImportStatus({ message: `Importando ${i+1}/${rows.length}...`, type: 'info', progress: Math.round(((i+1)/rows.length)*100) });
        }
        setImportStatus({ message: `¡Listo! ${success} OK, ${errors} Error.`, type: 'success', progress: 100 });
        fetchInitialData();
      }
    });
  };

  // --- Save / Update ---
  const handleSaveRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: cData, error: cErr } = await supabase.from('clientes').upsert({ 
        nombre_completo: form.nombre_cliente.trim(), 
        telefono: form.telefono_cliente.trim() 
      }, { onConflict: 'nombre_completo' }).select('id');
      if (cErr) throw cErr;

      const baseRepair = {
        numero_recibo: form.numero_recibo.trim(),
        cliente_id: cData[0].id,
        tipo_reloj: form.tipo_reloj,
        marca: form.marca.trim(),
        modelo_descripcion: form.modelo.trim(),
        problema_cliente: form.problema.trim(),
        diagnostico_tecnico: form.diagnostico.trim(),
        estado: form.estado,
        precio_final: parseFloat(form.precio_final) || 0,
        abono: parseFloat(form.abono) || 0,
        fecha_ingreso: new Date(form.fecha_ingreso).toISOString(),
        fecha_compromiso: form.fecha_compromiso ? new Date(form.fecha_compromiso).toISOString() : null,
        veces_garantia: form.veces_garantia
      };

      if (isEditing && selectedReparacion) {
        const { error } = await supabase.from('reparaciones').update(baseRepair).eq('id', selectedReparacion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('reparaciones').insert(baseRepair);
        if (error) throw error;
      }

      setShowAddModal(false);
      setIsEditing(false);
      fetchInitialData();
      alert(isEditing ? "¡Actualizado!" : "¡Registrado!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('reparaciones').update({ estado: newStatus }).eq('id', id);
      if (error) throw error;
      fetchInitialData();
      if (selectedReparacion?.id === id) {
        setSelectedReparacion({...selectedReparacion, estado: newStatus});
      }
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este registro permanentemente?")) return;
    try {
      const { error } = await supabase.from('reparaciones').delete().eq('id', id);
      if (error) throw error;
      setSelectedReparacion(null);
      fetchInitialData();
      alert("Registro eliminado.");
    } catch (err: any) { alert(err.message); }
  };

  const startEdit = (rep: Reparacion) => {
    setForm({
      numero_recibo: rep.numero_recibo,
      nombre_cliente: rep.clientes?.nombre_completo || "",
      telefono_cliente: rep.clientes?.telefono || "",
      tipo_reloj: rep.tipo_reloj || "Mecánico",
      marca: rep.marca || "",
      modelo: rep.modelo_descripcion || "",
      problema: rep.problema_cliente || "",
      diagnostico: rep.diagnostico_tecnico || "",
      precio_final: String(rep.precio_final),
      abono: String(rep.abono),
      estado: rep.estado,
      fecha_ingreso: rep.fecha_ingreso ? rep.fecha_ingreso.split('T')[0] : "",
      fecha_compromiso: rep.fecha_compromiso ? rep.fecha_compromiso.split('T')[0] : "",
      veces_garantia: rep.veces_garantia || 0
    });
    setIsEditing(true);
    setShowAddModal(true);
    setSelectedReparacion(rep);
  };

  // --- UI Helpers ---
  const handlePrint = (rep: Reparacion) => {
    const printWindow = window.open('', '', 'width=600,height=600');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Ticket - ${rep.numero_recibo}</title><style>body{font-family:sans-serif;padding:40px;}.header{text-align:center;border-bottom:2px solid black;padding-bottom:20px;}.row{display:flex;justify-content:space-between;margin-bottom:15px;}</style></head><body><div class="header"><h1>RELOJERÍA IA</h1><p>Recibo N° ${rep.numero_recibo}</p></div><div style="margin-top:30px;"><div class="row"><strong>CLIENTE:</strong><span>${rep.clientes?.nombre_completo}</span></div><div class="row"><strong>RELOJ:</strong><span>${rep.marca}</span></div><div class="row"><strong>TOTAL:</strong><span>$${rep.precio_final}</span></div><div class="row"><strong>SALDO:</strong><span>$${rep.saldo_pendiente}</span></div></div></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'entregado': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'listo': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'en taller': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'garantia': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400';
    }
  };

  const overdueRepairs = reparaciones.filter(r => r.estado !== 'entregado' && r.fecha_compromiso && new Date(r.fecha_compromiso) < new Date());
  const upcomingRepairs = reparaciones.filter(r => {
    if (r.estado === 'entregado' || !r.fecha_compromiso) return false;
    const diff = new Date(r.fecha_compromiso).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 2;
  });

  const filteredReparaciones = reparaciones.filter(r => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      (r.numero_recibo || "").toLowerCase().includes(s) ||
      (r.clientes?.nombre_completo || "").toLowerCase().includes(s) ||
      (r.marca || "").toLowerCase().includes(s) ||
      (r.modelo_descripcion || "").toLowerCase().includes(s);
    
    const matchesStatus = filterStatus === "todos" || r.estado === filterStatus;
    const matchesOverdue = !filterOverdueOnly || overdueRepairs.some(o => o.id === r.id);
    
    // Mejorar matching de fecha: comparar solo la parte YYYY-MM-DD
    const matchesDate = !filterDate || 
      (r.fecha_ingreso && r.fecha_ingreso.startsWith(filterDate)) || 
      (r.fecha_compromiso && r.fecha_compromiso.startsWith(filterDate));
    
    return matchesSearch && matchesStatus && matchesOverdue && matchesDate;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-4">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white dark:border-neutral-800 shadow-xl">
        <div className="flex items-center gap-4">
           <div className="p-4 rounded-3xl bg-black dark:bg-white text-white dark:text-black shadow-lg">
              <Wrench className="w-6 h-6" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter">Gestión de Taller</h1>
             <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Relojería Profesional</p>
           </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImportModal(true)} className="px-6 py-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={() => { setIsEditing(false); setShowAddModal(true); setForm({ ...form, numero_recibo: "", nombre_cliente: "" }); }} className="px-6 py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-black/10">
            <Plus className="w-4 h-4" /> Nuevo Ticket
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "En Proceso", value: reparaciones.filter(r => r.estado !== 'entregado').length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Para Entrega", value: reparaciones.filter(r => r.estado === 'listo').length, icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Saldo Total", value: `$${reparaciones.reduce((acc, r) => acc + (r.estado !== 'entregado' ? r.saldo_pendiente : 0), 0)}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Garantías", value: reparaciones.filter(r => r.estado === 'garantia').length, icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
          { label: "Vencidas", value: overdueRepairs.length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-600/10" },
          { label: "Próximas", value: upcomingRepairs.length, icon: Calendar, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 p-5 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}><stat.icon className="w-4 h-4" /></div>
            <div>
              <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-lg font-black text-neutral-900 dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row gap-6 items-center">
         <div className="relative flex-1 group w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input type="text" placeholder="Buscar ticket, cliente, marca..." className="w-full pl-14 pr-6 py-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border-none text-sm font-bold outline-none ring-2 ring-transparent focus:ring-black/5 dark:focus:ring-white/5 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
         </div>
         <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 lg:pb-0">
            <div className="flex bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1">
               {['todos', 'recibido', 'en taller', 'listo', 'garantia', 'entregado'].map(st => (
                  <button key={st} onClick={() => setFilterStatus(st)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === st ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'text-neutral-400'}`}>{st}</button>
               ))}
            </div>
            <div className="h-8 w-[1px] bg-neutral-200 dark:bg-neutral-700 mx-2 hidden lg:block" />
            <button onClick={() => setFilterOverdueOnly(!filterOverdueOnly)} className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${filterOverdueOnly ? 'bg-red-500 text-white border-red-500' : 'bg-transparent text-neutral-400 border-neutral-200 dark:border-neutral-700'}`}>Solo Atrasadas</button>
            <div className="relative group">
               <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
               <input type="date" className="pl-12 pr-4 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800 text-[10px] font-black uppercase outline-none" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
         </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-800/20">
                <th className="px-8 py-6 text-[9px] font-black uppercase text-neutral-400 tracking-widest">Ticket / Reloj</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase text-neutral-400 tracking-widest">Cliente / Tel.</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase text-neutral-400 tracking-widest">Fechas (Ingreso | Compromiso)</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase text-neutral-400 tracking-widest">Estado</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase text-neutral-400 tracking-widest text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/10">
              {isLoading ? (
                <tr><td colSpan={5} className="p-32 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-neutral-200"/></td></tr>
              ) : filteredReparaciones.length === 0 ? (
                <tr><td colSpan={5} className="p-32 text-center text-neutral-400 font-bold italic">No se encontraron resultados.</td></tr>
              ) : (
                filteredReparaciones.slice(0, 50).map((rep) => (
                  <tr key={rep.id} onClick={() => setSelectedReparacion(rep)} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-all cursor-pointer">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                           <span className="text-[10px] font-black">{rep.numero_recibo}</span>
                        </div>
                        <div>
                          <p className="text-sm font-black text-neutral-900 dark:text-white tracking-tight">{rep.marca} {rep.modelo_descripcion || 'S/N'}</p>
                          <p className="text-[9px] font-bold text-neutral-400 tracking-widest uppercase">{rep.tipo_reloj}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-xs font-bold text-neutral-800 dark:text-white">{rep.clientes?.nombre_completo}</p>
                       <p className="text-[10px] font-black text-neutral-400 tracking-tighter">{rep.clientes?.telefono || 'Sin Tel.'}</p>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-4 text-[10px] font-black uppercase">
                          <span className="text-neutral-500">{rep.fecha_ingreso ? new Date(rep.fecha_ingreso).toLocaleDateString() : '--'}</span>
                          <ChevronRight className="w-3 h-3 text-neutral-300" />
                          <span className={`${overdueRepairs.some(o => o.id === rep.id) ? 'text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg' : 'text-neutral-400'}`}>
                             {rep.fecha_compromiso ? new Date(rep.fecha_compromiso).toLocaleDateString() : 'SIN FECHA'}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(rep.estado)}`}>
                         {rep.estado}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <p className="text-sm font-black text-neutral-900 dark:text-white">${rep.saldo_pendiente}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Manual Entry / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[3rem] p-12 border border-neutral-100 dark:border-neutral-800 shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 p-3 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"><X /></button>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8">{isEditing ? "Editar Reparación" : "Ingreso de Servicio"}</h2>

              <form onSubmit={handleSaveRepair} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Cliente</p>
                    <input required className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" placeholder="Nombre" value={form.nombre_cliente} onChange={e => setForm({...form, nombre_cliente: e.target.value})} />
                    <input className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" placeholder="Teléfono" value={form.telefono_cliente} onChange={e => setForm({...form, telefono_cliente: e.target.value})} />
                 </div>
                 
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Reloj</p>
                    <input required className="w-full px-5 py-4 rounded-xl bg-neutral-900 text-white font-black uppercase text-center" placeholder="RECIBO N°" value={form.numero_recibo} onChange={e => setForm({...form, numero_recibo: e.target.value})} />
                    <select className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-[10px] font-black uppercase" value={form.tipo_reloj} onChange={e => setForm({...form, tipo_reloj: e.target.value})}>
                        <option>Mecánico</option><option>Quarzo</option><option>Pared</option><option>Mesa</option>
                    </select>
                    <input className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" placeholder="Marca" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} />
                    <input className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" placeholder="Modelo" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} />
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Fechas</p>
                    <label className="text-[9px] font-bold text-neutral-400">FECHA INGRESO</label>
                    <input type="date" className="w-full px-5 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" value={form.fecha_ingreso} onChange={e => setForm({...form, fecha_ingreso: e.target.value})} />
                    <label className="text-[9px] font-bold text-neutral-400">FECHA COMPROMISO</label>
                    <input type="date" className="w-full px-5 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold border-2 border-amber-500/20" value={form.fecha_compromiso} onChange={e => setForm({...form, fecha_compromiso: e.target.value})} />
                 </div>

                 <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Problema y Diagnóstico</p>
                       <textarea className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold min-h-[80px]" placeholder="Problema según cliente" value={form.problema} onChange={e => setForm({...form, problema: e.target.value})} />
                       <textarea className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold min-h-[80px]" placeholder="Diagnóstico técnico" value={form.diagnostico} onChange={e => setForm({...form, diagnostico: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Valores</p>
                       <div className="grid grid-cols-2 gap-4">
                          <input type="number" className="w-full px-5 py-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800 text-2xl font-black text-center" placeholder="Total" value={form.precio_final} onChange={e => setForm({...form, precio_final: e.target.value})} />
                          <input type="number" className="w-full px-5 py-6 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 text-2xl font-black text-center" placeholder="Abono" value={form.abono} onChange={e => setForm({...form, abono: e.target.value})} />
                       </div>
                    </div>
                 </div>

                 <button disabled={isSubmitting} className="md:col-span-3 mt-6 py-6 rounded-[2rem] bg-black dark:bg-white text-white dark:text-black font-black uppercase italic tracking-[0.3em] flex items-center justify-center gap-4 active:scale-95 transition-all">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="w-6 h-6" /> {isEditing ? "Guardar Cambios" : "Registrar Servicio"}</>}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedReparacion && !isEditing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-in fade-in duration-500">
           <div className="bg-white dark:bg-neutral-900 w-full max-w-xl h-full p-12 overflow-y-auto shadow-2xl animate-in slide-in-from-right-10 duration-700">
              <button onClick={() => setSelectedReparacion(null)} className="p-4 rounded-full bg-neutral-50 dark:bg-neutral-800 mb-10"><X/></button>
              
              <div className="space-y-12">
                 <div className="flex justify-between items-start">
                    <div>
                       <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">TICKET {selectedReparacion.numero_recibo}</span>
                       <h3 className="text-4xl font-black uppercase italic tracking-tighter mt-1">{selectedReparacion.marca}</h3>
                       <p className="text-neutral-500 font-bold">{selectedReparacion.modelo_descripcion || 'Modelo sin especificar'}</p>
                    </div>
                    <button onClick={() => startEdit(selectedReparacion)} className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:scale-110 transition-all"><Edit2/></button>
                 </div>

                 <div className="grid grid-cols-2 gap-8 bg-neutral-50 dark:bg-neutral-800 p-8 rounded-[2rem]">
                    <div className="space-y-1"><p className="text-[9px] font-black text-neutral-400 uppercase">Costo Total</p><p className="text-2xl font-black">${selectedReparacion.precio_final}</p></div>
                    <div className="space-y-1"><p className="text-[9px] font-black text-neutral-400 uppercase text-right">Saldo Pendiente</p><p className="text-2xl font-black text-right text-red-500">${selectedReparacion.saldo_pendiente}</p></div>
                 </div>

                 <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest border-b pb-2">Historial y Fechas</p>
                    <div className="flex justify-between text-xs font-bold">
                       <span className="text-neutral-400 uppercase">Ingreso:</span>
                       <span className="text-neutral-900 dark:text-white">{new Date(selectedReparacion.fecha_ingreso).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                       <span className="text-neutral-400 uppercase">Compromiso:</span>
                       <span className={overdueRepairs.some(o => o.id === selectedReparacion.id) ? 'text-red-500' : 'text-neutral-900 dark:text-white'}>
                          {selectedReparacion.fecha_compromiso ? new Date(selectedReparacion.fecha_compromiso).toLocaleDateString() : 'No establecida'}
                       </span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest border-b pb-2">Estado</p>
                    <div className="grid grid-cols-2 gap-2">
                       {['recibido', 'en taller', 'listo', 'garantia', 'entregado'].map(st => (
                          <button key={st} onClick={() => handleUpdateStatus(selectedReparacion.id, st)} className={`p-4 rounded-2xl text-[9px] font-black uppercase italic tracking-widest ${selectedReparacion.estado === st ? 'bg-black text-white dark:bg-white dark:text-black scale-[1.05]' : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100'}`}>{st}</button>
                       ))}
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button onClick={() => handlePrint(selectedReparacion)} className="flex-1 py-5 rounded-[2rem] bg-neutral-100 dark:bg-neutral-800 font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all"><Printer className="w-4 h-4" /> Comprobante</button>
                    <button onClick={() => handleDelete(selectedReparacion.id)} className="flex-1 py-5 rounded-[2rem] bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /> Eliminar</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500">
           <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[3.5rem] p-12 border border-neutral-100 dark:border-neutral-800 shadow-2xl relative text-center">
              <button onClick={() => { setShowImportModal(false); setImportStatus(null); }} className="absolute top-8 right-8 p-3 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"><X /></button>
              <Upload className="w-16 h-16 mx-auto mb-6 text-neutral-200" />
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Sincronizar Datos</h2>
              <p className="text-neutral-400 font-bold mb-10 text-sm">Carga tu CSV de Google Sheets para restaurar el historial.</p>
              
              <div className="border-4 border-dashed border-neutral-100 dark:border-neutral-800 rounded-[3rem] p-12 relative hover:border-black dark:hover:border-white transition-all cursor-pointer bg-neutral-50/50 dark:bg-neutral-800/30 group mb-6">
                 <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                 <p className="font-black text-xs uppercase tracking-widest text-neutral-400">Elegir Archivo</p>
              </div>

              {importStatus && (
                 <div className={`p-6 rounded-3xl space-y-3 ${importStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-neutral-50 text-neutral-500'}`}>
                    <div className="flex items-center justify-center gap-3 font-bold text-xs">
                       {importStatus.type === 'info' && <Loader2 className="w-4 h-4 animate-spin" />}
                       {importStatus.message}
                    </div>
                    {importStatus.progress !== undefined && (
                       <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div className="h-full bg-black dark:bg-white transition-all duration-700" style={{width: `${importStatus.progress}%`}}></div>
                       </div>
                    )}
                 </div>
              )}
           </div>
        </div>
      )}

    </div>
  );
}
