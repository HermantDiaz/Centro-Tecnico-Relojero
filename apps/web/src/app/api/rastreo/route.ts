import { NextResponse } from 'next/server';
import {
  buscarReparacionPorRecibo,
  normalizarNumeroRecibo,
  supabaseServer,
} from '@relojeria/database';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const RATE_LIMIT_MAX_REQ = 20;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto
const VALID_TICKET_REGEX = /^[A-Za-z0-9-]+$/;

export async function GET(req: Request) {
  try {
    // 1. Limitador de tasa por IP contra enumeración secuencial de recibos
    const ip = getClientIp(req);
    const rate = checkRateLimit(`rastreo:${ip}`, RATE_LIMIT_MAX_REQ, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Demasiadas consultas seguidas. Por favor espera ${rate.retryAfterSec} segundos e intenta nuevamente.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSec) },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawRecibo = (searchParams.get('recibo') || '').trim();

    if (!rawRecibo || rawRecibo.length > 24) {
      return NextResponse.json(
        { error: 'Por favor ingresa un número de recibo válido.' },
        { status: 400 }
      );
    }

    const cleanNumber = normalizarNumeroRecibo(rawRecibo);
    if (!cleanNumber || !VALID_TICKET_REGEX.test(cleanNumber)) {
      return NextResponse.json(
        { error: 'Formato de número de recibo inválido.' },
        { status: 400 }
      );
    }

    const { data, error } = await buscarReparacionPorRecibo(rawRecibo, supabaseServer);

    if (error) {
      console.error('Error en /api/rastreo:', error);
    }

    if (!data) {
      return NextResponse.json({ data: null }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error inesperado en /api/rastreo:', err);
    return NextResponse.json(
      { error: 'Ocurrió un inconveniente al consultar el recibo.' },
      { status: 500 }
    );
  }
}

