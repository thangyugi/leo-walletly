CREATE OR REPLACE FUNCTION public.merge_categories(
  p_source_id UUID,
  p_target_id UUID
) RETURNS VOID AS $$
DECLARE
  v_source_keywords TEXT[];
  v_target_keywords TEXT[];
  v_combined_keywords TEXT[];
BEGIN
  -- 1. Combine keywords
  SELECT keywords INTO v_source_keywords FROM public.categories WHERE id = p_source_id;
  SELECT keywords INTO v_target_keywords FROM public.categories WHERE id = p_target_id;
  
  -- Merge array of strings uniquely
  SELECT array_agg(DISTINCT kw) INTO v_combined_keywords
  FROM (
    SELECT unnest(v_source_keywords) AS kw
    UNION
    SELECT unnest(v_target_keywords) AS kw
  ) sub;

  -- 2. Update target category with combined keywords
  UPDATE public.categories 
  SET keywords = COALESCE(v_combined_keywords, ARRAY[]::TEXT[])
  WHERE id = p_target_id;

  -- 3. Re-assign dependencies
  UPDATE public.categories SET parent_id = p_target_id WHERE parent_id = p_source_id;
  UPDATE public.transactions SET category_id = p_target_id WHERE category_id = p_source_id;
  UPDATE public.transaction_splits SET category_id = p_target_id WHERE category_id = p_source_id;
  UPDATE public.receipt_line_items SET suggested_category_id = p_target_id WHERE suggested_category_id = p_source_id;
  UPDATE public.import_rows SET suggested_category_id = p_target_id WHERE suggested_category_id = p_source_id;
  UPDATE public.category_rules SET category_id = p_target_id WHERE category_id = p_source_id;
  
  -- category_translations has (category_id, locale).
  DELETE FROM public.category_translations WHERE category_id = p_source_id;

  -- If there are any budgets linked to source_id, delete them to avoid FK violations (assuming budget doesn't matter after merge)
  -- Use dynamic SQL to prevent compilation error if table doesn't exist
  BEGIN
    EXECUTE 'DELETE FROM public.category_budgets WHERE category_id = $1' USING p_source_id;
  EXCEPTION WHEN undefined_table THEN
    -- Ignore if table doesn't exist
  END;

  -- 4. Delete source category
  DELETE FROM public.categories WHERE id = p_source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
