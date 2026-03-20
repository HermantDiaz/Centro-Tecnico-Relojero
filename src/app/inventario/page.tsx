"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Producto {
  id: string;
  nombre: string;
  marca: string;
  modelo: string;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");

  // Estado para el nuevo producto
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    marca: "",
    modelo: "",
    precio_compra: 0,
    precio_venta: 0,
    stock_actual: 0,
    stock_minimo: 5,
    categoria_id: "",
    estado: "Nuevo",
    es_vendible: true
  });

  useEffect(() => {
    fetchData();
  }, [filtroCategoria]);

  async function fetchData() {
    setLoading(true);
    
    // Fetch Categorías
    const { data: catData } = await supabase.from("categorias").select("id, nombre");
    if (catData) setCategorias(catData);

    // Fetch Productos con Join de Categoría
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
    
    if (error) {
      console.error("Error fetching inventory:", error);
    } else {
      setProductos(prodData || []);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      // MODO EDICIÓN
      const { error } = await supabase
        .from("inventario")
        .update(nuevoProducto)
        .eq("id", editingId);

      if (error) {
        alert("Error al actualizar: " + error.message);
      } else {
        setIsModalOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      // MODO CREACIÓN
      const { error } = await supabase
        .from("inventario")
        .insert([nuevoProducto]);

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
      nombre: "",
      marca: "",
      modelo: "",
      precio_compra: 0,
      precio_venta: 0,
      stock_actual: 0,
      stock_minimo: 5,
      categoria_id: "",
      estado: "Nuevo",
      es_vendible: true
    });
    setEditingId(null);
  }

  function openEdit(prod: any) {
    setEditingId(prod.id);
    setNuevoProducto({
      nombre: prod.nombre,
      marca: prod.marca || "",
      modelo: prod.modelo || "",
      precio_compra: prod.precio_compra,
      precio_venta: prod.precio_venta,
      stock_actual: prod.stock_actual,
      stock_minimo: prod.stock_minimo,
      categoria_id: prod.categoria_id,
      estado: prod.estado,
      es_vendible: prod.es_vendible
    });
    setIsModalOpen(true);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Encabezado */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
            📦 Inventario
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">
            Gestiona tus relojes, repuestos y controla los niveles de stock.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg flex items-center gap-2"
        >
          <span>➕ Nuevo Producto</span>
        </button>
      </section>

      {/* Filtros Rápidos */}
      <section className="flex flex-wrap gap-2">
        <button 
          onClick={() => setFiltroCategoria("todas")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            filtroCategoria === "todas" 
            ? "bg-neutral-900 text-white dark:bg-white dark:text-black" 
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
              ? "bg-neutral-900 text-white dark:bg-white dark:text-black" 
              : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500"
            }`}
          >
            {cat.nombre}
          </button>
        ))}
      </section>

      {/* Tabla de Inventario */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-neutral-200 dark:border-neutral-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
            <p className="text-neutral-500 font-medium animate-pulse text-sm">Cargando inventario...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <span className="text-5xl mb-4 grayscale opacity-50">🔍</span>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No hay productos</h3>
            <p className="text-neutral-500 max-w-xs mb-6 text-sm">
              Parece que no tienes artículos registrados en esta categoría aún.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
            >
              Registrar primer producto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Producto</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Detalle</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Precio Venta</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-900 dark:text-white capitalize group-hover:text-black dark:group-hover:text-white">
                          {prod.nombre}
                        </span>
                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded mt-1 w-max font-bold">
                          {prod.categorias?.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col text-xs space-y-1">
                        <span className="text-neutral-500 font-medium">Marca: <span className="text-neutral-800 dark:text-neutral-200">{prod.marca || 'N/A'}</span></span>
                        <span className="text-neutral-500 font-medium">Estado: <span className="text-neutral-800 dark:text-neutral-200">{prod.estado}</span></span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-black ${prod.stock_actual <= prod.stock_minimo ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                          {prod.stock_actual}
                        </span>
                        {prod.stock_actual <= prod.stock_minimo && (
                          <span className="px-2 py-1 bg-red-50 dark:bg-red-950/30 text-[10px] text-red-600 dark:text-red-400 rounded-md font-bold animate-pulse">
                            REABASTECER
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-black text-neutral-900 dark:text-white">
                        ${prod.precio_venta.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => openEdit(prod)}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all text-neutral-400 hover:text-black dark:hover:text-white"
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE NUEVO PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white">
                  {editingId ? "✏️ Editar Producto" : "✨ Nuevo Producto"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-black dark:hover:text-white text-xl">✕</button>
              </div>

              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Nombre del Producto</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                    placeholder="Ej. Batería CR2032"
                    value={nuevoProducto.nombre}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Marca</label>
                  <input 
                    type="text" 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                    placeholder="Ej. Sony"
                    value={nuevoProducto.marca}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, marca: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Modelo</label>
                  <input 
                    type="text" 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                    placeholder="Opcional"
                    value={nuevoProducto.modelo}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, modelo: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Categoría</label>
                  <select 
                    required
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                    value={nuevoProducto.categoria_id}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, categoria_id: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Estado</label>
                  <select 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                    value={nuevoProducto.estado}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, estado: e.target.value})}
                  >
                    <option value="Nuevo">Nuevo</option>
                    <option value="Usado">Usado</option>
                    <option value="Restaurado">Restaurado</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Precio Compra</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold"
                    value={nuevoProducto.precio_compra}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, precio_compra: parseFloat(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Precio Venta</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold text-green-600 dark:text-green-400"
                    value={nuevoProducto.precio_venta}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, precio_venta: parseFloat(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Stock Inicial</label>
                  <input 
                    type="number" 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold"
                    value={nuevoProducto.stock_actual}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, stock_actual: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Stock Mínimo (Alerta)</label>
                  <input 
                    type="number" 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold"
                    value={nuevoProducto.stock_minimo}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, stock_minimo: parseInt(e.target.value)})}
                  />
                </div>

                <div className="md:col-span-2 pt-4">
                  <button 
                    disabled={saving}
                    type="submit" 
                    className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl"
                  >
                    {saving ? "Guardando..." : (editingId ? "Actualizar Producto" : "Confirmar Registro")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NUEVA CATEGORÍA */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-neutral-900 dark:text-white">🏷️ Nueva Categoría</h2>
                <button onClick={() => setIsCategoryModalOpen(false)} className="text-neutral-400 hover:text-black dark:hover:text-white text-xl">✕</button>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono">Nombre</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all font-bold"
                    placeholder="Ej. Herramientas"
                    value={nuevaCategoriaNombre}
                    onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                  />
                </div>
                <button 
                  disabled={saving}
                  type="submit" 
                  className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest hover:scale-[1.05] transition-all disabled:opacity-50"
                >
                  {saving ? "Creando..." : "Crear Categoría"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Botón Flotante para Categorías (Opcional, pero útil) */}
      <button 
        onClick={() => setIsCategoryModalOpen(true)}
        className="fixed bottom-8 right-8 w-12 h-12 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full shadow-2xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all z-40 group"
        title="Gestionar Categorías"
      >
        🏷️
        <span className="absolute right-14 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Añadir Categoría
        </span>
      </button>
    </div>
  );
}
