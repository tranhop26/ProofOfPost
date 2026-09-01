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


@pytest.mark.parametrize(
    ("creator", "title", "origin", "accept_offset", "submit_offset", "reason"),
    [
        (int(SPONSOR.as_hex, 16), "Title", "https://creator.example", 10, 20, "sponsor and creator must be different"),
        (CREATOR, "Title", "https://creator.example", 20, 10, "deadlines must be ordered in the future"),
        (CREATOR, "", "https://creator.example", 10, 20, "title length is invalid"),
        (CREATOR, "Title", "http://creator.example", 10, 20, "evidence URL must use HTTPS"),
    ],
)
def test_invalid_payable_creation_is_recorded_and_refunded_without_locking_value(
    chain, creator, title, origin, accept_offset, submit_offset, reason
):
    campaign_id = chain.call(
        "create_campaign",
        creator,
        title,
        "Brief enough",
        "Rubric enough",
        origin,
        "@creator",
        chain.now + accept_offset,
        chain.now + submit_offset,
        value=1_000,
    )

    campaign = chain.contract.get_campaign(campaign_id)
    assert campaign["state"] == "REFUNDED"
    assert campaign["settled"] is True
    assert campaign["verdict"] == "FAIL"
    assert campaign["verdict_reason"] == reason
    assert chain.rt.transfers == [(SPONSOR.as_hex, 1_000)]
    assert chain.rt.contract_balance == 0
    assert chain.contract.get_accounting() == {
        "total_inflows": 1_000,
        "active_escrow": 0,
        "completed_payouts": 0,
        "completed_refunds": 1_000,
    }


def test_integer_calldata_address_is_canonicalized_before_storage(chain):
    campaign_id = chain.call(
        "create_campaign",
        int(CREATOR.as_hex, 16),
        "Title",
        "Brief enough",
        "Rubric enough",
        "https://creator.example",
        "@creator",
        chain.now + 10,
        chain.now + 20,
        value=1_000,
    )

    assert chain.contract.get_campaign(campaign_id)["creator"] == CREATOR.as_hex
