# Load and page-weight baseline (NFR-002, NFR-003)

Generated 2026-11-26T20:04:49.160Z against `http://localhost:3300` · 27 signed-in accounts (one per role) · 300 requests per level · host: 4 logical CPUs, 8 GiB RAM, win32 · database: local synthetic. Synthetic data only.

Request mix per 14 requests: dashboard ×4, tasks ×2, notifications, requests register, personnel register, Help, home, sign-in, health (live), health (readiness).

| Concurrent users | Group | Requests | Server errors | p50 ms | p95 ms | p99 ms | Max ms | Throughput (req/s) |
|--:|---|--:|--:|--:|--:|--:|--:|--:|
| 1 | app | 212 | 0 | 43 | 137 | 180 | 191 | 15.9 |
| 1 | public | 44 | 0 | 11 | 19 | 28 | 28 | 3.3 |
| 1 | health | 44 | 0 | 6 | 11 | 12 | 12 | 3.3 |
| 10 | app | 212 | 0 | 385 | 919 | 1070 | 1081 | 19.8 |
| 10 | public | 44 | 0 | 83 | 145 | 173 | 173 | 4.1 |
| 10 | health | 44 | 0 | 54 | 86 | 120 | 120 | 4.1 |
| 25 | app | 212 | 0 | 1058 | 3065 | 3180 | 3208 | 17.3 |
| 25 | public | 44 | 0 | 132 | 238 | 361 | 361 | 3.6 |
| 25 | health | 44 | 0 | 112 | 230 | 380 | 380 | 3.6 |

## Page weight (HTML document, as role 03)

| Page | Status | Uncompressed KB | Gzip KB |
|---|--:|--:|--:|
| `/api/health?probe=live` | 200 | 0.1 | 0.1 |
| `/api/health` | 200 | 0.2 | 0.2 |
| `/` | 200 | 61.8 | 9.1 |
| `/login` | 200 | 46.1 | 7.6 |
| `/app` | 200 | 217.8 | 24.1 |
| `/app/tasks` | 200 | 85.4 | 11.8 |
| `/app/notifications` | 200 | 159.5 | 17.7 |
| `/app/requests` | 200 | 50.0 | 9.1 |
| `/app/personnel` | 200 | 128.4 | 15.6 |
| `/app/help` | 200 | 70.8 | 11.7 |

Scripts, styles and images are cached by the browser after the first visit (immutable, hashed file names) and are not included above.

## Budgets (provisional, development)

No server errors at any level; at 10 concurrent users p95 ≤ 1500 ms for back-office pages and ≤ 500 ms for the health probe. Production targets must be set from the Service's load model on the target infrastructure (NFR-002).

**Result: PASS**
