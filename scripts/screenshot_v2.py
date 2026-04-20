"""Screenshot the v2 mockup: 7-phase board, sub-tasks, 3-flow Create, collection detail."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(r'C:/Users/AaryanMehta/Downloads/jira/derived/screenshots_v2')
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://localhost:8765/'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1700, 'height': 1100}, device_scale_factor=1)
    page = ctx.new_page()

    # ---- Landing dashboard (DDLNY) ----
    page.goto(URL, wait_until='networkidle')
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT/'01_ddlny_dashboard.png'), full_page=True)

    # ---- New 7-phase board ----
    page.locator('li[data-view="board"]').first.click()
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/'02_board_7phase.png'), full_page=True)

    # ---- Click a card with ready_to_advance — should show Advance banner ----
    # Try finding a card with the "✨ ready" pill
    ready_card = page.locator('.card[data-key]:has(.pill.live:has-text("ready"))').first
    if ready_card.count() == 0:
        # Fall back to any card
        ready_card = page.locator('.card[data-key]').first
    ready_card.click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT/'03_drawer_with_advance_banner.png'), full_page=True)

    # Click Sub-tasks tab
    page.locator('.d-tab').filter(has_text='Sub-tasks').first.click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT/'04_drawer_subtasks.png'), full_page=True)

    # ---- + Create: type picker ----
    page.locator('button.icon-btn').filter(has_text='✕').first.click()
    page.wait_for_timeout(300)
    page.locator('.create-btn').first.click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'05_create_picker.png'), full_page=True)

    # Pick Style
    page.locator('.create-type').filter(has_text='Style').first.click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'06_create_style.png'), full_page=True)

    # Back to picker, pick Collection
    page.locator('.create-back a').first.click()
    page.wait_for_timeout(200)
    page.locator('.create-type').filter(has_text='Collection').first.click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'07_create_collection.png'), full_page=True)

    # Back, pick Sub-task
    page.locator('.create-back a').first.click()
    page.wait_for_timeout(200)
    page.locator('.create-type').filter(has_text='Sub-task').first.click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'08_create_subtask.png'), full_page=True)

    # Click a template button
    page.locator('.template-btn').filter(has_text='Request Feedback').first.click()
    page.wait_for_timeout(200)
    page.screenshot(path=str(OUT/'09_create_subtask_filled.png'), full_page=True)

    # Close modal by reloading — simplest
    page.goto(URL, wait_until='networkidle')
    page.wait_for_timeout(400)

    # ---- Collections view (DDLNY) — should now show Collection status chips ----
    page.locator('li[data-view="collections"]').first.click()
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/'10_collections_with_status.png'), full_page=True)

    # Open a cross-vendor collection (Twinkling)
    tw = page.locator('.coll-card').filter(has_text='Twinkling Collection').first
    if tw.count():
        tw.click()
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT/'11_collection_detail.png'), full_page=True)

    # ---- DNJ view: drawer showing hidden-subtask placeholder ----
    page.goto(URL, wait_until='networkidle')
    page.select_option('#roleSelect', 'dnj')
    page.wait_for_timeout(300)
    page.locator('li[data-view="board"]').first.click()
    page.wait_for_timeout(500)
    # Pick first card with a progress pill
    card = page.locator('.card[data-key]').first
    card.click()
    page.wait_for_timeout(300)
    page.locator('.d-tab').filter(has_text='Sub-tasks').first.click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'12_dnj_drawer_subtasks_with_hidden.png'), full_page=True)

    # ---- Elegant: dashboard now has 34 real items ----
    page.goto(URL, wait_until='networkidle')
    page.select_option('#roleSelect', 'elegant')
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT/'13_elegant_dashboard.png'), full_page=True)
    page.locator('li[data-view="board"]').first.click()
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/'14_elegant_board.png'), full_page=True)

    browser.close()
print('done — screenshots in screenshots_v2/')
