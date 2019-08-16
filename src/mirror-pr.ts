import Octokit from '@octokit/rest';

const mirrorPRTitle = '[Mirror]';

const toDictionary = <T>(input: T[], fn: (elem: T) => string) => {
  const result: { [key: string]: T } = {};
  for (const elem of input) {
    result[fn(elem)] = elem;
  }

  return result;
};

const transformUrl = (url: string) => {
  // Place URL in pr but do not let github link the pr
  return `\`${url}\``;
};

type GithubPageniteReturn<TAPI> =
  TAPI extends (args: unknown) => Promise<Octokit.Response<infer TResponse>>
    ? TResponse : unknown;
type GithubPageniteParams<TAPI> =
  TAPI extends (args: infer TParams) => unknown
    ? TParams: unknown;

function githubPagenite<TAPI extends { endpoint: Octokit.Endpoint }>(
  github: Octokit,
  api: TAPI,
  params: GithubPageniteParams<TAPI>
): Promise<GithubPageniteReturn<TAPI>> {
  return github.paginate(
    api.endpoint.merge(params as Octokit.EndpointOptions)
  ) as Promise<GithubPageniteReturn<TAPI>>;
}

const getPullRequests = async (github: Octokit, params: Octokit.PullsListParams) => {
  return githubPagenite(github, github.pulls.list, params);
};

const createPullRequest = async (github: Octokit, params: Octokit.PullsCreateParams) => {
  const { data: createdPR } = await github.pulls.create(params);
  return createdPR;
};

const closePullRequest = async (github: Octokit, params: Octokit.PullsUpdateParams) => {
  return github.pulls.update({
    ...params,
    state: 'closed'
  });
};

const calcPRToModify = (sourcePRHeads: string[], targetPRHeads: string[]) => {
  const sourcePRNeedCreate: { [label: string]: boolean } = {};
  sourcePRHeads.forEach(sourcePRRef => {
    // Mark all the source PR as need-to-mirror
    sourcePRNeedCreate[sourcePRRef] = true;
  });

  const targetPRNeedClose: { [label: string]: boolean } = {};
  targetPRHeads.forEach(targetPRRef => {
    // Mark all the target PR as need-to-close
    targetPRNeedClose[targetPRRef] = true;
    // Mark PR exists in target as need-not-to-mirror
    sourcePRNeedCreate[targetPRRef] = false;
  });

  sourcePRHeads.forEach(sourcePRRef => {
    // Mark PR exists in source as need-not-to-close
    targetPRNeedClose[sourcePRRef] = false;
  });

  const toCreate = Object.keys(sourcePRNeedCreate).filter(label => sourcePRNeedCreate[label]);
  const toClose = Object.keys(targetPRNeedClose).filter(label => targetPRNeedClose[label]);

  return { toCreate, toClose };
};

interface IMirrorContext {
  github: Octokit;
  sourcePRMap: { [key: string]: Octokit.PullsListResponseItem };
  targetPRMap: { [key: string]: Octokit.PullsListResponseItem };
  targetOwner: string;
  targetRepo: string;
  targetBase: string;
}

const mirrorCreatePR = async (prRef: string, context: IMirrorContext) => {
  const sourcePR = context.sourcePRMap[prRef];
  const targetPR = context.targetPRMap[prRef];
  console.log(`#${sourcePR.id} ${prRef} ${sourcePR.title}:\n`);

  if (targetPR) {
    console.error(`\tPR from ${prRef} already exist: ${targetPR.html_url}`);
  }

  const createdPR = await createPullRequest(context.github, {
    owner: context.targetOwner, repo: context.targetRepo,
    base: context.targetBase, head: prRef,
    title: `${mirrorPRTitle} ${sourcePR.title}`,
    body: `Mirror from ${transformUrl(sourcePR.html_url)}`,
    maintainer_can_modify: false
  });
  console.log(`\tCreated: ${createdPR.html_url}`);
};

const mirrorClosePR = async (prRef: string, context: IMirrorContext) => {
  const targetPR = context.targetPRMap[prRef];
  console.log(`Closing #${targetPR.id} ${prRef} ${targetPR.title}:\n`);

}

export const mirrorPR = async (github: Octokit, sourceRepoRef: string, targetRepoRef: string, targetBase: string) => {
  const [ sourceOwner, sourceRepo ] = sourceRepoRef.split('/');
  const [ targetOwner, targetRepo ] = targetRepoRef.split('/');

  //  Get prs from both repository
  const sourcePRs = await getPullRequests(github, { owner: sourceOwner, repo: sourceRepo });
  const targetPRs = await getPullRequests(github, { owner: targetOwner, repo: targetRepo });

  // Calculate prs to create/close
  const sourcePRMap = toDictionary(sourcePRs, pr => pr.head.label);
  const targetPRMap = toDictionary(targetPRs, pr => pr.head.label);

  const sourcePRRefs = Object.keys(sourcePRMap);
  const targetPRRefs = Object.keys(targetPRMap)
    .filter(prRef => targetPRMap[prRef].title.startsWith(mirrorPRTitle));

  const context: IMirrorContext = {
    github, sourcePRMap, targetPRMap,
    targetOwner, targetRepo, targetBase
  };

  const { toCreate, toClose } = calcPRToModify(sourcePRRefs, targetPRRefs);

  console.log('To Create:', toCreate);
  console.log('To Close:', toClose);

  // Create/Close prs in target repo
  for (const prRef of toCreate) {
    await mirrorCreatePR(prRef, context);
  }

  for (const prRef of toClose) {
    await mirrorClosePR(prRef, context);

  }

};