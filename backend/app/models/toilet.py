from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Toilet(Base):
    __tablename__ = "toilet"

    __table_args__ = (
        UniqueConstraint(
            "source_system",
            "source_id",
            name="uq_toilet_source",
        ),
    )

    toilet_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    source_system: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    source_id: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    local_government_code: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    toilet_type: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    legal_basis: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        index=True,
    )
    road_address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    lot_address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    geocoding_status: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    management_agency: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    phone: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    opening_type: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    opening_hours_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    ownership_type: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    waste_disposal_type: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    installed_year_month: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    remodeled_year_month: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    data_reference_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )
    source_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("1"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    fixture: Mapped[ToiletFixture | None] = relationship(
        "ToiletFixture",
        back_populates="toilet",
        uselist=False,
        cascade="all, delete-orphan",
    )
    facility: Mapped[ToiletFacility | None] = relationship(
        "ToiletFacility",
        back_populates="toilet",
        uselist=False,
        cascade="all, delete-orphan",
    )
    operating_hours: Mapped[list[ToiletOperatingHour]] = relationship(
        "ToiletOperatingHour",
        back_populates="toilet",
        cascade="all, delete-orphan",
    )

    # 다음 단계에서 community.py의 모델과 연결된다.
    reviews: Mapped[list[ToiletReview]] = relationship(
        "ToiletReview",
        back_populates="toilet",
        cascade="all, delete-orphan",
    )
    posts: Mapped[list[Post]] = relationship(
        "Post",
        back_populates="toilet",
        cascade="all, delete-orphan",
    )


class ToiletFixture(Base):
    __tablename__ = "toilet_fixture"

    toilet_id: Mapped[int] = mapped_column(
        ForeignKey("toilet.toilet_id", ondelete="CASCADE"),
        primary_key=True,
    )

    male_toilet_count: Mapped[int | None] = mapped_column(Integer)
    male_urinal_count: Mapped[int | None] = mapped_column(Integer)
    male_disabled_toilet_count: Mapped[int | None] = mapped_column(Integer)
    male_disabled_urinal_count: Mapped[int | None] = mapped_column(Integer)
    male_child_toilet_count: Mapped[int | None] = mapped_column(Integer)
    male_child_urinal_count: Mapped[int | None] = mapped_column(Integer)
    female_toilet_count: Mapped[int | None] = mapped_column(Integer)
    female_disabled_toilet_count: Mapped[int | None] = mapped_column(Integer)
    female_child_toilet_count: Mapped[int | None] = mapped_column(Integer)

    toilet: Mapped[Toilet] = relationship(
        "Toilet",
        back_populates="fixture",
    )


class ToiletFacility(Base):
    __tablename__ = "toilet_facility"

    toilet_id: Mapped[int] = mapped_column(
        ForeignKey("toilet.toilet_id", ondelete="CASCADE"),
        primary_key=True,
    )

    is_safety_facility_target: Mapped[bool | None] = mapped_column(Boolean)
    has_emergency_bell: Mapped[bool | None] = mapped_column(Boolean)
    emergency_bell_location: Mapped[str | None] = mapped_column(Text)
    has_entrance_cctv: Mapped[bool | None] = mapped_column(Boolean)
    has_diaper_changing_table: Mapped[bool | None] = mapped_column(Boolean)
    diaper_changing_table_location: Mapped[str | None] = mapped_column(Text)

    toilet: Mapped[Toilet] = relationship(
        "Toilet",
        back_populates="facility",
    )


class ToiletOperatingHour(Base):
    __tablename__ = "toilet_operating_hour"

    __table_args__ = (
        UniqueConstraint(
            "toilet_id",
            "weekday",
            name="uq_toilet_operating_hour_weekday",
        ),
    )

    operating_hour_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    toilet_id: Mapped[int] = mapped_column(
        ForeignKey("toilet.toilet_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    weekday: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    open_time: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    close_time: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    is_24_hours: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("0"),
    )
    is_closed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("0"),
    )

    toilet: Mapped[Toilet] = relationship(
        "Toilet",
        back_populates="operating_hours",
    )