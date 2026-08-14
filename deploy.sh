#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
zola build
rsync -a --delete public/ /srv/http/
echo "Deployed to /srv/http"
