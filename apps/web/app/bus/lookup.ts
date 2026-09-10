export type LookupItem = { id: string; name: string };

export function filterLookupItems(items: LookupItem[], query: string): LookupItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    `${item.name} ${item.id}`.toLocaleLowerCase().includes(normalizedQuery),
  );
}
