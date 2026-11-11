import { useQuery } from "@tanstack/react-query";

export interface Well {
  id: string;
  name: string;
  filename: string;
  source: string;
  format: string;
  created: string;
  depth_unit: string;
  rows: number;
  start: number;
  end: number;
  units: Record<string, string>;
}
export interface Logs {
  depth: number[];
  curves: Record<string, { unit: string; values: (number | null)[] }>;
}
export interface Finding {
  method: string;
  curve: string;
  start: number;
  end: number;
  samples: number;
  reason: string;
  score: number | null;
}
export interface Settings {
  curves: string[];
  methods: string[];
  threshold: number;
  trees: number;
  contamination: number;
}
export interface Run {
  id: string;
  dataset_id: string;
  created: string;
  settings: Settings;
  count: number;
  versions: Record<string, string>;
  notes: string[];
}
export interface Result {
  findings: Finding[];
  scores: (number | null)[];
}
export const methods: Record<string, string> = {
  missing: "Пропуски",
  physical: "Физические ограничения",
  outlier: "Статистические выбросы",
  jump: "Резкие изменения",
  isolation: "Isolation Forest",
};
export const fmt = (v: number) =>
  v.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
export const date = (v: string) =>
  new Date(v).toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  });
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch("/api" + path, init);
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw Error(
      typeof body.detail === "string"
        ? body.detail
        : "Ошибка запроса (" +
            r.status +
            "). Проверьте параметры и доступность API.",
    );
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
export function useApi<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: [path],
    queryFn: () => api<T>(path),
    enabled,
    retry: 1,
  });
}
