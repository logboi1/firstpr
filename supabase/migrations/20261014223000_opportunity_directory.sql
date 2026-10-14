begin;
-- Invoker security preserves table RLS. Explicit publication filtering also hides
-- drafts and archives when the caller has curator privileges.
create function public.browse_opportunities(
  search_query text default '', skill_filter text default '',
  type_filter text default '', difficulty_filter text default '',
  page_number integer default 1
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with published as materialized (
    select id, title, summary, skills, contribution_type, difficulty,
      repository_url, issue_url, created_at
    from public.opportunities where status = 'published'
  ), matched as materialized (
    select * from published p
    where (coalesce(btrim(search_query), '') = '' or
      position(lower(left(btrim(search_query), 120)) in
        lower(p.title || ' ' || p.summary || ' ' || array_to_string(p.skills, ' '))) > 0)
    and (coalesce(btrim(skill_filter), '') = '' or exists (
      select 1 from unnest(p.skills) s where lower(btrim(s)) = lower(left(btrim(skill_filter), 120))))
    and (coalesce(type_filter, '') = '' or p.contribution_type::text = type_filter)
    and (coalesce(difficulty_filter, '') = '' or p.difficulty::text = difficulty_filter)
  ), totals as (
    select count(*) as total, greatest(1, ceil(count(*) / 12.0)::integer) as pages from matched
  ), paging as (
    select total, pages, least(greatest(coalesce(page_number, 1), 1), pages) as page from totals
  ), page_rows as (
    select m.* from matched m order by m.created_at desc, m.id
    limit 12 offset ((select page from paging) - 1) * 12
  ), skill_choices as (
    select min(btrim(s)) as skill from published p cross join lateral unnest(p.skills) s
    where char_length(btrim(s)) between 1 and 120
    group by lower(btrim(s))
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'summary', summary, 'skills', skills,
      'contribution_type', contribution_type, 'difficulty', difficulty,
      'repository_url', repository_url, 'issue_url', issue_url
    ) order by created_at desc, id) from page_rows), '[]'::jsonb),
    'total', total, 'page', page, 'pages', pages,
    'skills', coalesce((select jsonb_agg(skill order by lower(skill)) from skill_choices), '[]'::jsonb)
  ) from paging;
$$;
revoke all on function public.browse_opportunities(text,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.browse_opportunities(text,text,text,text,integer) to anon, authenticated;
commit;
