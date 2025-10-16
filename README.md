# 🏢 Q-Payroll - Professional Payroll Management System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-org/q-payroll) [![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![Supabase](https://img.shields.io/badge/Supabase-Powered-green)](https://supabase.com)

**Q-Payroll** is a comprehensive, enterprise-grade payroll management system built with React, TypeScript, and Supabase. It provides advanced features for managing employees, pay groups, payroll processing, and comprehensive reporting.

## ✨ Features

- 🎯 **Multi-PayGroup Assignment System** - Assign employees to multiple pay groups
- 📄 **Custom Payslip Templates** - Professional, customizable payslip designs
- 🌍 **Expatriate Payroll Support** - International employee payroll management
- 🆔 **Enhanced Employee Tracking** - Multiple identification types (National ID, TIN, SSN, Passport)
- 📊 **Advanced Reporting** - Comprehensive payroll and financial reports
- 🔒 **Enterprise Security** - Row-level security and audit trails
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## 🌍 Environment Commands

### Development & Deployment

- **Run staging locally:**
  ```bash
  npm run dev -- --env=staging
  ```

- **Push schema to staging Supabase:**
  ```bash
  npm run db:staging
  ```

- **Push schema to production Supabase:**
  ```bash
  npm run db:prod
  ```

- **Deploy to Lovable staging:**
  ```bash
  npm run deploy:staging
  ```

- **Deploy to production:**
  ```bash
  npm run deploy:prod
  ```

### Environment Configuration

The application automatically detects the environment based on `NODE_ENV`:
- **Staging**: `NODE_ENV=staging` → Uses staging Supabase instance
- **Production**: `NODE_ENV=production` → Uses production Supabase instance

### Supabase CLI Commands

- **Link to staging**: `npm run link:staging`
- **Link to production**: `npm run link:prod`
- **Push migrations to staging**: `npm run push:staging`
- **Push migrations to production**: `npm run push:prod`
- **Diff staging schema**: `npm run diff:staging`
- **Diff production schema**: `npm run diff:prod`

## Getting started

### Prerequisites

Available via [NPM](https://www.npmjs.com) as dev dependency. To install:

```bash
npm i supabase --save-dev
```

To install the beta release channel:

```bash
npm i supabase@beta --save-dev
```

When installing with yarn 4, you need to disable experimental fetch with the following nodejs config.

```
NODE_OPTIONS=--no-experimental-fetch yarn add supabase
```

> **Note**
For Bun versions below v1.0.17, you must add `supabase` as a [trusted dependency](https://bun.sh/guides/install/trusted) before running `bun add -D supabase`.

<details>
  <summary><b>macOS</b></summary>

  Available via [Homebrew](https://brew.sh). To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To install the beta release channel:
  
  ```sh
  brew install supabase/tap/supabase-beta
  brew link --overwrite supabase-beta
  ```
  
  To upgrade:

  ```sh
  brew upgrade supabase
  ```
</details>

<details>
  <summary><b>Windows</b></summary>

  Available via [Scoop](https://scoop.sh). To install:

  ```powershell
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

  To upgrade:

  ```powershell
  scoop update supabase
  ```
</details>

<details>
  <summary><b>Linux</b></summary>

  Available via [Homebrew](https://brew.sh) and Linux packages.

  #### via Homebrew

  To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To upgrade:

  ```sh
  brew upgrade supabase
  ```

  #### via Linux packages

  Linux packages are provided in [Releases](https://github.com/supabase/cli/releases). To install, download the `.apk`/`.deb`/`.rpm`/`.pkg.tar.zst` file depending on your package manager and run the respective commands.

  ```sh
  sudo apk add --allow-untrusted <...>.apk
  ```

  ```sh
  sudo dpkg -i <...>.deb
  ```

  ```sh
  sudo rpm -i <...>.rpm
  ```

  ```sh
  sudo pacman -U <...>.pkg.tar.zst
  ```
</details>

<details>
  <summary><b>Other Platforms</b></summary>

  You can also install the CLI via [go modules](https://go.dev/ref/mod#go-install) without the help of package managers.

  ```sh
  go install github.com/supabase/cli@latest
  ```

  Add a symlink to the binary in `$PATH` for easier access:

  ```sh
  ln -s "$(go env GOPATH)/bin/cli" /usr/bin/supabase
  ```

  This works on other non-standard Linux distros.
</details>

<details>
  <summary><b>Community Maintained Packages</b></summary>

  Available via [pkgx](https://pkgx.sh/). Package script [here](https://github.com/pkgxdev/pantry/blob/main/projects/supabase.com/cli/package.yml).
  To install in your working directory:

  ```bash
  pkgx install supabase
  ```

  Available via [Nixpkgs](https://nixos.org/). Package script [here](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/supabase-cli/default.nix).
</details>

### Run the CLI

```bash
supabase bootstrap
```

Or using npx:

```bash
npx supabase bootstrap
```

The bootstrap command will guide you through the process of setting up a Supabase project using one of the [starter](https://github.com/supabase-community/supabase-samples/blob/main/samples.json) templates.

## Docs

Command & config reference can be found [here](https://supabase.com/docs/reference/cli/about).

## Breaking changes

We follow semantic versioning for changes that directly impact CLI commands, flags, and configurations.

However, due to dependencies on other service images, we cannot guarantee that schema migrations, seed.sql, and generated types will always work for the same CLI major version. If you need such guarantees, we encourage you to pin a specific version of CLI in package.json.

## Developing

To run from source:

```sh
# Go >= 1.22
go run . help
```
