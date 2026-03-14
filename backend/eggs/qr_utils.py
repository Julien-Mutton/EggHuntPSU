"""
QR code generation utility with egg-themed decorative frame.
"""

import io
import qrcode
from PIL import Image, ImageDraw
from django.conf import settings


def generate_qr_image(code_identifier, box_size=10, border=4):
    """
    Generate a QR code image (PIL Image) for a given egg code_identifier.
    The QR code encodes the URL: {FRONTEND_URL}/redeem/{code_identifier}
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    url = f"{frontend_url}/redeem/{code_identifier}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    return img.convert('RGBA')


def generate_egg_framed_qr(code_identifier, size=400):
    """
    Generate a QR code composited over a randomly selected real egg image.
    The QR code is placed in the center of the egg.
    """
    import random
    import os

    qr_img = generate_qr_image(code_identifier, box_size=10, border=2)
    qr_img = qr_img.resize((180, 180), Image.Resampling.NEAREST)
    qr_w, qr_h = qr_img.size

    canvas_w, canvas_h = 450, 510

    assets_dir = os.path.join(settings.BASE_DIR, 'eggs', 'assets')
    egg_files = ['egg1.jpg', 'egg2.png', 'egg3.png']
    selected_egg = random.choice(egg_files)
    egg_path = os.path.join(assets_dir, selected_egg)

    canvas = Image.new('RGB', (canvas_w, canvas_h), (255, 255, 255))

    try:
        with Image.open(egg_path) as egg_img:
            egg_img = egg_img.convert('RGBA')
            egg_img.thumbnail((400, 500), Image.Resampling.LANCZOS)
            ew, eh = egg_img.size
            ex = (canvas_w - ew) // 2
            ey = (500 - eh) // 2
            egg_bg = Image.new('RGB', egg_img.size, (255, 255, 255))
            egg_bg.paste(egg_img, mask=egg_img.split()[3] if len(egg_img.split()) == 4 else None)
            canvas.paste(egg_bg, (ex, ey))
    except Exception:
        draw = ImageDraw.Draw(canvas)
        draw.ellipse([50, 50, 400, 450], fill=(230, 230, 240))

    qr_x = (canvas_w - qr_w) // 2
    qr_y = 250 - (qr_h // 2)

    pad = 12
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        [qr_x - pad, qr_y - pad, qr_x + qr_w + pad, qr_y + qr_h + pad],
        radius=10,
        fill="white"
    )
    canvas.paste(qr_img, (qr_x, qr_y))

    if size != canvas_w:
        canvas.thumbnail((size, int(size * (canvas_h / canvas_w))), Image.Resampling.LANCZOS)

    return canvas


def generate_qr_bytes(code_identifier, fmt='PNG', egg_frame=False):
    """Return QR code as bytes buffer. Egg frame is disabled by default per user request."""
    if egg_frame:
        img = generate_egg_framed_qr(code_identifier)
    else:
        img = generate_qr_image(code_identifier, box_size=8, border=3)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf
