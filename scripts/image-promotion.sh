#!/bin/bash

SOURCE_IMAGE=$1
TARGET_IMAGE=$2

docker pull $SOURCE_IMAGE
docker tag $SOURCE_IMAGE $TARGET_IMAGE
docker push $TARGET_IMAGE

echo "Promotion successful"
