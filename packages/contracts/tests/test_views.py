from conftest import CREATOR, SPONSOR


EXPECTED_FIELDS = {
    "id", "sponsor", "creator", "amount", "title", "brief", "rubric",
    "allowed_origin", "creator_handle", "state", "verdict", "created_at",
    "accepted_at", "accept_by", "submit_by", "submitted_at", "published_at",
    "canonical_evidence_url", "evidence_digest", "judgment_attempts",
    "last_judged_at", "verdict_reason", "settled",
}


def test_campaign_views_are_paged_and_address_scoped(chain):
    first = chain.create(value=1_000)
    second = chain.create(value=2_000)
    assert chain.contract.get_campaign_count() == 2
    assert [item["id"] for item in chain.contract.get_sponsor_campaigns(SPONSOR, 0, 1)] == [first]
    assert [item["id"] for item in chain.contract.get_sponsor_campaigns(SPONSOR, 1, 50)] == [second]
    assert [item["id"] for item in chain.contract.get_creator_campaigns(CREATOR, 0, 50)] == [first, second]


def test_campaign_view_shape_is_stable(chain):
    campaign = chain.contract.get_campaign(chain.create())
    assert set(campaign) == EXPECTED_FIELDS


def test_paging_rejects_unbounded_limit(chain):
    chain.create()
    assert len(chain.contract.get_sponsor_campaigns(SPONSOR, 0, 500)) == 1
