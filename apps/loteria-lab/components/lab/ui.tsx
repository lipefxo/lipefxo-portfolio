import {
  LayoutDashboard,
  History,
  ChartColumnIncreasing,
  FlaskConical,
  Bookmark,
  Database,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CircleHelp,
  SlidersHorizontal,
  Shuffle,
  RefreshCw,
  Download,
  Search,
  Check,
  X,
  Plus,
  Info,
  Menu,
  ExternalLink,
  CircleCheck,
  LockKeyhole,
  Trash2,
  Play,
  Layers,
  Activity,
} from "lucide-react";
import type { ReactNode } from "react";

const icons = {
  dashboard: LayoutDashboard,
  history: History,
  analysis: ChartColumnIncreasing,
  lab: FlaskConical,
  saved: Bookmark,
  data: Database,
  arrow: ArrowUpRight,
  right: ArrowRight,
  down: ChevronDown,
  left: ChevronLeft,
  next: ChevronRight,
  calendar: CalendarDays,
  help: CircleHelp,
  filter: SlidersHorizontal,
  shuffle: Shuffle,
  refresh: RefreshCw,
  download: Download,
  search: Search,
  check: Check,
  close: X,
  plus: Plus,
  info: Info,
  menu: Menu,
  external: ExternalLink,
  verified: CircleCheck,
  lock: LockKeyhole,
  delete: Trash2,
  play: Play,
  layers: Layers,
  test: Activity,
};
export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: keyof typeof icons;
  size?: number;
  className?: string;
}) {
  const Component = icons[name];
  return (
    <Component
      size={size}
      strokeWidth={1.75}
      className={className}
      aria-hidden="true"
    />
  );
}
export const integer = (n: number) => n.toLocaleString("pt-BR");
export const decimal = (n: number, digits = 1) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
export const currency = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
export const shortCurrency = (n: number) =>
  n >= 1000000
    ? `R$ ${decimal(n / 1000000, n % 1000000 ? 1 : 0)} milhões`
    : currency(n);
export const ballLabel = (n: number) => String(n).padStart(2, "0");
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
export const timestampLabel = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <svg width="37" height="37" viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M20 19C6 22 3 10 10 6c7-4 11 3 10 13Zm1 1c-3-14 9-17 13-10 4 7-3 11-13 10Zm-1 1c14-3 17 9 10 13-7 4-11-3-10-13Zm-1-1c3 14-9 17-13 10-4-7 3-11 13-10Z"
          fill="currentColor"
        />
        <circle cx="20" cy="20" r="3" fill="#c5e89b" />
      </svg>
      {!small && (
        <span>
          loteria<span className="brand-light">lab</span>
          <span className="brand-dot">.</span>
        </span>
      )}
    </div>
  );
}

export function Balls({
  numbers,
  size = "small",
  matches = [],
}: {
  numbers: number[];
  size?: "tiny" | "small" | "large";
  matches?: number[];
}) {
  return (
    <div
      className={`balls ${size}`}
      aria-label={`Dezenas: ${numbers.map(ballLabel).join(", ")}`}
    >
      {numbers.map((n) => (
        <span
          key={n}
          className={`ball ${matches.includes(n) ? "matched" : ""}`}
        >
          {ballLabel(n)}
        </span>
      ))}
    </div>
  );
}

export function PanelHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {detail && <p className="muted panel-description">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber";
}) {
  return (
    <div className={`notice ${tone}`}>
      <Icon name="info" size={18} />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="layers" size={27} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function downloadFile(
  name: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Sparkline({
  values,
  width = 150,
  height = 42,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values
    .map(
      (value, index) =>
        `${(index / (values.length - 1)) * (width - 4) + 2},${height - 4 - ((value - min) / range) * (height - 8)}`,
    )
    .join(" ");
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
