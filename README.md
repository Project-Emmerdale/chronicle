# Chronicle

Chronicle is a real-time journaling and chat-style application combining a TypeScript/React frontend with a Node.js backend and serverless components. The project demonstrates modern web tooling and integrates with Google Cloud services for deployment, streaming AI, and serverless functions.

Note: this repo contains placeholders like `YOUR-PROJECT-ID`; replace these with your Google Cloud related secrets before serving.

**Overview**

- Frontend: `apps/frontend-main` — Vite + React + TypeScript for the UI.
- Backend: `apps/backend-live-server` — Node.js + Express with Docker support and a WebSocket-based live API for streaming.
- Serverless: `functions/` — Firebase Cloud Functions for lightweight serverless endpoints and event-driven logic.

**Tech Stack**

- Language: TypeScript
- Frontend tooling: Vite, React
- Backend: Node.js, Express
- Real-time: WebSockets (backend relays streaming AI responses)
- Containerization: Docker (see `apps/backend-live-server/Dockerfile`)
- CI/CD: Google Cloud Build (`cloudbuild.yaml`) and Firebase deployments (`firebase.json`)

**Google Cloud Services & Infrastructure**

- Gemini Live: used for real-time generative AI streaming (proxy calls from the backend and forward streamed tokens to clients). Also other Google Cloud AI services are in use (like text to speech and generating text stories with a promt).
- Cloud Run: recommended hosting for the containerized backend (supports HTTP and WebSocket proxying patterns).
- Firebase Hosting + Cloud Functions: host static frontend and serverless endpoints (`functions/`).
- Cloud Storage: store uploaded assets or persistent blobs.
- IAM & Service Accounts: used for secure service authentication (see `apps/backend-live-server/src/service-account.ts`).
- Cloud Build: build pipelines for containers and deploy automation.

**Gemini Live Integration (high level)**

- Clients connect to the backend WebSocket server; the backend authenticates to Google and opens a streaming session to Gemini Live, then forwards partial tokens/events to the browser in real-time. This enables live conversation with AI.
- Proxying through the backend hides credentials, enables moderation, rate-limiting, and usage accounting when we would want to enable those features.

**Where to look in this repo**

- UI: `apps/frontend-main/src/`
- Backend live API & sockets: `apps/backend-live-server/src/live-api.ts`, `apps/backend-live-server/src/socket-server.ts`

If you want, I can expand this README into a dedicated `docs/` page with deployment commands, IAM role examples, and a small example of streaming Gemini Live code for the backend.