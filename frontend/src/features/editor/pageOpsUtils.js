export function getVisiblePages(session) {
  const deleted = new Set((session?.deletedPages ?? []).map((value) => Number(value)));
  return (session?.pageOrder ?? []).filter((pageIndex) => !deleted.has(Number(pageIndex)));
}

export function moveArrayItem(items, fromIndex, toIndex) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function mergeVisibleOrderWithDeleted(existingOrder, deletedPages, visibleOrder) {
  const deleted = existingOrder.filter((pageIndex) => deletedPages.includes(pageIndex));
  return [...visibleOrder, ...deleted];
}

export function getRotationForPage(session, pageIndex) {
  return Number(session?.rotatedPages?.[pageIndex] ?? 0);
}
