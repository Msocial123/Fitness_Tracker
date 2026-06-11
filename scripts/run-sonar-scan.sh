#!/bin/bash

SONAR_HOST=http://18.225.112.23:9000
SONAR_TOKEN=sqa_126a06a1a61a6a4316dd9f7b1308a196645087ce

docker run --rm \
-v $(pwd):/usr/src \
sonarsource/sonar-scanner-cli \
-Dsonar.projectKey=fitness-tracker \
-Dsonar.projectName=fitness-tracker \
-Dsonar.sources=. \
-Dsonar.sourceEncoding=UTF-8 \
-Dsonar.host.url=$SONAR_HOST \
-Dsonar.token=$SONAR_TOKEN
