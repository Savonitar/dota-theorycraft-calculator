const fs = require('node:fs');
const path = require('node:path');

const PROJECT_NAME = 'Dota Theorycraft Calculator';
const PACKAGE_NAME = 'dota-theorycraft-calculator';
const EXE_NAME = PACKAGE_NAME;
const rootDir = path.resolve(__dirname, '..');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const outputDir = path.join(rootDir, 'dist', `${PACKAGE_NAME}-win32-x64`);
const appOutputDir = path.join(outputDir, 'resources', 'app');

const appFiles = [
  'index.html',
  'main.js',
  'styles.css',
  'src',
  'package.json',
  'README.md',
  'LICENSE'
];

function assertWindowsElectron() {
  const electronExe = path.join(electronDistDir, 'electron.exe');

  if (!fs.existsSync(electronExe)) {
    throw new Error('Windows Electron runtime was not found. Run this command on Windows after `npm install`.');
  }
}

function copyPath(source, destination) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.cpSync(source, destination, { recursive: true });
    return;
  }

  fs.copyFileSync(source, destination);
}

function writeRuntimePackageJson() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  packageJson.name = PACKAGE_NAME;
  packageJson.productName = PROJECT_NAME;
  fs.writeFileSync(path.join(appOutputDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
}

function copyAppFiles() {
  fs.mkdirSync(appOutputDir, { recursive: true });

  appFiles.forEach((fileName) => {
    if (fileName === 'package.json') {
      writeRuntimePackageJson();
      return;
    }

    copyPath(path.join(rootDir, fileName), path.join(appOutputDir, fileName));
  });
}

function writeDistributionReadme() {
  const content = [
    PROJECT_NAME,
    '',
    `Run ${EXE_NAME}.exe to start the calculator.`,
    ''
  ].join('\n');

  fs.writeFileSync(path.join(outputDir, 'README.txt'), content);
}

assertWindowsElectron();
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(outputDir), { recursive: true });
fs.cpSync(electronDistDir, outputDir, { recursive: true });
fs.renameSync(path.join(outputDir, 'electron.exe'), path.join(outputDir, `${EXE_NAME}.exe`));
copyAppFiles();
writeDistributionReadme();

console.log(`Packaged ${PROJECT_NAME} for Windows at ${outputDir} (${EXE_NAME}.exe)`);
