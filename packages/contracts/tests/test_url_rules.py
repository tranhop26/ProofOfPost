import json
from pathlib import Path

import pytest

from proof_of_post import _is_fetchable_evidence_url


VECTORS = json.loads((Path(__file__).parents[2] / "shared" / "evidence-url-vectors.json").read_text())


@pytest.mark.parametrize("vector", VECTORS, ids=lambda item: item["url"])
def test_contract_matches_shared_evidence_url_policy(vector):
    assert _is_fetchable_evidence_url(vector["url"]) is vector["valid"]
