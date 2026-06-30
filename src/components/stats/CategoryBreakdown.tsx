import type { MealKey } from "../../types";
import { formatCurrency } from "../../utils/format";
import type { MealBreakdownItem } from "../../utils/stats";
import { BarRankChart } from "./charts/BarRankChart";

type Dimension = "extra" | "meal";

type ExtraCategory = {
  category: string;
  amount: number;
  count: number;
  share: number;
};

type Props = {
  dimension: Dimension;
  highlightExtra: boolean;
  extraCategories: ExtraCategory[];
  meals: MealBreakdownItem[];
  onDimensionChange: (dimension: Dimension) => void;
  onSelectExtra: (category: string) => void;
  onSelectMeal: (meal: MealKey) => void;
};

export function CategoryBreakdown({
  dimension,
  highlightExtra,
  extraCategories,
  meals,
  onDimensionChange,
  onSelectExtra,
  onSelectMeal
}: Props) {
  return (
    <section className={`section-block category-breakdown ${highlightExtra ? "highlight" : ""}`}>
      <div className="section-title">
        <div>
          <p className="eyebrow">分类</p>
          <h2>{dimension === "extra" ? "额外花销分类" : "三餐分类"}</h2>
        </div>
        <div className="segmented-control" aria-label="分类维度">
          <button className={dimension === "extra" ? "active" : ""} type="button" onClick={() => onDimensionChange("extra")}>
            额外花销分类
          </button>
          <button className={dimension === "meal" ? "active" : ""} type="button" onClick={() => onDimensionChange("meal")}>
            三餐分类
          </button>
        </div>
      </div>

      {dimension === "extra" ? (
        <BarRankChart
          data={extraCategories.map((item) => ({
            id: item.category,
            name: item.category,
            amount: item.amount,
            count: item.count,
            share: item.share
          }))}
          onSelect={(item) => onSelectExtra(item.name)}
        />
      ) : (
        <div className="meal-rank-layout">
          <BarRankChart
            data={meals.map((item) => ({
              id: item.meal,
              name: item.label,
              amount: item.amount,
              count: undefined,
              share: item.share
            }))}
            onSelect={(item) => onSelectMeal(item.id as MealKey)}
            height={220}
          />
          <div className="meal-summary-list">
            {meals.map((item) => (
              <button key={item.meal} type="button" onClick={() => onSelectMeal(item.meal)}>
                <span>{item.label}</span>
                <strong>{formatCurrency(item.amount)}</strong>
                <em>均值 {formatCurrency(item.avg)} · {item.share}%</em>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export type { Dimension };
