# Dota Theorycraft Calculator

Dota Theorycraft Calculator is a small desktop calculator for Dota 2 damage estimates. It focuses on fast spell and item damage checks with manual inputs for level, spell amplification, magic resistance, and incoming magic amplification.

## Features

- Lina, Zeus, and Storm Spirit damage calculators.
- Instant and full damage totals.
- Baseline total for 25% magic resistance.
- Lina Aghanim's Scepter / Flame Cloak projection.
- Lina Ethereal Blade option with estimated Ether Blast damage.
- Dagon level input from 0 to 5.
- Damage rune checkbox using a separate spell amplification bonus.
- Optional Zeus target HP input for Static Field estimates.
- Storm Spirit mana and travel distance inputs for Ball Lightning.

## Requirements

- Windows 10 or newer.
- Node.js 22.12.0 or newer.
- npm.

## Run On Windows

Install dependencies:

```powershell
npm install
```

Start the app:

```powershell
npm start
```

## Package A Windows Build

Double-click this file from the project root on Windows:

```text
build-windows.cmd
```

It installs dependencies, runs checks, and creates the Windows package. You can also run the package command manually:

```powershell
npm run package:win
```

The packaged app is written to:

```text
dist/dota-theorycraft-calculator-win32-x64/dota-theorycraft-calculator.exe
```

## Development

Run the test suite:

```powershell
npm test
```

Run syntax checks and tests:

```powershell
npm run check
```

Check dependency advisories:

```powershell
npm audit
```

## Data Notes

Damage values are estimates. Dota 2 patches can change hero, rune, and item numbers, so constants should be reviewed after gameplay updates.
