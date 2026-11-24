import type { MyStatsDto } from '@aionos/shared';
import { format, parseISO } from 'date-fns';
import { BarChart3Icon, TableIcon } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Week = MyStatsDto['weekly'][number];

const weekLabel = (weekStart: string) => format(parseISO(weekStart), 'd MMM');

function WeekTooltip({ week }: { week: Week | undefined }) {
  if (!week) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">Week of {weekLabel(week.weekStart)}</p>
      <p className="mt-1 tabular-nums">
        <span className="font-semibold">{week.hoursLogged} h</span> logged
      </p>
      <p className="text-muted-foreground tabular-nums">{week.tasksDone} tasks done</p>
    </div>
  );
}

/** Single-series bar chart: no legend (the title names the series); table view for a11y. */
export function WeeklyHoursChart({ weekly }: { weekly: Week[] }) {
  const [asTable, setAsTable] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours logged per week</CardTitle>
        <CardDescription>Last {weekly.length} weeks, starting Monday</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
          >
            {asTable ? <BarChart3Icon /> : <TableIcon />}
            {asTable ? 'Chart' : 'Table'}
          </Button>
        </CardAction>
      </CardHeader>
      <div className="px-4 pb-4">
        {asTable ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week of</TableHead>
                <TableHead className="text-right">Hours logged</TableHead>
                <TableHead className="text-right">Tasks done</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekly.map((w) => (
                <TableRow key={w.weekStart}>
                  <TableCell>{weekLabel(w.weekStart)}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.hoursLogged}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.tasksDone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div
            className="h-64"
            role="img"
            aria-label={`Bar chart of hours logged per week: ${weekly
              .map((w) => `${weekLabel(w.weekStart)} ${w.hoursLogged} hours`)
              .join(', ')}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="weekStart"
                  tickFormatter={weekLabel}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
                  content={({ active, payload }) =>
                    active ? <WeekTooltip week={payload?.[0]?.payload as Week | undefined} /> : null
                  }
                />
                <Bar
                  dataKey="hoursLogged"
                  name="Hours logged"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
