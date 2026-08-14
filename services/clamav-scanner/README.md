# SpaceOnCall Private ClamAV Scanner

This container provides an authenticated malware-scanning boundary for private SpaceOnCall uploads. It streams bytes directly to a localhost-only ClamAV daemon and does not persist customer files.

## Security Boundary

- `GET /health` is public and returns only `ok` or `degraded`.
- `POST /scan` requires `Authorization: Bearer <SCANNER_TOKEN>`.
- `SCANNER_TOKEN` must be a random value of at least 32 characters.
- The HTTP service accepts at most 16 MiB by default and caps configuration at 25 MiB.
- ClamAV TCP is bound to `127.0.0.1`; never expose port `3310` publicly.
- Production SpaceOnCall calls require HTTPS.
- Scan failures fail closed. The application deletes the rejected Blob object and marks the upload rejected.
- Virus signatures refresh automatically through `freshclam`.

## Local Verification

```powershell
docker build -t spaceoncall-clamav services/clamav-scanner
$token = [Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
docker run --rm -p 8080:8080 -e SCANNER_TOKEN=$token spaceoncall-clamav
```

In another terminal:

```powershell
$env:MALWARE_SCANNER_URL="http://127.0.0.1:8080/scan"
$env:MALWARE_SCANNER_TOKEN=$token
$env:ALLOW_LOCAL_SCANNER_HTTP="true"
npm.cmd run scanner:verify
```

The verification sends one harmless text control and the standard harmless EICAR antivirus test string. Success requires the clean control to pass and EICAR to be detected.

## Container Host Setup

Deploy `services/clamav-scanner/Dockerfile` to a private container host with at least 1 GiB RAM, persistent outbound internet access for signature updates, HTTPS termination, and automatic restart. Configure only:

- `SCANNER_TOKEN`: generated random secret, at least 32 characters.
- `MAX_SCAN_BYTES=16777216`
- `SCAN_TIMEOUT_MS=15000`

Expose HTTP port `8080`. Do not expose ClamAV port `3310`.

After deployment:

1. Run `npm.cmd run scanner:verify` against the HTTPS scanner URL.
2. Add the same URL and token to Vercel as `MALWARE_SCANNER_URL` and `MALWARE_SCANNER_TOKEN` for Production and Preview.
3. Set `ALLOW_UNSCANNED_UPLOADS=false`.
4. Redeploy SpaceOnCall.
5. Upload a harmless JPG through a pilot account and verify its database `scanStatus` becomes `SAFE`.

Hosting activation can incur a recurring charge and requires owner approval. Do not deploy to a paid plan automatically.
