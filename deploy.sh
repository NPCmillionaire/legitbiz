#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
zola build
chmod -R u=rwX,go=rX public
# cgi-bin and .well-known are managed by cPanel; leave them alone.
rsync -az --delete --exclude cgi-bin --exclude .well-known "$@" public/ webhost:legitbiz.xyz/
echo "Deployed to legitbiz.xyz"
