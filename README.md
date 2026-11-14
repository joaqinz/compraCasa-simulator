# CompraCasa Simulator

Interactive mortgage affordability simulator for Chile, built with React, TypeScript, and Vite.

This project is framed around a simple product question:

- one user starts from income and asks "What can I afford?"
- another starts from a target property and asks "What do I need to make this work?"

The simulator supports both mental models in a single interface and explains which constraint is actually binding: income, down payment, or bank policy.

The app helps a user estimate:

- how much property they can realistically afford
- whether a target property is feasible
- how dividend, income requirements, and financing change with rate, term, and down payment assumptions
- how different bank presets compare using CMF-based reference data

It is designed to be published as a public static webpage and works well as a personal portfolio project hosted from GitHub and deployed to Cloudflare Pages.

Live: https://compracasachile.pages.dev

## Features

- Chile-focused mortgage simulation using `UF` and `CLP`
- Two main modes:
  - affordability from income and savings
  - feasibility for a target property
- Live UF lookup with graceful fallbacks
- Bank preset selector backed by CMF simulator data
- Sensitivity analysis for:
  - property price
  - down payment
  - mortgage term
  - interest rate
- Bar comparisons and scenario tables for quick comparisons
- Optional 2% reserve for closing costs (gastos operacionales)
- Save up to 3 scenarios in the browser and compare them side by side
- Shareable scenarios through URL parameters
- Static frontend deployment with no required backend for v1

## Case Study Angle

This app is designed to be portfolio-friendly, not just calculator-correct.

- `Pedro` flow: "Sé cuánto gano"
  - Starts with net income and savings
  - Learns the maximum realistic property price
  - Sees whether income or down payment is the true bottleneck
- `José` flow: "Sé el precio que quiero"
  - Starts with a target property value
  - Sees required income, required down payment, and any current gaps
  - Explores whether better rate, more down payment, or longer term would close the gap

The main product insight is the binding-constraint message. Instead of only showing numbers, the simulator explains why the scenario tops out where it does.

## Tech Stack

- `React 19`
- `TypeScript`
- `Vite`
- `Tailwind CSS`

## Project Structure

```text
src/
  components/        UI components
  data/              default assumptions, glossary, bank presets
  lib/               mortgage math, UF service, formatting, URL state
  types/             shared TypeScript types
scripts/
  update-cmf-rates.mjs
public/
  _redirects         SPA routing
```

## How the App Works

The simulator combines:

- user inputs such as income, savings, price target, rate, term, and down payment
- mortgage calculation utilities in `src/lib/`
- a UF value fetched at runtime
- bank preset data stored in `src/data/bankPresets.json`

The frontend is fully static. At runtime, it fetches UF data in the browser and computes all results client-side.

## Calculation Logic

Three checks drive most of the experience:

1. Dividend formula:
   - `D = P · [r(1+r)^n] / [(1+r)^n − 1]`
2. Debt burden rule:
   - `dividendo + seguro ≤ ingreso · carga financiera máxima`
3. Financing rule:
   - `crédito ≤ propiedad · financiamiento máximo` (the minimum down payment is `100% − financiamiento`)
4. Closing-cost reserve (optional, on by default):
   - `ahorros ≥ pie + 2% · propiedad`

Those checks are what allow the UI to explain whether the active constraint is income, down payment, or the selected bank policy.

## Data Sources

### UF value

The app tries these sources in order:

1. `mindicador.cl`
2. `SII` via a CORS proxy fallback
3. a fallback UF value stored in `src/data/defaultAssumptions.json`

This makes the app easy to deploy, but it also means runtime UF reliability depends partly on third-party services. For a more production-grade version, move UF fetching into a small serverless function.

### Bank presets

Bank presets are stored locally in `src/data/bankPresets.json` and are intended to be refreshed from the CMF mortgage simulator with:

```bash
npm run update:cmf-rates
```

That script updates the preset dataset used by the app using a CMF reference scenario based on a `4,000 UF` property, `80%` financing, and a fixed-rate loan. It refreshes term-specific bank presets for `20`, `25`, and `30` years so the app can react to the selected financing term. Keeping the presets local avoids CORS and scraping problems in the public browser session.

## Local Development

### Requirements

- `Node.js` 20+ recommended
- `npm`

### Install

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

The production-ready static site is generated in `dist/`.

### Preview the production build

```bash
npm run preview
```

## Deployment

The site is hosted on Cloudflare Pages (project `compracasachile`). `public/_redirects` handles SPA routing.

On Windows, `deploy.ps1` commits, pushes, builds and uploads in one step:

```powershell
.\deploy.ps1 -Message "Describe the change"
```

Or deploy manually:

```bash
npm run build
npx wrangler pages deploy dist --project-name compracasachile --branch main
```

## Production Notes

This app is already deployable as a static site, but there are two important caveats:

1. UF fetching currently happens in the browser, so it depends on external public services.
2. Bank presets are only as current as the latest `update:cmf-rates` run.

For a stronger production version, consider:

- a serverless endpoint for UF data
- a scheduled job to refresh CMF-based bank presets
- analytics and error tracking such as Google Analytics or Sentry

## Available Scripts

- `npm run dev`: start local Vite development server
- `npm run build`: type-check and create a production build
- `npm run preview`: preview the production build locally
- `npm run lint`: run ESLint
- `npm run update:cmf-rates`: refresh bank preset data from the CMF simulator flow

## Future Improvements

- add automated tests for core mortgage calculations
- add CI checks for linting and builds
- move UF lookup to a serverless backend
- automate bank preset refreshes on a schedule
- improve README with screenshots once the public deployment is live

## License

No license has been added yet. If you want this to be clearly open-source, add a license file such as `MIT`.
