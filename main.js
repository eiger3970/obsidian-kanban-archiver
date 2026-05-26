var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => KanbanArchiverPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  daysThreshold: 30,
  archivePrefix: "Archive_",
  autoStamp: true,
  migrationDone: false,
  doneColumns: ["Done"]
};
var MigrationModal = class extends import_obsidian.Modal {
  constructor(app, plugin, undatedCount, onStamp, onSkip) {
    super(app);
    this.plugin = plugin;
    this.undatedCount = undatedCount;
    this.onStamp = onStamp;
    this.onSkip = onSkip;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Kanban Archiver \u2014 First Run" });
    contentEl.createEl("p", {
      text: `Found ${this.undatedCount} completed card(s) with no date across your Kanban boards.`
    });
    contentEl.createEl("p", {
      text: "Without a date, these cards cannot be automatically archived by age. You have two options:"
    });
    const list = contentEl.createEl("ul");
    list.createEl("li", {
      text: "Stamp today's date on all undated completed cards \u2014 they will then be archived after your threshold (default 30 days)."
    });
    list.createEl("li", {
      text: "Skip \u2014 undated cards will be archived immediately the next time you run the archive command, into a separate 'Undated (review)' section."
    });
    contentEl.createEl("p", {
      text: "Going forward, completing any card will automatically stamp today's date so this won't happen again."
    });
    const btnRow = contentEl.createDiv({ cls: "modal-button-container" });
    const stampBtn = btnRow.createEl("button", { text: "Stamp today's date on all undated cards" });
    stampBtn.style.marginRight = "10px";
    stampBtn.style.cursor = "pointer";
    stampBtn.addEventListener("click", () => {
      this.close();
      this.onStamp();
    });
    const skipBtn = btnRow.createEl("button", { text: "Skip for now" });
    skipBtn.style.cursor = "pointer";
    skipBtn.addEventListener("click", () => {
      this.close();
      this.onSkip();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var KanbanArchiverPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.fileCache = /* @__PURE__ */ new Map();
  }
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "archive-kanban-done-items",
      name: "Archive completed items older than threshold",
      callback: () => this.archiveCurrentFile()
    });
    this.addCommand({
      id: "archive-all-kanban-boards",
      name: "Archive completed items in all Kanban boards",
      callback: () => this.archiveAllBoards()
    });
    this.addSettingTab(new KanbanArchiverSettingTab(this.app, this));
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof import_obsidian.TFile && file.extension === "md") {
          this.handleFileModify(file);
        }
      })
    );
    this.app.workspace.onLayoutReady(async () => {
      await this.loadCache();
      if (!this.settings.migrationDone) {
        await this.runMigrationCheck();
      }
    });
  }
  async loadCache() {
    for (const file of this.app.vault.getMarkdownFiles()) {
      const content = await this.app.vault.read(file);
      if (this.isKanbanBoard(content)) {
        this.fileCache.set(file.path, content);
      }
    }
  }
  // First-run: count undated [x] items across all boards and prompt user
  async runMigrationCheck() {
    const files = this.app.vault.getMarkdownFiles();
    let undatedCount = 0;
    const undatedFiles = [];
    for (const file of files) {
      const content = await this.app.vault.read(file);
      if (!this.isKanbanBoard(content)) continue;
      const lines = content.split("\n");
      const fileUndated = lines.filter(
        (l) => l.trim().startsWith("- [x]") && !/\d{4}-\d{2}-\d{2}/.test(l)
      ).length;
      if (fileUndated > 0) {
        undatedCount += fileUndated;
        undatedFiles.push(file);
      }
    }
    if (undatedCount === 0) {
      this.settings.migrationDone = true;
      await this.saveSettings();
      return;
    }
    new MigrationModal(
      this.app,
      this,
      undatedCount,
      async () => {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        let stamped = 0;
        for (const file of undatedFiles) {
          const content = await this.app.vault.read(file);
          const newContent = content.split("\n").map((line) => {
            if (line.trim().startsWith("- [x]") && !/\d{4}-\d{2}-\d{2}/.test(line)) {
              stamped++;
              return line.trimEnd() + ` (@${today})`;
            }
            return line;
          }).join("\n");
          this.fileCache.set(file.path, newContent);
          await this.app.vault.modify(file, newContent);
        }
        this.settings.migrationDone = true;
        await this.saveSettings();
        new import_obsidian.Notice(`Stamped ${stamped} undated card(s) with today's date. They will archive in ${this.settings.daysThreshold} days.`, 0);
      },
      async () => {
        this.settings.migrationDone = true;
        await this.saveSettings();
        new import_obsidian.Notice("Skipped. Undated cards will appear in 'Undated (review)' when you next run the archive command.", 0);
      }
    ).open();
  }
  async handleFileModify(file) {
    if (!this.settings.autoStamp) return;
    const newContent = await this.app.vault.read(file);
    if (!this.isKanbanBoard(newContent)) return;
    const oldContent = this.fileCache.get(file.path);
    this.fileCache.set(file.path, newContent);
    if (!oldContent) return;
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");
    let stamped = false;
    const stampedLines = newLines.map((newLine, i) => {
      const oldLine = oldLines[i] || "";
      const wasUnchecked = oldLine.trim().startsWith("- [ ]");
      const isNowChecked = newLine.trim().startsWith("- [x]");
      if (wasUnchecked && isNowChecked) {
        const hasDate = /\d{4}-\d{2}-\d{2}/.test(newLine);
        if (!hasDate) {
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          stamped = true;
          return newLine.trimEnd() + ` (@${today})`;
        }
      }
      return newLine;
    });
    if (stamped) {
      const stampedContent = stampedLines.join("\n");
      this.fileCache.set(file.path, stampedContent);
      await this.app.vault.modify(file, stampedContent);
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  getArchivePath(file) {
    const archiveName = `${this.settings.archivePrefix}${file.basename}.md`;
    return file.parent ? `${file.parent.path}/${archiveName}` : archiveName;
  }
  async archiveCurrentFile() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian.Notice("No active file.", 0);
      return;
    }
    const count = await this.processFile(file);
    const archivePath = this.getArchivePath(file);
    if (count === 0) {
      new import_obsidian.Notice("No items to archive.", 0);
    } else {
      new import_obsidian.Notice(`Archived ${count} item(s) from ${file.basename}
\u2192 ${archivePath}`, 0);
    }
  }
  async archiveAllBoards() {
    const files = this.app.vault.getMarkdownFiles();
    let total = 0;
    const affected = [];
    for (const file of files) {
      const content = await this.app.vault.read(file);
      if (this.isKanbanBoard(content)) {
        const count = await this.processFile(file);
        if (count > 0) {
          total += count;
          affected.push(`${file.basename} (${count}) \u2192 ${this.getArchivePath(file)}`);
        }
      }
    }
    if (total === 0) {
      new import_obsidian.Notice("No items to archive across all boards.", 0);
    } else {
      new import_obsidian.Notice(`Archived ${total} item(s):
` + affected.join("\n"), 0);
    }
  }
  isKanbanBoard(content) {
    return content.includes("kanban-plugin: board");
  }
  extractEarliestDate(text) {
    const pattern = /(\d{4}-\d{2}-\d{2})/g;
    let match;
    let earliest = null;
    while ((match = pattern.exec(text)) !== null) {
      try {
        const d = new Date(match[1]);
        if (!isNaN(d.getTime())) {
          if (!earliest || d < earliest) earliest = d;
        }
      } catch (e) {
      }
    }
    return earliest;
  }
  isOlderThanThreshold(date) {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - this.settings.daysThreshold);
    return date < cutoff;
  }
  async processFile(file) {
    const content = await this.app.vault.read(file);
    if (!this.isKanbanBoard(content)) {
      new import_obsidian.Notice(`${file.basename} is not a Kanban board.`, 0);
      return 0;
    }
    const lines = content.split("\n");
    const keepLines = [];
    const datedArchiveLines = [];
    const undatedArchiveLines = [];
    const doneColumnHeaders = this.settings.doneColumns.map((c) => `## ${c}`);
    let inDoneColumn = false;
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const stripped = line.trim();
      if (stripped.startsWith("## ")) {
        inDoneColumn = doneColumnHeaders.includes(stripped);
      }
      const cardLines = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^\t/)) {
        cardLines.push(lines[j]);
        j++;
      }
      const fullCard = cardLines.join("\n");
      const isTicked = stripped.startsWith("- [x]");
      const isCard = stripped.startsWith("- [");
      const shouldConsider = isTicked || inDoneColumn && isCard;
      if (shouldConsider) {
        const date = this.extractEarliestDate(fullCard);
        if (!date) {
          undatedArchiveLines.push(...cardLines);
          i = j;
          continue;
        }
        if (this.isOlderThanThreshold(date)) {
          datedArchiveLines.push(...cardLines);
          i = j;
          continue;
        }
      }
      keepLines.push(...cardLines);
      i = j;
    }
    const totalArchived = datedArchiveLines.filter((l) => l.trim().startsWith("- [")).length + undatedArchiveLines.filter((l) => l.trim().startsWith("- [")).length;
    if (totalArchived === 0) return 0;
    await this.app.vault.modify(file, keepLines.join("\n"));
    const archiveName = `${this.settings.archivePrefix}${file.basename}.md`;
    const archivePath = file.parent ? `${file.parent.path}/${archiveName}` : archiveName;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let archiveEntry = `
## Archived ${timestamp}
`;
    if (datedArchiveLines.length > 0) {
      archiveEntry += datedArchiveLines.join("\n") + "\n";
    }
    if (undatedArchiveLines.length > 0) {
      archiveEntry += `
### Undated (review)
` + undatedArchiveLines.join("\n") + "\n";
    }
    const archiveFile = this.app.vault.getAbstractFileByPath(archivePath);
    if (archiveFile instanceof import_obsidian.TFile) {
      const existing = await this.app.vault.read(archiveFile);
      await this.app.vault.modify(archiveFile, existing + archiveEntry);
    } else {
      const header = `# Archive \u2014 ${file.basename}
# Items completed >${this.settings.daysThreshold} days ago
`;
      await this.app.vault.create(archivePath, header + archiveEntry);
    }
    return totalArchived;
  }
};
var KanbanArchiverSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Kanban Archiver Settings" });
    new import_obsidian.Setting(containerEl).setName("Days threshold").setDesc("Archive completed items older than this many days.").addText(
      (text) => text.setPlaceholder("30").setValue(String(this.plugin.settings.daysThreshold)).onChange(async (value) => {
        const num = parseInt(value);
        if (!isNaN(num) && num > 0) {
          this.plugin.settings.daysThreshold = num;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("Archive file prefix").setDesc('Prefix for archive files. Default: "Archive_"').addText(
      (text) => text.setPlaceholder("Archive_").setValue(this.plugin.settings.archivePrefix).onChange(async (value) => {
        this.plugin.settings.archivePrefix = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Auto-stamp on completion").setDesc("Automatically append today's date when a card is ticked [x] with no existing date.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoStamp).onChange(async (value) => {
        this.plugin.settings.autoStamp = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Archive locations" });
    const boards = this.plugin.app.vault.getMarkdownFiles().filter(async (f) => {
      const c = await this.plugin.app.vault.read(f);
      return c.includes("kanban-plugin: board");
    });
    this.plugin.app.vault.getMarkdownFiles().forEach(async (f) => {
      const c = await this.plugin.app.vault.read(f);
      if (!c.includes("kanban-plugin: board")) return;
      const archivePath = this.plugin.getArchivePath(f);
      new import_obsidian.Setting(containerEl).setName(f.basename).setDesc(`\u2192 ${archivePath}`).setDisabled(true);
    });
    new import_obsidian.Setting(containerEl).setName("Done column names").setDesc('Comma-separated list of column names treated as Done. Default: "Done"').addText(
      (text) => text.setPlaceholder("Done").setValue(this.plugin.settings.doneColumns.join(", ")).onChange(async (value) => {
        this.plugin.settings.doneColumns = value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Re-run first-time migration").setDesc("Show the undated card migration prompt again.").addButton(
      (btn) => btn.setButtonText("Re-run").onClick(async () => {
        this.plugin.settings.migrationDone = false;
        await this.plugin.saveSettings();
        await this.plugin.runMigrationCheck();
      })
    );
  }
};
