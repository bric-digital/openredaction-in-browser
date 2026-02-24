export { OpenRedaction } from './OpenRedaction.js';
export type { BrowserOpenRedactionOptions } from './OpenRedaction.js';
export { createBrowserRedactor } from './createBrowserRedactor.js';
export type { BrowserRedactor } from './createBrowserRedactor.js';

export type {
  PIIPattern,
  PIIDetection,
  PIIMatch,
  DetectionResult,
  OpenRedactionOptions,
  AIOptions,
  PresetName,
  RedactionMode,
  Validator
} from '../types.js';

export {
  allPatterns,
  personalPatterns,
  financialPatterns,
  governmentPatterns,
  contactPatterns,
  networkPatterns,
  getPatternsByCategory
} from '../patterns/index.js';

export {
  validateLuhn,
  validateIBAN,
  validateNINO,
  validateNHS,
  validateUKPassport,
  validateSSN,
  validateSortCode,
  validateName,
  validateEmail
} from '../validators/index.js';

export {
  gdprPreset,
  hipaaPreset,
  ccpaPreset,
  healthcarePreset,
  healthcareResearchPreset,
  financePreset,
  educationPreset,
  transportLogisticsPreset,
  getPreset
} from '../utils/presets.js';

export {
  extractContext,
  inferDocumentType,
  analyzeContextFeatures,
  calculateContextConfidence,
  analyzeFullContext
} from '../context/ContextAnalyzer.js';
export type {
  ContextAnalysis,
  ContextFeatures
} from '../context/ContextAnalyzer.js';

export {
  ContextRulesEngine,
  createContextRulesEngine,
  DEFAULT_PROXIMITY_RULES,
  DEFAULT_DOMAIN_VOCABULARIES
} from '../context/ContextRules.js';
export type {
  ProximityRule,
  DomainVocabulary,
  ContextRulesConfig
} from '../context/ContextRules.js';

export {
  SeverityClassifier,
  createSeverityClassifier,
  getSeverity,
  calculateRisk,
  DEFAULT_SEVERITY_MAP,
  SEVERITY_SCORES
} from '../severity/SeverityClassifier.js';
export type {
  SeverityLevel,
  SeverityClassification,
  RiskScore
} from '../severity/SeverityClassifier.js';

export {
  isFalsePositive,
  filterFalsePositives,
  commonFalsePositives
} from '../filters/FalsePositiveFilter.js';
export type {
  FalsePositiveRule
} from '../filters/FalsePositiveFilter.js';

export {
  groupPatternsByPass,
  mergePassDetections,
  createSimpleMultiPass,
  defaultPasses
} from '../multipass/MultiPassDetector.js';
export type {
  DetectionPass,
  MultiPassStats
} from '../multipass/MultiPassDetector.js';

export {
  OpenRedactionError,
  createInvalidPatternError,
  createValidationError,
  createHighMemoryError,
  createConfigLoadError,
  createLearningDisabledError,
  createOptimizationDisabledError,
  createMultiPassDisabledError,
  createCacheDisabledError
} from '../errors/OpenRedactionError.js';
export type {
  ErrorSuggestion
} from '../errors/OpenRedactionError.js';

export {
  safeExec,
  safeExecAll,
  validatePattern,
  isUnsafePattern,
  compileSafeRegex,
  RegexTimeoutError,
  RegexMaxMatchesError
} from '../utils/safe-regex.js';
export type {
  SafeRegexOptions
} from '../utils/safe-regex.js';

export { getAIEndpoint, callAIDetect, mergeAIEntities, validateAIEntity, detectionsOverlap, convertAIEntityToDetection } from '../utils/ai-assist.js';
export type { AIEntity, AIResponse } from '../utils/ai-assist.js';
