"use client";

import { createContext, useContext } from "react";

export interface AgentModeContextValue {
  active: boolean;
  transitioning: boolean;
  toggle: () => void;
}

export const AgentModeContext = createContext<AgentModeContextValue | null>(null);

export function useAgentMode() {
  return useContext(AgentModeContext);
}
