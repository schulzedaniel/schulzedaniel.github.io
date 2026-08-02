#!/usr/bin/env python3
"""Regenerate index.html from main-site.dc.html.

    python3 build.py            rebuild index.html
    python3 build.py --diff     show what would change, write nothing
    python3 build.py --check    exit 1 if index.html is stale (for CI/pre-push)

WHY THIS EXISTS
    main-site.dc.html is the file you edit. index.html is what GitHub Pages
    serves: the same document, but self-contained -- the runtime, the fonts and
    the typeface are packed into it as data, so the page needs no other files.
    Editing the source therefore does *nothing* to the live page until you run
    this. Run it before every commit.

WHAT IT DOES
    index.html stores the whole source document as a JSON string in its
    <script type="__bundler/template"> block, with local files swapped for the
    uuids of the copies packed into the manifest. This rewrites that one block
    and reproduces the bundler's own normalisations (camelCase event attributes
    become sc-camel-*, void elements lose their trailing slash, and so on).

    The packed assets are reused as-is, which is what you want -- they only
    change when you add a new local file or change the Google Fonts request,
    and the script stops with an explanation if either happens.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'main-site.dc.html')
IDX = os.path.join(HERE, 'index.html')

# Local files the bundler packed into index.html, keyed by the path the source
# refers to them by. Adding a new local asset means re-bundling properly.
ASSETS = {
    './support.js': '59384c29-773a-48f2-b506-70e59c936c39',
    'fonts/NeueHaasDisplayMedium.ttf': '742fe4cf-bdd9-4199-b2bb-12811c2596ed',
}
# The Google Fonts request whose CSS is already inlined in index.html. If the
# source asks for different fonts, the inlined copy no longer matches it.
FONTS_HREF = ('https://fonts.googleapis.com/css2?family=Fragment+Mono:ital@0;1'
              '&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;'
              '0,6..72,500;1,6..72,300&family=Space+Grotesk:wght@400;500;700&display=swap')
# Marks where the inlined @font-face block ends and the page's own styles begin.
STYLE_MARK = '<style>\n  /* Only theme variables'
# Event attributes the serializer rewrites; any camelCase attribute is handled.
CAMEL_RE = re.compile(r' (on[A-Z][A-Za-z]*)="')
TPL_RE = re.compile(r'(<script type="__bundler/template">\n)(.*?)(\n  </script>)', re.S)


def die(msg):
    sys.exit('build.py: ' + msg)


def check_logic_syntax(src):
    """Parse the page's script half before bundling it.

    Everything editable -- the PANELS lists especially -- lives in that script,
    so one stray comma takes the whole page down with a blank screen and a
    console error. Catching it here means a broken edit can never reach
    index.html. Skipped silently if node isn't installed.
    """
    import shutil
    import subprocess
    import tempfile
    node = shutil.which('node')
    if not node:
        return
    m = re.search(r'<script type="text/x-dc"[^>]*>\n(.*?)\n</script>', src, re.S)
    if not m:
        die('main-site.dc.html has no <script type="text/x-dc"> block.')
    offset = src[:m.start(1)].count('\n') + 1
    with tempfile.NamedTemporaryFile('w', suffix='.js', encoding='utf-8', delete=False) as fh:
        fh.write(m.group(1))
        path = fh.name
    try:
        proc = subprocess.run([node, '--check', path], capture_output=True, text=True)
    finally:
        os.unlink(path)
    if proc.returncode == 0:
        return
    # Rewrite the temp file's line numbers back to main-site.dc.html's. Match on
    # the basename: macOS reports /private/var/... where tempfile said /var/...
    name = re.escape(os.path.basename(path))
    detail = []
    for line in proc.stderr.splitlines():
        if line.startswith('    at ') or line.startswith('Node.js v'):
            continue
        hit = re.search(name + r':(\d+)', line)
        if hit:
            detail.append('main-site.dc.html, line %d:' % (int(hit.group(1)) + offset - 1))
        elif line.strip():
            detail.append(line)
    die('the script half of main-site.dc.html does not parse:\n\n  '
        + '\n  '.join(detail[:8]) + '\n\n  index.html was NOT changed.')


def read_template(raw):
    m = TPL_RE.search(raw)
    if not m:
        die('index.html has no __bundler/template block -- is it the bundled file?')
    return json.loads(m.group(2))


def encode(tpl):
    """JSON, then keep the payload from closing its own <script> tag."""
    return json.dumps(tpl, ensure_ascii=False).replace('</', '<\\u002F')


def build(src, packed):
    if FONTS_HREF not in src:
        die('the Google Fonts <link> in main-site.dc.html no longer matches the\n'
            '  copy inlined in index.html. Re-bundle the page, then update\n'
            '  FONTS_HREF in this script.')

    # 1. swap the fonts <link> for the @font-face block already inlined in index.html
    fonts = packed[packed.index('<helmet>\n') + len('<helmet>\n'):packed.index(STYLE_MARK)]
    head = src.index('<helmet>\n') + len('<helmet>\n')
    out = src[:head] + fonts + src[src.index(STYLE_MARK):]

    # 2. local files -> the uuids of the copies packed into index.html
    for path, uuid in ASSETS.items():
        before = out
        out = out.replace('"%s"' % path, '"%s"' % uuid).replace("'%s'" % path, '"%s"' % uuid)
        if out == before:
            die('asset %r is packed into index.html but nothing in the source\n'
                '  refers to it any more -- drop it from ASSETS.' % path)

    # 3. the serializer's own normalisations
    out = out.replace('<!DOCTYPE html>\n<html>\n<head>\n', '<!DOCTYPE html>\n<html><head>\n', 1)
    out = re.sub(r'^<template id="__bundler_thumbnail">.*</template>$', '', out, flags=re.M)
    out = out.replace('data-dc-script ', 'data-dc-script="" ')
    out = CAMEL_RE.sub(lambda m: ' sc-camel-%s="' % re.sub(r'(?<!^)(?=[A-Z])', '-', m.group(1)).lower(), out)
    out = out.replace(' />', '>')
    if not out.endswith('</script>\n</body>\n</html>\n'):
        die('main-site.dc.html does not end with the expected </script></body></html>.')
    return out[:-len('</body>\n</html>\n')] + '\n\n</body></html>'


def main():
    for path in (SRC, IDX):
        if not os.path.exists(path):
            die('missing %s' % os.path.basename(path))
    src = open(SRC, encoding='utf-8').read()
    check_logic_syntax(src)
    raw = open(IDX, encoding='utf-8').read()
    packed = read_template(raw)
    fresh = build(src, packed)

    if '--diff' in sys.argv or '--check' in sys.argv:
        if packed == fresh:
            print('index.html is up to date.')
            return
        if '--check' in sys.argv:
            die('index.html is stale -- run: python3 build.py')
        import difflib
        sys.stdout.writelines(difflib.unified_diff(
            packed.splitlines(keepends=True), fresh.splitlines(keepends=True),
            'index.html (built)', 'main-site.dc.html (source)', n=1))
        return

    out = TPL_RE.sub(lambda m: m.group(1) + encode(fresh) + m.group(3), raw, count=1)
    if read_template(out) != fresh:
        die('internal error: the rewritten template did not round-trip.')
    open(IDX, 'w', encoding='utf-8').write(out)
    print('index.html rebuilt from main-site.dc.html.')


main()
