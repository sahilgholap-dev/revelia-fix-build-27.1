import { AiGeneration } from '../models/AiGeneration';
import { logger } from '../utils/logger';

export interface AiGenerationRecord {
  userId?: string | null;
  /** Synthesis surface (SynthesisSurface). */
  surface: string;
  /** A/B prompt-version tag. */
  promptVersion: string;
  /** Model that actually served the response. */
  model: string;
  /** True if a server-side fallback fired (served model ≠ requested marquee model). */
  fellBack: boolean;
  stopReason?: string | null;
  /** Token usage from the served response — persisted so per-surface cost is
   *  measurable rather than estimated. Optional: omitting it stores nulls. */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
  /** Em-dashes consumed by the deterministic prose clean-up on this generation.
   *  Omitting it stores null; 0 means the generation arrived already clean. */
  emDashesRemoved?: number | null;
  /** Defaults to now if omitted. */
  generatedAt?: Date;
}

/**
 * Fire-and-forget logger for successful AI synthesis generations (Build 27 R5
 * §9 step 4 — the A/B measurement seam).
 *
 * MIRRORS `logAiFailure`: stores ONLY metadata (no reading content / prompt /
 * image / birth data), and swallows every error so a logging write can NEVER
 * break a reading. Callers invoke it non-blocking (`void logAiGeneration(...)`)
 * — a Mongo hiccup must not add latency to, or throw into, the reading path.
 */
export async function logAiGeneration(record: AiGenerationRecord): Promise<void> {
  try {
    await AiGeneration.create({
      userId: record.userId || null,
      surface: record.surface,
      promptVersion: record.promptVersion,
      modelUsed: record.model,
      fellBack: record.fellBack,
      stopReason: record.stopReason ?? null,
      inputTokens: record.usage?.inputTokens ?? null,
      outputTokens: record.usage?.outputTokens ?? null,
      cacheReadInputTokens: record.usage?.cacheReadInputTokens ?? null,
      cacheCreationInputTokens: record.usage?.cacheCreationInputTokens ?? null,
      emDashesRemoved: record.emDashesRemoved ?? null,
      generatedAt: record.generatedAt ?? new Date(),
    });
  } catch (err: any) {
    // Never let A/B logging break the request flow (mirror logAiFailure).
    logger.warn('Failed to write ai_generation record', {
      error: err?.message,
      surface: record.surface,
    });
  }
}

export async function getRecentAiGenerations(sinceMs: number) {
  const since = new Date(Date.now() - sinceMs);
  const generations = await AiGeneration.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  const bySurface: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  // Token totals per surface — the readable form of the cost question. Rows
  // written before the usage fields existed contribute 0, so a window spanning
  // 2026-07-31 under-reports rather than lying.
  const tokensBySurface: Record<string, { input: number; output: number }> = {};
  // Em-dash clean-up per surface. `rows` counts only rows that CARRY the field, so
  // a window spanning the field's introduction reports a rate over the rows that
  // could have one instead of diluting it with nulls.
  const emDashBySurface: Record<string, { rows: number; removed: number; dirtyRows: number }> = {};
  let fellBackCount = 0;
  for (const g of generations) {
    bySurface[g.surface] = (bySurface[g.surface] || 0) + 1;
    byModel[g.modelUsed] = (byModel[g.modelUsed] || 0) + 1;
    const t = (tokensBySurface[g.surface] ??= { input: 0, output: 0 });
    t.input += g.inputTokens ?? 0;
    t.output += g.outputTokens ?? 0;
    if (typeof g.emDashesRemoved === 'number') {
      const e = (emDashBySurface[g.surface] ??= { rows: 0, removed: 0, dirtyRows: 0 });
      e.rows += 1;
      e.removed += g.emDashesRemoved;
      if (g.emDashesRemoved > 0) e.dirtyRows += 1;
    }
    if (g.fellBack) fellBackCount += 1;
  }

  return {
    since: since.toISOString(),
    total: generations.length,
    bySurface,
    byModel,
    tokensBySurface,
    emDashBySurface,
    fellBackCount,
    recent: generations.slice(0, 50),
  };
}
