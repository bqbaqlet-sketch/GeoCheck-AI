"""Fit on a separate clean synthetic well, score only the held-out well."""
import json

import numpy as np
from sklearn.metrics import precision_recall_fscore_support

from app.demo import COLUMNS, synthetic
from app.ml import fit_forest
from app.schemas import Settings


def evaluate():
    train, _ = synthetic(117, False)
    test, labels = synthetic(2026, True)
    model = fit_forest(train[COLUMNS].to_numpy(), Settings(curves=COLUMNS))
    depth = test.iloc[:, 0].to_numpy()
    truth = np.logical_or.reduce([(depth >= x["start"]) & (depth <= x["end"]) for x in labels])
    pred = model.predict(test[COLUMNS].to_numpy()) == -1
    p, r, f, _ = precision_recall_fscore_support(truth, pred, average="binary", zero_division=0)
    return dict(train_seed=117, test_seed=2026, positive_rows=int(truth.sum()), predicted_rows=int(pred.sum()),
                precision=p, recall=r, f1=f)


if __name__ == "__main__":
    print(json.dumps(evaluate(), indent=2))

