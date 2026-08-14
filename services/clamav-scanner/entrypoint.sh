#!/bin/sh
set -eu

freshclam --config-file=/etc/clamav/freshclam.conf || {
  echo '{"level":"warn","event":"signature_update_failed_using_cached_database"}'
  test -f /var/lib/clamav/main.cvd -o -f /var/lib/clamav/main.cld
}

freshclam --config-file=/etc/clamav/freshclam.conf --daemon --foreground &
freshclam_pid=$!

clamd --config-file=/etc/clamav/clamd.conf &
clamd_pid=$!
trap 'kill "$clamd_pid" "$freshclam_pid" 2>/dev/null || true' EXIT INT TERM

attempt=0
until node -e "const n=require('net').connect(3310,'127.0.0.1',()=>n.end('zPING\\0'));n.setTimeout(1000,()=>process.exit(1));n.on('data',d=>process.exit(String(d).includes('PONG')?0:1));n.on('error',()=>process.exit(1))"; do
  attempt=$((attempt + 1))
  test "$attempt" -lt 60 || { echo 'ClamAV did not become ready.' >&2; exit 1; }
  sleep 1
done

exec node /service/server.mjs
