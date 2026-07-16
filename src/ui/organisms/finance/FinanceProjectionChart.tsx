import type { ProjectionPoint } from '../../../domain/finance/finance.rules';
import type { MonthKey } from '../../../domain/finance/finance.entity';
import { formatMoney } from '../../../domain/shared/format';

interface FinanceProjectionChartProps {
  points: ProjectionPoint[];
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 220;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 32;
const PADDING_X = 12;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const MAX_BAR_WIDTH = 24;

const SHORT_MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

function shortMonthLabel(month: MonthKey): string {
  const [year, monthNumber] = month.split('-');
  return `${SHORT_MONTHS[Number(monthNumber) - 1]}/${year.slice(2)}`;
}

function barPath(
  x: number,
  width: number,
  zeroY: number,
  valueY: number,
): string {
  const height = Math.abs(zeroY - valueY);
  const radius = Math.min(4, height, width / 2);
  if (valueY < zeroY) {
    return [
      `M ${x} ${zeroY}`,
      `V ${valueY + radius}`,
      `Q ${x} ${valueY} ${x + radius} ${valueY}`,
      `H ${x + width - radius}`,
      `Q ${x + width} ${valueY} ${x + width} ${valueY + radius}`,
      `V ${zeroY}`,
      'Z',
    ].join(' ');
  }
  return [
    `M ${x} ${zeroY}`,
    `V ${valueY - radius}`,
    `Q ${x} ${valueY} ${x + radius} ${valueY}`,
    `H ${x + width - radius}`,
    `Q ${x + width} ${valueY} ${x + width} ${valueY - radius}`,
    `V ${zeroY}`,
    'Z',
  ].join(' ');
}

function describePoints(points: ProjectionPoint[]): string {
  const parts = points
    .map(
      (point) =>
        `${shortMonthLabel(point.month)}: ${formatMoney(point.balance)}`,
    )
    .join('; ');
  return `Gráfico do saldo projetado por mês. ${parts}.`;
}

export function FinanceProjectionChart({
  points,
}: FinanceProjectionChartProps) {
  if (points.length === 0) return null;

  const top = Math.max(0, ...points.map((point) => point.balance));
  const bottom = Math.min(0, ...points.map((point) => point.balance));
  const range = top - bottom || 1;
  const yFor = (value: number) =>
    PADDING_TOP + ((top - value) / range) * PLOT_HEIGHT;
  const zeroY = yFor(0);

  const innerWidth = CHART_WIDTH - PADDING_X * 2;
  const band = innerWidth / points.length;
  const barWidth = Math.min(MAX_BAR_WIDTH, band - 2);

  return (
    <svg
      role="img"
      aria-label={describePoints(points)}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="h-auto w-full"
    >
      <line
        x1={PADDING_X}
        x2={CHART_WIDTH - PADDING_X}
        y1={zeroY}
        y2={zeroY}
        strokeWidth={1}
        className="stroke-border-strong"
      />
      {points.map((point, index) => {
        const x = PADDING_X + band * index + (band - barWidth) / 2;
        const valueY = yFor(point.balance);
        return point.balance === 0 ? (
          <rect
            key={point.month}
            x={x}
            y={zeroY - 1}
            width={barWidth}
            height={2}
            className="fill-ink-muted"
          />
        ) : (
          <path
            key={point.month}
            d={barPath(x, barWidth, zeroY, valueY)}
            className={point.balance < 0 ? 'fill-danger' : 'fill-success'}
          />
        );
      })}
      {points.map((point, index) => (
        <text
          key={point.month}
          x={PADDING_X + band * index + band / 2}
          y={CHART_HEIGHT - 12}
          textAnchor="middle"
          className="fill-ink-tertiary font-sans text-xs"
        >
          {shortMonthLabel(point.month)}
        </text>
      ))}
    </svg>
  );
}
