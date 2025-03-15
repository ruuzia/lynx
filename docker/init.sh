#!/bin/sh

set -eu

mkdir -p /run/secrets

if [-v LYNX_DB_PASSWORD ]; then
  echo $LYNX_DP_PASSWORD > /run/secrets/db_password
fi

if [-v LYNX_EMAIL_PASSWORD ]; then
  echo $LYNX_EMAIL_PASSWORD > /run/secrets/email_password
fi

if [-v LYNX_JWT_SECRET ]; then
  echo $LYNX_JWT_SECRET > /run/secrets/jwt_secret
fi

/feline
