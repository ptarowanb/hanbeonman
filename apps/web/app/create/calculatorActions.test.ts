import { describe, expect, it } from "vitest";
import { calculateDiscount, compareUnitPrices, scaleRecipe } from "./calculatorActions";

describe("할인가 계산", () => {
  it("최종 금액을 원 단위로 반올림하고 할인액을 정확히 맞춘다", () => {
    expect(calculateDiscount(39900, 15)).toEqual({ finalPrice: 33915, savings: 5985 });
    expect(calculateDiscount(101, 50)).toEqual({ finalPrice: 51, savings: 50 });
    expect(calculateDiscount(10000, 99.995)).toEqual({ finalPrice: 1, savings: 9999 });
    expect(calculateDiscount(1_000_000_000_000, 100)).toEqual({ finalPrice: 0, savings: 1_000_000_000_000 });
    expect(calculateDiscount(0, 0)).toEqual({ finalPrice: 0, savings: 0 });
  });
  it.each([[-1, 10], [0.1, 10], [1e12 + 1, 10], [1000, -1], [1000, 101], [NaN, 10], [1000, Infinity]])("잘못된 가격이나 할인율을 거부한다 (%s, %s)", (price, rate) => {
    expect(() => calculateDiscount(price, rate)).toThrow();
  });
});

describe("용량당 가격 비교", () => {
  it("같은 100g 기준으로 비교하고 저렴한 선택과 차이를 알려준다", () => {
    expect(compareUnitPrices(5000, 500, 9000, 1000, "g")).toEqual({ basis: 100, unit: "g", pricePerUnitA: 1000, pricePerUnitB: 900, winner: "B", savingsPercent: 10 });
  });
  it("개당 가격을 계산하고 소수 용량의 동률을 정확히 처리한다", () => {
    expect(compareUnitPrices(30, 0.3, 10, 0.1, "개")).toEqual({ basis: 1, unit: "개", pricePerUnitA: 100, pricePerUnitB: 100, winner: "tie", savingsPercent: 0 });
    expect(compareUnitPrices(0, 100, 0, 200, "ml").winner).toBe("tie");
    expect(compareUnitPrices(0, 100, 1000, 200, "ml").savingsPercent).toBe(100);
    expect(compareUnitPrices(1, 1e9, 2, 1e9, "g").winner).toBe("A");
  });
  it.each([0, -1, Infinity, NaN, 0.0001, 1e9 + 1])("잘못된 용량을 거부한다 (%s)", quantity => {
    expect(() => compareUnitPrices(1000, quantity, 500, 100, "g")).toThrow();
    expect(() => compareUnitPrices(1000, 100, 500, quantity, "g")).toThrow();
  });
  it("비교 단위와 두 상품의 가격을 모두 검증한다", () => {
    expect(() => compareUnitPrices(1.5, 100, 100, 100, "g")).toThrow();
    expect(() => compareUnitPrices(100, 100, -1, 100, "g")).toThrow();
    expect(() => compareUnitPrices(100, 100, 100, 100, "kg")).toThrow();
  });
});

describe("레시피 분량 조절", () => {
  it("재료의 이름과 단위를 유지하며 소수와 분수의 양을 늘린다", () => {
    expect(scaleRecipe(2, 3, "쌀 200 g\n잘게 썬 양파 0.5 개\n설탕 1/2 큰술")).toEqual({
      ratio: 1.5,
      ingredients: [
        { name: "쌀", unit: "g", originalAmount: 200, scaledAmount: 300 },
        { name: "잘게 썬 양파", unit: "개", originalAmount: 0.5, scaledAmount: 0.75 },
        { name: "설탕", unit: "큰술", originalAmount: 0.5, scaledAmount: 0.75 },
      ],
    });
    expect(scaleRecipe(4, 1, "물 300ml").ingredients[0]!.scaledAmount).toBe(75);
  });
  it("재료 한 줄이 잘못되어도 버리지 않고 해당 줄을 알려준다", () => {
    expect(() => scaleRecipe(2, 3, "쌀 200 g\n설탕 적당히\n물 300 ml")).toThrow(/2번째/);
    expect(() => scaleRecipe(2, 3, "쌀 200 g\n\n물 300 ml")).toThrow(/2번째/);
    expect(() => scaleRecipe(2, 3, "쌀 200 g\n설탕 1/0 큰술")).toThrow(/2번째/);
    expect(() => scaleRecipe(2, 3, "쌀 200 g\n소금 -1 g")).toThrow(/2번째/);
  });
  it.each([0, -1, NaN, Infinity, 0.01, 1001])("잘못된 인분을 거부한다 (%s)", servings => {
    expect(() => scaleRecipe(servings, 2, "쌀 100 g")).toThrow();
    expect(() => scaleRecipe(2, servings, "쌀 100 g")).toThrow();
  });
  it("빈 목록과 과도한 양이나 줄 수를 거부한다", () => {
    expect(() => scaleRecipe(2, 3, "")).toThrow();
    expect(() => scaleRecipe(2, 3, "소금 0 g")).toThrow();
    expect(() => scaleRecipe(2, 3, "물 1000000001 ml")).toThrow();
    expect(() => scaleRecipe(2, 3, Array(21).fill("쌀 1 g").join("\n"))).toThrow();
    expect(() => scaleRecipe(2, 3, "a".repeat(200) + " 1 g")).toThrow();
  });
});
