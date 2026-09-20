/**
 * Generic type guards.
 *
 * Single-purpose helpers to safely coerce untyped inputs (Firestore payloads,
 * URL params, JSON values) into typed values without `as` casts at the
 * call site.
 */

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function isTimestamp(value: unknown): value is { toDate(): Date } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  );
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}
