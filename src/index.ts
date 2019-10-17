import { prMirrorConfig } from './config';
import Octokit from '@octokit/rest';
import { mirrorPR } from './mirror-pr';
import { eraseAllPR } from './erase-pr';

const main = async () => {
  const github = new Octokit({
    auth: prMirrorConfig.githubToken
  });
  const { sourceRepo, targetRepo, targetBase } = prMirrorConfig;

  try {
    if (sourceRepo.length !== 0) {
      await mirrorPR(github, sourceRepo, targetRepo, targetBase);
    } else {
      await eraseAllPR(github, targetRepo, targetBase);
    }
  } catch (e) {
    console.error(e);
  }
};

// tslint:disable-next-line: no-floating-promises
main();
