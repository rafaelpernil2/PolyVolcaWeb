#!/bin/bash
kubectl apply -f ./artifacts/deployment.yaml
kubectl apply -f ./artifacts/service.yaml

kubectl scale --replicas=0 deployment poly-volca-web -n openfaas-fn
kubectl scale --replicas=2 deployment poly-volca-web -n openfaas-fn