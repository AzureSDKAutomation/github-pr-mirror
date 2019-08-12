import convict, { Config } from 'convict';

export type PRMirrorConfig = {
  githubToken: string;
  sourceRepo: string;
  targetRepo: string;
};

const emptyValidator = (value?: string): void => {
  if (value === undefined || value === '') {
    throw new Error('Value cannot be empty or undefined');
  }
};

export const configurationSchema: Config<PRMirrorConfig> = convict<PRMirrorConfig>({
  githubToken: {
    default: '',
    doc: 'Generate from https://github.com/settings/tokens/new',
    env: 'GITHUB_TOKEN',
    format: emptyValidator
  },
  sourceRepo: {
    default: '',
    doc: 'Example: Azure/azure-rest-api-specs',
    env: 'SOURCE_REPO',
    format: emptyValidator
  },
  targetRepo: {
    default: '',
    doc: 'Example: test-repo-tih/azure-rest-api-specs',
    env: 'TARGET_REPO',
    format: emptyValidator
  }
});
