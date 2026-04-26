import crypto from "node:crypto";
import { checklistProgress, dueState, nowIso } from "./helpers.js";

export const backgroundOptions = {
  blue: { label: "ブルー", value: "#0c66e4", text: "text-white" },
  green: { label: "グリーン", value: "#1f845a", text: "text-white" },
  slate: { label: "スレート", value: "#475569", text: "text-white" },
  rose: { label: "ローズ", value: "#be123c", text: "text-white" },
  amber: { label: "アンバー", value: "#b45309", text: "text-white" },
  zinc: { label: "グレー", value: "#3f3f46", text: "text-white" }
};

export const labelStyles = {
  sky: "bg-sky-500 text-white",
  pink: "bg-pink-500 text-white",
  emerald: "bg-emerald-500 text-white",
  rose: "bg-rose-600 text-white",
  amber: "bg-amber-400 text-slate-950",
  violet: "bg-violet-500 text-white",
  gray: "bg-slate-300 text-slate-950"
};

export const coverStyles = {
  blue: "bg-blue-600",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-400",
  rose: "bg-rose-500",
  slate: "bg-slate-600"
};

function id(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function compact(value) {
  return typeof value === "string" ? value.trim() : value;
}

export function getBoardModel(data, boardId, filters = {}) {
  const board = data.boards.find((item) => item.id === boardId);
  if (!board) return null;
  const labels = data.labels.filter((label) => label.boardId === board.id);
  const members = data.members;
  const lists = board.listIds
    .map((listId) => data.lists.find((list) => list.id === listId && !list.archived))
    .filter(Boolean)
    .map((list) => {
      const cards = list.cardIds
        .map((cardId) => data.cards.find((card) => card.id === cardId && !card.archived))
        .filter(Boolean)
        .filter((card) => cardMatchesFilters(card, data, filters));
      return { ...list, cards };
    });
  return {
    board,
    labels,
    members,
    lists,
    filters: normalizeFilters(filters),
    activeFilterCount: activeFilterCount(filters),
    background: backgroundOptions[board.background] ?? backgroundOptions.blue
  };
}

export function getCardModel(data, cardId) {
  const card = data.cards.find((item) => item.id === cardId && !item.archived);
  if (!card) return null;
  const list = data.lists.find((item) => item.id === card.listId);
  const board = data.boards.find((item) => item.id === list?.boardId);
  if (!list || !board) return null;
  return {
    board,
    list,
    card,
    labels: data.labels.filter((label) => label.boardId === board.id),
    cardLabels: card.labels
      .map((labelId) => data.labels.find((label) => label.id === labelId))
      .filter(Boolean),
    members: data.members,
    cardMembers: card.memberIds
      .map((memberId) => data.members.find((member) => member.id === memberId))
      .filter(Boolean)
  };
}

export function cardMatchesFilters(card, data, rawFilters = {}) {
  const filters = normalizeFilters(rawFilters);
  if (filters.q) {
    const query = filters.q.toLowerCase();
    const haystack = [card.title, card.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.label && !card.labels.includes(filters.label)) return false;
  if (filters.member && !card.memberIds.includes(filters.member)) return false;
  if (filters.status === "complete" && !card.dueComplete) return false;
  if (filters.status === "open" && card.dueComplete) return false;
  if (filters.due && filters.due !== "any") {
    const state = dueState(card.dueAt, card.dueComplete);
    if (filters.due === "none" && state !== "none") return false;
    if (filters.due === "soon" && state !== "soon") return false;
    if (filters.due === "overdue" && !["overdue", "overdue-long"].includes(state)) return false;
    if (filters.due === "complete" && state !== "complete") return false;
  }
  return true;
}

export function normalizeFilters(raw = {}) {
  return {
    q: compact(raw.q || ""),
    label: compact(raw.label || ""),
    member: compact(raw.member || ""),
    due: compact(raw.due || ""),
    status: compact(raw.status || "")
  };
}

export function activeFilterCount(raw = {}) {
  const filters = normalizeFilters(raw);
  return Object.values(filters).filter(Boolean).length;
}

export function createList(data, boardId, title) {
  const board = requireBoard(data, boardId);
  const list = {
    id: id("list"),
    boardId: board.id,
    title: compact(title) || "新しいリスト",
    archived: false,
    cardIds: []
  };
  data.lists.push(list);
  board.listIds.push(list.id);
  return list;
}

export function updateList(data, listId, attrs) {
  const list = requireList(data, listId);
  if (attrs.title !== undefined) list.title = compact(attrs.title) || list.title;
  return list;
}

export function archiveList(data, listId) {
  const list = requireList(data, listId);
  list.archived = true;
  return list;
}

export function createCard(data, listId, attrs = {}) {
  const list = requireList(data, listId);
  const card = {
    id: id("card"),
    listId: list.id,
    title: compact(attrs.title) || "無題のカード",
    description: compact(attrs.description || ""),
    cover: attrs.cover || null,
    labels: normalizeArray(attrs.labels),
    memberIds: normalizeArray(attrs.memberIds),
    startAt: attrs.startAt || null,
    dueAt: attrs.dueAt || null,
    dueComplete: Boolean(attrs.dueComplete),
    archived: false,
    comments: [],
    attachments: [],
    checklists: [],
    activities: [{ id: id("activity"), text: "カードを作成しました。", createdAt: nowIso() }]
  };
  data.cards.push(card);
  list.cardIds.push(card.id);
  return card;
}

export function updateCard(data, cardId, attrs) {
  const card = requireCard(data, cardId);
  const allowed = ["title", "description", "startAt", "dueAt", "dueComplete"];
  for (const key of allowed) {
    if (attrs[key] !== undefined) {
      card[key] = typeof attrs[key] === "string" ? compact(attrs[key]) : attrs[key];
    }
  }
  if (attrs.startAt === "") card.startAt = null;
  if (attrs.dueAt === "") card.dueAt = null;
  if (attrs.labels !== undefined) card.labels = normalizeArray(attrs.labels);
  if (attrs.memberIds !== undefined) card.memberIds = normalizeArray(attrs.memberIds);
  if (attrs.coverValue !== undefined) {
    const value = compact(attrs.coverValue);
    card.cover = value ? { type: "color", value } : null;
  }
  card.activities.unshift({ id: id("activity"), text: "カードを更新しました。", createdAt: nowIso() });
  return card;
}

export function archiveCard(data, cardId) {
  const card = requireCard(data, cardId);
  card.archived = true;
  return card;
}

export function deleteCard(data, cardId) {
  const card = requireCard(data, cardId);
  const list = requireList(data, card.listId);
  list.cardIds = list.cardIds.filter((idValue) => idValue !== card.id);
  data.cards = data.cards.filter((item) => item.id !== card.id);
  return { card, list };
}

export function moveCard(data, cardId, targetListId, orderedCardIds = []) {
  const card = requireCard(data, cardId);
  const sourceList = requireList(data, card.listId);
  const targetList = requireList(data, targetListId);
  sourceList.cardIds = sourceList.cardIds.filter((idValue) => idValue !== card.id);
  const cleanedOrder = orderedCardIds.filter((idValue) => data.cards.some((item) => item.id === idValue));
  targetList.cardIds = cleanedOrder.length
    ? cleanedOrder
    : [...targetList.cardIds.filter((idValue) => idValue !== card.id), card.id];
  card.listId = targetList.id;
  card.activities.unshift({
    id: id("activity"),
    text: `${sourceList.title} から ${targetList.title} へ移動しました。`,
    createdAt: nowIso()
  });
  return card;
}

export function reorderListCards(data, listId, orderedCardIds = []) {
  const list = requireList(data, listId);
  const valid = orderedCardIds.filter((idValue) => {
    const card = data.cards.find((item) => item.id === idValue);
    return card && card.listId === list.id;
  });
  list.cardIds = valid;
  return list;
}

export function reorderLists(data, boardId, orderedListIds = []) {
  const board = requireBoard(data, boardId);
  const valid = orderedListIds.filter((listId) => {
    const list = data.lists.find((item) => item.id === listId);
    return list && list.boardId === board.id && !list.archived;
  });
  board.listIds = valid;
  return board;
}

export function addComment(data, cardId, attrs) {
  const card = requireCard(data, cardId);
  const text = compact(attrs.text);
  if (!text) throw new Error("コメントを入力してください。");
  const comment = {
    id: id("comment"),
    memberId: attrs.memberId || data.members[0]?.id || null,
    text,
    createdAt: nowIso()
  };
  card.comments.unshift(comment);
  card.activities.unshift({ id: id("activity"), text: "コメントを追加しました。", createdAt: nowIso() });
  return comment;
}

export function addAttachment(data, cardId, attrs) {
  const card = requireCard(data, cardId);
  const name = compact(attrs.name);
  const url = compact(attrs.url);
  if (!name || !url) throw new Error("添付名とURLを入力してください。");
  const attachment = { id: id("attachment"), name, url, kind: "link" };
  card.attachments.unshift(attachment);
  card.activities.unshift({ id: id("activity"), text: "添付を追加しました。", createdAt: nowIso() });
  return attachment;
}

export function addChecklist(data, cardId, title) {
  const card = requireCard(data, cardId);
  const checklist = {
    id: id("checklist"),
    title: compact(title) || "チェックリスト",
    items: []
  };
  card.checklists.push(checklist);
  card.activities.unshift({ id: id("activity"), text: "チェックリストを追加しました。", createdAt: nowIso() });
  return checklist;
}

export function addChecklistItem(data, cardId, checklistId, title) {
  const card = requireCard(data, cardId);
  const checklist = requireChecklist(card, checklistId);
  const item = {
    id: id("item"),
    title: compact(title) || "新しい項目",
    done: false,
    memberId: null,
    dueAt: null
  };
  checklist.items.push(item);
  return item;
}

export function toggleChecklistItem(data, cardId, checklistId, itemId, done) {
  const card = requireCard(data, cardId);
  const checklist = requireChecklist(card, checklistId);
  const item = checklist.items.find((entry) => entry.id === itemId);
  if (!item) throw new Error("チェック項目が見つかりません。");
  item.done = Boolean(done);
  return item;
}

export function boardStats(model) {
  const cards = model.lists.flatMap((list) => list.cards);
  const complete = cards.filter((card) => card.dueComplete).length;
  const overdue = cards.filter((card) => ["overdue", "overdue-long"].includes(dueState(card.dueAt, card.dueComplete))).length;
  const checklistItems = cards.reduce((sum, card) => sum + checklistProgress(card).total, 0);
  return { cards: cards.length, complete, overdue, checklistItems };
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function requireBoard(data, boardId) {
  const board = data.boards.find((item) => item.id === boardId);
  if (!board) throw new Error("ボードが見つかりません。");
  return board;
}

function requireList(data, listId) {
  const list = data.lists.find((item) => item.id === listId);
  if (!list) throw new Error("リストが見つかりません。");
  return list;
}

function requireCard(data, cardId) {
  const card = data.cards.find((item) => item.id === cardId);
  if (!card) throw new Error("カードが見つかりません。");
  return card;
}

function requireChecklist(card, checklistId) {
  const checklist = card.checklists.find((entry) => entry.id === checklistId);
  if (!checklist) throw new Error("チェックリストが見つかりません。");
  return checklist;
}
