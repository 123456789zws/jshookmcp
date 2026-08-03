export interface Config {
  puppeteer: PuppeteerConfig;
  mcp: MCPConfig;
  cache: CacheConfig;
  paths: PathsConfig;
  performance: PerformanceConfig;
  search: SearchConfig;
  reverseEngineering: ReverseEngineeringConfig;
}

export interface PuppeteerConfig {
  headless: boolean;
  timeout: number;
  executablePath?: string;
  args?: string[];
  viewport?: { width: number; height: number };
  userAgent?: string;
  maxCollectedUrls?: number;
  maxFilesPerCollect?: number;
  maxTotalContentSize?: number;
  maxSingleFileSize?: number;
}

export interface MCPConfig {
  name: string;
  version: string;
  browserSessionQueueMaxPending: number;
  browserSessionQueueMaxPendingPerSession: number;
  browserSessionQueueWaitTimeoutMs: number;
  browserSessionSchedulerQuantumMs: number;
  browserSessionSchedulerAgingMs: number;
  browserSessionExpectedConcurrency: number;
  browserSessionReservedPendingPerSession: number;
  browserSessionCostEwmaAlpha: number;
  browserFleetWorkerId: string;
  browserFleetWorkers: BrowserFleetWorkerConfig[];
  browserFleetVirtualNodes: number;
  browserFleetLeaseTtlMs: number;
  browserFleetMaxLocalLeases: number;
}

export interface BrowserFleetWorkerConfig {
  id: string;
  endpoint?: string;
  weight?: number;
  accepting?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  dir: string;
  ttl: number;
}

export interface PathsConfig {
  screenshotDir: string;
  captchaScreenshotDir: string;
  debuggerSessionsDir: string;
  extensionRegistryDir: string;
  tlsKeyLogDir: string;
  registryCacheDir: string;
}

export interface PerformanceConfig {
  maxConcurrentAnalysis: number;
  maxCodeSizeMB: number;
}

export interface SearchConfig {
  queryCategoryProfiles: SearchQueryCategoryProfileConfig[];
  cjkQueryAliases: SearchCjkQueryAliasConfig[];
  intentToolBoostRules: SearchIntentToolBoostRuleConfig[];
  vectorEnabled?: boolean;
  vectorModelId?: string;
  vectorCosineWeight?: number;
  vectorDynamicWeight?: boolean;
}

export interface SearchQueryCategoryProfileConfig {
  pattern: string;
  flags?: string;
  domainBoosts: Array<{
    domain: string;
    weight: number;
  }>;
}

export interface SearchCjkQueryAliasConfig {
  pattern: string;
  flags?: string;
  tokens: string[];
}

export interface SearchIntentToolBoostRuleConfig {
  pattern: string;
  flags?: string;
  boosts: Array<{
    tool: string;
    bonus: number;
  }>;
}

export interface ReverseEngineeringConfig {
  transformWorkbench: TransformWorkbenchConfig;
  reverseSession: ReverseSessionConfig;
  binaryMagic: BinaryMagicConfig;
  nativeEmulator: NativeEmulatorConfig;
  apk: ApkAnalysisConfig;
  jadx: JadxConfig;
  dex: DexAnalysisConfig;
  frida: FridaAnalysisConfig;
  androidRuntime: AndroidRuntimeConfig;
}

export interface TransformWorkbenchConfig {
  defaultPreviewBytes: number;
  maxPreviewBytes: number;
  textSampleBytes: number;
  maxInputBytes: number;
  maxOutputBytes: number;
  maxSteps: number;
}

export interface ReverseSessionConfig {
  maxInlineTransformInputBytes: number;
  promotedTransformPreviewBytes: number;
  runMaxSteps: number;
  evidenceRefSegmentMaxChars: number;
}

export interface BinaryMagicConfig {
  hintPrefixMaxBytes: number;
  dexMagicAscii: string;
  compactDexMagicAscii: string;
}

export interface NativeEmulatorConfig {
  cstringDefaultLimitBytes: number;
  cstringReadChunkBytes: number;
  guestPageSizeBytes: number;
  syscallCStringLimitBytes: number;
  rawMemoryMaxBytes: number;
  rawMemoryPreviewBytes: number;
}

export interface JadxConfig {
  /** Timeout for full APK decompile (jadx_decompile_apk), ms. */
  decompileTimeoutMs: number;
  /** Timeout for search-targeted decompile (jadx_search_code), ms. */
  searchTimeoutMs: number;
  /** Timeout for single-class decompile (jadx_decompile), ms. */
  singleClassTimeoutMs: number;
  /** JADX thread count (--threads-count / -j). */
  threadsCount: number;
}

export interface ApkAnalysisConfig {
  staticTriageMinEntries: number;
  staticTriageDefaultEntries: number;
  staticTriageMaxEntries: number;
  staticTriageAssetHintLimit: number;
  staticTriageNativeLibLimit: number;
  dexIntakeDefaultDexFiles: number;
  dexIntakeMaxDexFiles: number;
  dexIntakeManifestTextSampleBytes: number;
  dexIntakeManifestControlByteRatio: number;
  dexIntakeComponentLimit: number;
  dexIntakeFeatureLimit: number;
  dexIntakeUniqueLimitDefault: number;
}

export interface DexAnalysisConfig {
  scanDefaultMaxHits: number;
  scanMaxHits: number;
  scanMaxExtractBytes: number;
  artifactDefaultLimit: number;
  artifactMaxLimit: number;
  artifactMinReadBytes: number;
  artifactDefaultMaxFileBytes: number;
  artifactDefaultMaxTotalBytes: number;
  artifactMaxReadBytes: number;
  stringScanMaxBytes: number;
}

export interface FridaAnalysisConfig {
  dexDumpTimeoutMs: number;
  dexDumpMaxBufferBytes: number;
  dexDumpFileLimit: number;
}

export interface AndroidRuntimeConfig {
  mapsMaxBytes: number;
  mapsModuleLimit: number;
}
