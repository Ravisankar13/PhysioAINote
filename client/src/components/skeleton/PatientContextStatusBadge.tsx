import { Sparkles, Loader2, UserPlus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type PatientContextDownstreamStatus = "absent" | "applied" | "updating";

interface PatientContextStatusBadgeProps {
  status: PatientContextDownstreamStatus;
  /** How many answered prompts are currently in the patient context.
   *  Shown next to the "applied" badge as a small count. */
  answeredCount?: number;
  /** Where the badge is being shown ("Treatment plan", "Recovery sim",
   *  "Natural timeline"). Used in the tooltip and for the
   *  "no-context accuracy hint" copy so the user knows what to expect. */
  surfaceLabel?: string;
  /** Optional click handler for the "absent" state — typically a
   *  shortcut that focuses the Patient Context panel so the clinician
   *  can fill in answers without hunting for it. */
  onAddContextClick?: () => void;
  /** When true, mirrors the "prompts stale" warning from the Patient
   *  Context card directly in the downstream panel header — so the
   *  clinician knows the prediction text was edited and the prompts
   *  themselves should be regenerated even though the displayed result
   *  still has context applied. */
  promptsStale?: boolean;
  className?: string;
  size?: "xs" | "sm";
}

/** Tiny chip that downstream AI-driven panels (natural timeline,
 *  case-specific treatment plan, recovery simulation) render to tell
 *  the clinician whether the displayed reasoning has the latest
 *  patient context folded in. Three states:
 *
 *    - "absent"   : prediction exists but no patient context yet —
 *                   prompts a non-blocking accuracy hint.
 *    - "updating" : context just changed; downstream call is in flight.
 *    - "applied"  : the displayed result was generated WITH the current
 *                   patient context.
 */
export function PatientContextStatusBadge({
  status,
  answeredCount = 0,
  surfaceLabel,
  onAddContextClick,
  promptsStale = false,
  className,
  size = "xs",
}: PatientContextStatusBadgeProps) {
  const sizeClasses = size === "xs"
    ? "h-5 text-[10px] px-1.5 py-0 gap-1"
    : "h-6 text-[11px] px-2 py-0 gap-1.5";

  // Render the optional "prompts stale" warning as a sibling chip.
  // It mirrors the stale cue from the Patient Context card so the
  // clinician sees it on every downstream panel header too.
  const stalePill = promptsStale && status !== "absent" ? (
    <TooltipProvider key="stale">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center rounded-full border border-amber-400/50 bg-amber-500/15 text-amber-200 ml-1",
              sizeClasses,
            )}
            data-testid="badge-patient-context-prompts-stale"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            Prompts stale
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-xs">
          The clinician text changed since the prompts were generated. Regenerate prompts in the Patient Context card to make sure they still match the new prediction.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;

  if (status === "absent") {
    const hint = surfaceLabel
      ? `Add patient context (e.g. diabetes, NSAIDs, sleep, prior episodes) — your ${surfaceLabel.toLowerCase()} would be more accurate with it.`
      : "Add patient context — your AI outputs would be more accurate with it.";
    const Wrapper: React.ElementType = onAddContextClick ? "button" : "span";
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Wrapper
              type={onAddContextClick ? "button" : undefined}
              onClick={onAddContextClick}
              className={cn(
                "inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-200",
                "transition-colors",
                onAddContextClick && "hover:bg-amber-500/20 hover:text-amber-100 cursor-pointer",
                sizeClasses,
                className,
              )}
              data-testid="badge-patient-context-absent"
            >
              <UserPlus className="h-2.5 w-2.5" />
              No patient context
            </Wrapper>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
            {hint}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === "updating") {
    return (
      <span className="inline-flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border border-violet-400/50 bg-violet-500/15 text-violet-100",
                  sizeClasses,
                  className,
                )}
                data-testid="badge-patient-context-updating"
              >
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Patient context updated — regenerating…
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-xs">
              {surfaceLabel
                ? `Re-running the ${surfaceLabel.toLowerCase()} with the latest patient context.`
                : "Re-running with the latest patient context."}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {stalePill}
      </span>
    );
  }

  // applied
  return (
    <span className="inline-flex items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
                sizeClasses,
                className,
              )}
              data-testid="badge-patient-context-applied"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Patient context applied{answeredCount > 0 ? ` · ${answeredCount}` : ""}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
            {surfaceLabel
              ? `This ${surfaceLabel.toLowerCase()} was generated with your patient context (${answeredCount} answered question${answeredCount === 1 ? "" : "s"}${answeredCount > 0 ? " + free-form notes" : ""}).`
              : "This output was generated with your patient context."}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {stalePill}
    </span>
  );
}
