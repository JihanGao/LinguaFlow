/**
 * One-time copy: SQLite (old local DB) → PostgreSQL (current Prisma datasource).
 *
 * Prerequisites:
 * - `.env` has `DATABASE_URL` pointing at PostgreSQL (already migrated schema: `npx prisma migrate deploy`).
 * - SQLite file exists (default `prisma/dev.db`). Override with `SQLITE_DATABASE_PATH`.
 *
 * Run: `npm run migrate:sqlite-to-postgres`
 *
 * Safety: refuses to run if Postgres `Mistake` or `VocabularyEntry` already has rows (avoid duplicates).
 */

import "dotenv/config";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import {
  AutoKbSubCategory,
  MistakeStatus,
  PartOfSpeech,
  PrismaClient,
  ThemeCategory
} from "@prisma/client";

const prisma = new PrismaClient();

const SQLITE_DEFAULT = path.join(process.cwd(), "prisma", "dev.db");
const BATCH = 200;

function resolveSqlitePath(): string {
  const fromEnv = process.env.SQLITE_DATABASE_PATH?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return SQLITE_DEFAULT;
}

function bool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return false;
}

function requireDate(v: unknown): Date {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new Error(`Invalid datetime value: ${String(v)}`);
}

function optDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  return requireDate(v);
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function parseEnum<T extends string>(allowed: ReadonlySet<T>, value: unknown, label: string): T {
  const s = String(value) as T;
  if (!allowed.has(s)) {
    throw new Error(`${label}: invalid value "${String(value)}"`);
  }
  return s;
}

const mistakeStatuses = new Set(Object.values(MistakeStatus));
const partOfSpeech = new Set(Object.values(PartOfSpeech));
const themeCategories = new Set(Object.values(ThemeCategory));
const subCategories = new Set(Object.values(AutoKbSubCategory));

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare("SELECT 1 as ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(name) as { ok: number } | undefined;
  return Boolean(row);
}

type PgTable = "Mistake" | "VocabularyEntry";

