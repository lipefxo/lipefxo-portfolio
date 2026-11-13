import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const datasetRevisions = sqliteTable("dataset_revisions", {
  hash: text("hash").primaryKey(),
  dataset: text("dataset").notNull(),
  lastContest: integer("last_contest").notNull(),
  createdAt: text("created_at").notNull(),
});

export const ingestionState = sqliteTable("ingestion_state", {
  game: text("game").primaryKey(),
  revisionHash: text("revision_hash").notNull().references(() => datasetRevisions.hash),
  lastContest: integer("last_contest").notNull(),
  checkedAt: text("checked_at").notNull(),
  latestAvailableContest: integer("latest_available_contest"),
  status: text("status").notNull(),
  message: text("message").notNull(),
});

export const ingestionAttempts = sqliteTable("ingestion_attempts", {
  id: text("id").primaryKey(),
  checkedAt: text("checked_at").notNull(),
  status: text("status").notNull(),
  latestAvailableContest: integer("latest_available_contest"),
  lastContest: integer("last_contest").notNull(),
  message: text("message").notNull(),
});
