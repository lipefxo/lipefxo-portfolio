"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export interface TurntableControlSoundHandlers {
  beginKnobRumble: () => void;
  endKnobRumble: () => void;
  playKnobStep: (deltaValue: number) => void;
  playSwitchClick: (nextPowered: boolean) => void;
  updateKnobRumble: (deltaDegrees: number, elapsedMs: number) => void;
}

interface RumbleNodes {
  filter: BiquadFilterNode;
  gain: GainNode;
  noise: AudioBufferSourceNode;
  oscillator: OscillatorNode;
}

interface AudioRuntime {
  context: AudioContext;
  master: GainNode;
  noiseBuffer: AudioBuffer;
  rumble: RumbleNodes | null;
}

const MASTER_GAIN = 0.7;
const RUMBLE_IDLE_MS = 90;
const RUMBLE_RELEASE_SECONDS = 0.045;

function createBrownNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let previous = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = (previous + white * 0.02) / 1.02;
    samples[index] = Math.max(-1, Math.min(1, previous * 3.5));
  }

  return buffer;
}

function disconnectNode(node: AudioNode) {
  try {
    node.disconnect();
  } catch {
    // The node may already have disconnected after its scheduled stop.
  }
}

export function useTurntableControlAudio(): TurntableControlSoundHandlers {
  const runtimeRef = useRef<AudioRuntime | null>(null);
  const rumbleIdleTimerRef = useRef<number | null>(null);

  const getRuntime = useCallback(() => {
    if (runtimeRef.current) {
      const { context } = runtimeRef.current;
      if (context.state === "suspended") void context.resume().catch(() => {});
      return runtimeRef.current;
    }

    if (typeof window === "undefined" || !window.AudioContext) return null;

    try {
      const context = new window.AudioContext();
      const master = context.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(context.destination);
      const runtime: AudioRuntime = {
        context,
        master,
        noiseBuffer: createBrownNoiseBuffer(context),
        rumble: null,
      };
      runtimeRef.current = runtime;
      if (context.state === "suspended") void context.resume().catch(() => {});
      return runtime;
    } catch {
      return null;
    }
  }, []);

  const stopRumble = useCallback((immediate = false) => {
    const runtime = runtimeRef.current;
    const rumble = runtime?.rumble;
    if (!runtime || !rumble) return;

    runtime.rumble = null;
    if (rumbleIdleTimerRef.current !== null) {
      window.clearTimeout(rumbleIdleTimerRef.current);
      rumbleIdleTimerRef.current = null;
    }

    const now = runtime.context.currentTime;
    const release = immediate ? 0.005 : RUMBLE_RELEASE_SECONDS;
    rumble.gain.gain.cancelScheduledValues(now);
    rumble.gain.gain.setValueAtTime(
      Math.max(rumble.gain.gain.value, 0.0001),
      now,
    );
    rumble.gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
    rumble.noise.stop(now + release + 0.01);
    rumble.oscillator.stop(now + release + 0.01);
    rumble.noise.addEventListener("ended", () => {
      disconnectNode(rumble.noise);
      disconnectNode(rumble.oscillator);
      disconnectNode(rumble.filter);
      disconnectNode(rumble.gain);
    });
  }, []);

  const beginKnobRumble = useCallback(() => {
    const runtime = getRuntime();
    if (!runtime) return;
    stopRumble(true);

    try {
      const now = runtime.context.currentTime;
      const noise = runtime.context.createBufferSource();
      noise.buffer = runtime.noiseBuffer;
      noise.loop = true;

      const oscillator = runtime.context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.value = 58;

      const filter = runtime.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 72;
      filter.Q.value = 0.72;

      const gain = runtime.context.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      noise.connect(filter);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(runtime.master);
      noise.start(now);
      oscillator.start(now);
      runtime.rumble = {
        filter,
        gain,
        noise,
        oscillator,
      };
    } catch {
      stopRumble(true);
    }
  }, [getRuntime, stopRumble]);

  const updateKnobRumble = useCallback(
    (deltaDegrees: number, elapsedMs: number) => {
      const runtime = runtimeRef.current;
      const rumble = runtime?.rumble;
      if (!runtime || !rumble) return;

      const velocity =
        Math.abs(deltaDegrees) / Math.max(8, Math.min(elapsedMs, 80));
      const motion = Math.min(1, velocity / 0.45);
      const now = runtime.context.currentTime;
      const level = 0.006 + motion * 0.024;
      const cutoff = 58 + motion * 62;

      rumble.gain.gain.cancelScheduledValues(now);
      rumble.gain.gain.setValueAtTime(
        Math.max(rumble.gain.gain.value, 0.0001),
        now,
      );
      rumble.gain.gain.linearRampToValueAtTime(level, now + 0.014);
      rumble.filter.frequency.cancelScheduledValues(now);
      rumble.filter.frequency.linearRampToValueAtTime(cutoff, now + 0.018);

      if (rumbleIdleTimerRef.current !== null) {
        window.clearTimeout(rumbleIdleTimerRef.current);
      }
      rumbleIdleTimerRef.current = window.setTimeout(() => {
        rumbleIdleTimerRef.current = null;
        const activeRuntime = runtimeRef.current;
        const activeRumble = activeRuntime?.rumble;
        if (!activeRuntime || activeRumble !== rumble) return;
        const idleNow = activeRuntime.context.currentTime;
        rumble.gain.gain.cancelScheduledValues(idleNow);
        rumble.gain.gain.setValueAtTime(
          Math.max(rumble.gain.gain.value, 0.0001),
          idleNow,
        );
        rumble.gain.gain.exponentialRampToValueAtTime(
          0.0001,
          idleNow + 0.03,
        );
      }, RUMBLE_IDLE_MS);
    },
    [],
  );

  const playSwitchClick = useCallback(
    (nextPowered: boolean) => {
      const runtime = getRuntime();
      if (!runtime) return;

      try {
        const now = runtime.context.currentTime;
        const duration = nextPowered ? 0.032 : 0.028;
        const oscillator = runtime.context.createOscillator();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(nextPowered ? 680 : 540, now);
        oscillator.frequency.exponentialRampToValueAtTime(
          nextPowered ? 230 : 190,
          now + duration,
        );
        const oscillatorGain = runtime.context.createGain();
        oscillatorGain.gain.setValueAtTime(0.044, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + duration,
        );

        const noise = runtime.context.createBufferSource();
        noise.buffer = runtime.noiseBuffer;
        const noiseFilter = runtime.context.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.value = nextPowered ? 1500 : 1180;
        noiseFilter.Q.value = 0.85;
        const noiseGain = runtime.context.createGain();
        noiseGain.gain.setValueAtTime(0.022, now);
        noiseGain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + duration * 0.72,
        );

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(runtime.master);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(runtime.master);
        oscillator.start(now);
        noise.start(now);
        oscillator.stop(now + duration + 0.006);
        noise.stop(now + duration + 0.006);
        oscillator.onended = () => {
          disconnectNode(oscillator);
          disconnectNode(oscillatorGain);
        };
        noise.onended = () => {
          disconnectNode(noise);
          disconnectNode(noiseFilter);
          disconnectNode(noiseGain);
        };
      } catch {
        // Audio feedback is supplemental; interaction must still succeed.
      }
    },
    [getRuntime],
  );

  const playKnobStep = useCallback(
    (deltaValue: number) => {
      const runtime = getRuntime();
      if (!runtime || deltaValue === 0) return;

      try {
        const now = runtime.context.currentTime;
        const duration = 0.065;
        const magnitude = Math.min(1, Math.abs(deltaValue) / 10);
        const noise = runtime.context.createBufferSource();
        noise.buffer = runtime.noiseBuffer;
        const filter = runtime.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 74 + magnitude * 34;
        const gain = runtime.context.createGain();
        gain.gain.setValueAtTime(0.014 + magnitude * 0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(runtime.master);
        noise.start(now);
        noise.stop(now + duration + 0.005);
        noise.onended = () => {
          disconnectNode(noise);
          disconnectNode(filter);
          disconnectNode(gain);
        };
      } catch {
        // Audio feedback is supplemental; interaction must still succeed.
      }
    },
    [getRuntime],
  );

  const endKnobRumble = useCallback(() => stopRumble(false), [stopRumble]);

  useEffect(() => {
    const stopForInterruption = () => stopRumble(true);
    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") stopRumble(true);
    };
    window.addEventListener("blur", stopForInterruption);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.removeEventListener("blur", stopForInterruption);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      stopRumble(true);
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      if (runtime) void runtime.context.close().catch(() => {});
    };
  }, [stopRumble]);

  return useMemo(
    () => ({
      beginKnobRumble,
      endKnobRumble,
      playKnobStep,
      playSwitchClick,
      updateKnobRumble,
    }),
    [
      beginKnobRumble,
      endKnobRumble,
      playKnobStep,
      playSwitchClick,
      updateKnobRumble,
    ],
  );
}
