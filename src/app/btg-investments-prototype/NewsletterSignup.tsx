"use client";

import { useId, useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function NewsletterSignup() {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!emailPattern.test(normalizedEmail)) {
      setError("Digite um e-mail válido para continuar.");
      setIsSubmitted(false);
      return;
    }
    setEmail(normalizedEmail);
    setError("");
    setIsSubmitted(true);
  };

  return (
    <form noValidate onSubmit={submit} className="max-w-xl" aria-describedby={error ? `${inputId}-error` : isSubmitted ? `${inputId}-success` : undefined}>
          <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-white">Seu melhor e-mail</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id={inputId} type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(""); if (isSubmitted) setIsSubmitted(false); }} aria-invalid={Boolean(error)} aria-errormessage={error ? `${inputId}-error` : undefined} placeholder="voce@email.com" className={`h-12 min-w-0 flex-1 rounded-[2px] border bg-white px-4 text-[15px] text-[#06172E] outline-none transition-[border-color,box-shadow] placeholder:text-[#06172E]/40 focus:ring-4 ${error ? "border-[#ff8686] focus:border-[#ff8686] focus:ring-[#ff8686]/20" : "border-white/20 focus:border-[#2B72FF] focus:ring-[#2B72FF]/30"}`} />
            <button type="submit" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[2px] bg-[#2B72FF] px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#0055B8] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white">Quero receber <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={2} aria-hidden="true" /></button>
          </div>
          <div className="mt-3 min-h-6" aria-live="polite">
            {error ? <p id={`${inputId}-error`} role="alert" className="text-sm text-[#ffb4b4]">{error}</p> : null}
            {isSubmitted ? <p id={`${inputId}-success`} className="flex items-center gap-2 text-sm text-[#b7d0ff]"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} strokeWidth={1.8} aria-hidden="true" />Pronto — você está na lista. Até breve.</p> : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-white/45">Ao se inscrever, você concorda com a nossa política de privacidade. Sem spam.</p>
    </form>
  );
}
