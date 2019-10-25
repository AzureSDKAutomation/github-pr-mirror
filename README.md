# Github-PR-Mirror

Mirror open pr to another repo. Close all pr if source repo is absent.

## Usage

To use this tool, you need to specify the following environment variables:

* `GITHUB_TOKEN`: The github access token.
* `SOURCE_REPO`: The source repo, formatted as `user/repo_name`. Will close all prs in target repo if this value is absent.
* `TARGET_REPO`: The target repo, formatted as `user/repo_name`.
* `TARGET_PR_BASE`: The base branch that prs are filtered by.
* `PR_PREFIX`: The prefix of branch name that prs are filtered by.
