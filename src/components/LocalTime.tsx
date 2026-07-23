"use client";

import { useEffect, useState } from "react";

const TIME_ZONE = "America/Sao_Paulo";
const TIME_ZONE_LABEL = "UTC-3";

function formatLocalTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function msUntilNextMinute(date: Date) {
  return 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds());
}

export function LocalTime() {
  const [time, setTime] = useState("");

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const update = () => setTime(formatLocalTime(new Date()));
    const timeoutId = setTimeout(() => {
      update();
      intervalId = setInterval(update, 60_000);
    }, msUntilNextMinute(new Date()));

    update();

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <span
      className="inline-flex items-center gap-1.5 align-baseline font-mono text-[0.72rem] leading-none tracking-normal text-zinc-500 tabular-nums dark:text-zinc-500"
      aria-label={`Local time in ${TIME_ZONE}`}
      title={TIME_ZONE}
    >
      <span>{TIME_ZONE_LABEL}</span>
      <time dateTime={time || undefined}>{time || "--:--"}</time>
    </span>
  );
}
