import { useState } from "react";

import DayCard from "./day-card";

interface DayData {
  date: string;
  activities: Array<{ source: string; type: string }>;
  worklogStatus: { hoursLogged: number; target: number };
  status: "incomplete" | "complete" | "off";
}

interface TimelineGridProps {
  days: DayData[];
  selectedDates: Set<string>;
  onSelectionChange: (dates: Set<string>) => void;
}

export default function TimelineGrid({
  days,
  selectedDates,
  onSelectionChange,
}: TimelineGridProps) {
  const handleSelectChange = (date: string, checked: boolean) => {
    const next = new Set(selectedDates);
    if (checked) {
      next.add(date);
    } else {
      next.delete(date);
    }
    onSelectionChange(next);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {days.map((day) => {
        const commitCount = day.activities.filter(
          (a) => a.source === "gitlab" && a.type === "commit",
        ).length;
        const calendarCount = day.activities.filter(
          (a) => a.source === "calendar",
        ).length;

        return (
          <DayCard
            key={day.date}
            date={day.date}
            hoursLogged={day.worklogStatus.hoursLogged}
            target={day.worklogStatus.target}
            status={day.status}
            activityCount={commitCount + calendarCount}
            commitCount={commitCount}
            calendarCount={calendarCount}
            selected={selectedDates.has(day.date)}
            onSelectChange={(checked) => handleSelectChange(day.date, checked)}
          />
        );
      })}
    </div>
  );
}
