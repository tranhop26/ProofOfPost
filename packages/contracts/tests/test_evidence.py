import pytest

from conftest import CREATOR, ORIGIN, STRANGER, Revert


def accepted_campaign(chain):
    campaign_id = chain.create()
    chain.call("accept_campaign", campaign_id, sender=CREATOR)
    return campaign_id


def test_only_creator_can_submit_evidence(chain):
    campaign_id = accepted_campaign(chain)
    with pytest.raises(Revert, match="only creator"):
        chain.call("submit_evidence", campaign_id, f"{ORIGIN}/post", chain.now, sender=STRANGER)


def test_submission_binds_origin_time_and_one_attempt(chain):
    campaign_id = accepted_campaign(chain)
    chain.call("submit_evidence", campaign_id, f"{ORIGIN}/post?id=1", chain.now, sender=CREATOR)
    campaign = chain.contract.get_campaign(campaign_id)
    assert campaign["state"] == "SUBMITTED"
    assert campaign["canonical_evidence_url"] == f"{ORIGIN}/post?id=1"
    assert campaign["evidence_digest"].startswith("sha256:")
    with pytest.raises(Revert, match="ACCEPTED"):
        chain.call("submit_evidence", campaign_id, f"{ORIGIN}/other", chain.now, sender=CREATOR)


@pytest.mark.parametrize(
    ("url", "published_at", "message"),
    [
        ("https://evil.example/post", None, "origin"),
        (f"{ORIGIN}/post#fragment", None, "URL"),
        (f"{ORIGIN}/post", -1, "publication"),
        (f"{ORIGIN}/post", 1, "publication"),
    ],
)
def test_submission_rejects_mismatched_or_stale_evidence(chain, url, published_at, message):
    campaign_id = accepted_campaign(chain)
    if published_at == -1:
        published_at = chain.now - 1
    elif published_at == 1:
        published_at = chain.now + 1
    with pytest.raises(Revert, match=message):
        chain.call("submit_evidence", campaign_id, url, published_at or chain.now, sender=CREATOR)


def test_same_url_has_a_different_replay_digest_per_campaign(chain):
    first = accepted_campaign(chain)
    chain.call("submit_evidence", first, f"{ORIGIN}/post", chain.now, sender=CREATOR)
    second = accepted_campaign(chain)
    chain.call("submit_evidence", second, f"{ORIGIN}/post", chain.now, sender=CREATOR)
    assert chain.contract.get_campaign(first)["evidence_digest"] != chain.contract.get_campaign(second)["evidence_digest"]
