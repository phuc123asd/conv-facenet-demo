import { CircleDot } from "lucide-react";

type StatusBadgeProps = {
  label?: string;
  status: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const isLate = status === "Đi muộn";

  return (
    <span className={`badge ${isLate ? "late" : "good"}`}>
      <CircleDot size={10} fill="currentColor" />
      {label ?? status}
    </span>
  );
}
