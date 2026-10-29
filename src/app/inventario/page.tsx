"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import Papa from "papaparse";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  X, 
  RefreshCw
} from "lucide-react";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  estado: string;
  categoria_id: string;
  categorias?: {
    nombre: string;
  };
}

interface Categoria {
  id: string;
  nombre: string;
}

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<{id: string, nombre: string} | null>(null);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");
  const [valuacionTotal, setValuacionTotal] = useState(0);
  const [ventaPotencial, setVentaPotencial] = useState(0);

  // Estado para el producto (UI)
  const [nuevoProducto, setNuevoProducto] = useState({
    codigo: "",
    nombre: "",
    marca: "",
    modelo: "",
    precio_compra: 0,
    precio_venta: 0,
    stock_actual: 0,
    stock_minimo: 5,
    categoria_id: "",
    estado: "Nuevo",
    es_vendible: true,
    alerta_activa: true
  });

  const { user, rol, sessionReady, lastFocusAt } = useAuth();

  // Estados para importación masiva CSV
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [alertaStockDefecto, setAlertaStockDefecto] = useState(true);
  const [stockMinimoDefecto, setStockMinimoDefecto] = useState(5);
  const [autoCrearCategorias, setAutoCrearCategorias] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizeEstado = (val: any): "Nuevo" | "Usado" | "Restaurado" | "N/A" => {
    if (!val || typeof val !== "string") return "Nuevo";
    const clean = val.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (clean === "nuevo" || clean === "nuevos" || clean === "new" || clean === "n") return "Nuevo";
    if (clean === "usado" || clean === "usados" || clean === "used" || clean === "u" || clean === "segunda mano") return "Usado";
    if (clean === "restaurado" || clean === "restaurados" || clean === "reparado" || clean === "refurbished" || clean === "r") return "Restaurado";
    if (clean === "n/a" || clean === "na" || clean === "no aplica" || clean === "ninguno" || clean === "-") return "N/A";
    return "Nuevo";
  };

  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  };

  const parseNum = (val: any, fallback = 0) => {
    if (val === null || val === undefined || val === "") return fallback;
    if (typeof val === "number") return isNaN(val) ? fallback : val;
    const cleanStr = String(val).replace(/[^0-9.,-]/g, "").replace(",", ".");
    const num = parseFloat(cleanStr);
    return isNaN(num) ? fallback : num;
  };

  const resetImport = () => {
    setParsedRows([]);
    setFileName("");
    setImportProgress("");
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const headers = ["CODIGO / SKU", "NOMBRE", "MODELO", "MARCA", "CATEGORIA", "ESTADO", "P. COMPRA", "P. VENTA", "Stock Act."];
    const sampleRows = [
      ["EMP-06-12", "Empaque O-Ring 12mm x 0.6mm", "12mm", "Ruiha", "Empaques", "Nuevo", "0.72", "200.00", "50"],
      ["EMP-07-28", "Empaque O-Ring 28mm x 0.7mm", "28mm", "Ruiha", "Empaques", "Nuevo", "0.85", "200.00", "40"],
      ["CRIS-MIN-30", "Cristal Mineral Plano 30mm", "30.0mm", "Genérico", "Cristales", "Nuevo", "45.00", "250.00", "15"],
      ["BAT-377", "Batería Óxido Plata 377", "SR626SW", "Renata", "Baterías", "Nuevo", "15.00", "120.00", "100"]
    ];

    const csvContent = "\uFEFF" + [headers.join(","), ...sampleRows.map(r => r.map(c => '"' + c.replace(/"/g, '""') + '"').join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_carga_inventario.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFile = (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv") && !file.type.includes("csv") && !file.type.includes("excel")) {
      alert("Por favor selecciona o arrastra un archivo en formato .CSV");
      return;
    }

    setFileName(file.name);
    setImportProgress("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const rawData = results.data as Record<string, any>[];
        if (!rawData || rawData.length === 0) {
          alert("El archivo CSV no contiene registros o está vacío.");
          return;
        }

        const existingSkus = new Set(productos.map(p => p.codigo?.trim().toLowerCase()).filter(Boolean));
        const seenInFile = new Set<string>();

        const mapped = rawData.map((row, index) => {
          const normalized: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) {
            normalized[normalizeKey(k)] = typeof v === "string" ? v.trim() : v;
          }

          // Soporta exactamente: CODIGO / SKU, NOMBRE, MODELO, MARCA, CATEGORIA, ESTADO, P. COMPRA, P. VENTA, Stock Act.
          const codigo = normalized["codigosku"] || normalized["codigo"] || normalized["sku"] || normalized["cod"] || "";
          const nombre = normalized["nombre"] || normalized["producto"] || normalized["descripcion"] || "";
          const modelo = normalized["modelo"] || normalized["medida"] || "";
          const marca = normalized["marca"] || normalized["fabricante"] || "Genérico";
          const categoria = normalized["categoria"] || normalized["tipo"] || "General";
          const estado = normalizeEstado(normalized["estado"]);
          const precio_compra = parseNum(normalized["pcompra"] ?? normalized["preciocompra"] ?? normalized["costo"] ?? 0);
          const precio_venta = parseNum(normalized["pventa"] ?? normalized["precioventa"] ?? normalized["precio"] ?? 0);
          const stock_actual = Math.round(parseNum(normalized["stockact"] ?? normalized["stockactual"] ?? normalized["stock"] ?? normalized["cantidad"] ?? 0));
          const stock_minimo_raw = normalized["stockminimo"] ?? normalized["stockmin"] ?? normalized["minimo"] ?? null;
          const stock_minimo = stock_minimo_raw !== null && stock_minimo_raw !== "" ? Math.round(parseNum(stock_minimo_raw)) : null;

          const skuLower = codigo.toLowerCase();
          const isDuplicateInDb = codigo ? existingSkus.has(skuLower) : false;
          const isDuplicateInFile = codigo ? seenInFile.has(skuLower) : false;
          if (codigo) seenInFile.add(skuLower);

          let issue = "";
          if (!codigo) issue = "Falta SKU / Código";
          else if (!nombre) issue = "Falta Nombre";
          else if (isDuplicateInDb) issue = "SKU ya existe en base de datos";
          else if (isDuplicateInFile) issue = "SKU repetido en este archivo";

          const isValid = !!codigo && !!nombre && !isDuplicateInFile;

          return {
            rowNumber: index + 2,
            codigo,
            nombre,
            modelo,
            marca,
            categoria,
            estado,
            precio_compra,
            precio_venta,
            stock_actual,
            stock_minimo,
            isValid,
            isDuplicateInDb,
            isDuplicateInFile,
            issue
          };
        });

        setParsedRows(mapped);
      },
      error: (err) => {
        alert("Error al leer el archivo CSV: " + err.message);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    const rowsToProcess = parsedRows.filter(r => {
      if (!r.codigo || !r.nombre) return false;
      if (r.isDuplicateInFile) return false;
      if (r.isDuplicateInDb && skipDuplicates) return false;
      return true;
    });

    if (rowsToProcess.length === 0) {
      alert("No hay productos válidos para importar (todos tienen errores o SKUs duplicados).");
      return;
    }

    setImporting(true);
    setImportProgress("Sincronizando categorías...");

    try {
      // 1. Obtener y sincronizar categorías
      const { data: catData, error: catErr } = await supabase.from("categorias").select("id, nombre");
      if (catErr) throw catErr;

      const categoryMap = new Map<string, string>();
      (catData || []).forEach(c => {
        categoryMap.set(c.nombre.trim().toLowerCase(), c.id);
      });

      // Identificar categorías nuevas a crear de manera limpia y sin duplicados
      const missingCategoriesMap = new Map<string, string>();
      rowsToProcess.forEach(r => {
        const catNameTrimmed = r.categoria.trim();
        const catKey = catNameTrimmed.toLowerCase();
        if (catNameTrimmed && !categoryMap.has(catKey) && !missingCategoriesMap.has(catKey)) {
          const formattedName = catNameTrimmed.charAt(0).toUpperCase() + catNameTrimmed.slice(1);
          missingCategoriesMap.set(catKey, formattedName);
        }
      });

      if (missingCategoriesMap.size > 0 && autoCrearCategorias) {
        setImportProgress(`Creando ${missingCategoriesMap.size} categorías nuevas...`);
        const toInsert = Array.from(missingCategoriesMap.values()).map(nombre => ({ nombre }));
        const { data: newCats, error: newCatErr } = await supabase.from("categorias").insert(toInsert).select("id, nombre");
        if (newCatErr) throw newCatErr;
        (newCats || []).forEach(c => {
          categoryMap.set(c.nombre.trim().toLowerCase(), c.id);
        });
      }

      let defaultCatId = catData?.[0]?.id;
      if (!defaultCatId && categoryMap.size > 0) {
        defaultCatId = categoryMap.values().next().value;
      }

      // 2. Mapear payload final garantizando tipos y check constraints
      const finalProducts = rowsToProcess.map(r => {
        const catKey = r.categoria.trim().toLowerCase();
        const categoria_id = categoryMap.get(catKey) || defaultCatId || null;

        let finalStockMinimo = -1;
        if (r.stock_minimo !== null && r.stock_minimo !== undefined) {
          finalStockMinimo = r.stock_minimo;
        } else if (alertaStockDefecto) {
          finalStockMinimo = stockMinimoDefecto;
        }

        return {
          codigo: r.codigo,
          nombre: r.nombre,
          marca: r.marca || "Genérico",
          modelo: r.modelo || "-",
          categoria_id,
          estado: normalizeEstado(r.estado),
          precio_compra: Math.max(0, Number(r.precio_compra) || 0),
          precio_venta: Math.max(0, Number(r.precio_venta) || 0),
          stock_actual: Math.max(0, Math.round(Number(r.stock_actual) || 0)),
          stock_minimo: finalStockMinimo,
          es_vendible: true
        };
      });

      // 3. Batch insert en paquetes de 50
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(finalProducts.length / BATCH_SIZE);
      let insertedCount = 0;

      for (let i = 0; i < totalBatches; i++) {
        const batch = finalProducts.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        setImportProgress(`Importando lote ${i + 1} de ${totalBatches} (${batch.length} productos)...`);

        const { error: insertErr } = await supabase.from("inventario").insert(batch);
        if (insertErr) throw insertErr;
        insertedCount += batch.length;
      }

      setImportProgress("¡Completado!");
      alert(`✅ ¡Importación exitosa! Se registraron ${insertedCount} productos correctamente.`);
      setIsImportModalOpen(false);
      resetImport();
      fetchData();
    } catch (err: any) {
      console.error("Error al importar:", err);
      alert("Error al importar productos: " + (err.message || "Error desconocido"));
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    // v10.8.5: Se utiliza user?.id como dependencia para evitar disparos por refresco de token.
    if (user?.id && sessionReady) {
      fetchData();
    }
  }, [filtroCategoria, user?.id, sessionReady]); // Sincronización estable por ID

  async function fetchData(retries = 3) {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch Categorías
      const { data: catData, error: catError } = await supabase.from("categorias").select("id, nombre");
      if (catError) throw catError;
      if (catData) setCategorias(catData);

      // Fetch Productos
      let query = supabase
        .from("inventario")
        .select(`
          *,
          categorias (
            nombre
          )
        `)
        .order("created_at", { ascending: false });

      if (filtroCategoria !== "todas") {
        query = query.eq("categoria_id", filtroCategoria);
      }

      const { data: prodData, error } = await query;
      
      if (error) throw error;

      // Ahora usamos la columna 'codigo' directamente de la DB
      setProductos(prodData || []);
      
      const totalCost = (prodData || []).reduce((acc: number, curr: any) => acc + ((curr.precio_compra || 0) * (curr.stock_actual || 0)), 0);
      const totalPotential = (prodData || []).reduce((acc: number, curr: any) => acc + ((curr.precio_venta || 0) * (curr.stock_actual || 0)), 0);
      
      setValuacionTotal(totalCost);
      setVentaPotencial(totalPotential);
    } catch (error: any) {
      const isTransient = 
        error.name === 'AbortError' || 
        error.message?.includes("Lock broken") || 
        error.message?.includes("fetch") ||
        error.code === 'PGRST301';

      if (retries > 0 && isTransient) {
        console.warn(`🔄 Inventario (v10.8.12): Re-sync detectado, reintentando...`, retries);
        await new Promise(r => setTimeout(r, 800));
        return fetchData(retries - 1);
      }
      console.error("Error crítico en fetchData:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filtrado local por término de búsqueda
  const productosFiltrados = productos.filter(p => {
    const searchLow = searchTerm.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(searchLow) ||
      (p.codigo && p.codigo.toLowerCase().includes(searchLow)) ||
      (p.marca && p.marca.toLowerCase().includes(searchLow)) ||
      (p.modelo && p.modelo.toLowerCase().includes(searchLow))
    );
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones de Seguridad
    if (nuevoProducto.codigo && !editingId) {
      const isDuplicate = productos.some(p => p.codigo === nuevoProducto.codigo);
      if (isDuplicate) {
        alert("Ya existe un producto con este código (SKU). Por favor usa uno único.");
        return;
      }
    }

    if (nuevoProducto.precio_compra < 0 || nuevoProducto.precio_venta < 0) {
      alert("Los precios no pueden ser negativos.");
      return;
    }
    if (nuevoProducto.stock_actual < 0) {
      alert("El stock no puede ser negativo.");
      return;
    }
    if (nuevoProducto.alerta_activa && nuevoProducto.stock_minimo < 0) {
      alert("El stock mínimo de alerta no puede ser negativo.");
      return;
    }

    setSaving(true);

    const finalData = {
      codigo: nuevoProducto.codigo,
      nombre: nuevoProducto.nombre,
      marca: nuevoProducto.marca,
      modelo: nuevoProducto.modelo,
      precio_compra: nuevoProducto.precio_compra,
      precio_venta: nuevoProducto.precio_venta,
      stock_actual: nuevoProducto.stock_actual,
      stock_minimo: nuevoProducto.alerta_activa ? nuevoProducto.stock_minimo : -1,
      categoria_id: nuevoProducto.categoria_id,
      estado: nuevoProducto.estado,
      es_vendible: nuevoProducto.es_vendible
    };

    if (editingId) {
      const { error } = await supabase
        .from("inventario")
        .update(finalData)
        .eq("id", editingId);

      if (error) {
        alert("Error al actualizar: " + error.message);
      } else {
        setIsModalOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("inventario")
        .insert([finalData]);

      if (error) {
        alert("Error al guardar: " + error.message);
      } else {
        setIsModalOpen(false);
        resetForm();
        fetchData();
      }
    }
    setSaving(false);
  }

  function confirmDelete(id: string, nombre: string) {
    setProductToDelete({id, nombre});
    setIsDeleteModalOpen(true);
  }

  async function handleDelete() {
    if (!productToDelete) return;

    setSaving(true);
    const { error } = await supabase
      .from("inventario")
      .delete()
      .eq("id", productToDelete.id);

    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchData();
    }
    setSaving(false);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaCategoriaNombre.trim()) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("categorias")
      .insert([{ nombre: nuevaCategoriaNombre }]);

    if (error) {
      alert("Error al crear categoría: " + error.message);
    } else {
      setIsCategoryModalOpen(false);
      setNuevaCategoriaNombre("");
      fetchData();
    }
    setSaving(false);
  }

  function resetForm() {
    setNuevoProducto({
      codigo: "",
      nombre: "",
      marca: "",
      modelo: "",
      precio_compra: 0,
      precio_venta: 0,
      stock_actual: 0,
      stock_minimo: 5,
      categoria_id: "",
      estado: "Nuevo",
      es_vendible: true,
      alerta_activa: true
    });
    setEditingId(null);
  }

  function openEdit(prod: Producto) {
    setEditingId(prod.id);
    setNuevoProducto({
      codigo: prod.codigo || "",
      nombre: prod.nombre,
      marca: prod.marca || "",
      modelo: prod.modelo || "",
      precio_compra: prod.precio_compra,
      precio_venta: prod.precio_venta,
      stock_actual: prod.stock_actual,
      stock_minimo: prod.stock_minimo === -1 ? 5 : prod.stock_minimo,
      categoria_id: prod.categoria_id,
      estado: prod.estado,
      es_vendible: (prod as any).es_vendible ?? true,
      alerta_activa: prod.stock_minimo !== -1
    });
    setIsModalOpen(true);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 text-left">
      {/* Encabezado */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
            📦 Inventario
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="text-neutral-500 dark:text-neutral-400 font-medium">
              Gestión de stock y repuestos.
            </p>
            <div className="hidden md:block h-4 w-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
            <div className="flex gap-2">
              <p className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest bg-neutral-100 dark:bg-neutral-900 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800">
                Inversión: <span className="text-neutral-900 dark:text-white ml-1">${valuacionTotal.toLocaleString()}</span>
              </p>
              <p className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest bg-green-50 dark:bg-green-950/30 px-3 py-1 rounded-full border border-green-100 dark:border-green-900/50">
                Venta Potencial: <span className="ml-1">${ventaPotencial.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>
        {rol !== 'tecnico' && (
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => { resetImport(); setIsImportModalOpen(true); }}
              className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 active:scale-95"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Importar CSV</span>
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              <span>➕ Nuevo Producto</span>
            </button>
          </div>
        )}
      </section>

      {/* Barra de Búsqueda y Filtros */}
      <section className="space-y-4">
        <div className="relative group max-w-2xl">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg grayscale opacity-50 group-focus-within:opacity-100 transition-opacity">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por nombre, SKU, marca o modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFiltroCategoria("todas")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              filtroCategoria === "todas" 
              ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md shadow-black/10 dark:shadow-white/5" 
              : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500"
            }`}
          >
            Todas las categorías
          </button>
          {categorias.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setFiltroCategoria(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filtroCategoria === cat.id 
                ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md shadow-black/10 dark:shadow-white/5" 
                : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500"
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </section>

      {/* Tabla */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-neutral-200 dark:border-neutral-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
            <p className="text-neutral-500 font-medium animate-pulse text-sm">Cargando inventario...</p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <span className="text-5xl mb-4 grayscale opacity-50">{searchTerm ? "🚫" : "🔍"}</span>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              {searchTerm ? `No se encontraron resultados para "${searchTerm}"` : "No hay productos"}
            </h3>
            {!searchTerm && (
              <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="px-5 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
              >
                Registrar primer producto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Código / Producto</th>
                  <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Detalle</th>
                  <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Precio Venta</th>
                  <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {productosFiltrados.map((prod) => (
                  <tr key={prod.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {prod.codigo && (
                            <span className="text-[10px] font-black text-neutral-400 font-mono bg-neutral-50 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                              {prod.codigo}
                            </span>
                          )}
                          <span className="font-bold text-neutral-900 dark:text-white capitalize group-hover:text-black dark:group-hover:text-white">
                            {prod.nombre}
                          </span>
                        </div>
                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded mt-1 w-max font-bold">
                          {prod.categorias?.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col text-[11px] space-y-1">
                        <span className="text-neutral-500 font-medium">Marca: <span className="text-neutral-800 dark:text-neutral-200 font-bold">{prod.marca || 'N/A'}</span></span>
                        <span className="text-neutral-500 font-medium">Modelo: <span className="text-neutral-800 dark:text-neutral-200 font-bold">{prod.modelo || 'N/A'}</span></span>
                        <span className="text-neutral-500 font-medium">Estado: <span className="text-neutral-800 dark:text-neutral-200 font-bold">{prod.estado}</span></span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-black ${prod.stock_minimo !== -1 && prod.stock_actual <= prod.stock_minimo ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                          {prod.stock_actual}
                        </span>
                        {(prod.stock_minimo !== -1 && prod.stock_actual <= prod.stock_minimo) && (
                          <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/30 text-[9px] text-red-600 dark:text-red-400 rounded-md font-black animate-pulse border border-red-100 dark:border-red-900/50">
                            REABASTECER
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-black text-sm text-neutral-900 dark:text-white">
                        ${prod.precio_venta.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {rol !== 'tecnico' && (
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => openEdit(prod)}
                            title="Editar"
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all text-neutral-400 hover:text-black dark:hover:text-white shadow-sm hover:shadow-md"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => confirmDelete(prod.id, prod.nombre)}
                            title="Eliminar"
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all text-neutral-400 hover:text-red-600 dark:hover:text-red-400 shadow-sm hover:shadow-md"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-neutral-200 dark:border-neutral-800">
            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-8 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                  <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    {editingId ? "✏️ Editar Producto" : "✨ Nuevo Producto"}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-black dark:hover:text-white text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono italic text-left">Código / SKU</label>
                    <input 
                      type="text" 
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold placeholder:font-normal"
                      placeholder="Ej. BAT-101"
                      value={nuevoProducto.codigo}
                      onChange={(e) => setNuevoProducto({...nuevoProducto, codigo: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-left">Nombre</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold"
                      placeholder="Nombre del artículo"
                      value={nuevoProducto.nombre}
                      onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-left">Marca</label>
                    <input 
                      type="text" 
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold"
                      placeholder="Ej. Sony"
                      value={nuevoProducto.marca}
                      onChange={(e) => setNuevoProducto({...nuevoProducto, marca: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-left">Modelo</label>
                    <input 
                      type="text" 
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold"
                      placeholder="Opcional"
                      value={nuevoProducto.modelo}
                      onChange={(e) => setNuevoProducto({...nuevoProducto, modelo: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-left">Categoría</label>
                    <select 
                      required
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold"
                      value={nuevoProducto.categoria_id}
                      onChange={(e) => setNuevoProducto({...nuevoProducto, categoria_id: e.target.value})}
                    >
                      <option value="">Seleccionar...</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-left">Estado</label>
                    <select 
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold"
                      value={nuevoProducto.estado}
                      onChange={(e) => setNuevoProducto({...nuevoProducto, estado: e.target.value})}
                    >
                      <option value="Nuevo">Nuevo</option>
                      <option value="Usado">Usado</option>
                      <option value="Restaurado">Restaurado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-left">P. Compra</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm transition-all font-bold"
                      value={nuevoProducto.precio_compra}
                      onChange={(e) => setNuevoProducto({...nuevoProducto, precio_compra: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-left">P. Venta</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm transition-all font-bold text-green-600"
                      value={nuevoProducto.precio_venta}
                      onChange={(e) => setNuevoProducto({...nuevoProducto, precio_venta: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-left">Stock Act.</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm transition-all font-bold"
                      value={nuevoProducto.stock_actual}
                      onChange={(e) => setNuevoProducto({...nuevoProducto, stock_actual: parseInt(e.target.value)})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-left">Alerta Stock</label>
                    <div className="flex items-center gap-2">
                      <input 
                        disabled={!nuevoProducto.alerta_activa}
                        type="number" 
                        min="0"
                        className={`w-16 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-3 py-3 text-sm font-bold ${!nuevoProducto.alerta_activa ? 'opacity-30' : ''}`}
                        value={nuevoProducto.stock_minimo}
                        onChange={(e) => setNuevoProducto({...nuevoProducto, stock_minimo: parseInt(e.target.value)})}
                      />
                      <div 
                        onClick={() => setNuevoProducto({...nuevoProducto, alerta_activa: !nuevoProducto.alerta_activa})}
                        className={`flex-1 flex items-center justify-between px-3 py-3 rounded-xl border-2 cursor-pointer transition-all ${nuevoProducto.alerta_activa ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-neutral-50 border-neutral-100 text-neutral-400 opacity-50'}`}
                      >
                        <span className="text-[9px] font-black">{nuevoProducto.alerta_activa ? 'ACTIVA' : 'OFF'}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${nuevoProducto.alerta_activa ? 'bg-amber-500 border-amber-500 shadow-md shadow-amber-500/30' : 'border-neutral-300'}`}>
                          {nuevoProducto.alerta_activa && <span className="text-[10px] text-white font-bold">✓</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-6">
                    <button 
                      disabled={saving}
                      type="submit" 
                      className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 shadow-2xl"
                    >
                      {saving ? "PROCESANDO..." : (editingId ? "ACTUALIZAR DATOS" : "REGISTRAR PRODUCTO")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[2.5rem] p-8 text-center border border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in zoom-in fade-in duration-300">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 border border-red-100 dark:border-red-900/50">
               ⚠️
            </div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">¿Eliminar Producto?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-8 leading-relaxed">
              Estás por eliminar <span className="font-black text-neutral-900 dark:text-white">&quot;{productToDelete?.nombre}&quot;</span>. Esta acción es definitiva y no podrá revertirse.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDelete}
                disabled={saving}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all"
              >
                {saving ? "ELIMINANDO..." : "SÍ, ELIMINAR AHORA"}
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTACION MASIVA CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl rounded-3xl p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="flex justify-between items-start pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
                    Carga Masiva de Inventario
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    Importa empaques, repuestos, cristales o relojes mediante archivo CSV o Excel.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { if (!importing) setIsImportModalOpen(false); }}
                className="text-neutral-400 hover:text-black dark:hover:text-white p-2 rounded-xl transition-all"
                disabled={importing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal con Scroll Interno Seguro */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5 custom-scrollbar">
              
              {/* Zona de Subida y Plantilla */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <div className="text-xs text-neutral-600 dark:text-neutral-300">
                  <p className="font-bold">Columnas soportadas en tu archivo:</p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    CODIGO / SKU • NOMBRE • MODELO • MARCA • CATEGORIA • ESTADO • P. COMPRA • P. VENTA • Stock Act.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>Descargar Plantilla CSV</span>
                </button>
              </div>

              {/* Selector de Archivo / Drop Area */}
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv, text/csv, application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden" 
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative overflow-hidden border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 group ${
                  isDragging 
                    ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-4 ring-emerald-500/20" 
                    : "border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-neutral-50/50 dark:bg-neutral-800/20"
                }`}
              >
                {/* Overlay visual cuando se arrastra un archivo (pointer-events-none para que el mouse no pierda foco) */}
                {isDragging && (
                  <div className="absolute inset-0 z-20 bg-emerald-50/95 dark:bg-neutral-900/95 flex flex-col items-center justify-center p-4 pointer-events-none animate-in fade-in-50 duration-150">
                    <Upload className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-bounce mb-2" />
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      ¡Suelta tu archivo CSV aquí!
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      Detectaremos los datos y las columnas automáticamente
                    </p>
                  </div>
                )}

                {/* Contenido normal con pointer-events-none para evitar que los elementos hijos disparen dragleave */}
                <div className="pointer-events-none select-none">
                  {parsedRows.length === 0 ? (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 mx-auto text-neutral-400 group-hover:text-emerald-500 transition-colors mb-2" />
                      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                        Arrastra y suelta tu archivo CSV aquí o <span className="text-emerald-600 dark:text-emerald-400 underline">haz clic para examinar</span>
                      </p>
                      <p className="text-xs text-neutral-400">
                        Soporta archivos <strong>.CSV</strong> exportados desde Excel o Google Sheets
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-neutral-900 dark:text-white">
                            Archivo cargado: <span className="font-mono text-emerald-600 dark:text-emerald-400">{fileName}</span>
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                            {parsedRows.length} filas detectadas • {parsedRows.filter(r => r.isValid && (!r.isDuplicateInDb || !skipDuplicates)).length} listas para importar
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl">
                          Arrastra otro archivo o haz clic para cambiar
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Opciones y Configuración de Importación */}
              {parsedRows.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Opción Alerta de Stock */}
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={alertaStockDefecto}
                          onChange={(e) => setAlertaStockDefecto(e.target.checked)}
                          className="rounded accent-black dark:accent-white"
                        />
                        <span>Alerta de stock bajo</span>
                      </label>
                      {alertaStockDefecto && (
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                          <span>Umbral mínimo:</span>
                          <input 
                            type="number"
                            min="0"
                            value={stockMinimoDefecto}
                            onChange={(e) => setStockMinimoDefecto(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold text-center"
                          />
                          <span>unid.</span>
                        </div>
                      )}
                    </div>

                    {/* Opción Categorías */}
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center">
                      <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={autoCrearCategorias}
                          onChange={(e) => setAutoCrearCategorias(e.target.checked)}
                          className="rounded accent-black dark:accent-white"
                        />
                        <span>Auto-crear categorías nuevas</span>
                      </label>
                    </div>

                    {/* Opción Omitir Duplicados */}
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center">
                      <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                          className="rounded accent-black dark:accent-white"
                        />
                        <span>Omitir SKUs ya existentes</span>
                      </label>
                    </div>
                  </div>

                  {/* Previsualización en Tabla con Contenedor Seguro */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                    <div className="bg-neutral-100 dark:bg-neutral-800/80 px-4 py-2.5 flex justify-between items-center text-xs font-bold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800">
                      <span>Previsualización ({parsedRows.length} filas detectadas)</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Primeras 50 filas visibles</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto overflow-x-auto custom-scrollbar text-xs">
                      <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-neutral-50 dark:bg-neutral-800 text-[10px] uppercase font-black tracking-wider text-neutral-500 dark:text-neutral-400 sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-800">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Validación</th>
                            <th className="py-2.5 px-3">CODIGO / SKU</th>
                            <th className="py-2.5 px-3">NOMBRE</th>
                            <th className="py-2.5 px-3">MODELO</th>
                            <th className="py-2.5 px-3">MARCA</th>
                            <th className="py-2.5 px-3">CATEGORIA</th>
                            <th className="py-2.5 px-3">ESTADO</th>
                            <th className="py-2.5 px-3">P. COMPRA</th>
                            <th className="py-2.5 px-3">P. VENTA</th>
                            <th className="py-2.5 px-3">Stock Act.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                          {parsedRows.slice(0, 50).map((r, i) => (
                            <tr key={i} className={!r.isValid || (r.isDuplicateInDb && skipDuplicates) ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}>
                              <td className="py-2 px-3 text-[10px] text-neutral-400">{r.rowNumber}</td>
                              <td className="py-2 px-3">
                                {r.isDuplicateInDb ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                                    {skipDuplicates ? "Se omitirá (Existe)" : "Existe en BD"}
                                  </span>
                                ) : r.isDuplicateInFile ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
                                    SKU Duplicado
                                  </span>
                                ) : !r.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
                                    {r.issue}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                    ✓ Listo
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-neutral-900 dark:text-white">{r.codigo || "-"}</td>
                              <td className="py-2 px-3 font-bold text-neutral-800 dark:text-neutral-200">{r.nombre}</td>
                              <td className="py-2 px-3 text-neutral-500">{r.modelo || "-"}</td>
                              <td className="py-2 px-3 text-neutral-500">{r.marca}</td>
                              <td className="py-2 px-3">
                                <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                                  {r.categoria}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                                  {r.estado}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-neutral-600 dark:text-neutral-400">${r.precio_compra.toFixed(2)}</td>
                              <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${r.precio_venta.toFixed(2)}</td>
                              <td className="py-2 px-3 font-bold text-neutral-900 dark:text-white">{r.stock_actual}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con progreso y botones (Siempre fijo en la parte inferior) */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 mt-2 bg-white dark:bg-neutral-900">
              <div className="text-xs text-neutral-500">
                {importProgress && (
                  <p className="flex items-center gap-2 font-bold text-emerald-600 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{importProgress}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={importing}
                  className="flex-1 sm:flex-none px-5 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importing || parsedRows.length === 0}
                  className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importando...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Importar a Inventario</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CATEGORIA */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-sm rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex justify-between items-center mb-6 text-left">
              <h2 className="text-xl font-black text-neutral-900 dark:text-white">🏷️ Nueva Categoría</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-neutral-400 hover:text-black font-black">✕</button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <input 
                autoFocus required type="text" 
                className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm font-bold"
                placeholder="Ej. Herramientas"
                value={nuevaCategoriaNombre}
                onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
              />
              <button disabled={saving} className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all">
                {saving ? "CREANDO..." : "CREAR CATEGORÍA"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BOTON FLOTANTE */}
      <button 
        onClick={() => setIsCategoryModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white dark:border-neutral-900 group"
      >
        <span>🏷️</span>
        <span className="absolute right-16 bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-neutral-800">
           Nueva Categoría
        </span>
      </button>
    </div>
  );
}
