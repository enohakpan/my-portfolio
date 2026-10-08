import base64
import json
from pathlib import Path

src = Path(r"C:\Users\USER\.cursor\browser-logs\cdp-response-Page.captureScreenshot-2026-10-08T16-34-06-288Z.json")
raw = base64.b64decode(json.loads(src.read_text(encoding="utf-8"))["data"])
full = Path(r"d:\Personal Jobs\my-portfolio\_whale-check.jpg")
full.write_bytes(raw)
print(len(raw))
