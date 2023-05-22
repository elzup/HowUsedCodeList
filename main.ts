import { Octokit } from "@octokit/rest";
import { writeFileSync } from "fs";
const getMethods = (obj: object) => Object.getOwnPropertyNames(obj);
const makeKeywords = (obj: object, name: string) =>
  getMethods(obj).map((method) => `${name}.${method}`);
const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

type Row = { code: string; count: number; tag: string };

async function makeCountsData(
  api: Octokit,
  obj: object,
  objName: string,
  tagConverter: (field: string) => string
) {
  const keywords = makeKeywords(obj, objName);
  const rows: Row[] = [];
  for (const keyword of keywords) {
    const res = await api.search.code({ q: keyword });
    console.log(
      `${keyword} ${res.data.total_count} [API remain ${res.headers["x-ratelimit-remaining"]} / 1min]`
    );
    rows.push({
      code: keyword,
      count: res.data.total_count,
      tag: tagConverter(keyword),
    });
    // 10 requests per minute (GitHub code search API)
    await sleep(6.1 * 1000);
  }
  rows.sort((a, b) => b.count - a.count);
  console.log(rows.map((c) => `${c.code},${c.count}`).join("\n"));
  console.log(JSON.stringify(rows, null, 2));
  writeFileSync(`./dist/js-${objName}.json`, JSON.stringify(rows, null, 2)
}

async function main() {
  const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });
  await makeCountsData(octokit, Math, "Math", (field) => field);
}
main();
