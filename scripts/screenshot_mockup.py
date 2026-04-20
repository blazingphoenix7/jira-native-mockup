"""Take screenshots of the mockup in all 3 roles and all major views."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(r'C:/Users/AaryanMehta/Downloads/jira/derived/screenshots')
OUT.mkdir(parents=True, exist_ok=True)

URL = 'http://localhost:8765/'

ROLES = [
    ('ddlny',   'DDLNY_admin'),
    ('dnj',     'DNJ_vendor'),
    ('elegant', 'Elegant_vendor'),
]
VIEWS = ['dashboard', 'board', 'gallery', 'list', 'collections', 'reports']

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1600, 'height': 1000}, device_scale_factor=1)
    page = ctx.new_page()

    for role, rlabel in ROLES:
        page.goto(URL, wait_until='networkidle')
        page.select_option('#roleSelect', role)
        page.wait_for_timeout(300)
        for view in VIEWS:
            # click the view sidebar item
            locator = page.locator(f'li[data-view="{view}"]')
            if locator.count() == 0:
                continue
            locator.first.click()
            page.wait_for_timeout(500)
            out = OUT / f'{rlabel}_{view}.png'
            page.screenshot(path=str(out), full_page=True)
            print('saved', out.name)

    # Drawer preview (DDLNY, first item on board)
    page.goto(URL, wait_until='networkidle')
    page.select_option('#roleSelect', 'ddlny')
    page.locator('li[data-view="board"]').first.click()
    page.wait_for_timeout(500)
    card = page.locator('.card[data-key]').first
    if card.count():
        card.click()
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT/'DDLNY_drawer.png'), full_page=True)
        print('saved DDLNY_drawer.png')

    browser.close()

print('done')
