# Browser Build: Excluded Features

This file documents all functionality currently unavailable from the browser bundle (`src/index.browser.ts`).

## Browser-safe functionality that is available

- Core PII detection/redaction via browser `OpenRedaction` and `createBrowserRedactor`
- Full built-in pattern/rule set used by `CoreDetector`
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
  `LocalLearningStore`, `ConfigLoader`, `ConfigExporter`, `createConfigPreset`, `exportForVersionControl`, `ExportedConfig`
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

## Browser-only option constraints

- Constructor rejects:
  `configPath`, `enableLearning: true`, `enablePriorityOptimization: true`
- These are removed/ignored in browser-safe option normalization:
  `learningStorePath`, `optimizerOptions`

## Why these are excluded

- They depend on Node-only capabilities such as filesystem access, `worker_threads`, server runtime APIs, or CommonJS-only loading behavior that can pull `node:module`/`createRequire` into browser bundles.
