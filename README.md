# TrustSeal: Tamper-Proof Digital Credential & Verification Engine

[![Next.js 15](https://img.shields.io/badge/Next.js-15%2F16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Kafka](https://img.shields.io/badge/Apache-Kafka-red?style=for-the-badge&logo=apachekafka)](https://kafka.apache.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![gRPC](https://img.shields.io/badge/gRPC-mTLS-teal?style=for-the-badge&logo=grpc)](https://grpc.io/)
[![Redis](https://img.shields.io/badge/Redis-7-red?style=for-the-badge&logo=redis)](https://redis.io/)
[![GitLab CI](https://img.shields.io/badge/GitLab-CI%2FCD-orange?style=for-the-badge&logo=gitlab)](https://gitlab.com/)

---

## 📌 Executive Overview

**TrustSeal** is a high-throughput, event-driven digital credential and verification engine designed and built to meet the rigorous production engineering standards of **Dezinet Engineering Labs**. 

It eliminates the industry-wide **Dual-Write Problem** when issuing digital credentials (offer letters, internship experience letters, and university NOCs) using the **PostgreSQL ACID Transactional Outbox Pattern**. Furthermore, it guarantees sub-2ms public QR verification lookups using **Redis Cache-Aside** and ultra-low-latency inter-service cryptographic validation via **gRPC over Protocol Buffers**.

---

## 🏛️ Architectural Mapping: The 6 Dezinet Pillars

| Pillar # | Evaluated Requirement | TrustSeal Implementation | Primary Code References |
|:---:|---|---|---|
| **01** | **TypeScript & Next.js 15** | App Router (`app/`), Server Components, strict TypeScript interfaces, responsive Tailwind CSS interface. | [`src/app/page.tsx`](file:///c:/dezinet/src/app/page.tsx)<br/>[`src/app/dashboard/page.tsx`](file:///c:/dezinet/src/app/dashboard/page.tsx) |
| **02** | **GitLab CI/CD & GCP** | Multi-stage pipeline (`.gitlab-ci.yml`) for linting, testing, Docker image creation, and automated Google Cloud Run deployment. | [`.gitlab-ci.yml`](file:///c:/dezinet/.gitlab-ci.yml)<br/>[`Dockerfile`](file:///c:/dezinet/Dockerfile)<br/>[`docker-compose.yml`](file:///c:/dezinet/docker-compose.yml) |
| **03** | **Apache Kafka Streams** | Asynchronous decoupled event publishing (`credential.issued`, `credential.verified`) with resilient failover. | [`src/lib/kafka/index.ts`](file:///c:/dezinet/src/lib/kafka/index.ts) |
| **04** | **GraphQL & gRPC over mTLS** | **GraphQL:** Flexible client-facing queries for credentials and audit logs.<br/>**gRPC:** Internal microservice using Protocol Buffers (`.proto`) for fast cryptographic checksum validation. | [`proto/credential_verification.proto`](file:///c:/dezinet/proto/credential_verification.proto)<br/>[`services/grpc-crypto-service/server.ts`](file:///c:/dezinet/services/grpc-crypto-service/server.ts)<br/>[`src/app/api/graphql/route.ts`](file:///c:/dezinet/src/app/api/graphql/route.ts) |
| **05** | **PostgreSQL & ACID Outbox** | Relational schema with normalized tables (`credentials`, `outbox_events`, `audit_logs`). Atomic transaction guarantees zero lost events. | [`src/lib/db/schema.sql`](file:///c:/dezinet/src/lib/db/schema.sql)<br/>[`src/lib/db/index.ts`](file:///c:/dezinet/src/lib/db/index.ts)<br/>[`src/lib/kafka/outbox-relay.ts`](file:///c:/dezinet/src/lib/kafka/outbox-relay.ts) |
| **06** | **Real-Time WebSockets & Cache** | **Redis:** Cache-Aside lookups for public QR scans (sub-2ms response).<br/>**WebSockets/SSE:** Real-time push updates streaming Kafka events to the admin dashboard. | [`src/lib/redis/index.ts`](file:///c:/dezinet/src/lib/redis/index.ts)<br/>[`src/app/api/v1/events/stream/route.ts`](file:///c:/dezinet/src/app/api/v1/events/stream/route.ts) |

---

## 📐 System Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientTier["Client Tier"]
        AdminUser["Admin / Issuer<br/>(Dashboard)"]
        PublicScan["Public Verifier / Employer<br/>(QR Code Scan)"]
    end

    subgraph GatewayTier["Next.js 15 Gateway Layer"]
        AppRouter["Next.js App Router<br/>(React 19 / TypeScript)"]
        RESTAPI["REST Endpoints<br/>(/api/v1/credentials)"]
        GraphQLEndpoint["GraphQL Endpoint<br/>(/api/graphql)"]
        SSEStream["Live SSE Stream<br/>(/api/v1/events/stream)"]
    end

    subgraph StateTier["State & Persistence"]
        Postgres[(PostgreSQL 16<br/>Credentials + Outbox Events)]
        RedisCache[(Redis 7 Cache<br/>Verification Cache)]
    end

    subgraph EventTier["Distributed Event Streaming"]
        OutboxRelay["Outbox Relay Daemon<br/>(Poller-Publisher)"]
        KafkaBus["Apache Kafka Broker<br/>(KRaft / Topic: credential.issued)"]
    end

    subgraph MicroserviceTier["Internal Microservices"]
        GRPCServer["gRPC Crypto Service<br/>(Port 50051 / Protocol Buffers)"]
    end

    %% Flow lines
    AdminUser --> AppRouter
    PublicScan --> AppRouter
    AppRouter --> RESTAPI
    AppRouter --> GraphQLEndpoint

    RESTAPI -->|1. Atomic BEGIN...COMMIT| Postgres
    OutboxRelay -->|2. Poll Pending Outbox| Postgres
    OutboxRelay -->|3. Publish Event| KafkaBus
    KafkaBus -.->|Broadcast| SSEStream
    SSEStream -.->|Push to UI| AdminUser

    RESTAPI -->|Check Cache (Sub-2ms)| RedisCache
    RESTAPI -->|Verify Cryptographic Seal| GRPCServer
```

---

## 🚀 Quickstart & Running the Application

### 1. Run Automated Test Suite
Run the 5-point automated pipeline test (verifies Outbox transactions, cryptographic anti-tamper validation, Kafka relay, and Redis latency):
```bash
npm test
```

### 2. Run Locally in Development Mode
Start the Next.js 15 development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
* **Admin Dashboard:** `http://localhost:3000/dashboard`
* **Public QR Verification Demo:** `http://localhost:3000/verify/<credential-id>`
* **GraphQL Explorer:** `http://localhost:3000/api/graphql`

### 3. Run Standalone gRPC Microservice (Optional)
```bash
npm run grpc:server
```

### 4. Run Complete Multi-Container Fleet via Docker Compose
When Docker is installed:
```bash
docker-compose up --build
```

---

## 🛡️ Anti-Tamper Demonstration for Technical Interviews

1. Navigate to the **Admin Dashboard** (`/dashboard`).
2. Issue a digital certificate for a student (e.g. `Rahul Sharma`).
3. Observe the live Kafka event flash on screen in the real-time event monitor.
4. Click **"Verify QR"** to open the public verification certificate.
5. Notice the **Redis Cache HIT** badge and sub-2ms response time.
6. Click the red **"Simulate Tampering Attack"** button:
   * The gRPC cryptographic validation engine re-evaluates the SHA-256 seal and immediately flags the certificate as **forged/tampered**.

---

## 📖 Technical Interview Preparation
See the full interview script and answer bank in [**`INTERVIEW_CHEATSHEET.md`**](file:///c:/dezinet/INTERVIEW_CHEATSHEET.md).
