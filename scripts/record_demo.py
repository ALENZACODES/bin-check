"""Records a captioned screen demo of Bin Check (no sound) to docs/demo.webm.
The captions follow VIDEO_SCRIPT.md, so a voice-over can be laid on top.
Run: python3 scripts/record_demo.py   (needs playwright and Chrome, like browser_check.py)
Then: ffmpeg -i docs/demo.webm -c:v libx264 -pix_fmt yuv420p -crf 23 docs/demo-captioned.mp4
"""
import asyncio, functools, http.server, os, shutil, socketserver, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"

CAPTION_JS = """(t) => {
  let c = document.getElementById('cap');
  if (!c) { c = document.createElement('div'); c.id = 'cap';
    Object.assign(c.style, {position:'fixed',left:'50%',bottom:'26px',transform:'translateX(-50%)',maxWidth:'1040px',width:'calc(100% - 80px)',
      background:'rgba(1,20,60,.94)',color:'#fff',font:'600 24px/1.35 system-ui,sans-serif',padding:'14px 22px',borderRadius:'14px',
      border:'1px solid #e8b4b4',zIndex:99999,textAlign:'center',boxShadow:'0 10px 30px rgba(0,0,0,.45)'});
    document.body.appendChild(c); }
  c.textContent = t; c.style.display = t ? 'block' : 'none';
}"""

async def main():
    httpd, url = serve()
    async with async_playwright() as p:
        chrome = shutil.which("google-chrome")
        b = await (p.chromium.launch(executable_path=chrome, args=["--disable-gpu", "--disable-dev-shm-usage"]) if chrome else p.chromium.launch())
        ctx = await b.new_context(viewport={"width": 1280, "height": 720}, record_video_dir=f"{ROOT}/docs/_video", record_video_size={"width": 1280, "height": 720}, bypass_csp=True)
        pg = await ctx.new_page()
        cap = lambda t: pg.evaluate(CAPTION_JS, t)
        wait = pg.wait_for_timeout
        scroll = lambda sel, off=0: pg.evaluate(f"(() => {{ const e = document.querySelector({sel!r}); window.scrollTo({{top: e.getBoundingClientRect().top + scrollY - 20 + {off}, behavior: 'smooth'}}); }})()")
        async def typeq(text):
            await pg.fill("#q", "")
            await pg.type("#q", text, delay=90)
        await pg.goto(url); await wait(600)
        await cap("In Toronto, 35% of what goes in the Blue Bin does not belong there. That is one of the highest rates in Ontario."); await wait(7000)
        await cap("And on January 1, 2026 the rules changed. Coffee cups, chip bags and black plastic are recycling now. Beer bottles are not."); await wait(7500)
        await cap("Bin Check answers one question: which bin? Type it, or take a photo."); await wait(5000)
        await pg.hover("#lock"); await cap("Everything runs on your device. A security policy stops the page from sending anything anywhere."); await wait(6000)
        await typeq("coffee cup"); await wait(700)
        await cap("It searches the City's own Waste Wizard data: 2,206 items. Answers changed by the 2026 rules are flagged."); await wait(6500)
        await pg.click("#results button[data-id='A0870']"); await wait(600)
        await cap("Guess first. Most people would say garbage, because that was right until this year."); await wait(5500)
        await pg.click("#guessBtns [data-guess='Garbage Bin']"); await wait(500); await scroll("#card", -10)
        await cap("Now it's the Blue Bin. It shows what changed, the steps, and the source for every answer."); await wait(7000)
        await pg.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})"); await wait(500)
        await typeq("beer bottle"); await wait(600)
        await pg.click("#results button[data-id='A0013']"); await wait(400)
        await pg.click("#guessBtns [data-guess='Blue Bin']"); await wait(500); await scroll("#card", -10)
        await cap("Beer bottles went the other way. In the Blue Bin they are contamination. Returned, they are worth 10 or 20 cents."); await wait(7500)
        await pg.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})"); await wait(500)
        await cap("No idea what something is called? Take a photo."); await wait(3500)
        await pg.click("[data-sample='chip-bag']")
        await pg.wait_for_selector("body[data-photo-done]", timeout=120000); await wait(300)
        await cap("A small image model, MobileCLIP, runs right in the browser. About one second, and the photo never leaves the phone."); await wait(7500)
        await cap("It shows its top three guesses and how sure it is, so you stay in charge."); await wait(5000)
        await pg.evaluate("delete document.body.dataset.photoDone")
        await pg.click("[data-sample='batteries']")
        await pg.wait_for_selector("body[data-photo-done]", timeout=120000); await wait(800)
        await pg.click("#photoGuesses button"); await wait(400)
        await pg.click("#guessBtns [data-guess='Garbage Bin']"); await wait(500); await scroll("#card", -10)
        await cap("Batteries in a garbage truck can start fires. Bin Check flags anything hazardous and says where it goes."); await wait(7000)
        await pg.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})"); await wait(400)
        await typeq("bananna peal"); await wait(700)
        await cap("Search forgives typos and knows everyday words like styrofoam, pop and tinfoil."); await wait(5000)
        await pg.click("#demoLog"); await scroll(".log", -10); await wait(500)
        await cap("Every guess goes into a sorting log on your device. Here is a sample week for one household."); await wait(6000)
        await cap("It measures the problem directly: wrong Blue and Green Bin guesses caught, hazards caught, and grams kept out of landfill."); await wait(7500)
        await scroll(".changes", -10); await wait(500)
        await cap("The City's open data file is from 2023. Bin Check corrects 145 of its answers with the 2026 list, each one sourced."); await wait(7500)
        await scroll(".changelist", 120); await wait(3500)
        await cap("Plain JavaScript, no server, free on GitHub Pages. 23 tests and a browser check, including real photos."); await wait(6500)
        await pg.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})"); await wait(600)
        await cap("Bin Check. Right bin, first time. Made by John Khan in Toronto, Ontario."); await wait(5500)
        path = await pg.video.path()
        await ctx.close(); await b.close()
    httpd.shutdown()
    os.replace(path, f"{ROOT}/docs/demo.webm")
    shutil.rmtree(f"{ROOT}/docs/_video", ignore_errors=True)
    print("saved docs/demo.webm")

asyncio.run(main())
