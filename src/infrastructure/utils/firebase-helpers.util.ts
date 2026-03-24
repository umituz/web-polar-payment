export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

export function isTimestamp(value: unknown): value is { toDate(): Date } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  );
}
