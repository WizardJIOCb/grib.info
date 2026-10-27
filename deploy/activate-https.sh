#!/usr/bin/env bash
set -euo pipefail
expected=82.146.42.213
for host in grib.info www.grib.info; do
  answers=$(getent ahostsv4 "$host" | awk '{print $1}' | sort -u)
  if [ "$answers" != "$expected" ]; then
    printf 'DNS is not ready for %s: %s\n' "$host" "$answers" >&2
    exit 1
  fi
done
# --nginx updates only the vhost matching these names. Existing ACME account is reused.
certbot --nginx --non-interactive --redirect --cert-name grib.info -d grib.info -d www.grib.info
nginx -t
systemctl reload nginx
curl --fail --silent --show-error --head https://grib.info/
