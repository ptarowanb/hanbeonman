"use client";

import { calculateDiscount, compareUnitPrices, scaleRecipe } from "./calculatorActions";
import styles from "./CalculatorRunner.module.css";

type CalculatorRunnerProps = {
  actionKind: "discount" | "unit_price" | "recipe_scale";
  fixedInputs: Record<string, string | number | boolean>;
};

const number = (value: number) => new Intl.NumberFormat("ko-KR", { maximumSignificantDigits: 8 }).format(value);
const won = (value: number) => `${number(value)}원`;

function numericInput(inputs: CalculatorRunnerProps["fixedInputs"], key: string) {
  const value = inputs[key];
  if (typeof value === "boolean" || value === undefined || (typeof value === "string" && !value.trim())) {
    throw new Error("계산에 필요한 값을 모두 입력해주세요.");
  }
  return Number(value);
}

export default function CalculatorRunner({ actionKind, fixedInputs }: CalculatorRunnerProps) {
  try {
    if (actionKind === "discount") {
      const price = numericInput(fixedInputs, "price");
      const rate = numericInput(fixedInputs, "rate");
      const { finalPrice, savings } = calculateDiscount(price, rate);
      return <section className={styles.card} aria-label="할인 계산 결과">
        <p className={styles.eyebrow}>할인 후 결제 금액</p>
        <output className={styles.hero} aria-label="할인 후 가격">{finalPrice.toLocaleString("ko-KR")}원</output>
        <p className={styles.highlight}>{savings.toLocaleString("ko-KR")}원을 아낄 수 있어요.</p>
        <dl className={styles.details}>
          <div><dt>원래 가격</dt><dd>{price.toLocaleString("ko-KR")}원</dd></div>
          <div><dt>할인율</dt><dd>{number(rate)}%</dd></div>
          <div><dt>할인 금액</dt><dd>{savings.toLocaleString("ko-KR")}원</dd></div>
        </dl>
        <p className={styles.hint}>최종 금액은 원 단위로 반올림했어요. 할인 금액은 원래 가격에서 최종 금액을 뺀 값이에요.</p>
      </section>;
    }

    if (actionKind === "unit_price") {
      const priceA = numericInput(fixedInputs, "priceA");
      const priceB = numericInput(fixedInputs, "priceB");
      const quantityA = numericInput(fixedInputs, "quantityA");
      const quantityB = numericInput(fixedInputs, "quantityB");
      const comparison = compareUnitPrices(priceA, quantityA, priceB, quantityB, String(fixedInputs.unit ?? "g"));
      const { basis, unit, winner, savingsPercent } = comparison;
      const savingDescription = savingsPercent < 0.01 ? "단가 차이는 0.01% 미만이에요." : `같은 용량에서 약 ${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(savingsPercent)}% 저렴해요.`;
      return <section className={styles.card} aria-label="상품 단가 비교 결과">
        <p className={styles.eyebrow}>{basis}{unit}당 가격 비교</p>
        <h3 className={styles.heading}>{winner === "tie" ? "두 상품의 단가가 같아요." : `상품 ${winner}의 단가가 더 저렴해요.`}</h3>
        <div className={styles.comparison}>
          {[
            { name: "A", price: priceA, quantity: quantityA, unitPrice: comparison.pricePerUnitA },
            { name: "B", price: priceB, quantity: quantityB, unitPrice: comparison.pricePerUnitB },
          ].map(product => <div key={product.name} className={`${styles.product} ${winner === product.name ? styles.recommended : ""}`} aria-label={`상품 ${product.name} 단가`}>
            <h4>상품 {product.name}{winner === product.name && <span className={styles.badge}>저렴해요</span>}</h4>
            <p className={styles.unitPrice}>{won(product.unitPrice)}</p>
            <p className={styles.basis}>{basis}{unit} 기준</p>
            <p className={styles.original}>{product.price.toLocaleString("ko-KR")}원 / {number(product.quantity)}{unit}</p>
          </div>)}
        </div>
        <p className={styles.highlight}>{winner === "tie" ? "같은 용량이나 개수로 환산했을 때 가격이 같아요." : savingDescription}</p>
        <p className={styles.hint}>입력한 가격과 용량을 기준으로 비교해요. 표시 단가는 유효숫자 최대 8자리로 반올림하며, 비교에는 반올림 전 값을 사용해요.</p>
      </section>;
    }

    const baseServings = numericInput(fixedInputs, "baseServings");
    const targetServings = numericInput(fixedInputs, "targetServings");
    const { ratio, ingredients } = scaleRecipe(baseServings, targetServings, String(fixedInputs.ingredients ?? ""));
    return <section className={styles.card} aria-label="레시피 분량 결과">
      <p className={styles.eyebrow}>만들 양에 맞춘 재료</p>
      <h3 className={styles.heading}>{number(baseServings)}인분 → {number(targetServings)}인분</h3>
      <p className={styles.highlight}>재료를 각각 {number(ratio)}배로 준비하면 돼요.</p>
      <table className={styles.recipeTable}>
        <caption>인분 변경에 따른 재료 분량</caption>
        <thead><tr><th scope="col">재료</th><th scope="col">원래 양</th><th scope="col">준비할 양</th></tr></thead>
        <tbody>{ingredients.map((ingredient, index) => <tr key={index}>
          <th scope="row">{ingredient.name}</th>
          <td>{number(ingredient.originalAmount)} {ingredient.unit}</td>
          <td><strong>{number(ingredient.scaledAmount)} {ingredient.unit}</strong></td>
        </tr>)}</tbody>
      </table>
      <p className={styles.hint}>재료의 양을 인분 비율로 환산했어요. 소수는 유효숫자 최대 8자리로 표시해요. 조리 시간과 온도는 원래 레시피를 참고해주세요.</p>
    </section>;
  } catch (error) {
    return <p className={styles.error} role="alert">{error instanceof Error ? error.message : "입력값을 확인해주세요."}</p>;
  }
}
