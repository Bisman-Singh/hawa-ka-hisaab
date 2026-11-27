// Fills {names} in sentences kept as data, so content files hold whole sentences and code only supplies values.

/** A template with its {names} filled from values; a name with no value stays as written. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}
