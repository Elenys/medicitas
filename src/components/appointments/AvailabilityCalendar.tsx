'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { useAvailability } from '@/hooks/useAvailability';
import { addClinicDays, formatMonthTitle, getIsoWeekday, toClinicDateString } from '@/lib/datetime';
import { WEEKDAYS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const DAYS_IN_WEEK = 7;

function monthDays(month: string): string[] {
  const days: string[] = [];
  for (let d = `${month}-01`; d.startsWith(month); d = addClinicDays(d, 1)) days.push(d);
  return days;
}

function shiftMonth(month: string, delta: number): string {
  const [y = 2026, m = 1] = month.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

/** Concentra el cálculo de qué días tienen cupo; el punto verde no depende solo del color. */
export function AvailabilityCalendar({
  doctorId,
  value,
  onChange,
}: {
  doctorId: number;
  value?: string;
  onChange: (date: string) => void;
}) {
  const today = toClinicDateString(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const { data, isFetching } = useAvailability(doctorId, month);
  const byDate = new Map((data?.days ?? []).map((d) => [d.date, d.availableSlots]));
  const days = monthDays(month);
  const leading = getIsoWeekday(days[0] ?? today) - 1;

  return (
    <div className="rounded-card border-border bg-surface border p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= today.slice(0, 7)}
          className="hover:bg-background flex h-12 w-12 items-center justify-center rounded-lg disabled:opacity-40"
        >
          <ChevronLeft />
        </button>
        <p className="font-semibold first-letter:uppercase" aria-live="polite">
          {formatMonthTitle(`${month}-01T12:00:00`)}{' '}
          {isFetching && <Spinner size="sm" className="text-primary-dark ml-2 align-middle" />}
        </p>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="hover:bg-background flex h-12 w-12 items-center justify-center rounded-lg"
        >
          <ChevronRight />
        </button>
      </div>
      <div role="grid" className="grid grid-cols-7 gap-1 text-center text-sm">
        {WEEKDAYS.map((w) => (
          <div
            key={w.value}
            role="columnheader"
            className="text-content-muted py-1 text-xs font-semibold"
          >
            {w.short}
          </div>
        ))}
        {Array.from({ length: leading % DAYS_IN_WEEK }).map((_, i) => (
          <div key={`lead-${i}`} aria-hidden="true" />
        ))}
        {days.map((date) => {
          const slots = byDate.get(date);
          const enabled = (slots ?? 0) > 0;
          const selected = value === date;
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              disabled={!enabled}
              aria-selected={selected}
              aria-label={`${date}${enabled ? `, ${slots} cupos` : ', sin cupos'}`}
              onClick={() => onChange(date)}
              className={cn(
                'mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full text-sm',
                selected
                  ? 'bg-primary-dark font-semibold text-white'
                  : enabled
                    ? 'text-success-dark hover:bg-primary-light'
                    : 'text-content-disabled',
                date === today && !selected && 'ring-primary ring-2',
              )}
            >
              {Number(date.slice(-2))}
              {enabled && !selected && (
                <span aria-hidden="true" className="bg-success mt-0.5 h-1.5 w-1.5 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
