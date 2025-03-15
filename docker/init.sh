#!/bin/sh

set -e

mkdir -p /run/secrets

if [ -z "$LYNX_DB_PASSWORD" ]; then
  echo "Found LYNX_DP_PASSWORD"
  echo "$LYNX_DP_PASSWORD" > /run/secrets/db_password
fi

if [ -z "$LYNX_EMAIL_PASSWORD" ]; then
  echo "Found LYNX_EMAIL_PASSWORD"
  echo $LYNX_EMAIL_PASSWORD > /run/secrets/email_password
fi

if [ -z "$LYNX_JWT_SECRET" ]; then
  echo "Found LYNX_JWT_SECRET"
  echo $LYNX_JWT_SECRET > /run/secrets/jwt_secret
fi

/feline
