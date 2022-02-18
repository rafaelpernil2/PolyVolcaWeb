#!/bin/bash
npm i -g pnpm 
pnpm i
pnpm run build
docker build -t poly-volca-web .
docker tag poly-volca-web rafaelpernil/poly-volca-web
docker push rafaelpernil/poly-volca-web

kubectl apply -f ./artifacts/deployment.yaml
kubectl apply -f ./artifacts/service.yaml

kubectl scale --replicas=0 deployment poly-volca-web -n openfaas-fn
kubectl scale --replicas=2 deployment poly-volca-web -n openfaas-fn