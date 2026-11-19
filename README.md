# Eliora Selwyn: Read the Bible (BSB reader)

Files for the "Read the Bible" page on https://www.elioraselwyn.com/p/read-the-bible.html.
The page loads these files from jsDelivr, pinned to this repository's `v1` tag:
`https://cdn.jsdelivr.net/gh/OWNER/REPO@v1/reader.js`

## Contents
- `reader.js`: the reader (no dependencies). It loads `reader.css` from the same folder.
- `reader.css`: reader styles, all scoped to `#bsb-reader`.
- `data/index.json`: the 66 books and their chapter counts.
- `data/<Book>/<chapter>.json`: 1,189 chapter files (OSIS book ids: Gen, Exod, … Ps, … Acts, … Rev).
- `tools/`: `convert.py` (official download → JSON), `validate.py` (checks every verse against the official text), `reader.src.js` and `build.py` (rebuild reader.js).

## Link format
`/p/read-the-bible.html#Ps.122.2` (verse), `#Ps.121.1-2` (range), `#Acts.12` (chapter).
Optional return page: `/p/read-the-bible.html?from=/2026/11/article.html#Ps.122.2`.

## Text
Berean Standard Bible (BSB), from the official downloads at https://berean.bible/downloads.htm:
- `bsb.txt` for verse wording
- `bsb_usfm.zip` for paragraphs, poetry, headings and footnotes

Every verse is checked against `bsb.txt` by `tools/validate.py`. The wording is unchanged.

## Updating
1. Re-download the official files into `src/`.
2. Run `tools/convert.py`, then `tools/validate.py`. It must report `"pass": true`.
3. Commit, tag a new version (`v2`) and update the tag in the Blogger page.
Never edit chapter files by hand.

Search and study tools are planned for a later phase.
