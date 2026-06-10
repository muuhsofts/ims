#!/bin/bash

echo "========================================="
echo "Deploying Shop App to Kubernetes"
echo "========================================="

# Build Docker image
echo "Building Docker image..."
docker build -t mudhihirdocker/shop-app:latest .

# Push to Docker Hub
echo "Pushing to Docker Hub..."
docker push mudhihirdocker/shop-app:latest

# Create namespace
echo "Creating namespace..."
kubectl create namespace shop-app

# Apply secrets
echo "Applying secrets..."
kubectl apply -f k8s/secrets.yaml

# Deploy MySQL
echo "Deploying MySQL..."
kubectl apply -f k8s/mysql-deployment.yaml

# Deploy Redis
echo "Deploying Redis..."
kubectl apply -f k8s/redis-deployment.yaml

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
sleep 30

# Deploy Shop App
echo "Deploying Shop App..."
kubectl apply -f k8s/shop-app-deployment.yaml

# Deploy HPA
echo "Deploying HPA..."
kubectl apply -f k8s/hpa.yaml

# Check status
echo "========================================="
echo "Deployment Status:"
kubectl get pods -n shop-app
kubectl get services -n shop-app

echo "========================================="
echo "To get external IP:"
echo "kubectl get services -n shop-app"
echo "========================================="