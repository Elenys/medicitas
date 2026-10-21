import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageSpinner } from './Spinner';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  caption: string;
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyState: ReactNode;
}

/** En móvil colapsa a tarjetas apiladas; en escritorio es una tabla con caption y scope. */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  isLoading,
  emptyState,
}: DataTableProps<T>) {
  if (isLoading) return <PageSpinner />;
  if (rows.length === 0) return <>{emptyState}</>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-border text-content-muted border-b text-xs uppercase">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('px-3 py-3 font-semibold', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-border hover:bg-background border-b last:border-0"
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 py-3 align-middle', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-card border-border bg-surface shadow-card border p-4"
          >
            {columns.map((c) => (
              <div key={c.key} className="flex justify-between gap-3 py-1 text-sm">
                <span className="text-content-muted">{c.header}</span>
                <span className="text-right">{c.render(row)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}
