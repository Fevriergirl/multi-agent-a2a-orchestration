# Build and run from an iPhone

The easiest mobile route is GitHub Codespaces. It gives the repository a real Linux computer in the browser, so no local installation is required on the phone.

## Put the files in the repository

1. Download the project ZIP from the ChatGPT conversation.
2. In the GitHub repository, open **Add file** and choose **Upload files**.
3. GitHub's mobile upload interface may not unpack a ZIP. When that happens, use Codespaces and upload the ZIP into the file explorer, then run `unzip` in the terminal.
4. Commit the files to a new branch named `haunted-studio-v0` rather than overwriting `main` immediately.

## Open a Codespace

1. Open the repository.
2. Tap **Code**.
3. Open the **Codespaces** tab.
4. Tap **Create codespace on haunted-studio-v0**.
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

## Save the generated studio history

The `.haunted-studio/` folder is ignored by Git because it may contain generated images and private observations. To preserve an experimental run, copy the report into a tracked results directory:

```bash
mkdir -p results/run-001
cp .haunted-studio/reports/* results/run-001/
git add results/run-001
git commit -m "Add run 001 trajectory report"
git push
```

Do not commit API keys, private journal material, or images you do not have the right to use.
