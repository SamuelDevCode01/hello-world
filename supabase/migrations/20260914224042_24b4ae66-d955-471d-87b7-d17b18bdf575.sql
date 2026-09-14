revoke all on function public.pertence_ao_salao(uuid) from public, anon;
revoke all on function public.papel_no_salao(uuid) from public, anon;
revoke all on function public.vincular_criador_salao() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.pertence_ao_salao(uuid) to authenticated;
grant execute on function public.papel_no_salao(uuid) to authenticated;