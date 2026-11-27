# Load and page-weight baseline (NFR-002, NFR-003)

Generated 2026-11-27T11:21:18.477Z against `http://localhost:3300` · 27 signed-in accounts (one per role) · 300 requests per level · host: 4 logical CPUs, 8 GiB RAM, win32 · database: local synthetic. Synthetic data only.

Request mix per 14 requests: dashboard ×4, tasks ×2, notifications, requests register, personnel register, Help, home, sign-in, health (live), health (readiness).

| Concurrent users | Group | Requests | Server errors | p50 ms | p95 ms | p99 ms | Max ms | Throughput (req/s) |
|--:|---|--:|--:|--:|--:|--:|--:|--:|
| 1 | app | 212 | 0 | 50 | 150 | 172 | 183 | 14.2 |
| 1 | public | 44 | 0 | 18 | 31 | 51 | 51 | 2.9 |
| 1 | health | 44 | 0 | 6 | 11 | 21 | 21 | 2.9 |
| 10 | app | 212 | 0 | 429 | 998 | 1130 | 1200 | 17.7 |
| 10 | public | 44 | 0 | 133 | 199 | 213 | 213 | 3.7 |
| 10 | health | 44 | 0 | 59 | 108 | 119 | 119 | 3.7 |
| 25 | app | 212 | 0 | 921 | 2766 | 2851 | 2932 | 18.5 |
| 25 | public | 44 | 0 | 168 | 277 | 280 | 280 | 3.8 |
| 25 | health | 44 | 0 | 99 | 222 | 261 | 261 | 3.8 |

## Page weight (HTML document, as role 03)

| Page | Status | Uncompressed KB | Gzip KB |
|---|--:|--:|--:|
| `/api/health?probe=live` | 200 | 0.1 | 0.1 |
| `/api/health` | 200 | 0.2 | 0.2 |
| `/` | 200 | 61.9 | 9.0 |
| `/login` | 200 | 46.2 | 7.6 |
| `/app` | 200 | 220.7 | 24.5 |
| `/app/tasks` | 200 | 88.2 | 12.2 |
| `/app/notifications` | 200 | 162.3 | 17.6 |
| `/app/requests` | 200 | 54.1 | 9.7 |
| `/app/personnel` | 200 | 131.2 | 15.6 |
| `/app/help` | 200 | 75.9 | 12.7 |

Scripts, styles and images are cached by the browser after the first visit (immutable, hashed file names) and are not included above.

## Budgets (provisional, development)

No server errors at any level; at 10 concurrent users p95 ≤ 1500 ms for back-office pages and ≤ 500 ms for the health probe. Production targets must be set from the Service's load model on the target infrastructure (NFR-002).

**Result: PASS**
