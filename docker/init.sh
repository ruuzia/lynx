#!/bin/sh

set -eu

echo "Waiting for MySQL..."

i=0
until [ $i -ge 10 ]
do
    nc -z mysql 3306 && break

    i=$(( i + 1 ))

    echo "$i: Sleeping 1 second ..."
    sleep 1
done

if [ $i -eq 10 ]
then
    echo "MySQL connection refused, terminating ..."
    exit 1
fi

echo "DB is up... Starting!"

/feline
