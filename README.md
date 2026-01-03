# bhvr-ecom

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **Hono RPC** - Type-safe API communication (✅ Implemented!)
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **Clean Architecture** - Separation of concerns with core business logic

## 📚 Documentation

- [Clean Architecture Guide](./docs/clean-architecture.md) - Understand the project structure
- [Hono RPC Guide](./docs/hono-rpc-guide.md) - **⭐ Start here for API usage**
- [Database Schema](./docs/database-schema.md) - Database structure reference

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

   ```bash
   bun run db:push
   ```

4. Seed the database with sample data (optional):

   ```bash
   bun run db:seed
   ```

## Docker Setup (Recommended)

This project includes Docker configuration for easy development and deployment.

### Prerequisites

- Docker and Docker Compose installed on your system

### Quick Start with Docker

1. **Clone and setup environment:**

   ```bash
   cp apps/server/.env.example apps/server/.env
   cp apps/web/.env.example apps/web/.env
   ```

2. **Update environment variables in `.env` files:**
   - Set `BETTER_AUTH_SECRET` to a secure random string
   - Other values are pre-configured for Docker

3. **Start the application:**

   ```bash
   bun run docker:dev
   ```

   This will:
   - Build the application container
   - Start PostgreSQL database
   - Run database migrations
   - Start both web (port 3000) and server (port 3001) applications

### Docker Commands

- `bun run docker:build` - Build the Docker images
- `bun run docker:up` - Start services in background
- `bun run docker:down` - Stop and remove containers
- `bun run docker:logs` - View container logs
- `bun run docker:dev` - Build and start for development

### Accessing the Application

- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:3001](http://localhost:3001)
- **Database**: localhost:5432 (accessible from host machine)

### Database Management

The PostgreSQL database is automatically created with:

- Database name: `bhvr_ecom`
- Username: `postgres`
- Password: `password`

To access the database directly:

```bash
docker-compose exec postgres psql -U postgres -d bhvr_ecom
```

Or use Drizzle Studio:

```bash
bun run db:studio
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the web application.
The API is running at [http://localhost:3001](http://localhost:3001).



## Project Structure

```bash
bhvr-ecom/
├── apps/
│   ├── web/                    # Frontend application (React + TanStack Router + Vite)
│   └── server/                 # Backend API (Hono + Better Auth)
├── packages/
│   ├── auth/                   # Better Auth configuration & client
│   ├── config/                 # Shared TypeScript configs
│   ├── db/                     # Database schema, migrations & scripts (Drizzle)
│   │   ├── scripts/            # Database initialization & seed scripts
│   │   └── src/schema/         # Drizzle schema definitions
│   └── env/                    # Environment variable validation (Zod)
├── docker-compose.yml          # Docker services (PostgreSQL + App)
├── Dockerfile                  # Multi-stage build for production
└── turbo.json                  # Turborepo configuration
```

## Beaver Stack Architecture

This project follows the **Beaver Stack** monorepo architecture:

- **`apps/`** - Deployable applications (web frontend, server backend)
- **`packages/`** - Shared libraries and configurations
  - Each package is independently versioned and can be used across apps
  - Database logic (`db`), auth (`auth`), and env validation (`env`) are centralized
- **Turborepo** - Orchestrates builds, dev servers, and caching
- **Type Safety** - End-to-end TypeScript with Zod validation
- **Database** - Drizzle ORM with PostgreSQL, migrations live in `packages/db`
- **Authentication** - Better Auth provides session management and OAuth

## Available Scripts

### Development

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps

### Database

- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate migrations from schema
- `bun run db:migrate`: Run migrations
- `bun run db:studio`: Open Drizzle Studio (database GUI)
- `bun run db:seed`: Seed database with sample data

### Docker

- `bun run docker:dev`: Build and start for development
- `bun run docker:up`: Start services in background
- `bun run docker:down`: Stop and remove containers
- `bun run docker:logs`: View container logs
- `bun run docker:build`: Build Docker images
