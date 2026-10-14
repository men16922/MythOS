"""Firebase ID-token verification (mythos_v2.auth) against a locally generated RSA key and self-signed
cert served by an injected fetcher — no network — plus the config helpers (mode, web config, ids)."""

from __future__ import annotations

import base64
import datetime as dt
import json
import logging
import os
import re
import tempfile
import unittest
from collections.abc import Mapping
from pathlib import Path
from typing import Any
from unittest import mock

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.x509.oid import NameOID

from mythos_v2.auth import (
    ACCOUNTS_DELETE_URL,
    GOOGLE_PLAYER_ID_RE,
    AuthConfig,
    CertsUnavailableError,
    FirebaseAccountDeleter,
    FirebaseTokenVerifier,
    TokenError,
    bearer_token,
    build_account_deleter,
    cache_max_age,
    load_web_config,
    parse_auth_mode,
    player_id_for_uid,
)

PROJECT = "demo-mythos"
NOW = 1_790_000_000.0
UID = "uid-ABCdef0123456789"
EMAIL = "someone@example.com"


class Key:
    """An RSA key + a self-signed x509 cert (PEM), like one entry of Google's securetoken cert set."""

    def __init__(self, kid: str) -> None:
        self.kid = kid
        self.private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "securetoken.test")])
        start = dt.datetime(2026, 1, 1, tzinfo=dt.UTC)
        cert = (
            x509.CertificateBuilder()
            .subject_name(name)
            .issuer_name(name)
            .public_key(self.private.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(start)
            .not_valid_after(start + dt.timedelta(days=3650))
            .sign(self.private, hashes.SHA256())
        )
        self.pem = cert.public_bytes(serialization.Encoding.PEM).decode("ascii")

    def sign(self, signing_input: bytes) -> bytes:
        return self.private.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())


_KEYS: dict[str, Key] = {}


def key(kid: str) -> Key:
    """RSA generation is slow-ish: one key per kid for the whole module."""
    if kid not in _KEYS:
        _KEYS[kid] = Key(kid)
    return _KEYS[kid]


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def claims(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "iss": f"https://securetoken.google.com/{PROJECT}",
        "aud": PROJECT,
        "auth_time": int(NOW) - 600,
        "user_id": UID,
        "sub": UID,
        "iat": int(NOW) - 60,
        "exp": int(NOW) + 3540,
        "email": EMAIL,
        "name": "Some One",
        "firebase": {"identities": {"google.com": ["1234"]}, "sign_in_provider": "google.com"},
    }
    base.update(overrides)
    return {k: v for k, v in base.items() if v is not None}


def make_token(
    payload: Mapping[str, Any] | None = None,
    *,
    signer: Key | None = None,
    kid: str = "k1",
    alg: str = "RS256",
) -> str:
    header = _b64(json.dumps({"alg": alg, "kid": kid, "typ": "JWT"}).encode())
    body = _b64(json.dumps(dict(payload if payload is not None else claims())).encode())
    signing_input = f"{header}.{body}".encode("ascii")
    return f"{header}.{body}.{_b64((signer or key(kid)).sign(signing_input))}"


class Clock:
    def __init__(self, now: float = NOW) -> None:
        self.now = now

    def __call__(self) -> float:
        return self.now


class Fetcher:
    """Serves the cert set it is told to; counts calls; can be made to fail."""

    def __init__(self, *kids: str, max_age: float = 3600.0) -> None:
        self.kids = list(kids)
        self.max_age = max_age
        self.calls = 0
        self.fail = False

    def __call__(self) -> tuple[dict[str, str], float]:
        self.calls += 1
        if self.fail:
            raise OSError("network down")
        return {kid: key(kid).pem for kid in self.kids}, self.max_age


def verifier(fetcher: Fetcher, clock: Clock | None = None) -> FirebaseTokenVerifier:
    return FirebaseTokenVerifier(PROJECT, fetcher=fetcher, clock=clock or Clock())


