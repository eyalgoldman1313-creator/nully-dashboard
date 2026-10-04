-- Nully dashboard schema. Tables live in a private schema ("nully") that is NOT exposed through the REST API.
-- The app talks to the DB only through the SECURITY DEFINER RPC functions below, each of which requires a
-- server-side gateway token (its sha256 hash is stored in nully.app_secrets).
create schema if not exists nully;
create extension if not exists pgcrypto with schema extensions;

create table if not exists nully.app_secrets (name text primary key, hash text not null);

create table if not exists nully.tasks (
  id text primary key, wave int not null, title text not null, source text, finding_ids jsonb default '[]', idea_ids jsonb default '[]',
  impact text, impact_level numeric, kind text, status text not null default 'open', status_raw text,
  blockers jsonb default '[]', partial_blockers jsonb default '[]', wait_note text, depends_on jsonb default '[]', needs_inputs jsonb default '[]',
  effort text, effort_min_h numeric, effort_max_h numeric, details text, prompt text, sort int default 0,
  progress int default 0, assignee text, notes text, auto_released boolean default false,
  updated_at timestamptz default now(), updated_by text);
create table if not exists nully.decisions (
  id text primary key, title text not null, question text, status text not null default 'open', options jsonb default '[]', recommended text,
  chosen text, decided_note text, note text, unblocks jsonb default '[]', evidence text, source text, decided_by text, decided_at timestamptz,
  updated_at timestamptz default now(), updated_by text);
create table if not exists nully.inputs (
  id text primary key, title text not null, fmt text, kind text, tasks jsonb default '[]', status text not null default 'needed', note text,
  updated_at timestamptz default now(), updated_by text);
create table if not exists nully.issues (
  id text primary key, title text not null, body text, kind text default 'note', status text not null default 'open', source text, author text,
  related jsonb default '[]', resolution text, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists nully.findings (
  id text primary key, title text not null, severity text, severity_level numeric, severity_source text, category text, impact text, effort text, type text,
  dependencies text, in_scope boolean default true, status text not null default 'open', status_note text, evidence_site text, inference text,
  evidence_reference text, why text, recommendation text, task_ids jsonb default '[]', note text, updated_at timestamptz default now(), updated_by text);
create table if not exists nully.snapshots (
  id text primary key, captured_at timestamptz not null default now(), label text, source text, content_hash text, created_by text, data jsonb not null);
create table if not exists nully.activity_log (
  id bigserial primary key, at timestamptz not null default now(), actor text not null, actor_type text not null, entity_type text, entity_id text,
  action text not null, summary text, details jsonb);
create index if not exists activity_log_at_idx on nully.activity_log (at desc);

alter table nully.app_secrets enable row level security;
alter table nully.tasks enable row level security;
alter table nully.decisions enable row level security;
alter table nully.inputs enable row level security;
alter table nully.issues enable row level security;
alter table nully.findings enable row level security;
alter table nully.snapshots enable row level security;
alter table nully.activity_log enable row level security;
revoke all on all tables in schema nully from anon, authenticated;
revoke all on schema nully from anon, authenticated;

create or replace function public.nd_auth(p_token text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or not exists (select 1 from nully.app_secrets s where s.name = 'gateway' and s.hash = encode(extensions.digest(p_token::bytea, 'sha256'), 'hex')) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
end $$;

create or replace function public.nd_select(p_token text, p_table text, p_filter jsonb default '{}', p_order text default null, p_limit int default null, p_cols text default '*')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb; q text;
begin
  perform public.nd_auth(p_token);
  if p_table not in ('tasks','decisions','inputs','issues','findings','snapshots','activity_log') then raise exception 'bad table'; end if;
  if p_cols !~ '^[a-z_, *]+$' then raise exception 'bad cols'; end if;
  if p_order is not null and p_order !~ '^[a-z_]+( (asc|desc))?$' then raise exception 'bad order'; end if;
  q := format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from (select %s from nully.%I t where to_jsonb(t) @> %L::jsonb %s %s) x',
              p_cols, p_table, coalesce(p_filter,'{}'), case when p_order is null then '' else 'order by '||p_order end,
              case when p_limit is null then '' else 'limit '||p_limit::int end);
  execute q into r;
  return r;
end $$;

create or replace function public.nd_upsert(p_token text, p_table text, p_row jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cols text; upd text; r jsonb; has_id boolean; found boolean := false;
begin
  perform public.nd_auth(p_token);
  if p_table not in ('tasks','decisions','inputs','issues','findings','snapshots','activity_log') then raise exception 'bad table'; end if;
  select string_agg(format('%I', c.column_name), ', '), string_agg(format('%1$I = r.%1$I', c.column_name), ', ') filter (where c.column_name <> 'id')
    into cols, upd
    from information_schema.columns c
   where c.table_schema = 'nully' and c.table_name = p_table and p_row ? c.column_name;
  if cols is null then raise exception 'no columns'; end if;
  has_id := (p_row ? 'id') and p_table <> 'activity_log';
  if has_id then
    execute format('select exists (select 1 from nully.%I where id = %L)', p_table, p_row->>'id') into found;
  end if;
  if found then
    if upd is null then return null; end if;
    -- partial update: only the provided columns are touched
    execute format('update nully.%1$I t set %2$s from jsonb_populate_record(null::nully.%1$I, %3$L::jsonb) r where t.id = r.id returning to_jsonb(t)', p_table, upd, p_row) into r;
  else
    execute format('insert into nully.%1$I (%2$s) select %2$s from jsonb_populate_record(null::nully.%1$I, %3$L::jsonb) returning to_jsonb(%1$I.*)', p_table, cols, p_row) into r;
  end if;
  return r;
end $$;

create or replace function public.nd_delete(p_token text, p_table text, p_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.nd_auth(p_token);
  if p_table not in ('issues') then raise exception 'delete not allowed'; end if;
  execute format('delete from nully.%I where id = %L', p_table, p_id);
end $$;

revoke all on function public.nd_auth(text), public.nd_select(text,text,jsonb,text,int,text), public.nd_upsert(text,text,jsonb), public.nd_delete(text,text,text) from public;
grant execute on function public.nd_select(text,text,jsonb,text,int,text), public.nd_upsert(text,text,jsonb), public.nd_delete(text,text,text) to anon, authenticated;
