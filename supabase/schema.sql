-- appnote namespace: leaves pre-existing application tables unchanged.
create table if not exists public.appnote_records (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check(kind in ('note','chat','folder')),
  payload jsonb not null default '{}' check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=8388608),
  deleted boolean not null default false,
  client_updated bigint not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
create index if not exists appnote_records_owner on public.appnote_records(user_id,client_updated desc);
alter table public.appnote_records enable row level security;
revoke all on public.appnote_records from anon;
grant select,insert,update on public.appnote_records to authenticated;
create policy appnote_select_own on public.appnote_records for select to authenticated using ((select auth.uid())=user_id);
create policy appnote_insert_own on public.appnote_records for insert to authenticated with check ((select auth.uid())=user_id);
create policy appnote_update_own on public.appnote_records for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create or replace function public.appnote_save(p_id uuid,p_kind text,p_payload jsonb,p_deleted boolean,p_updated bigint,p_expected bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.appnote_records; success boolean:=false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_expected=0 then
    insert into public.appnote_records(id,user_id,kind,payload,deleted,client_updated)
    values(p_id,auth.uid(),p_kind,p_payload,p_deleted,p_updated)
    on conflict(id) do nothing returning * into saved;
    success:=found;
  else
    update public.appnote_records set kind=p_kind,payload=p_payload,deleted=p_deleted,client_updated=p_updated,revision=revision+1,updated_at=now()
    where id=p_id and user_id=auth.uid() and revision=p_expected returning * into saved;
    success:=found;
  end if;
  if not success then select * into saved from public.appnote_records where id=p_id and user_id=auth.uid(); end if;
  if saved.id is null then raise exception 'Record unavailable'; end if;
  return jsonb_build_object('ok',success,'record',to_jsonb(saved));
end; $$;
revoke all on function public.appnote_save(uuid,text,jsonb,boolean,bigint,bigint) from public,anon;
grant execute on function public.appnote_save(uuid,text,jsonb,boolean,bigint,bigint) to authenticated;


