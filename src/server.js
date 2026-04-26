import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  activeFilterCount,
  addAttachment,
  addChecklist,
  addChecklistItem,
  addComment,
  archiveCard,
  archiveList,
  backgroundOptions,
  boardStats,
  coverStyles,
  createCard,
  createList,
  deleteCard,
  getBoardModel,
  getCardModel,
  labelStyles,
  moveCard,
  reorderListCards,
  reorderLists,
  toggleChecklistItem,
  updateCard,
  updateList
} from "./board-service.js";
import {
  checklistProgress,
  cn,
  dueLabel,
  dueState,
  escapeHtml,
  formatDateInput,
  formatDateTime
} from "./helpers.js";
import { readData, updateData } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(rootDir, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));
app.use("/assets", express.static(path.join(rootDir, "public/assets")));

Object.assign(app.locals, {
  activeFilterCount,
  backgroundOptions,
  boardStats,
  checklistProgress,
  cn,
  coverStyles,
  dueLabel,
  dueState,
  escapeHtml,
  formatDateInput,
  formatDateTime,
  labelStyles
});

app.get("/", async (_req, res, next) => {
  try {
    const data = await readData();
    res.redirect(`/boards/${data.boards[0].id}`);
  } catch (error) {
    next(error);
  }
});

app.get("/boards/:boardId", async (req, res, next) => {
  try {
    const data = await readData();
    const model = getBoardModel(data, req.params.boardId, req.query);
    if (!model) return res.status(404).send("ボードが見つかりません。");
    res.render("pages/board", { model, stats: boardStats(model) });
  } catch (error) {
    next(error);
  }
});

app.get("/boards/:boardId/lists", async (req, res, next) => {
  try {
    await renderBoardLists(req, res, req.params.boardId);
  } catch (error) {
    next(error);
  }
});

app.patch("/boards/:boardId", async (req, res, next) => {
  try {
    const boardId = req.params.boardId;
    await updateData((data) => {
      const board = data.boards.find((item) => item.id === boardId);
      if (!board) throw new Error("ボードが見つかりません。");
      if (req.body.title) board.title = req.body.title.trim();
      if (req.body.background && backgroundOptions[req.body.background]) {
        board.background = req.body.background;
      }
      return board;
    });
    const data = await readData();
    const model = getBoardModel(data, boardId, req.query);
    res.render("partials/board-header", { model, stats: boardStats(model) });
  } catch (error) {
    next(error);
  }
});

app.post("/boards/:boardId/lists", async (req, res, next) => {
  try {
    const boardId = req.params.boardId;
    await updateData((data) => createList(data, boardId, req.body.title));
    await renderBoardLists(req, res, boardId);
  } catch (error) {
    next(error);
  }
});

app.post("/boards/:boardId/cards", async (req, res, next) => {
  try {
    const boardId = req.params.boardId;
    await updateData((data) => {
      const list = data.lists.find(
        (item) => item.id === req.body.listId && item.boardId === boardId && !item.archived
      );
      if (!list) throw new Error("追加先のリストが見つかりません。");
      return createCard(data, list.id, req.body);
    });
    await renderBoardLists(req, res, boardId);
  } catch (error) {
    next(error);
  }
});

