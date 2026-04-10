-- ============================================================
-- MIGRACIÓN: Módulo Abastecimiento / Transferencias
-- Fecha: 2026-04-10
-- Ejecutar en: Supabase SQL Editor (con rol service_role)
-- ============================================================

-- -----------------------------------------------------------
-- 1. stock_sucursal
--    Snapshot de stock por producto × sucursal (full replace)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_sucursal (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_producto     integer NOT NULL,
  nombre          text NOT NULL,
  tipo            text,
  categoria       text,
  subcategoria    text,
  sucursal        text NOT NULL,
  cantidad        numeric NOT NULL DEFAULT 0,
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_id_producto   ON public.stock_sucursal (id_producto);
CREATE INDEX IF NOT EXISTS idx_stock_sucursal       ON public.stock_sucursal (sucursal);
CREATE INDEX IF NOT EXISTS idx_stock_nombre         ON public.stock_sucursal USING gin(to_tsvector('spanish', nombre));

-- -----------------------------------------------------------
-- 2. requerimientos
--    Solicitudes de transferencia entre sucursales
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requerimientos (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo              text NOT NULL DEFAULT 'abastecimiento'
                    CHECK (tipo IN ('pedido', 'abastecimiento', 'movimiento')),
  pedido_id         uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,
  nv                text,
  cliente           text,
  sucursal_origen   text NOT NULL,
  sucursal_destino  text NOT NULL,
  estado            text NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','conf_stock','preparacion','en_transito','entregado','rechazado')),
  fecha_req         date NOT NULL DEFAULT CURRENT_DATE,
  fecha_solicitada  date,
  fecha_recepcion   date,
  tipo_entrega      text
                    CHECK (tipo_entrega IS NULL OR tipo_entrega IN ('parcial','completa','no_llego','cancelado','devuelto')),
  n_viaje           text,           -- N° TRANS del ERP
  cod_vehiculo      text,           -- código del camión sugerido/usado
  solicitado_por    text,           -- email del usuario que creó
  notas             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_req_estado           ON public.requerimientos (estado);
CREATE INDEX IF NOT EXISTS idx_req_sucursal_origen  ON public.requerimientos (sucursal_origen);
CREATE INDEX IF NOT EXISTS idx_req_sucursal_destino ON public.requerimientos (sucursal_destino);
CREATE INDEX IF NOT EXISTS idx_req_fecha_solicitada ON public.requerimientos (fecha_solicitada);
CREATE INDEX IF NOT EXISTS idx_req_created_at       ON public.requerimientos (created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_requerimientos_updated ON public.requerimientos;
CREATE TRIGGER trg_requerimientos_updated
  BEFORE UPDATE ON public.requerimientos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------
-- 3. requerimiento_items
--    Productos solicitados en cada requerimiento
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requerimiento_items (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requerimiento_id    uuid NOT NULL REFERENCES public.requerimientos(id) ON DELETE CASCADE,
  id_producto         integer,
  nombre_producto     text NOT NULL,
  cantidad_solicitada numeric NOT NULL DEFAULT 0,
  cantidad_aprobada   numeric,
  notas               text
);

CREATE INDEX IF NOT EXISTS idx_req_items_req_id ON public.requerimiento_items (requerimiento_id);

-- -----------------------------------------------------------
-- 4. solicitudes_importadas
--    Solicitudes de despacho importadas del Excel ERP
--    (se cruzan con pedidos de la app por nv = id_venta)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitudes_importadas (
  id              integer PRIMARY KEY,   -- id del ERP
  fecha_despacho  date,
  horario         text,
  prioridad       text,
  estado          text,
  id_venta        integer,
  cliente         text,
  destino         text,
  direccion       text,
  latitud         numeric,
  longitud        numeric,
  sucursal        text,
  importado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sol_imp_fecha    ON public.solicitudes_importadas (fecha_despacho);
CREATE INDEX IF NOT EXISTS idx_sol_imp_sucursal ON public.solicitudes_importadas (sucursal);
CREATE INDEX IF NOT EXISTS idx_sol_imp_id_venta ON public.solicitudes_importadas (id_venta);

-- -----------------------------------------------------------
-- 5. solicitudes_importadas_items
--    Productos de cada solicitud importada del ERP
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitudes_importadas_items (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_solicitud        integer NOT NULL,
  id_venta            integer,
  id_producto         integer,
  nombre_producto     text,
  tipo                text,
  categoria           text,
  subcategoria        text,
  cantidad_solicitada numeric NOT NULL DEFAULT 0,
  cantidad_entregada  numeric NOT NULL DEFAULT 0,
  hojas_de_ruta       text
);

CREATE INDEX IF NOT EXISTS idx_sol_imp_items_solicitud ON public.solicitudes_importadas_items (id_solicitud);
CREATE INDEX IF NOT EXISTS idx_sol_imp_items_id_venta  ON public.solicitudes_importadas_items (id_venta);

-- -----------------------------------------------------------
-- 6. RLS: desactivar (usamos service_role desde las APIs)
--    Las tablas sólo se acceden server-side con SUPABASE_SERVICE_ROLE_KEY
-- -----------------------------------------------------------
ALTER TABLE public.stock_sucursal              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requerimientos              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requerimiento_items         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_importadas      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_importadas_items DISABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- ¡Listo! Verificar con:
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN (
--     'stock_sucursal','requerimientos','requerimiento_items',
--     'solicitudes_importadas','solicitudes_importadas_items'
--   );
-- -----------------------------------------------------------