class VerifyTokenTest(unittest.TestCase):
    def setUp(self) -> None:
        self.fetcher = Fetcher("k1", "k2")
        self.clock = Clock()
        self.verifier = verifier(self.fetcher, self.clock)

    def reject(self, token: str, reason: str) -> None:
        with self.assertRaises(TokenError) as ctx:
            self.verifier.verify(token)
        self.assertEqual(ctx.exception.reason, reason)

    def test_valid_token_returns_uid(self) -> None:
        self.assertEqual(self.verifier.verify(make_token()), UID)
        self.assertEqual(self.verifier.verify(make_token(kid="k2")), UID)
        self.assertEqual(self.fetcher.calls, 1)

    def test_expiry_and_issue_time_have_60s_leeway(self) -> None:
        self.assertEqual(self.verifier.verify(make_token(claims(exp=int(NOW) - 59))), UID)
        self.reject(make_token(claims(exp=int(NOW) - 61)), "expired")
        self.assertEqual(self.verifier.verify(make_token(claims(iat=int(NOW) + 59))), UID)
        self.reject(make_token(claims(iat=int(NOW) + 61)), "issued in the future")
        self.reject(make_token(claims(auth_time=int(NOW) + 61)), "auth_time in the future")
        self.reject(make_token(claims(exp="soon")), "missing exp")
        self.reject(make_token(claims(iat=True)), "missing iat")
        # the same token expires once the injected clock moves past exp + leeway
        token = make_token()
        self.clock.now = NOW + 3540 + 61
        self.reject(token, "expired")

    def test_wrong_audience_or_issuer(self) -> None:
        self.reject(make_token(claims(aud="other-project")), "bad aud")
        self.reject(make_token(claims(aud=[PROJECT])), "bad aud")
        self.reject(make_token(claims(iss="https://securetoken.google.com/other")), "bad iss")
        self.reject(make_token(claims(iss="https://accounts.google.com")), "bad iss")

    def test_only_google_sign_in_is_accepted(self) -> None:
        for provider in ("password", "anonymous", "custom", "phone"):
            with self.subTest(provider=provider):
                payload = claims(firebase={"sign_in_provider": provider})
                self.reject(make_token(payload), "not a Google sign-in")
        self.reject(make_token(claims(firebase=None)), "not a Google sign-in")
        self.reject(make_token(claims(firebase="google.com")), "not a Google sign-in")

    def test_subject_must_be_a_non_empty_uid(self) -> None:
        self.reject(make_token(claims(sub="")), "bad sub")
        self.reject(make_token(claims(sub=None)), "bad sub")
        self.reject(make_token(claims(sub="x" * 129)), "bad sub")
        self.reject(make_token(claims(sub=42)), "bad sub")

    def test_tampered_or_foreign_signatures_fail(self) -> None:
        header, body, sig = make_token().split(".")
        forged = _b64(json.dumps(claims(sub="someone-else")).encode())
        self.reject(f"{header}.{forged}.{sig}", "bad signature")
        flipped = sig[:-2] + ("A" if sig[-2] != "A" else "B") + sig[-1]
        self.reject(f"{header}.{body}.{flipped}", "bad signature")
        # signed by an attacker's key but claiming a known kid
        self.reject(make_token(signer=key("attacker"), kid="k1"), "bad signature")

    def test_algorithm_must_be_rs256(self) -> None:
        self.reject(make_token(alg="HS256"), "bad alg")
        self.reject(make_token(alg="none"), "bad alg")
        header = _b64(json.dumps({"alg": "none", "kid": "k1"}).encode())
        body = _b64(json.dumps(claims()).encode())
        self.reject(f"{header}.{body}.", "bad alg")

    def test_malformed_tokens(self) -> None:
        for bad in ("", "abc", "a.b", "a.b.c.d", "!!.??.**", "x" * 5000):
            with self.subTest(bad=bad[:20]):
                self.reject(bad, "malformed")
        not_object = f"{_b64(b'[1]')}.{_b64(b'{}')}.{_b64(b'sig')}"
        self.reject(not_object, "malformed")
        no_kid = f"{_b64(json.dumps({'alg': 'RS256'}).encode())}.{_b64(b'{}')}.{_b64(b's')}"
        self.reject(no_kid, "missing kid")


