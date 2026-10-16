# 🎓 Dezinet Google Meet Technical Interview Cheat Sheet
## Word-for-Word Speaking Script & Demonstration Guide for TrustSeal

---

## ⏱️ 1. The 60-Second Elevator Pitch
*(When the interviewer says: "Introduce yourself and walk us through your project.")*

> **Say this with confidence:**
>
> *"Hi! I'm a computer science engineering student focusing on backend and distributed systems. 
> 
> When preparing for this interview, I researched Dezinet's engineering pillars and noticed that your core products involve high-throughput microservices, event streaming, and tamper-proof digital certificates like offer letters and college NOCs.
> 
> Instead of building a generic tutorial to-do app, I engineered **TrustSeal**: a production-grade, event-driven digital credential issuance and verification platform. 
> 
> It solves three key production challenges:
> 1. First, it eliminates the **Dual-Write Problem** using the **PostgreSQL ACID Transactional Outbox Pattern**, ensuring no events are lost if Kafka or the network fails.
> 2. Second, it uses **Apache Kafka** to asynchronously decouple cryptographic sealing and audit notifications from the API gateway.
> 3. Third, it provides sub-2ms public QR code verification lookups using **Redis Cache-Aside**, backed by an internal **gRPC microservice** using Protocol Buffers to detect unauthorized tampering.
> 
> The entire system is built with **TypeScript & Next.js 15**, containerized with **Docker**, and automated through a multi-stage **GitLab CI/CD** pipeline ready for GCP."*

---

## 🖥️ 2. The 3-Minute Live Screen Share Walkthrough
*(When the interviewer says: "Can you share your screen and demo it?")*

### Step 1: Show the Automated Test Suite (30 seconds)
Open your terminal in VS Code and run:
```bash
npm test
```
* **What to say:** *"Before showing the UI, I'd like to show our automated pipeline tests. This verifies the atomic outbox transaction, the cryptographic SHA-256 seal, gRPC anti-tamper detection, Kafka outbox dispatch, and confirms our Redis cache achieves sub-millisecond retrieval."*
* Point to the terminal output: `ALL 5 TESTS PASSED SUCCESSFULLY! 100% PRODUCTION READY`.

### Step 2: Show the Admin Control Plane (1 minute)
Open `http://localhost:3000/dashboard` in your browser.
* Point to the 4 metric cards:
  * Total Credentials Issued (PostgreSQL)
  * ACID Outbox Sync (100% data consistency)
  * Kafka Event Stream (Active)
  * Redis QR Lookups (< 2 ms)
* Enter a candidate's name (e.g. `Rahul Sharma`, `rahul@college.edu`) and click **"Issue Certificate & Commit Outbox"**.
* **What to say:** *"Notice that when I click submit, two things happen atomically inside a single PostgreSQL transaction: the certificate is inserted into `credentials` and an event is inserted into `outbox_events`. Immediately, our Outbox Relay daemon polls the event, publishes it to the Kafka topic `credential.issued`, and you can see it appear in real time on the live event stream monitor on the right."*

### Step 3: Show Public QR Verification & Tampering Detection (1.5 minutes)
Click **"Verify QR"** next to the newly issued certificate (opens `/verify/DEZI-2026-XXXX`).
* **What to say:** *"This is the public verification page that opens when an employer or university officer scans the physical QR code on the certificate."*
* Point to the top badge:
  * Show the **"AUTHENTIC & DIGITALLY VERIFIED"** badge.
  * Show the latency badge: **`Latency: 0.2 ms | Redis Cache HIT`**. Explain: *"Because certificates get sudden traffic spikes when shared on LinkedIn, Redis caches the verified record, shielding PostgreSQL from connection pool exhaustion."*
* **The Climax of the Interview:** Click the red button **"Simulate Tampering Attack"**:
  * The screen flashes with a bold red warning: **"TAMPERING DETECTED / INVALID SEAL"**.
  * **What to say:** *"Here, I'm simulating an attack where a fraudster edits the certificate details or signature. The gRPC Cryptographic Verification microservice immediately detects the checksum mismatch and flags the fraud."*

