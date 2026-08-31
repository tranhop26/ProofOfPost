from __future__ import annotations

import json
from typing import Any, Callable


class u256(int):
    def __new__(cls, value: Any = 0):
        number = int(value)
        if number < 0 or number >= 1 << 256:
            raise OverflowError("u256 range")
        return super().__new__(cls, number)


class Address:
    def __init__(self, value: Any = "0x" + "00" * 20):
        raw = value.as_hex if isinstance(value, Address) else str(value).lower()
        raw = raw.removeprefix("0x")
        if len(raw) != 40 or any(c not in "0123456789abcdef" for c in raw):
            raise ValueError("invalid address")
        self._hex = "0x" + raw

    @property
    def as_hex(self) -> str:
        return self._hex

    def __hash__(self) -> int:
        return hash(self._hex)

    def __eq__(self, other: object) -> bool:
        return isinstance(other, Address) and self._hex == other._hex


class _Storage(dict):
    def __class_getitem__(cls, _item: Any):
        return cls

    def get_or_insert_default(self, key: Any):
        if key not in self:
            self[key] = DynArray()
        return self[key]


class TreeMap(_Storage):
    pass


class DynArray(list):
    def __class_getitem__(cls, _item: Any):
        return cls


def allow_storage(cls):
    return cls


class UserError(Exception):
    pass


class _Vm:
    UserError = UserError


class _Message:
    sender_address = Address()
    value = 0
    contract_address = Address("0x" + "aa" * 20)
    chain_id = u256(61999)


class _Public:
    class _Write:
        def __call__(self, fn):
            fn.__gl_visibility__ = "write"
            return fn

        def payable(self, fn):
            fn.__gl_visibility__ = "write.payable"
            return fn

    write = _Write()

    @staticmethod
    def view(fn):
        fn.__gl_visibility__ = "view"
        return fn


class _TransferTarget:
    def __init__(self, address: Address):
        self.address = address

    def emit_transfer(self, value: Any):
        amount = int(value)
        if amount > runtime.contract_balance:
            raise UserError("insufficient contract balance")
        runtime.contract_balance -= amount
        runtime.transfers.append((self.address.as_hex, amount))


class _Evm:
    @staticmethod
    def contract_interface(_declaration: Any):
        return _TransferTarget


class _Web:
    def render(self, url: str, mode: str = "text") -> str:
        return runtime.web_render(url, mode)


class _Nondet:
    web = _Web()

    @staticmethod
    def exec_prompt(prompt: str) -> str:
        runtime.prompts.append(prompt)
        return runtime.exec_prompt(prompt)


class _Eq:
    @staticmethod
    def prompt_comparative(fn: Callable[[], str], principle: str) -> str:
        runtime.principles.append(principle)
        leader = fn()
        for _ in range(runtime.validator_runs - 1):
            candidate = fn()
            if not runtime.equivalence(leader, candidate):
                raise RuntimeError("validators did not reach equivalence")
        return leader


class _Contract:
    def __new__(cls, *args, **kwargs):
        obj = super().__new__(cls)
        for klass in reversed(cls.__mro__):
            for name, annotation in getattr(klass, "__annotations__", {}).items():
                if annotation in (TreeMap, DynArray):
                    setattr(obj, name, annotation())
        return obj


class _Gl:
    Contract = _Contract
    public = _Public()
    vm = _Vm()
    message = _Message()
    message_raw = {"datetime": "2025-01-01T00:00:00Z", "contract_address": "0x" + "aa" * 20, "chain_id": 61999}
    evm = _Evm()
    nondet = _Nondet()
    eq_principle = _Eq()


gl = _Gl()


class Runtime:
    def reset(self):
        self.contract_balance = 0
        self.transfers = []
        self.prompts = []
        self.principles = []
        self.validator_runs = 1
        self.exec_prompt = lambda _prompt: json.dumps({"outcome": "PASS", "identity": True, "timing": True, "content": True, "disclosure": True, "reason": "matched"})
        self.web_render = lambda url, mode: f"public page at {url}"
        self.equivalence = lambda a, b: a == b


runtime = Runtime()
runtime.reset()
