let counter = 0;

/** Kurze, für diese App ausreichend eindeutige ID. */
export function newId(prefix = 'id'): string {
  counter = (counter + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
