import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Dataset } from "../../lib/lottery/types";
const snapshot = JSON.parse(
  readFileSync(new URL("../../data/megasena.json", import.meta.url), "utf8"),
) as Dataset;

test("budget, generation, save, reload, export and restore a collection", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#lab");
  await page.getByLabel("Orçamento máximo (R$)").fill("6");
  await expect(
    page.getByRole("button", { name: "Gerar minha coleção" }),
  ).toBeDisabled();
  await page.getByLabel("Orçamento máximo (R$)").fill("24");
  await page.getByRole("button", { name: "Gerar minha coleção" }).click();
  await expect(
    page.getByRole("button", { name: "Salvar coleção", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar coleção", exact: true })
    .click();
  await page.getByRole("link", { name: /Meus jogos/ }).click();
  await expect(
    page.getByRole("heading", { name: "4 jogos salvos", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Coleção · 4 jogos", exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar todos" }).click();
  const path = await (await downloadPromise).path();
  expect(path).toBeTruthy();
  await page.evaluate(() => localStorage.removeItem("loteria-lab:games:v1"));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "0 jogos salvos", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Selecionar arquivo para importar")
    .setInputFiles(path!);
  await expect(page.getByText(/Prévia: 4 jogos/)).toBeVisible();
  await page.getByRole("button", { name: "Importar novos jogos" }).click();
  await expect(
    page.getByRole("heading", { name: "4 jogos salvos", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("complete collection evaluation can run and export its frozen protocol", async ({
  page,
}) => {
  await page.goto("/#test");
  await page.getByLabel("Concursos de teste").selectOption("10");
  await page.getByRole("combobox", { name: "Sementes", exact: true }).selectOption("1");
  await page
    .getByRole("button", { name: "Executar teste", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Resultados por concurso", exact: true }),
  ).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByText("Uniforme + otimização", { exact: true }).first(),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar protocolo e resultados" })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "loteria-lab-colecoes.json",
  );
});

test("journal requires fresh data and preserves a registered future collection", async ({
  page,
}) => {
  await page.goto("/#lab");
  await page.getByRole("button", { name: "Gerar minha coleção" }).click();
  await page
    .getByRole("button", { name: "Salvar coleção", exact: true })
    .click();
  await page.getByRole("link", { name: /Meus jogos/ }).click();
  await page.getByLabel("Coleção salva completa").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Registrar experimento" }).click();
  await expect(
    page.getByText(/Atualize os dados oficiais antes de registrar/),
  ).toBeVisible();
  // Freeze the source response for this test; do not depend on the live CAIXA API.
  await page.route("**/api/draws?**", (route) =>
    route.fulfill({
      json: {
        dataset: snapshot,
        freshness: {
          status: "current",
          checkedAt: new Date().toISOString(),
          latestAvailableContest: snapshot.draws.at(-1)!.contest,
          message: "Consulta de teste confirmada.",
        },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Atualizar dados", exact: true })
    .click();
  await expect(page.getByText("Consulta de teste confirmada.")).toBeVisible();
  await page.getByRole("button", { name: "Registrar experimento" }).click();
  await expect(
    page.getByText("Experimento registrado neste navegador.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Concursos #.*Pendente/ }),
  ).toBeVisible();
});

test("corrupt saved metadata does not crash and keeps recovery data", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "loteria-lab:games:v1",
      '{"schemaVersion":1,"games":[{"generation":{"methods":"corrupt"}}]}',
    ),
  );
  await page.goto("/#saved");
  await expect(
    page.getByRole("button", { name: "Baixar dados originais" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "0 jogos salvos", exact: true }),
  ).toBeVisible();
});

test("mobile setup is compact and keyboard controls remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#lab");
  const generate = page.getByRole("button", { name: "Gerar minha coleção" });
  await expect(generate).toBeEnabled();
  const box = await generate.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Abrir navegação" }),
  ).toBeFocused();
  await page.screenshot({
    path: "../../.context/browser/implementation-mobile.png",
    fullPage: true,
  });
});
