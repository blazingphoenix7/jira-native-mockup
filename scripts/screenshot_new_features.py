"""Screenshot the new drawer tabs, role-gated transitions, and cross-vendor collection."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(r'C:/Users/AaryanMehta/Downloads/jira/derived/screenshots')
URL = 'http://localhost:8765/'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1600, 'height': 1100}, device_scale_factor=1)
    page = ctx.new_page()

    # === DDLNY: collections landing (showing cross-vendor badges) ===
    page.goto(URL, wait_until='networkidle')
    page.select_option('#roleSelect', 'ddlny')
    page.wait_for_timeout(400)
    page.locator('li[data-view="collections"]').first.click()
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/'DDLNY_collections_with_badges.png'), full_page=True)

    # Click "Twinkling Collection" — it has DNJ + Elegant
    twinkling = page.locator('.coll-card').filter(has_text='Twinkling Collection').first
    if twinkling.count():
        twinkling.click()
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'DDLNY_collection_detail_crossvendor.png'), full_page=True)

        # DDLNY view: vendor tabs visible
        page.locator('.vendor-tab').filter(has_text='DNJ').first.click()
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT/'DDLNY_collection_detail_filter_DNJ.png'), full_page=True)
        page.locator('.vendor-tab').filter(has_text='Elegant').first.click()
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT/'DDLNY_collection_detail_filter_Elegant.png'), full_page=True)

    # === DNJ view of same collection (should only show DNJ items + notice) ===
    page.goto(URL, wait_until='networkidle')
    page.select_option('#roleSelect', 'dnj')
    page.wait_for_timeout(400)
    page.locator('li[data-view="collections"]').first.click()
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/'DNJ_collections_landing.png'), full_page=True)
    twinkling = page.locator('.coll-card').filter(has_text='Twinkling Collection').first
    if twinkling.count():
        twinkling.click()
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'DNJ_collection_detail_twinkling.png'), full_page=True)

    # === Elegant view of same collection ===
    page.goto(URL, wait_until='networkidle')
    page.select_option('#roleSelect', 'elegant')
    page.wait_for_timeout(400)
    page.locator('li[data-view="collections"]').first.click()
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/'Elegant_collections_landing.png'), full_page=True)
    twinkling = page.locator('.coll-card').filter(has_text='Twinkling Collection').first
    if twinkling.count():
        twinkling.click()
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'Elegant_collection_detail_twinkling.png'), full_page=True)

    # === DDLNY: drawer with Attachments tab ===
    page.goto(URL, wait_until='networkidle')
    page.select_option('#roleSelect', 'ddlny')
    page.wait_for_timeout(400)
    page.locator('li[data-view="board"]').first.click()
    page.wait_for_timeout(500)
    first_card = page.locator('.card[data-key]').first
    first_card.click()
    page.wait_for_timeout(300)
    # click Attachments tab
    page.locator('.d-tab').filter(has_text='Attachments').first.click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'DDLNY_drawer_attachments.png'), full_page=True)

    # click History tab
    page.locator('.d-tab').filter(has_text='History').first.click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'DDLNY_drawer_history.png'), full_page=True)

    # === DNJ: drawer on a DNJ item — see restricted transitions ===
    page.goto(URL, wait_until='networkidle')
    page.select_option('#roleSelect', 'dnj')
    page.wait_for_timeout(400)
    page.locator('li[data-view="board"]').first.click()
    page.wait_for_timeout(500)
    # find a card in "Awaiting Feedback" column — DNJ cannot advance it
    for col in ['Awaiting Feedback', 'CAD WIP', 'Design WIP']:
        cards_in_col = page.locator(f'.board-col:has(.col-head:has-text("{col}")) .card[data-key]')
        if cards_in_col.count():
            cards_in_col.first.click()
            page.wait_for_timeout(300)
            page.screenshot(path=str(OUT / f'DNJ_drawer_transitions_from_{col.replace(" ","_")}.png'), full_page=True)
            page.locator('button.icon-btn').filter(has_text='✕').first.click()
            page.wait_for_timeout(200)

    browser.close()

print('screenshots saved')
