import test from 'node:test';
import assert from 'node:assert/strict';

// Funciones puras equivalentes / sincronizadas con @relojeria/database, @relojeria/ai-engine y @relojeria/admin
function normalizarNumeroRecibo(raw) {
  return String(raw || '').replace(/^[#\s]*(?:REP-|REC-)?/i, '').trim();
}

function enmascararNombrePublico(nombre) {
  if (!nombre) return 'Cliente Registrado';
  const partes = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'Cliente Registrado';
  if (partes.length === 1) return partes[0];
  const primerNombre = partes[0];
  const iniciales = partes
    .slice(1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(' ');
  return `${primerNombre} ${iniciales}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractTicketFromHistory(messages) {
  const reversedUserMessages = [...messages].reverse().filter((m) => m.role === 'user');
  for (const msg of reversedUserMessages.slice(0, 5)) {
    const text = String(msg?.content || '');
    const match =
      text.match(/(?:recibo|ticket|orden|boleta|#)\s*([0-9]{2,8})/i) ||
      text.match(/\b([0-9]{3,6})\b/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function filtrarMovimientosValidos(movimientos) {
  if (!movimientos || movimientos.length === 0) return [];
  const idsExcluidos = new Set();
  for (const m of movimientos) {
    const c = (m.concepto || '').toUpperCase();
    if (c.includes('[ANULADO]')) {
      idsExcluidos.add(m.id);
    }
    if (c.includes('ANULACIÓN') || c.includes('ANULACION')) {
      idsExcluidos.add(m.id);
      const match = m.concepto?.match(/Ref:\s*([0-9a-fA-F-]{36})/i);
      if (match && match[1]) {
        idsExcluidos.add(match[1]);
      }
    }
  }
  return movimientos.filter((m) => !idsExcluidos.has(m.id));
}

test('Unit 1: normalizarNumeroRecibo limpia prefijos #, REP- y REC-', () => {
  assert.equal(normalizarNumeroRecibo('#1042'), '1042');
  assert.equal(normalizarNumeroRecibo('REP-1171'), '1171');
  assert.equal(normalizarNumeroRecibo('  #rec-850  '), '850');
  assert.equal(normalizarNumeroRecibo('1171'), '1171');
});

test('Unit 2: enmascararNombrePublico protege PII dejando solo iniciales de apellidos', () => {
  assert.equal(enmascararNombrePublico('Carlos Alberto Mendoza'), 'Carlos A. M.');
  assert.equal(enmascararNombrePublico('Pablo Antonio Blandon Solis'), 'Pablo A. B. S.');
  assert.equal(enmascararNombrePublico('Roberto'), 'Roberto');
  assert.equal(enmascararNombrePublico(''), 'Cliente Registrado');
  assert.equal(enmascararNombrePublico(null), 'Cliente Registrado');
});

test('Unit 3: escapeHtml neutraliza vectores XSS en ComprobantePago', () => {
  const maliciousInput = `<script>alert("xss")</script><img src=x onerror='steal()'> & "test"`;
  const escaped = escapeHtml(maliciousInput);
  assert.equal(escaped.includes('<script>'), false);
  assert.equal(escaped.includes('<img'), false);
  assert.equal(
    escaped,
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&lt;img src=x onerror=&#39;steal()&#39;&gt; &amp; &quot;test&quot;'
  );
});

test('Unit 4: extractTicketFromHistory detecta boletas de usuario e ignora dígitos sueltos', () => {
  const history1 = [
    { role: 'user', content: 'Hola, tengo 1 reloj automático que se atrasa' },
  ];
  assert.equal(extractTicketFromHistory(history1), null);

  const history2 = [
    { role: 'user', content: 'Hola, quiero saber el estado del recibo #1171' },
  ];
  assert.equal(extractTicketFromHistory(history2), '1171');

  const history3 = [
    { role: 'assistant', content: 'Por ejemplo el recibo 9999' },
    { role: 'user', content: 'El mío es el 1042' },
  ];
  assert.equal(extractTicketFromHistory(history3), '1042');
});

test('Unit 5: filtrarMovimientosValidos excluye cobros anulados y sus contrapartidas por UUID', () => {
  const movOriginalId = '123e4567-e89b-12d3-a456-426614174000';
  const movimientos = [
    { id: movOriginalId, tipo: 'ingreso', monto: 500, concepto: 'Venta Reloj Seiko' },
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      tipo: 'egreso',
      monto: 500,
      concepto: `ANULACIÓN de movimiento (Ref: ${movOriginalId})`,
    },
    {
      id: '323e4567-e89b-12d3-a456-426614174002',
      tipo: 'ingreso',
      monto: 120,
      concepto: 'Cambio de batería suiza',
    },
  ];

  const validos = filtrarMovimientosValidos(movimientos);
  assert.equal(validos.length, 1);
  assert.equal(validos[0].id, '323e4567-e89b-12d3-a456-426614174002');
});

