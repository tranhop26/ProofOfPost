from __future__ import annotations

import datetime
import importlib
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE / "_stubs"))
sys.path.insert(0, str(HERE.parent))

import genlayer as glstub  # noqa: E402

proof_of_post = importlib.import_module("proof_of_post")

SPONSOR = glstub.Address("0x" + "11" * 20)
CREATOR = glstub.Address("0x" + "22" * 20)
STRANGER = glstub.Address("0x" + "33" * 20)
ORIGIN = "https://creator.example"
BRIEF = "Publish a public launch post naming Orbit Desk before the deadline."
RUBRIC = "The post must name Orbit Desk and clearly disclose that it is sponsored."


class Revert(Exception):
    pass


class Chain:
    def __init__(self):
        self.rt = glstub.runtime
        self.rt.reset()
        self.now = 1_735_689_600
        self._sync_time()
        self.contract = proof_of_post.ProofOfPost()

    def _sync_time(self):
        stamp = datetime.datetime.fromtimestamp(self.now, datetime.timezone.utc)
        glstub.gl.message_raw["datetime"] = stamp.isoformat().replace("+00:00", "Z")

    def advance(self, seconds: int):
        self.now += seconds
        self._sync_time()

    def call(self, method: str, *args, sender=SPONSOR, value=0):
        glstub.gl.message.sender_address = sender
        glstub.gl.message.value = value
        self.rt.contract_balance += value
        try:
            result = getattr(self.contract, method)(*args)
        except glstub.UserError as error:
            raise Revert(str(error)) from None
        self.assert_conservation()
        return result

    def create(self, value=1_000):
        return int(self.call("create_campaign", CREATOR, "Orbit Desk launch", BRIEF, RUBRIC, ORIGIN, "@creator", self.now + 100, self.now + 200, value=value))

    def assert_conservation(self):
        if not hasattr(self.contract, "get_accounting"):
            return
        accounting = self.contract.get_accounting()
        assert accounting["total_inflows"] == accounting["active_escrow"] + accounting["completed_payouts"] + accounting["completed_refunds"]


@pytest.fixture
def chain():
    return Chain()
