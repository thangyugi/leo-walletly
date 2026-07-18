import fs from 'fs';
import path from 'path';

// Import the translation data
// Using require to bypass some TS config issues if executed directly, 
// or if we use tsx, import will work.
import { TRANSLATIONS } from '../lib/i18n';

function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  let result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result = { ...result, ...flattenObject(value, newKey) };
    } else if (Array.isArray(value)) {
      // Handle arrays if there are any (e.g. days: ['Su', 'Mo'])
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = String(value);
    }
  }
  return result;
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

function main() {
  const sqlLines: string[] = [
    '--',
    '-- SEED SCRIPT FOR ui_translations',
    '-- Generated from lib/i18n.ts',
    '--',
    'BEGIN;',
    '',
    '-- Delete existing translations just in case to avoid conflicts during seed',
    'TRUNCATE TABLE public.ui_translations;',
    ''
  ];

  for (const [locale, data] of Object.entries(TRANSLATIONS)) {
    const flatData = flattenObject(data);
    for (const [key, value] of Object.entries(flatData)) {
      sqlLines.push(
        `INSERT INTO public.ui_translations (key, locale, value) VALUES ('${escapeSql(key)}', '${escapeSql(locale)}', '${escapeSql(value)}') ON CONFLICT (key, locale) DO UPDATE SET value = EXCLUDED.value;`
      );
    }
  }

  sqlLines.push('');
  sqlLines.push('COMMIT;');
  sqlLines.push('');

  const outPath = path.join(__dirname, '../supabase/migrations/20260525000001_seed_ui_translations.sql');
  fs.writeFileSync(outPath, sqlLines.join('\n'), 'utf-8');
  console.log(`Successfully generated ${outPath} with ${sqlLines.length - 10} translation entries.`);
}

main();
