"""AI budgets (``mythos_v2.budget``), Signal+ verification (``mythos_v2.billing``) and the ``/plan`` routes —
memory store, fake Play API, fake LLM; no network."""

from __future__ import annotations

import unittest
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient
from test_v2_api import FakeDeleter, FakeVerifier, bearer

from mythos_v2.api import V2Settings, create_v2_router
from mythos_v2.auth import AuthConfig, Identity, player_id_for_uid
from mythos_v2.billing import (
    BillingConfig,
    BillingError,
    Entitlement,
    GooglePlayVerifier,
    Plans,
    PlayPurchase,
    parse_subscription,
)
from mythos_v2.budget import MICRO, Budget, BudgetConfig, micro_usd, month_key
from mythos_v2.llm import Usage, set_last_usage
from mythos_v2.store import MemoryV2Store

NOW = datetime(2026, 10, 18, 3, 0, tzinfo=UTC)  # 12:00 KST
PRICE = (1.0, 4.0)  # USD per million tokens → 1 prompt token = 1 µ$, 1 output token = 4 µ$


class _Clock:
    def __init__(self) -> None:
        self.t = 0.0

    def __call__(self) -> float:
        return self.t


def _budget(
    store: MemoryV2Store, *, free: float = 0.01, plus: float = 0.05, daily_usd: float = 0.0
) -> tuple[Budget, _Clock]:
    clock = _Clock()
    cfg = BudgetConfig(free_usd=free, plus_usd=plus, daily_usd=daily_usd, price=PRICE)
    return Budget(cfg, lambda: store, now=lambda: NOW, monotonic=clock), clock


class BudgetTest(unittest.TestCase):
    def test_cost_is_tokens_times_price_rounded_up(self) -> None:
        self.assertEqual(micro_usd(Usage(100, 10), PRICE), 140)
        self.assertEqual(micro_usd(Usage(1, 0), (0.3, 0.0)), 1)
        self.assertEqual(micro_usd(None, PRICE), 0)
        self.assertEqual(month_key(date(2026, 10, 18)), date(2026, 10, 1))

    def test_free_player_stops_at_the_free_budget_plus_goes_on(self) -> None:
        store = MemoryV2Store()
        budget, _ = _budget(store)
        self.assertIsNone(budget.refusal("p1", "free"))
        budget.charge("p1", Usage(6_000, 1_000))  # 10_000 µ$ = $0.01
        self.assertEqual(budget.refusal("p1", "free"), "budget")
        self.assertIsNone(budget.refusal("p1", "plus"))
        self.assertEqual(store.gm_spend("p1", date(2026, 10, 1)), 10_000)
        self.assertIsNone(budget.refusal("p2", "free"))

    def test_spend_from_another_instance_is_seen_after_the_cache_expires(self) -> None:
        store = MemoryV2Store()
        budget, clock = _budget(store)
        self.assertIsNone(budget.refusal("p1", "free"))
        store.add_gm_spend("p1", date(2026, 10, 1), 20_000)  # another Cloud Run instance
        self.assertIsNone(budget.refusal("p1", "free"))
        clock.t += 61
        self.assertEqual(budget.refusal("p1", "free"), "budget")

    def test_global_ceiling_stops_free_first(self) -> None:
        store = MemoryV2Store()
        budget, _ = _budget(store, free=1.0, plus=1.0, daily_usd=0.01)
        today = date(2026, 10, 18)
        store.record_gm_usage(today, "talk", "llm", 7_500, 0)  # $0.0075 = 75 % of the ceiling
        store.record_gm_usage(today - timedelta(days=1), "talk", "llm", 99_999, 0)  # yesterday
        self.assertEqual(budget.refusal("p1", "free"), "ceiling")
        self.assertIsNone(budget.refusal("p1", "plus"))
        budget.charge("p1", Usage(2_500, 0))
        self.assertEqual(budget.refusal("p1", "plus"), "ceiling")

    def test_a_failing_store_never_blocks_the_ai(self) -> None:
        class Broken(MemoryV2Store):
            def gm_spend(self, player_id: str, month: date) -> int:
                raise RuntimeError("db down")

        budget, _ = _budget(Broken())
        self.assertIsNone(budget.refusal("p1", "free"))
        self.assertEqual(budget.status("p1", "free")["usedUsd"], 0.0)

    def test_status_reports_the_meter(self) -> None:
        store = MemoryV2Store()
        budget, _ = _budget(store)
        budget.charge("p1", Usage(2_500, 0))
        self.assertEqual(
            budget.status("p1", "free"), {"limitUsd": 0.01, "usedUsd": 0.0025, "left": 0.75}
        )


