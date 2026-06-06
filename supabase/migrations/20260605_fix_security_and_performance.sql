-- ============================================================
-- 1. Enable RLS on ai_summary_cache + add policies
-- ============================================================
ALTER TABLE public.ai_summary_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_summary_cache_select" ON public.ai_summary_cache
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "ai_summary_cache_insert" ON public.ai_summary_cache
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "ai_summary_cache_update" ON public.ai_summary_cache
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "ai_summary_cache_service_all" ON public.ai_summary_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Drop redundant / bad expenses policies
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow updating insights_json by owner or service" ON public.expenses;
DROP POLICY IF EXISTS "allow updating insights_json" ON public.expenses;

-- ============================================================
-- 3. Recreate expenses policies with (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Allow user to insert own expenses" ON public.expenses;
CREATE POLICY "Allow user to insert own expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
CREATE POLICY "Users can view their own expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow updating OCR fields" ON public.expenses;
CREATE POLICY "Allow updating OCR fields" ON public.expenses
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "User can delete their own expenses" ON public.expenses;
CREATE POLICY "User can delete their own expenses" ON public.expenses
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================
-- 4. Fix ai_summary policies
-- ============================================================
DROP POLICY IF EXISTS "Read own summaries" ON public.ai_summary;
CREATE POLICY "Read own summaries" ON public.ai_summary
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Insert own summaries" ON public.ai_summary;
CREATE POLICY "Insert own summaries" ON public.ai_summary
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Update own summaries" ON public.ai_summary;
CREATE POLICY "Update own summaries" ON public.ai_summary
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- ============================================================
-- 5. Fix profiles policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- ============================================================
-- 6. Fix function search_path + revoke anon EXECUTE
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  update profiles
  set email = new.email
  where id = new.id;

  insert into profiles (id, email)
  select new.id, new.email
  where not exists (
    select 1 from profiles where id = new.id
  );

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.update_ai_summary_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW IS DISTINCT FROM OLD THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_user_email() FROM anon;
