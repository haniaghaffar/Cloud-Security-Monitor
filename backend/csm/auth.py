"""Entra ID (Microsoft identity platform) JWT validation.

Validates RS256 access tokens issued for this API using only the
Python standard library plus `requests` (already vendored) for the
JWKS fetch. RSA verification is done with built-in big integers:
em = pow(signature, e, n), then the PKCS#1 v1.5 padding and the
SHA-256 DigestInfo are checked by hand. This keeps the deploy zip
free of new binary dependencies (no PyJWT/cryptography to vendor).

Validation is ON only when ENTRA_TENANT_ID and ENTRA_AUDIENCE are
both set; otherwise the API stays anonymous (demo fallback). When
it is ON, a request without a valid Bearer token is rejected with
401 by the route gate in function_app.py.

Expected token shape (what the frontend MSAL login requests):
- issuer: https://login.microsoftonline.com/{tenant}/v2.0, or the
  Microsoft Account tenant issuer below when the frontend signs in
  through the /consumers endpoint (the app is registered for
  personal Microsoft accounts only, so MSAL uses /consumers and
  those tokens carry the MSA tenant as iss).
- audience: api://{client-id} (the Expose-an-API scope resource);
  the bare client id is accepted too, for safety.
- signing keys: https://login.microsoftonline.com/common/
  discovery/v2.0/keys (cached for one hour, refetched once on an
  unknown kid, so key rollover does not need a redeploy). The
  common endpoint serves the shared v2.0 signing keys, so it
  validates both tenant and personal-account tokens.
"""

import base64
import binascii
import hashlib
import json
import logging
import os
import time
from typing import Any, Dict, Optional, Tuple

import requests

# SHA-256 DigestInfo prefix (DER) used inside PKCS#1 v1.5 signatures.
_SHA256_DER_PREFIX = bytes.fromhex("3031300d060960864801650304020105000420")
# Well-known Microsoft Account (personal accounts) tenant id. Tokens
# issued through the /consumers endpoint carry this as their iss.
_MSA_TENANT_ID = "9188040d-6c67-4c5b-b112-36a304b66dad"
_JWKS_TTL_SECONDS = 3600
_CLOCK_SKEW_SECONDS = 300

_jwks_cache: Dict[str, Any] = {"fetched_at": 0.0, "keys": {}}


def auth_enabled() -> bool:
    """True when Entra validation is configured (tenant + audience)."""
    return bool(os.environ.get("ENTRA_TENANT_ID") and os.environ.get("ENTRA_AUDIENCE"))


def _b64url_decode(segment: str) -> bytes:
    if not isinstance(segment, str) or not segment:
        raise ValueError("empty base64url segment")
    padded = segment + "=" * (-len(segment) % 4)
    try:
        return base64.urlsafe_b64decode(padded.encode("ascii"))
    except (binascii.Error, ValueError) as exc:
        raise ValueError("invalid base64url data") from exc


def _b64url_uint(value: str) -> int:
    raw = _b64url_decode(value)
    return int.from_bytes(raw, "big")


def _fetch_jwks(http_get: Any) -> Dict[str, Tuple[int, int]]:
    # Common endpoint: the shared v2.0 signing keys validate both
    # tenant-issued and personal-account (/consumers) tokens.
    url = "https://login.microsoftonline.com/common/discovery/v2.0/keys"
    resp = http_get(url, timeout=15)
    resp.raise_for_status()
    keys: Dict[str, Tuple[int, int]] = {}
    for key in resp.json().get("keys", []):
        if key.get("kty") != "RSA" or not key.get("kid"):
            continue
        try:
            keys[key["kid"]] = (_b64url_uint(key["n"]), _b64url_uint(key["e"]))
        except (KeyError, ValueError):
            continue
    return keys


