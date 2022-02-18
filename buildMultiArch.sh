#!/bin/bash
npm i -g pnpm 
pnpm i
pnpm run build

docker tag poly-volca-web rafaelpernil/poly-volca-web
docker buildx build --push --platform linux/arm/v7,linux/arm64,linux/amd64  --tag rafaelpernil/poly-volca-web .
#docker push rafaelpernil/poly-volca-web