create table if not exists public.desperados_times (
  run_id uuid primary key,
  nickname text not null check (length(nickname) between 1 and 24),
  time_ms integer not null check (time_ms between 54000 and 3600000),
  created_at timestamptz not null default now()
);

create index if not exists desperados_times_rank
  on public.desperados_times (time_ms, created_at);

alter table public.desperados_times enable row level security;
revoke all on public.desperados_times from anon, authenticated;
grant select, insert on public.desperados_times to service_role;