def _get_key(kid: str, http_get: Any) -> Optional[Tuple[int, int]]:
    now = time.time()
    if now - _jwks_cache["fetched_at"] > _JWKS_TTL_SECONDS or kid not in _jwks_cache["keys"]:
        try:
            _jwks_cache["keys"] = _fetch_jwks(http_get)
            _jwks_cache["fetched_at"] = now
        except Exception as exc:
            logging.warning("auth: JWKS fetch failed: %s", exc)
            if kid not in _jwks_cache["keys"]:
                return None
    key = _jwks_cache["keys"].get(kid)
    if key is None:
        # Unknown kid after a fresh fetch: refetch once in case the
        # signing keys rolled over between cache fills.
        try:
            _jwks_cache["keys"] = _fetch_jwks(http_get)
            _jwks_cache["fetched_at"] = time.time()
        except Exception as exc:
            logging.warning("auth: JWKS refetch failed: %s", exc)
        key = _jwks_cache["keys"].get(kid)
    return key


def _rsa_verify(message: bytes, signature: bytes, n: int, e: int) -> bool:
    """Verify an RS256 signature: pow + PKCS#1 v1.5 + SHA-256 check."""
    key_len = (n.bit_length() + 7) // 8
    if len(signature) != key_len:
        return False
    em_int = pow(int.from_bytes(signature, "big"), e, n)
    em = em_int.to_bytes(key_len, "big")
    digest = hashlib.sha256(message).digest()
    expected = b"\x00\x01" + b"\xff" * (key_len - len(_SHA256_DER_PREFIX) - len(digest) - 3) + b"\x00" + _SHA256_DER_PREFIX + digest
    if len(expected) != key_len:
        return False
    # Constant-time comparison is overkill for a course demo, but
    # comparing digests (not secrets) with == is fine here; the
    # signature itself is public data once presented.
    return em == expected


def verify_token(auth_header: str, http_get: Any = requests.get, now: Optional[float] = None) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Validate one Authorization header value.

    Returns (claims, None) on success, (None, error) on failure.
    Callers that run with validation disabled should not call this;
    use auth_enabled() first.
    """
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, "missing or malformed Authorization Bearer token"
    token = auth_header[len("Bearer "):].strip()
    parts = token.split(".")
    if len(parts) != 3:
        return None, "malformed JWT (expected 3 segments)"
    try:
        header = json.loads(_b64url_decode(parts[0]).decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        return None, "malformed JWT header (%s)" % exc
    if not isinstance(header, dict):
        return None, "JWT header is not a JSON object"
    if header.get("alg") != "RS256":
        return None, "unsupported JWT alg (expected RS256)"
    kid = header.get("kid")
    if not kid:
        return None, "JWT header has no kid"
    try:
        payload = json.loads(_b64url_decode(parts[1]).decode("utf-8"))
        signature = _b64url_decode(parts[2])
    except (ValueError, UnicodeDecodeError) as exc:
        return None, "malformed JWT (%s)" % exc
    if not isinstance(payload, dict):
        return None, "JWT payload is not a JSON object"

    tenant_id = os.environ.get("ENTRA_TENANT_ID", "")
    audience = os.environ.get("ENTRA_AUDIENCE", "")
    expected_issuers = {
        "https://login.microsoftonline.com/%s/v2.0" % tenant_id,
        "https://login.microsoftonline.com/%s/v2.0" % _MSA_TENANT_ID,
    }
    if payload.get("iss") not in expected_issuers:
        return None, "unexpected JWT issuer"
    aud = payload.get("aud")
    aud_values = aud if isinstance(aud, list) else [aud]
    bare_client_id = audience[6:] if audience.startswith("api://") else audience
    if audience not in aud_values and bare_client_id not in aud_values:
        return None, "unexpected JWT audience"

    now_ts = time.time() if now is None else now
    exp = payload.get("exp")
    if not isinstance(exp, (int, float)) or now_ts > exp + _CLOCK_SKEW_SECONDS:
        return None, "JWT is expired"
    nbf = payload.get("nbf")
    if isinstance(nbf, (int, float)) and now_ts < nbf - _CLOCK_SKEW_SECONDS:
        return None, "JWT is not yet valid"

    key = _get_key(kid, http_get)
    if key is None:
        return None, "unknown signing key"
    n, e = key
    signed_content = (parts[0] + "." + parts[1]).encode("ascii")
    if not _rsa_verify(signed_content, signature, n, e):
        return None, "JWT signature verification failed"
    return payload, None
