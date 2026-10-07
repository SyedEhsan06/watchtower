# SSH Security

This document covers how Watchtower handles SSH credentials, its host key
verification strategy and the tradeoff behind it, how to configure a
restricted `monitor` user on servers you connect to, and the real risk of
Docker socket access.

## How SSH private keys are stored

1. You paste a private key into the Add Server / Edit Server form. It travels
   to the API over HTTPS (in production) and is never persisted in the
   browser beyond the form's lifetime.
2. The API encrypts it immediately with **AES-256-GCM**
   (`apps/api/src/modules/crypto/secret-box.ts`), using a random 12-byte IV
   per encryption.
3. Only the ciphertext, IV, and authentication tag are written to Postgres
   (`Server.encryptedSshPrivateKey`, `sshKeyIv`, `sshKeyAuthTag`). The
   plaintext key is discarded immediately after encryption.
4. These three fields are **never** included in any API response — every
   route that returns a `Server` uses an explicit allowlist `select`
   (`apps/api/src/modules/servers/select.ts`), not a blocklist, so a new field
   accidentally added to the model can't leak by omission.
5. When an SSH-backed operation runs (metrics, Docker/PM2 discovery, log
   fetch, restart, git info), the key is decrypted in-memory for the duration
   of that single operation only (`apps/api/src/modules/ssh/server-credentials.ts`)
   and is never logged, cached, or written anywhere else.

### The master encryption key

`SSH_MASTER_ENCRYPTION_KEY` is a 32-byte key (hex or base64) that lives only
in the API's environment — **it is never stored in Postgres.** If it's lost,
every encrypted SSH key becomes permanently unrecoverable; if it's
compromised, every encrypted SSH key must be treated as compromised (rotate
all of them). Back it up somewhere outside the database (a password manager
or secrets store), not alongside it.

The API validates this key at boot (`apps/api/src/modules/crypto/master-key.ts`)
and **refuses to start** if it's missing or not exactly 32 bytes. This is
deliberate: there is no safe fallback behavior for "start anyway without a
valid encryption key."

## Host key verification: trust-on-first-connect (TOFU)

**The tradeoff, stated plainly:** Watchtower does not ship with your servers'
host key fingerprints pre-configured, because there's no way for it to know
them in advance. It uses trust-on-first-connect:

- The **first** time you connect to a server (Test Connection or Save), the
  presented host key is accepted and its SHA256 fingerprint is stored on the
  `Server` row (`sshHostKeyFingerprint`).
- **Every subsequent connection** verifies the presented host key against that
  stored fingerprint. If it doesn't match, the connection is refused with an
  explicit `SSH_HOST_KEY_MISMATCH`-style error — Watchtower does **not**
  silently reconnect or overwrite the trusted fingerprint.
- If you legitimately rotate a server's host key (reinstall, restore from
  snapshot, etc.), open the server's **Edit** page and click **Re-trust host
  key**. This clears the stored fingerprint through an authenticated,
  project-admin-only API call (`POST /servers/:id/retrust-host-key`) and writes
  a `server.host_key.retrust` entry to the audit log that records the
  fingerprint it replaced. The next connection pins whatever key the server
  presents, so confirm the new fingerprint out-of-band first if you can.

**Why TOFU instead of requiring you to paste the fingerprint upfront:** for a
single-operator internal tool where you're usually adding servers you already
control (freshly provisioned droplets, VMs you just SSH'd into once already),
requiring out-of-band fingerprint verification before every first connection
is friction that provides limited benefit — you already implicitly trust the
network path when you provisioned the box. TOFU is the same trust model
OpenSSH's own `~/.ssh/known_hosts` uses by default. The risk TOFU doesn't
protect against is a man-in-the-middle on that very first connection; if
that's a concern for a specific server, verify the fingerprint out-of-band
(e.g. via your cloud provider's console) and compare it manually before
trusting the app's first connection.

## Setting up a dedicated `monitor` user

**Do not use `root` for the SSH account Watchtower connects with**, even
though the app will happily accept it. Set up a dedicated, restricted user
instead. This is a manual step — Watchtower never modifies your servers on
its own; you run these commands yourself.

```bash
# On the target server, as root or an existing sudo user:
adduser --disabled-password --gecos "" monitor

# Generate a dedicated keypair locally (do NOT reuse your personal key):
ssh-keygen -t ed25519 -f ~/.ssh/watchtower_monitor -C "watchtower-monitor"

# Install the public key for the monitor user:
mkdir -p /home/monitor/.ssh
cat watchtower_monitor.pub >> /home/monitor/.ssh/authorized_keys
chown -R monitor:monitor /home/monitor/.ssh
chmod 700 /home/monitor/.ssh
chmod 600 /home/monitor/.ssh/authorized_keys
```

Then lock the account down:

- **Disable password login for this user** (key-only): ensure
  `PasswordAuthentication no` is set globally in `/etc/ssh/sshd_config`, or use
  a `Match User monitor` block to disable it just for this account.
- **No root login** — this is a non-issue if you never grant `monitor` root,
  but also confirm `PermitRootLogin no` is set for the server generally as
  good practice independent of this app.
- **Read-only where possible**: `monitor` does not need to be able to write
  anywhere outside what's required for restarts (see below).

### Docker access

To let Watchtower discover and inspect Docker containers, `monitor` needs to
either be in the `docker` group or otherwise reach the Docker socket:

```bash
usermod -aG docker monitor
```

**Be clear-eyed about what this grants:** membership in the `docker` group is
equivalent to passwordless root on the host. Any user who can run
`docker run -v /:/host ...` can mount the host filesystem and read/write
anything as root inside that container. Watchtower's own Docker operations
are restricted to a fixed allowlist (list, inspect, logs, restart — never
`docker run` with arbitrary flags), but the `monitor` user's *capability* is
still full Docker access, because Docker doesn't support fine-grained
permission scoping at the socket level. If this risk is unacceptable for a
given server, don't grant `docker` group membership there and accept that
Docker discovery/restart won't work for that server — HTTP/TCP and
systemd-based monitoring don't need it.

### PM2 access

PM2 processes are typically managed under a specific user's PM2 daemon. For
`monitor` to see and restart them, either:
- Run the monitored app's PM2 processes under the `monitor` user itself, or
- Grant `monitor` access to another user's PM2 socket (more involved, and not
  recommended — prefer running apps under `monitor` or a shared service
  account if PM2 monitoring matters).

### systemd restart permission

`monitor` needs permission to restart specific units without a password.
Rather than granting broad sudo, scope it to exactly the units you configured
in Watchtower:

```bash
# /etc/sudoers.d/watchtower-monitor
monitor ALL=(root) NOPASSWD: /usr/bin/systemctl restart caddy.service
monitor ALL=(root) NOPASSWD: /usr/bin/systemctl restart my-api.service
```

List every unit explicitly — do not use a wildcard like
`/usr/bin/systemctl restart *`, which would let `monitor` restart *any* unit
on the box, including ones outside Watchtower's configured allowlist.

## Restart action safety recap

Every restart action (Docker, PM2, systemd) in Watchtower requires:
- An authenticated session
- A confirmation step in the UI (you must type the exact service name)
- Server-side validation that the container/process/unit name matches strict
  identifier rules before it's used in any command
- An `AuditLog` entry recording who restarted what and whether it succeeded

None of this replaces proper server-side access control — the `monitor` user
setup above is what actually limits blast radius if the app itself is ever
compromised or misused.
