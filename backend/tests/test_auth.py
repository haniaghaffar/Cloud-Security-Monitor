"""Tests for Entra JWT validation (csm.auth).

Tokens are signed for real with an openssl-generated RSA keypair
(created fresh per test run), and the JWKS fetch is faked to serve
that keypair's public part — so signature verification is tested
end to end, not mocked around.

Run from the function app folder (the one with function_app.py):
    PYTHONPATH=.:.python_packages/lib/site-packages python3 -m unittest discover -s tests -v
(On the PC the command is `py` instead of `python3`.)
"""

import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from csm import auth  # noqa: E402

TENANT = "test-tenant-id"
AUDIENCE = "api://test-client-id"
ISSUER = "https://login.microsoftonline.com/%s/v2.0" % TENANT
CONSUMERS_ISSUER = "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class AuthTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        key = os.path.join(cls.tmp.name, "key.pem")
        pub = os.path.join(cls.tmp.name, "pub.pem")
        subprocess.run(["openssl", "genrsa", "-out", key, "2048"],
                       check=True, capture_output=True)
        subprocess.run(["openssl", "rsa", "-in", key, "-pubout", "-out", pub],
                       check=True, capture_output=True)
        out = subprocess.run(["openssl", "rsa", "-pubin", "-in", pub,
                              "-modulus", "-noout"],
                             check=True, capture_output=True, text=True).stdout
        modulus_hex = out.strip().split("=", 1)[1]
        n_int = int(modulus_hex, 16)
        n_bytes = n_int.to_bytes((n_int.bit_length() + 7) // 8, "big")
        cls.key_path = key
        cls.jwk = {"kty": "RSA", "kid": "test-key-1",
                   "n": _b64url(n_bytes), "e": "AQAB"}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def setUp(self):
        os.environ["ENTRA_TENANT_ID"] = TENANT
        os.environ["ENTRA_AUDIENCE"] = AUDIENCE
        auth._jwks_cache["fetched_at"] = 0.0
        auth._jwks_cache["keys"] = {}
        self.jwks_calls = []

        def fake_get(url, timeout=15):
            self.jwks_calls.append(url)
            return _FakeResponse({"keys": [self.jwk]})

        self.fake_get = fake_get

    def tearDown(self):
        os.environ.pop("ENTRA_TENANT_ID", None)
        os.environ.pop("ENTRA_AUDIENCE", None)

    def _sign(self, header, payload):
        head = _b64url(json.dumps(header, separators=(",", ":")).encode())
        body = _b64url(json.dumps(payload, separators=(",", ":")).encode())
        signing_input = (head + "." + body).encode("ascii")
        proc = subprocess.run(["openssl", "dgst", "-sha256", "-sign", self.key_path],
                              input=signing_input, check=True, capture_output=True)
        return head + "." + body + "." + _b64url(proc.stdout)

    def _token(self, **overrides):
        now = int(time.time())
        payload = {"iss": ISSUER, "aud": AUDIENCE, "sub": "user-1",
                   "oid": "user-1", "exp": now + 3600, "nbf": now - 60}
        payload.update(overrides)
        header = {"alg": "RS256", "kid": "test-key-1", "typ": "JWT"}
        return self._sign(header, payload)

    def test_valid_token_passes(self):
        claims, error = auth.verify_token("Bearer " + self._token(),
                                          http_get=self.fake_get)
        self.assertIsNone(error)
        self.assertEqual(claims["oid"], "user-1")
        self.assertEqual(claims["iss"], ISSUER)

    def test_tampered_payload_fails(self):
        token = self._token()
        head, body, sig = token.split(".")
        raw = base64.urlsafe_b64decode(body + "=" * (-len(body) % 4))
        tampered = json.loads(raw)
        tampered["oid"] = "attacker"
        body2 = _b64url(json.dumps(tampered, separators=(",", ":")).encode())
        claims, error = auth.verify_token("Bearer " + head + "." + body2 + "." + sig,
                                          http_get=self.fake_get)
        self.assertIsNone(claims)
        self.assertIn("signature", error)

    def test_expired_token_fails(self):
        claims, error = auth.verify_token(
            "Bearer " + self._token(exp=int(time.time()) - 3600),
            http_get=self.fake_get)
        self.assertIsNone(claims)
        self.assertIn("expired", error)

    def test_wrong_audience_fails(self):
        claims, error = auth.verify_token(
            "Bearer " + self._token(aud="api://someone-else"),
            http_get=self.fake_get)
        self.assertIsNone(claims)
        self.assertIn("audience", error)

    def test_consumers_issuer_passes(self):
        # Tokens from the /consumers endpoint (personal accounts)
        # carry the Microsoft Account tenant as iss, not the app's
        # own tenant — they must still validate.
        claims, error = auth.verify_token(
            "Bearer " + self._token(iss=CONSUMERS_ISSUER),
            http_get=self.fake_get)
        self.assertIsNone(error)
        self.assertEqual(claims["iss"], CONSUMERS_ISSUER)

    def test_wrong_issuer_fails(self):
        claims, error = auth.verify_token(
            "Bearer " + self._token(iss="https://login.microsoftonline.com/evil/v2.0"),
            http_get=self.fake_get)
        self.assertIsNone(claims)
        self.assertIn("issuer", error)

    def test_none_alg_fails(self):
        head = _b64url(json.dumps({"alg": "none", "typ": "JWT"},
                                  separators=(",", ":")).encode())
        body = _b64url(json.dumps({"iss": ISSUER, "aud": AUDIENCE},
                                  separators=(",", ":")).encode())
        claims, error = auth.verify_token("Bearer " + head + "." + body + ".",
                                          http_get=self.fake_get)
        self.assertIsNone(claims)
        self.assertIn("alg", error)

    def test_unknown_kid_fails(self):
        token = self._sign({"alg": "RS256", "kid": "no-such-key", "typ": "JWT"},
                           {"iss": ISSUER, "aud": AUDIENCE,
                            "exp": int(time.time()) + 3600})
        claims, error = auth.verify_token("Bearer " + token,
                                          http_get=self.fake_get)
        self.assertIsNone(claims)
        self.assertIn("signing key", error)

    def test_missing_header_fails(self):
        claims, error = auth.verify_token("", http_get=self.fake_get)
        self.assertIsNone(claims)
        self.assertIn("missing", error)

    def test_auth_disabled_without_env(self):
        os.environ.pop("ENTRA_TENANT_ID", None)
        os.environ.pop("ENTRA_AUDIENCE", None)
        self.assertFalse(auth.auth_enabled())
        os.environ["ENTRA_TENANT_ID"] = TENANT
        os.environ["ENTRA_AUDIENCE"] = AUDIENCE
        self.assertTrue(auth.auth_enabled())


if __name__ == "__main__":
    unittest.main()
