import { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js-cartesian-dist-min";
import { Finding, Logs } from "../api";
const emptyFindings: Finding[] = [];
export function LogPlot({
  data,
  channels,
  unit,
  findings = emptyFindings,
  range,
  large = false,
}: {
  data: Logs;
  channels: string[];
  unit: string;
  findings?: Finding[];
  range?: number[];
  large?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = ref.current;
    if (!el || !channels.length) return;
    const style = getComputedStyle(el);
    const n = channels.length;
    const gutter = 0.04 / n;
    const axes: Record<string, object> = {};
    const traces = channels.map((key, i) => {
      const channel = data.curves[key],
        suffix = i ? String(i + 1) : "",
        color = style.getPropertyValue("--curve-" + (i % 5)).trim();
      axes["xaxis" + suffix] = {
        domain: [i / n + gutter, (i + 1) / n - gutter],
        side: "top",
        nticks: 4,
        tickfont: { size: 9 },
        gridcolor: "#dce6e7",
        zeroline: false,
        showline: true,
        linecolor: "#cfdadd",
        fixedrange: true,
      };
      return {
        x: channel.values,
        y: data.depth,
        xaxis: "x" + suffix,
        type: "scatter",
        mode: "lines",
        line: { color, width: 1.25 },
        name: key,
        hovertemplate:
          key +
          " %{x:.3f} " +
          channel.unit +
          "<br>%{y} " +
          unit +
          "<extra></extra>",
      };
    });
    const visibleFindings = range
      ? findings.filter((f) => f.end >= range[0] && f.start <= range[1])
      : findings;
    const shapes = visibleFindings
      .slice(0, 2000)
      .flatMap((f) =>
        channels.flatMap((c, i) =>
          f.curve.split(" + ").includes(c)
            ? [
                {
                  type: "rect",
                  xref: "paper",
                  yref: "y",
                  x0: i / n + gutter,
                  x1: (i + 1) / n - gutter,
                  y0: f.start,
                  y1: Math.max(
                    f.end,
                    f.start + (data.depth.at(-1)! - data.depth[0]) / 500,
                  ),
                  line: { width: 0 },
                  fillcolor: "rgba(208,142,59,.18)",
                  layer: "below",
                },
              ]
            : [],
        ),
      );
    Plotly.react(
      el,
      traces,
      {
        ...axes,
        margin: { l: 60, r: 12, t: 25, b: 15 },
        height: large ? 510 : 315,
        showlegend: false,
        dragmode: "zoom",
        hovermode: "closest",
        font: { family: "Consolas, monospace", size: 10, color: "#576e74" },
        plot_bgcolor: "#fbfcfc",
        paper_bgcolor: "#ffffff",
        yaxis: {
          range: range
            ? [range[1], range[0]]
            : [data.depth.at(-1), data.depth[0]],
          title: {
            text: unit ? "Глубина, " + unit : "Глубина",
            font: { size: 10 },
          },
          gridcolor: "#dce6e7",
          zeroline: false,
        },
        shapes,
      },
      {
        responsive: true,
        displaylogo: false,
        displayModeBar: large,
        scrollZoom: large,
        modeBarButtonsToRemove: ["select2d", "lasso2d"],
      },
    ).catch((e) => setError(String(e)));
    const observe = new ResizeObserver(() => {
      if (el.isConnected) void Plotly.Plots.resize(el).catch(() => {});
    });
    observe.observe(el);
    return () => {
      observe.disconnect();
      Plotly.purge(el);
    };
  }, [data, channels.join("|"), unit, findings, range?.join("|"), large]);
  if (!channels.length)
    return <p className="empty">Выберите хотя бы один канал.</p>;
  return (
    <>
      <div
        className="tracknames"
        style={{
          gridTemplateColumns:
            "repeat(" + channels.length + ", minmax(70px,1fr))",
        }}
      >
        {channels.map((k, i) => (
          <span key={k} style={{ color: "var(--curve-" + (i % 5) + ")" }}>
            <i />
            {k} <small>{data.curves[k].unit || "ед. ?"}</small>
          </span>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {findings.length > 2000 && <p className="foot">Подсветка ограничена первыми 2 000 интервалами в выбранном диапазоне. Полный список доступен в отчёте JSON.</p>}
      <div ref={ref} />
    </>
  );
}
