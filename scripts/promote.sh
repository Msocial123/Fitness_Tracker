#!/bin/bash

SOURCE_TAG=$1
TARGET_TAG=$2

IMAGE="himalayat/fitness_tracker-fitness-app"

docker pull $IMAGE:$SOURCE_TAG

docker tag \
$IMAGE:$SOURCE_TAG \
$IMAGE:$TARGET_TAG

docker push $IMAGE:$TARGET_TAG

echo "Promoted $SOURCE_TAG to $TARGET_TAG"
