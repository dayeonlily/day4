"""dem.npy(float32, 1394x1748) -> public/terrain/height.png (RGB, 16-bit height in R,G).
Pure Python (no numpy/PIL). height_m = ((R*256+G)/30) - 100  (clamped at sea level 0)."""
import struct, zlib, array, sys

SRC, OUT = sys.argv[1], sys.argv[2]
raw = open(SRC, "rb").read()
hl = struct.unpack("<H", raw[8:10])[0]
head = raw[10:10 + hl].decode()
rows, cols = eval(head[head.index("shape") + 8:].split(")")[0] + ")")
a = array.array("f"); a.frombytes(raw[10 + hl:])
assert len(a) == rows * cols
F = 3
oh, ow = rows // F, cols // F
png_rows = []
for oy in range(oh):
    line = bytearray([0])
    for ox in range(ow):
        s = 0.0
        for dy in range(F):
            base = (oy * F + dy) * cols + ox * F
            for dx in range(F):
                s += a[base + dx]
        h = max(s / (F * F), 0.0)
        v = min(65535, int(round((h + 100) * 30)))
        line += bytes((v >> 8, v & 255, 0))
    png_rows.append(bytes(line))

def chunk(t, d):
    c = struct.pack(">I", len(d)) + t + d
    return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)

png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", ow, oh, 8, 2, 0, 0, 0)) \
    + chunk(b"IDAT", zlib.compress(b"".join(png_rows), 9)) + chunk(b"IEND", b"")
open(OUT, "wb").write(png)
print(ow, oh, len(png), "max m:", max(a))
