"""Browser check for Bin Check.

Serves the site, loads it in headless Chrome and checks that:
  * search answers with the 2026 rules applied,
  * the guess first flow records an outcome in the sorting log,
  * a sample photo is recognised on device by the image model,
  * the page cannot reach any outside server (the network lock),
  * there are no console errors.
With --shots it also saves the gallery screenshots into docs/.

Needs: pip install playwright, then either Chrome installed or `playwright install chromium`.
Run:  python3 scripts/browser_check.py [--shots]
"""
import asyncio, functools, http.server, os, shutil, socketserver, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = "--shots" in sys.argv

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"

async def main():
    httpd, url = serve()
    failures = []
    def check(ok, what):
        print(("PASS " if ok else "FAIL ") + what)
        if not ok: failures.append(what)
    async with async_playwright() as p:
        chrome = shutil.which("google-chrome")
        b = await (p.chromium.launch(executable_path=chrome, args=["--disable-gpu", "--disable-dev-shm-usage"]) if chrome else p.chromium.launch())
        pg = await b.new_page(viewport={"width": 1400, "height": 960})
        errors = []
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(url)
        if SHOTS: await pg.screenshot(path=f"{ROOT}/docs/gallery-1-start.png")
        await pg.fill("#q", "coffee cup"); await pg.wait_for_timeout(250)
        res = await pg.inner_text("#results")
        check("Paper coffee cups" in res and "changed in 2026" in res, "search shows the 2026 change for coffee cups")
        if SHOTS: await pg.screenshot(path=f"{ROOT}/docs/gallery-2-search.png")
        await pg.click("#results button[data-id='A0870']")
        check(not await pg.is_hidden("#guessRow"), "guess first is on by default")
        await pg.click("#guessBtns [data-guess='Garbage Bin']")
        check("Blue Bin" in await pg.inner_text("#bin"), "coffee cup answer is the Blue Bin")
        check("Changed on January 1, 2026" in await pg.inner_text("#changed"), "the card explains the 2026 change")
        check((await pg.inner_text("#sItems")) == "1", "the guess is logged")
        if SHOTS:
            await pg.evaluate("document.querySelector('#card').scrollIntoView()"); await pg.evaluate("window.scrollBy(0,-20)")
            await pg.screenshot(path=f"{ROOT}/docs/gallery-3-answer.png")
        await pg.fill("#q", "beer bottle"); await pg.wait_for_timeout(250)
        await pg.click("#results button[data-id='A0013']")
        await pg.click("#guessBtns [data-guess='Blue Bin']")
        check("contaminated" in await pg.inner_text("#verdict"), "a wrong Blue Bin guess is caught")
        check("20 cents" in await pg.inner_text("#steps"), "beer bottle shows the deposit refund")
        if SHOTS:
            await pg.evaluate("document.querySelector('#card').scrollIntoView()"); await pg.evaluate("window.scrollBy(0,-20)")
            await pg.screenshot(path=f"{ROOT}/docs/gallery-4-deposit.png")
        await pg.click("[data-sample='chip-bag']")
        await pg.wait_for_selector("body[data-photo-done], body[data-photo-error]", timeout=120000)
        title = await pg.inner_text("#photoTitle")
        check("Chip bag" in title, f"photo model recognises the chip bag on device ({title})")
        if SHOTS:
            await pg.evaluate("document.querySelector('#photoBox').scrollIntoView()"); await pg.evaluate("window.scrollBy(0,-150)")
            await pg.screenshot(path=f"{ROOT}/docs/gallery-5-photo.png")
        await pg.click("#demoLog"); await pg.wait_for_timeout(200)
        check((await pg.inner_text("#sItems")) == "20", "sample week fills the log")
        if SHOTS:
            await pg.evaluate("document.querySelector('.log').scrollIntoView()"); await pg.evaluate("window.scrollBy(0,-10)")
            await pg.screenshot(path=f"{ROOT}/docs/gallery-6-log.png")
            await pg.evaluate("document.querySelector('.changes').scrollIntoView()"); await pg.evaluate("window.scrollBy(0,-10)")
            await pg.screenshot(path=f"{ROOT}/docs/gallery-7-changes.png")
        blocked = await pg.evaluate("""async () => { try { await fetch('https://example.com/collect', {method: 'POST', body: 'photo'}); return false } catch (e) { return true } }""")
        check(blocked, "network lock: a request to an outside server is blocked")
        errors = [e for e in errors if "Content Security Policy" not in e and "Refused to connect" not in e and "Failed to fetch" not in e]
        check(not errors, "no console errors" + (f": {errors}" if errors else ""))
        if SHOTS:
            m = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True)
            await m.goto(url)
            await m.click("[data-sample='batteries']")
            await m.wait_for_selector("body[data-photo-done]", timeout=120000)
            await m.click("#photoGuesses button")
            await m.click("#guessBtns [data-guess='Garbage Bin']")
            await m.evaluate("document.querySelector('#card').scrollIntoView()")
            await m.screenshot(path=f"{ROOT}/docs/gallery-8-phone.png")
        await b.close()
    httpd.shutdown()
    print(f"\n{'All browser checks passed' if not failures else str(len(failures)) + ' failed'}")
    sys.exit(1 if failures else 0)

asyncio.run(main())
