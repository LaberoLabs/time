import sys
from PIL import Image
out, cols, *names = sys.argv[1:]; cols = int(cols)
ims = [Image.open(f'shots/{n}.png').convert('RGB') for n in names]
w = 2400 // cols; h = int(ims[0].height * w / ims[0].width); rows = (len(ims) + cols - 1) // cols
g = Image.new('RGB', (w * cols, h * rows))
for i, im in enumerate(ims): g.paste(im.resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
g.save(f'shots/{out}.png'); print(out)
