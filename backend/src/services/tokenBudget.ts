import { ORMessage } from './openrouter';

/** Perkiraan token sederhana: ~4 karakter/token, minimal 1 per kata. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chars = text.length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(words, Math.ceil(chars / 4));
}

export function estimateMessages(message: { content: string | null }[]): number {
  return message.reduce((acc, m) => acc + estimateTokens(m.content ?? ''), 0);
}

export interface BudgetOptions {
  systemPrompt: string;
  /** Anggaran input total (perkiraan token). Di bawah batas context model terkecil. */
  maxInputTokens?: number;
  /** Asumsi token output yang dipesan untuk non-pesan (batas max_tokens + margin). */
  reservedOutputTokens?: number;
  /** Panjang karakter maksimal per konten pesan. */
  maxMessageChars?: number;
}

/**
 * Pangkas riwayat agar muat di anggaran token, selalu pertahankan
 * system prompt dan pesan terbaru. Pesan tool/assistant terkait
 * tool ikut dipotong bersama blok yang dipangkas.
 */
export function budgetMessages(
  messages: ORMessage[],
  opts: BudgetOptions
): ORMessage[] {
  const maxInput = opts.maxInputTokens ?? 24000;
  const reserved = opts.reservedOutputTokens ?? 1600;
  const maxChars = opts.maxMessageChars ?? 6000;

  const sys = messages.filter((m) => m.role === 'system');
  const rest = messages.filter((m) => m.role !== 'system');

  const sysTokens = estimateTokens(opts.systemPrompt);
  const budget = Math.max(2000, maxInput - reserved - sysTokens);

  let total = 0;
  const kept: ORMessage[] = [];
  // Iterasi dari akhir (pesan terbaru) ke awal, pertahankan yang muat.
  for (const m of rest) {
    const content = m.content ?? '';
    const clipped: ORMessage = {
      ...m,
      content: content.length > maxChars ? content.slice(0, maxChars) : content,
    };
    const t = estimateTokens(clipped.content ?? '');
    if (total + t > budget && kept.length > 0) break;
    total += t;
    kept.unshift(clipped);
  }
  if (kept.length === 0 && rest.length > 0) {
    const last = rest[rest.length - 1];
    kept.push({
      ...last,
      content: (last.content ?? '').slice(0, maxChars),
    });
  }

  // Sadari: di tengah (0,n) boleh pangkas tool result tunggal; selebihnya skenario
  // panjang sudah teratasi oleh batas per-pesan.
  return [...sys, ...kept];
}