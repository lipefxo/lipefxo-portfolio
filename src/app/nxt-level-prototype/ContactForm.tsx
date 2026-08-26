"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Select, TextArea, TextInput } from "./FormControls";
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

const companyStageOptions = [
  { value: "Seed", label: "Seed" },
  { value: "Series A", label: "Series A" },
  { value: "Series B", label: "Series B" },
  { value: "Series C+", label: "Series C+" },
] as const;

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

  function fieldError(field: ContactField) {
    return errors[field]
      ? {
          invalid: true,
          describedBy: `contact-${field}-error`,
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
        <div className={styles.contactField}>
          <label className={styles.contactFieldLabel} htmlFor="contact-name">
            Your name
          </label>
          <TextInput
            id="contact-name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            value={form.name}
            onChange={(value) => updateField("name", value)}
            {...fieldError("name")}
          />
          {errors.name ? (
            <span id="contact-name-error" className={styles.contactError}>
              {errors.name}
            </span>
          ) : null}
        </div>
        <div className={styles.contactField}>
          <label className={styles.contactFieldLabel} htmlFor="contact-email">
            Work email
          </label>
          <TextInput
            id="contact-email"
            name="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Work e-mail"
            value={form.email}
            onChange={(value) => updateField("email", value)}
            {...fieldError("email")}
          />
          {errors.email ? (
            <span id="contact-email-error" className={styles.contactError}>
              {errors.email}
            </span>
          ) : null}
        </div>
      </div>
      <div className={styles.contactFieldPair}>
        <div className={styles.contactField}>
          <label className={styles.contactFieldLabel} htmlFor="contact-company">
            Company
          </label>
          <TextInput
            id="contact-company"
            name="company"
            autoComplete="organization"
            placeholder="Company"
            value={form.company}
            onChange={(value) => updateField("company", value)}
            {...fieldError("company")}
          />
          {errors.company ? (
            <span id="contact-company-error" className={styles.contactError}>
              {errors.company}
            </span>
          ) : null}
        </div>
        <div className={styles.contactField}>
          <label className={styles.contactFieldLabel} htmlFor="contact-companyStage">
            Company stage
          </label>
          <Select
            id="contact-companyStage"
            name="companyStage"
            placeholder="Company stage"
            value={form.companyStage}
            options={companyStageOptions}
            onChange={(value) => updateField("companyStage", value)}
            {...fieldError("companyStage")}
          />
          {errors.companyStage ? (
            <span id="contact-companyStage-error" className={styles.contactError}>
              {errors.companyStage}
            </span>
          ) : null}
        </div>
      </div>
      <div className={styles.contactField}>
        <label className={styles.contactFieldLabel} htmlFor="contact-hiringNeeds">
          What roles are you hiring for?
        </label>
        <TextArea
          id="contact-hiringNeeds"
          name="hiringNeeds"
          placeholder="What roles are you hiring for?"
          value={form.hiringNeeds}
          onChange={(value) => updateField("hiringNeeds", value)}
          {...fieldError("hiringNeeds")}
        />
        {errors.hiringNeeds ? (
          <span id="contact-hiringNeeds-error" className={styles.contactError}>
            {errors.hiringNeeds}
          </span>
        ) : null}
      </div>
      <div className={styles.contactActions}>
        <button className={styles.footerButton} type="submit">
          Book a call
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            size={16}
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
