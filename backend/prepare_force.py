"""Extract a single well and selected curves from a user-supplied FORCE CSV."""
import argparse
from pathlib import Path

import pandas as pd


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source", type=Path)
    p.add_argument("well")
    p.add_argument("output", type=Path)
    p.add_argument("--curves", nargs="+", default=["GR", "RHOB", "NPHI"])
    p.add_argument("--depth", default="DEPTH_MD")
    p.add_argument("--sep", default=";")
    args = p.parse_args()
    columns = ["WELL", args.depth, *args.curves]
    chunks = pd.read_csv(args.source, sep=args.sep, usecols=columns, chunksize=50000)
    selected = [chunk.loc[chunk.WELL == args.well, columns[1:]] for chunk in chunks]
    frame = pd.concat(selected).rename(columns={args.depth:"DEPTH"})
    if frame.empty or len(frame) > 50000:
        p.error("Скважина отсутствует или превышает лимит 50 000 строк.")
    frame.to_csv(args.output, index=False, mode="x")


if __name__ == "__main__":
    main()

