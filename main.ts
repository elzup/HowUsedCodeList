import { Octokit } from "@octokit/rest";

const getMethods = (obj: object) => Object.getOwnPropertyNames(obj);
const makeKeywords = (obj: object, name: string) =>
  getMethods(obj).map((method) => `${name}.${method}`);

const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

async function main() {
  const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });
  const keywords = makeKeywords(Math, "Math");
  const counts: { code: number; count: number }[] = [];

  for (const keyword of keywords) {
    const res = await octokit.search.code({
      q: keyword,
    });
    console.log();
    console.log(
      `${keyword} ${res.data.total_count} [API remain ${res.headers["x-ratelimit-remaining"]} / 1min]`
    );
    counts.push({ code: res.status, count: res.data.total_count });

    // 10 requests per minute (GitHub code search API)

    await sleep(6.1 * 1000);
  }
  counts.sort((a, b) => b.count - a.count);
  console.log(counts.map((c) => `${c.code},${c.count}`).join("\n"));
}

main();
