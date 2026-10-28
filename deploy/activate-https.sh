#!/usr/bin/env bash
set -euo pipefail
expected=82.146.42.213
for host in grib.info www.grib.info; do
  matches=0
  for resolver in 1.1.1.1 8.8.8.8 9.9.9.9; do
    answers=$(dig +time=3 +tries=1 +short A "$host" @"$resolver" | sort -u) || answers=''
    if [ "$answers" = "$expected" ]; then matches=$((matches + 1)); fi
  done
  if [ "$matches" -lt 2 ]; then
    printf 'DNS is not ready for %s: only %s of 3 public resolvers agree\n' "$host" "$matches" >&2
    exit 1
  fi
done
# --nginx updates only the vhost matching these names. Existing ACME account is reused.
certbot --nginx --non-interactive --redirect --cert-name grib.info -d grib.info -d www.grib.info
nginx -t
systemctl reload nginx
curl --fail --silent --show-error --head https://grib.info/
