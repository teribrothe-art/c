#!/usr/bin/env node
/**
 * 데모 로그인·카탈로그 경량화 스모크 (TS 런타임 없이 구조 확인)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), 'utf8');

const testLogin = read('app/test-login.tsx');
const catalog = read('lib/demo-catalog-accounts.ts');
const userCatalog = read('lib/demo-user-catalog.ts');
const staticGroups = read('lib/demo-login-static-groups.ts');
const startWeb = read('scripts/start-web.mjs');
const pkg = read('package.json');

assert.doesNotMatch(testLogin, /DEMO_QUICK_LOGIN_PRESETS/);
assert.doesNotMatch(testLogin, /styles\.quickSection/);
assert.doesNotMatch(testLogin, /빠른 로그인/);
assert.match(testLogin, /WebPressable/);
assert.match(testLogin, /demo-auth-mode/);
assert.match(testLogin, /getBootstrapDemoLoginGroups/);
assert.match(testLogin, /DEMO_LOGIN_GROUP_ORDER/);

assert.match(catalog, /getDemoCatalogLightweightAccounts|resolveDemoCatalogUserByEmail/);
assert.match(catalog, /test-fleet-\(\\d\{3\}\)/);

assert.match(userCatalog, /lookupDemoCatalogUser/);
assert.match(userCatalog, /getDemoCatalogLightweightAccounts|resolveDemoCatalogUserByEmail/);

assert.doesNotMatch(staticGroups, /org-store-affiliation/);
assert.match(staticGroups, /demo-login-store-meta/);

assert.match(startWeb, /CI: 'false'/);
assert.match(pkg, /"web": "node scripts\/start-web.mjs"/);
assert.match(pkg, /"refresh:browser"/);
assert.match(pkg, /"verify:demo-health"/);

console.log('✅ verify-demo-health: 경량 test-login · 카탈로그 · start-web · 빠른 로그인 없음');
