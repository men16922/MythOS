"""Signal+ subscriptions: Google Play purchase verification and the player's tier.

The Android app buys the ``signal_plus_monthly`` subscription through Play Billing with
``obfuscatedAccountId`` = the signed-in player id, then posts the purchase token to ``POST /api/v2/plan/play``.
The server asks Google (``purchases.subscriptionsv2.get``) what the token really is, checks that it was bought
for this player, acknowledges it (Play refunds unacknowledged purchases after 3 days) and keeps one row per
player in ``v2_entitlements``. ``GET /api/v2/plan`` re-asks Google once the stored expiry has passed, which
covers renewals, cancellations and refunds without a Pub/Sub push (RTDN) endpoint.

The server's service account needs access to the app in Play Console (Users and permissions → "View financial
data" + "Manage orders and subscriptions"); until then verification fails and everyone stays on the free tier.

Env: MYTHOS_PLAY_PACKAGE (com.projectmythos.signalrun), MYTHOS_PLUS_SKUS (signal_plus_monthly; comma list),
MYTHOS_PLUS_GRANT (comma list of player ids treated as Signal+ — operator testing, no purchase needed).
"""

from __future__ import annotations

import os
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal, Protocol, cast

from mythos_v2.budget import Tier
from mythos_v2.log import get_logger

DEFAULT_PACKAGE = "com.projectmythos.signalrun"
DEFAULT_SKUS = ("signal_plus_monthly",)
PLAY_SCOPES = ("https://www.googleapis.com/auth/androidpublisher",)
SUBSCRIPTION_URL = (
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{package}"
    "/purchases/subscriptionsv2/tokens/{token}"
)
ACKNOWLEDGE_URL = (
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{package}"
    "/purchases/subscriptions/{sku}/tokens/{token}:acknowledge"
)

State = Literal["active", "grace", "canceled", "on_hold", "paused", "expired", "pending", "unknown"]
#: States in which the player still has Signal+ until ``expires_at`` (canceled = auto-renew off, paid time left).
ENTITLED: frozenset[str] = frozenset({"active", "grace", "canceled"})

_PLAY_STATES: dict[str, State] = {
    "SUBSCRIPTION_STATE_ACTIVE": "active",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD": "grace",
    "SUBSCRIPTION_STATE_CANCELED": "canceled",
    "SUBSCRIPTION_STATE_ON_HOLD": "on_hold",
    "SUBSCRIPTION_STATE_PAUSED": "paused",
    "SUBSCRIPTION_STATE_EXPIRED": "expired",
    "SUBSCRIPTION_STATE_PENDING": "pending",
}

_logger = get_logger("mythos.v2.billing")


