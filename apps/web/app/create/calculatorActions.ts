type Fraction = { numerator: bigint; denominator: bigint };

function requireRange(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}은 ${min.toLocaleString("ko-KR")} 이상 ${max.toLocaleString("ko-KR")} 이하로 입력해주세요.`);
  }
}

function requirePrice(price: number) {
  requireRange(price, 0, 1e12, "가격");
  if (!Number.isInteger(price)) throw new Error("가격은 원 단위 정수로 입력해주세요.");
}

// The entered decimal is exact here, so a half won or equal price ratio does
// not change sides because of binary floating point rounding.
function decimalFraction(value: number): Fraction {
  const [decimal, exponentText] = value.toString().toLowerCase().split("e");
  const [whole, fraction = ""] = decimal!.split(".");
  const exponent = Number(exponentText ?? 0) - fraction.length;
  const digits = BigInt(`${whole}${fraction}`);
  return exponent >= 0
    ? { numerator: digits * BigInt(10) ** BigInt(exponent), denominator: BigInt(1) }
    : { numerator: digits, denominator: BigInt(10) ** BigInt(-exponent) };
}

export function calculateDiscount(price: number, rate: number) {
  requirePrice(price);
  requireRange(rate, 0, 100, "할인율");
  const rateFraction = decimalFraction(rate);
  const denominator = BigInt(100) * rateFraction.denominator;
  const numerator = BigInt(price) * (denominator - rateFraction.numerator);
  const finalPrice = Number((numerator * BigInt(2) + denominator) / (denominator * BigInt(2)));
  return { finalPrice, savings: price - finalPrice };
}

export function compareUnitPrices(priceA: number, quantityA: number, priceB: number, quantityB: number, unit = "g") {
  requirePrice(priceA);
  requirePrice(priceB);
  requireRange(quantityA, 0.001, 1e9, "상품 A 용량");
  requireRange(quantityB, 0.001, 1e9, "상품 B 용량");
  if (!["g", "ml", "개"].includes(unit)) throw new Error("비교 단위는 g, ml, 개 중에서 선택해주세요.");

  const a = decimalFraction(quantityA);
  const b = decimalFraction(quantityB);
  const crossA = BigInt(priceA) * a.denominator * b.numerator;
  const crossB = BigInt(priceB) * b.denominator * a.numerator;
  const winner = crossA === crossB ? "tie" : crossA < crossB ? "A" : "B";
  const basis = unit === "개" ? 1 : 100;
  const pricePerUnitA = priceA / quantityA * basis;
  const pricePerUnitB = priceB / quantityB * basis;
  const bigger = crossA > crossB ? crossA : crossB;
  const difference = crossA > crossB ? crossA - crossB : crossB - crossA;
  const savingsPercent = bigger === BigInt(0) ? 0 : Number(difference) / Number(bigger) * 100;
  return { basis, unit, pricePerUnitA, pricePerUnitB, winner, savingsPercent };
}

export type RecipeIngredient = { name: string; unit: string; originalAmount: number; scaledAmount: number };

export function scaleRecipe(baseServings: number, targetServings: number, source: string) {
  requireRange(baseServings, 0.1, 1000, "원래 인분");
  requireRange(targetServings, 0.1, 1000, "만들 인분");
  if (typeof source !== "string" || !source.trim() || source.length > 200) {
    throw new Error("재료는 200자 안에서 한 줄에 하나씩 입력해주세요. 예: 쌀 200 g");
  }
  const lines = source.trim().split(/\r?\n/);
  if (lines.length > 20) throw new Error("재료는 20줄까지 입력할 수 있어요.");
  const ratio = targetServings / baseServings;
  const ingredients: RecipeIngredient[] = lines.map((line, index) => {
    const invalid = () => new Error(`${index + 1}번째 재료를 확인해주세요. 이름, 양, 단위를 적어주세요. 예: 쌀 200 g 또는 설탕 1/2 큰술`);
    const match = line.trim().match(/^(.+?)\s+(\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*([^\d\s][^\r\n]*)$/);
    if (!match) throw invalid();
    const name = match[1]!.trim();
    const amountText = match[2]!;
    const unit = match[3]!.trim();
    if (!name || /\s\d+(?:\.\d+)?$/.test(name) || !unit || unit.length > 20 || /[\d/]/.test(unit)) throw invalid();
    const [numerator, denominator] = amountText.split("/").map(Number);
    const originalAmount = denominator === undefined ? numerator! : numerator! / denominator;
    if (!Number.isFinite(originalAmount) || originalAmount <= 0 || originalAmount > 1e9) throw invalid();
    const scaledAmount = originalAmount * ratio;
    if (!Number.isFinite(scaledAmount) || scaledAmount <= 0 || scaledAmount > 1e13) throw invalid();
    return { name, unit, originalAmount, scaledAmount };
  });
  return { ratio, ingredients };
}
