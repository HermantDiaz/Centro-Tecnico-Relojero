import test from 'node:test';
import assert from 'node:assert/strict';

const WEB_URL = process.env.TEST_WEB_URL || 'http://localhost:3000';
const ADMIN_URL = process.env.TEST_ADMIN_URL || 'http://localhost:3001';

test('E2E 1: Tienda B2C Unificada (GET /) responde 200 OK con secciones y cabeceras de seguridad', async () => {
  const res = await fetch(`${WEB_URL}/`, {
    headers: { 'x-forwarded-for': '198.51.100.10' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');

  const html = await res.text();
  assert.equal(html.includes('id="catalogo"'), true);
  assert.equal(html.includes('id="rastreo"'), true);
  assert.equal(html.includes('id="servicios"'), true);
});

test('E2E 2: Redirecciones de rutas antiguas (/tienda y /rastreo) funcionan correctamente', async () => {
  const resTienda = await fetch(`${WEB_URL}/tienda`, { redirect: 'manual' });
  assert.equal([307, 308].includes(resTienda.status), true);

  const resRastreo = await fetch(`${WEB_URL}/rastreo`, { redirect: 'manual' });
  assert.equal([307, 308].includes(resRastreo.status), true);
});

test('E2E 3: Endpoint /api/rastreo valida formato, oculta teléfono y enmascara nombre del cliente', async () => {
  // Recibo válido existente
  const resOk = await fetch(`${WEB_URL}/api/rastreo?recibo=1171`, {
    headers: { 'x-forwarded-for': '198.51.100.11' },
  });
  assert.equal(resOk.status, 200);
  const bodyOk = await resOk.json();
  assert.equal(bodyOk.data.numero_recibo, '1171');
  assert.equal(bodyOk.data.clientes?.telefono, undefined);
  assert.equal(bodyOk.data.notas_internas, undefined);

  // Recibo con comodín inválido
  const resBad = await fetch(`${WEB_URL}/api/rastreo?recibo=%25`, {
    headers: { 'x-forwarded-for': '198.51.100.11' },
  });
  assert.equal(resBad.status, 400);

  // Recibo inexistente
  const resNotFound = await fetch(`${WEB_URL}/api/rastreo?recibo=999999`, {
    headers: { 'x-forwarded-for': '198.51.100.11' },
  });
  assert.equal(resNotFound.status, 404);
});

test('E2E 4: Endpoint /api/chat valida historial vacío, límite de 16 KB y responde consultas', async () => {
  // Historial vacío -> 400
  const resEmpty = await fetch(`${WEB_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '198.51.100.12',
    },
    body: JSON.stringify({ messages: [] }),
  });
  assert.equal(resEmpty.status, 400);

  // Payload mayor a 16 KB -> 413
  const hugeText = 'A'.repeat(18 * 1024);
  const resHuge = await fetch(`${WEB_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '198.51.100.12',
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: hugeText }] }),
  });
  assert.equal(resHuge.status, 413);
});

test('E2E 5: ERP Administrativo (@relojeria/admin :3001/login) responde 200 OK con cabeceras anti-Clickjacking', async () => {
  const resAdmin = await fetch(`${ADMIN_URL}/login`);
  assert.equal(resAdmin.status, 200);
  assert.equal(resAdmin.headers.get('x-frame-options'), 'DENY');
  assert.equal(resAdmin.headers.get('x-content-type-options'), 'nosniff');
});

