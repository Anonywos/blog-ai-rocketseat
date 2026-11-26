# Blog AI Node.js

This project is a Node.js API for turning blog post ideas into complete Markdown drafts with a Mastra agent. It stores posts in PostgreSQL and provides routes to publish or reject them. The AI model can be selected through an environment variable.

## 🚀 Technologies

- Node.js 24 (see `.nvmrc`)
- JavaScript (ES modules)
- Mastra
- OpenAI or Google Gemini
- Zod
- PostgreSQL and node-postgres (`pg`)
- Postgrator CLI
- Docker and Docker Compose
- Oxlint, Oxfmt, Lefthook, lint-staged, and Commitlint

## 🎯 Requirements

### Functional Requirements

- [x] Generate a post draft from an idea using a configurable AI model
- [x] Store posts in PostgreSQL
- [x] List published posts
- [x] List all posts when a valid API key is provided
- [x] Retrieve a published post by ID
- [x] Approve a post
- [x] Reject a post without deleting its database record

### Business Rules

- [x] A draft must contain a title and Markdown content
- [x] New posts start without approval, publication, or rejection dates
- [x] Public listing and retrieval return only approved, non-rejected posts
- [x] `GET /posts?include=all` requires a valid Bearer API key and returns `403` otherwise
- [x] Approval sets `approved_at` and `published_at` and clears `rejected_at`
- [x] Rejection sets `rejected_at` and clears `approved_at` and `published_at`

### Non-functional Requirements

- [x] Store data in PostgreSQL using `pg`
- [x] Manage database schema with Postgrator migrations
- [x] Package the API in a Docker image
- [x] Configure the model, database, and API key through environment variables

## 📚 What I learned

- Creating an AI agent with Mastra and validating structured output with Zod
- Switching AI models through configuration
- Building a small Node.js HTTP router with path and query parameters
- Persisting posts with node-postgres and managing schema changes with migrations
- Running PostgreSQL with Docker Compose and packaging a Node.js API with Docker
- Using lint, formatting, Git hooks, and Conventional Commits in a Node.js project

## 📌 API Routes

All routes return JSON. A post contains `id`, `title`, `content`, `published_at`, `created_at`, `approved_at`, and `rejected_at`. PostgreSQL sets the timestamps. The last three status timestamps are initially `null`.

### List published posts

GET /posts

Returns posts with `approved_at` set and `rejected_at` unset.

### List all posts

_Requires a valid Bearer API key_

GET /posts?include=all

Header: `Authorization: Bearer <POSTS_API_KEY>`

Returns published, draft, and rejected posts. A missing or invalid key returns `403`.

### View a published post

GET /posts/:id

Returns `404` if the ID does not exist or the post is not currently published.

### Create a draft

POST /posts/draft

Example body:

```json
{ "idea": "How to care for houseplants" }
```

The agent generates the title and Markdown content. The new draft is returned with status `201`.

### Approve a post

PATCH /posts/:id/approve

Sets `approved_at` and `published_at` to the current time and clears `rejected_at`. Returns `404` if the ID does not exist.

### Reject a post

DELETE /posts/:id/reject

Sets `rejected_at` to the current time and clears `approved_at` and `published_at`. The record remains in the database. Returns `404` if the ID does not exist.

Currently, only the all-posts listing checks an API key. Draft creation, approval, and rejection have no authentication. Restrict access to these routes before exposing the API publicly.

## ⚙️ How to run

Use Node.js 24, npm, Docker, and Docker Compose. Run the commands below from the project root. In PowerShell, run each command separately.

### Install dependencies and create the environment file

```powershell
npm install
npm run env:setup
```

Edit `.env.local` before starting the application. The main variables are:

