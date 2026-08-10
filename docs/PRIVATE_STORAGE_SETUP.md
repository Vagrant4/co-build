# Private Storage Setup

## Vercel Owner Steps

1. Open the Co-Build Vercel project and choose **Storage**.
2. Create a Blob store with access set to **Private**. Do not choose Public.
3. Connect the store to Preview first. Prefer Vercel's OIDC-connected Blob credentials. Do not copy a Blob token into chat, Git, screenshots, CI, or logs.
4. Set `REAL_UPLOADS_ENABLED=false`, `MAX_UPLOAD_BYTES=15728640`, and `ALLOW_UNSCANNED_UPLOADS=false` in Preview.
5. Deploy and confirm `/api/cron/maintenance` passes its private write/read/delete smoke check. The operation runs inside Vercel and does not require duplicating the Blob credential in GitHub.
6. Test a renter upload, authorized renter/host/admin download, unrelated-user denial, and deletion.
7. Decide how malware scanning will be handled. Until a privacy-appropriate scanner is configured, files stay `scanStatus=PENDING` and downloads are blocked unless the owner explicitly sets `ALLOW_UNSCANNED_UPLOADS=true` and records that pilot risk acceptance.
8. Only after those checks, set `REAL_UPLOADS_ENABLED=true` for the approved environment.

## Implemented Boundary

- Browser requests a reservation from `/api/uploads/reserve`.
- The server derives identity from the session and creates one immutable pathname.
- `/api/uploads/authorize` issues a five-minute token limited to that pathname, MIME set, and size.
- The browser uploads directly to Private Blob.
- The callback reads the object privately, verifies magic bytes, extension, MIME, dimensions, size, and SHA-256, then marks the record available.
- `/api/uploads/[uploadId]` rechecks ownership and streams with `private, no-store`, `nosniff`, sandbox, and attachment headers.
- Local `LEGACY_DEMO` rows are never served.

## Default Limits

| Type | Formats | Maximum |
| --- | --- | --- |
| Verification | PDF, JPEG, PNG | 10 MiB |
| Listing/check-in/check-out photo | JPEG, PNG, WebP | 12 MiB |
| Floor plan | PDF, JPEG, PNG | 15 MiB |
| Payment/dispute evidence | PDF, JPEG, PNG | 10 MiB |
| Contract | PDF | 10 MiB |

`MAX_UPLOAD_BYTES` can lower the global ceiling but cannot raise a category limit.

## Cleanup

Dry run:

```powershell
npm.cmd run uploads:cleanup
```

Execute only after reviewing counts:

```powershell
npm.cmd run uploads:cleanup -- --execute
```
