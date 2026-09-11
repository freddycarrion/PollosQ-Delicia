-- Corrección de políticas de seguridad para la tabla comunicados

-- 1. Eliminar la política actual si existe
DROP POLICY IF EXISTS "comunicados_admin_escribe" ON comunicados;

-- 2. Crear la política con WITH CHECK explícito para permitir INSERT
CREATE POLICY "comunicados_admin_escribe"
  ON comunicados
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND rol IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND rol IN ('admin', 'supervisor')
    )
  );
