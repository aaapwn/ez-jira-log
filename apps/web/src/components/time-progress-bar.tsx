import { hoursToTimeString } from "@/lib/date-utils";

interface TimeProgressBarProps {
  hoursLogged: number;
  hoursDrafted: number;
  target: number;
}

export default function TimeProgressBar({
  hoursLogged,
  hoursDrafted,
  target,
}: TimeProgressBarProps) {
  const loggedPercent = Math.min((hoursLogged / target) * 100, 100);
  const draftedPercent = Math.min(
    ((hoursLogged + hoursDrafted) / target) * 100,
    100,
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-ocean-300 to-ocean-400" />
            <span className="text-muted-foreground">Logged:</span>
            <span className="font-semibold tabular-nums">
              {hoursToTimeString(hoursLogged)}
            </span>
          </span>
          {hoursDrafted > 0 && (
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ocean-200" />
              <span className="text-muted-foreground">Drafted:</span>
              <span className="font-semibold tabular-nums">
                {hoursToTimeString(hoursDrafted)}
              </span>
            </span>
          )}
        </div>
        <span className="text-muted-foreground tabular-nums">
          Target: {target}h
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-ocean-200/40 transition-all duration-500 ease-out"
          style={{ width: `${draftedPercent}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${loggedPercent}%`,
            background: "linear-gradient(90deg, #0077b6, #00b4d8)",
          }}
        />
      </div>
    </div>
  );
}