---

## 🧠 3. The Top 10 Technical Questions & Answers

### Q1: "What is the Dual-Write Problem and how does the Outbox Pattern solve it?"
> **Your Answer:**
> *"The Dual-Write Problem occurs when an application needs to update a database and publish a message to a broker like Kafka in response to a single request. 
> If we save to PostgreSQL first and then call Kafka, a network glitch or Kafka downtime causes a lost event—the certificate exists, but downstream services are never notified. If we publish to Kafka first and the database transaction fails, downstream services process a phantom event.
> The **Transactional Outbox Pattern** solves this by writing the business entity and an outbox event record into the **same PostgreSQL database within a single `BEGIN ... COMMIT` transaction**. Because PostgreSQL is ACID-compliant, both records succeed or fail together. A separate background relay worker polls the outbox table and publishes to Kafka with at-least-once delivery guarantees."*

### Q2: "Why use gRPC instead of standard REST for internal service communication?"
> **Your Answer:**
> *"For client-facing endpoints, we use REST and GraphQL because browsers natively support JSON and HTTP. 
> But for inter-service communication between our API Gateway and the Cryptographic Verification Service, gRPC is superior for three reasons:
> 1. **Binary Serialization:** Protocol Buffers serialize data into binary format, which is much smaller and orders of magnitude faster to serialize and parse than JSON text.
> 2. **HTTP/2 Multiplexing:** gRPC runs over HTTP/2, allowing multiple requests to share a single persistent TCP connection without head-of-line blocking.
> 3. **Strict Type Contracts:** The `.proto` file acts as a single source of truth for both client and server, preventing runtime schema mismatches."*

### Q3: "What happens if Kafka is temporarily down?"
> **Your Answer:**
> *"Because of the Outbox pattern, the API never fails user requests when Kafka is down. The certificate and outbox records are safely committed in PostgreSQL with status `PENDING`. Our Outbox Relay worker catches the broker connection error, leaves the records in `PENDING`, and retries with exponential backoff. The moment Kafka recovers, all pending events are published in their original order."*

### Q4: "How does your Kafka consumer handle duplicate messages (Idempotency)?"
> **Your Answer:**
> *"Kafka provides at-least-once delivery, meaning network retries can occasionally produce duplicates. To achieve idempotency, our consumer maintains a processed message registry. Before processing, the worker checks if the event ID already exists. If it does, the consumer simply acknowledges the message and skips re-execution, preventing duplicate actions."*

### Q5: "How does Redis Cache-Aside work and how do you handle cache invalidation?"
> **Your Answer:**
> *"When a verification request arrives, we first check Redis for `cert:<id>`. On a cache hit, we return the verified payload in under 2ms. On a cache miss, we read from PostgreSQL, invoke the gRPC crypto service to verify the signature, populate Redis with a 1-hour TTL, and return.
> If an admin revokes a certificate, our revocation handler publishes a `CredentialRevoked` event and immediately issues a `redis.del('cert:<id>')` cache eviction, guaranteeing stale data is never served."*

### Q6: "Why Next.js 15 App Router instead of a separate Express backend?"
> **Your Answer:**
> *"Next.js 15 with the App Router gives us a unified, type-safe architecture. We get React Server Components for fast initial page load (optimizing Core Web Vitals like LCP), native Route Handlers for high-throughput REST and GraphQL APIs, and seamless streaming via Server-Sent Events—all sharing the exact same TypeScript domain types without code duplication."*

### Q7: "How is tamper-proofing implemented cryptographically?"
> **Your Answer:**
> *"When a credential is created, we create a canonical JSON payload of the recipient's name, email, course/role, issuing organization, and issue timestamp. We compute an irreversible **SHA-256 cryptographic digest**. Then, using an HMAC secret key (or asymmetric private key), we generate a digital signature. Any modification of even one character in the recipient's name or date produces a completely different hash, which immediately fails HMAC verification in our gRPC microservice."*

