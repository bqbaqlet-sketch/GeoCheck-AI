import json
from pathlib import Path

import numpy as np
import pandas as pd

DEMO_DIR = Path(__file__).resolve().parents[2] / "data" / "demo"
COLUMNS = ["GR [API]", "RHOB [g/cm3]", "NPHI [v/v]", "DT [us/ft]", "RES [ohm.m]"]


def synthetic(seed, corrupt):
    rng = np.random.default_rng(seed)
    depth = 2100 + np.arange(801) * 0.25
    t = depth - 2100
    facies = np.sin(t / 12 + rng.uniform(-1, 1)) + 0.45 * np.sin(t / 3.4) + 0.2 * np.cos(t / 1.3)
    frame = pd.DataFrame({
        "DEPTH [m]": depth,
        COLUMNS[0]: 72 + 21 * facies + rng.normal(0, 3.4, len(t)),
        COLUMNS[1]: 2.48 + 0.09 * facies + rng.normal(0, 0.024, len(t)),
        COLUMNS[2]: 0.24 - 0.045 * facies + rng.normal(0, 0.013, len(t)),
        COLUMNS[3]: 81 - 7.5 * facies + rng.normal(0, 1.6, len(t)),
        COLUMNS[4]: np.exp(2.5 - 0.45 * facies + rng.normal(0, 0.12, len(t))),
    }).round(5)
    labels = []
    if corrupt:
        for a, b, key, value, kind in [(102, 113, 0, np.nan, "missing"), (252, 257, 1, -0.2, "physical"),
                                        (416, 428, 3, 166, "outlier"), (585, 591, 2, 0.58, "jump"),
                                        (701, 711, 4, 59, "outlier")]:
            frame.loc[a:b, COLUMNS[key]] = value
            labels.append(dict(start=float(depth[a]), end=float(depth[b]), curve=COLUMNS[key], kind=kind))
    return frame, labels


if __name__ == "__main__":
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    frame, labels = synthetic(2026, True)
    frame.to_csv(DEMO_DIR / "GeoLab-01.csv", index=False)
    (DEMO_DIR / "labels.json").write_text(json.dumps(labels, indent=2), encoding="utf-8")

