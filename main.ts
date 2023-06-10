import { Octokit } from '@octokit/rest'
import { writeFileSync } from 'fs'

const getMethods = (obj: object) => Object.getOwnPropertyNames(obj)
const makeKeywords = (obj: object, name: string) =>
  getMethods(obj).map((method) => `${name}.${method}`)
const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec))

type Row = { code: string; count: number }
type Task = { codes: string[]; languages: string[] }
type TargetCode = {
  code: string
  method: string
}

async function getTotalCount(api: Octokit, q: string) {
  const res = await api.search.code({ q, per_page: 1 })
  console.log(
    `${q} ${res.data.total_count} [API remain ${res.headers['x-ratelimit-remaining']} / 1min]`
  )
  const count = res.data.total_count
  return count
}

async function searchCodeCounts(api: Octokit, task: Task) {
  const rows: Row[] = []
  for (const code of task.codes) {
    const countJs = await getTotalCount(api, `${code} language:JavaScript`)
    await sleep(7 * 1000) // 10 requests per minute (GitHub code search API)
    const countTs = await getTotalCount(api, `${code} language:TypeScript`)
    await sleep(7 * 1000)
    const count = countJs + countTs

    rows.push({ code, count })
  }
  rows.sort((a, b) => b.count - a.count)
  return rows
}

async function makeCountsData(
  api: Octokit,
  obj: object,
  objName: string,
  tagConverter: (q: string) => string
) {
  const codes = makeKeywords(obj, objName)
  const rows: Row[] = await searchCodeCounts(api, {
    codes,
    languages: ['JavaScript', 'TypeScript'],
  })

  console.log(rows.map((c) => `${c.code},${c.count}`).join('\n'))

  console.log(JSON.stringify(rows, null, 2))
  writeFileSync(
    `./dist/js-${objName}.json`,
    JSON.stringify(
      rows.map((v) => ({ ...v, tag: tagConverter(v.code) })),
      null,
      2
    )
  )
  writeFileSync(`./dist/js-${objName}.md`, rowsToMarkdown(rows))
}
const runningAt = new Date().toLocaleString().split(' ')[0]

function rowsToMarkdown(rows: Row[]) {
  return [
    `dumped at ${runningAt}

| code     | count |
| -------- | ----- |
`.trim(),
    ...rows.map((row) => `| ${row.code} | ${row.count} |`),
  ].join('\n')
}

const isUpperCase = (str: string) => str === str.toUpperCase()
const toTag = (q: string) =>
  isUpperCase(q.split('.').pop() || '') ? 'constant' : 'function'

async function main() {
  const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN })
  await makeCountsData(octokit, Math, 'Math', toTag)
  await makeCountsData(octokit, Object, 'Object', toTag)
  await makeCountsData(octokit, Number, 'Number', toTag)
  await makeCountsData(octokit, String, 'String', toTag)
}
main()
