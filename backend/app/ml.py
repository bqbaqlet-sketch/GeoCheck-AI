import numpy as np
import sklearn
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .schemas import Finding, Result, Settings


def robust_flags(values, threshold):
    mask = np.isfinite(values)
    if mask.sum() < 5:
        return np.zeros(len(values), dtype=bool)
    center = np.median(values[mask])
    mad = np.median(np.abs(values[mask] - center))
    return mask & (np.abs(values - center) > threshold * max(1.4826 * mad, 1e-9))


def fit_forest(matrix, settings):
    pipeline = make_pipeline(SimpleImputer(strategy="median", keep_empty_features=True), StandardScaler(),
                             IsolationForest(n_estimators=settings.trees, contamination=settings.contamination,
                                             random_state=42, n_jobs=1))
    return pipeline.fit(matrix)


def analyze(data, settings: Settings) -> Result:
    if len(set(settings.curves)) != len(settings.curves) or set(settings.curves) - data["curves"].keys():
        raise ValueError("Проверьте выбранные каналы.")
    depth = data["depth"]
    matrix = np.array([data["curves"][key]["values"] for key in settings.curves], dtype=float).T
    findings = []
    notes = []
    scores = [None] * len(depth)

    def collect(mask, method, curve, reason, severity=None):
        indices = np.flatnonzero(mask)
        for run in np.split(indices, np.where(np.diff(indices) > 1)[0] + 1):
            if len(run):
                findings.append(Finding(method=method, curve=curve, start=depth[run[0]], end=depth[run[-1]],
                                        samples=len(run), reason=reason,
                                        score=float(severity[run].max()) if severity is not None else None))

    for index, key in enumerate(settings.curves):
        x = matrix[:, index]
        unit = data["curves"][key]["unit"].strip().lower()
        if "missing" in settings.methods:
            collect(np.isnan(x), "missing", key, "Отсутствует числовое измерение.")
        if "physical" in settings.methods:
            if (key, unit) in {("RHOB", "g/cm3"), ("RHOB", "g/cm³"), ("RHOB", "kg/m3"),
                               ("DT", "us/ft"), ("DT", "us/m"), ("RES", "ohm.m"), ("RES", "ohm-m")}:
                collect(x <= 0, "physical", key, f"Измеренная величина должна быть положительной ({unit}).")
            else:
                notes.append(f"{key}: физическое правило для данной пары канала и единиц не задано.")
        if "outlier" in settings.methods:
            collect(robust_flags(x, settings.threshold), "outlier", key, "Отклонение от медианы превышает порог MAD.")
        if "jump" in settings.methods:
            slopes = np.r_[np.nan, np.diff(x) / np.diff(depth)]
            collect(robust_flags(slopes, settings.threshold), "jump", key, "Необычная скорость изменения по глубине.")
    versions = {m: "1.0" for m in settings.methods}
    if "isolation" in settings.methods:
        versions["isolation"] = f"GeoCheck IF 1.0 / scikit-learn {sklearn.__version__}"
        usable = np.isfinite(matrix).any(axis=1)
        if usable.sum() < 8:
            notes.append("Isolation Forest пропущен: требуется минимум 8 строк с измерениями.")
        else:
            fitted = fit_forest(matrix[usable], settings)
            severity = np.full(len(depth), np.nan)
            severity[usable] = -fitted.score_samples(matrix[usable])
            flags = np.zeros(len(depth), dtype=bool)
            flags[usable] = fitted.predict(matrix[usable]) == -1
            scores = [float(v) if np.isfinite(v) else None for v in severity]
            collect(flags, "isolation", " + ".join(settings.curves), "Редкая комбинация выбранных признаков.", severity)
    return Result(findings=sorted(findings, key=lambda f: (f.start, f.method)), scores=scores,
                  versions=versions, notes=notes)

