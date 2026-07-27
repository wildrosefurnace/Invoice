import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/202607260001_cloud_invoices.sql", import.meta.url);

test("cloud schema protects invoice data and reserves numbers atomically", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /alter table public\.invoices enable row level security/i);
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /unique \(user_id, invoice_number\)/i);
  assert.match(sql, /values \(owner_id, 1001\)/i);
  assert.match(sql, /last_value = public\.invoice_counters\.last_value \+ 1/i);
  assert.match(sql, /create or replace function public\.create_invoice_draft/i);
  assert.match(sql, /reserved_number := public\.allocate_invoice_number\(\)/i);
  assert.match(sql, /insert into public\.invoices/i);
  assert.match(sql, /grant execute on function public\.create_invoice_draft\(uuid, jsonb\) to authenticated/i);
  assert.doesNotMatch(sql, /grant execute on function public\.allocate_invoice_number\(\) to authenticated/i);
  assert.doesNotMatch(sql, /grant .* to anon/i);
});
