export const isFieldEnabled = (
  enabledFields: Record<string, boolean>,
  name: string,
): boolean => enabledFields[name] !== false;

export const buildActiveFields = (
  fields: readonly { name: string }[],
  enabledFields: Record<string, boolean>,
  values: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    fields
      .filter((f) => enabledFields[f.name] !== false)
      .map((f) => [f.name, values[f.name] ?? null]),
  );

export const initEnabledFromEntry = (
  fields: readonly { name: string }[],
  entryFields: Record<string, unknown> | null | undefined,
): Record<string, boolean> => {
  const init: Record<string, boolean> = {};
  for (const f of fields) {
    init[f.name] = Object.prototype.hasOwnProperty.call(
      entryFields ?? {},
      f.name,
    );
  }
  return init;
};