def _sub(
    state: str = "SUBSCRIPTION_STATE_ACTIVE",
    *,
    account: str = "g_" + "a" * 32,
    expiry: str = "2026-11-18T03:00:00Z",
    acknowledged: bool = False,
    product: str = "signal_plus_monthly",
) -> dict[str, Any]:
    return {
        "subscriptionState": state,
        "lineItems": [{"productId": product, "expiryTime": expiry}],
        "externalAccountIdentifiers": {"obfuscatedExternalAccountId": account},
        "acknowledgementState": "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED"
        if acknowledged
        else "ACKNOWLEDGEMENT_STATE_PENDING",
    }


class FakePlayAPI:
    """Stands in for androidpublisher: ``subs[token]`` is the resource, ``status`` overrides the HTTP code."""

    def __init__(self) -> None:
        self.subs: dict[str, dict[str, Any]] = {}
        self.status: int | None = None
        self.calls: list[tuple[str, str]] = []

    def __call__(self, method: str, url: str, token: str) -> tuple[int, dict[str, Any] | None]:
        self.calls.append((method, url))
        if self.status is not None:
            return self.status, None
        if method == "POST":
            return 200, {}
        sub = self.subs.get(url.rsplit("/", 1)[-1])
        return (200, sub) if sub is not None else (404, None)


def _verifier(api: FakePlayAPI) -> GooglePlayVerifier:
    return GooglePlayVerifier(
        "com.projectmythos.signalrun",
        ("signal_plus_monthly",),
        access_token=lambda: "at",
        request=api,
    )


class BillingTest(unittest.TestCase):
    def test_parse_maps_state_expiry_and_account(self) -> None:
        got = parse_subscription(_sub(acknowledged=True), ("signal_plus_monthly",))
        self.assertEqual(
            got,
            PlayPurchase(
                "signal_plus_monthly",
                "active",
                datetime(2026, 11, 18, 3, 0, tzinfo=UTC),
                "g_" + "a" * 32,
                True,
            ),
        )
        with self.assertRaises(BillingError):
            parse_subscription(_sub(product="other"), ("signal_plus_monthly",))

    def test_http_errors_become_reasons(self) -> None:
        api = FakePlayAPI()
        verifier = _verifier(api)
        with self.assertRaisesRegex(BillingError, "invalid token"):
            verifier.verify("nope")
        api.status = 403
        with self.assertRaisesRegex(BillingError, "no play access"):
            verifier.verify("x")

    def _plans(self, api: FakePlayAPI, store: MemoryV2Store, now: datetime = NOW) -> Plans:
        return Plans(BillingConfig(), lambda: store, _verifier(api), now=lambda: now)

    def test_redeem_checks_the_account_acknowledges_and_stores(self) -> None:
        api = FakePlayAPI()
        store = MemoryV2Store()
        me = "g_" + "a" * 32
        api.subs["tok-1"] = _sub(account=me)
        plans = self._plans(api, store)
        self.assertEqual(plans.tier(me), "free")
        with self.assertRaisesRegex(BillingError, "account mismatch"):
            plans.redeem("g_" + "b" * 32, "tok-1")
        ent = plans.redeem(me, "tok-1")
        self.assertEqual(ent.state, "active")
        self.assertEqual(plans.tier(me), "plus")
        self.assertEqual(api.calls[-1][0], "POST")
        self.assertIn(":acknowledge", api.calls[-1][1])

    def test_an_expired_row_is_rechecked_with_google(self) -> None:
        api = FakePlayAPI()
        store = MemoryV2Store()
        me = "g_" + "a" * 32
        store.put_entitlement(
            me, Entitlement("signal_plus_monthly", "active", NOW - timedelta(hours=1), "tok-1", NOW)
        )
        api.subs["tok-1"] = _sub(account=me, expiry="2026-12-18T03:00:00Z", acknowledged=True)
        plans = self._plans(api, store)
        self.assertEqual(plans.tier(me), "free")
        ent = plans.entitlement(me, refresh=True)
        assert ent is not None
        self.assertEqual(ent.expires_at, datetime(2026, 12, 18, 3, 0, tzinfo=UTC))
        self.assertEqual(plans.tier(me), "plus")
        # canceled with paid time left keeps Signal+ until expiry
        api.subs["tok-2"] = _sub("SUBSCRIPTION_STATE_CANCELED", account=me, acknowledged=True)
        plans.redeem(me, "tok-2")
        self.assertEqual(plans.tier(me), "plus")
        api.subs["tok-3"] = _sub("SUBSCRIPTION_STATE_EXPIRED", account=me, acknowledged=True)
        plans.redeem(me, "tok-3")
        self.assertEqual(plans.tier(me), "free")

    def test_operator_grant(self) -> None:
        plans = Plans(
            BillingConfig(grants=frozenset({"g_tester"})),
            MemoryV2Store,
            _verifier(FakePlayAPI()),
            now=lambda: NOW,
        )
        self.assertEqual(plans.tier("g_tester"), "plus")


