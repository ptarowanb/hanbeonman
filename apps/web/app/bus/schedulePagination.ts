export const SCHEDULE_PAGE_SIZE = 10;
const MAX_VISIBLE_PAGES = 7;

export function getSchedulePageCount(totalCount: number, pageSize = SCHEDULE_PAGE_SIZE): number {
  if (!Number.isFinite(totalCount) || totalCount <= 0 || !Number.isFinite(pageSize) || pageSize <= 0) return 0;
  return Math.ceil(totalCount / pageSize);
}

export function getSchedulePageNumbers(pageCount: number, currentPage: number): number[] {
  if (!Number.isInteger(pageCount) || pageCount <= 0) return [];
  const safeCurrentPage = Math.min(Math.max(Math.trunc(currentPage), 1), pageCount);
  const visibleCount = Math.min(pageCount, MAX_VISIBLE_PAGES);
  const half = Math.floor(visibleCount / 2);
  const start = Math.min(Math.max(safeCurrentPage - half, 1), pageCount - visibleCount + 1);
  return Array.from({ length: visibleCount }, (_, index) => start + index);
}