app.post("/boards/:boardId/reorder-lists", async (req, res, next) => {
  try {
    await updateData((data) => reorderLists(data, req.params.boardId, req.body.listIds));
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.patch("/lists/:listId", async (req, res, next) => {
  try {
    const list = await updateData((data) => updateList(data, req.params.listId, req.body));
    await renderList(res, list.id);
  } catch (error) {
    next(error);
  }
});

app.patch("/lists/:listId/archive", async (req, res, next) => {
  try {
    const list = await updateData((data) => archiveList(data, req.params.listId));
    await renderBoardLists(req, res, list.boardId);
  } catch (error) {
    next(error);
  }
});

app.post("/lists/:listId/cards", async (req, res, next) => {
  try {
    const card = await updateData((data) => createCard(data, req.params.listId, req.body));
    await renderList(res, card.listId);
  } catch (error) {
    next(error);
  }
});

app.post("/lists/:listId/reorder", async (req, res, next) => {
  try {
    await updateData((data) => reorderListCards(data, req.params.listId, req.body.cardIds));
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.get("/cards/:cardId", async (req, res, next) => {
  try {
    const data = await readData();
    const model = getCardModel(data, req.params.cardId);
    if (!model) return res.status(404).send("カードが見つかりません。");
    res.render("partials/card-modal", { model });
  } catch (error) {
    next(error);
  }
});

app.patch("/cards/:cardId", async (req, res, next) => {
  try {
    await updateData((data) => updateCard(data, req.params.cardId, normalizeCardBody(req.body)));
    await renderCardModalWithOob(res, req.params.cardId);
  } catch (error) {
    next(error);
  }
});

app.patch("/cards/:cardId/quick", async (req, res, next) => {
  try {
    await updateData((data) => updateCard(data, req.params.cardId, normalizeCardBody(req.body)));
    await renderCard(res, req.params.cardId);
  } catch (error) {
    next(error);
  }
});

app.patch("/cards/:cardId/archive", async (req, res, next) => {
  try {
    const card = await updateData((data) => archiveCard(data, req.params.cardId));
    const list = (await readData()).lists.find((item) => item.id === card.listId);
    await renderBoardLists(req, res, list.boardId);
  } catch (error) {
    next(error);
  }
});

app.delete("/cards/:cardId", async (req, res, next) => {
  try {
    const result = await updateData((data) => deleteCard(data, req.params.cardId));
    await renderBoardLists(req, res, result.list.boardId);
  } catch (error) {
    next(error);
  }
});

app.post("/cards/:cardId/move", async (req, res, next) => {
  try {
    await updateData((data) => moveCard(data, req.params.cardId, req.body.listId, req.body.cardIds));
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.post("/cards/:cardId/comments", async (req, res, next) => {
  try {
    await updateData((data) => addComment(data, req.params.cardId, req.body));
    await renderCardModalWithOob(res, req.params.cardId);
  } catch (error) {
    next(error);
  }
});

app.post("/cards/:cardId/attachments", async (req, res, next) => {
  try {
    await updateData((data) => addAttachment(data, req.params.cardId, req.body));
    await renderCardModalWithOob(res, req.params.cardId);
  } catch (error) {
    next(error);
  }
});

app.post("/cards/:cardId/checklists", async (req, res, next) => {
  try {
    await updateData((data) => addChecklist(data, req.params.cardId, req.body.title));
    await renderCardModalWithOob(res, req.params.cardId);
  } catch (error) {
    next(error);
  }
});

app.post("/cards/:cardId/checklists/:checklistId/items", async (req, res, next) => {
  try {
    await updateData((data) => addChecklistItem(data, req.params.cardId, req.params.checklistId, req.body.title));
    await renderCardModalWithOob(res, req.params.cardId);
  } catch (error) {
    next(error);
  }
});

app.patch("/cards/:cardId/checklists/:checklistId/items/:itemId", async (req, res, next) => {
  try {
    await updateData((data) =>
      toggleChecklistItem(data, req.params.cardId, req.params.checklistId, req.params.itemId, req.body.done === "true")
    );
    await renderCardModalWithOob(res, req.params.cardId);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, _next) => {
  const status = error.status || 400;
  const message = error.message || "エラーが発生しました。";
  if (req.get("HX-Request")) {
    res.status(status).send(`<div class="text-sm text-red-700">${escapeHtml(message)}</div>`);
    return;
  }
  res.status(status).send(message);
});

async function renderBoardLists(req, res, boardId) {
  const data = await readData();
  const model = getBoardModel(data, boardId, req.query);
  if (!model) return res.status(404).send("ボードが見つかりません。");
  res.render("responses/board-lists-with-header", { model, stats: boardStats(model) });
}

async function renderList(res, listId) {
  const data = await readData();
  const list = data.lists.find((item) => item.id === listId);
  const board = data.boards.find((item) => item.id === list.boardId);
  const model = getBoardModel(data, board.id, {});
  const listModel = model.lists.find((item) => item.id === listId);
  res.render("partials/list", { model, list: listModel });
}

async function renderCard(res, cardId) {
  const data = await readData();
  const model = getCardModel(data, cardId);
  res.render("partials/card", {
    model: getBoardModel(data, model.board.id, {}),
    card: model.card,
    oob: false
  });
}

async function renderCardModalWithOob(res, cardId) {
  const data = await readData();
  const model = getCardModel(data, cardId);
  res.render("responses/card-modal-with-oob", {
    model,
    boardModel: getBoardModel(data, model.board.id, {})
  });
}

function normalizeCardBody(body) {
  const normalized = { ...body };
  if (Object.prototype.hasOwnProperty.call(body, "labels")) normalized.labels = asArray(body.labels);
  if (Object.prototype.hasOwnProperty.call(body, "memberIds")) normalized.memberIds = asArray(body.memberIds);
  if (Object.prototype.hasOwnProperty.call(body, "dueComplete")) {
    normalized.dueComplete = body.dueComplete === "true" || body.dueComplete === "on";
  }
  return normalized;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Toreloo listening on http://localhost:${port}`);
  });
}

export default app;
