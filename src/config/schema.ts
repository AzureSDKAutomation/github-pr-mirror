import convict, { Config } from 'convict';
import * as dotenv from 'dotenv';

dotenv.config();

export type PRMirrorConfig = {
  env: string;
  githubToken: string;
  sourceRepo: string;
  targetRepo: string;
  targetBase: string;
};

const emptyValidator = (value?: string): void => {
  if (value === undefined || value === '') {
    throw new Error('Value cannot be empty or undefined');
  }
};

export const configurationSchema: Config<PRMirrorConfig> = convict<PRMirrorConfig>({
  env: {
    default: '',
    env: 'ENV',
    format: String
  },
  githubToken: {
    default: '',
    doc: 'Generate from https://github.com/settings/tokens/new',
    env: 'GITHUB_TOKEN',
    arg: 'githubToken',
    format: emptyValidator
  },
  sourceRepo: {
    default: '',
    doc: 'Example: Azure/azure-rest-api-specs',
    env: 'SOURCE_REPO',
    arg: 'source',
    format: String
  },
  targetRepo: {
    default: '',
    doc: 'Example: test-repo-tih/azure-rest-api-specs',
    env: 'TARGET_REPO',
    arg: 'target',
    format: emptyValidator
  },
  targetBase: {
    default: 'master',
    env: 'TARGET_PR_BASE',
    arg: 'target-base',
    format: String
  }
});
