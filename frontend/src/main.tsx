import { createRoot } from "react-dom/client";
import { useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Database,
  FileBarChart2,
  FolderOpen,
  HardDrive,
  Layers3,
  LayoutDashboard,
  Menu,
  Monitor,
  PanelLeftClose,
  ScanLine,
  Upload,
} from "lucide-react";
import { fmt, Logs, methods, Result, Run, useApi, Well } from "./api";
import { History, Panel, Source, Stats } from "./components/ui";
import { LogPlot } from "./components/LogPlot";
import { Workspace } from "./pages/Workspace";
import { Quality, Reports, Viewer } from "./pages/Research";
import "./styles.css";

const nav = [
  {
    path: "/",
    name: "Обзор",
    icon: LayoutDashboard,
    desc: "Состояние данных и результаты контроля качества.",
  },
  {
    path: "/data",
    name: "Данные скважин",
    icon: Database,
    desc: "Импорт файлов, метаданные и предпросмотр измерений.",
  },
  {
    path: "/viewer",
    name: "Каротаж",
    icon: Activity,
    desc: "Синхронное исследование кривых по глубине.",
  },
  {
    path: "/quality",
    name: "Контроль качества",
    icon: ScanLine,
    desc: "Параметры алгоритмов и интервалы для экспертной проверки.",
  },
  {
    path: "/reports",
    name: "Отчёты",
    icon: FileBarChart2,
    desc: "Сохранённые результаты, графики и экспорт анализа.",
  },
];
function App() {
  const [mobile, setMobile] = useState(false),
    [chosen, choose] = useState("");
  const location = useLocation(),
    page = nav.find((p) => p.path === location.pathname) ?? nav[0];
  const health = useApi<{ status: string }>("/health"),
    datasets = useApi<Well[]>("/datasets"),
    analyses = useApi<Run[]>("/analysis");
  const wells = datasets.data ?? [],
    runs = analyses.data ?? [],
    well = wells.find((w) => w.id === chosen) ?? wells[0],
    latest = runs.find((r) => r.dataset_id === well?.id);
  const logs = useApi<Logs>("/datasets/" + well?.id + "/curves", !!well),
    result = useApi<Result>("/analysis/" + latest?.id + "/results", !!latest);
  const error = [health, datasets, analyses, logs, result].find(
    (q) => q.isError,
  )?.error;
  const placeholder = (
    <div className="panel empty">
      {error ? (
        "Не удалось получить данные."
      ) : datasets.isLoading || logs.isFetching ? (
        "Загрузка данных…"
      ) : (
        <>
          Загрузите LAS или CSV в разделе{" "}
          <Link to="/data">«Данные скважин»</Link>.
        </>
      )}
    </div>
  );
  const dash = (
    <>
      <Stats wells={wells} runs={runs} />
      {well && logs.data ? (
        <div className="overviewgrid">
          <Panel
            title="Каротажный профиль"
            action={
              <Link className="sq" aria-label="Открыть каротаж" to="/viewer">
                <ArrowUpRight size={17} />
              </Link>
            }
          >
            <div className="wellstrip">
              <b>
                <Layers3 size={15} />
                {well.name}
              </b>
              <span>
                {fmt(well.start)}–{fmt(well.end)} {well.depth_unit || "ед. ?"}
              </span>
              <Source well={well} />
            </div>
            <LogPlot
              data={logs.data}
              channels={Object.keys(well.units).slice(0, 4)}
              unit={well.depth_unit}
            />
            <div className="foot">
              <span className="dot" /> {fmt(well.rows)} отсчётов{" "}
              <span className="separ">/</span> {Object.keys(well.units).length}{" "}
              каналов
            </div>
          </Panel>
          <Panel title="Контроль качества" action={<ScanLine size={17} />}>
            <div className="qcbody">
              <div className="qcnum">{latest?.count ?? "—"}</div>
              <p>{!latest ? "Анализ ещё не запускался" : latest.count ? "интервалов для экспертной проверки" : "предупреждений по выбранным методам"}</p>
              <div className="rule" />
              {Object.entries(methods).map(([k, v], i) => {
                const count =
                  result.data?.findings.filter((f) => f.method === k).length ??
                  0;
                return (
                  <div className="barrow" key={k}>
                    <label>
                      {v}
                      <b>
                        {latest?.settings.methods.includes(k) ? count : "—"}
                      </b>
                    </label>
                    <div className="rail">
                      <i
                        style={{
                          width:
                            (100 * count) / Math.max(1, latest?.count ?? 0) +
                            "%",
                          background: "var(--curve-" + i + ")",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <Link className="button full" to="/quality">
                Открыть анализ <ChevronRight size={15} />
              </Link>
            </div>
          </Panel>
        </div>
      ) : (
        placeholder
      )}
      <Panel
        title="Последние анализы"
        action={
          <Link to="/reports">
            Все отчёты <ArrowUpRight size={14} />
          </Link>
        }
      >
        <History runs={runs.slice(0, 4)} wells={wells} />
      </Panel>
      {wells.length > 0 && (
        <Panel
          title="Скважины"
          action={
            <Link to="/data">
              Каталог <ArrowUpRight size={14} />
            </Link>
          }
        >
          {wells.map((w) => (
            <div className="wellstrip" key={w.id}>
              <b>{w.name}</b>
              <Source well={w} />
              <span>
                {w.format} · {fmt(w.rows)} строк
              </span>
              <Link to="/viewer" onClick={() => choose(w.id)}>
                Открыть каротаж →
              </Link>
            </div>
          ))}
        </Panel>
      )}
    </>
  );
  return (
    <div className={"shell " + (mobile ? "navopen" : "")}>
      <aside>
        <div className="brand">
          <div className="logomark">
            <Layers3 size={27} />
          </div>
          <strong>
            GeoCheck <em>AI</em>
          </strong>
        </div>
        <div className="sidebody">
          <div className="navlabel">Рабочая область</div>
          <nav>
            {nav.map((p) => (
              <NavLink
                key={p.path}
                to={p.path}
                end
                onClick={() => setMobile(false)}
              >
                <p.icon size={18} />
                {p.name}
              </NavLink>
            ))}
          </nav>
          <div className="navlabel second">Текущая скважина</div>
          <div className="sidewell">
            <Layers3 size={17} />
            <select
              aria-label="Текущая скважина"
              value={well?.id ?? ""}
              onChange={(e) => choose(e.target.value)}
            >
              {wells.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
              {!wells.length && <option value="">Нет данных</option>}
            </select>
          </div>
        </div>
        <div className="sidefoot">
          <HardDrive size={17} />
          <div>
            Локальная среда<small>GeoCheck AI · v1.0</small>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <button
            className="mobilebtn"
            aria-label="Навигация"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <PanelLeftClose /> : <Menu />}
          </button>
          <FolderOpen size={15} />
          <span>Рабочая область</span>
          <ChevronRight size={13} />
          <b>{page.name}</b>
          <span className="online">
            <i className={health.data ? "dot" : "offline"} />
            {health.data
              ? "API подключён"
              : health.error
                ? "API недоступен"
                : "Подключение…"}
          </span>
        </header>
        <main>
          <div className="pagehead">
            <div>
              <h1>{page.path === "/" ? "Обзор проекта" : page.name}</h1>
              <p>{page.desc}</p>
            </div>
            {page.path === "/" && (
              <Link to="/data" className="primary">
                <Upload size={16} /> Загрузить данные
              </Link>
            )}
          </div>
          {error && (
            <p role="alert">
              {error.message}{" "}
              <button onClick={() => window.location.reload()}>
                Повторить
              </button>
            </p>
          )}
          <Routes>
            <Route path="/" element={dash} />
            <Route
              path="/data"
              element={
                <Workspace
                  wells={wells}
                  well={well}
                  data={logs.data}
                  select={choose}
                />
              }
            />
            <Route
              path="/viewer"
              element={
                well && logs.data ? (
                  <Viewer
                    key={well.id}
                    well={well}
                    data={logs.data}
                    results={result.data}
                  />
                ) : (
                  placeholder
                )
              }
            />
            <Route
              path="/quality"
              element={
                well ? (
                  <Quality
                    key={well.id}
                    well={well}
                    latest={latest}
                    result={result.data}
                  />
                ) : (
                  placeholder
                )
              }
            />
            <Route
              path="/reports"
              element={<Reports runs={runs} wells={wells} />}
            />
            <Route path="*" element={<Link to="/">Вернуться к обзору</Link>} />
          </Routes>
          <footer>
            <span>
              <Monitor size={13} /> Независимый студенческий прототип
            </span>
            <span>GeoCheck AI / 1.0</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
const client = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>,
);
