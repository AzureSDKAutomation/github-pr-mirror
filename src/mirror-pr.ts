import Octokit from '@octokit/rest';
import { toDictionary, createPullRequest, closePullRequest, getPullRequests, IGithubContext } from './common';

const mirrorPRTitle = '[Mirror]';

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
    title: `${mirrorPRTitle} ${sourcePR.title}`,
    body: `Mirror from ${transformUrl(sourcePR.html_url)}`,
    maintainer_can_modify: false
  });
  console.log(`\tCreated: ${createdPR.html_url}`);

  return createdPR;
};

export const mirrorPR = async (github: Octokit, sourceRepoRef: string, targetRepoRef: string, targetBase: string) => {
  const [sourceOwner, sourceRepo] = sourceRepoRef.split('/');
  const [targetOwner, targetRepo] = targetRepoRef.split('/');

  //  Get prs from both repository
  console.log(`Fetching PR from ${sourceRepoRef}`);
  const sourcePRs = await getPullRequests(github, { owner: sourceOwner, repo: sourceRepo });
  console.log(`Fetching PR from ${targetRepoRef}`);
  const targetPRs = await getPullRequests(github, { owner: targetOwner, repo: targetRepo });

  // Calculate prs to create/close
  const sourcePRMap = toDictionary(sourcePRs, pr => pr.head.label);
  const targetPRMap = toDictionary(targetPRs, pr => pr.head.label);

  const sourcePRRefs = Object.keys(sourcePRMap);
  const targetPRRefs = Object.keys(targetPRMap)
    .filter(prRef => targetPRMap[prRef].title.startsWith(mirrorPRTitle));

  const context: IGithubContext = {
    github, sourcePRMap, targetPRMap,
    targetOwner, targetRepo, targetBase
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