class _UsageLLM:
    """A fake model that reports billed tokens like the real backends do."""

    name = "fake"

    def __init__(self, reply: str, prompt: int, output: int) -> None:
        self.reply = reply
        self.prompt = prompt
        self.output = output
        self.calls = 0

    def complete(self, system: str, user: str, **_: Any) -> str:
        self.calls += 1
        set_last_usage(self.prompt, self.output)
        return self.reply


def _client(
    llm: _UsageLLM, api: FakePlayAPI, *, free: float = 0.01, plus: float = 0.05
) -> TestClient:
    app = FastAPI()
    app.include_router(
        create_v2_router(
            store_factory=MemoryV2Store,
            llm_factory=lambda: llm,
            settings=V2Settings(),
            auth=AuthConfig(mode="google", project_id="demo-mythos", web_config=None),
            verifier=FakeVerifier(),
            account_deleter=FakeDeleter(),
            now=lambda: NOW,
            budget_config=BudgetConfig(free_usd=free, plus_usd=plus, daily_usd=0, price=PRICE),
            billing_config=BillingConfig(),
            purchase_verifier=_verifier(api),
        )
    )
    return TestClient(app)


IX_BODY = {"mode": "ix", "lang": "ko", "trigger": "elite_start", "context": {}}


class PlanRoutesTest(unittest.TestCase):
    def test_free_budget_runs_out_then_authored_lines_and_signal_plus_raises_it(self) -> None:
        llm = _UsageLLM("기록을 갱신했습니다.", 3_000, 500)  # 5_000 µ$ per call
        api = FakePlayAPI()
        client = _client(llm, api)
        me = player_id_for_uid("u1")
        plan = client.get("/api/v2/plan", headers=bearer("u1")).json()
        self.assertEqual(plan["tier"], "free")
        self.assertEqual(plan["features"], ["ai"])
        self.assertEqual(plan["budget"]["limitUsd"], 0.01)
        sources = [
            client.post("/api/v2/gm/talk", headers=bearer("u1"), json=IX_BODY).json()["source"]
            for _ in range(3)
        ]
        self.assertEqual(sources, ["llm", "llm", "fallback"])
        self.assertEqual(llm.calls, 2)
        api.subs["tok-123456789"] = _sub(account=me)
        res = client.post(
            "/api/v2/plan/play", headers=bearer("u1"), json={"purchaseToken": "tok-123456789"}
        )
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["tier"], "plus")
        self.assertEqual(body["features"], ["ai", "crpg"])
        self.assertEqual(body["subscription"]["state"], "active")
        self.assertEqual(
            client.post("/api/v2/gm/talk", headers=bearer("u1"), json=IX_BODY).json()["source"],
            "llm",
        )

    def test_purchase_for_another_account_or_unknown_token_is_rejected(self) -> None:
        api = FakePlayAPI()
        client = _client(_UsageLLM("x", 1, 1), api)
        api.subs["tok-123456789"] = _sub(account=player_id_for_uid("someone-else"))
        res = client.post(
            "/api/v2/plan/play", headers=bearer("u1"), json={"purchaseToken": "tok-123456789"}
        )
        self.assertEqual(res.status_code, 422)
        res = client.post(
            "/api/v2/plan/play", headers=bearer("u1"), json={"purchaseToken": "tok-unknown-1"}
        )
        self.assertEqual(res.status_code, 422)
        api.status = 403
        res = client.post(
            "/api/v2/plan/play", headers=bearer("u1"), json={"purchaseToken": "tok-123456789"}
        )
        self.assertEqual(res.status_code, 503)

    def test_plan_needs_sign_in_in_google_mode(self) -> None:
        client = _client(_UsageLLM("x", 1, 1), FakePlayAPI())
        self.assertEqual(client.get("/api/v2/plan").status_code, 401)

    def test_spend_counts_toward_the_meter_and_is_erased_with_the_account(self) -> None:
        client = _client(_UsageLLM("기록을 갱신했습니다.", 1_000, 0), FakePlayAPI())
        client.post("/api/v2/gm/talk", headers=bearer("u1"), json=IX_BODY)
        meter = client.get("/api/v2/plan", headers=bearer("u1")).json()["budget"]
        self.assertEqual(meter["usedUsd"], 1_000 / MICRO)
        removed = client.delete("/api/v2/account", headers=bearer("u1")).json()["removed"]
        self.assertEqual(removed["gm_spend"], 1)


