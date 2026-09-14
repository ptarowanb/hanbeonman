// 실행: node scripts/generate-icons.mjs (pnpm install 후)
// 폰트에 의존하지 않는 icon.svg를 모든 크기의 원본으로 사용합니다.
import { readFile, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const nextPackage = await realpath(new URL("../apps/web/node_modules/next/package.json", import.meta.url));
const require = createRequire(nextPackage);
const sharp = require("sharp");
const appDirectory = new URL("../apps/web/app/", import.meta.url);
const source = await readFile(new URL("icon.svg", appDirectory));
const render = (size) => sharp(source, { density: 288 }).resize(size, size).png().toBuffer();

await writeFile(new URL("apple-icon.png", appDirectory), await render(180));

// ICO 디렉터리에 각 크기의 PNG를 넣어 일반·고밀도 브라우저 탭을 지원합니다.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(render));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
for (const [index, size] of sizes.entries()) {
  const entry = 6 + index * 16;
  directory[entry] = size;
  directory[entry + 1] = size;
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(images[index].length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
await writeFile(new URL("favicon.ico", appDirectory), Buffer.concat([directory, ...images]));
console.log("파비콘 16·32·48px와 Apple 홈 화면 아이콘 180px를 생성했습니다.");
