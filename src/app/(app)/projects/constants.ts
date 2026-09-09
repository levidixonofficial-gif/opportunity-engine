export const PROJECT_STATUS_OPTIONS = [
  { value: "idea", label: "Idea" },
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

export const PROJECT_STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "warning"> = {
  idea: "neutral",
  planning: "neutral",
  active: "accent",
  paused: "warning",
  completed: "success",
};
