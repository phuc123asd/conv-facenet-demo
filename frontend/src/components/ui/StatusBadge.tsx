import { CircleDot } from "lucide-react";

type StatusBadgeProps = {
  label?: string;
  status: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalized = status.trim().toLowerCase();

  let statusClass = "good";
  if (
    normalized === "đi muộn" ||
    normalized === "di muon" ||
    normalized === "late" ||
    normalized === "rejected" ||
    normalized === "đã từ chối" ||
    normalized === "offline"
  ) {
    statusClass = "late";
  } else if (
    normalized === "về sớm" ||
    normalized === "ve som" ||
    normalized === "early" ||
    normalized === "chưa đăng ký" ||
    normalized === "chua dang ky" ||
    normalized === "pending"
  ) {
    statusClass = "pending";
  } else if (
    normalized === "không có ca" ||
    normalized === "khong co ca" ||
    normalized === "--"
  ) {
    statusClass = "neutral";
  }

  return (
    <span className={`badge ${statusClass}`}>
      <CircleDot size={10} fill="currentColor" />
      {label ?? status}
    </span>
  );
}