if __name__ == "__main__":
    unittest.main()


class _AdminVerifier(FakeVerifier):
    """``good:<uid>`` tokens; uid ``boss`` signs in with the allow-listed admin email."""

    def verify_identity(self, token: str) -> Identity:
        uid = self.verify(token)
        return Identity(uid, "owner@example.com" if uid == "boss" else f"{uid}@example.com", True)


class AdminAccountTest(unittest.TestCase):
    def _client(self, llm: _UsageLLM) -> TestClient:
        app = FastAPI()
        app.include_router(
            create_v2_router(
                store_factory=MemoryV2Store,
                llm_factory=lambda: llm,
                settings=V2Settings(),
                auth=AuthConfig(
                    mode="google",
                    project_id="demo-mythos",
                    web_config=None,
                    admin_emails=frozenset({"owner@example.com"}),
                ),
                verifier=_AdminVerifier(),
                account_deleter=FakeDeleter(),
                now=lambda: NOW,
                budget_config=BudgetConfig(
                    free_usd=0.01, plus_usd=0.02, daily_usd=1.0, price=PRICE
                ),
                billing_config=BillingConfig(),
                purchase_verifier=_verifier(FakePlayAPI()),
            )
        )
        return TestClient(app)

    def test_admin_has_no_monthly_allowance_and_gets_signal_plus(self) -> None:
        llm = _UsageLLM(
            "기록을 갱신했습니다.", 3_000, 500
        )  # 5_000 µ$ a call; free allowance = 2 calls
        client = self._client(llm)
        sources = [
            client.post("/api/v2/gm/talk", headers=bearer("boss"), json=IX_BODY).json()["source"]
            for _ in range(6)
        ]
        self.assertEqual(sources, ["llm"] * 6)
        plan = client.get("/api/v2/plan", headers=bearer("boss")).json()
        self.assertTrue(plan["admin"])
        self.assertEqual(plan["tier"], "plus")
        self.assertIn("crpg", plan["features"])
        self.assertTrue(plan["budget"]["unlimited"])
        # Everyone else keeps the allowance.
        other = [
            client.post("/api/v2/gm/talk", headers=bearer("u9"), json=IX_BODY).json()["source"]
            for _ in range(3)
        ]
        self.assertEqual(other, ["llm", "llm", "fallback"])
        self.assertFalse(client.get("/api/v2/plan", headers=bearer("u9")).json()["admin"])

    def test_the_daily_ceiling_still_stops_the_admin(self) -> None:
        llm = _UsageLLM(
            "기록을 갱신했습니다.", 600_000, 100_000
        )  # $1.0 a call = the whole daily ceiling
        client = self._client(llm)
        first = client.post("/api/v2/gm/talk", headers=bearer("boss"), json=IX_BODY).json()[
            "source"
        ]
        second = client.post("/api/v2/gm/talk", headers=bearer("boss"), json=IX_BODY).json()[
            "source"
        ]
        self.assertEqual((first, second), ("llm", "fallback"))
