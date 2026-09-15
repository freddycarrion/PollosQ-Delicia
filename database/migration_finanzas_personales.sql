-- Tabla de finanzas personales (ingresos / egresos por usuario)
create table if not exists public.finanzas_personales (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  tipo        text not null check (tipo in ('ingreso', 'egreso')),
  concepto    text not null,
  monto       numeric(12,2) not null check (monto > 0),
  fecha       date not null default current_date,
  nota        text,
  created_at  timestamptz not null default now()
);

-- Índice para consultas por usuario
create index if not exists idx_finanzas_personales_usuario
  on public.finanzas_personales (usuario_id, fecha desc);

-- RLS: cada usuario solo ve / modifica sus propios registros
alter table public.finanzas_personales enable row level security;

create policy "Ver propios registros"
  on public.finanzas_personales for select
  using (auth.uid() = usuario_id);

create policy "Insertar propio registro"
  on public.finanzas_personales for insert
  with check (auth.uid() = usuario_id);

create policy "Eliminar propio registro"
  on public.finanzas_personales for delete
  using (auth.uid() = usuario_id);
