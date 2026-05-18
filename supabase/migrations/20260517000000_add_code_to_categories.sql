-- ─────────────────────────────────────────────
-- UPDATE CATEGORIES TABLE
-- Add `code` column and alter `path` to text to support '/' separator
-- ─────────────────────────────────────────────

-- 1. Add the short `category_code` column (max 4 chars)
alter table categories add column if not exists category_code varchar(4);

-- 2. Create index to ensure fast lookups by category_code within a workspace
create index if not exists idx_categories_category_code on categories(workspace_id, category_code);

-- 3. Drop the ltree GiST index since we are changing the type
drop index if exists idx_categories_path;

-- 4. Alter the `path` column from `ltree` to `text` so it can accept '/' characters
alter table categories alter column path type text using path::text;

-- 5. Recreate a standard B-tree index for the text path
create index if not exists idx_categories_path_text on categories(path);
