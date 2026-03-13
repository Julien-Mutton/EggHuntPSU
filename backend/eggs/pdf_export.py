"""
PDF export utility for printable QR code sheets.
Uses ReportLab to lay out QR codes in a grid.
"""

import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from .qr_utils import generate_qr_bytes


def export_eggs_pdf(eggs):
    """
    Generate a PDF with QR codes for the given eggs queryset.
    Layout: 3 columns x 4 rows per page.
    Each cell shows: label_text (if any), QR code, code_identifier, points.
    Returns a BytesIO buffer containing the PDF.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    page_w, page_h = letter

    import math
    cols = 3
    # Use less vertical margin to make space for taller eggs
    margin_x = 0.5 * inch
    margin_y = 0.5 * inch
    
    # Calculate cell dimensions
    cell_w = (page_w - 2 * margin_x) / cols
    # Maintain aspect ratio (400x500 approx) for the cell itself
    # Let's say we want the image to be 1.5 inches wide, it should be 1.875 inches tall
    target_img_w = cell_w * 0.85
    target_img_h = target_img_w * (600 / 450) # Matching the ratio from qr_utils.py (450:600)
    
    cell_h = target_img_h + 30 # adding space for titles
    
    # How many rows can mathematically fit?
    rows = max(1, math.floor((page_h - 2 * margin_y) / cell_h))
    per_page = cols * rows

    eggs_list = list(eggs)

    for page_idx in range(0, len(eggs_list), per_page):
        if page_idx > 0:
            c.showPage()

        batch = eggs_list[page_idx:page_idx + per_page]

        for i, egg in enumerate(batch):
            col = i % cols
            row = i // cols

            x = margin_x + col * cell_w
            # Draw from top to bottom
            y = page_h - margin_y - (row + 1) * cell_h

            center_x = x + cell_w / 2
            
            # Title above egg
            text_y = y + cell_h - 15
            if egg.label_text:
                c.setFont("Helvetica-Bold", 9)
                c.drawCentredString(center_x, text_y, egg.label_text[:40])
                text_y -= 12

            if egg.title:
                c.setFont("Helvetica", 8)
                c.drawCentredString(center_x, text_y, egg.title[:35])

            # QR composited egg image
            qr_bytes = generate_qr_bytes(egg.code_identifier, egg_frame=True)
            try:
                qr_img = ImageReader(qr_bytes)
                # Bottom-left of image should be calculated so it sits nicely
                img_y = y + 10 # 10px padding from cell bottom
                img_x = center_x - (target_img_w / 2)
                c.drawImage(qr_img, img_x, img_y, width=target_img_w, height=target_img_h)
            except Exception as e:
                # If Pillow fails hard, write error
                c.setFont("Helvetica", 8)
                c.drawCentredString(center_x, y + cell_h/2, f"Render Error: {e}")

    c.save()
    buf.seek(0)
    return buf
