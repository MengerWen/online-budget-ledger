import { useMemo, useRef, useState } from "react";
import type { AppData, MealKey } from "../../types";
import { getDefaultBudget } from "../../utils/budgetCalculations";
import { getTodayInLocalTimezone } from "../../utils/dateUtils";
import {
  dailySeries,
  extraByCategory,
  mealBreakdown,
  presetRange,
  summarizeRange,
  type DateRange,
  type PresetRangeKind
} from "../../utils/stats";
import { CategoryBreakdown, type Dimension } from "./CategoryBreakdown";
import { CategoryDetail, type Drill } from "./CategoryDetail";
import { OverviewSection } from "./OverviewSection";
import { RangeControls } from "./RangeControls";

type Props = {
  data: AppData;
};

export function StatsPage({ data }: Props) {
  const [range, setRange] = useState<DateRange>(() => presetRange("thisMonth", getTodayInLocalTimezone()));
  const [activePreset, setActivePreset] = useState<PresetRangeKind | "custom">("thisMonth");
  const [dimension, setDimension] = useState<Dimension>("extra");
  const [drill, setDrill] = useState<Drill>(null);
  const [highlightExtra, setHighlightExtra] = useState(false);
  const categoryRef = useRef<HTMLElement>(null);

  const validRange = range.start <= range.end;
  const summary = useMemo(() => (validRange ? summarizeRange(range, data.dayRecords, data.extraExpenses) : emptySummary()), [data, range, validRange]);
  const series = useMemo(() => (validRange ? dailySeries(range, data.dayRecords, data.extraExpenses) : []), [data, range, validRange]);
  const extraCategories = useMemo(() => (validRange ? extraByCategory(range, data.extraExpenses) : []), [data.extraExpenses, range, validRange]);
  const meals = useMemo(() => (validRange ? mealBreakdown(range, data.dayRecords) : []), [data.dayRecords, range, validRange]);
  const defaultBudget = getDefaultBudget(data.budgets, data.settings?.defaultBudgetId);

  function handlePreset(kind: PresetRangeKind) {
    setRange(presetRange(kind, getTodayInLocalTimezone()));
    setActivePreset(kind);
    setDrill(null);
  }

  function handleCustom(nextRange: DateRange) {
    setRange(nextRange);
    setActivePreset("custom");
    setDrill(null);
  }

  function focusExtraCategories() {
    setDimension("extra");
    setHighlightExtra(true);
    window.setTimeout(() => {
      categoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => setHighlightExtra(false), 1200);
    }, 0);
  }

  function selectExtra(category: string) {
    setDrill({ type: "extraCategory", category });
    setHighlightExtra(false);
  }

  function selectMeal(meal: MealKey) {
    setDrill({ type: "meal", meal });
    setHighlightExtra(false);
  }

  return (
    <div className="stats-page">
      <RangeControls range={range} activePreset={activePreset} onPreset={handlePreset} onCustom={handleCustom} />
      {!validRange ? (
        <section className="section-block">
          <p className="field-error">请先选择有效的起止日期。</p>
        </section>
      ) : drill ? (
        <CategoryDetail
          drill={drill}
          range={range}
          dayRecords={data.dayRecords}
          extras={data.extraExpenses}
          defaultBudget={defaultBudget}
          onBack={() => setDrill(null)}
        />
      ) : (
        <>
          <OverviewSection summary={summary} series={series} meals={meals} onFocusExtra={focusExtraCategories} onSelectMeal={selectMeal} />
          <section ref={categoryRef}>
            <CategoryBreakdown
              dimension={dimension}
              highlightExtra={highlightExtra}
              extraCategories={extraCategories}
              meals={meals}
              onDimensionChange={setDimension}
              onSelectExtra={selectExtra}
              onSelectMeal={selectMeal}
            />
          </section>
        </>
      )}
    </div>
  );
}

function emptySummary() {
  return {
    total: 0,
    foodTotal: 0,
    extraTotal: 0,
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    dailyAverage: 0,
    mealAverage: 0,
    entryCount: 0,
    recordedDays: 0
  };
}
