import { Download, Upload } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import type { AppData } from "../types";
import { exportData, parseImportData } from "../services/importExportService";

type Props = {
  data: AppData;
  onImport: (payload: Pick<AppData, "budgets" | "dayRecords" | "extraExpenses">) => Promise<void>;
};

export function ImportExportPanel({ data, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleExport() {
    const blob = new Blob([exportData(data)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `budget-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
        <h2>备份</h2>
        <span>JSON</span>
      </div>
      <div className="backup-actions">
        <button className="primary-button" type="button" onClick={handleExport}>
          <Download size={17} />
          导出 JSON
        </button>
        <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>
          <Upload size={17} />
          导入 JSON
        </button>
        <input ref={inputRef} type="file" accept="application/json" hidden onChange={handleImport} />
      </div>
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
