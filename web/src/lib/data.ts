// Loads the nine exported files from /data/ (see notebooks/data-contract.md) and builds the lookups
// the app needs. Nothing here computes results; the numbers all come from the files.

import {
  REGIONS,
  SCHEMA_VERSION,
  type Candidate,
  type CandidatesFile,
  type EvidenceFile,
  type Fire,
  type FiresFile,
  type GapsFile,
  type Meta,
  type Q1File,
  type Q2File,
  type Q3File,
  type Region,
  type StaticFiresFile,
} from "@/types/data";

export const DATA_FILES = {
  meta: "meta.json",
  candidates: "candidates.json",
  fires: "fires.json",
  staticFires: "static_fires.json",
  q1: "q1_layouts.json",
  q2: "q2_coverage.json",
  q3: "q3_halls.json",
  gaps: "gaps.json",
  evidence: "evidence.json",
} as const;

export interface DataFiles {
  meta: Meta;
  candidates: CandidatesFile;
  fires: FiresFile;
  staticFires: StaticFiresFile;
  q1: Q1File;
  q2: Q2File;
  q3: Q3File;
  gaps: GapsFile;
  evidence: EvidenceFile;
}

export interface AppData extends DataFiles {
  /** Candidate for a cand_id. */
  candidatesById: Map<number, Candidate>;
  /** Scored fires grouped by fire centre. */
  firesByRegion: Record<Region, Fire[]>;
  /** cand_ids of the existing fire halls. */
  hallIds: number[];
}

/** Minimal shape of `fetch`, so tests can pass a fake. */
export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Throws a readable error unless the file carries the schema version this app was built for. */
export function checkSchemaVersion(fileName: string, file: unknown): void {
  const found = (file as { schema_version?: unknown } | null)?.schema_version;
  if (found !== SCHEMA_VERSION) {
    throw new Error(
      `${fileName} has schema_version ${JSON.stringify(found ?? null)}, but this app needs ${SCHEMA_VERSION}. ` +
        "Re-run notebook 06a to export the data again.",
    );
  }
}

async function loadFile(fileName: string, fetcher: Fetcher): Promise<unknown> {
  let response: Awaited<ReturnType<Fetcher>>;
  try {
    response = await fetcher(`/data/${fileName}`);
  } catch {
    throw new Error(`Could not load ${fileName}: the request failed.`);
  }
  if (!response.ok) {
    throw new Error(`Could not load ${fileName} (HTTP ${response.status}).`);
  }
  let file: unknown;
  try {
    file = await response.json();
  } catch {
    throw new Error(`${fileName} is not valid JSON.`);
  }
  checkSchemaVersion(fileName, file);
  return file;
}

/** Adds the derived lookups to the nine files. */
export function withLookups(files: DataFiles): AppData {
  const candidatesById = new Map(files.candidates.candidates.map((candidate) => [candidate.cand_id, candidate]));
  const firesByRegion = Object.fromEntries(REGIONS.map((region) => [region, [] as Fire[]])) as Record<Region, Fire[]>;
  for (const fire of files.fires.fires) firesByRegion[fire.region].push(fire);
  const hallIds = files.candidates.candidates
    .filter((candidate) => candidate.kind === "hall")
    .map((candidate) => candidate.cand_id);
  return { ...files, candidatesById, firesByRegion, hallIds };
}

/** Fetches all nine files in parallel. Rejects with a readable message if any is missing or outdated. */
export async function loadData(fetcher: Fetcher = fetch): Promise<AppData> {
  const keys = Object.keys(DATA_FILES) as (keyof DataFiles)[];
  const files = await Promise.all(keys.map((key) => loadFile(DATA_FILES[key], fetcher)));
  return withLookups(Object.fromEntries(keys.map((key, index) => [key, files[index]])) as unknown as DataFiles);
}

let cached: Promise<AppData> | null = null;

/** Loads the data once per page load, however many components ask for it. */
export function loadDataOnce(): Promise<AppData> {
  cached ??= loadData();
  return cached;
}
