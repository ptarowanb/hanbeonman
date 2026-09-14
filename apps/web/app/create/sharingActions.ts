type ActionInputs = Record<string, string | number | boolean>;
const TRAVEL_MODES = new Set(["transit", "driving", "walking", "bicycling"]);

export function validateSharingText(text: string): string {
  if (typeof text !== "string" || !text.trim() || text.length > 200) {
    throw new Error("내용을 1~200자로 입력해주세요.");
  }
  return text;
}

function place(value: string | number | boolean | undefined, required: boolean): string {
  if (value === undefined || value === "") {
    if (required) throw new Error("목적지를 입력해주세요.");
    return "";
  }
  if (typeof value !== "string" || value.length > 100 || (required && !value.trim())) {
    throw new Error("장소를 1~100자로 입력해주세요.");
  }
  return value.trim();
}

export function buildDirectionsUrl(inputs: ActionInputs): string {
  const destination = place(inputs.destination, true);
  const origin = place(inputs.origin, false);
  const mode = inputs.mode ?? "transit";
  if (typeof mode !== "string" || !TRAVEL_MODES.has(mode)) {
    throw new Error("지원하는 이동 방법을 선택해주세요.");
  }
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destination);
  if (origin) url.searchParams.set("origin", origin);
  url.searchParams.set("travelmode", mode);
  if (url.href.length > 2048) throw new Error("주소가 너무 깁니다. 장소 이름이나 주소를 줄여주세요.");
  return url.href;
}

export async function generateQrDataUrl(text: string): Promise<string> {
  const content = validateSharingText(text);
  const { default: QRCode } = await import("qrcode");
  return QRCode.toDataURL(content, {
    type: "image/png",
    width: 320,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#202724ff", light: "#ffffffff" },
  });
}
