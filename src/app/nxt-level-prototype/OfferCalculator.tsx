"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import styles from "./nxt-level-prototype.module.css";

export type OfferInputs = {
  role: string;
  companyStage: string;
  location: string;
  baseSalary: string;
  equityPercentage: string;
  postMoneyValuation: string;
  vestingYears: string;
  cashBonus: string;
};

export type OfferEstimate = {
  annualCash: number;
  annualizedEquity: number;
  annualTotal: number;
};

const defaultInputs: OfferInputs = {
  role: "Staff Engineer",
  companyStage: "Series B",
  location: "Remote — US",
  baseSalary: "175000",
  equityPercentage: "0.7",
  postMoneyValuation: "80000000",
  vestingYears: "4",
  cashBonus: "15000",
};

function parseNumber(value: string) {
  if (value.trim() === "") return Number.NaN;
  return Number(value);
}

function calculateEstimate(inputs: OfferInputs): OfferEstimate | null {
  const baseSalary = parseNumber(inputs.baseSalary);
  const equityPercentage = parseNumber(inputs.equityPercentage);
  const postMoneyValuation = parseNumber(inputs.postMoneyValuation);
  const vestingYears = parseNumber(inputs.vestingYears);
  const cashBonus = parseNumber(inputs.cashBonus);

  const values = [
    baseSalary,
    equityPercentage,
    postMoneyValuation,
    vestingYears,
    cashBonus,
  ];

  if (
    values.some((value) => !Number.isFinite(value) || value < 0) ||
    vestingYears <= 0
  ) {
    return null;
  }

  const annualCash = baseSalary + cashBonus;
  const annualizedEquity =
    (postMoneyValuation * (equityPercentage / 100)) / vestingYears;

  return {
    annualCash,
    annualizedEquity,
    annualTotal: annualCash + annualizedEquity,
  };
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) return `$${Math.round(value / 1000).toLocaleString("en-US")}k`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function AnimatedCurrency({ value }: { value: string }) {
  const characters = Array.from(value);

  return (
    <span className="t-digit-group is-animating" aria-hidden="true">
      {characters.map((character, index) => {
        const distanceFromEnd = characters.length - index;
        const stagger =
          distanceFromEnd === 2 ? "1" : distanceFromEnd === 1 ? "2" : undefined;

        return (
          <span
            key={`${character}-${index}`}
            className="t-digit"
            data-stagger={stagger}
          >
            {character}
          </span>
        );
      })}
    </span>
  );
}

export function OfferCalculator() {
  const [inputs, setInputs] = useState<OfferInputs>(defaultInputs);
  const estimate = calculateEstimate(inputs);

  function updateInput<Key extends keyof OfferInputs>(key: Key, value: OfferInputs[Key]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  const results = [
    { label: "Estimated annual total", value: estimate?.annualTotal },
    { label: "Annual cash", value: estimate?.annualCash },
    { label: "Annualized equity", value: estimate?.annualizedEquity },
  ] as const;

  return (
    <div className={styles.calculatorGrid}>
      <div
        className={styles.calculatorPanel}
        data-nxt-reveal
        style={{ "--nxt-reveal-delay": "0ms" } as CSSProperties}
      >
        <div className={styles.calculatorPanelHeading}>
          <h3>Build the offer</h3>
          <p>Use annual USD values for this illustrative estimate.</p>
        </div>
        <div className={styles.calculatorFields}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Role</span>
            <select value={inputs.role} onChange={(event) => updateInput("role", event.target.value)}>
              <option>Staff Engineer</option>
              <option>Product Lead</option>
              <option>VP Engineering</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Company stage</span>
            <select
              value={inputs.companyStage}
              onChange={(event) => updateInput("companyStage", event.target.value)}
            >
              <option>Seed</option>
              <option>Series A</option>
              <option>Series B</option>
              <option>Series C+</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Location</span>
            <select
              value={inputs.location}
              onChange={(event) => updateInput("location", event.target.value)}
            >
              <option>Remote — US</option>
              <option>New York, NY</option>
              <option>San Francisco, CA</option>
              <option>London, UK</option>
            </select>
          </label>
          <div className={styles.fieldPair}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Base salary</span>
              <span className={styles.inputAffix}>
                <span aria-hidden="true">$</span>
                <input
                  inputMode="numeric"
                  min="0"
                  step="1000"
                  type="number"
                  value={inputs.baseSalary}
                  onChange={(event) => updateInput("baseSalary", event.target.value)}
                />
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Equity</span>
              <span className={styles.inputAffix}>
                <input
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  type="number"
                  value={inputs.equityPercentage}
                  onChange={(event) => updateInput("equityPercentage", event.target.value)}
                />
                <span aria-hidden="true">%</span>
              </span>
            </label>
          </div>
          <div className={styles.fieldPair}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Post-money valuation</span>
              <span className={styles.inputAffix}>
                <span aria-hidden="true">$</span>
                <input
                  inputMode="numeric"
                  min="0"
                  step="1000000"
                  type="number"
                  value={inputs.postMoneyValuation}
                  onChange={(event) => updateInput("postMoneyValuation", event.target.value)}
                />
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Vesting</span>
              <select
                value={inputs.vestingYears}
                onChange={(event) => updateInput("vestingYears", event.target.value)}
              >
                <option value="1">1 year</option>
                <option value="2">2 years</option>
                <option value="3">3 years</option>
                <option value="4">4 years</option>
              </select>
            </label>
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Signing / annual cash bonus</span>
            <span className={styles.inputAffix}>
              <span aria-hidden="true">$</span>
              <input
                inputMode="numeric"
                min="0"
                step="1000"
                type="number"
                value={inputs.cashBonus}
                onChange={(event) => updateInput("cashBonus", event.target.value)}
              />
            </span>
          </label>
        </div>
      </div>

      <output
        className={styles.resultsPanel}
        aria-live="polite"
        data-nxt-reveal
        style={{ "--nxt-reveal-delay": "90ms" } as CSSProperties}
      >
        <div className={styles.resultsArtwork} aria-hidden="true">
          <Image
            src="/nxt-level-prototype/calculator-results-background.jpg"
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 620px"
          />
        </div>
        <div className={styles.resultsIntro}>
          <span className={styles.resultsEyebrow}>Illustrative demo</span>
          <h3>Your offer, annualized</h3>
          <p>
            {inputs.role} · {inputs.companyStage} · {inputs.location}
          </p>
        </div>
        {estimate ? (
          <dl className={styles.resultsList}>
            {results.map((result, index) => {
              const value = result.value ?? 0;
              const compactValue = formatCompactCurrency(value);

              return (
                <div
                  key={result.label}
                  className={index === 0 ? styles.primaryResult : styles.resultRow}
                >
                  <dt>{result.label}</dt>
                  <dd aria-label={`${result.label}: ${formatCurrency(value)}`}>
                    <AnimatedCurrency key={compactValue} value={compactValue} />
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className={styles.calculatorError} role="status">
            Enter non-negative values and a vesting period of at least one year.
          </p>
        )}
        <p className={styles.disclaimer}>
          This prototype estimate is for product demonstration only. Role, stage,
          and location provide context but do not alter the calculation yet.
        </p>
      </output>
    </div>
  );
}
