# Browser Build: Excluded Features

This file documents all functionality currently unavailable from the browser bundle (`src/index.browser.ts`).

## Browser-safe functionality that is available

- Core PII detection/redaction via browser `OpenRedaction` and `createBrowserRedactor`
- Full built-in pattern/rule set used by `CoreDetector`
- Config JSON encode/decode via `ConfigCodec` (`exportConfig`, `importConfig`, `exportToString`, `importFromString`, validation/merge helpers)
- Core types (`DetectionResult`, `PIIDetection`, `RedactionMode`, `OpenRedactionOptions`, etc.)
- Validators, presets, context analysis/rules, severity tools, false-positive helpers, multipass helpers, safe-regex helpers, AI assist helpers

## Not exported from browser entry (compared to Node entry)

- Audit module:
  `InMemoryAuditLogger`, `ConsoleAuditLogger`, `PersistentAuditLogger`, `createPersistentAuditLogger`,
  and audit backend/db types
- Metrics module:
  `InMemoryMetricsCollector`, `PrometheusServer`, `createPrometheusServer`, `GRAFANA_DASHBOARD_TEMPLATE`,
  and metrics server types
- RBAC module:
  `RBACManager`, `createRBACManager`, predefined roles/permissions exports
- Document processing module:
  `DocumentProcessor`, `OCRProcessor`, `JsonProcessor`, `CsvProcessor`, `XlsxProcessor`, and related document types
- Learning/config persistence module exports:
  `LocalLearningStore`, `ConfigLoader`, `ConfigExporter`, `createConfigPreset`, `exportForVersionControl`
  Note: `ConfigCodec` and `ExportedConfig` are browser-safe and exported in browser entry.
- NER module:
  `NERDetector`, `createNERDetector`, and NER types
- Priority optimization module:
  `PriorityOptimizer`, `createPriorityOptimizer`, optimizer types
- Streaming/batch/worker module exports:
  `StreamingDetector`, `BatchProcessor`, `WorkerPool`, `createWorkerPool`, and related types
- Explain/report module exports:
  `ExplainAPI`, `createExplainAPI`, `ReportGenerator`, `createReportGenerator`, and related types
- Server/integration modules:
  Express integration exports, tenancy exports, webhook exports, REST API server exports, health check exports

## Browser `OpenRedaction` methods intentionally unavailable

These methods throw clear browser-only errors (or return empty/null where documented):

- Throws browser-only error:
  `OpenRedaction.fromConfig`, `exportConfig`, `detectDocument`, `detectDocumentFile`,
  `OpenRedaction.detectBatch`, `OpenRedaction.detectDocumentsBatch`
- Learning disabled behavior:
  `recordFalsePositive`, `recordFalseNegative`, `recordCorrectDetection`, `importLearnings` throw `LEARNING_DISABLED`
  `getLearningStats` returns `null`
  `getLearnedWhitelist` returns `[]`
  `getPatternAdjustments` returns `[]`
  `exportLearnings` returns `null`
  `getLearningStore` returns `undefined`
- Priority optimizer disabled behavior:
  `optimizePriorities` throws `OPTIMIZATION_DISABLED`
  `getPatternStats` returns `null`
  `getPriorityOptimizer` returns `undefined`

### Additional class-surface drift vs Node `OpenRedaction`

These are present on the Node class but not implemented on the browser class:

- `getAuditLogger`, `getMetricsCollector`, `getRBACManager`
Reason: dependency removal (audit/metrics/RBAC modules are not exported in browser entry) and environment scope reduction for browser-only runtime.
- `explain`, `generateReport`
Reason: dependency removal (explain/report modules intentionally excluded from browser entry to keep browser surface and transitive imports Node-safe).
- `healthCheck`, `quickHealthCheck`
Reason: environment constraint (server/runtime health workflows are Node-oriented and excluded from browser build).

### Signature-level compatibility differences

These methods exist in both classes but browser signatures are intentionally narrower:

- `addToWhitelist(pattern)` in browser vs `addToWhitelist(pattern, confidence?)` in Node
Reason: dependency removal (learning-confidence integration is disabled without learning store persistence).
- `recordFalsePositive()`, `recordFalseNegative()`, `importLearnings()`, `exportLearnings()`
Reason: dependency removal (LocalLearningStore persistence and learning workflows are disabled in browser).
- `exportConfig()`, `detectDocument()`, `detectDocumentFile()`, `OpenRedaction.detectBatch()`, `OpenRedaction.detectDocumentsBatch()`
Reason: environment constraint and dependency removal (filesystem/document parsing/worker-thread features are Node-only).

## Browser-only option constraints

- Constructor rejects:
  `configPath`, `enableLearning: true`, `enablePriorityOptimization: true`
- These are removed/ignored in browser-safe option normalization:
  `learningStorePath`, `optimizerOptions`

### Options accepted by type but effectively inactive in browser

The browser options type extends core/node option shapes for compatibility, so some flags are accepted but do not activate equivalent runtime features in browser:

- Audit options: `enableAuditLog`, `auditLogger`, `auditUser`, `auditSessionId`, `auditMetadata`
Reason: dependency removal (audit module exports and browser class audit methods are excluded).
- Metrics options: `enableMetrics`, `metricsCollector`
Reason: dependency removal (metrics module exports and browser class metrics methods are excluded).
- RBAC options: `enableRBAC`, `rbacManager`, `role`
Reason: dependency removal and environment scope reduction (RBAC manager API is not exposed in browser class).

## Why these are excluded

- They depend on Node-only capabilities such as filesystem access, `worker_threads`, server runtime APIs, or CommonJS-only loading behavior that can pull `node:module`/`createRequire` into browser bundles.
