-- ---------------------------------------------------------------------------
-- Row Level Security policies for Opportunity Engine (PostgreSQL / Supabase).
--
-- Apply AFTER `prisma migrate deploy`:
--     psql "$DIRECT_DATABASE_URL" -f prisma/rls/policies.sql
--
-- Model: the app connects with a role whose JWT carries the Clerk subject in
-- `auth.jwt() ->> 'sub'`. Each user-owned table is readable/writable only for
-- rows whose owning user's clerkId matches that subject.
--
-- IMPORTANT: the ENFORCED authorization boundary is still the service layer
-- (src/server/services/*), which scopes every query by the authenticated userId.
-- These policies are defense-in-depth for any direct Supabase-client access and
-- for a compromised/buggy query path. The Prisma migration connection uses the
-- table owner / service role and BYPASSES RLS by design.
-- ---------------------------------------------------------------------------

-- Helper: the internal User.id for the current JWT subject.
--
-- SECURITY DEFINER: the "User" table is locked (RLS on, no policy), so an
-- ordinary authenticated connection cannot read it directly. The helper must run
-- with the owner's rights to resolve clerkId -> User.id, otherwise every policy
-- below would evaluate against NULL and deny all access. search_path is pinned so
-- the definer context cannot be hijacked by a caller-set path.
create or replace function current_app_user_id() returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select id from "User" where "clerkId" = auth.jwt() ->> 'sub' limit 1
$$;

-- Tables owned directly via a userId column.
do $$
declare t text;
begin
  foreach t in array array[
    'Profile','Attribution','Subscription','NotificationPreference','Notification',
    'SavedOpportunity','Plan','Task','Project','Goal','Milestone',
    'Company','Contact','Deal','Interaction','OutreachMessage','LeadImportBatch',
    'Transaction','Invoice','AiConversation','GeneratorOutput','UsageCounter',
    'FeatureFlagOverride','Feedback'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    -- Milestone has no userId; handled separately below.
    if t <> 'Milestone' then
      execute format($f$
        create policy %I on %I
        using ("userId" = current_app_user_id())
        with check ("userId" = current_app_user_id())
      $f$, t || '_owner', t);
    end if;
  end loop;
end $$;

-- Milestone: owned transitively through its Goal or Project (identifiers quoted —
-- Prisma columns are case-sensitive camelCase).
alter table "Milestone" enable row level security;
drop policy if exists "Milestone_owner" on "Milestone";
create policy "Milestone_owner" on "Milestone"
  using (
    ("Milestone"."goalId" is not null and exists (select 1 from "Goal" g where g."id" = "Milestone"."goalId" and g."userId" = current_app_user_id()))
    or
    ("Milestone"."projectId" is not null and exists (select 1 from "Project" p where p."id" = "Milestone"."projectId" and p."userId" = current_app_user_id()))
  )
  with check (
    ("Milestone"."goalId" is not null and exists (select 1 from "Goal" g where g."id" = "Milestone"."goalId" and g."userId" = current_app_user_id()))
    or
    ("Milestone"."projectId" is not null and exists (select 1 from "Project" p where p."id" = "Milestone"."projectId" and p."userId" = current_app_user_id()))
  );

-- AiMessage: owned through its conversation.
alter table "AiMessage" enable row level security;
drop policy if exists "AiMessage_owner" on "AiMessage";
create policy "AiMessage_owner" on "AiMessage"
  using (exists (
    select 1 from "AiConversation" c
    where c.id = "AiMessage"."conversationId" and c."userId" = current_app_user_id()
  ));

-- Profile join tables (ProfileSkill / ProfileInterest): owned transitively
-- through the Profile row (composite PK, no userId column of their own).
do $$
declare t text;
begin
  foreach t in array array['ProfileSkill','ProfileInterest']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format($f$
      create policy %I on %I
      using (exists (select 1 from "Profile" p where p."id" = %I."profileId" and p."userId" = current_app_user_id()))
      with check (exists (select 1 from "Profile" p where p."id" = %I."profileId" and p."userId" = current_app_user_id()))
    $f$, t || '_owner', t, t, t);
  end loop;
end $$;

-- Public reference data: readable by everyone, writable only by service role.
do $$
declare t text;
begin
  foreach t in array array[
    'Opportunity','OpportunityCategory','OpportunitySkill','OpportunityInterest',
    'OpportunityTool','OpportunityStep','OpportunityExample','Skill','Interest',
    'KnowledgeDocument','FeatureFlag'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_read', t);
    execute format('create policy %I on %I for select using (true)', t || '_read', t);
  end loop;
end $$;

-- User + AuditLog + WebhookEvent: no client access at all (service role only).
-- RLS is enabled with no permissive policy, so every non-owner/non-superuser
-- SELECT/INSERT/UPDATE/DELETE is denied.
alter table "User" enable row level security;
alter table "AuditLog" enable row level security;
alter table "WebhookEvent" enable row level security;
