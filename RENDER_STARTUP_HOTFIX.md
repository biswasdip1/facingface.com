# Render Startup Hotfix

## Confirmed cause

The production build creates these files:

```text
dist/_core/index.js
dist/public/index.html
dist/runInactiveReminders.js
```

The previous start command attempted to load a different file:

```text
node dist/index.js
```

That file does not exist, which causes this Render error:

```text
Error: Cannot find module '/opt/render/project/src/dist/index.js'
```

## Correct setting in Render

Open **Render Dashboard → facingface-2 → Settings**. In **Start Command**, enter exactly:

```text
node dist/_core/index.js
```

Save the setting and use **Manual Deploy → Clear build cache & deploy** once.

The corrected project also updates `package.json`, so `pnpm run start` now runs the same valid command:

```text
NODE_ENV=production node dist/_core/index.js
```

## What this hotfix also corrects

The server entry is compiled into `dist/_core`. The Vite browser application is compiled into `dist/public`. This release updates the production static-file route to serve the browser application from `dist/public`.

## Validation performed

The project was rebuilt and launched with the exact generated production entry point. The server started successfully and returned a `200 text/html` response for the home page. No database, media disk, user, post, Page, Group, or email record is changed by this path correction.
