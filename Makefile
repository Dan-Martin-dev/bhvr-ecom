.PHONY: help install dev build start clean db-push db-seed db-reset docker-up docker-down docker-restart logs check

# Colors for better readability
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@echo "$(BLUE)BHVR E-commerce - Development Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(CYAN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	bun install

dev: ## Start development servers (server + web)
	@echo "$(BLUE)Starting development servers...$(NC)"
	bun run dev

check: ## Run TypeScript type checking
	@echo "$(BLUE)Checking types...$(NC)"
	bun run check-types

test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	bun run test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	bun run test:watch

##@ Database

db-push: ## Push database schema changes
	@echo "$(BLUE)Pushing database schema...$(NC)"
	bun run db:push

db-seed: ## Seed database with sample data
	@echo "$(BLUE)Seeding database...$(NC)"
	bun run db:seed

db-reset: ## Reset database (drop + push + seed)
	@echo "$(YELLOW)Resetting database...$(NC)"
	bun run db:push
	bun run db:seed

db-setup: docker-up db-push db-seed ## Complete database setup (docker + push + seed)
	@echo "$(GREEN)Database setup complete!$(NC)"

##@ Docker

docker-up: ## Start Docker services (PostgreSQL + Redis)
	@echo "$(BLUE)Starting Docker services...$(NC)"
	docker-compose up -d

docker-down: ## Stop Docker services
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	docker-compose down

docker-restart: docker-down docker-up ## Restart Docker services
	@echo "$(GREEN)Docker services restarted$(NC)"

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-clean: ## Stop and remove Docker volumes
	@echo "$(YELLOW)Cleaning Docker volumes...$(NC)"
	docker-compose down -v

##@ Production

build: ## Build all apps for production
	@echo "$(BLUE)Building for production...$(NC)"
	bun run build

start: ## Start production servers
	@echo "$(BLUE)Starting production servers...$(NC)"
	bun run start

##@ Utilities

clean: ## Clean build artifacts and caches
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf apps/server/dist
	rm -rf apps/web/dist
	rm -rf .turbo
	rm -rf apps/server/.turbo
	rm -rf apps/web/.turbo
	rm -rf packages/*/dist
	rm -rf packages/*/.turbo

git-commit: ## Quick commit with lazy-git script
	@echo "$(BLUE)Running lazy-git...$(NC)"
	bash scripts/lazy-git.sh

logs: ## Show recent logs from all services
	@echo "$(BLUE)Showing logs...$(NC)"
	docker-compose logs --tail=50 -f

##@ Quick Start

setup: install docker-up db-push db-seed ## Complete setup (install + docker + database)
	@echo "$(GREEN)✓ Setup complete! Run 'make dev' to start development$(NC)"

restart: docker-restart dev ## Restart everything (docker + dev servers)
	@echo "$(GREEN)✓ Restarted$(NC)"
