from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Method = Literal["missing", "physical", "outlier", "jump", "isolation"]
METHODS = ["missing", "physical", "outlier", "jump", "isolation"]


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    curves: list[str] = Field(min_length=1, max_length=32)
    methods: list[Method] = Field(default_factory=lambda: METHODS.copy(), min_length=1)
    contamination: float = Field(default=0.025, gt=0, le=0.5)
    trees: int = Field(default=100, ge=10, le=300)
    threshold: float = Field(default=4.5, ge=2, le=15)


class RunRequest(Settings):
    dataset_id: str


class Finding(BaseModel):
    method: Method
    curve: str
    start: float
    end: float
    samples: int
    reason: str
    score: float | None = None


class Result(BaseModel):
    findings: list[Finding]
    scores: list[float | None]
    versions: dict[str, str]
    notes: list[str]

