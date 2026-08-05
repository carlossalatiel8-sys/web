-- Ejecuta este archivo completo en Supabase: SQL Editor > New query > Run

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (
    username = lower(username)
    and username ~ '^[a-z0-9_-]{3,20}$'
  ),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Solo muestra nombres de usuario; permite comprobar si uno está ocupado.
create policy "Anyone can check username availability"
on public.profiles for select
to anon, authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;

-- Crea automáticamente el perfil al registrarse una cuenta nueva.
create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();
