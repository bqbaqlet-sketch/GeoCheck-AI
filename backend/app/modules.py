from dataclasses import dataclass
from typing import Callable

from .ml import analyze
from .schemas import Result, Settings


@dataclass(frozen=True)
class Module:
    id: str
    name: str
    description: str
    input_schema: type
    output_schema: type
    compute: Callable


QUALITY = Module("well-log-qc", "Well Log Quality Control", "Контроль качества каротажа", Settings, Result, analyze)
REGISTRY = {QUALITY.id: QUALITY}

