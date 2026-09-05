const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null): value is string {
  return value !== null && UUID_PATTERN.test(value);
}
