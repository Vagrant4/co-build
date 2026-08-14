FROM node:22-bookworm-slim

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends clamav clamav-daemon ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /service
COPY clamd.conf /etc/clamav/clamd.conf
COPY freshclam.conf /etc/clamav/freshclam.conf
COPY server.mjs entrypoint.sh ./
RUN chmod 0755 /service/entrypoint.sh \
  && mkdir -p /run/clamav /var/lib/clamav \
  && chown -R clamav:clamav /run/clamav /var/lib/clamav

ENV PORT=8080 \
    MAX_SCAN_BYTES=16777216 \
    SCAN_TIMEOUT_MS=15000 \
    CLAMD_HOST=127.0.0.1 \
    CLAMD_PORT=3310

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/service/entrypoint.sh"]
