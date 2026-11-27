# Load and page-weight baseline (NFR-002, NFR-003)

Generated 2026-11-27T22:11:26.800Z against `http://localhost:3300` · 31 signed-in accounts (one per role) · 300 requests per level · host: 4 logical CPUs, 8 GiB RAM, win32 · database: local synthetic. Synthetic data only.

Request mix per 14 requests: dashboard ×4, tasks ×2, notifications, requests register, personnel register, Help, home, sign-in, health (live), health (readiness).

| Concurrent users | Group | Requests | Server errors | p50 ms | p95 ms | p99 ms | Max ms | Throughput (req/s) |
|--:|---|--:|--:|--:|--:|--:|--:|--:|
| 1 | app | 212 | 0 | 53 | 182 | 254 | 316 | 13.3 |
| 1 | public | 44 | 0 | 14 | 26 | 35 | 35 | 2.8 |
| 1 | health | 44 | 0 | 6 | 11 | 12 | 12 | 2.8 |
| 10 | app | 212 | 0 | 398 | 885 | 1010 | 1098 | 19.3 |
| 10 | public | 44 | 0 | 113 | 145 | 178 | 178 | 4.0 |
| 10 | health | 44 | 0 | 53 | 98 | 107 | 107 | 4.0 |
| 25 | app | 212 | 0 | 1795 | 5414 | 6393 | 7542 | 10.5 |
| 25 | public | 44 | 0 | 212 | 432 | 525 | 525 | 2.2 |
| 25 | health | 44 | 0 | 187 | 555 | 755 | 755 | 2.2 |

## Page weight (HTML document, as role 03)

| Page | Status | Uncompressed KB | Gzip KB |
|---|--:|--:|--:|
| `/api/health?probe=live` | 200 | 0.1 | 0.1 |
| `/api/health` | 200 | 0.2 | 0.2 |
| `/` | 200 | 61.9 | 9.0 |
| `/login` | 200 | 46.2 | 7.6 |
| `/app` | 200 | 238.3 | 25.6 |
| `/app/tasks` | 200 | 93.8 | 12.6 |
| `/app/notifications` | 200 | 167.8 | 18.9 |
| `/app/requests` | 200 | 59.7 | 10.4 |
| `/app/personnel` | 200 | 136.8 | 16.6 |
| `/app/help` | 200 | 81.4 | 13.4 |

Scripts, styles and images are cached by the browser after the first visit (immutable, hashed file names) and are not included above.

## Budgets (provisional, development)

No server errors at any level; at 10 concurrent users p95 ≤ 1500 ms for back-office pages and ≤ 500 ms for the health probe. Production targets must be set from the Service's load model on the target infrastructure (NFR-002).

**Result: PASS**
