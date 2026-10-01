#!/usr/bin/env node
// Creates (or resets) an admin account on the LOCAL Supabase stack.
//
//   npm run admin:local                         -> admin@glazestack.local / admin12345
//   npm run admin:local -- you@example.com pw   -> custom email / password
//
// Local only: it reads the keys from `supabase status` and refuses any API URL
// that is not 127.0.0.1/localhost, so it can never touch a cloud project.
// Not part of seed.sql on purpose — seed data is also applied to cloud projects.

import { execSync } from "node:child_process";

const email = (process.argv[2] ?? "admin@glazestack.local").toLowerCase();
const password = process.argv[3] ?? "admin12345";

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (password.length < 8) fail("Password must be at least 8 characters.");

let status;
try {
  status = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  fail("Local Supabase is not running. Start it with: npx supabase start");
}

const env = Object.fromEntries(
  status
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const api = env.API_URL;
const key = env.SECRET_KEY || env.SERVICE_ROLE_KEY;
if (!api || !key) fail("Could not read API_URL / SECRET_KEY from `supabase status`.");

const host = new URL(api).hostname;
if (host !== "127.0.0.1" && host !== "localhost") fail(`Refusing to run against a non-local Supabase (${api}).`);

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function call(path, init = {}) {
  const res = await fetch(`${api}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const body = await res.text();
  return { ok: res.ok, status: res.status, json: body ? JSON.parse(body) : null };
}

// 1. Create the user, or find it and reset its password.
let userId;
const created = await call("/auth/v1/admin/users", {
  method: "POST",
  body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { display_name: "Admin" } }),
});
if (created.ok) {
  userId = created.json.id;
} else {
  const list = await call("/auth/v1/admin/users?per_page=1000");
  const existing = list.json?.users?.find((u) => u.email?.toLowerCase() === email);
  if (!existing) fail(`Could not create ${email}: ${JSON.stringify(created.json)}`);
  userId = existing.id;
  const reset = await call(`/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ password, email_confirm: true }),
  });
  if (!reset.ok) fail(`Could not reset the password: ${JSON.stringify(reset.json)}`);
}

// 2. Promote the profile (created by the on-signup trigger) to admin.
const promoted = await call(`/rest/v1/profiles?id=eq.${userId}`, {
  method: "PATCH",
  headers: { Prefer: "return=representation" },
  body: JSON.stringify({ role: "admin", display_name: "Admin" }),
});
if (!promoted.ok || !promoted.json?.length) fail(`Could not set the admin role: ${JSON.stringify(promoted.json)}`);

console.log(`
✓ Local admin ready
  Email:    ${email}
  Password: ${password}
  Sign in:  http://localhost:4310/login
`);
