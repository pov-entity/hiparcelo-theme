from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

rng = np.random.default_rng(20261018)
size = 256
y, x = np.mgrid[0:size, 0:size] / size
frequency = np.fft.fftfreq(size)
frequency2 = frequency[:, None] ** 2 + frequency[None, :] ** 2


def noise(sigma):
    values = rng.normal(size=(size, size))
    values = np.fft.ifft2(np.fft.fft2(values) * np.exp(-2 * np.pi ** 2 * sigma ** 2 * frequency2)).real
    return values / max(values.std(), 1e-6)


fine, medium, broad = noise(.6), noise(4), noise(23)
tiles = []
tiles.append((.5 + .009 * fine, .25, .06))
tiles.append((.5 + .022 * fine + .04 * noise(.3).mean(axis=1)[:, None], .29, .12))
tiles.append((.5 + .025 * fine + .035 * medium, .91, .32))
tiles.append((.5 + .045 * fine + .035 * broad, .88, .38))
aggregate = rng.random((size, size))
tiles.append((.46 + .075 * fine + .10 * (aggregate > .97), .94, .40))
grass = Image.new('L', (size, size), 110)
draw = ImageDraw.Draw(grass)
for _ in range(1900):
    px, py = rng.uniform(0, size, 2)
    dx, dy = rng.uniform(-5, 5), rng.uniform(3, 16)
    shade = int(rng.uniform(75, 190))
    for ax in (-size, 0, size):
        for ay in (-size, 0, size):
            draw.line((px + ax, py + ay, px + dx + ax, py - dy + ay), fill=shade, width=1)
tiles.append((np.asarray(grass) / 255 + .018 * medium, .93, .28))
tiles.append((.5 + .018 * fine + .012 * np.sin(y * 800), .86, .12))
leaves = .5 + .075 * fine + .12 * medium
tiles.append((leaves, .78, .37))
wood = .5 + .10 * np.sin(x * 120 + medium * .9) + .025 * fine + .025 * broad
tiles.append((wood, .69, .22))
fabric = .5 + .04 * np.sin(x * np.pi * 128) * np.sin(y * np.pi * 128) + .018 * fine
tiles.append((fabric, .97, .23))
tiles.append((.5 + .02 * fine + .018 * np.sin(x * 160), .94, .18))
row = np.floor(y * 4)
joint = ((np.mod(x * 2 + np.mod(row, 2) * .5, 1) < .015) | (np.mod(y * 4, 1) < .022))
paver = .52 + .02 * fine + .035 * broad - joint * .2
tiles.append((paver, .89, .32))
tiles.append((.5 + .006 * fine + .008 * medium, .62, .035))
water = rng.normal(size=(size, size))
water = np.fft.ifft2(np.fft.fft2(water) * np.exp(-2 * np.pi ** 2 * (1.3 ** 2 * frequency[None, :] ** 2 + 3.5 ** 2 * frequency[:, None] ** 2))).real
water /= water.std()
tiles.append((.5 + .12 * water + .04 * broad, .14, 1.2))
tiles.append((.5 + .035 * fine + .02 * medium, .95, .27))
tiles.append((.5 + .13 * medium + .15 * broad, 1., .07))

albedo = np.empty((size * 4, size * 4, 3), dtype=np.uint8)
detail = np.empty_like(albedo)
for i, (height, roughness, strength) in enumerate(tiles):
    height = np.clip(np.broadcast_to(height, (size, size)), .1, .9)
    color = np.repeat(height[:, :, None], 3, axis=2)
    if i == 5:
        color *= np.array([.94, 1.04, .86])
    if i == 8:
        color *= np.array([1.04, 1., .93])
    gx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * strength * 4
    gy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * strength * 4
    normal = np.stack((.5 - gx, .5 - gy, np.clip(roughness + (height - .5) * .15, .04, 1)), axis=-1)
    a, b = divmod(i, 4)
    albedo[a * size:(a + 1) * size, b * size:(b + 1) * size] = np.uint8(np.clip(color, 0, 1) * 255)
    detail[a * size:(a + 1) * size, b * size:(b + 1) * size] = np.uint8(np.clip(normal, 0, 1) * 255)

root = Path(__file__).resolve().parents[1] / 'assets'
Image.fromarray(albedo).save(root / 'hi-journey-materials-color.webp', quality=88, method=6)
Image.fromarray(detail).save(root / 'hi-journey-materials-detail.webp', quality=94, method=6)
print('Built deterministic color, surface-normal and roughness atlases.')
