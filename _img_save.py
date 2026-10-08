import base64
import json
from pathlib import Path

src = Path(r"C:\Users\USER\.cursor\browser-logs\cdp-response-Page.captureScreenshot-2026-10-08T16-30-04-385Z.json")
payload = json.loads(src.read_text(encoding="utf-8"))["data"]
raw = base64.b64decode(payload)
out = Path(r"d:\Personal Jobs\my-portfolio\images\projects\doc-voice-full.jpg")
out.write_bytes(raw)
print(out, len(raw))
