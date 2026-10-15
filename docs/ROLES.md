# Granting mentor and curator access

Everyone who signs in is a participant. Mentor and curator are separate additional roles in `public.user_roles`; a user can have either, both, or neither. GitHub login, profile experience, skills, and editable account metadata never grant an elevated role.

| Role | Access |
| --- | --- |
| Participant (default) | Own profile, task checklist, private help requests and guidance |
| Mentor | Private help queue; claim open requests; send guidance, release or resolve requests assigned to self |
| Curator | Create/edit/publish/archive opportunities; manual verification of another participant’s PR status |

Curators do not automatically become mentors. Mentors do not automatically become curators. Neither role can grant roles to other people. Role administration currently requires the Supabase project owner or a trusted database administrator; there is no in-app promotion screen or public role-grant endpoint.

## Grant a role

1. Ask the person to sign in with GitHub at least once. This creates the Supabase Auth user and their private profile.
2. In your Supabase project, open **Authentication → Users**. Find the correct account and copy its user UUID. This is the Supabase Auth ID, not the GitHub username or GitHub numeric ID.
3. Open the project's **SQL Editor** as an administrator. Replace the placeholder below with that UUID and run only the role grant you intend.

```sql
-- Mentor access:
insert into public.user_roles (user_id, role)
values ('REPLACE_WITH_SUPABASE_USER_UUID'::uuid, 'mentor')
on conflict (user_id, role) do nothing;
```

```sql
-- Curator access:
insert into public.user_roles (user_id, role)
values ('REPLACE_WITH_SUPABASE_USER_UUID'::uuid, 'curator')
on conflict (user_id, role) do nothing;
```

Run both statements for someone who needs both roles. You can grant your own signed-in account curator access to manage tasks, and separately mentor access if you also handle the queue.

4. Verify the grant in SQL:

```sql
select user_id, role
from public.user_roles
where user_id = 'REPLACE_WITH_SUPABASE_USER_UUID'::uuid;
```

5. Have the user reload `/dashboard`. **Curator workspace** links to `/admin/opportunities`; **Mentor queue** links to `/mentor/help`. Roles are checked against the database on requests and mutations; changing a profile or waiting for a new JWT is not required.

Do not put administrator credentials or service-role keys in browser code to make these inserts. Ordinary authenticated sessions deliberately have no permission to write `user_roles`.

## Revoke a role

For a planned mentor departure, have them release their active requests through the mentor queue first. To inspect assignments as an administrator:

```sql
select id, status
from public.help_requests
where assigned_mentor_id = 'REPLACE_WITH_SUPABASE_USER_UUID'::uuid
  and status = 'claimed';
```

Remove just the intended role:

```sql
delete from public.user_roles
where user_id = 'REPLACE_WITH_SUPABASE_USER_UUID'::uuid
  and role = 'mentor'; -- use 'curator' to revoke curator access instead
```

For urgent access removal, revoke immediately. Existing claimed requests remain assigned and need a trusted administrator's handoff/repair; revocation does not silently reassign requests. Server and database checks reject new queue access and mentor actions after revocation. Sent guidance remains part of the participant's private history. A revoked mentor still has ordinary participant access to their own requests.