class BillingError(RuntimeError):
    """Verification could not be completed (Google unreachable, no access, bad token)."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class Entitlement:
    sku: str
    state: State
    expires_at: datetime | None
    purchase_token: str
    updated_at: datetime

    def entitled(self, now: datetime) -> bool:
        return self.state in ENTITLED and self.expires_at is not None and self.expires_at > now


@dataclass(frozen=True)
class PlayPurchase:
    sku: str
    state: State
    expires_at: datetime | None
    account_id: str
    acknowledged: bool


class PurchaseVerifier(Protocol):
    def verify(self, purchase_token: str) -> PlayPurchase:
        """What Google says this subscription token is. Raises ``BillingError``."""
        ...

    def acknowledge(self, sku: str, purchase_token: str) -> None:
        """Acknowledge a new purchase. Raises ``BillingError``."""
        ...


def _parse_time(raw: object) -> datetime | None:
    if not isinstance(raw, str) or not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def parse_subscription(data: dict[str, Any], skus: tuple[str, ...]) -> PlayPurchase:
    """A ``SubscriptionPurchaseV2`` resource → ``PlayPurchase`` (the latest-expiring line item of ours)."""
    items = [
        item
        for item in data.get("lineItems") or []
        if isinstance(item, dict) and item.get("productId") in skus
    ]
    if not items:
        raise BillingError("unknown product")
    best = max(
        items,
        key=lambda item: _parse_time(item.get("expiryTime")) or datetime.min.replace(tzinfo=UTC),
    )
    ids = data.get("externalAccountIdentifiers") or {}
    return PlayPurchase(
        sku=str(best["productId"]),
        state=_PLAY_STATES.get(str(data.get("subscriptionState")), "unknown"),
        expires_at=_parse_time(best.get("expiryTime")),
        account_id=str(ids.get("obfuscatedExternalAccountId") or "")
        if isinstance(ids, dict)
        else "",
        acknowledged=data.get("acknowledgementState") == "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    )


#: ``(method, url, bearer token) -> (http status, json body or None)``
PlayRequest = Callable[[str, str, str], tuple[int, dict[str, Any] | None]]


def _play_request(method: str, url: str, access_token: str) -> tuple[int, dict[str, Any] | None]:
    import httpx

    response = httpx.request(
        method, url, headers={"Authorization": f"Bearer {access_token}"}, timeout=8.0
    )
    try:
        body = response.json()
    except ValueError:
        body = None
    return response.status_code, body if isinstance(body, dict) else None


def _play_access_token() -> str:
    import google.auth
    from google.auth.transport.requests import Request as AuthRequest

    credentials, _ = google.auth.default(scopes=list(PLAY_SCOPES))
    cast(Any, credentials).refresh(AuthRequest())  # google-auth ships no annotations here
    token = credentials.token
    if not isinstance(token, str) or not token:
        raise BillingError("no access token")
    return token


class GooglePlayVerifier:
    def __init__(
        self,
        package: str,
        skus: tuple[str, ...],
        *,
        access_token: Callable[[], str] | None = None,
        request: PlayRequest | None = None,
    ) -> None:
        self.package = package
        self.skus = skus
        self._access_token = access_token or _play_access_token
        self._request = request or _play_request

    def _call(self, method: str, url: str) -> dict[str, Any] | None:
        try:
            status, body = self._request(method, url, self._access_token())
        except BillingError:
            raise
        except Exception as exc:
            raise BillingError(f"unreachable:{type(exc).__name__}") from exc
        if status in (400, 404, 410):
            raise BillingError("invalid token")
        if status in (401, 403):
            raise BillingError("no play access")
        if not 200 <= status < 300:
            raise BillingError(f"http {status}")
        return body

    def verify(self, purchase_token: str) -> PlayPurchase:
        body = self._call(
            "GET", SUBSCRIPTION_URL.format(package=self.package, token=purchase_token)
        )
        return parse_subscription(body or {}, self.skus)

    def acknowledge(self, sku: str, purchase_token: str) -> None:
        self._call(
            "POST", ACKNOWLEDGE_URL.format(package=self.package, sku=sku, token=purchase_token)
        )


class EntitlementStore(Protocol):
    def get_entitlement(self, player_id: str) -> Entitlement | None: ...

    def put_entitlement(self, player_id: str, entitlement: Entitlement) -> None: ...


@dataclass(frozen=True)
class BillingConfig:
    package: str = DEFAULT_PACKAGE
    skus: tuple[str, ...] = DEFAULT_SKUS
    grants: frozenset[str] = frozenset()

    @classmethod
    def from_env(cls) -> BillingConfig:
        skus = tuple(
            s.strip() for s in (os.getenv("MYTHOS_PLUS_SKUS") or "").split(",") if s.strip()
        )
        grants = frozenset(
            s.strip() for s in (os.getenv("MYTHOS_PLUS_GRANT") or "").split(",") if s.strip()
        )
        return cls(
            package=(os.getenv("MYTHOS_PLAY_PACKAGE") or DEFAULT_PACKAGE).strip(),
            skus=skus or DEFAULT_SKUS,
            grants=grants,
        )


class Plans:
    """Tier lookups (cheap, store only) and purchase verification (calls Google)."""

    def __init__(
        self,
        cfg: BillingConfig,
        store: Callable[[], EntitlementStore],
        verifier: PurchaseVerifier,
        *,
        now: Callable[[], datetime],
    ) -> None:
        self.cfg = cfg
        self._store = store
        self._verifier = verifier
        self._now = now

    def tier(self, player_id: str) -> Tier:
        """The stored tier; never calls Google. A store failure reads as free."""
        if player_id in self.cfg.grants:
            return "plus"
        try:
            ent = self._store().get_entitlement(player_id)
        except Exception as exc:
            _logger.warning("v2 plan lookup failed: %s", type(exc).__name__)
            return "free"
        return "plus" if ent is not None and ent.entitled(self._now()) else "free"

    def entitlement(self, player_id: str, *, refresh: bool) -> Entitlement | None:
        """The stored entitlement; with ``refresh`` an expired one is re-checked with Google first."""
        ent = self._store().get_entitlement(player_id)
        if refresh and ent is not None and not ent.entitled(self._now()) and ent.state != "expired":
            try:
                ent = self._record(
                    player_id, ent.purchase_token, self._verifier.verify(ent.purchase_token)
                )
            except BillingError as exc:
                _logger.info("v2 plan refresh failed", extra={"outcome": exc.reason})
        return ent

    def redeem(self, player_id: str, purchase_token: str) -> Entitlement:
        """Verify a new purchase for ``player_id``, acknowledge it and store it. Raises ``BillingError``."""
        purchase = self._verifier.verify(purchase_token)
        if purchase.account_id != player_id:
            raise BillingError("account mismatch")
        if purchase.state in ENTITLED and not purchase.acknowledged:
            self._verifier.acknowledge(purchase.sku, purchase_token)
        return self._record(player_id, purchase_token, purchase)

    def _record(self, player_id: str, token: str, purchase: PlayPurchase) -> Entitlement:
        ent = Entitlement(purchase.sku, purchase.state, purchase.expires_at, token, self._now())
        self._store().put_entitlement(player_id, ent)
        return ent


__all__ = [
    "ENTITLED",
    "BillingConfig",
    "BillingError",
    "Entitlement",
    "EntitlementStore",
    "GooglePlayVerifier",
    "Plans",
    "PlayPurchase",
    "PurchaseVerifier",
    "parse_subscription",
]
