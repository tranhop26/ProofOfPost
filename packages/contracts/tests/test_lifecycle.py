import pytest

from conftest import CREATOR, SPONSOR, STRANGER, Revert


def test_only_bound_creator_can_accept(chain):
    campaign_id = chain.create()
    with pytest.raises(Revert, match="only creator"):
        chain.call("accept_campaign", campaign_id, sender=STRANGER)
    chain.call("accept_campaign", campaign_id, sender=CREATOR)
    assert chain.contract.get_campaign(campaign_id)["state"] == "ACCEPTED"


def test_acceptance_rejects_replay(chain):
    campaign_id = chain.create()
    chain.call("accept_campaign", campaign_id, sender=CREATOR)
    with pytest.raises(Revert, match="OPEN"):
        chain.call("accept_campaign", campaign_id, sender=CREATOR)


def test_unaccepted_campaign_becomes_refundable_only_after_deadline(chain):
    campaign_id = chain.create()
    with pytest.raises(Revert, match="deadline"):
        chain.call("expire_unaccepted", campaign_id, sender=STRANGER)
    chain.advance(101)
    chain.call("expire_unaccepted", campaign_id, sender=STRANGER)
    assert chain.contract.get_campaign(campaign_id)["state"] == "REFUNDABLE"


def test_campaign_rejects_self_dealing_and_bad_deadlines(chain):
    with pytest.raises(Revert, match="different"):
        chain.call("create_campaign", SPONSOR, "Title", "Brief enough", "Rubric enough", "https://creator.example", "@creator", chain.now + 10, chain.now + 20, value=1_000)
    with pytest.raises(Revert, match="deadlines"):
        chain.call("create_campaign", CREATOR, "Title", "Brief enough", "Rubric enough", "https://creator.example", "@creator", chain.now + 20, chain.now + 10, value=1_000)
