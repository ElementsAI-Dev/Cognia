import fs from 'fs/promises';
import path from 'path';

interface PackageJson {
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

const SYNC_DEPENDENCIES = [
  '@types/jest',
  '@types/node',
  'jest',
  'ts-jest',
  'typescript',
  'eslint',
  '@typescript-eslint/parser',
  '@typescript-eslint/eslint-plugin',
  'prettier',
];

async function syncDependencies() {
  const rootPkg = JSON.parse(
    await fs.readFile('package.json', 'utf-8')
  ) as PackageJson;

  const sdkPkgPath = path.join('plugin-sdk', 'typescript', 'package.json');
  const sdkPkg = JSON.parse(
    await fs.readFile(sdkPkgPath, 'utf-8')
  ) as PackageJson;

  let hasChanges = false;

  for (const dep of SYNC_DEPENDENCIES) {
    const rootVersion = rootPkg.devDependencies?.[dep];
    const sdkVersion = sdkPkg.devDependencies?.[dep];

    if (rootVersion && rootVersion !== sdkVersion) {
      console.log(`Syncing ${dep}: ${sdkVersion} -> ${rootVersion}`);
      if (!sdkPkg.devDependencies) sdkPkg.devDependencies = {};
      sdkPkg.devDependencies[dep] = rootVersion;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await fs.writeFile(sdkPkgPath, JSON.stringify(sdkPkg, null, 2) + '\n');
    console.log('✅ Plugin SDK dependencies synced');
  } else {
    console.log('✅ Plugin SDK dependencies already in sync');
  }
}

syncDependencies().catch(console.error);