class CertCacheTest(unittest.TestCase):
    def test_unknown_kid_refreshes_at_most_once_a_minute(self) -> None:
        fetcher = Fetcher("k1")
        clock = Clock()
        v = verifier(fetcher, clock)
        self.assertEqual(v.verify(make_token()), UID)
        self.assertEqual(fetcher.calls, 1)
        # Google rotates in a new key: the first token signed with it triggers one refresh
        fetcher.kids = ["k1", "k3"]
        clock.now += 5
        self.assertEqual(v.verify(make_token(kid="k3")), UID)
        self.assertEqual(fetcher.calls, 2)
        # bogus kids within the minute do not refetch
        clock.now += 10
        for _ in range(5):
            with self.assertRaises(TokenError) as ctx:
                v.verify(make_token(signer=key("attacker"), kid="nope"))
            self.assertEqual(ctx.exception.reason, "unknown kid")
        self.assertEqual(fetcher.calls, 2)
        clock.now += 61
        with self.assertRaises(TokenError):
            v.verify(make_token(signer=key("attacker"), kid="nope"))
        self.assertEqual(fetcher.calls, 3)

    def test_cache_control_max_age_is_honoured(self) -> None:
        fetcher = Fetcher("k1", max_age=600)
        clock = Clock()
        v = verifier(fetcher, clock)
        v.verify(make_token())
        clock.now += 599
        v.verify(make_token(claims(iat=int(clock.now), exp=int(clock.now) + 3600)))
        self.assertEqual(fetcher.calls, 1)
        clock.now += 2
        v.verify(make_token(claims(iat=int(clock.now), exp=int(clock.now) + 3600)))
        self.assertEqual(fetcher.calls, 2)

    def test_fetch_failure(self) -> None:
        fetcher = Fetcher("k1", max_age=600)
        fetcher.fail = True
        clock = Clock()
        v = verifier(fetcher, clock)
        with self.assertRaises(CertsUnavailableError):
            v.verify(make_token())
        # throttled: no refetch storm while Google is unreachable
        with self.assertRaises(CertsUnavailableError):
            v.verify(make_token())
        self.assertEqual(fetcher.calls, 1)
        clock.now += 11
        fetcher.fail = False
        self.assertEqual(v.verify(make_token()), UID)
        # expired cache + failing fetch keeps serving the stale certs
        fetcher.fail = True
        clock.now += 601
        self.assertEqual(
            v.verify(make_token(claims(iat=int(clock.now), exp=int(clock.now) + 60))), UID
        )

    def test_max_age_parsing(self) -> None:
        self.assertEqual(cache_max_age("public, max-age=19302, must-revalidate"), 19302)
        self.assertEqual(cache_max_age(""), 3600)
        self.assertEqual(cache_max_age("no-cache"), 3600)
        self.assertEqual(cache_max_age("max-age=1"), 60)
        self.assertEqual(cache_max_age("max-age=99999999"), 86400)


class HelpersTest(unittest.TestCase):
    def test_player_id_is_an_opaque_hash(self) -> None:
        pid = player_id_for_uid(UID)
        self.assertRegex(pid, GOOGLE_PLAYER_ID_RE)
        self.assertEqual(len(pid), 34)
        self.assertNotIn(UID, pid)
        self.assertEqual(pid, player_id_for_uid(UID))
        self.assertNotEqual(pid, player_id_for_uid(UID + "x"))

    def test_bearer_token(self) -> None:
        self.assertEqual(bearer_token("Bearer abc.def.ghi"), "abc.def.ghi")
        self.assertEqual(bearer_token("bearer   abc "), "abc")
        self.assertEqual(bearer_token("Bearer"), "")
        self.assertEqual(bearer_token("Bearer "), "")
        self.assertIsNone(bearer_token(None))
        self.assertIsNone(bearer_token(""))
        self.assertIsNone(bearer_token("Basic dXNlcjpwYXNz"))

    def test_auth_mode(self) -> None:
        self.assertEqual(parse_auth_mode(None), "open")
        self.assertEqual(parse_auth_mode(""), "open")
        self.assertEqual(parse_auth_mode(" Open "), "open")
        self.assertEqual(parse_auth_mode("GOOGLE"), "google")
        # unknown values fail closed (and say so)
        with self.assertLogs("mythos.v2.auth", level="ERROR"):
            self.assertEqual(parse_auth_mode("invite"), "google")

    def test_web_config(self) -> None:
        full = {
            "apiKey": "AIza-test",
            "authDomain": "demo.firebaseapp.com",
            "projectId": "demo",
            "appId": "1:2:web:3",
            "messagingSenderId": "2",
            "storageBucket": "demo.appspot.com",
            "measurementId": "G-X",
        }
        picked = load_web_config(json.dumps(full))
        self.assertEqual(
            picked,
            {
                k: full[k]
                for k in ("apiKey", "authDomain", "projectId", "appId", "messagingSenderId")
            },
        )
        self.assertIsNone(load_web_config(json.dumps({**full, "appId": ""})))
        self.assertIsNone(load_web_config("{not json"))
        self.assertIsNone(load_web_config("[]"))
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "web-config.json"
            self.assertIsNone(load_web_config("", file))
            file.write_text(json.dumps(full), encoding="utf-8")
            self.assertEqual(load_web_config("", file), picked)
            # the env var, when set, wins over the file (even when it is invalid)
            self.assertIsNone(load_web_config("{bad", file))

    def test_config_from_env(self) -> None:
        env = {"MYTHOS_AUTH": "google", "MYTHOS_FIREBASE_PROJECT": "fb-proj", "PROJECT_ID": "gcp"}
        with mock.patch.dict(os.environ, env):
            cfg = AuthConfig.from_env()
        self.assertEqual((cfg.mode, cfg.project_id), ("google", "fb-proj"))
        with mock.patch.dict(os.environ, {**env, "MYTHOS_FIREBASE_PROJECT": ""}):
            self.assertEqual(AuthConfig.from_env().project_id, "gcp")


