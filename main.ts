import { Octokit } from "@octokit/rest";
const octokit = new Octokit();

octokit.rest.repos
  .listForOrg({
    org: "octokit",
    type: "public",
  })
  .then(({ data }) => {
    // handle data
  });
