import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { strict as assert } from "node:assert";

const migrationPath = new URL(
  "../supabase/migrations/20260909210000_initial_schema.sql",
  import.meta.url,
);

test("Supabase MVP 스키마가 소유권과 실행 상태 경계를 포함한다", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const normalized = sql.toLowerCase();
  const compact = normalized.replace(/\s+/g, " ");

  for (const table of ["buttons", "workflow_versions", "share_links", "runs"]) {
    assert.match(compact, new RegExp(`create table public\\.${table}`));
    assert.match(compact, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(compact, /references auth\.users\(id\)/);
  assert.match(compact, /unique \(share_link_id, idempotency_key\)/);
  assert.match(compact, /create policy .*buttons.*owner_id = \(select auth\.uid\(\)\)/);
  assert.match(compact, /create policy .*workflow_versions.*auth\.uid\(\)/);
  assert.match(compact, /create policy .*share_links.*auth\.uid\(\)/);
  assert.match(compact, /create policy .*runs.*auth\.uid\(\)/);
  assert.doesNotMatch(normalized, /create policy .* to anon/);
  assert.doesNotMatch(normalized, /storage\.objects/);
});
