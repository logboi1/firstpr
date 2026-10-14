-- Fictional fixtures only. Disabled in config.toml; apply manually to a disposable local database.
-- example.invalid is intentionally not a real contribution destination.
insert into public.opportunities(id, title, summary, contribution_type, skills, repository_url, issue_url, setup_notes, status)
values
  ('10000000-0000-4000-8000-000000000001', '[DEMO] Improve a setup guide', 'Fictional documentation opportunity for local development.', 'documentation', array['Markdown'], 'https://example.invalid/demo/docs', 'https://example.invalid/demo/docs/issues/1', 'Demo only: read the contribution guide and propose a clearer setup section.', 'published'),
  ('10000000-0000-4000-8000-000000000002', '[DEMO] Test keyboard navigation', 'Fictional testing opportunity for local development.', 'testing', array['Accessibility'], 'https://example.invalid/demo/ui', 'https://example.invalid/demo/ui/issues/2', 'Demo only: check keyboard focus and document the expected behavior.', 'published'),
  ('10000000-0000-4000-8000-000000000003', '[DEMO] Unreviewed draft', 'A draft used to verify visitor access restrictions.', 'code', array['TypeScript'], 'https://example.invalid/demo/app', 'https://example.invalid/demo/app/issues/3', '', 'draft')
on conflict (id) do nothing;
insert into public.checklist_steps(id, opportunity_id, label, position)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Read the contribution guidelines', 0),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Prepare a focused documentation change', 1),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Review draft instructions', 0)
on conflict (id) do nothing;
