create table if not exists public.invoice_counters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_value bigint not null default 1000 check (last_value >= 1000),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  invoice_number text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, invoice_number)
);

create table if not exists public.business_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.invoice_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.business_settings enable row level security;

create policy "Owners can read their invoice counter"
  on public.invoice_counters for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners can read their invoices"
  on public.invoices for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners can insert their invoices"
  on public.invoices for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update their invoices"
  on public.invoices for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can delete their invoices"
  on public.invoices for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners can read their business settings"
  on public.business_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners can insert their business settings"
  on public.business_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update their business settings"
  on public.business_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.allocate_invoice_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  allocated_value bigint;
begin
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.invoice_counters (user_id, last_value)
  values (owner_id, 1001)
  on conflict (user_id) do update
    set last_value = public.invoice_counters.last_value + 1,
        updated_at = now()
  returning last_value into allocated_value;

  return 'WR-' || lpad(allocated_value::text, 4, '0');
end;
$$;

create or replace function public.set_invoice_counter_floor(floor_value bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.invoice_counters (user_id, last_value)
  values (owner_id, greatest(floor_value, 1000))
  on conflict (user_id) do update
    set last_value = greatest(public.invoice_counters.last_value, excluded.last_value),
        updated_at = now();
end;
$$;

create or replace function public.create_invoice_draft(draft_id uuid, draft_payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  reserved_number text;
begin
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  reserved_number := public.allocate_invoice_number();

  insert into public.invoices (user_id, id, invoice_number, payload)
  values (
    owner_id,
    draft_id,
    reserved_number,
    jsonb_set(draft_payload, '{number}', to_jsonb(reserved_number))
  );

  return reserved_number;
end;
$$;

revoke all on function public.allocate_invoice_number() from public;
revoke all on function public.set_invoice_counter_floor(bigint) from public;
revoke all on function public.create_invoice_draft(uuid, jsonb) from public;
grant execute on function public.set_invoice_counter_floor(bigint) to authenticated;
grant execute on function public.create_invoice_draft(uuid, jsonb) to authenticated;
