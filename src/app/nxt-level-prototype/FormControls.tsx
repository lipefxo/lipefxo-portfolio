"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import styles from "./nxt-level-prototype.module.css";

export type SelectOption = {
  value: string;
  label: string;
};

type DropdownPhase = "closed" | "open" | "closing";

type InputMode = "text" | "email" | "numeric" | "decimal";

function getDropdownCloseDuration() {
  if (typeof window === "undefined") return 150;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  return (
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur"),
    ) || 150
  );
}

function sanitizeValue(inputMode: InputMode | undefined, value: string) {
  if (inputMode === "numeric") return value.replace(/[^\d]/g, "");
  if (inputMode !== "decimal") return value;

  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...fraction] = cleaned.split(".");
  return fraction.length > 0 ? `${whole}.${fraction.join("").replace(/\./g, "")}` : whole;
}

type SelectProps = {
  id: string;
  name?: string;
  value: string;
  options: readonly SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
};

export function Select({
  id,
  name,
  value,
  options,
  placeholder,
  invalid,
  describedBy,
  onChange,
}: SelectProps) {
  const generatedId = useId();
  const listId = `${id || generatedId}-listbox`;
  const closeTimerRef = useRef<number | null>(null);
  const phaseRef = useRef<DropdownPhase>("closed");
  const [phase, setPhase] = useState<DropdownPhase>("closed");
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0));
  const isOpen = phase === "open";
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const displayLabel = selected?.label ?? placeholder ?? "Select";
  const activeOption = options[activeIndex];
  const activeOptionId =
    activeOption && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;

  const updatePhase = useCallback((next: DropdownPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    if (phaseRef.current !== "open") return;
    clearCloseTimer();
    updatePhase("closing");
    closeTimerRef.current = window.setTimeout(() => {
      updatePhase("closed");
      closeTimerRef.current = null;
    }, getDropdownCloseDuration());
  }, [clearCloseTimer, updatePhase]);

  const open = useCallback(() => {
    clearCloseTimer();
    setActiveIndex(Math.max(selectedIndex, 0));
    updatePhase("open");
  }, [clearCloseTimer, selectedIndex, updatePhase]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    close();
  }

  function moveActive(nextIndex: number) {
    const lastIndex = options.length - 1;
    if (lastIndex < 0) return;
    if (nextIndex < 0) setActiveIndex(lastIndex);
    else if (nextIndex > lastIndex) setActiveIndex(0);
    else setActiveIndex(nextIndex);
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    close();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      if (!isOpen) return;
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      if (!isOpen) return;
      event.preventDefault();
      if (activeOption) selectOption(activeOption.value);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) open();
      else moveActive(activeIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) open();
      else moveActive(activeIndex - 1);
      return;
    }

    if (!isOpen) return;

    if (event.key === "Home") {
      event.preventDefault();
      moveActive(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      moveActive(options.length - 1);
    }
  }

  return (
    <div className={styles.select} data-open={isOpen || undefined} onBlur={handleBlur}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        id={id}
        type="button"
        className={styles.selectTrigger}
        role="combobox"
        aria-activedescendant={isOpen ? activeOptionId : undefined}
        aria-autocomplete="none"
        aria-controls={listId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        data-placeholder={!selected || undefined}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{displayLabel}</span>
        <span className={styles.selectChevron} aria-hidden="true">
          <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} />
        </span>
      </button>
      <div
        id={listId}
        className={`${styles.selectMenu} t-dropdown ${phase === "open" ? "is-open" : ""} ${phase === "closing" ? "is-closing" : ""}`}
        data-origin="top-left"
        role="listbox"
        aria-hidden={!isOpen}
      >
        {options.map((option, index) => {
          const selectedOption = option.value === value;

          return (
            <button
              key={option.value}
              id={`${listId}-option-${index}`}
              type="button"
              className={styles.selectOption}
              role="option"
              aria-selected={selectedOption}
              tabIndex={-1}
              data-active={index === activeIndex || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type TextInputProps = {
  id: string;
  name?: string;
  value: string;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: InputMode;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
};

export function TextInput({
  id,
  name,
  value,
  prefix,
  suffix,
  placeholder,
  autoComplete,
  inputMode = "text",
  invalid,
  describedBy,
  onChange,
}: TextInputProps) {
  const hasAffix = Boolean(prefix || suffix);

  const input = (
    <input
      id={id}
      name={name}
      className={hasAffix ? styles.affixControl : styles.control}
      type="text"
      inputMode={inputMode}
      autoComplete={autoComplete}
      autoCapitalize={inputMode === "email" ? "none" : undefined}
      spellCheck={inputMode === "email" ? false : undefined}
      placeholder={placeholder}
      value={value}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        onChange(sanitizeValue(inputMode, event.target.value));
      }}
    />
  );

  if (!hasAffix) return input;

  return (
    <span className={styles.inputAffix}>
      {prefix ? <span aria-hidden="true">{prefix}</span> : null}
      {input}
      {suffix ? <span aria-hidden="true">{suffix}</span> : null}
    </span>
  );
}

type SliderProps = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: string;
  displayValue: string;
  onChange: (value: string) => void;
};

function sliderDecimals(step: number) {
  const fraction = String(step).split(".")[1];
  return fraction?.length ?? 0;
}

export function Slider({
  id,
  label,
  min,
  max,
  step,
  value,
  displayValue,
  onChange,
}: SliderProps) {
  const numericValue = Number(value);
  const clamped = Math.min(
    max,
    Math.max(min, Number.isFinite(numericValue) ? numericValue : min),
  );
  const progress = ((clamped - min) / (max - min)) * 100;

  return (
    <div className={styles.field}>
      <div className={styles.sliderHeader}>
        <label className={styles.fieldLabel} htmlFor={id}>
          {label}
        </label>
        <span className={styles.sliderValue}>{displayValue}</span>
      </div>
      <input
        id={id}
        className={styles.sliderInput}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        aria-valuetext={displayValue}
        style={{ "--slider-progress": `${progress}%` } as CSSProperties}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange(Number(event.target.value).toFixed(sliderDecimals(step)));
        }}
      />
    </div>
  );
}

type TextAreaProps = {
  id: string;
  name?: string;
  value: string;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
};

export function TextArea({
  id,
  name,
  value,
  placeholder,
  invalid,
  describedBy,
  onChange,
}: TextAreaProps) {
  return (
    <textarea
      id={id}
      name={name}
      className={styles.textareaControl}
      placeholder={placeholder}
      value={value}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
    />
  );
}
