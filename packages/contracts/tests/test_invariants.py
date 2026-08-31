import inspect
import random

from conftest import CREATOR, STRANGER


FORBIDDEN_PUBLIC_NAMES = {
    "owner", "upgrade", "set_code", "override_verdict", "emergency_withdraw",
    "withdraw", "set_recipient", "admin_settle",
}


def test_intentionally_frozen_schema_has_no_privileged_escape_hatch(chain):
    public = {
        name
        for name, method in inspect.getmembers(type(chain.contract), inspect.isfunction)
        if hasattr(method, "__gl_visibility__")
    }
    assert public.isdisjoint(FORBIDDEN_PUBLIC_NAMES)


def test_conservation_survives_many_independent_campaign_outcomes(chain):
    rng = random.Random(20260831)
    ids = []
    for _ in range(30):
        campaign_id = chain.create(value=rng.randint(1, 10_000))
        ids.append(campaign_id)
        if rng.choice((True, False)):
            chain.call("accept_campaign", campaign_id, sender=CREATOR)
        else:
            chain.advance(101)
            chain.call("expire_unaccepted", campaign_id, sender=STRANGER)
            chain.call("refund", campaign_id, sender=STRANGER)
    chain.assert_conservation()
    active = sum(int(c.amount) for c in chain.contract.campaigns.values() if not c.settled)
    assert chain.contract.get_accounting()["active_escrow"] == active
