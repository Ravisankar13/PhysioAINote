import { createContext, useContext, type ReactNode } from "react";
import type { PlanCartItem } from "@/lib/planCart";

export interface TreatmentSimulationContextValue {
  requestTreatmentSimulation: (item: PlanCartItem) => void;
}

const TreatmentSimulationContext = createContext<TreatmentSimulationContextValue | null>(null);

export function TreatmentSimulationProvider({
  value,
  children,
}: {
  value: TreatmentSimulationContextValue;
  children: ReactNode;
}) {
  return (
    <TreatmentSimulationContext.Provider value={value}>
      {children}
    </TreatmentSimulationContext.Provider>
  );
}

export function useTreatmentSimulation(): TreatmentSimulationContextValue | null {
  return useContext(TreatmentSimulationContext);
}
