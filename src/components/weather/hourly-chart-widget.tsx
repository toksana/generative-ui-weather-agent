'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HourlyForecastData } from '@/lib/ai/tools/resolve-hourly-forecast';
import type { Location, ToolStream } from '@/lib/weather/schemas';

import { MetricSkeleton } from './metric-skeleton';

interface FrameProps {
  city?: string;
  location?: Location;
}

function Frame({ city, location }: FrameProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        {location ? (
          <CardTitle>{location.name}</CardTitle>
        ) : (
          <>
            <MetricSkeleton className="h-5 w-40" />
            {city && <p className="text-base text-muted-foreground md:text-lg">Finding {city}…</p>}
          </>
        )}
      </CardHeader>
      <CardContent>
        <MetricSkeleton className="h-[180px] w-full" />
      </CardContent>
    </Card>
  );
}

type HourlyChartWidgetProps = Extract<ToolStream<HourlyForecastData>, { status: 'ready' }>;

interface ChartPoint {
  label: string;
  value: number;
}

function toChartData({ metric, hourly }: HourlyForecastData): ChartPoint[] {
  const values = metric === 'temperature' ? hourly.temperature : hourly.precipitationProbability;
  return hourly.time.map((time, index) => ({
    label: time.split('T')[1] ?? time,
    value: Math.round(values[index]),
  }));
}

function HourlyChartWidgetBase({ location, data }: HourlyChartWidgetProps) {
  const points = toChartData(data);
  const isTemperature = data.metric === 'temperature';
  const unit = isTemperature ? '°' : '%';
  const title = isTemperature ? 'Hourly temperature' : 'Chance of rain';

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {title}
          <span className="ml-1 font-normal text-muted-foreground">· {location.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {isTemperature ? (
              <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit={unit} width={40} />
                <Tooltip formatter={(value) => [`${value}${unit}`, title]} />
                <Line type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  unit={unit}
                  width={48}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip formatter={(value) => [`${value}${unit}`, title]} />
                <Bar dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export const HourlyChartWidget = Object.assign(HourlyChartWidgetBase, { Frame });