| Variable                            | Purpose                                                               |
| ----------------------------------- | --------------------------------------------------------------------- |
| `API_HOST`                          | Interface to listen on; `localhost` locally, `0.0.0.0` in a container |
| `API_PORT`                          | HTTP port, `8080` in the example                                      |
| `API_PROTOCOL`                      | Protocol displayed in the startup log                                 |
| `DATABASE_URL`                      | PostgreSQL connection URL                                             |
| `POST_MODEL`                        | AI model identifier                                                   |
| `OPENAI_API_KEY` / `GOOGLE_API_KEY` | Key for the selected model provider                                   |
| `POSTS_API_KEY`                     | Bearer key for `GET /posts?include=all`                               |

For Gemini 2.5 Flash, set `POST_MODEL=google/gemini-2.5-flash` and `GOOGLE_API_KEY`. For the default OpenAI model, use `POST_MODEL=openai/gpt-4o-mini` and `OPENAI_API_KEY`. Provider pricing and availability may change. Keep environment files with credentials out of version control.

### Start the database

```powershell
npm run infra:up
```

Compose starts PostgreSQL 17 on `127.0.0.1:5432` with the database, user, and password shown in `.env.example`. The `postgres_data` volume preserves data when the database is stopped.

### Run database migrations

```powershell
npm run db:migrate
```

`npm run db:migrate:down` rolls back all migrations and removes the `posts` table and its data. `npm run infra:down` stops the database. `npm run local:setup` combines environment file creation, database startup, and migrations; use it only before customizing `.env.local` because the setup script copies `.env.example`.

### Start the application

```powershell
npm run dev
```

The API is available at `http://localhost:8080` with the example configuration. To check the public listing in another PowerShell terminal:

```powershell
Invoke-RestMethod http://localhost:8080/posts
```

## 🐳 Docker build and local run

Build the API image:

```powershell
npm run build
```

This runs `docker build -t blog-ai-nodejs .`. The image uses Node.js 24, installs production dependencies, and listens on port `8080`. Local environment files and `node_modules` are excluded from the build context.

After starting the database and applying migrations, run the API on the Compose network:

```powershell
docker run --rm --name blog-ai-nodejs --network blog-ai-nodejs_default --env-file .env.local -e API_HOST=0.0.0.0 -e API_PORT=8080 -e DATABASE_URL=postgresql://postgres:sua_senha@postgres:5432/blog_ai -p 8080:8080 blog-ai-nodejs
```

Run `docker network ls` if your Compose project uses a different network name. The database host is `postgres` on this network; `localhost` inside the API container refers to the API container. Adjust the connection URL if you changed the database credentials. Test with `Invoke-RestMethod http://localhost:8080/posts` in another terminal. Press Ctrl+C to stop the container.

## 📦 Production deployment

1. Provision a PostgreSQL database reachable from the API. Prepare a production environment file containing `DATABASE_URL`, `POST_MODEL`, the selected provider's API key, and `POSTS_API_KEY`. Set `API_HOST=0.0.0.0` and `API_PORT=8080`. Do not add the file to the image or repository.
2. Run migrations before deploying. `npm run db:migrate` reads `.env.local` and requires `postgrator-cli`, which is a development dependency and is absent from the production image. Run it in a deployment environment with development dependencies installed and the production database URL configured in `.env.local`.
3. Build, tag, and push the image to your registry:

   ```powershell
   npm run build
   docker tag blog-ai-nodejs YOUR_USER/blog-ai-nodejs:VERSION
   docker push YOUR_USER/blog-ai-nodejs:VERSION
   ```

4. Pull and run the image on the server:

   ```powershell
   docker pull YOUR_USER/blog-ai-nodejs:VERSION
   docker run -d --restart unless-stopped --name blog-ai-nodejs --env-file .env.production -p 8080:8080 YOUR_USER/blog-ai-nodejs:VERSION
   ```

`DATABASE_URL` must use an address reachable from the container. Adjust the published port and external access for your hosting environment.

## 🛠️ Development checks

```powershell
npm run lint
npm run format:check
```

`npm run format` applies Oxfmt formatting. Lefthook and lint-staged run checks on staged JavaScript files before commits. Commitlint checks Conventional Commits messages. The project does not currently define automated test scripts.
