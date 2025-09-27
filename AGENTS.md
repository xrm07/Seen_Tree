# Repository Guidelines

## Project Structure & Module Organization
The working extension lives in `extension/`. Key modules: `manifest.json` defines MV3 permissions and entry points; `content.js` renders the in-page translate button and handles selection/DOM replacement; `sw.js` is the service worker that proxies translation requests to LM Studio; `popup.js` and `popup.html` trigger full-page translation; `options.js` and `options.html` persist API settings with `chrome.storage.sync`; shared defaults are in `constants.js`. Icons reside in `extension/icons/`.

## Build, Test, and Development Commands
This project is browser-run; no bundler is required. For local development, load the unpacked extension via Chrome → `chrome://extensions` → Enable Developer Mode → “Load unpacked” → select the `extension/` directory. When distributing a build, run `zip -r lmstudio-translator.zip extension` from the repository root and upload the archive.

## Coding Style & Naming Conventions
JavaScript files use ES modules with two-space indentation and single quotes only when interpolation is not needed. Prefer `const`/`let` over `var`, arrow functions for inline handlers, and descriptive camelCase identifiers (e.g., `translateWholePage`). Keep DOM IDs and classes kebab-cased, matching `content.js` conventions. Document complex logic with concise inline comments.

## Testing Guidelines
Automated tests are not yet defined; validate changes manually. Steps: (1) reload the extension in `chrome://extensions`; (2) on a test page, select text and confirm the floating “翻訳” button displays translated output; (3) verify the popup’s “全文翻訳” control replaces page text; (4) adjust options and ensure values persist after a browser restart. Note any regressions in the pull request.

## Commit & Pull Request Guidelines
Follow the existing history by starting commit subjects with a lowercase scope prefix when applicable (e.g., `docs:`, `fix:`) followed by a concise summary under 60 characters. Use the body to explain motivation and testing. Pull requests should include: purpose summary, before/after notes for UI-affecting changes, manual test evidence, and references to related issues.

## Security & Configuration Tips
Limit API hosts to `http://127.0.0.1` or `http://localhost` as declared in `manifest.json`, and ensure LM Studio runs with CORS enabled. Avoid storing secrets—`chrome.storage.sync` is for non-sensitive defaults only. Review additions for new network requests and update host permissions deliberately.