async function resetSequence(table: PgTable) {
  const rows = await prisma.$queryRawUnsafe<Array<{ max: bigint | null }>>(
    `SELECT MAX("id") AS max FROM public."${table}"`
  );
  const maxId = rows[0]?.max;
  if (maxId == null || Number(maxId) === 0) return;

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('public."${table}"', 'id'), ${Number(maxId)})`
  );
}

async function main() {
  const sqlitePath = resolveSqlitePath();

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is missing. Point it at PostgreSQL before running this script.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL.startsWith("postgresql:") && !process.env.DATABASE_URL.startsWith("postgres:")) {
    console.error(
      "DATABASE_URL must be a PostgreSQL URL for this script (copies INTO Postgres).\n" +
        "Keep your SQLite file on disk; only DATABASE_URL should be Postgres."
    );
    process.exit(1);
  }

  if (!fs.existsSync(sqlitePath)) {
    console.error(`SQLite file not found: ${sqlitePath}\nSet SQLITE_DATABASE_PATH if it lives elsewhere.`);
    process.exit(1);
  }

  const [pgMistakes, pgVocab] = await Promise.all([prisma.mistake.count(), prisma.vocabularyEntry.count()]);
  if (pgMistakes > 0 || pgVocab > 0) {
    console.error(
      "PostgreSQL already contains Mistake or VocabularyEntry rows.\n" +
        "To avoid duplicate IDs, this script stops.\n" +
        "Use an empty Postgres database / branch, or truncate those tables, then run again."
    );
    process.exit(1);
  }

  const db = new Database(sqlitePath, { readonly: true });

  try {
    if (!tableExists(db, "Mistake") && !tableExists(db, "VocabularyEntry")) {
      console.error('SQLite has no "Mistake" or "VocabularyEntry" tables — nothing to migrate.');
      process.exit(1);
    }

    const sqliteMistakeRows = tableExists(db, "Mistake")
      ? (db.prepare(`SELECT * FROM "Mistake"`).all() as Record<string, unknown>[])
      : [];

    const sqliteVocabRows = tableExists(db, "VocabularyEntry")
      ? (db.prepare(`SELECT * FROM "VocabularyEntry"`).all() as Record<string, unknown>[])
      : [];

    console.log(
      `SQLite → Postgres copy starting (${sqlitePath})\n` +
        `  Mistake rows: ${sqliteMistakeRows.length}\n` +
        `  VocabularyEntry rows: ${sqliteVocabRows.length}`
    );

    for (let i = 0; i < sqliteMistakeRows.length; i += BATCH) {
      const slice = sqliteMistakeRows.slice(i, i + BATCH).map((row) => ({
        id: Number(row.id),
        language: str(row.language),
        learnerPrompt: str(row.learnerPrompt),
        question: str(row.question),
        userAnswer: str(row.userAnswer),
        correctAnswer: str(row.correctAnswer),
        errorType: str(row.errorType),
        aiAnswer: str(row.aiAnswer),
        aiExplanationJson: str(row.aiExplanationJson),
        chatTranscriptJson: str(row.chatTranscriptJson, "[]"),
        screenshotPath: row.screenshotPath == null || row.screenshotPath === "" ? null : str(row.screenshotPath),
        status: parseEnum(mistakeStatuses, row.status, `Mistake[${row.id}].status`),
        isFavorite: bool(row.isFavorite),
        isDeleted: bool(row.isDeleted),
        deletedAt: optDate(row.deletedAt),
        createdAt: requireDate(row.createdAt),
        updatedAt: requireDate(row.updatedAt)
      }));

      await prisma.mistake.createMany({ data: slice });
    }

    for (let i = 0; i < sqliteVocabRows.length; i += BATCH) {
      const slice = sqliteVocabRows.slice(i, i + BATCH).map((row) => ({
        id: Number(row.id),
        language: str(row.language),
        learnerPrompt: str(row.learnerPrompt),
        term: str(row.term),
        lemma: str(row.lemma),
        reading: str(row.reading),
        aiAnswer: str(row.aiAnswer),
        summaryJson: str(row.summaryJson, "{}"),
        chatTranscriptJson: str(row.chatTranscriptJson, "[]"),
        isSimpleWord: row.isSimpleWord == null ? true : bool(row.isSimpleWord),
        screenshotPath: row.screenshotPath == null || row.screenshotPath === "" ? null : str(row.screenshotPath),
        partOfSpeech:
          row.partOfSpeech != null && String(row.partOfSpeech).trim() !== ""
            ? parseEnum(partOfSpeech, row.partOfSpeech, `VocabularyEntry[${row.id}].partOfSpeech`)
            : PartOfSpeech.other,
        partOfSpeech_zh: str(row.partOfSpeech_zh, "其他"),
        partOfSpeech_en: str(row.partOfSpeech_en, "other"),
        themeCategory:
          row.themeCategory != null && String(row.themeCategory).trim() !== ""
            ? parseEnum(themeCategories, row.themeCategory, `VocabularyEntry[${row.id}].themeCategory`)
            : ThemeCategory.misc,
        themeCategory_zh: str(row.themeCategory_zh, "其他"),
        themeCategory_en: str(row.themeCategory_en, "misc"),
        subCategory:
          row.subCategory != null && String(row.subCategory).trim() !== ""
            ? parseEnum(subCategories, row.subCategory, `VocabularyEntry[${row.id}].subCategory`)
            : AutoKbSubCategory.other,
        subCategory_zh: str(row.subCategory_zh, "其他"),
        subCategory_en: str(row.subCategory_en, "other"),
        exampleSentence:
          row.exampleSentence == null || row.exampleSentence === "" ? null : str(row.exampleSentence),
        exampleTranslation:
          row.exampleTranslation == null || row.exampleTranslation === ""
            ? null
            : str(row.exampleTranslation),
        isFavorite: bool(row.isFavorite),
        isDeleted: bool(row.isDeleted),
        deletedAt: optDate(row.deletedAt),
        createdAt: requireDate(row.createdAt),
        updatedAt: requireDate(row.updatedAt)
      }));

      await prisma.vocabularyEntry.createMany({ data: slice });
    }

    await resetSequence("Mistake");
    await resetSequence("VocabularyEntry");

    const [outM, outV] = await Promise.all([prisma.mistake.count(), prisma.vocabularyEntry.count()]);

    if (outM !== sqliteMistakeRows.length || outV !== sqliteVocabRows.length) {
      throw new Error(`Row count mismatch after copy (Postgres Mistake=${outM}, SQLite=${sqliteMistakeRows.length}; Postgres Vocabulary=${outV}, SQLite=${sqliteVocabRows.length}).`);
    }

    console.log("Done. Verified row counts match SQLite.");
    console.log(`  Mistake: ${outM}`);
    console.log(`  VocabularyEntry: ${outV}`);
    console.log(
      "\nNote: screenshot files live under public/uploads on disk, not inside SQLite.\n" +
        "If you rely on old thumbnails, copy that folder to your new hosting setup or uploads will 404."
    );
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
