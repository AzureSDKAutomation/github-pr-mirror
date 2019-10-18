import Octokit from '@octokit/rest';

export const toDictionary = <T>(input: T[], fn: (elem: T) => string) => {
    const result: { [key: string]: T } = {};
    for (const elem of input) {
        result[fn(elem)] = elem;
    }

    return result;
};

type GithubPageniteReturn<TAPI> =
    TAPI extends (args: unknown) => Promise<Octokit.Response<infer TResponse>>
    ? TResponse : unknown;
type GithubPageniteParams<TAPI> =
    TAPI extends (args: infer TParams) => unknown
    ? TParams : unknown;

function githubPagenite<TAPI extends { endpoint: Octokit.Endpoint }>(
    github: Octokit,
    api: TAPI,
    params: GithubPageniteParams<TAPI>
): Promise<GithubPageniteReturn<TAPI>> {
    return github.paginate(
        api.endpoint.merge(params as Octokit.EndpointOptions)
    ) as Promise<GithubPageniteReturn<TAPI>>;
}

export const getPullRequests = async (github: Octokit, params: Octokit.PullsListParams) => {
    return githubPagenite(github, github.pulls.list, params);
};

export const createPullRequest = async (github: Octokit, params: Octokit.PullsCreateParams) => {
    const { data: createdPR } = await github.pulls.create(params);
    return createdPR;
};

export const closePullRequest = async (github: Octokit, params: Octokit.PullsUpdateParams) => {
    return github.pulls.update({
        ...params,
        state: 'closed'
    });
};

export interface IGithubContext {
  github: Octokit;
  sourcePRMap: { [key: string]: Octokit.PullsListResponseItem };
  targetPRMap: { [key: string]: Octokit.PullsListResponseItem };
  targetOwner: string;
  targetRepo: string;
  targetBase: string;
}