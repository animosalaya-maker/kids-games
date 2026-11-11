#!/usr/bin/env python3
"""App Store signing for CI without a registered device (CI, macOS).
create : makes an Apple Distribution certificate + an App Store profile for $BUNDLE with the
         App Store Connect API key, writes a .p12 and installs the profile; exports CERT_ID, PROFILE_ID,
         PROFILE_NAME, P12_PATH, P12_PASS to $GITHUB_ENV.
revoke-run : revokes the certificate made by THIS run (its private key only ever lived in the CI keychain, so it
         is useless afterwards); keeps Apple's per-team certificate limit free. Uploaded builds are not affected.
revoke-all : revokes every Apple Distribution certificate of the team, to free the limit once.
         Only run with the workflow input free_certificates.
Env: ASC_KEY_PATH, KEY_ID, ISSUER, BUNDLE, RUNNER_TEMP, GITHUB_RUN_ID, GITHUB_ENV
"""
import base64, json, os, secrets, sys, time, urllib.error, urllib.parse, urllib.request
import jwt
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

API = "https://api.appstoreconnect.apple.com/v1"
E = os.environ


def token():
    key = open(E["ASC_KEY_PATH"]).read()
    now = int(time.time())
    return jwt.encode({"iss": E["ISSUER"], "iat": now, "exp": now + 1100, "aud": "appstoreconnect-v1"},
                      key, algorithm="ES256", headers={"kid": E["KEY_ID"], "typ": "JWT"})


def call(method, path, body=None, ok_fail=False):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")
        if ok_fail:
            print(f"  ({method} {path.split('?')[0]} -> {e.code}, ignored)")
            return None
        print(f"::error::App Store Connect {method} {path.split('?')[0]} -> {e.code}: {msg[:800]}")
        sys.exit(1)


def setenv(k, v, mask=False):
    if mask:
        print(f"::add-mask::{v}")
    with open(E["GITHUB_ENV"], "a") as f:
        f.write(f"{k}={v}\n")


def bundle_id():
    q = urllib.parse.urlencode({"filter[identifier]": E["BUNDLE"], "limit": 200})
    for d in call("GET", f"/bundleIds?{q}")["data"]:
        if d["attributes"]["identifier"] == E["BUNDLE"]:
            return d["id"]
    d = call("POST", "/bundleIds", {"data": {"type": "bundleIds", "attributes": {
        "identifier": E["BUNDLE"], "name": "Bobo Land", "platform": "IOS"}}})["data"]
    print("  registered App ID", E["BUNDLE"])
    return d["id"]


def capabilities(bid):
    rel = {"bundleId": {"data": {"type": "bundleIds", "id": bid}}}
    caps = [
        {"capabilityType": "APPLE_ID_AUTH",
         "settings": [{"key": "APPLE_ID_AUTH_APP_CONSENT", "options": [{"key": "PRIMARY_APP_CONSENT"}]}]},
        {"capabilityType": "PUSH_NOTIFICATIONS"},
    ]
    for a in caps:  # idempotent: "already enabled" comes back as an error and is ignored
        call("POST", "/bundleIdCapabilities",
             {"data": {"type": "bundleIdCapabilities", "attributes": a, "relationships": rel}}, ok_fail=True)


def create():
    tmp = E["RUNNER_TEMP"]
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    csr = (x509.CertificateSigningRequestBuilder()
           .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "BOBO LAND CI"),
                                    x509.NameAttribute(NameOID.COUNTRY_NAME, "TR")]))
           .sign(key, hashes.SHA256()))
    csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode()
    c = call("POST", "/certificates", {"data": {"type": "certificates", "attributes": {
        "certificateType": "DISTRIBUTION", "csrContent": csr_pem}}})["data"]
    cert_id = c["id"]
    setenv("CERT_ID", cert_id)
    print("  distribution certificate", cert_id)
    cert = x509.load_der_x509_certificate(base64.b64decode(c["attributes"]["certificateContent"]))

    pw = secrets.token_hex(16)
    enc = (serialization.PrivateFormat.PKCS12.encryption_builder().kdf_rounds(50000)
           .key_cert_algorithm(pkcs12.PBES.PBESv1SHA1And3KeyTripleDESCBC).hmac_hash(hashes.SHA1())
           .build(pw.encode()))  # legacy encryption: macOS `security import` can't read AES p12 files
    p12 = os.path.join(tmp, "dist.p12")
    with open(p12, "wb") as f:
        f.write(pkcs12.serialize_key_and_certificates(b"BOBO LAND CI", key, cert, None, enc))
    setenv("P12_PATH", p12)
    setenv("P12_PASS", pw, mask=True)

    bid = bundle_id()
    # Bobo Land needs no extra capabilities (no sign-in, no push)
    name = f"BOBO CI {E.get('GITHUB_RUN_ID', int(time.time()))}"
    p = call("POST", "/profiles", {"data": {"type": "profiles",
        "attributes": {"name": name, "profileType": "IOS_APP_STORE"},
        "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bid}},
                          "certificates": {"data": [{"type": "certificates", "id": cert_id}]}}}})["data"]
    setenv("PROFILE_ID", p["id"])
    setenv("PROFILE_NAME", name)
    content = base64.b64decode(p["attributes"]["profileContent"])
    uuid = p["attributes"]["uuid"]
    for d in ("~/Library/MobileDevice/Provisioning Profiles",
              "~/Library/Developer/Xcode/UserData/Provisioning Profiles"):
        d = os.path.expanduser(d)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, uuid + ".mobileprovision"), "wb") as f:
            f.write(content)
    print(f"  App Store profile '{name}' ({uuid}) installed")


def revoke_run():
    cid = E.get("CERT_ID", "")
    if cid:
        call("DELETE", f"/certificates/{cid}", ok_fail=True)
        print("  revoked this run's certificate", cid)


def revoke_all():
    q = urllib.parse.urlencode({"filter[certificateType]": "DISTRIBUTION,IOS_DISTRIBUTION", "limit": 200})
    for c in call("GET", f"/certificates?{q}")["data"]:
        call("DELETE", f"/certificates/{c['id']}", ok_fail=True)
        print("  revoked", c["id"], c["attributes"].get("name"), c["attributes"].get("expirationDate"))


if __name__ == "__main__":
    {"create": create, "revoke-run": revoke_run, "revoke-all": revoke_all}[sys.argv[1]]()
