"""Configurable Event Format Schema validated with Pydantic v2."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class CriterionConfig(BaseModel):
    name: str
    weight: float = Field(default=1.0, gt=0)
    scale_min: float = 1.0
    scale_max: float = 10.0
    band_anchors: Dict[str, str] = Field(default_factory=lambda: {
        "1": "Needs fundamental improvement",
        "5": "Satisfactory prototype",
        "10": "Exceptional production quality"
    })


class RubricConfig(BaseModel):
    title: str = "Standard Flight Review Rubric"
    criteria: List[CriterionConfig] = Field(default_factory=lambda: [
        CriterionConfig(name="Technical Execution", weight=0.35),
        CriterionConfig(name="Innovation & Vision", weight=0.25),
        CriterionConfig(name="Design & Usability", weight=0.20),
        CriterionConfig(name="Presentation & Polish", weight=0.20),
    ])


class StationConfig(BaseModel):
    id: str
    name: str
    is_multi_scan_allowed: bool = False


class EventFormatConfig(BaseModel):
    """Event Format Configuration Schema for missions."""
    format_type: str = Field(default="offline_24h", description="offline_24h, online_48h, hybrid_rounds")
    min_team_size: int = Field(default=2, ge=1)
    max_team_size: int = Field(default=4, ge=1)
    tracks: List[str] = Field(default_factory=lambda: ["AI & Systems", "Web3 & Security", "Open Innovation"])
    allow_cross_track_judging: bool = False
    blind_judging: bool = True
    min_judges_per_team: int = Field(default=2, ge=1)
    stations: List[StationConfig] = Field(default_factory=lambda: [
        StationConfig(id="entry", name="Main Boarding Gate"),
        StationConfig(id="meals", name="Ration Station / Meals", is_multi_scan_allowed=True),
        StationConfig(id="swag", name="Swag Hangar"),
        StationConfig(id="workshop", name="Workshop Hall"),
        StationConfig(id="final_presentation", name="Launch Deck")
    ])
    rubric: RubricConfig = Field(default_factory=RubricConfig)
    custom_registration_fields: List[Dict[str, Any]] = Field(default_factory=list)
    rounds: List[str] = Field(default_factory=lambda: ["Shortlist", "Finals"])
    late_submission_policy: str = Field(default="grace_window", description="hard_cutoff, grace_window, penalty")
    grace_window_minutes: int = Field(default=15, ge=0)
    retention_days: int = Field(default=90, ge=1)
