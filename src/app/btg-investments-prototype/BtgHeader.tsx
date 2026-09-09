"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Cancel01Icon,
  Menu04Icon,
} from "@hugeicons/core-free-icons";
import { BtgLogo } from "./BtgLogo";
import styles from "./btg-investments-prototype.module.css";

const navItems = [
  { label: "Investimentos", href: "#produtos" },
  { label: "Assessoria", href: "#assessoria" },
  { label: "Visão de mercado", href: "#mercado" },
] as const;

const CLOSE_DELAY = 180;

export function BtgHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);

  const closeMenu = useCallback(() => {
    if (!menuOpen || menuClosing) return;
    setMenuClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY);
  }, [menuClosing, menuOpen]);

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuClosing(false);
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) closeMenu();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen, closeMenu]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const isVisible = menuOpen || menuClosing;

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-[#dde3e9] bg-white/95 text-[#06172E] backdrop-blur-xl"
    >
      <div className={`${styles.contentFrame} flex h-[68px] items-center justify-between lg:h-[84px]`}>
        <a href="#btg-investments-page" aria-label="BTG Pactual Investimentos" className="shrink-0 transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2B72FF]">
          <BtgLogo className="h-9 w-auto lg:h-10" />
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
          {navItems.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              className="group inline-flex items-center gap-1.5 text-sm font-medium tracking-[-0.01em] text-[#06172E] transition-colors duration-150 hover:text-[#2B72FF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2B72FF]"
            >
              {item.label}
              {index < 3 ? (
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} aria-hidden="true" className="transition-transform duration-150 group-hover:translate-y-0.5" />
              ) : null}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href="#simuladores" className="px-4 py-2 text-sm font-medium text-[#26374a] transition-colors duration-150 hover:text-[#0055B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B72FF]">
            Acessar conta
          </a>
          <a href="#simuladores" className="rounded-[2px] bg-[#06172e] px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#123458] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2B72FF]">
            Abrir minha conta
          </a>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <a
            className="inline-flex h-10 items-center justify-center rounded-[2px] bg-[#06172e] px-3.5 text-[13px] font-bold text-white transition-[background-color,transform] hover:bg-[#123458] active:scale-[.97]"
            href="#simuladores"
          >
            Abrir conta
          </a>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 px-1 text-sm font-bold text-[#06172E] transition-[color,transform] duration-150 hover:text-[#0055b8] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2B72FF]"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="btg-mobile-navigation"
            onClick={() => (menuOpen ? closeMenu() : openMenu())}
          >
            <span>{menuOpen && !menuClosing ? "Fechar" : "Menu"}</span>
            <span className={styles.iconSwap} aria-hidden="true" data-open={menuOpen && !menuClosing ? "true" : "false"}>
              <HugeiconsIcon icon={Menu04Icon} size={18} strokeWidth={2} className={styles.icon} />
              <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} className={styles.icon} />
            </span>
          </button>
        </div>
      </div>

      {isVisible ? (
        <nav
          id="btg-mobile-navigation"
          aria-label="Navegação móvel"
          className={`${styles.dropdown} ${menuClosing ? styles.dropdownClosing : styles.dropdownOpen}`}
        >
          <div className="mx-4 mb-4 border border-[#d4dbe3] bg-white p-2 sm:mx-6">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="flex min-h-12 items-center justify-between rounded-[2px] px-4 text-[15px] font-medium text-[#06172E] transition-colors duration-150 hover:bg-[#EEF3F8] focus-visible:bg-[#EEF3F8] focus-visible:outline-none"
              >
                {item.label}
                <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} className="-rotate-90 text-[#2B72FF]" aria-hidden="true" />
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#06172e]/8 pt-3">
              <a href="#simuladores" onClick={closeMenu} className="rounded-[2px] px-3 py-3 text-center text-sm font-semibold text-[#0055B8] hover:bg-[#EEF3F8] focus-visible:outline-2 focus-visible:outline-[#2B72FF]">
                Acessar conta
              </a>
              <a href="#simuladores" onClick={closeMenu} className="rounded-[2px] bg-[#2B72FF] px-3 py-3 text-center text-sm font-semibold text-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B72FF]">
                Abrir conta
              </a>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
