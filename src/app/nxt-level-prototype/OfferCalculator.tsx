"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { Select, Slider } from "./FormControls";
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

const roleOptions = [
  { value: "Staff Engineer", label: "Staff Engineer" },
  { value: "Product Lead", label: "Product Lead" },
  { value: "VP Engineering", label: "VP Engineering" },
] as const;

const companyStageOptions = [
  { value: "Seed", label: "Seed" },
  { value: "Series A", label: "Series A" },
  { value: "Series B", label: "Series B" },
  { value: "Series C+", label: "Series C+" },
] as const;

const locationOptions = [
  { value: "Remote — US", label: "Remote — US" },
  { value: "New York, NY", label: "New York, NY" },
  { value: "San Francisco, CA", label: "San Francisco, CA" },
  { value: "London, UK", label: "London, UK" },
] as const;

const vestingOptions = [
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "4", label: "4 years" },
] as const;

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

function formatSliderCurrency(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted = Number.isInteger(millions)
      ? millions.toFixed(0)
      : millions.toFixed(1);
    return `$${formatted}M`;
  }

  if (value >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString("en-US")}k`;
  }

  return formatCurrency(value);
}

function formatEquityPercent(value: number) {
  return `${Number(value.toFixed(2))}%`;
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
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="offer-role">
              Role
            </label>
            <Select
              id="offer-role"
              value={inputs.role}
              options={roleOptions}
              onChange={(value) => updateInput("role", value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="offer-companyStage">
              Company stage
            </label>
            <Select
              id="offer-companyStage"
              value={inputs.companyStage}
              options={companyStageOptions}
              onChange={(value) => updateInput("companyStage", value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="offer-location">
              Location
            </label>
            <Select
              id="offer-location"
              value={inputs.location}
              options={locationOptions}
              onChange={(value) => updateInput("location", value)}
            />
          </div>
          <Slider
            id="offer-baseSalary"
            label="Base salary"
            min={80000}
            max={400000}
            step={5000}
            value={inputs.baseSalary}
            displayValue={formatSliderCurrency(Number(inputs.baseSalary))}
            onChange={(value) => updateInput("baseSalary", value)}
          />
          <Slider
            id="offer-equityPercentage"
            label="Equity"
            min={0.05}
            max={5}
            step={0.05}
            value={inputs.equityPercentage}
            displayValue={formatEquityPercent(Number(inputs.equityPercentage))}
            onChange={(value) => updateInput("equityPercentage", value)}
          />
          <Slider
            id="offer-postMoneyValuation"
            label="Post-money valuation"
            min={10000000}
            max={500000000}
            step={5000000}
            value={inputs.postMoneyValuation}
            displayValue={formatSliderCurrency(Number(inputs.postMoneyValuation))}
            onChange={(value) => updateInput("postMoneyValuation", value)}
          />
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="offer-vestingYears">
              Vesting
            </label>
            <Select
              id="offer-vestingYears"
              value={inputs.vestingYears}
              options={vestingOptions}
              onChange={(value) => updateInput("vestingYears", value)}
            />
          </div>
          <Slider
            id="offer-cashBonus"
            label="Signing / annual cash bonus"
            min={0}
            max={100000}
            step={1000}
            value={inputs.cashBonus}
            displayValue={formatSliderCurrency(Number(inputs.cashBonus))}
            onChange={(value) => updateInput("cashBonus", value)}
          />
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
                    {compactValue}
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
