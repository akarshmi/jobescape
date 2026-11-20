#!/usr/bin/env bash
# Set up JobEscape on a fresh Ubuntu server (Oracle Cloud, Hetzner, DigitalOcean, ...).
#   APP_DOMAIN=jobs.example.com API_DOMAIN=api.jobs.example.com ACME_EMAIL=you@example.com bash setup-ubuntu.sh
# Run it from inside a clone of the repo, or it will clone one for you.
set -euo pipefail

: "${APP_DOMAIN:?Set APP_DOMAIN}"
: "${API_DOMAIN:?Set API_DOMAIN}"
: "${ACME_EMAIL:?Set ACME_EMAIL}"

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi

if [ ! -f cloud/vps/docker-compose.yml ]; then
  echo "==> Cloning JobEscape"
  git clone https://github.com/akarshmi/jobescape.git
  cd jobescape
fi

echo "==> Opening ports 80 and 443 in the server firewall"
if command -v ufw >/dev/null 2>&1 && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
elif command -v iptables >/dev/null 2>&1; then
  # Oracle Cloud Ubuntu images ship with restrictive iptables rules.
  sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
  sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
  if command -v netfilter-persistent >/dev/null 2>&1; then sudo netfilter-persistent save; fi
fi

echo "==> Writing cloud/vps/.env"
cat > cloud/vps/.env <<ENV
APP_DOMAIN=${APP_DOMAIN}
API_DOMAIN=${API_DOMAIN}
ACME_EMAIL=${ACME_EMAIL}
ALLOWED_IPS=${ALLOWED_IPS:-0.0.0.0/0 ::/0}
ENV

echo "==> Building and starting (first build takes a few minutes)"
sudo docker compose -f cloud/vps/docker-compose.yml --project-directory cloud/vps up -d --build

echo
echo "Done. Open https://${APP_DOMAIN} once DNS for ${APP_DOMAIN} and ${API_DOMAIN} points at this server."
echo "Reminder: also allow ports 80 and 443 in your cloud provider's network/security rules."
echo "JobEscape has no login. Set ALLOWED_IPS in cloud/vps/.env to restrict access."
