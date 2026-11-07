Claude (claude-opus-5-5, low effort) through lib/ai/claude.ts instead of the offline rules

Same cases and graders as baseline. Structured output validated with Zod, 8 s app timeout, server-side refusal fallback on. Claude failures are recorded in errors.jsonl, not scored.
