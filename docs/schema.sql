-- SCRIPTS PARA SUPABASE (RELOJERIA IA)

-- 1. Tabla de Categorías
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabla de Inventario (Relojes y Repuestos)
CREATE TABLE inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  descripcion TEXT,
  precio_compra NUMERIC(12,2) DEFAULT 0,
  precio_venta NUMERIC(12,2) DEFAULT 0,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 5,
  categoria_id UUID REFERENCES categorias(id),
  estado TEXT CHECK (estado IN ('Nuevo', 'Usado', 'Restaurado', 'N/A')) DEFAULT 'N/A',
  es_vendible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Insertar categorías base por defecto
INSERT INTO categorias (nombre, descripcion) VALUES 
('Relojes Nuevos', 'Relojes de fábrica con garantía'),
('Relojes Usados', 'Relojes de segunda mano o restaurados'),
('Baterías / Pilas', 'Repuestos de energía de diversas medidas'),
('Correas / Pulsos', 'Correas de cuero, acero, silicona, etc.'),
('Repuestos Internos', 'Maquinarias, cristales, pines, etc.'),
('Servicios Rápidos', 'Mantenimientos menores inmediatos');
