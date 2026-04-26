import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  cardMatchesFilters,
  createCard,
  getBoardModel,
  moveCard,
  reorderLists,
  toggleChecklistItem
} from "../src/board-service.js";
import { checklistProgress, dueState } from "../src/helpers.js";
import { readData, writeData } from "../src/store.js";

function sampleData() {
  return {
    boards: [
      {
        id: "board-1",
        title: "Board",
        workspace: "Local",
        description: "",
        visibility: "Private",
        background: "blue",
        listIds: ["list-a", "list-b"]
      }
    ],
    labels: [{ id: "label-a", boardId: "board-1", title: "Design", color: "sky" }],
    members: [{ id: "member-a", name: "Aoki", initials: "A", color: "bg-blue-600" }],
    lists: [
      { id: "list-a", boardId: "board-1", title: "A", archived: false, cardIds: ["card-a"] },
      { id: "list-b", boardId: "board-1", title: "B", archived: false, cardIds: [] }
    ],
    cards: [
      {
        id: "card-a",
        listId: "list-a",
        title: "UI polish",
        description: "Trello-like badges",
        cover: null,
        labels: ["label-a"],
        memberIds: ["member-a"],
        startAt: null,
        dueAt: "2026-04-27T00:00:00.000Z",
        dueComplete: false,
        archived: false,
        comments: [],
        attachments: [],
        checklists: [
          {
            id: "checklist-a",
            title: "Tasks",
            items: [
              { id: "item-a", title: "One", done: true, memberId: null, dueAt: null },
              { id: "item-b", title: "Two", done: false, memberId: null, dueAt: null }
            ]
          }
        ],
        activities: []
      }
    ]
  };
}

test("filters board cards by query, label, member, and due status", () => {
  const data = sampleData();
  assert.equal(cardMatchesFilters(data.cards[0], data, { q: "badges", label: "label-a", member: "member-a" }), true);
  assert.equal(cardMatchesFilters(data.cards[0], data, { q: "missing" }), false);

  const model = getBoardModel(data, "board-1", { q: "ui", label: "label-a" });
  assert.equal(model.lists[0].cards.length, 1);
  assert.equal(model.lists[1].cards.length, 0);
});

test("creates and moves cards while preserving list order", () => {
  const data = sampleData();
  const created = createCard(data, "list-a", { title: "New card" });
  assert.equal(data.lists[0].cardIds.at(-1), created.id);

  moveCard(data, created.id, "list-b", [created.id]);
  assert.deepEqual(data.lists[0].cardIds, ["card-a"]);
  assert.deepEqual(data.lists[1].cardIds, [created.id]);
  assert.equal(data.cards.find((card) => card.id === created.id).listId, "list-b");
});

test("reorders lists and toggles checklist progress", () => {
  const data = sampleData();
  reorderLists(data, "board-1", ["list-b", "list-a"]);
  assert.deepEqual(data.boards[0].listIds, ["list-b", "list-a"]);

  const card = data.cards[0];
  assert.deepEqual(checklistProgress(card), { done: 1, total: 2 });
  toggleChecklistItem(data, "card-a", "checklist-a", "item-b", true);
  assert.deepEqual(checklistProgress(card), { done: 2, total: 2 });
});

test("computes due states", () => {
  const now = new Date("2026-04-27T12:00:00.000Z");
  assert.equal(dueState("2026-04-27T20:00:00.000Z", false, now), "soon");
  assert.equal(dueState("2026-04-26T12:00:00.000Z", false, now), "overdue");
  assert.equal(dueState("2026-04-26T12:00:00.000Z", true, now), "complete");
  assert.equal(dueState(null, false, now), "none");
});

test("writes JSON data atomically to a file", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "toreloo-"));
  const file = path.join(dir, "boards.json");
  const data = sampleData();
  await writeData(data, file);
  assert.deepEqual(await readData(file), data);
});
