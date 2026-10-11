# リズム / Rizumu

A minimal HTML, CSS, and JavaScript page. Three extruded Japanese characters spin around an elliptical orbit. No dependencies, installation, or external assets.

Open `index.html` directly, or preview with `python3 -m http.server 8000` and visit http://localhost:8000. The page respects reduced-motion preferences.

## Build

Run `python3 scripts/build.py`. The result is `dist/rizumu.zip`, containing `index.html`, `style.css`, and `script.js` at its root. Extract it and open `index.html`, or upload the extracted files to any static web host.

## GitHub automatic builds

The workflow in `.github/workflows/build.yml` builds on every push and pull request, and can also be started manually. Download `rizumu.zip` from the workflow run's artifacts.

This project has its own local Git repository. To enable the workflow, create an empty GitHub repository, add its URL as `origin`, and push:

```sh
git remote add origin https://github.com/YOUR-ACCOUNT/rizumu.git
git push -u origin main
```
