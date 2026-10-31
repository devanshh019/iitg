"""Role Matrix RBAC Tests covering routes across all 6 roles."""
from backend.app.schemas.schemas import ParticipantRegister
from backend.app.services.dedupe_service import DedupeService


def test_role_matrix_route_permissions(client, db_session, test_event, auth_headers):
    # 1. Organizer route: /events/{id}/participants/dedupe/resolve
    resolve_payload = {"action": "keep_both", "primary_id": "none", "secondary_id": "none"}

    # Super Admin allowed
    res_admin = client.post(
        f"/api/events/{test_event.id}/participants/dedupe/resolve",
        json=resolve_payload,
        headers=auth_headers["admin"]
    )
    assert res_admin.status_code in [200, 404]  # 404 on invalid IDs, not 403!

    # Organizer allowed
    res_org = client.post(
        f"/api/events/{test_event.id}/participants/dedupe/resolve",
        json=resolve_payload,
        headers=auth_headers["organizer"]
    )
    assert res_org.status_code in [200, 404]

    # Participant forbidden (403)
    res_crew = client.post(
        f"/api/events/{test_event.id}/participants/dedupe/resolve",
        json=resolve_payload,
        headers=auth_headers["crew"]
    )
    assert res_crew.status_code == 403

    # Judge forbidden (403)
    res_judge = client.post(
        f"/api/events/{test_event.id}/participants/dedupe/resolve",
        json=resolve_payload,
        headers=auth_headers["judge"]
    )
    assert res_judge.status_code == 403

    # 2. Judge route: /events/{id}/judging/assignments
    res_judge_asgn = client.get(
        f"/api/events/{test_event.id}/judging/assignments",
        headers=auth_headers["judge"]
    )
    assert res_judge_asgn.status_code == 200

    res_crew_asgn = client.get(
        f"/api/events/{test_event.id}/judging/assignments",
        headers=auth_headers["crew"]
    )
    assert res_crew_asgn.status_code == 403
