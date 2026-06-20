# Build and run from an iPhone

The easiest mobile route is GitHub Codespaces. It gives the repository a real Linux computer in the browser, so no local installation is required on the phone.

## Open a Codespace

1. Open the repository.
2. Tap **Code**.
3. Open the **Codespaces** tab.
4. Select the branch you intend to work on and tap **Create codespace**.
5. Wait for the browser editor and terminal to load.

The repository includes `.devcontainer/devcontainer.json`, so Codespaces installs Node.js 22 and runs the tests automatically.

## Run the offline experiment

In the terminal:

```bash
npm run demo
```

Then inspect:

```text
.haunted-studio-demo/reports/trajectory-report.md
```

## Run one persistent cycle

```bash
npm run cycle
npm run status
npm run verify
```

## Use OpenAI models

An API key is billed separately from a ChatGPT subscription. Store the key as a Codespaces secret, never in a committed `.env` file.

In GitHub:

1. Open **Settings**.
2. Open **Codespaces**.
3. Open **Secrets**.
4. Create `OPENAI_API_KEY`.
5. Give the repository access to the secret.
6. Rebuild or reopen the Codespace.

Then run:

```bash
export HAUNTED_STUDIO_PROVIDER=openai
node src/cli.js run --image
```

## Preserve generated studio history safely

The `.haunted-studio/` and `experiments/` directories are ignored because they
may contain generated images, external observations, reviewer material, and
other runtime data. Do not commit those directories directly.

To retain a run, download an archive to controlled storage or copy it to an
approved research-data location. Before publishing any derived report, review
it for consent, rights, private observations, local paths, and accidental
credentials. Commit only an intentionally curated artifact under a separately
documented data policy.
