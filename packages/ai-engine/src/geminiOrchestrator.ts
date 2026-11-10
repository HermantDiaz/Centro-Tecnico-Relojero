import {
  type ChatTurn,
  extractTicketFromHistory,
  buildRepairRagContext,
} from './reparacionRag';
import { buildTallerSystemPrompt } from './systemPrompt';

const MODELS_TO_TRY = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
const DEFAULT_FALLBACK_REPLY =
  '¡Hola! Con gusto te atiendo en Centro Técnico Relojero. ¿Deseas consultar el estado de tu recibo o cotizar un servicio técnico?';

const MAX_MESSAGE_CHARS = 500;

export async function processTallerChat(
  messages: ChatTurn[],
  apiKey: string
): Promise<string> {
  const sanitizedMessages = messages.slice(-6).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m?.content || '').trim().slice(0, MAX_MESSAGE_CHARS),
  }));

  const reversedUserMessages = [...sanitizedMessages]
    .reverse()
    .filter((m) => m.role === 'user');
  const userText = reversedUserMessages[0]?.content || '';

  // 1. RAG Dinámico / Tool Calling si se detecta un recibo en la conversación
  const detectedTicketId = extractTicketFromHistory(sanitizedMessages);
  const contextDbRepair = detectedTicketId
    ? await buildRepairRagContext(detectedTicketId)
    : '';

  // 2. Construcción del System Prompt
  const systemPrompt = buildTallerSystemPrompt(contextDbRepair);

  // 3. Formateo de turnos recientes para Google Gemini API
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const msg of sanitizedMessages) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    if (contents.length === 0 && role !== 'user') {
      continue;
    }
    contents.push({
      role,
      parts: [{ text: msg.content }],
    });
  }

  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: userText || 'Hola' }],
    });
  }

  // 4. Inferencia rápida sin consumo de tokens de pensamiento
  const requestPayload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 800,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  for (const modelName of MODELS_TO_TRY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const parts = geminiData.candidates?.[0]?.content?.parts || [];
        const visibleTexts = parts
          .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
          .map((p: { text?: string }) => p.text!.trim())
          .filter(Boolean);

        const candidateText = visibleTexts.join('\n').trim();
        if (candidateText && !candidateText.startsWith('**Formulate')) {
          return candidateText;
        }
      }
    } catch (err) {
      console.warn(`Reintento con siguiente modelo tras fallo en ${modelName}:`, err);
    }
  }

  return DEFAULT_FALLBACK_REPLY;
}

