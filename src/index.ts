import { prMirrorConfig } from './config';
import Octokit from '@octokit/rest';
import { mirrorPR } from './mirror-pr';

const main = async () => {
  const github = new Octokit({
    auth: prMirrorConfig.githubToken
  });
  const { sourceRepo, targetRepo, targetBase, prPrefix } = prMirrorConfig;

  try {
    await mirrorPR(github, sourceRepo, targetRepo, targetBase, prPrefix);
  } catch (e) {
    console.error(e);
  }
};

// tslint:disable-next-line: no-floating-promises
main();
