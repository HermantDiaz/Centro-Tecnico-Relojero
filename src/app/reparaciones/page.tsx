"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useCaja } from "@/hooks/useCaja";
import { useAudit } from "@/hooks/useAudit";
import ComprobantePago from "@/components/caja/ComprobantePago";
import {
  Plus, Upload, Search, Filter, Clock, CheckCircle2, AlertCircle, Wrench,
  User, Phone, Calendar, DollarSign, ArrowRight, MoreVertical, X, Loader2, AlertTriangle, Printer, Edit2, ChevronRight, Save, Trash2, CheckSquare
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
  tecnico?: {
    nombre: string;
  };
  created_at?: string;
  historial?: Historico[];
  insumos?: InsumoReparacion[];
}

interface Historico {
  id: string;
  reparacion_id: string;
  usuario_id: string | null;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  evento: string;
  notas: string | null;
  created_at: string;
  perfil?: { nombre: string };
}

interface InsumoReparacion {
  id: string;
  reparacion_id: string;
  insumo_id: string;
  cantidad: number;
  precio_unitario: number;
  inventario?: { 
    nombre: string;
    codigo: string;
    modelo?: string;
    marca?: string;
  };
}

export default function ReparacionesPage() {
  const { user, sessionReady, rol } = useAuth();
  const { session: cajaSession, addMovimiento } = useCaja();
  const { logEvent } = useAudit();
  
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [lastMovementData, setLastMovementData] = useState<any | null>(null);
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<any>("Efectivo");
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [allClientes, setAllClientes] = useState<any[]>([]);
  const [workloadStats, setWorkloadStats] = useState<any[]>([]);
  const [selectedReparacionHistorial, setSelectedReparacionHistorial] = useState<Historico[]>([]);
  const [inventarioItems, setInventarioItems] = useState<any[]>([]);
  const [selectedReparacionInsumos, setSelectedReparacionInsumos] = useState<any[]>([]);
  const [busquedaRepuesto, setBusquedaRepuesto] = useState("");
  const [showRepuestoResults, setShowRepuestoResults] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("todos");
  const [filterYear, setFilterYear] = useState("todos");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showTimeFilters, setShowTimeFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReparacion, setSelectedReparacion] = useState<Reparacion | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importStatus, setImportStatus] = useState<any>(null);

  const [deliveryReparacionId, setDeliveryReparacionId] = useState<string | null>(null);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<string>("Efectivo");

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
    estado: "en diagnostico",
    tecnico_id: "",
    fecha_ingreso: new Date().toISOString().split('T')[0],
    fecha_compromiso: "",
    veces_garantia: 0
  });

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
      const { data, error } = await supabase
        .from('reparaciones')
        .select(`*, clientes:cliente_id(nombre_completo, telefono), tecnico:tecnico_asignado_id(nombre)`)
        .order('numero_recibo', { ascending: false });

      if (error) throw error;
      setReparaciones(data || []);

      const { data: pData } = await supabase
        .from('perfiles')
        .select('id, nombre, rol')
        .or('rol.eq.tecnico,rol.eq.admin');
      setPerfiles(pData || []);

      const { data: cData } = await supabase
        .from('clientes')
        .select('id, nombre_completo, telefono')
        .order('nombre_completo', { ascending: true });
      setAllClientes(cData || []);

      const { data: iData } = await supabase
        .from('inventario')
        .select('*')
        .gt('stock_actual', 0);
      setInventarioItems(iData || []);

      await fetchWorkload();

      // Handle query param for pre-filling
      const urlParams = new URLSearchParams(window.location.search);
      const clienteNome = urlParams.get('cliente');
      const editId = urlParams.get('edit_id');

      if (editId) {
        const repToEdit = (data || []).find((r: any) => r.id === editId);
        if (repToEdit) {
            setForm({
              numero_recibo: repToEdit.numero_recibo,
              nombre_cliente: repToEdit.clientes?.nombre_completo || "",
              telefono_cliente: repToEdit.clientes?.telefono || "",
              tipo_reloj: repToEdit.tipo_reloj || "Mecánico",
              marca: repToEdit.marca || "",
              modelo: repToEdit.modelo_descripcion || "",
              problema: repToEdit.problema_cliente || "",
              diagnostico: repToEdit.diagnostico_tecnico || "",
              precio_final: String(repToEdit.precio_final),
              abono: String(repToEdit.abono),
              estado: repToEdit.estado,
              tecnico_id: repToEdit.tecnico_asignado_id || "",
              fecha_ingreso: repToEdit.fecha_ingreso ? repToEdit.fecha_ingreso.split('T')[0] : "",
              fecha_compromiso: repToEdit.fecha_compromiso ? repToEdit.fecha_compromiso.split('T')[0] : "",
              veces_garantia: repToEdit.veces_garantia || 0
            });
            setSelectedReparacion(repToEdit);
            setIsEditing(true);
            setShowAddModal(true);
            
            // Cleanup the URL to prevent re-triggering
            window.history.replaceState({}, '', '/reparaciones');
        }
      } else if (clienteNome) {
        const existing = (cData || []).find((c: any) => c.nombre_completo === clienteNome);
        setForm(prev => ({ 
          ...prev, 
          nombre_cliente: clienteNome,
          telefono_cliente: existing?.telefono || "" 
        }));
        setShowAddModal(true);
      }
     } catch (e: any) {
      const isTransient = 
        e.name === 'AbortError' || 
        e.message?.includes("Lock broken") || 
        e.message?.includes("fetch") ||
        e.code === 'PGRST301';

      if (retries > 0 && isTransient) {
        console.warn(`🔄 Reparaciones (v10.8.12): Re-sync detectado, reintentando...`, retries);
        await new Promise(r => setTimeout(r, 800));
        return fetchInitialData(retries - 1);
      }
      console.error("Error crítico en fetchData (Reparaciones):", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchWorkload() {
    try {
      const { data } = await supabase
        .from('reparaciones')
        .select('tecnico_asignado_id, tecnico:tecnico_asignado_id(nombre)')
        .not('estado', 'in', '("entregado", "no repara")')
        .not('tecnico_asignado_id', 'is', null);

      if (data) {
        const counts: any = {};
        data.forEach((r: any) => {
          const name = r.tecnico?.nombre || "Sin Asignar";
          counts[name] = (counts[name] || 0) + 1;
        });
        setWorkloadStats(Object.entries(counts).map(([name, count]) => ({ name, count })));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchHistory(reparacionId: string) {
    try {
      const { data } = await supabase
        .from('historial_reparaciones')
        .select(`*, perfil:usuario_id(nombre)`)
        .eq('reparacion_id', reparacionId)
        .order('created_at', { ascending: false });
      setSelectedReparacionHistorial(data || []);
    } catch (e) {
      console.error("Error History:", e);
    }
  }

  async function fetchInsumos(reparacionId: string) {
    try {
      const { data } = await supabase
        .from('insumos_reparacion')
        .select(`*, inventario(nombre, codigo, modelo, marca)`)
        .eq('reparacion_id', reparacionId);
      setSelectedReparacionInsumos(data || []);
    } catch (e) {
      console.error("Error Insumos:", e);
    }
  }

  async function handleAddInsumo(item: any) {
    if (!selectedReparacion || !item) return;
    const itemLabel = `${item.nombre}${item.modelo && item.modelo !== '-' ? ` (${item.modelo})` : ''}`;
    const qty = prompt(`Cantidad de "${itemLabel}" a utilizar (Stock disponible: ${item.stock_actual}):`, "1");
    if (!qty || parseInt(qty) <= 0) return;
    
    const numQty = parseInt(qty);
    if (numQty > item.stock_actual) {
      alert(`Stock insuficiente. Solo hay ${item.stock_actual} unidades disponibles.`);
      return;
    }

    try {
      // 1. Insert Insumo
      await supabase.from('insumos_reparacion').insert({
        reparacion_id: selectedReparacion.id,
        insumo_id: item.id,
        cantidad: numQty,
        precio_unitario: item.precio_venta
      });
      // 2. Log History
      const itemDesc = item.modelo && item.modelo !== '-' ? `${item.nombre} [${item.modelo}]` : item.nombre;
      await createHistoryEntry(selectedReparacion.id, "Insumo Agregado", null, null, `Se agregó ${numQty}x ${itemDesc} (SKU: ${item.codigo || 'N/A'}).`);
      // 3. Decrement Inventory
      await supabase.from('inventario').update({ 
        stock_actual: item.stock_actual - numQty 
      }).eq('id', item.id);
      
      fetchInsumos(selectedReparacion.id);
      fetchHistory(selectedReparacion.id);
      setInventarioItems(prev => prev.map(p => p.id === item.id ? { ...p, stock_actual: p.stock_actual - numQty } : p));
      alert("¡Repuesto agregado y stock actualizado!");
    } catch (err: any) { 
      alert(err.message); 
    }
  }

  async function handleRemoveInsumo(insumoRelId: string, insumoId: string, qty: number, nombre: string) {
    if (!confirm(`¿Desea remover "${nombre}" de la reparación y devolver ${qty} unidad(es) al inventario?`)) return;
    
    try {
      const { error: delError } = await supabase
        .from('insumos_reparacion')
        .delete()
        .eq('id', insumoRelId);
      
      if (delError) throw delError;

      const { data: item } = await supabase.from('inventario').select('stock_actual').eq('id', insumoId).single();
      if (item) {
        await supabase.from('inventario').update({ 
          stock_actual: item.stock_actual + qty 
        }).eq('id', insumoId);
      }

      await createHistoryEntry(selectedReparacion!.id, "Insumo Removido", null, null, `Se removió ${qty}x ${nombre}. El stock fue devuelto al inventario.`);

      fetchInsumos(selectedReparacion!.id);
      fetchHistory(selectedReparacion!.id);
      alert("Insumo removido y stock restaurado.");
    } catch (err: any) {
      alert("Error al remover insumo: " + err.message);
    }
  }

  async function createHistoryEntry(reparacionId: string, event: string, oldStatus: string | null = null, newStatus: string | null = null, notes: string | null = null) {
    try {
      // Get current user ID (optional, depends on Auth)
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('historial_reparaciones').insert({
        reparacion_id: reparacionId,
        usuario_id: user?.id || null,
        evento: event,
        estado_anterior: oldStatus,
        estado_nuevo: newStatus,
        notas: notes
      });
    } catch (e) {
      console.error("Error creating history:", e);
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
      complete: async (results: Papa.ParseResult<any>) => {
        const rows = results.data as any[];
        console.log("CSV parsed rows:", rows.length, rows);
        let success = 0; let errors = 0;

        for (let i = 0; i < rows.length; i++) {
          try {
            const row = rows[i];
            const normalizeHeader = (str: any) => 
               String(str || "").normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s\/]/g, '').trim();

            const normalizeValue = (str: any) => 
               String(str || "").normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

            const getVal = (opts: string[]) => {
              const normalizedOpts = opts.map(o => normalizeHeader(o));
              for (const o of normalizedOpts) {
                const found = Object.keys(row).find(k => normalizeHeader(k) === o);
                if (found) return row[found];
              }
              return "";
            };

            const nombre = getVal(['Nombre de Cliente', 'Nombre', 'Cliente', 'Nombre Cliente']);
            const recibo = getVal(['Numero de recibo', 'Recibo', 'Ticket', 'N° Recibo', 'N° de recibo', 'id', 'N°', 'Nro', 'Recibo N°']);
            console.log(`Row ${i} mapping: nombre=${nombre}, recibo=${recibo}`);
            
            if (!nombre || !recibo) { 
              console.warn(`Row ${i} skipped: missing required fields`);
              errors++; continue; 
            }

            const { data: cData, error: cErr } = await supabase.from('clientes').upsert({
              nombre_completo: String(nombre).trim(),
              telefono: String(getVal(['telefono', 'Teléfono', 'Celular']) || "").trim()
            }, { onConflict: 'nombre_completo' }).select('id');

            if (cErr) throw cErr;

            const parseCSVDate = (val: string) => {
              if (!val || val.trim() === "") return undefined;
              try {
                // Remove multiples slashes, spaces, etc
                const cleanVal = val.replace(/[\s\/]+/g, '/').trim();
                if (cleanVal.includes('/')) {
                  const parts = cleanVal.split('/');
                  const [d, m, y] = parts;
                  if (d && m && y) {
                    const year = y.length === 2 ? `20${y}` : y;
                    const date = new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
                    if (!isNaN(date.getTime())) return date.toISOString();
                  }
                }
                const d = new Date(val);
                if (!isNaN(d.getTime())) return d.toISOString();
                return undefined;
              } catch (e) {
                return undefined;
              }
            };

            const { error: rErr } = await supabase.from('reparaciones').insert({
              numero_recibo: String(recibo).trim(),
              cliente_id: cData?.[0]?.id,
              marca: getVal(['Marca', 'Marca/Reloj']),
              modelo_descripcion: getVal(['Modelo / Descripción breve', 'Modelo/descripcion breve', 'Modelo', 'Descripción', 'Reloj']),
              estado: normalizeValue(String(getVal(['Estado', 'Status']) || 'en diagnostico')),
              precio_final: parseFloat(String(getVal(['Precio final', 'Precio', 'Total'])).replace(/[^0-9.]/g, '')) || 0,
              abono: parseFloat(String(getVal(['Abono', 'Adelanto'])).replace(/[^0-9.]/g, '')) || 0,
              problema_cliente: getVal(['Problema (según cliente)', 'problema segun cliente', 'Problema', 'Falla']),
              diagnostico_tecnico: getVal(['Diagnóstico técnico', 'diagnostico tecnico', 'Diagnóstico', 'Trabajo']),
              veces_garantia: parseInt(getVal(['Veces en garantía', 'veces en garantia', 'Garantía'])) || 0,
              fecha_ingreso: parseCSVDate(getVal(['Fecha ingreso', 'Fecha de ingreso', 'Ingreso', 'Entrada'])),
              fecha_compromiso: parseCSVDate(getVal(['Fecha compromiso', 'Fecha de compromiso', 'Compromiso', 'Entrega'])),
              tecnico_asignado_id: (() => {
                const techName = normalizeValue(String(getVal(['Técnico asignado', 'Técnico', 'Asignado a']) || ""));
                if (!techName) return null;
                const match = perfiles.find(p => normalizeValue(p.nombre) === techName);
                return match ? match.id : null;
              })()
            });

            if (rErr) throw rErr;
            success++;
            console.log(`Row ${i} imported successfully: ${recibo}`);
          } catch (err: any) { 
            console.error(`Error importing row ${i}:`, err.message);
            errors++; 
          }
          setImportStatus({ message: `Importando ${i + 1}/${rows.length}...`, type: 'info', progress: Math.round(((i + 1) / rows.length) * 100) });
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
        tecnico_asignado_id: form.tecnico_id || null,
        precio_final: parseFloat(form.precio_final) || 0,
        abono: parseFloat(form.abono) || 0,
        fecha_ingreso: new Date(form.fecha_ingreso).toISOString(),
        fecha_compromiso: form.fecha_compromiso ? new Date(form.fecha_compromiso).toISOString() : null,
        veces_garantia: form.veces_garantia
      };

      if (isEditing && selectedReparacion) {
        const { error } = await supabase.from('reparaciones').update(baseRepair).eq('id', selectedReparacion.id);
        if (error) throw error;
        
        // Log movement if abono increased
        const diffAbono = baseRepair.abono - (selectedReparacion.abono || 0);
        if (diffAbono > 0 && cajaSession) {
          await addMovimiento({
            tipo: 'ingreso',
            monto: diffAbono,
            utilidad_neta: diffAbono * 0.6, // Estimación inicial de margen
            concepto: `Abono Reparación #${baseRepair.numero_recibo}`,
            categoria: "Reparaciones",
            metodo_pago: metodoPagoAbono,
            referencia_id: selectedReparacion.id,
            es_traslado: false
          });
          setLastMovementData({
            numero_recibo: baseRepair.numero_recibo,
            cliente_nombre: form.nombre_cliente,
            monto: diffAbono,
            metodo_pago: metodoPagoAbono,
            concepto: "Abono / Adelanto de Servicio",
            fecha: new Date().toLocaleString(),
            atendido_por: user?.email?.split('@')[0] || "Admin",
            subtotal: diffAbono,
            descuento: 0,
            detalles: [{
              cantidad: 1,
              descripcion: `Abono de Reparación - ${baseRepair.marca} ${baseRepair.modelo_descripcion}`,
              precio_unitario: diffAbono,
              subtotal: diffAbono
            }]
          });
        }
        
        await createHistoryEntry(selectedReparacion.id, "Actualización de Registro", selectedReparacion.estado, form.estado, "Edición manual de campos.");
      } else {
        const { data, error } = await supabase.from('reparaciones').insert(baseRepair).select('id');
        if (error) throw error;
        if (data?.[0]) {
          // Log movement if initial abono exists
          if (baseRepair.abono > 0 && cajaSession) {
            await addMovimiento({
              tipo: 'ingreso',
              monto: baseRepair.abono,
              utilidad_neta: baseRepair.abono * 0.6,
              concepto: `Abono Inicial Reparación #${baseRepair.numero_recibo}`,
              categoria: "Reparaciones",
              metodo_pago: metodoPagoAbono,
              referencia_id: data[0].id,
              es_traslado: false
            });
            setLastMovementData({
              numero_recibo: baseRepair.numero_recibo,
              cliente_nombre: form.nombre_cliente,
              monto: baseRepair.abono,
              metodo_pago: metodoPagoAbono,
              concepto: "Abono Inicial / Recibo de Servicio",
              fecha: new Date().toLocaleString(),
              atendido_por: user?.email?.split('@')[0] || "Admin",
              subtotal: baseRepair.abono,
              descuento: 0,
              detalles: [{
                cantidad: 1,
                descripcion: `Abono Inicial - ${baseRepair.marca} ${baseRepair.modelo_descripcion}`,
                precio_unitario: baseRepair.abono,
                subtotal: baseRepair.abono
              }]
            });
          }
          await createHistoryEntry(data[0].id, "Registro Inicial", null, form.estado, "Ingreso inicial del reloj al taller.");
        }
      }

      fetchInitialData();
      fetchWorkload();
      setSelectedReparacion(null);
      setIsEditing(false);
      setShowAddModal(false);
      alert(isEditing ? "¡Actualizado!" : "¡Registrado!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const rep = reparaciones.find(r => r.id === id);
      const oldStatus = rep?.estado || null;
      
      // Special logic for delivery: check for payment
      if (newStatus === "entregado" && rep && rep.saldo_pendiente > 0) {
        if (!cajaSession) {
          alert("Debe abrir caja antes de entregar y cobrar saldos pendientes.");
          return;
        }
        setDeliveryReparacionId(id);
        setDeliveryPaymentMethod("Efectivo");
        return; // Flow continues in handleConfirmDelivery Modal
      } else {
        const { error } = await supabase.from('reparaciones').update({ estado: newStatus }).eq('id', id);
        if (error) throw error;
      }
      
      await createHistoryEntry(id, "Cambio de Estado", oldStatus, newStatus);
      
      fetchInitialData();
      fetchWorkload();
      if (selectedReparacion?.id === id) {
        setSelectedReparacion({ ...selectedReparacion, estado: newStatus });
        fetchHistory(id);
      }
    } catch (err: any) { alert(err.message); }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryReparacionId) return;
    const id = deliveryReparacionId;
    const rep = reparaciones.find(r => r.id === id);
    if (!rep) return;
    setIsSubmitting(true);

    try {
      // Auto-update abono to match precio_final
      await supabase.from('reparaciones').update({ abono: rep.precio_final, estado: 'entregado' }).eq('id', id);
      
      await addMovimiento({
        tipo: 'ingreso',
        monto: rep.saldo_pendiente,
        utilidad_neta: rep.saldo_pendiente * 0.7,
        concepto: `Cancelación Saldo # ${rep.numero_recibo}`,
        categoria: "Reparaciones",
        metodo_pago: deliveryPaymentMethod as any,
        referencia_id: id,
        es_traslado: false
      });

      setLastMovementData({
         numero_recibo: rep.numero_recibo,
         cliente_nombre: rep.clientes?.nombre_completo || "Cliente",
         monto: rep.saldo_pendiente,
         metodo_pago: deliveryPaymentMethod,
         concepto: "Cancelación de Saldo y Entrega",
         fecha: new Date().toLocaleString(),
         atendido_por: user?.email?.split('@')[0] || "Admin",
         subtotal: rep.saldo_pendiente,
         descuento: 0,
         detalles: [{
           cantidad: 1,
           descripcion: `Cancelación de Saldo - ${rep.marca} ${rep.modelo_descripcion || ""}`,
           precio_unitario: rep.saldo_pendiente,
           subtotal: rep.saldo_pendiente
         }]
      });

      await createHistoryEntry(id, "Cambio de Estado", rep.estado, 'entregado');
      
      fetchInitialData();
      fetchWorkload();
      if (selectedReparacion?.id === id) {
        setSelectedReparacion({ ...selectedReparacion, estado: 'entregado' });
        fetchHistory(id);
      }
      setDeliveryReparacionId(null);
    } catch (err: any) { 
      alert(err.message); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const repToDelete = reparaciones.find(r => r.id === id);
      const { error } = await supabase.from('reparaciones').delete().eq('id', id);
      if (error) throw error;
      
      setReparaciones(prev => prev.filter(r => r.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedReparacion(null);
      await logEvent('DELETE', 'Reparaciones', `Eliminó la reparación / recibo: #${repToDelete?.numero_recibo || id}`);
      alert('Registro eliminado con éxito');
    } catch (err: any) {
      alert('Error al eliminar: ' + (err.message || "Error desconocido"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsLoading(true);
    try {
      const repsToDelete = reparaciones.filter(r => selectedIds.has(r.id)).map(r => r.numero_recibo).join(", ");
      const { error } = await supabase
        .from('reparaciones')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      if (selectedReparacion && selectedIds.has(selectedReparacion.id)) {
        setSelectedReparacion(null);
      }

      setReparaciones(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setIsDeletingBulk(false);
      await logEvent('DELETE', 'Reparaciones', `Eliminación masiva de ${selectedIds.size} registros. Recibos: [${repsToDelete}]`);
      alert(`${selectedIds.size} registros eliminados con éxito`);
    } catch (err: any) {
      alert('Error al eliminar los registros');
    } finally {
      setIsLoading(false);
    }
  };



  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (visibleReparaciones: Reparacion[]) => {
    const visibleIds = visibleReparaciones.map(r => r.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const startEdit = (rep: Reparacion) => {
    if (!cajaSession) {
      alert("Debes ABRIR CAJA primero para poder editar tickets y gestionar abonos.");
      return;
    }
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
      tecnico_id: rep.tecnico_asignado_id || "",
      fecha_ingreso: rep.fecha_ingreso ? rep.fecha_ingreso.split('T')[0] : "",
      fecha_compromiso: rep.fecha_compromiso ? rep.fecha_compromiso.split('T')[0] : "",
      veces_garantia: rep.veces_garantia || 0
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  // --- UI Helpers ---
  const handlePrint = (rep: Reparacion) => {
    const printWindow = window.open('', '', 'width=600,height=600');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Ticket - ${rep.numero_recibo}</title><style>body{font-family:sans-serif;padding:40px;}.header{text-align:center;border-bottom:2px solid black;padding-bottom:20px;}.row{display:flex;justify-content:space-between;margin-bottom:15px;}.diagnosis{margin-top:20px;padding:15px;background:#f9f9f9;border-radius:10px;font-size:14px;}</style></head><body><div class="header"><h1>RELOJERÍA IA</h1><p>Recibo N° ${rep.numero_recibo}</p></div><div style="margin-top:30px;"><div class="row"><strong>CLIENTE:</strong><span>${rep.clientes?.nombre_completo}</span></div><div class="row"><strong>RELOJ:</strong><span>${rep.marca}</span></div><div class="row"><strong>TOTAL:</strong><span>$${rep.precio_final}</span></div><div class="row"><strong>SALDO:</strong><span>$${rep.saldo_pendiente}</span></div>${rep.diagnostico_tecnico ? `<div class="diagnosis"><strong>DIAGNÓSTICO:</strong><br/>${rep.diagnostico_tecnico}</div>` : ''}</div></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'entregado': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'listo': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'en reparacion': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'garantia': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'en diagnostico': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'no repara': return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400';
    }
  };

  const overdueRepairs = reparaciones.filter(r => 
    !['entregado', 'listo', 'no repara'].includes(r.estado) && 
    r.fecha_compromiso && 
    new Date(r.fecha_compromiso) < new Date()
  );
  const upcomingRepairs = reparaciones.filter(r => {
    if (r.estado === 'entregado' || !r.fecha_compromiso) return false;
    const diff = new Date(r.fecha_compromiso).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 4;
  });

  const filteredReparaciones = reparaciones.filter(r => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      (r.numero_recibo || "").toLowerCase().includes(s) ||
      (r.clientes?.nombre_completo || "").toLowerCase().includes(s) ||
      (r.clientes?.telefono || "").toLowerCase().includes(s) ||
      (r.marca || "").toLowerCase().includes(s) ||
      (r.modelo_descripcion || "").toLowerCase().includes(s);

    const matchesStatus = filterStatus === "todos" || r.estado === filterStatus;
    const matchesOverdue = !filterOverdueOnly || overdueRepairs.some(o => o.id === r.id);
    const matchesDate = !filterDate ||
      (r.fecha_ingreso && new Date(r.fecha_ingreso).toLocaleDateString('en-CA') === filterDate) ||
      (r.fecha_compromiso && new Date(r.fecha_compromiso).toLocaleDateString('en-CA') === filterDate);

    const matchesMonth = filterMonth === "todos" ||
      (r.fecha_ingreso && (new Date(r.fecha_ingreso).getMonth() + 1).toString() === filterMonth);

    const matchesYear = filterYear === "todos" ||
      (r.fecha_ingreso && new Date(r.fecha_ingreso).getFullYear().toString() === filterYear);

    return matchesSearch && matchesStatus && matchesOverdue && matchesDate && matchesMonth && matchesYear;
  });

  const sortedReparaciones = [...filteredReparaciones].sort((a, b) => {
    const dateA = new Date(a.created_at || a.fecha_ingreso).getTime();
    const dateB = new Date(b.created_at || b.fecha_ingreso).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
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
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter">Gestion de Taller</h1>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Relojeria Profesional</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImportModal(true)} className="px-6 py-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={() => { 
            if (!cajaSession) {
              alert("Debes ABRIR CAJA primero para poder registrar una reparación y cobrar abonos.");
              return;
            }
            setIsEditing(false); setShowAddModal(true); setForm({ ...form, numero_recibo: "", nombre_cliente: "" }); 
          }} className="px-6 py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-black/10">
            <Plus className="w-4 h-4" /> Nuevo Ticket
          </button>
        </div>
      </div>
 
      {/* Technician Workload Dashboard */}
      {workloadStats.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-4 h-4 text-amber-500" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Balance de Carga de Técnicos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workloadStats.map((tech, i) => (
              <div key={i} className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700/50">
                <div className="w-10 h-10 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-xs shadow-md">
                  {tech.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-tight">{tech.name}</p>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{tech.count} Trabajos activos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* Sleek Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Unified Search */}
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por ticket, cliente, teléfono o marca..."
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-sm font-medium outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Dropdown */}
        <div className="w-full lg:w-64">
          <div className="relative group">
            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-xs font-black uppercase tracking-widest appearance-none outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all shadow-sm cursor-pointer"
            >
              <option value="todos">Todos los Estados</option>
              <option value="en diagnostico">En Diagnostico</option>
              <option value="en reparacion">En Reparacion</option>
              <option value="listo">Listo para Entrega</option>
              <option value="garantia">Garantia</option>
              <option value="no repara">No Repara</option>
              <option value="entregado">Entregado</option>
            </select>
            <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 pointer-events-none rotate-90" />
          </div>
        </div>

        {/* Consolidated Time Filter */}
        <div className="relative w-full lg:w-auto">
          <button
            onClick={() => setShowTimeFilters(!showTimeFilters)}
            className={`w-full lg:w-auto px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3 shadow-sm ${showTimeFilters || filterMonth !== "todos" || filterDate || sortOrder !== "desc"
                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                : "bg-white dark:bg-neutral-900 text-neutral-500 border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="truncate max-w-[120px]">
              {filterDate ? filterDate : filterMonth !== "todos"
                ? `${["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][parseInt(filterMonth) - 1]} ${filterYear !== "todos" ? filterYear : ""}`
                : filterYear !== "todos" ? `Año: ${filterYear}` : "Filtro Temporal"
              }
            </span>
            <ChevronRight className={`w-3 h-3 transition-transform ${showTimeFilters ? "rotate-90" : ""}`} />
          </button>

          {showTimeFilters && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowTimeFilters(false)}
              />
              <div className="absolute top-full left-0 mt-3 w-72 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-2xl p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-6">
                  {/* Sorting */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-3 block">Orden de Aparición</label>
                    <div className="flex bg-neutral-50 dark:bg-neutral-800/50 p-1 rounded-xl">
                      <button
                        onClick={() => setSortOrder("desc")}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase transition-all ${sortOrder === "desc" ? "bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white" : "text-neutral-400"}`}
                      >
                        Recientes
                      </button>
                      <button
                        onClick={() => setSortOrder("asc")}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase transition-all ${sortOrder === "asc" ? "bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white" : "text-neutral-400"}`}
                      >
                        Antiguas
                      </button>
                    </div>
                  </div>

                  {/* Month Selection */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-3 block">Filtrar por Mes</label>
                    <select
                      value={filterMonth}
                      onChange={(e) => {
                        setFilterMonth(e.target.value);
                        setFilterDate(""); // Clear specific date when choosing month
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border-none text-xs font-bold outline-none ring-0 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all"
                    >
                      <option value="todos">Todos los meses</option>
                      {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                        <option key={i} value={(i + 1).toString()}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year Selection */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-3 block">Filtrar por Año</label>
                    <select
                      value={filterYear}
                      onChange={(e) => {
                        setFilterYear(e.target.value);
                        setFilterDate("");
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border-none text-xs font-bold outline-none ring-0 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all"
                    >
                      <option value="todos">Todos los años</option>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                        <option key={y} value={y.toString()}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Specific Date */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 block">Día Específico</label>
                      {filterDate && (
                        <button onClick={() => setFilterDate("")} className="text-[9px] font-bold text-red-500 hover:underline">Limpiar</button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => {
                        setFilterDate(e.target.value);
                        setFilterMonth("todos"); // Clear month preset when choosing specific date
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border-none text-xs font-bold outline-none ring-0 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Toggles */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {selectedIds.size > 0 && (
              <div className="flex gap-2 flex-1 lg:flex-none">
                <button
                  onClick={() => toggleSelectAll(sortedReparaciones)}
                  className="flex-1 lg:flex-none px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {sortedReparaciones.length > 0 && sortedReparaciones.every(r => selectedIds.has(r.id)) ? "Desmarcar" : "Marcar Todos"}
                </button>
                {isDeletingBulk ? (
                  <button
                    onClick={handleBulkDelete}
                    className="flex-1 lg:flex-none px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-red-600 text-white border border-red-600 hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 animate-pulse"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    CONFIRMAR {selectedIds.size}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsDeletingBulk(true)}
                    className="flex-1 lg:flex-none px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Borrar ({selectedIds.size})
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => setFilterOverdueOnly(!filterOverdueOnly)}
              className={`flex-1 lg:flex-none px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3 shadow-sm ${filterOverdueOnly
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-white dark:bg-neutral-900 text-neutral-500 border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Solo Atrasadas
            </button>
          </div>
        </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-50 dark:border-neutral-800/50">
                <th className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4" /> {/* Espacio para alinear con los checkboxes inferiores */}
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Ticket / Reloj</span>
                  </div>
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Cliente / Tel.</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Fechas (Ingreso | Compromiso)</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/10">
              {isLoading ? (
                <tr><td colSpan={5} className="p-32 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-neutral-200" /></td></tr>
              ) : sortedReparaciones.length === 0 ? (
                <tr><td colSpan={5} className="p-32 text-center text-neutral-400 font-bold italic">No se encontraron resultados.</td></tr>
              ) : (
                sortedReparaciones.slice(0, 50).map((rep) => (
                  <tr key={rep.id} onClick={() => { setSelectedReparacion(rep); fetchHistory(rep.id); fetchInsumos(rep.id); }} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-all cursor-pointer">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                          checked={selectedIds.has(rep.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(rep.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
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
            <button onClick={() => { setShowAddModal(false); setIsEditing(false); setSelectedReparacion(null); }} className="absolute top-8 right-8 p-3 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"><X /></button>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8">{isEditing ? "Editar Reparación" : "Ingreso de Servicio"}</h2>

            <form onSubmit={handleSaveRepair} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4 relative">
                <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Cliente</p>
                <div className="relative">
                  <input 
                    required 
                    className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" 
                    placeholder="Nombre" 
                    value={form.nombre_cliente} 
                    onChange={e => {
                      const val = e.target.value;
                      setForm({ ...form, nombre_cliente: val });
                      setShowCustomerSuggestions(val.length > 0);
                    }}
                    onFocus={() => form.nombre_cliente.length > 0 && setShowCustomerSuggestions(true)}
                  />
                  {showCustomerSuggestions && allClientes.filter(c => c.nombre_completo.toLowerCase().includes(form.nombre_cliente.toLowerCase())).length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                      {allClientes
                        .filter(c => c.nombre_completo.toLowerCase().includes(form.nombre_cliente.toLowerCase()))
                        .map(c => (
                          <div 
                            key={c.id} 
                            className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer border-b last:border-none border-neutral-50 dark:border-neutral-700"
                            onClick={() => {
                              setForm({ ...form, nombre_cliente: c.nombre_completo, telefono_cliente: c.telefono });
                              setShowCustomerSuggestions(false);
                            }}
                          >
                            <p className="text-xs font-black uppercase tracking-tight">{c.nombre_completo}</p>
                            <p className="text-[9px] text-neutral-400 font-bold">{c.telefono}</p>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
                <input className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" placeholder="Teléfono" value={form.telefono_cliente} onChange={e => setForm({ ...form, telefono_cliente: e.target.value })} />
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Reloj</p>
                <input required className="w-full px-5 py-4 rounded-xl bg-neutral-900 text-white font-black uppercase text-center" placeholder="RECIBO N°" value={form.numero_recibo} onChange={e => setForm({ ...form, numero_recibo: e.target.value })} />
                <select className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-[10px] font-black uppercase" value={form.tipo_reloj} onChange={e => setForm({ ...form, tipo_reloj: e.target.value })}>
                  <option>Mecánico</option><option>Quarzo</option><option>Pared</option><option>Mesa</option>
                </select>
                <input className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" placeholder="Marca" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} />
                <input className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" placeholder="Modelo" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} />
                <p className="text-[9px] font-black text-neutral-400 uppercase mt-2">Estado Actual</p>
                <select className="w-full px-5 py-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase appearance-none cursor-pointer" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  <option value="en diagnostico">En Diagnóstico</option>
                  <option value="en reparacion">En Reparación</option>
                  <option value="listo">Listo para Entrega</option>
                  <option value="garantia">Garantía</option>
                  <option value="no repara">No Repara</option>
                  <option value="entregado">Entregado</option>
                </select>
                <p className="text-[9px] font-black text-neutral-400 uppercase mt-2">Técnico Asignado</p>
                <select className="w-full px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-[10px] font-black uppercase appearance-none cursor-pointer border-2 border-amber-500/10" value={form.tecnico_id} onChange={e => setForm({ ...form, tecnico_id: e.target.value })}>
                  <option value="">Sin Asignar</option>
                  {perfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre || 'Sin Nombre'} ({p.rol})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Fechas</p>
                <label className="text-[9px] font-bold text-neutral-400">FECHA INGRESO</label>
                <input type="date" className="w-full px-5 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold" value={form.fecha_ingreso} onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} />
                <label className="text-[9px] font-bold text-neutral-400">FECHA COMPROMISO</label>
                <input type="date" className="w-full px-5 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold border-2 border-amber-500/20" value={form.fecha_compromiso} onChange={e => setForm({ ...form, fecha_compromiso: e.target.value })} />
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Problema y Diagnóstico</p>
                  <textarea className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold min-h-[80px]" placeholder="Problema según cliente" value={form.problema} onChange={e => setForm({ ...form, problema: e.target.value })} />
                  <textarea className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold min-h-[80px]" placeholder="Diagnóstico técnico" value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest border-b pb-2">Valores y Pago</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-neutral-400">PRECIO FINAL</label>
                      <input type="number" className="w-full px-5 py-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 text-xl font-black text-center" placeholder="0" value={form.precio_final} onChange={e => setForm({ ...form, precio_final: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-green-500">ABONO ACTUAL</label>
                      <input type="number" className="w-full px-5 py-5 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 text-xl font-black text-center" placeholder="0" value={form.abono} onChange={e => setForm({ ...form, abono: e.target.value })} />
                    </div>
                  </div>
                  {Number(form.abono) > 0 && (
                    <div className="animate-in slide-in-from-top duration-300">
                      <label className="text-[9px] font-black text-amber-500 uppercase">Método de Cobro (Banco/Caja)</label>
                      <select 
                        className="w-full px-5 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-[10px] font-black uppercase text-amber-700 border border-amber-200"
                        value={metodoPagoAbono}
                        onChange={(e) => setMetodoPagoAbono(e.target.value)}
                      >
                        {["Efectivo", "BAC", "LAFISE", "BANPRO", "POS"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )}
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
            <button onClick={() => setSelectedReparacion(null)} className="p-4 rounded-full bg-neutral-50 dark:bg-neutral-800 mb-10"><X /></button>

            <div className="space-y-12">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">TICKET {selectedReparacion!.numero_recibo}</span>
                  <h3 className="text-4xl font-black uppercase italic tracking-tighter mt-1">{selectedReparacion!.marca}</h3>
                  <p className="text-neutral-500 font-bold">{selectedReparacion!.modelo_descripcion || 'Modelo sin especificar'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(selectedReparacion!)} className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:scale-110 transition-all"><Edit2 className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(selectedReparacion!.id)} className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:scale-110 transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 bg-neutral-50 dark:bg-neutral-800 p-8 rounded-[2rem]">
                <div className="space-y-1"><p className="text-[9px] font-black text-neutral-400 uppercase">Costo Total</p><p className="text-2xl font-black">${selectedReparacion!.precio_final}</p></div>
                <div className="space-y-1"><p className="text-[9px] font-black text-neutral-400 uppercase text-right">Saldo Pendiente</p><p className="text-2xl font-black text-right text-red-500">${selectedReparacion!.saldo_pendiente}</p></div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest border-b pb-2">Detalles del Servicio</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase">Problema Reportado</p>
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl mt-1">{selectedReparacion!.problema_cliente || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase">Técnico Responsable</p>
                    <p className="text-xs font-black text-amber-600 dark:text-amber-400 mt-1 uppercase italic tracking-widest bg-amber-500/10 px-4 py-2 rounded-full inline-block">
                      {selectedReparacion!.tecnico?.nombre || 'Pendiente de asignar'}
                    </p>
                  </div>
 
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest border-b pb-2 mb-4">Repuestos e Insumos</p>
                    <div className="space-y-4">
                      {/* Buscador de Repuestos Interactivo */}
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                          <input 
                            type="text"
                            placeholder="Buscar repuesto por nombre, medida en MM, SKU o marca..."
                            value={busquedaRepuesto}
                            onChange={(e) => {
                              setBusquedaRepuesto(e.target.value);
                              setShowRepuestoResults(true);
                            }}
                            onFocus={() => setShowRepuestoResults(true)}
                            className="w-full pl-10 pr-9 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-xs font-bold border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-sm placeholder:text-neutral-400 placeholder:font-normal"
                          />
                          {busquedaRepuesto && (
                            <button 
                              type="button"
                              onClick={() => {
                                setBusquedaRepuesto("");
                                setShowRepuestoResults(false);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown flotante con resultados filtrados */}
                        {showRepuestoResults && (
                          <>
                            {/* Backdrop invisible para cerrar al hacer clic afuera */}
                            <div 
                              className="fixed inset-0 z-20" 
                              onClick={() => setShowRepuestoResults(false)} 
                            />
                            
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in-50 slide-in-from-top-1 duration-150">
                              {(() => {
                                const term = busquedaRepuesto.toLowerCase().trim();
                                const filtered = inventarioItems.filter(item => {
                                  if (!term) return true;
                                  return (
                                    item.nombre?.toLowerCase().includes(term) ||
                                    (item.codigo && item.codigo.toLowerCase().includes(term)) ||
                                    (item.modelo && item.modelo.toLowerCase().includes(term)) ||
                                    (item.marca && item.marca.toLowerCase().includes(term))
                                  );
                                });

                                if (filtered.length === 0) {
                                  return (
                                    <div className="p-4 text-center text-xs text-neutral-400 italic">
                                      No se encontraron repuestos para &quot;{busquedaRepuesto}&quot;
                                    </div>
                                  );
                                }

                                return (
                                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {filtered.map(item => (
                                      <div 
                                        key={item.id}
                                        onClick={() => {
                                          setShowRepuestoResults(false);
                                          setBusquedaRepuesto("");
                                          handleAddInsumo(item);
                                        }}
                                        className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/70 cursor-pointer flex items-center justify-between transition-colors group"
                                      >
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-xs text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                              {item.nombre}
                                            </span>
                                            {item.modelo && item.modelo !== '-' && (
                                              <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                                                {item.modelo}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-neutral-400 font-medium flex items-center gap-1.5 flex-wrap">
                                            {item.codigo && (
                                              <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-600 dark:text-neutral-400">
                                                {item.codigo}
                                              </span>
                                            )}
                                            {item.marca && item.marca !== 'Genérico' && <span>• {item.marca}</span>}
                                            <span className={item.stock_actual <= 5 ? "text-amber-600 dark:text-amber-400 font-bold" : ""}>
                                              • Stock: {item.stock_actual}
                                            </span>
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                          <p className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                                            ${Number(item.precio_venta).toFixed(2)}
                                          </p>
                                          <span className="text-[9px] font-bold text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            + Añadir
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </>
                        )}
                      </div>
 
                      {/* List of current insumos */}
                      <div className="space-y-2">
                        {selectedReparacionInsumos.map(insumo => (
                          <div key={insumo.id} className="flex justify-between items-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-800 flex items-center justify-center text-[10px] font-black">
                                {insumo.cantidad}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-[10px] font-black uppercase tracking-tight">{insumo.inventario?.nombre}</p>
                                  {insumo.inventario?.modelo && insumo.inventario.modelo !== '-' && (
                                    <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                                      {insumo.inventario.modelo}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-neutral-400 font-bold">SKU: {insumo.inventario?.codigo || 'N/A'}{insumo.inventario?.marca ? ` • ${insumo.inventario.marca}` : ''}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRemoveInsumo(insumo.id, insumo.insumo_id, insumo.cantidad, insumo.inventario?.nombre)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {selectedReparacionInsumos.length === 0 && (
                          <p className="text-[9px] text-neutral-400 italic">No hay repuestos registrados para esta reparación.</p>
                        )}
                      </div>
                    </div>
                  </div>
 
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase">Diagnóstico Técnico</p>
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl mt-1">{selectedReparacion!.diagnostico_tecnico || 'Sin diagnóstico registrado'}</p>
                  </div>
                </div>

                <p className="text-[10px] font-black uppercase tracking-widest border-b pb-2">Historial y Línea de Tiempo</p>
                <div className="space-y-6 pt-2">
                  {selectedReparacionHistorial.length === 0 ? (
                    <p className="text-[10px] text-neutral-400 italic">No hay registros históricos para esta reparación.</p>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-100 dark:before:bg-neutral-800">
                      {selectedReparacionHistorial.map((event, idx) => (
                        <div key={event.id} className="relative">
                          <div className={`absolute -left-[22px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-900 ${idx === 0 ? 'bg-amber-500 animate-pulse' : 'bg-neutral-300'}`} />
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-900 dark:text-white">{event.evento}</h4>
                            <span className="text-[9px] font-bold text-neutral-400">{new Date(event.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                            {event.notas || (event.estado_nuevo ? `Estado cambiado de ${event.estado_anterior || '?' } a ${event.estado_nuevo}.` : '')}
                          </p>
                          {event.perfil && (
                            <div className="mt-2 flex items-center gap-1.5 opacity-60">
                              <User className="w-2.5 h-2.5" />
                              <span className="text-[9px] font-bold uppercase">{event.perfil.nombre}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[10px] font-black uppercase tracking-widest border-b pb-2">Fechas Clave</p>
                <div className="space-y-2 pt-2 text-left">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-neutral-400 uppercase tracking-tighter">FECHA INGRESO:</span>
                    <span className="text-neutral-900 dark:text-white">{new Date(selectedReparacion!.fecha_ingreso).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-neutral-400 uppercase tracking-tighter">FECHA COMPROMISO:</span>
                    <span className={overdueRepairs.some(o => o.id === selectedReparacion!.id) ? 'text-red-500' : 'text-neutral-900 dark:text-white'}>
                      {selectedReparacion!.fecha_compromiso ? new Date(selectedReparacion!.fecha_compromiso).toLocaleDateString() : 'No establecida'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest border-b pb-2">Estado</p>
                <div className="grid grid-cols-2 gap-2">
                  {['en diagnostico', 'en reparacion', 'listo', 'garantia', 'no repara', 'entregado'].map(st => (
                    <button key={st} onClick={() => handleUpdateStatus(selectedReparacion!.id, st)} className={`p-4 rounded-2xl text-[9px] font-black uppercase italic tracking-widest ${selectedReparacion!.estado === st ? 'bg-black text-white dark:bg-white dark:text-black scale-[1.05]' : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100'}`}>{st}</button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => handlePrint(selectedReparacion!)} className="flex-1 py-5 rounded-[2rem] bg-neutral-100 dark:bg-neutral-800 font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all"><Printer className="w-4 h-4" /> Comprobante</button>
                {isDeletingId === selectedReparacion!.id ? (
                  <div className="flex-1 flex gap-2 animate-in fade-in zoom-in duration-300">
                    <button onClick={() => handleDelete(selectedReparacion!.id)} className="flex-1 py-5 rounded-[2rem] bg-red-600 text-white font-black uppercase text-[10px] shadow-lg shadow-red-500/30">CONFIRMAR</button>
                    <button onClick={() => setIsDeletingId(null)} className="px-6 py-5 rounded-[2rem] bg-neutral-100 dark:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => setIsDeletingId(selectedReparacion!.id)} className="flex-1 py-5 rounded-[2rem] bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /> Eliminar</button>
                )}
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
                    <div className="h-full bg-black dark:bg-white transition-all duration-700" style={{ width: `${importStatus.progress}%` }}></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery Payment Modal */}
      {deliveryReparacionId && (() => {
        const rep = reparaciones.find(r => r.id === deliveryReparacionId);
        if (!rep) return null;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[3rem] p-10 border border-neutral-100 dark:border-neutral-800 shadow-2xl relative text-center">
              <button onClick={() => setDeliveryReparacionId(null)} className="absolute top-6 right-6 p-3 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"><X className="w-4 h-4" /></button>
              
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <DollarSign className="w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Cobro de Saldo</h2>
              <p className="text-neutral-500 font-bold mb-8 text-xs">Al entregar este reloj, se cobrará el saldo pendiente y se registrará en caja.</p>
              
              <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-3xl mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Monto a Cobrar</p>
                <p className="text-4xl font-black text-green-600 dark:text-green-400 italic">${rep.saldo_pendiente}</p>
              </div>

              <div className="space-y-4 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Método de Pago</label>
                <select 
                  className="w-full px-5 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-sm font-bold border-none outline-none ring-0 focus:ring-2 focus:ring-black/5 transition-all cursor-pointer"
                  value={deliveryPaymentMethod}
                  onChange={(e) => setDeliveryPaymentMethod(e.target.value)}
                >
                  {["Efectivo", "BAC", "LAFISE", "BANPRO", "POS"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <button 
                disabled={isSubmitting} 
                onClick={handleConfirmDelivery} 
                className="w-full mt-8 py-5 rounded-[2rem] bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Confirmar Entrega y Cobro</>}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Comprobante Digital Modal */}
      {lastMovementData && (
        <ComprobantePago 
          data={lastMovementData} 
          onClose={() => setLastMovementData(null)} 
        />
      )}
    </div>
  );
}
