import io

import lasio
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.demo import DEMO_DIR
from app.ingest import parse_file, MAX_BYTES
from app.main import create_app
from app.ml import analyze
from app.schemas import Settings
from evaluate import evaluate


@pytest.mark.parametrize("raw", [b"X,GR\n1,2\n2,3", b"MD,GR\n1,2\n1,3", b"MD,GR\n1,2\n2,bad",
                                 b"MD,GR\ninf,2\n2,3", b"MD,GR\n1,2"])
def test_format_errors(raw):
    with pytest.raises(ValueError):
        parse_file(raw, "test.csv")


def test_las():
    las = lasio.LASFile()
    las.well.WELL.value = "TEST-WELL"
    las.append_curve("DEPT", [10, 11, 12], unit="FT")
    las.append_curve("GR", [12., np.nan, 11.], unit="API")
    buf = io.StringIO()
    las.write(buf, version=2)
    data = parse_file(buf.getvalue().encode(), "logs.las")
    assert data["name"] == "TEST-WELL"
    assert data["depth_unit"] == "FT"
    assert data["curves"]["GR"]["values"] == [12, None, 11]


def test_unknown_units_missing_and_sparse():
    raw = b"DEPTH;RHOB;DT [us/ft]\n3;-1;100\n2;;0\n1;;99"
    data = parse_file(raw, "../outside.csv")
    assert data["filename"] == "outside.csv"
    assert data["depth"] == [1, 2, 3]
    result = analyze(data, Settings(curves=["RHOB", "DT"]))
    assert [(f.method, f.curve, f.samples) for f in result.findings] == [("missing","RHOB",2),("physical","DT",1)]
    assert all(s is None for s in result.scores)


def test_full_api_and_persistence(tmp_path):
    app = create_app(tmp_path, seed=False)
    raw = (DEMO_DIR / "GeoLab-01.csv").read_bytes().replace(b"2100.0,", b"2099.9,", 1)
    with TestClient(app) as c:
        assert c.get("/api/health").json()["status"] == "ok"
        response = c.post("/api/datasets/upload", files={"file": ("../field.csv", raw)})
        assert response.status_code == 201, response.text
        well = response.json()
        path = "/api/datasets/" + well["id"]
        assert c.get(path).json()["source"] == "upload"
        assert c.get(path+"/original").content == raw
        assert c.get(path+"/curves").json()["depth"][0] == 2099.9
        req = {"dataset_id":well["id"], "curves":list(well["units"])}
        assert c.post("/api/analysis/run",json={**req,"curves":["BAD"]}).status_code == 422
        a = c.post("/api/analysis/run",json=req)
        assert a.status_code == 201, a.text
        id = a.json()["id"]
        results = c.get("/api/analysis/"+id+"/results").json()
        assert len(results["scores"]) == well["rows"]
        assert {f["method"] for f in results["findings"]} == {"missing","physical","outlier","jump","isolation"}
        assert c.get("/api/reports/"+id).json()["count"] == len(results["findings"])
        assert c.get("/api/reports/"+id+"/csv").headers["content-type"].startswith("text/csv")
        assert c.get("/api/reports/"+id+"/csv").text.count("\n") == a.json()["count"]+1
    with TestClient(create_app(tmp_path, seed=False)) as c:
        assert c.get("/api/analysis/"+id).json()["id"] == id
        assert c.get(path+"/original").content == raw
        assert c.delete(path).status_code == 204
        assert c.get(path).status_code == 404
        assert c.get("/api/analysis/"+id).status_code == 404


def test_invalid_uploads(tmp_path):
    with TestClient(create_app(tmp_path,seed=False)) as c:
        assert c.post("/api/datasets/upload", files={"file":("x.csv",b"x"*(MAX_BYTES+1))}).status_code == 413
        assert c.post("/api/datasets/upload", files={"file":("x.exe",b"bad")}).status_code == 422
        assert c.get("/api/datasets").json() == []


def test_demo_not_restored_after_deletion(tmp_path):
    for iteration in range(2):
        with TestClient(create_app(tmp_path)) as c:
            wells = c.get("/api/datasets").json()
            if iteration == 0:
                assert len(wells) == 1 and wells[0]["source"] == "synthetic"
                assert c.delete("/api/datasets/"+wells[0]["id"]).status_code == 204
            else:
                assert wells == []


def test_holdout():
    metrics = evaluate()
    assert metrics["test_seed"] != metrics["train_seed"]
    assert metrics["positive_rows"] == 49
    assert 0 < metrics["f1"] <= 1

