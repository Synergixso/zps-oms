# Load and page-weight baseline (NFR-002, NFR-003)

Generated 2026-11-27T06:38:30.218Z against `http://localhost:3300` · 27 signed-in accounts (one per role) · 300 requests per level · host: 4 logical CPUs, 8 GiB RAM, win32 · database: local synthetic. Synthetic data only.

Request mix per 14 requests: dashboard ×4, tasks ×2, notifications, requests register, personnel register, Help, home, sign-in, health (live), health (readiness).

| Concurrent users | Group | Requests | Server errors | p50 ms | p95 ms | p99 ms | Max ms | Throughput (req/s) |
|--:|---|--:|--:|--:|--:|--:|--:|--:|
| 1 | app | 212 | 0 | 58 | 182 | 307 | 543 | 11.3 |
| 1 | public | 44 | 0 | 21 | 38 | 106 | 106 | 2.3 |
| 1 | health | 44 | 0 | 7 | 17 | 46 | 46 | 2.3 |
| 10 | app | 212 | 0 | 411 | 972 | 1194 | 1248 | 18.5 |
| 10 | public | 44 | 0 | 116 | 167 | 177 | 177 | 3.8 |
| 10 | health | 44 | 0 | 55 | 103 | 118 | 118 | 3.8 |
| 25 | app | 212 | 0 | 880 | 2589 | 2719 | 2769 | 19.4 |
| 25 | public | 44 | 0 | 155 | 225 | 410 | 410 | 4.0 |
| 25 | health | 44 | 0 | 105 | 206 | 272 | 272 | 4.0 |

## Page weight (HTML document, as role 03)

| Page | Status | Uncompressed KB | Gzip KB |
|---|--:|--:|--:|
| `/api/health?probe=live` | 200 | 0.1 | 0.1 |
| `/api/health` | 200 | 0.2 | 0.2 |
| `/` | 200 | 61.9 | 9.0 |
| `/login` | 200 | 46.2 | 7.6 |
| `/app` | 200 | 220.5 | 24.4 |
| `/app/tasks` | 200 | 88.0 | 11.9 |
| `/app/notifications` | 200 | 162.1 | 18.0 |
| `/app/requests` | 200 | 52.5 | 9.4 |
| `/app/personnel` | 200 | 131.0 | 15.6 |
| `/app/help` | 200 | 75.7 | 12.0 |

Scripts, styles and images are cached by the browser after the first visit (immutable, hashed file names) and are not included above.

## Budgets (provisional, development)

No server errors at any level; at 10 concurrent users p95 ≤ 1500 ms for back-office pages and ≤ 500 ms for the health probe. Production targets must be set from the Service's load model on the target infrastructure (NFR-002).

**Result: PASS**
