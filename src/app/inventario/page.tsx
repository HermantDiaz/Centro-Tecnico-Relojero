"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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

  useEffect(() => {
    fetchData();
  }, [filtroCategoria]);

  async function fetchData() {
    setLoading(true);
    
    // Fetch Categorías
    const { data: catData } = await supabase.from("categorias").select("id, nombre");
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
    
    if (error) {
      console.error("Error fetching inventory:", error);
    } else {
      // Ahora usamos la columna 'codigo' directamente de la DB
      setProductos(prodData || []);
      
      const totalCost = (prodData || []).reduce((acc: number, curr: any) => acc + (curr.precio_compra * curr.stock_actual), 0);
      const totalPotential = (prodData || []).reduce((acc: number, curr: any) => acc + (curr.precio_venta * curr.stock_actual), 0);
      
      setValuacionTotal(totalCost);
      setVentaPotencial(totalPotential);
    }
    setLoading(false);
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
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg flex items-center gap-2"
        >
          <span>➕ Nuevo Producto</span>
        </button>
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
              Estás por eliminar <span className="font-black text-neutral-900 dark:text-white">"{productToDelete?.nombre}"</span>. Esta acción es definitiva y no podrá revertirse.
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
