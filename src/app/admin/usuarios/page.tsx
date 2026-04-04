"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { ShieldAlert, Users, Activity, Terminal } from "lucide-react";

interface Perfil {
  id: string;
  nombre: string;
  rol: "admin" | "recepcion" | "tecnico";
  activo: boolean;
  telefono?: string;
  email?: string; // Solo visible si se obtiene vía API admin o RPC
}

export default function GestionUsuarios() {
  const { rol: currentUserRol, user: currentUser, sessionReady } = useAuth();
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'equipo'|'auditoria'>('equipo');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Perfil | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchUsuariosAndLogs() {
      const { data: perfs } = await supabase
        .from("perfiles")
        .select("*")
        .order("rol", { ascending: true });
      if (perfs) setUsuarios(perfs);

      const { data: logs } = await supabase
        .from("auditoria_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (logs) setAuditLogs(logs);

      setLoading(false);
    }

    if (currentUserRol === "admin" && sessionReady) {
      fetchUsuariosAndLogs();
    }
  }, [currentUserRol, sessionReady]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Seguridad: No permitir que el admin se desactive a sí mismo o cambie su rol
    if (editingUser.id === currentUser?.id) {
       if (!editingUser.activo) {
         alert("No puedes desactivar tu propia cuenta administrativa.");
         return;
       }
       if (editingUser.rol !== 'admin') {
         alert("No puedes degradar tu propio rol. Pide a otro administrador que lo haga si es necesario.");
         return;
       }
    }

    const { error } = await supabase
      .from("perfiles")
      .update({
        nombre: editingUser.nombre,
        rol: editingUser.rol,
        activo: editingUser.activo,
        telefono: editingUser.telefono
      })
      .eq("id", editingUser.id);

    if (!error) {
      setUsuarios(usuarios.map(u => u.id === editingUser.id ? editingUser : u));
      setIsModalOpen(false);
      setEditingUser(null);
    } else {
      alert("Error al actualizar: " + error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) {
       alert("No puedes eliminarte a ti mismo.");
       return;
    }

    if (confirm("¿Estás seguro de eliminar este perfil? Esto no borrará la cuenta de correo, solo su perfil en la base de datos.")) {
      const { error } = await supabase
        .from("perfiles")
        .delete()
        .eq("id", id);
      
      if (!error) {
        setUsuarios(usuarios.filter(u => u.id !== id));
      }
    }
  };

  const openEditModal = (user: Perfil) => {
    setEditingUser({...user});
    setIsModalOpen(true);
  };

  if (currentUserRol !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-10 bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl border border-red-50 dark:border-red-900/20 max-w-sm">
          <span className="text-4xl mb-4 block italic">🚫</span>
          <h2 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight italic">Acceso Denegado</h2>
          <p className="text-xs text-neutral-500 mt-2 font-medium">Solo administradores de CTR pueden gestionar al equipo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Panel Administrativo</p>
          <h1 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight uppercase italic">Gestión de Equipo</h1>
        </div>
        <button 
          onClick={() => alert(`Comparte este enlace con tu equipo para que se registren:\n${window.location.origin}/login`)}
          className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
        >
          + Invitar Miembro
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-[2rem] w-fit border border-neutral-200 dark:border-neutral-800">
        <button 
          onClick={() => setActiveTab('equipo')}
          className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'equipo' 
            ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-lg scale-[1.03]" 
            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Equipo
        </button>
        <button 
          onClick={() => setActiveTab('auditoria')}
          className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'auditoria' 
            ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-lg scale-[1.03]" 
            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" /> Caja Negra (Auditoría)
        </button>
      </div>

      {activeTab === 'equipo' ? (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-xl">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Personal</p>
              <p className="text-3xl font-black text-neutral-900 dark:text-white italic">{usuarios.length}</p>
            </div>
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-xl border-l-4 border-l-blue-500">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Técnicos</p>
              <p className="text-3xl font-black text-neutral-900 dark:text-white italic">{usuarios.filter(u => u.rol === 'tecnico').length}</p>
            </div>
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-xl border-l-4 border-l-amber-500">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Activos</p>
              <p className="text-3xl font-black text-emerald-600 italic">{usuarios.filter(u => u.activo).length}</p>
            </div>
          </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/30 border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Personal</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Privilegios</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Contacto</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50 text-sm">
              {usuarios.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/10 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`relative flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner ${
                        user.activo ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'bg-neutral-200 text-neutral-400 dark:bg-neutral-800'
                      }`}>
                        {user.nombre?.charAt(0) || "U"}
                        {user.activo && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-neutral-900"></div>}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold transition-opacity ${user.activo ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 line-through'}`}>
                          {user.nombre || "Sin nombre asignado"}
                        </p>
                        <p className="text-[10px] text-neutral-400 font-medium uppercase truncate max-w-[150px]">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                      user.rol === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                      user.rol === 'tecnico' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      {user.rol === 'admin' ? '🔥 Admin' : user.rol === 'tecnico' ? '⚙️ Técnico' : '💼 Recepción'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-neutral-500">{user.telefono || "---"}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                        onClick={() => openEditModal(user)}
                        className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black rounded-xl transition-all shadow-sm"
                        title="Editar Perfil"
                       >
                         ✏️
                       </button>
                       <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                        title="Eliminar Perfil"
                       >
                         🗑️
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-neutral-400 italic font-medium">
                    No hay miembros registrados en el equipo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>) : (
        <div className="space-y-6">
          <div className="p-6 bg-black dark:bg-neutral-950 rounded-3xl border border-neutral-800/80 shadow-2xl overflow-hidden relative">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldAlert className="w-48 h-48 text-emerald-500" />
             </div>
             <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-emerald-900/30">
                <div>
                  <h3 className="text-xl font-mono font-bold text-emerald-500 flex items-center gap-3">
                     <Terminal className="w-5 h-5"/> SYSTEM_AUDIT_LOG_v1.0
                  </h3>
                  <p className="text-emerald-700 font-mono text-[10px] tracking-[0.2em] mt-1">ULTIMOS 100 REGISTROS GLOBALES</p>
                </div>
                <div className="px-3 py-1 bg-emerald-900/40 border border-emerald-500/30 rounded text-emerald-400 font-mono text-[9px] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   LIVE
                </div>
             </div>
             
             <div className="font-mono text-xs space-y-1">
               {auditLogs.length === 0 ? (
                 <div className="text-emerald-700/50 py-10 text-center italic">Esperando eventos en el sistema...</div>
               ) : (
                 auditLogs.map(log => (
                   <div key={log.id} className="group p-2 hover:bg-emerald-900/10 rounded flex flex-col md:flex-row gap-2 text-emerald-600/80 hover:text-emerald-400 transition-colors">
                     <span className="w-32 flex-shrink-0 text-neutral-500">[{new Date(log.created_at).toLocaleString()}]</span>
                     <span className={`w-28 flex-shrink-0 font-bold ${log.accion === 'DELETE' || log.accion === 'ANULACION' ? 'text-rose-500' : 'text-emerald-500'}`}>[{log.accion}]</span>
                     <span className="w-28 flex-shrink-0 text-emerald-700 uppercase">{log.modulo}</span>
                     <span className="flex-1 text-emerald-300">{log.detalles}</span>
                     <span className="w-40 flex-shrink-0 text-emerald-700/60 truncate" title={log.usuario_email}>{log.usuario_email}</span>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      )}

      {/* Modal de Edición Premium */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl scale-in-center border border-neutral-100 dark:border-neutral-800">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight uppercase italic">Editar Perfil</h2>
                <button 
                   onClick={() => setIsModalOpen(false)}
                   className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Nombre Completo</label>
                  <input 
                    type="text"
                    value={editingUser.nombre || ""}
                    onChange={(e) => setEditingUser({...editingUser, nombre: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Rol en CTR</label>
                    <select 
                      value={editingUser.rol}
                      onChange={(e) => setEditingUser({...editingUser, rol: e.target.value as any})}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-inner appearance-none"
                    >
                      <option value="admin">Administrador</option>
                      <option value="recepcion">Recepción</option>
                      <option value="tecnico">Técnico</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Acceso al Sistema</label>
                    <button 
                      type="button"
                      onClick={() => setEditingUser({...editingUser, activo: !editingUser.activo})}
                      className={`w-full py-4 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-inner border-2 ${
                        editingUser.activo 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/50' 
                        : 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/50'
                      }`}
                    >
                      {editingUser.activo ? '✅ ACTIVADO' : '🚫 SUSPENDIDO'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Teléfono (WhatsApp)</label>
                  <input 
                    type="text"
                    placeholder="+502 ..."
                    value={editingUser.telefono || ""}
                    onChange={(e) => setEditingUser({...editingUser, telefono: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-inner"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-6"
                >
                  GUARDAR CAMBIOS
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
