import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function dueState(dueAt, complete = false, now = new Date()) {
  if (!dueAt) return "none";
  if (complete) return "complete";
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "none";
  const diff = due.getTime() - now.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < -day) return "overdue-long";
  if (diff < 0) return "overdue";
  if (diff <= day) return "soon";
  return "later";
}

export function dueLabel(dueAt, complete = false, now = new Date()) {
  const state = dueState(dueAt, complete, now);
  const date = formatDateTime(dueAt);
  const stateLabels = {
    none: "",
    complete: "完了",
    "overdue-long": "期限超過",
    overdue: "期限切れ",
    soon: "まもなく",
    later: "期限"
  };
  return [stateLabels[state], date].filter(Boolean).join(" ");
}

export function checklistProgress(card) {
  const items = (card.checklists || []).flatMap((checklist) => checklist.items || []);
  const done = items.filter((item) => item.done).length;
  return { done, total: items.length };
}

export function nowIso() {
  return new Date().toISOString();
}
