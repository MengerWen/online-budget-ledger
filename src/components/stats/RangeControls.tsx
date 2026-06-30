import type { DateRange, PresetRangeKind } from "../../utils/stats";
import { dayCount, presetRange } from "../../utils/stats";

type Props = {
  range: DateRange;
  activePreset: PresetRangeKind | "custom";
  onPreset: (kind: PresetRangeKind) => void;
  onCustom: (range: DateRange) => void;
};

const presets: Array<{ kind: PresetRangeKind; label: string }> = [
  { kind: "today", label: "今天" },
  { kind: "yesterday", label: "昨天" },
  { kind: "dayBefore", label: "前天" },
  { kind: "thisWeek", label: "本周" },
  { kind: "thisMonth", label: "本月" },
  { kind: "lastMonth", label: "上月" },
  { kind: "last30", label: "近30天" },
  { kind: "thisYear", label: "今年" }
];

export function RangeControls({ range, activePreset, onPreset, onCustom }: Props) {
  const invalid = range.start > range.end;

  return (
    <section className="section-block stats-controls">
      <div className="section-title">
        <div>
          <p className="eyebrow">统计区间</p>
          <h2>选择时间范围</h2>
        </div>
        <span className="range-summary">{range.start} → {range.end} · 共 {invalid ? 0 : dayCount(range)} 天</span>
      </div>
      <div className="range-chip-row">
        {presets.map((preset) => (
          <button
            key={preset.kind}
            className={`range-chip ${activePreset === preset.kind ? "active" : ""}`}
            type="button"
            onClick={() => onPreset(preset.kind)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="range-custom-row">
        <label>
          起始日期
          <input type="date" value={range.start} onChange={(event) => onCustom({ start: event.target.value, end: range.end })} />
        </label>
        <label>
          结束日期
          <input type="date" value={range.end} onChange={(event) => onCustom({ start: range.start, end: event.target.value })} />
        </label>
      </div>
      {invalid && <p className="field-error">起始日期不能晚于结束日期。</p>}
      {activePreset === "custom" && !invalid && <p className="muted">当前使用自定义区间；点击上方快捷项可快速切换。</p>}
    </section>
  );
}

export { presetRange };
