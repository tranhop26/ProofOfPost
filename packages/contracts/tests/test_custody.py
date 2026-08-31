import pytest

from conftest import CREATOR, SPONSOR, STRANGER, Revert


def test_creation_requires_positive_escrow(chain):
    with pytest.raises(Revert, match="escrow"):
        chain.create(value=0)


def test_refund_goes_to_stored_sponsor_and_cannot_repeat(chain):
    campaign_id = chain.create()
    chain.advance(101)
    chain.call("expire_unaccepted", campaign_id, sender=STRANGER)
    chain.call("refund", campaign_id, sender=STRANGER)
    assert chain.rt.transfers == [(SPONSOR.as_hex, 1_000)]
    assert chain.contract.get_campaign(campaign_id)["state"] == "REFUNDED"
    with pytest.raises(Revert, match="refundable"):
        chain.call("refund", campaign_id, sender=STRANGER)


def test_passing_campaign_pays_creator_once(chain):
    campaign_id = chain.create()
    campaign = chain.contract.campaigns[campaign_id]
    campaign.state = "PASSED"
    campaign.verdict = "PASS"
    chain.call("settle", campaign_id, sender=STRANGER)
    assert chain.rt.transfers == [(CREATOR.as_hex, 1_000)]
    with pytest.raises(Revert, match="PASSED"):
        chain.call("settle", campaign_id, sender=STRANGER)
