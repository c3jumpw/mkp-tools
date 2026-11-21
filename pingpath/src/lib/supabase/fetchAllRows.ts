type RangeResult<T> = { data: T[] | null; error: { message: string } | null };

const PAGE_SIZE = 1000;

/**
 * Supabase/PostgREST caps a single response at 1000 rows by default, no
 * matter how many rows actually match. This pages through with .range()
 * until everything has been fetched, so tables past that size (contacts,
 * mainly) don't silently go missing from lists.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<RangeResult<T>>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}
