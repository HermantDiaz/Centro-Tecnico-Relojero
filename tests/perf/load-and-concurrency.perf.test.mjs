import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const WEB_URL = process.env.TEST_WEB_URL || 'http://localhost:3000';

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length));
  return sortedArr[idx];
}

test('Perf 1: 50 usuarios concurrentes cargando la Tienda B2C (SSR) con 0% error y p95 < 1000ms', async () => {
  // Warmup inicial de pool HTTP
  await fetch(`${WEB_URL}/`);

  const CONCURRENT_USERS = 50;
  const latencies = [];

  const tasks = Array.from({ length: CONCURRENT_USERS }, async (_, i) => {
    const start = performance.now();
    const res = await fetch(`${WEB_URL}/`, {
      headers: { 'x-forwarded-for': `203.0.113.${(i % 200) + 1}` },
    });
    await res.text();
    const elapsed = performance.now() - start;
    latencies.push(elapsed);
    return res.status;
  });

  const statuses = await Promise.all(tasks);
  const allOk = statuses.every((s) => s === 200);
  assert.equal(allOk, true, 'Todas las 50 peticiones concurrentes deben responder HTTP 200');

  latencies.sort((a, b) => a - b);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  console.log(
    `📊 [Perf SSR 50 Usuarios] p50=${p50.toFixed(1)}ms | p95=${p95.toFixed(1)}ms | p99=${p99.toFixed(1)}ms`
  );
  assert.equal(p95 < 1000, true, `El p95 (${p95.toFixed(1)}ms) debe ser menor a 1000ms`);
});

test('Perf 2: 15 consultas concurrentes de Rastreo (/api/rastreo) desde distintas IPs', async () => {
  const CONCURRENT_QUERIES = 15;
  const latencies = [];

  const tasks = Array.from({ length: CONCURRENT_QUERIES }, async (_, i) => {
    const start = performance.now();
    const res = await fetch(`${WEB_URL}/api/rastreo?recibo=1171`, {
      headers: { 'x-forwarded-for': `192.0.2.${i + 10}` },
    });
    await res.json();
    latencies.push(performance.now() - start);
    return res.status;
  });

  const statuses = await Promise.all(tasks);
  assert.equal(statuses.every((s) => s === 200), true);

  latencies.sort((a, b) => a - b);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  console.log(
    `📊 [Perf API Rastreo 15 Usuarios] p50=${p50.toFixed(1)}ms | p95=${p95.toFixed(1)}ms`
  );
  assert.equal(p95 < 2500, true);
});

test('Perf 3: Rate Limiter bloquea ráfaga de enumeración (>20 req/min desde una misma IP) con HTTP 429', async () => {
  const attackerIp = `198.51.100.${Math.floor(Math.random() * 200) + 20}-${Date.now()}`;
  const statuses = [];

  for (let i = 0; i < 25; i++) {
    const res = await fetch(`${WEB_URL}/api/rastreo?recibo=${1000 + i}`, {
      headers: { 'x-forwarded-for': attackerIp },
    });
    statuses.push(res.status);
  }

  const allowedCount = statuses.filter((s) => s !== 429).length;
  const blockedCount = statuses.filter((s) => s === 429).length;

  console.log(
    `🛡️ [Rate Limiter Ráfaga 25 req] Permitidas=${allowedCount} | Bloqueadas (429)=${blockedCount}`
  );
  assert.equal(allowedCount, 20);
  assert.equal(blockedCount, 5);
});

