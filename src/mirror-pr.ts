import Octokit from '@octokit/rest';
import { toDictionary, createPullRequest, closePullRequest, getPullRequests, IGithubContext } from './common';

const transformUrl = (url: string) => {
  // Place URL in pr but do not let github link the pr
  return `\`${url}\``;
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

const mirrorClosePR = async (prRef: string, context: IGithubContext) => {
  const targetPR = context.targetPRMap[prRef];
  console.log(`Closing #${targetPR.number} ${prRef} ${targetPR.title}:`);

  const { data: result } = await closePullRequest(context.github, {
    owner: context.targetOwner, repo: context.targetRepo,
    pull_number: targetPR.number
  });
  console.log(`\tClosed: ${result.html_url}`);

  return result;
};

const mirrorCreatePR = async (prRef: string, context: IGithubContext) => {
  const sourcePR = context.sourcePRMap[prRef];
  const targetPR = context.targetPRMap[prRef];
  console.log(`#${sourcePR.number} ${prRef} ${sourcePR.title}:`);

  if (targetPR) {
    console.error(`\tPR from ${prRef} already exist: ${targetPR.html_url}`);
    await mirrorClosePR(prRef, context);
  }

  const createdPR = await createPullRequest(context.github, {
    owner: context.targetOwner, repo: context.targetRepo,
    base: context.targetBase, head: prRef,
    title: `${context.prPrefix} ${sourcePR.title}`,
    body: `Mirror from ${transformUrl(sourcePR.html_url)}`,
    maintainer_can_modify: false
  });
  console.log(`\tCreated: ${createdPR.html_url}`);

  return createdPR;
};

const getPRFromRef = async (github: Octokit, repoRef: string):
  Promise<[Octokit.PullsListResponseItem[], string, string]> => {
  if (repoRef === '') {
    return [[], '', ''];
  }
  const [owner, repo] = repoRef.split('/');
  console.log(`Fetching PR from ${repoRef}`);
  const prs = await getPullRequests(github, { owner, repo });

  return [prs, owner, repo];
};

export const mirrorPR = async (github: Octokit, sourceRepoRef: string, targetRepoRef: string, targetBase: string,
  prPrefix: string) => {
  //  Get prs from both repository
  const [sourcePRs] = await getPRFromRef(github, sourceRepoRef);
  const [targetPRs, targetOwner, targetRepo] = await getPRFromRef(github, targetRepoRef);

  // Calculate prs to create/close
  const sourcePRMap = toDictionary(sourcePRs, pr => pr.head.label);
  const targetPRMap = toDictionary(targetPRs, pr => pr.head.label);

  const sourcePRRefs = Object.keys(sourcePRMap);
  const targetPRRefs = Object.keys(targetPRMap)
    .filter(prRef => targetPRMap[prRef].title.startsWith(prPrefix));

  const context: IGithubContext = {
    github: github,
    sourcePRMap: sourcePRMap,
    targetPRMap: targetPRMap,
    targetOwner: targetOwner,
    targetRepo: targetRepo,
    targetBase: targetBase,
    prPrefix: prPrefix
  };

  const { toCreate, toClose } = calcPRToModify(sourcePRRefs, targetPRRefs);

  console.log('To Create:', toCreate);
  console.log('To Close:', toClose);

  // Create/Close prs in target repo
  for (const prRef of toCreate) {
    try {
      await mirrorCreatePR(prRef, context);
    } catch (e) {
      console.log(e);
    }
  }

  for (const prRef of toClose) {
    try {
      await mirrorClosePR(prRef, context);
    } catch (e) {
      console.log(e);
    }
  }
};