### Q8: "Walk us through your GitLab CI/CD pipeline."
> **Your Answer:**
> *"Our `.gitlab-ci.yml` pipeline defines 4 automated stages:
> 1. **Lint & Typecheck:** Runs ESLint and strict TypeScript compiler check (`tsc --noEmit`).
> 2. **Unit Tests:** Executes our automated transaction and crypto validation test suite.
> 3. **Containerization:** Builds an optimized multi-stage Docker image using Node 22 Alpine to keep image size under 150MB.
> 4. **GCP Deployment:** Automatically pushes the image to Google Container Registry (GCR) and deploys to Google Cloud Run with zero downtime."*

### Q9: "Why expose a GraphQL API in addition to REST?"
> **Your Answer:**
> *"While our REST API is great for standard CRUD, our client applications often need nested relationships—for example, fetching a credential along with its complete audit history and outbox status in a single round-trip. GraphQL eliminates over-fetching and under-fetching by allowing clients to specify exactly the fields they need."*

### Q10: "If Dezinet scales to 10 million certificates per month, what would you optimize?"
> **Your Answer:**
> *"1. **Kafka Partitioning:** Partition topics by `recipient_organization_id` or `credential_id` hash so multiple consumer worker instances can process in parallel while preserving per-entity order.
> 2. **Change Data Capture (CDC) via Debezium:** Instead of polling the `outbox_events` table, attach Debezium to PostgreSQL's write-ahead log (WAL) to stream outbox records directly into Kafka with zero database query overhead.
> 3. **Redis Cluster:** Use Redis Sentinel or Redis Cluster with read replicas to handle global QR verification traffic distributed across regions."*

---

## 📁 4. The Code Tour (Which Files to Show in VS Code)

When the interviewer asks: *"Show me where you wrote..."*

| Topic | File to Open | What to Highlight |
|---|---|---|
| **ACID Outbox Transaction** | [`src/lib/db/index.ts`](file:///c:/dezinet/src/lib/db/index.ts) | Lines where `BEGIN`, `INSERT INTO credentials`, `INSERT INTO outbox_events`, and `COMMIT` are executed atomically. |
| **Outbox Relay Daemon** | [`src/lib/kafka/outbox-relay.ts`](file:///c:/dezinet/src/lib/kafka/outbox-relay.ts) | `processOutboxQueue()`: Polling pending events, publishing to Kafka, and marking `PUBLISHED`. |
| **gRPC Microservice & Proto** | [`proto/credential_verification.proto`](file:///c:/dezinet/proto/credential_verification.proto)<br/>[`services/grpc-crypto-service/server.ts`](file:///c:/dezinet/services/grpc-crypto-service/server.ts) | The Protobuf definition and the gRPC server implementation of `VerifyCredential`. |
| **Redis Cache-Aside** | [`src/lib/redis/index.ts`](file:///c:/dezinet/src/lib/redis/index.ts) | `getCachedCredential()` and `setCachedCredential()` with TTL. |
| **Verification Endpoint** | [`src/app/api/v1/credentials/[id]/verify/route.ts`](file:///c:/dezinet/src/app/api/v1/credentials/%5Bid%5D/verify/route.ts) | The pipeline order: Check Redis -> If Miss, DB -> gRPC verify -> Write Redis -> Return. |
| **GitLab CI/CD & Docker** | [`.gitlab-ci.yml`](file:///c:/dezinet/.gitlab-ci.yml)<br/>[`docker-compose.yml`](file:///c:/dezinet/docker-compose.yml) | 4 stages in GitLab CI and the 4 containerized services in Docker Compose. |
| **Automated Tests** | [`scripts/test-pipeline.ts`](file:///c:/dezinet/scripts/test-pipeline.ts) | The 5-stage automated test suite that validates the whole system. |
