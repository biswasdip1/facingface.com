# Pages, Public Groups, and Sale & Buy Desktop Layout

## What changed

FacingFace now extends the wider LinkedIn-style desktop presentation from the Home Feed to **Pages**, **Public Groups**, and **Sale & Buy**.

| Area | Desktop improvement |
| --- | --- |
| Individual Page | Wider cover and header, larger Page identity text, a readable content column, and a stable information sidebar. |
| Page directory | Wider discovery shell, larger search and Page cards, and up to four cards per large desktop row. |
| Individual Public Group | Wider cover and Group header, a wider post column, a dedicated desktop sidebar, and larger membership and About text. |
| Group directory | Wider discovery shell, larger Group cards, and up to five cards on very wide screens. |
| Sale & Buy | Wider marketplace shell, larger shop heading and search field, clearer listing card text, and up to five listings on very wide screens. |

## Responsive behaviour

The larger desktop layout activates only at the existing large-screen breakpoints. Mobile and tablet layouts remain single-column or compact-grid views, so Page privacy, Group invitations, comments, reactions, follow requests, saved listings, filters, and listing actions continue to work unchanged.

## Verification

On a desktop screen, open a Page, a Public Group, and **Sale & Buy (Marketing)**. Confirm that content uses more of the available width, Page and Group posts remain easy to read, and the right-side information cards stay beside the main Feed. On a mobile screen, confirm that the layout remains compact.

## Deployment

Deploy through the usual GitHub-to-Render process. No Render environment variables, database changes, persistent disk settings, email settings, or Start Command changes are required.

## Validation

The production build passed. Focused Page privacy, Public Group stability, and Feed filtering checks passed: **19/19 tests**.
