#!/bin/bash

# Productify Pro Deploy Script
# Deploys the application to Coolify/Docker

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          🚀 Productify Pro Deploy Script                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Parse arguments
DEPLOY_TARGET=${1:-local}
REGISTRY=${DOCKER_REGISTRY:-"ghcr.io/productifypro"}

echo -e "${YELLOW}Deploy target: ${DEPLOY_TARGET}${NC}"
echo ""

# Function to build Docker images
build_images() {
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"

    # Build API image
    echo -e "${BLUE}Building API image...${NC}"
    docker build -t ${REGISTRY}/api:latest -t ${REGISTRY}/api:$(git rev-parse --short HEAD) ./apps/backend
    echo -e "${GREEN}✓ API image built${NC}"

    # Build Landing image
    echo -e "${BLUE}Building Landing image...${NC}"
    docker build -t ${REGISTRY}/landing:latest -t ${REGISTRY}/landing:$(git rev-parse --short HEAD) ./apps/landing
    echo -e "${GREEN}✓ Landing image built${NC}"

    echo ""
}

# Function to push images
push_images() {
    echo -e "${YELLOW}📤 Pushing images to registry...${NC}"

    docker push ${REGISTRY}/api:latest
    docker push ${REGISTRY}/api:$(git rev-parse --short HEAD)
    docker push ${REGISTRY}/landing:latest
    docker push ${REGISTRY}/landing:$(git rev-parse --short HEAD)

    echo -e "${GREEN}✓ Images pushed to ${REGISTRY}${NC}"
    echo ""
}

# Function for local deployment
deploy_local() {
    echo -e "${YELLOW}🏠 Deploying locally with Docker Compose...${NC}"

    # Check if .env exists
    if [ ! -f ".env" ]; then
        echo -e "${RED}Error: .env file not found!${NC}"
        echo "Please create a .env file with required environment variables."
        echo "You can copy from .env.example: cp .env.example .env"
        exit 1
    fi

    # Start services
    docker-compose up -d

    echo -e "${GREEN}✓ Services started${NC}"
    echo ""

    # Wait for health checks
    echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
    sleep 10

    # Check status
    docker-compose ps

    echo ""
    echo -e "${GREEN}✓ Deployment complete!${NC}"
    echo ""
    echo "Services available at:"
    echo "  - API:     http://localhost:8000"
    echo "  - Landing: http://localhost:3000"
    echo "  - API Docs: http://localhost:8000/docs"
}

# Function for production deployment
deploy_production() {
    echo -e "${YELLOW}🌐 Deploying to production...${NC}"

    # Build and push images
    build_images
    push_images

    echo -e "${GREEN}✓ Images ready for deployment${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Go to your Coolify dashboard"
    echo "  2. Update the service to use the new image tag"
    echo "  3. Or use Coolify's auto-deploy if configured"
    echo ""
    echo "Or deploy manually with:"
    echo "  docker-compose -f docker-compose.prod.yml up -d"
}

# Function for Coolify webhook deployment
deploy_coolify() {
    if [ -z "$COOLIFY_WEBHOOK_URL" ]; then
        echo -e "${RED}Error: COOLIFY_WEBHOOK_URL not set${NC}"
        exit 1
    fi

    echo -e "${YELLOW}🔄 Triggering Coolify deployment...${NC}"

    curl -X POST "$COOLIFY_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"ref": "main"}'

    echo -e "${GREEN}✓ Coolify deployment triggered${NC}"
}

# Main logic
case $DEPLOY_TARGET in
    local)
        build_images
        deploy_local
        ;;
    production|prod)
        deploy_production
        ;;
    coolify)
        deploy_coolify
        ;;
    build)
        build_images
        ;;
    push)
        push_images
        ;;
    *)
        echo "Usage: $0 [local|production|coolify|build|push]"
        echo ""
        echo "Options:"
        echo "  local       - Build and deploy locally with Docker Compose"
        echo "  production  - Build, push images, and prepare for production"
        echo "  coolify     - Trigger Coolify webhook deployment"
        echo "  build       - Only build Docker images"
        echo "  push        - Only push images to registry"
        exit 1
        ;;
esac