class AccountDeleterTest(unittest.TestCase):
    def make(self, status: int, text: str = "{}") -> tuple[FirebaseAccountDeleter, list[Any]]:
        calls: list[Any] = []

        def post(url: str, token: str, body: dict[str, str]) -> tuple[int, str]:
            calls.append((url, token, body))
            return status, text

        return FirebaseAccountDeleter(PROJECT, access_token=lambda: "tok", post=post), calls

    def test_posts_the_uid_to_the_admin_endpoint(self) -> None:
        deleter, calls = self.make(200)
        self.assertTrue(deleter.delete_user(UID))
        self.assertEqual(
            calls, [(ACCOUNTS_DELETE_URL.format(project=PROJECT), "tok", {"localId": UID})]
        )

    def test_an_already_missing_user_counts_as_deleted(self) -> None:
        deleter, _ = self.make(400, '{"error": {"message": "USER_NOT_FOUND"}}')
        self.assertTrue(deleter.delete_user(UID))

    def test_failures_return_false_and_log_no_uid(self) -> None:
        for status in (403, 500):
            deleter, _ = self.make(status, "PERMISSION_DENIED")
            with self.assertLogs("mythos", level=logging.WARNING) as logs:
                self.assertFalse(deleter.delete_user(UID))
            self.assertNotIn(UID, "\n".join(f"{r.getMessage()} {r.__dict__}" for r in logs.records))

        def no_credentials() -> str:
            raise RuntimeError(f"no ADC for {UID}")

        broken = FirebaseAccountDeleter(PROJECT, access_token=no_credentials)
        with self.assertLogs("mythos", level=logging.WARNING) as logs:
            self.assertFalse(broken.delete_user(UID))
        self.assertNotIn(UID, "\n".join(r.getMessage() for r in logs.records))

    def test_no_project_means_no_record(self) -> None:
        self.assertFalse(build_account_deleter(None).delete_user(UID))
        self.assertIsInstance(build_account_deleter(PROJECT), FirebaseAccountDeleter)


class NoPersonalDataInLogsTest(unittest.TestCase):
    def test_rejections_log_reasons_only(self) -> None:
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from mythos_v2.api import V2Settings, create_v2_router
        from mythos_v2.store import MemoryV2Store

        app = FastAPI()
        app.include_router(
            create_v2_router(
                store_factory=MemoryV2Store,
                llm_factory=lambda: None,
                settings=V2Settings(),
                auth=AuthConfig(mode="google", project_id=PROJECT),
                verifier=verifier(Fetcher("k1")),
            )
        )
        client = TestClient(app)
        bad = make_token(claims(aud="other"))
        with self.assertLogs("mythos", level=logging.DEBUG) as logs:
            res = client.get("/api/v2/profile", headers={"Authorization": f"Bearer {bad}"})
            ok = client.get("/api/v2/profile", headers={"Authorization": f"Bearer {make_token()}"})
            logging.getLogger("mythos").debug("end")  # assertLogs needs at least one record
        self.assertEqual(res.status_code, 401)
        self.assertEqual(ok.status_code, 200)
        dump = "\n".join(f"{r.getMessage()} {r.__dict__}" for r in logs.records)
        for secret in (UID, EMAIL, "Some One", bad.split(".")[2]):
            self.assertNotIn(secret, dump)
        self.assertTrue(re.search(r"bad aud", dump))


if __name__ == "__main__":
    unittest.main()
