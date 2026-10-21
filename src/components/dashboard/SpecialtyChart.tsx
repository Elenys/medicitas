'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SpecialtyReportResponse } from '@/types/api';

/** Encapsula Recharts: sustituible sin tocar las páginas. Va siempre acompañado de su tabla. */
export function SpecialtyChart({ items }: { items: SpecialtyReportResponse['items'] }) {
  return (
    <figure>
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer>
          <BarChart data={items} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="specialtyName"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={56}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [value, 'Citas']} />
            <Bar dataKey="total" name="Citas" fill="#1565c0" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Citas no canceladas por especialidad. Los datos están en la tabla siguiente.
      </figcaption>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Citas por especialidad</caption>
        <thead>
          <tr className="border-border text-content-muted border-b text-left text-xs uppercase">
            <th scope="col" className="py-2">
              Especialidad
            </th>
            <th scope="col" className="py-2 text-right">
              Citas
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.specialtyId} className="border-border border-b last:border-0">
              <td className="py-2">{i.specialtyName}</td>
              <td className="py-2 text-right font-medium">{i.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
