from PIL import Image, ImageDraw, ImageFont

W, H = 2200, 1300
NAVY = "#0D1B2A"
PANEL = "#16283A"
WHITE = "#F5F7FA"
MUTED = "#B9C8D6"
TEAL = "#35C0B0"
GOLD = "#E6B566"
RED = "#E87870"
BLUE = "#5A92B7"

img = Image.new("RGB", (W, H), NAVY)
d = ImageDraw.Draw(img)
font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
bold_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size, bold=False):
    return ImageFont.truetype(bold_path if bold else font_path, size)


def text_center(box, text, fnt, fill):
    lines = text.split("\n")
    line_heights = [d.textbbox((0, 0), line, font=fnt)[3] for line in lines]
    y = box[1] + (box[3] - box[1] - sum(line_heights) - (len(lines) - 1) * 10) / 2
    for line, height in zip(lines, line_heights):
        width = d.textbbox((0, 0), line, font=fnt)[2]
        d.text(((box[0] + box[2] - width) / 2, y), line, font=fnt, fill=fill)
        y += height + 10


def card(box, stroke, title, body):
    d.rounded_rectangle(box, radius=12, fill=PANEL, outline=stroke, width=4)
    d.rectangle((box[0], box[1], box[2], box[1] + 12), fill=stroke)
    title_box = (box[0] + 18, box[1] + 28, box[2] - 18, box[1] + 92)
    text_center(title_box, title, font(25, True), stroke)
    body_box = (box[0] + 20, box[1] + 96, box[2] - 20, box[3] - 18)
    text_center(body_box, body, font(20), WHITE)


def arrow(x1, y1, x2, y2, color, label=None):
    d.line((x1, y1, x2, y2), fill=color, width=6)
    d.polygon([(x2, y2), (x2 - 20, y2 - 12), (x2 - 20, y2 + 12)], fill=color)
    if label:
        tw = d.textbbox((0, 0), label, font=font(16))[2]
        d.rectangle(((x1 + x2 - tw) / 2 - 8, y1 - 33, (x1 + x2 + tw) / 2 + 8, y1 - 7), fill=NAVY)
        d.text(((x1 + x2 - tw) / 2, y1 - 31), label, font=font(16), fill=color)

# Main title
d.text((90, 55), "ARQUITECTURA DE AUTORIZACIÓN: ANTES Y DESPUÉS", font=font(42, True), fill=WHITE)
d.text((90, 112), "PR #2 · La identidad se deriva en el servidor y la propiedad se valida en cada operación", font=font(22), fill=MUTED)

# Dividers and labels
d.rounded_rectangle((70, 200, 2130, 600), radius=18, outline=RED, width=3)
d.rounded_rectangle((70, 680, 2130, 1170), radius=18, outline=TEAL, width=3)
d.text((100, 220), "MODELO INICIAL — VULNERABLE", font=font(28, True), fill=RED)
d.text((100, 700), "MODELO IMPLEMENTADO — SEGURO", font=font(28, True), fill=TEAL)

# Vulnerable row
v_cards = [(140, 310, 540, 510), (850, 310, 1250, 510), (1560, 310, 1960, 510)]
card(v_cards[0], BLUE, "CLIENTE / NAVEGADOR", "Envía:\nassessmentId +\nemployeeId = 99")
card(v_cards[1], RED, "ROUTER ASSESSMENTS", "Confía en el\nidentificador enviado\npor el cliente")
card(v_cards[2], GOLD, "INTENTO / BASE DE DATOS", "Lee o escribe datos\nsin confirmar la\npropiedad del recurso")
arrow(540, 410, 850, 410, RED, "employeeId manipulable")
arrow(1250, 410, 1560, 410, RED, "sin guardia")

# Secure row
s_cards = [(110, 825, 430, 1050), (520, 825, 840, 1050), (930, 825, 1250, 1050), (1340, 825, 1660, 1050), (1750, 825, 2070, 1050)]
card(s_cards[0], BLUE, "CLIENTE / NAVEGADOR", "Envía solo:\nassessmentId")
card(s_cards[1], TEAL, "SESIÓN", "ctx.user.id\nautenticado")
card(s_cards[2], TEAL, "RESOLVEDOR", "Busca employeeId\nmediante\nemployees.userId")
card(s_cards[3], TEAL, "GUARDIA DE PROPIEDAD", "Compara intento.employeeId\ncon employeeId\nderivado")
card(s_cards[4], BLUE, "BASE DE DATOS", "Autoriza la acción\no responde\nFORBIDDEN")
for a, b, label in zip(s_cards[:-1], s_cards[1:], ["solicitud", "identidad", "propiedad", "autoriza / deniega"]):
    arrow(a[2], 937, b[0], 937, TEAL, label)

# Footer
d.line((90, 1220, 2110, 1220), fill="#38536A", width=2)
d.text((90, 1240), "Principio: El cliente solicita una acción; el servidor determina la identidad y decide el permiso.", font=font(22, True), fill=GOLD)
d.text((1900, 1242), "NOM-035 · Auditoría 2026", font=font(16), fill=MUTED)

img.save("/home/ubuntu/nom-035/arquitectura_autorizacion_comparativa.png", quality=95)
