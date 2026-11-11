import { ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Database,
  FileBarChart2,
  Layers3,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Finding, fmt, methods, Well, Run, date } from "../api";
export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="panelhead">
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Source({ well }: { well: Well }) {
  return (
    <span className={"badge " + (well.source === "synthetic" ? "sand" : "")}>
      <i />
      {well.source === "synthetic" ? "Синтетика" : "Файл пользователя"}
    </span>
  );
}
export function Stats({ wells, runs }: { wells: Well[]; runs: Run[] }) {
  const latest = wells.flatMap(
    (w) => runs.find((r) => r.dataset_id === w.id) ?? [],
  );
  const stats = [
    {
      title: "Скважины",
      value: wells.length,
      sub: "в рабочей области",
      icon: Database,
      color: "green",
    },
    {
      title: "Каналы",
      value: wells.reduce((s, w) => s + Object.keys(w.units).length, 0),
      sub: "каротажных кривых",
      icon: Layers3,
      color: "blue",
    },
    {
      title: "Анализы",
      value: runs.length,
      sub: "сохранено в базе",
      icon: FileBarChart2,
      color: "violet",
    },
    {
      title: "Предупреждения",
      value: latest.reduce((s, r) => s + r.count, 0),
      sub: "по последним анализам",
      icon: TriangleAlert,
      color: "amber",
    },
  ];
  return (
    <div className="stats">
      {stats.map((s) => (
        <div className="stat" key={s.title}>
          <div>
            <span className={"tile " + s.color}>
              <s.icon size={16} />
            </span>
            {s.title}
          </div>
          <strong>{fmt(s.value)}</strong>
          <small>{s.sub}</small>
        </div>
      ))}
    </div>
  );
}
export function Findings({ items, unit }: { items: Finding[]; unit: string }) {
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>Метод</th>
            <th>Канал</th>
            <th>Интервал {unit && "· " + unit}</th>
            <th>Точек</th>
            <th>Причина</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f, i) => (
            <tr key={i}>
              <td>{methods[f.method]}</td>
              <td className="mono">{f.curve}</td>
              <td className="mono">
                {fmt(f.start)} – {fmt(f.end)}
              </td>
              <td>{f.samples}</td>
              <td>{f.reason}</td>
              <td>{f.score?.toFixed(3) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && (
        <p className="empty">Предупреждений по выбранным методам нет.</p>
      )}
    </div>
  );
}
export function History({ runs, wells }: { runs: Run[]; wells: Well[] }) {
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>Скважина</th>
            <th>Дата анализа</th>
            <th>Каналы</th>
            <th>Предупреждения</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td>
                <Activity size={14} />{" "}
                <b>{wells.find((w) => w.id === r.dataset_id)?.name}</b>
              </td>
              <td>{date(r.created)}</td>
              <td className="mono">{r.settings.curves.join(" · ")}</td>
              <td>{r.count}</td>
              <td>
                <Link to={"/reports?run=" + r.id} aria-label="Открыть отчёт">
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!runs.length && (
        <p className="empty">
          Сохранённые анализы появятся здесь после запуска проверки.
        </p>
      )}
    </div>
  );
}
