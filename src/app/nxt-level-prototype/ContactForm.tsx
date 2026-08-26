"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import styles from "./nxt-level-prototype.module.css";

type ContactFormState = {
  name: string;
  email: string;
  company: string;
  companyStage: string;
  hiringNeeds: string;
};

type ContactField = keyof ContactFormState;
type ContactErrors = Partial<Record<ContactField, string>>;

const initialForm: ContactFormState = {
  name: "",
  email: "",
  company: "",
  companyStage: "",
  hiringNeeds: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form: ContactFormState): ContactErrors {
  const errors: ContactErrors = {};

  if (!form.name.trim()) errors.name = "Enter your name.";
  if (!form.email.trim()) {
    errors.email = "Enter your work email.";
  } else if (!emailPattern.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.company.trim()) errors.company = "Enter your company.";
  if (!form.companyStage) errors.companyStage = "Choose a company stage.";
  if (!form.hiringNeeds.trim()) errors.hiringNeeds = "Tell us what roles you are hiring for.";

  return errors;
}

export function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(initialForm);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  function updateField(field: ContactField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmittedName(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    const firstError = Object.keys(nextErrors)[0] as ContactField | undefined;
    if (firstError) {
      document.getElementById(`contact-${firstError}`)?.focus();
      setSubmittedName(null);
      return;
    }

    setSubmittedName(form.name.trim());
  }

  function errorProps(field: ContactField) {
    return errors[field]
      ? {
          "aria-invalid": true as const,
          "aria-describedby": `contact-${field}-error`,
        }
      : {};
  }

  return (
    <form
      className={styles.contactForm}
      noValidate
      onSubmit={handleSubmit}
      data-nxt-reveal
      style={{ "--nxt-reveal-delay": "100ms" } as CSSProperties}
    >
      <div className={styles.contactFieldPair}>
        <label className={styles.contactField}>
          <span className={styles.visuallyHidden}>Your name</span>
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            {...errorProps("name")}
          />
          {errors.name ? (
            <span id="contact-name-error" className={styles.contactError}>
              {errors.name}
            </span>
          ) : null}
        </label>
        <label className={styles.contactField}>
          <span className={styles.visuallyHidden}>Work email</span>
          <input
            id="contact-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Work e-mail"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            {...errorProps("email")}
          />
          {errors.email ? (
            <span id="contact-email-error" className={styles.contactError}>
              {errors.email}
            </span>
          ) : null}
        </label>
      </div>
      <div className={styles.contactFieldPair}>
        <label className={styles.contactField}>
          <span className={styles.visuallyHidden}>Company</span>
          <input
            id="contact-company"
            name="company"
            autoComplete="organization"
            placeholder="Company"
            value={form.company}
            onChange={(event) => updateField("company", event.target.value)}
            {...errorProps("company")}
          />
          {errors.company ? (
            <span id="contact-company-error" className={styles.contactError}>
              {errors.company}
            </span>
          ) : null}
        </label>
        <label className={styles.contactField}>
          <span className={styles.visuallyHidden}>Company stage</span>
          <select
            id="contact-companyStage"
            name="companyStage"
            value={form.companyStage}
            onChange={(event) => updateField("companyStage", event.target.value)}
            {...errorProps("companyStage")}
          >
            <option value="" disabled>
              Company stage
            </option>
            <option>Seed</option>
            <option>Series A</option>
            <option>Series B</option>
            <option>Series C+</option>
          </select>
          {errors.companyStage ? (
            <span id="contact-companyStage-error" className={styles.contactError}>
              {errors.companyStage}
            </span>
          ) : null}
        </label>
      </div>
      <label className={styles.contactField}>
        <span className={styles.visuallyHidden}>What roles are you hiring for?</span>
        <textarea
          id="contact-hiringNeeds"
          name="hiringNeeds"
          placeholder="What roles are you hiring for?"
          value={form.hiringNeeds}
          onChange={(event) => updateField("hiringNeeds", event.target.value)}
          {...errorProps("hiringNeeds")}
        />
        {errors.hiringNeeds ? (
          <span id="contact-hiringNeeds-error" className={styles.contactError}>
            {errors.hiringNeeds}
          </span>
        ) : null}
      </label>
      <div className={styles.contactActions}>
        <button className={styles.footerButton} type="submit">
          Book a call
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
        <p className={styles.formPrivacy}>Local prototype — no data is sent.</p>
      </div>
      <p
        className={submittedName ? styles.successMessage : styles.successPlaceholder}
        role="status"
        aria-live="polite"
      >
        {submittedName
          ? `Thanks, ${submittedName}. We'll be in touch within one business day.`
          : ""}
      </p>
    </form>
  );
}
