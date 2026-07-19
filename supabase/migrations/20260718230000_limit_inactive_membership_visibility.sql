drop policy event_members_select_member on public.event_members;

grant execute on function private.is_owner(uuid, uuid) to authenticated;

create policy event_members_select_active_or_owner
  on public.event_members
  for select
  to authenticated
  using (
    private.is_active_member(event_id, auth.uid())
    and (left_at is null or private.is_owner(event_id, auth.uid()))
  );
