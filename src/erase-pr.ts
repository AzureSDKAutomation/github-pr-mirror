import Octokit from '@octokit/rest';
import { toDictionary, closePullRequest, getPullRequests, IGithubContext } from './common';

const calcPRToErase = (prHeads: string[]) => {
    const targetPRNeedClose: { [label: string]: boolean } = {};
    prHeads.forEach(prRef => {
        targetPRNeedClose[prRef] = true;
    });

    const toClose = Object.keys(targetPRNeedClose).filter(label => targetPRNeedClose[label]);
    return toClose;
};

const erasePR = async (prRef: string, context: IGithubContext) => {
    const pr = context.targetPRMap[prRef];
    console.log(`Closing #${pr.number} ${prRef} ${pr.title}`);

    const { data: result } = await closePullRequest(context.github, {
        owner: context.targetOwner, repo: context.targetRepo, pull_number: pr.number
    });
    console.log(`\tClosed: ${result.html_url}`);
    return result;
};

export const eraseAllPR = async (github: Octokit, targetRepoRef: string, targetBase: string) => {
    const [targetOwner, targetRepo] = targetRepoRef.split('/');

    // Get prs from target repository
    console.log(`Fetching PR from ${targetRepoRef}`);
    const targetPRs = await getPullRequests(github, { owner: targetOwner, repo: targetRepo });

    // Calculate prs to close
    const targetPRMap = toDictionary(targetPRs, pr => pr.head.label);
    const targetPRRefs = Object.keys(targetPRMap);

    const context: IGithubContext = {
        github: github,
        sourcePRMap: {},
        targetPRMap: targetPRMap,
        targetOwner: targetOwner,
        targetRepo: targetRepo,
        targetBase: targetBase
    };

    const toErase = calcPRToErase(targetPRRefs);

    for (const prRef of toErase) {
        try {
            await erasePR(prRef, context);
        } catch (e) {
            console.log(e);
        }
    }
};