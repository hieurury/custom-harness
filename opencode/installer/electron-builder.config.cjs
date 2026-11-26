'use strict';

const { build } = require('./package.json');
const env = process.env;
const mode = env.WINDOWS_SIGNING_MODE || 'unsigned';

function required(name) {
  if (!env[name]) throw new Error(`Missing Windows signing setting: ${name}`);
  return env[name];
}

if (!['unsigned', 'azure', 'pfx'].includes(mode)) {
  throw new Error('WINDOWS_SIGNING_MODE must be unsigned, azure, or pfx.');
}

const config = {
  ...build,
  forceCodeSigning: mode !== 'unsigned',
  win: {
    ...build.win,
    signExecutable: mode !== 'unsigned',
  },
};

if (mode === 'azure') {
  required('AZURE_TENANT_ID');
  required('AZURE_CLIENT_ID');
  required('AZURE_CLIENT_SECRET');
  config.win.azureSignOptions = {
    publisherName: required('WINDOWS_PUBLISHER_NAME'),
    endpoint: required('AZURE_SIGNING_ENDPOINT'),
    codeSigningAccountName: required('AZURE_SIGNING_ACCOUNT'),
    certificateProfileName: required('AZURE_SIGNING_PROFILE'),
  };
}

if (mode === 'pfx') {
  if (!env.WIN_CSC_LINK && !env.CSC_LINK) throw new Error('Missing Windows signing setting: WIN_CSC_LINK');
  if (!env.WIN_CSC_KEY_PASSWORD && !env.CSC_KEY_PASSWORD) throw new Error('Missing Windows signing setting: WIN_CSC_KEY_PASSWORD');
  required('WINDOWS_PUBLISHER_NAME');
}

module.exports = config;
