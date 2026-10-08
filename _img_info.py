from pathlib import Path

path = Path(r"d:\Personal Jobs\my-portfolio\images\projects\doc-voice-full.jpg")
data = path.read_bytes()
# JPEG SOF0/SOF2 size
i = 2
while i < len(data) - 8:
    if data[i] != 0xFF:
        i += 1
        continue
    marker = data[i + 1]
    if marker in (0xC0, 0xC1, 0xC2):
        height = int.from_bytes(data[i + 5:i + 7], "big")
        width = int.from_bytes(data[i + 7:i + 9], "big")
        print("size", width, height, "bytes", len(data))
        break
    if marker == 0xD8 or marker == 0xD9:
        i += 2
        continue
    length = int.from_bytes(data[i + 2:i + 4], "big")
    i += 2 + length
