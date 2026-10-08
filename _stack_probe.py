import re
import urllib.request

html = urllib.request.urlopen("https://docvoice-rosy.vercel.app/", timeout=25).read().decode("utf-8", "replace")
keys = ["__NEXT", "/_next", "vite", "react", "nuxt", "astro", "svelte", "webpack", "assets/index"]
for key in keys:
    print(key, html.lower().count(key.lower()))
print("---scripts---")
for match in re.findall(r"<script[^>]+>", html)[:15]:
    print(match[:220])
print("---links---")
for match in re.findall(r"<link[^>]+>", html)[:15]:
    print(match[:220])
