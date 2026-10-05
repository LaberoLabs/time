import sys
from PIL import Image
names = sys.argv[1:] or ['a25', 'a31', 'a36', 'a45']
ims = [Image.open(f'shots/{n}.png').convert('RGB') for n in names]
w = 1000; h = int(ims[0].height * w / ims[0].width)
g = Image.new('RGB', (w * 2, h * 2))
for i, im in enumerate(ims):
    g.paste(im.resize((w, h), Image.LANCZOS), ((i % 2) * w, (i // 2) * h))
g.save('shots/grid.png')
print('shots/grid.png')
