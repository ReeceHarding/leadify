export const KEYWORD_CONFIG = {
  // Minimum number of Google results we consider "enough" before widening the search.
  MIN_RESULTS: Number(process.env.KEYWORD_MIN_RESULTS || 3),
  // Maximum number of fallback attempts (quoted → unquoted → synonyms ...).
  MAX_ATTEMPTS: Number(process.env.KEYWORD_MAX_ATTEMPTS || 3),
  // Minimum acceptable reach-signal score (0-1) for a generated query to be kept.
  SCORE_THRESHOLD: Number(process.env.KEYWORD_SCORE_THRESHOLD || 0.3)
} as const

export type KeywordConfig = typeof KEYWORD_CONFIG
