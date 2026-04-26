import "basecoat-css/all";
import htmx from "htmx.org";
import Alpine from "alpinejs";
import Sortable from "sortablejs";
import { createIcons, icons } from "lucide";

window.htmx = htmx;
window.Alpine = Alpine;

window.torelooBoard = function torelooBoard() {
  return {
    createMode: "card",
    filterOpen: false,
    openCreateDialog(mode = "card") {
      this.createMode = mode;
      const dialog = document.getElementById("create-dialog");
      if (!dialog) return;
      if (!dialog.open) dialog.showModal();
      window.requestAnimationFrame(() => {
        const selector = mode === "list" ? "[data-create-list-title]" : "[data-create-card-title]";
        dialog.querySelector(selector)?.focus();
      });
    },
    toggleFilter() {
      this.filterOpen = !this.filterOpen;
    },
    openShortcuts() {
      document.getElementById("shortcuts-dialog")?.showModal();
    }
  };
};

function initIcons(root = document) {
  createIcons({
    icons,
    attrs: {
      "stroke-width": 2,
      "aria-hidden": "true"
    },
    nameAttr: "data-lucide",
    root
  });
}

function initSortables(root = document) {
  const board = root.querySelector?.("[data-board-lists]") || document.querySelector("[data-board-lists]");
  if (board && !board.dataset.sortableReady) {
    board.dataset.sortableReady = "true";
    Sortable.create(board, {
      draggable: "[data-list]",
      handle: "[data-list-drag-handle]",
      filter: "input, textarea, select, button, a, dialog, [data-no-drag]",
      preventOnFilter: false,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd() {
        const listIds = Array.from(board.querySelectorAll(":scope > [data-list]")).map((list) => list.dataset.listId);
        postJson(`/boards/${board.dataset.boardId}/reorder-lists`, { listIds });
      }
    });
  }

  document.querySelectorAll("[data-card-list]").forEach((list) => {
    if (list.dataset.sortableReady) return;
    list.dataset.sortableReady = "true";
    Sortable.create(list, {
      group: "cards",
      draggable: "[data-card]",
      handle: "[data-card-drag-handle]",
      filter: "input, textarea, select, button, a, dialog, [data-no-drag]",
      preventOnFilter: false,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd(event) {
        const cardId = event.item?.dataset.cardId;
        const listId = event.to?.dataset.listId;
        if (!cardId || !listId) return;
        const cardIds = Array.from(event.to.querySelectorAll("[data-card]")).map((card) => card.dataset.cardId);
        postJson(`/cards/${cardId}/move`, { listId, cardIds });
      }
    });
  });
}

function initCardDialog(target) {
  if (!target || target.id !== "card-modal-shell") return;
  const dialog = target.querySelector("[data-card-detail-dialog]");
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
  dialog.addEventListener(
    "close",
    () => {
      target.innerHTML = "";
    },
    { once: true }
  );
}

function syncBoardBackground() {
  const header = document.getElementById("board-header");
  const value = header?.dataset.boardBackgroundValue;
  if (value) {
    document.body.style.setProperty("--toreloo-board-bg", value);
  }
}

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || isTypingTarget(event.target)) return;
    if (event.key === "f") {
      event.preventDefault();
      document.getElementById("filter-toggle")?.click();
    }
    if (event.key === "x") {
      event.preventDefault();
      document.getElementById("clear-filters")?.click();
    }
    if (event.key === "/") {
      event.preventDefault();
      document.getElementById("filter-toggle")?.click();
      window.requestAnimationFrame(() => document.getElementById("board-filter-search")?.focus());
    }
    if (event.key === "?") {
      event.preventDefault();
      document.getElementById("shortcuts-dialog")?.showModal();
    }
  });
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "HX-Request": "true"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    console.error("Toreloo request failed", response.status, await response.text());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initIcons();
  initSortables();
  syncBoardBackground();
  initKeyboardShortcuts();
  Alpine.start();
});

document.addEventListener("htmx:afterSwap", (event) => {
  initIcons(event.detail.target);
  initSortables(event.detail.target);
  initCardDialog(event.detail.target);
  syncBoardBackground();
});

document.addEventListener("htmx:oobAfterSwap", (event) => {
  initIcons(event.detail.target);
  syncBoardBackground();
});
