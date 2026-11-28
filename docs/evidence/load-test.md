# Load and page-weight baseline (NFR-002, NFR-003)

Generated 2026-11-28T15:32:25.441Z against `http://localhost:3300` · 31 signed-in accounts (one per role) · 300 requests per level · host: 4 logical CPUs, 8 GiB RAM, win32 · database: local synthetic. Synthetic data only.

Request mix per 14 requests: dashboard ×4, tasks ×2, notifications, requests register, personnel register, Help, home, sign-in, health (live), health (readiness).

| Concurrent users | Group | Requests | Server errors | p50 ms | p95 ms | p99 ms | Max ms | Throughput (req/s) |
|--:|---|--:|--:|--:|--:|--:|--:|--:|
| 1 | app | 212 | 0 | 73 | 233 | 332 | 419 | 9.4 |
| 1 | public | 44 | 0 | 21 | 62 | 76 | 76 | 2.0 |
| 1 | health | 44 | 0 | 8 | 31 | 55 | 55 | 2.0 |
| 10 | app | 212 | 0 | 578 | 1285 | 1573 | 1628 | 13.4 |
| 10 | public | 44 | 0 | 159 | 205 | 300 | 300 | 2.8 |
| 10 | health | 44 | 0 | 78 | 137 | 144 | 144 | 2.8 |
| 25 | app | 212 | 0 | 1580 | 4683 | 4983 | 5184 | 12.0 |
| 25 | public | 44 | 0 | 222 | 432 | 445 | 445 | 2.5 |
| 25 | health | 44 | 0 | 153 | 355 | 431 | 431 | 2.5 |

## Page weight (HTML document, as role 03)

| Page | Status | Uncompressed KB | Gzip KB |
|---|--:|--:|--:|
| `/api/health?probe=live` | 200 | 0.1 | 0.1 |
| `/api/health` | 200 | 0.2 | 0.2 |
| `/` | 200 | 62.1 | 9.0 |
| `/login` | 200 | 46.6 | 7.7 |
| `/app` | 200 | 256.9 | 27.3 |
| `/app/tasks` | 200 | 97.4 | 13.3 |
| `/app/notifications` | 200 | 171.2 | 18.9 |
| `/app/requests` | 200 | 63.3 | 11.3 |
| `/app/personnel` | 200 | 141.8 | 17.0 |
| `/app/help` | 200 | 85.1 | 13.9 |

Scripts, styles and images are cached by the browser after the first visit (immutable, hashed file names) and are not included above.

## Budgets (provisional, development)

No server errors at any level; at 10 concurrent users p95 ≤ 1500 ms for back-office pages and ≤ 500 ms for the health probe. Production targets must be set from the Service's load model on the target infrastructure (NFR-002).

**Result: PASS**
