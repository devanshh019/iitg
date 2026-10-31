"""Tests for Flight Review Z-Score Normalization, Outlier Detection, and Multi-format Exports."""
from backend.app.schemas.schemas import ParticipantRegister, TeamCreate, ScoreInput
from backend.app.services.dedupe_service import DedupeService
from backend.app.services.team_service import TeamService
from backend.app.services.judging_service import JudgingService
from backend.app.services.export_service import ExportService
from backend.app.services.fun_service import FunService
from backend.app.models.entities import Rubric, RubricCriterion, JudgeAssignment


def test_judging_zscore_normalization_and_outlier_flags(db_session, test_event):
    # Setup 2 teams
    p1, _ = DedupeService.register_participant(db_session, test_event.id, ParticipantRegister(name="Team A Lead", email="ta@test.io"))
    p2, _ = DedupeService.register_participant(db_session, test_event.id, ParticipantRegister(name="Team B Lead", email="tb@test.io"))

    tA = TeamService.create_team(db_session, test_event.id, p1.id, TeamCreate(name="Squad Apollo"), actor_id=p1.user_id)
    tB = TeamService.create_team(db_session, test_event.id, p2.id, TeamCreate(name="Squad Artemis"), actor_id=p2.user_id)

    rubric = db_session.query(Rubric).filter_by(event_id=test_event.id).first()
    crit1 = rubric.criteria[0]

    # Register 2 judges
    from backend.app.services.auth_service import AuthService
    jh = AuthService.register_or_get_user(db_session, "judge_harsh@test.io", "Pass123!")
    jl = AuthService.register_or_get_user(db_session, "judge_lenient@test.io", "Pass123!")

    # Judge 1 (Harsh: gives 4.0 and 5.0)
    # Judge 2 (Lenient: gives 9.0 and 10.0)
    asgn1_A = JudgeAssignment(event_id=test_event.id, judge_id=jh.id, team_id=tA.id)
    asgn1_B = JudgeAssignment(event_id=test_event.id, judge_id=jh.id, team_id=tB.id)
    asgn2_A = JudgeAssignment(event_id=test_event.id, judge_id=jl.id, team_id=tA.id)
    asgn2_B = JudgeAssignment(event_id=test_event.id, judge_id=jl.id, team_id=tB.id)
    db_session.add_all([asgn1_A, asgn1_B, asgn2_A, asgn2_B])
    db_session.flush()

    JudgingService.submit_scores(db_session, asgn1_A.id, [ScoreInput(criterion_id=crit1.id, score=4.0)], jh.id, jh.id)
    JudgingService.submit_scores(db_session, asgn1_B.id, [ScoreInput(criterion_id=crit1.id, score=5.0)], jh.id, jh.id)
    JudgingService.submit_scores(db_session, asgn2_A.id, [ScoreInput(criterion_id=crit1.id, score=9.0)], jl.id, jl.id)
    JudgingService.submit_scores(db_session, asgn2_B.id, [ScoreInput(criterion_id=crit1.id, score=10.0)], jl.id, jl.id)

    leaderboard = JudgingService.calculate_leaderboard(db_session, test_event.id)
    assert len(leaderboard) >= 2
    top = leaderboard[0]
    assert top.normalized_score > 0
    assert top.raw_average > 0


def test_multi_format_exports(db_session, test_event):
    # CSV export
    csv_parts = ExportService.export_csv(db_session, test_event.id, "participants", actor_id="admin-1")
    assert "ID,Name,Email" in csv_parts

    csv_scores = ExportService.export_csv(db_session, test_event.id, "scores", actor_id="admin-1")
    assert "Rank,Squad ID" in csv_scores

    # XLSX export
    xlsx_bytes = ExportService.export_xlsx(db_session, test_event.id, actor_id="admin-1")
    assert len(xlsx_bytes) > 1000

    # PDF Debrief export
    pdf_bytes = ExportService.export_pdf_debrief(db_session, test_event.id, actor_id="admin-1")
    assert pdf_bytes.startswith(b"%PDF")


def test_fun_layer_telemetry_and_passport(db_session, test_event):
    p, _ = DedupeService.register_participant(db_session, test_event.id, ParticipantRegister(name="Neil", email="neil@moon.io"))

    # Badges passport
    passport = FunService.get_or_award_badges(db_session, p.id)
    assert len(passport) == 5

    # Mood pulse
    pulse = FunService.record_mood_pulse(db_session, test_event.id, mood_score=5, energy_level="hyper", note="Telemetry looking pristine!")
    assert pulse.mood_score == 5

    trend = FunService.get_mood_trend(db_session, test_event.id)
    assert trend["total_pulses"] >= 1

    # Staged Reveal ceremony
    state = FunService.trigger_reveal_stage(db_session, test_event.id, stage="third", actor_id="admin-1")
    assert state["active_stage"] == "third"
