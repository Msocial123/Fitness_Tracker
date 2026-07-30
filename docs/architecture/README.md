# Application Architecture

## Current architecture

The inspected application is a monolithic Node.js/Express process:

```text
Browser
  └─ HTTP :5000
      └─ Express (`server/app.js`)
          ├─ static HTML/CSS/JavaScript from `public/`
          ├─ `/api/auth/*` routes
          ├─ Mongoose models defined inside the route file
          └─ MongoDB
```

The process connects to MongoDB during module initialization, retries forever
with a timer if connection fails, and calls `app.listen()`. Frontend pages use
relative API URLs and store a returned user object in browser `localStorage`.

No server-side session, JWT validation, WebSocket, background worker, file
upload, generated document, or required local-file write was found.

## Target architecture

```text
GitHub repository
  └─ GitHub Actions (hosted Ubuntu runner)
      ├─ OIDC → AWS STS → scoped plan/deploy role
      ├─ build/test Lambda container
      ├─ push immutable SHA image → ECR
      └─ Terraform → AWS

Browser
  └─ API Gateway HTTP API (`dev`, `$default` route)
      └─ Lambda alias `dev`
          └─ Lambda container, Node.js 22
              ├─ Express static frontend
              ├─ authenticated JSON API
              ├─ DynamoDB repositories
              └─ sanitized JSON logs → CloudWatch

Terraform state
  └─ private, encrypted, versioned S3 bucket
      └─ native `.tflock` state lock
```

## Component responsibilities

### API Gateway HTTP API

- Own the public HTTPS endpoint.
- Forward the `$default` route to one Lambda integration.
- Apply stage/route throttling.
- Produce access logs without sensitive request bodies.
- Keep frontend and API same-origin during the first release.
- Add explicit CORS only if frontend hosting is later separated.

HTTP API is preferred over REST API because the required feature set is simple
proxy routing without usage plans, API keys, request transformation, or REST
API-specific features.

### Lambda

- Use one function for the current monolith.
- Run outside a customer VPC after DynamoDB cutover.
- Use 512 MB as a starting point and tune from duration/cold-start metrics.
- Use a 15–20 second function timeout, below the HTTP API's 30-second limit.
- Set reserved concurrency to 2 in `dev`.
- Do not configure provisioned concurrency.
- Publish versions and point alias `dev` at the deployed version.

### Express application boundaries

```text
server/app.js
  Creates middleware/routes/static handling and exports `app`.
  Does not connect, listen, or start retry timers.

server/local.js
  Initializes the selected repository/database and calls `app.listen()`.

server/lambda.js
  Initializes shared clients outside the invocation path and exports `handler`.

server/repositories/*
  Encapsulates persistence operations so routes do not know MongoDB/DynamoDB.
```

The handler and SDK clients are initialized outside the handler where safe.
Lambda may reuse an execution environment, so this reduces cold-path work. Code
must still work correctly when no reuse occurs.

### DynamoDB access model

#### Users

- Table: `fitness-tracker-dev-users`
- Partition key: `email`
- Normalize email before access.
- Register with a conditional put using `attribute_not_exists(email)`.
- Store a password hash only if custom authentication remains.

#### Workouts

- Table: `fitness-tracker-dev-workouts`
- Partition key: `userEmail`
- Sort key: `date#workoutId`
- Query by authenticated subject, newest or oldest first.
- Support `Limit` and `LastEvaluatedKey` pagination.

#### Metrics

- Table: `fitness-tracker-dev-metrics`
- Partition key: `userEmail`
- Sort key: `date#metricId`
- Latest metric uses descending query with `Limit=1`.

#### Plans

- Table: `fitness-tracker-dev-plans`
- Partition key: `planId`
- GSI: `trainer-created-index`
- GSI partition key: `trainerEmail`
- GSI sort key: `createdAt#planId`
- Update/delete includes a trainer ownership condition.

The first version does not create a client index because the current application
does not query plans by client. Add indexes only for proven access patterns.

## Request flows

### Static page

```text
GET /pages/progress.html
  → API Gateway
  → Lambda/Express
  → immutable file bundled in container
  → browser
```

### Authenticated data read

```text
GET /api/workouts?limit=20
  → validate bearer token
  → derive user email from verified subject (not URL input)
  → DynamoDB Query
  → return items + opaque pagination cursor
```

### Direct file upload, if later required

```text
Browser → API requests presigned URL → Lambda
Browser → direct PUT → S3
API → DynamoDB stores owner/key/type/size/checksum only
```

No uploads bucket is part of the initial architecture because no current feature
requires object storage.

## Health and error behavior

- `GET /health` returns `200`, environment, version/commit, and a timestamp.
- Liveness does not make a database call.
- Optional readiness diagnostics remain protected and are not used for public
  deployment checks.
- Validation failures return `400`; authentication `401`; authorization `403`;
  missing entities `404`; conditional conflicts `409`; unexpected failures
  return a generic `500` with a request ID.
- Stack traces and database details are logged securely but never returned to
  clients in production.

## Static frontend evolution

Phase one keeps assets in Lambda to reduce migration scope. A later optimization
can use private S3 behind CloudFront:

```text
CloudFront
  ├─ default behavior → private S3 origin
  └─ `/api/*` → API Gateway origin
```

That later phase must cover origin access control, cache policies, invalidation,
security headers, SPA/page routing behavior, and deployment ordering.

## Compatibility constraints

- API Gateway HTTP API maximum integration duration is 30 seconds.
- HTTP API payload size is 10 MB.
- Lambda code must not rely on process lifetime or persistent local disk.
- Lambda container image and ECR repository must be in `ap-south-1`.
- The image must target one architecture; initial target is Linux AMD64.
- MongoDB transition must not introduce a NAT Gateway merely to obtain static
  egress. If Atlas cannot be securely reached, cut over to DynamoDB first.

## Deferred architecture

Not included in the first release:

- CloudFront/S3 frontend
- user file uploads
- WebSockets
- asynchronous job processing
- multi-region deployment
- DynamoDB global tables
- provisioned concurrency
- WAF/custom domain
- full distributed tracing
- single-table DynamoDB redesign
