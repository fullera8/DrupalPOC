/**
 * Metadata Extractor
 *
 * Extracts structured metadata (tags, concepts, difficulty, etc.)
 * from memory text using rule-based patterns defined in
 * rules.config.json. Designed to align with the project's wiki
 * metadata schema (see DrupalPOC.wiki/Metadata-Legend.md).
 *
 * CRITICAL DESIGN RULE: This extractor uses ONLY deterministic
 * pattern matching. NO LLM inference. Tags are emitted only when
 * a literal keyword from rules.config.json is found in the content.
 * If nothing matches, the memory is tagged "untagged" — that is
 * correct behavior, not a failure.
 */

import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** A single pattern-keyed category: tag value → array of lowercase keywords. */
export interface PatternMap {
  [tagValue: string]: string[];
}

/** Typed representation of rules.config.json. */
export interface RulesConfig {
  schema_version: string;
  concept_patterns: PatternMap;
  responds_to_patterns: PatternMap;
  difficulty_patterns: PatternMap;
  difficulty_default: string;
  untagged_threshold: number;
}

/**
 * A metadata tag produced by the rule engine.
 * Shape matches MemoryTag in database.ts so tags flow directly
 * into storeMetadata() without transformation.
 */
export interface MetadataTag {
  tagType: string;
  tagValue: string;
  confidence: number;
  source: string;
}

// ---------------------------------------------------------------------------
// Config loader
// ---------------------------------------------------------------------------

const SUPPORTED_SCHEMA_VERSIONS = ["1.1"];

/**
 * Read, parse, and validate a rules.config.json file.
 *
 * @param configPath - Absolute or relative path to the JSON file.
 * @returns The typed RulesConfig object.
 * @throws If the file cannot be read, parsed, or has an unsupported schema version.
 */
export function loadRulesConfig(configPath: string): RulesConfig {
  const raw = readFileSync(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Invalid rules config: expected a JSON object at ${configPath}`);
  }

  const config = parsed as Record<string, unknown>;

  if (
    typeof config.schema_version !== "string" ||
    !SUPPORTED_SCHEMA_VERSIONS.includes(config.schema_version)
  ) {
    throw new Error(
      `Unsupported rules config schema_version "${String(config.schema_version)}". ` +
        `Supported: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}.`,
    );
  }

  return config as unknown as RulesConfig;
}

// ---------------------------------------------------------------------------
// Extraction engine
// ---------------------------------------------------------------------------

/**
 * Scan `content` against a PatternMap and return a MetadataTag for every
 * tag value whose keyword list contains at least one match.
 */
function matchPatterns(
  content: string,
  patterns: PatternMap,
  tagType: string,
): MetadataTag[] {
  const tags: MetadataTag[] = [];

  for (const [tagValue, keywords] of Object.entries(patterns)) {
    if (keywords.length === 0) continue;

    const matched = keywords.some((kw) => content.includes(kw));
    if (matched) {
      tags.push({
        tagType,
        tagValue,
        confidence: 1.0,
        source: "rule_engine",
      });
    }
  }

  return tags;
}

/**
 * Extract metadata tags from `content` using only deterministic,
 * rule-based pattern matching against the provided config.
 *
 * Returns an array of MetadataTag objects ready for storage via
 * database.storeMetadata().
 *
 * @param content - The raw memory text to analyze.
 * @param config  - A validated RulesConfig (from loadRulesConfig).
 */
export function extractMetadata(
  content: string,
  config: RulesConfig,
): MetadataTag[] {
  const lower = content.toLowerCase();
  const tags: MetadataTag[] = [];

  // --- Concept patterns (tagType = "CONCEPT") ---
  const conceptTags = matchPatterns(lower, config.concept_patterns, "CONCEPT");
  tags.push(...conceptTags);

  // --- Responds-to patterns (tagType = "RESPONDS_TO") ---
  tags.push(...matchPatterns(lower, config.responds_to_patterns, "RESPONDS_TO"));

  // --- Difficulty patterns (tagType = "DIFFICULTY") ---
  const difficultyTags = matchPatterns(lower, config.difficulty_patterns, "DIFFICULTY");

  if (difficultyTags.length === 0) {
    // No difficulty patterns matched — apply the configured default
    tags.push({
      tagType: "DIFFICULTY",
      tagValue: config.difficulty_default,
      confidence: 1.0,
      source: "rule_engine",
    });
  } else {
    tags.push(...difficultyTags);
  }

  // --- Untagged check: based on concept tag count ---
  if (conceptTags.length <= config.untagged_threshold) {
    tags.push({
      tagType: "METADATA_STATUS",
      tagValue: "untagged",
      confidence: 1.0,
      source: "rule_engine",
    });
  }

  return tags;
}
