import snapshot from "../../data/megasena.json";
import { createDataService } from "./data-service";
import { createD1Store } from "./persistence";
import type { Dataset } from "./types";

const services = new WeakMap<
  D1Database,
  ReturnType<typeof createDataService>
>();

export function runtimeService(db?: D1Database) {
  const existing = db && services.get(db);
  if (existing) return existing;
  const service = createDataService(
    snapshot as Dataset,
    fetch,
    db
      ? createD1Store(db)
      : {
          async read() {
            throw new Error("D1 indisponível.");
          },
          async save() {
            throw new Error("D1 indisponível.");
          },
        },
  );
  if (db) services.set(db, service);
  return service;
}
