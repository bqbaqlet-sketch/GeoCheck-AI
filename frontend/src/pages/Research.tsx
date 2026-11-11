import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Play, SlidersHorizontal } from "lucide-react";
import {
  api,
  date,
  fmt,
  Logs,
  methods,
  Result,
  Run,
  useApi,
  Well,
} from "../api";
import { Findings, History, Panel, Source } from "../components/ui";
import { LogPlot } from "../components/LogPlot";
export function Viewer({
  well,
  data,
  results,
}: {
  well: Well;
  data: Logs;
  results?: Result;
}) {
  const [channels, setChannels] = useState(Object.keys(well.units).slice(0, 5)),
    [marks, setMarks] = useState(true),
    [range, setRange] = useState([well.start, well.end]),
    [error, setError] = useState("");
  return (
    <Panel
      title={"Каротажный разрез · " + well.name}
      action={<Source well={well} />}
    >
      <div className="checks">
        {Object.keys(well.units).map((c) => (
          <label key={c}>
            <input
              type="checkbox"
              checked={channels.includes(c)}
              onChange={() =>
                setChannels(
                  channels.includes(c)
                    ? channels.filter((x) => x !== c)
                    : [...channels, c],
                )
              }
            />
            {c}
          </label>
        ))}
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          const values = new FormData(e.currentTarget),
            a = Number(values.get("from")),
            b = Number(values.get("to"));
          if (a >= b) {
            setError("Начало интервала должно быть меньше конца.");
            return;
          }
          setError("");
          setRange([a, b]);
        }}
      >
        <SlidersHorizontal size={15} />
        {["От", "До"].map((label, i) => (
          <label key={label}>
            {label}{" "}
            <input
              type="number"
              step="any"
              required
              name={i ? "to" : "from"}
              min={well.start}
              max={well.end}
              defaultValue={i ? well.end : well.start}
            />
          </label>
        ))}{" "}
        {well.depth_unit || "ед. ?"} <button>Применить</button>
        <label>
          <input
            type="checkbox"
            checked={marks}
            onChange={(e) => setMarks(e.target.checked)}
          />{" "}
          Предупреждения
        </label>
      </form>
      {error && <p role="alert">{error}</p>}
      <div className="scroll">
        <div style={{ minWidth: channels.length * 125 }}>
          <LogPlot
            large
            data={data}
            channels={channels}
            unit={well.depth_unit}
            findings={marks ? results?.findings : undefined}
            range={range}
          />
        </div>
      </div>
      <div className="foot">
        Выделите диапазон мышью для увеличения. Двойной щелчок сбрасывает
        масштаб. <Link to="/quality">Запустить анализ →</Link>
      </div>
    </Panel>
  );
}
export function Quality({
  well,
  latest,
  result,
}: {
  well: Well;
  latest?: Run;
  result?: Result;
}) {
  const [curves, setCurves] = useState(Object.keys(well.units).slice(0, 5)),
    [active, setActive] = useState(Object.keys(methods)),
    [limit, setLimit] = useState(100);
  const client = useQueryClient();
  const run = useMutation({
    mutationFn: (fields: FormData) =>
      api<Run>("/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_id: well.id,
          curves,
          methods: active,
          threshold: Number(fields.get("threshold")),
          trees: Number(fields.get("trees")),
          contamination: Number(fields.get("contamination")),
        }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["/analysis"] }),
  });
  const toggle = (items: string[], v: string) =>
    items.includes(v) ? items.filter((x) => x !== v) : [...items, v];
  return (
    <>
      <Panel title="Параметры проверки" action={<Source well={well} />}>
        <form
          className="formbody"
          onSubmit={(e) => {
            e.preventDefault();
            run.mutate(new FormData(e.currentTarget));
          }}
        >
          <h3>Каналы · {well.name}</h3>
          <div className="checks">
            {Object.keys(well.units).map((k) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={curves.includes(k)}
                  onChange={() => setCurves(toggle(curves, k))}
                />
                {k}
              </label>
            ))}
          </div>
          <h3>Методы обнаружения</h3>
          <div className="checks">
            {Object.entries(methods).map(([k, v]) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={active.includes(k)}
                  onChange={() => setActive(toggle(active, k))}
                />
                {v}
              </label>
            ))}
          </div>
          <div className="toolbar">
            {[
              ["threshold", "Порог MAD", 4.5, 2, 15, 0.1],
              ["trees", "Число деревьев", 100, 10, 300, 1],
              ["contamination", "Доля аномалий IF", 0.025, 0.001, 0.5, 0.001],
            ].map(([key, label, val, min, max, step]) => (
              <label key={key}>
                {label}{" "}
                <input
                  required
                  name={String(key)}
                  type="number"
                  defaultValue={val}
                  min={min}
                  max={max}
                  step={step}
                />
              </label>
            ))}
          </div>
          <button
            className="primary"
            disabled={!curves.length || !active.length || run.isPending}
          >
            <Play size={15} />
            {run.isPending ? "Идёт расчёт…" : "Запустить и сохранить анализ"}
          </button>
          {run.error && <p role="alert">{run.error.message}</p>}
          {run.isSuccess && (
            <p role="status">
              Анализ сохранён.{" "}
              <Link to={"/reports?run=" + run.data.id}>Открыть отчёт →</Link>
            </p>
          )}
        </form>
      </Panel>
      {latest && result && (
        <Panel
          title="Результаты последнего анализа"
          action={<span>{date(latest.created)}</span>}
        >
          <div className="checks">
            {latest.settings.methods.map((k) => (
              <span className="chip" key={k}>
                {methods[k]} ·{" "}
                {result.findings.filter((f) => f.method === k).length}
              </span>
            ))}
          </div>
          <Findings
            items={result.findings.slice(0, limit)}
            unit={well.depth_unit}
          />
          {limit < result.findings.length && (
            <button onClick={() => setLimit(limit + 100)}>Ещё 100</button>
          )}
          <div className="foot">
            {latest.notes.join(" ")} Статистические отклонения требуют
            инженерной интерпретации.
          </div>
        </Panel>
      )}
    </>
  );
}
interface Report extends Run {
  well: Well;
  result: Result;
  plot: Logs;
  limitation: string;
}
export function Reports({ runs, wells }: { runs: Run[]; wells: Well[] }) {
  const [params, set] = useSearchParams(),
    id = params.get("run") ?? runs[0]?.id;
  const report = useApi<Report>("/reports/" + id, !!id),
    r = report.data;
  return (
    <>
      <Panel title="Сохранённые анализы">
        <History wells={wells} runs={runs} />
      </Panel>
      {id && (
        <Panel
          title="Отчёт по скважине"
          action={
            <select
              aria-label="Выбрать отчёт"
              value={id}
              onChange={(e) => set({ run: e.target.value })}
            >
              {runs.map((a) => (
                <option key={a.id} value={a.id}>
                  {wells.find((w) => w.id === a.dataset_id)?.name} ·{" "}
                  {date(a.created)}
                </option>
              ))}
            </select>
          }
        >
          {report.error && <p role="alert">{report.error.message}</p>}
          {r && (
            <>
              <div className="formbody">
                <h2>
                  {r.well.name} <Source well={r.well} />
                </h2>
                <p>
                  {date(r.created)} · {fmt(r.count)} предупреждений ·{" "}
                  {r.settings.curves.join(", ")}
                </p>
                <p>
                  Порог MAD {r.settings.threshold} · Деревьев {r.settings.trees}{" "}
                  · Доля IF {r.settings.contamination} · Seed 42
                </p>
                <p>
                  {Object.entries(r.versions)
                    .map(([k, v]) => methods[k] + " " + v)
                    .join(" / ")}
                </p>
                <div className="actions">
                  <a
                    className="button"
                    href={"/api/reports/" + id}
                    download={"GeoCheck-" + id + ".json"}
                  >
                    <Download size={14} /> JSON
                  </a>
                  <a
                    className="button"
                    href={"/api/reports/" + id + "/csv"}
                    download
                  >
                    <Download size={14} /> CSV интервалов
                  </a>
                </div>
              </div>
              <div className="scroll">
                <div style={{ minWidth: r.settings.curves.length * 125 }}>
                  <LogPlot
                    data={r.plot}
                    channels={r.settings.curves}
                    unit={r.well.depth_unit}
                    findings={r.result.findings}
                  />
                </div>
              </div>
              <div className="foot">
                {r.limitation} {r.notes.join(" ")}
              </div>
            </>
          )}
        </Panel>
      )}
    </>
  );
}
