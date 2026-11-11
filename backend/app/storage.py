from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import ForeignKey, JSON, LargeBinary, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def uid():
    return uuid4().hex


def now():
    return datetime.now(timezone.utc).isoformat()


class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    source: Mapped[str]
    created: Mapped[str] = mapped_column(default=now)
    original: Mapped[bytes] = mapped_column(LargeBinary, deferred=True)
    data: Mapped[dict] = mapped_column(JSON)


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), index=True)
    created: Mapped[str] = mapped_column(default=now)
    settings: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict] = mapped_column(JSON)


class Marker(Base):
    __tablename__ = "markers"
    id: Mapped[str] = mapped_column(String, primary_key=True)

