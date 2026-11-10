import { NextResponse } from 'next/server';
import { processTallerChat } from '@relojeria/ai-engine';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const MAX_BODY_BYTES = 16 * 1024; // 16 KB
const MAX_MESSAGE_CHARS = 500;
const RATE_LIMIT_MAX_REQ = 15;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto

export async function POST(req: Request) {
  try {
    // 1. Control de tasa por IP (Anti-Abuso / Protección de cuota Gemini)
    const ip = getClientIp(req);
    const rate = checkRateLimit(`chat:${ip}`, RATE_LIMIT_MAX_REQ, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          reply: `Has enviado demasiadas consultas seguidas. Por favor espera ${rate.retryAfterSec} segundos antes de enviar otro mensaje.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSec) },
        }
      );
    }

    // 2. Límite estricto de tamaño de cuerpo HTTP
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'El tamaño de la solicitud excede el límite permitido (16 KB).' },
        { status: 413 }
      );
    }

    const parsed = JSON.parse(rawBody);
    const { messages } = parsed || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un historial de mensajes válido.' },
        { status: 400 }
      );
    }

    // 3. Sanitización y acotado de turnos recientes y longitud por mensaje
    const boundedMessages = messages.slice(-6).map((m: { role?: string; content?: unknown }) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: String(m?.content || '').trim().slice(0, MAX_MESSAGE_CHARS),
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key de Gemini no configurada en el servidor.' },
        { status: 500 }
      );
    }

    const replyText = await processTallerChat(boundedMessages, apiKey);

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return NextResponse.json(
      {
        reply: 'Ocurrió un inconveniente momentáneo. Por favor intenta de nuevo.',
      },
      { status: 500 }
    );
  }
}
