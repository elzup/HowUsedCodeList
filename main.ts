import { Octokit } from '@octokit/rest'
import { writeFileSync } from 'fs'
const getMethods = (obj: object) => Object.getOwnPropertyNames(obj)
const makeKeywords = (obj: object, name: string) =>
  getMethods(obj).map((method) => ({ code: `${name}.${method}`, method }))
const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec))

type Row = { code: string; count: number; tag: string }

async function makeCountsData(
  api: Octokit,
  obj: object,
  objName: string,
  tagConverter: (method: string, count: number) => string
) {
  const keywords = makeKeywords(obj, objName)
  const rows: Row[] = []
  for (const { code, method } of keywords) {
    const res = await api.search.code({ q: code })
    console.log(
      `${code} ${res.data.total_count} [API remain ${res.headers['x-ratelimit-remaining']} / 1min]`
    )
    const count = res.data.total_count
    rows.push({
      code,
      count,
      tag: tagConverter(method, count),
    })
    // 10 requests per minute (GitHub code search API)
    await sleep(6.1 * 1000)
  }
  rows.sort((a, b) => b.count - a.count)
  console.log(rows.map((c) => `${c.code},${c.count}`).join('\n'))
  console.log(JSON.stringify(rows, null, 2))
  writeFileSync(`./dist/js-${objName}.json`, JSON.stringify(rows, null, 2))
  writeFileSync(`./dist/js-${objName}.md`, rowsToMarkdown(rows))
}
const runningAt = new Date().toLocaleString().split(' ')[0]

function rowsToMarkdown(rows: Row[]) {
  return [
    `dumped at ${runningAt}
| code     | count |
| -------- | ----- |
`,
    ...rows.map((row) => `| ${row.code} | ${row.count} |`),
  ].join('\n')
}

const isUpperCase = (str: string) => str === str.toUpperCase()
const toTag = (method: string, count: number) =>
  isUpperCase(method) ? 'constant' : 'function'

async function main() {
  const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN })
  // await makeCountsData(octokit, Math, 'Math', toTag)
  await makeCountsData(octokit, Object, 'Object', toTag)
}
main()
