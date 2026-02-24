# Browser Port Plan: Node Built-in Imports in `packages/core/src`

## Scope
Searched `packages/core/src` for direct imports/requires/usages of:
- `fs`
- `path`
- `os`
- `crypto`
- `worker_threads`
- `node:*`
- `createRequire`

## Direct Node Built-in Imports (by file)

| File | Direct Node built-in usage | Import chain from `packages/core/src/index.ts` |
|---|---|---|
| `packages/core/src/audit/PersistentAuditLogger.ts` | `import { createHash } from 'crypto'` | No chain found |
| `packages/core/src/cli/index.ts` | `import * as fs from 'fs'` | No chain found |
| `packages/core/src/config/ConfigExporter.ts` | `const fs = await import('fs/promises')` | `index.ts -> detector.ts -> config/ConfigExporter.ts` |
| `packages/core/src/config/ConfigLoader.ts` | `import * as fs from 'fs'`; `import * as path from 'path'` | `index.ts -> config/ConfigLoader.ts` |
| `packages/core/src/detector.ts` | `const fs = await import('fs/promises')` | `index.ts -> detector.ts` |
| `packages/core/src/learning/LocalLearningStore.ts` | `import * as fs from 'fs'`; `import * as path from 'path'` | `index.ts -> learning/LocalLearningStore.ts` |
| `packages/core/src/webhooks/WebhookManager.ts` | `const crypto = require('crypto')` | No chain found |
| `packages/core/src/workers/WorkerPool.ts` | `import { Worker } from 'worker_threads'`; `import { cpus } from 'os'`; `import { join } from 'path'` | `index.ts -> detector.ts -> workers/index.ts -> workers/WorkerPool.ts` |
| `packages/core/src/workers/worker.ts` | `import { parentPort } from 'worker_threads'` | No chain found |

## Additional findings
- No direct `node:*` specifier imports were found in `packages/core/src`.
- No `createRequire` usage was found in `packages/core/src`.
