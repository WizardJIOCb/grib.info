#!/usr/bin/env bash
# A bounded, one-time deployment dependency; exits after success or timeout.
set -euo pipefail
end=$((SECONDS + 28800))
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
while [ "$SECONDS" -lt "$end" ]; do
  ready=1
  for host in grib.info www.grib.info; do
    matches=0
    for resolver in 1.1.1.1 8.8.8.8 9.9.9.9; do
      answers=$(dig +time=3 +tries=1 +short A "$host" @"$resolver" | sort -u) || answers=''
      if [ "$answers" = 82.146.42.213 ]; then matches=$((matches + 1)); fi
    done
    if [ "$matches" -lt 2 ]; then ready=0; fi
  done
  if [ "$ready" -eq 1 ]; then
    printf 'Public DNS is ready; activating HTTPS once.\n'
    exec bash "$script_dir/activate-https.sh"
  fi
  printf 'Waiting for public DNS delegation for grib.info and www.grib.info.\n'
  sleep 30
done
printf 'DNS did not become ready within 8 hours; no certificate request was made.\n' >&2
exit 124
