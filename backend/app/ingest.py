import csv
import io
import re
from pathlib import PurePath

import lasio
import numpy as np
import pandas as pd

MAX_BYTES = 10 * 1024 * 1024
MAX_ROWS = 50_000
DEPTH = {"DEPTH", "DEPT", "MD", "ГЛУБИНА"}


def parse_file(raw: bytes, filename: str):
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError("Допускаются непустые файлы до 10 МиБ.")
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        content = raw.decode("cp1251")
    name = re.split(r"[/\\]", filename)[-1]
    name = re.sub(r"[^\w. ()-]", "_", name)[:150]
    suffix = PurePath(name).suffix.lower()
    well = PurePath(name).stem
    if suffix == ".las":
        las = lasio.read(io.StringIO(content), ignore_header_errors=False)
        headers = [(str(c.mnemonic).upper(), str(c.unit)) for c in las.curves]
        frame = pd.DataFrame(las.data)
        well = str(las.well.WELL.value or well) if "WELL" in las.well else well
        depth_index = 0
        if not headers or headers[0][0] not in DEPTH:
            raise ValueError("Первый канал LAS должен представлять измеренную глубину (DEPT, DEPTH или MD).")
    elif suffix == ".csv":
        sep = max([",", ";", "\t"], key=content.splitlines()[0].count)
        raw_headers = next(csv.reader(io.StringIO(content), delimiter=sep))
        frame = pd.read_csv(io.StringIO(content), sep=sep, nrows=MAX_ROWS + 1, decimal="," if sep == ";" else ".")
        headers = []
        for col in raw_headers:
            match = re.fullmatch(r"\s*([^\[(]+?)\s*(?:[\[(]([^\])]+)[\])])?\s*", str(col))
            if not match:
                raise ValueError(f"Неверный заголовок: {col}")
            headers.append((match[1].strip().upper(), (match[2] or "").strip()))
        depth_index = next((i for i, (n, _) in enumerate(headers) if n in DEPTH), -1)
        if depth_index < 0:
            raise ValueError("Укажите колонку глубины DEPTH, DEPT или MD.")
    else:
        raise ValueError("Поддерживаются форматы LAS и CSV.")
    if len(frame) < 2 or len(frame) > MAX_ROWS or not 2 <= len(headers) <= 65:
        raise ValueError("Требуются 2–50 000 строк и 1–64 канала.")
    names = [n for n, _ in headers]
    if len(set(names)) != len(names):
        raise ValueError("Имена каналов должны быть уникальными.")
    frame.columns = names
    depth_key, depth_unit = headers[depth_index]
    depth = pd.to_numeric(frame.pop(depth_key), errors="coerce")
    if not np.isfinite(depth).all() or depth.duplicated().any():
        raise ValueError("Глубина должна содержать уникальные конечные числа.")
    order = np.argsort(depth.to_numpy())
    curves = {}
    for key, unit in headers:
        if key == depth_key:
            continue
        series = pd.to_numeric(frame[key], errors="coerce")
        if (frame[key].notna() & series.isna()).any():
            if series.notna().any():
                raise ValueError(f"Нечисловые измерения в канале {key}.")
            continue
        if np.isinf(series).any():
            raise ValueError(f"Бесконечные значения в канале {key}.")
        curves[key] = {"unit": unit, "values": [None if pd.isna(v) else float(v) for v in series.iloc[order]]}
    if not curves:
        raise ValueError("Нет числовых каналов.")
    return {"name": well, "filename": name, "format": suffix[1:].upper(), "depth_unit": depth_unit,
            "depth": depth.iloc[order].tolist(), "curves": curves}

