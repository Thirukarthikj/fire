import os
from PIL import Image

src = r"C:\Users\jthir\.gemini\antigravity\brain\39c2f005-3f31-4540-8a98-93f674bd07c6\.user_uploaded\media_1794637379002_31e850d9.jpg"
img = Image.open(src)

out_dirs = [
    r"frontend\assets\img\products",
    r"public\assets\img\products"
]
for d in out_dirs:
    os.makedirs(d, exist_ok=True)

# Card bounding boxes (including green badge or just product image)
# Let's inspect each card:
# The card image starts around y=70 to y=230
# Card 1: x 70..235
# Card 2: x 246..411
# Card 3: x 422..587
# Card 4: x 598..763
# Card 5: x 774..939

crops = {
    "kuruvi-crackers.jpg": (72, 72, 234, 230),
    "electric-sparklers.jpg": (248, 72, 410, 230),
    "magic-pop.jpg": (424, 72, 586, 230),
    "jee-boom-bha.jpg": (600, 72, 762, 230),
    "electric-stone.jpg": (776, 72, 938, 230),
    "ground-chakkar-box.jpg": (952, 72, 1024, 230)
}

for name, box in crops.items():
    cropped = img.crop(box)
    for d in out_dirs:
        p = os.path.join(d, name)
        cropped.save(p, quality=95)
        print(f"Saved: {p} ({cropped.size})")

print("Done extracting best seller cards!")
