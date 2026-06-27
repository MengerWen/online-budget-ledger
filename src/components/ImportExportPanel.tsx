import { Download, FileText, Upload } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import type { AppData } from "../types";
import { exportData, parseImportData } from "../services/importExportService";
import { createDayMarkdownExport, createFullMarkdownExport, createMonthMarkdownExport } from "../services/markdownExportService";

type Props = {
  data: AppData;
  selectedDateKey: string;
  displayedMonth: Date;
  onImport: (payload: Pick<AppData, "budgets" | "dayRecords" | "extraExpenses">) => Promise<void>;
};

export function ImportExportPanel({ data, selectedDateKey, displayedMonth, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function downloadText(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportJson() {
    downloadText(`budget-ledger-${new Date().toISOString().slice(0, 10)}.json`, exportData(data), "application/json;charset=utf-8");
  }

  function handleExportMarkdown(kind: "day" | "month" | "full") {
    const markdown =
      kind === "day"
        ? createDayMarkdownExport(data, selectedDateKey)
        : kind === "month"
          ? createMonthMarkdownExport(data, displayedMonth)
          : createFullMarkdownExport(data);
    downloadText(markdown.filename, markdown.content, "text/markdown;charset=utf-8");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseImportData(text);
    if (parsed.error || !parsed.data) {
      setMessage(parsed.error);
      return;
    }
    if (!window.confirm("确认合并导入这份 JSON？导入数据会归属当前登录用户。")) return;
    await onImport(parsed.data);
    setMessage("导入完成。");
    event.target.value = "";
  }

  return (
    <section className="section-block">
      <div className="section-title">
        <h2>备份与导出</h2>
        <span>JSON / Markdown</span>
      </div>
      <div className="backup-actions">
        <button className="primary-button" type="button" onClick={handleExportJson}>
          <Download size={17} />
          导出 JSON
        </button>
        <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>
          <Upload size={17} />
          导入 JSON
        </button>
        <input ref={inputRef} type="file" accept="application/json" hidden onChange={handleImport} />
      </div>
      <div className="backup-actions markdown-actions">
        <button className="secondary-button" type="button" onClick={() => handleExportMarkdown("day")}>
          <FileText size={17} />
          导出当前日 Markdown
        </button>
        <button className="secondary-button" type="button" onClick={() => handleExportMarkdown("month")}>
          <FileText size={17} />
          导出当前月 Markdown
        </button>
        <button className="secondary-button" type="button" onClick={() => handleExportMarkdown("full")}>
          <FileText size={17} />
          导出全部 Markdown
        </button>
      </div>
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
