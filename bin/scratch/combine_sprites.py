import os

from PIL import Image, ImageDraw, ImageFont


def remove_white_background(img, threshold=240):
    img = img.convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        # If the pixel is close to white, make it transparent
        if item[0] >= threshold and item[1] >= threshold and item[2] >= threshold:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    return img


def get_character_bbox_and_crop(img):
    alpha = img.split()[3]
    bbox = alpha.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def main():
    base_dir = "outputs/combat-sprite-compare/gemini"
    files = [
        "se-rin-imagen-base.png",
        "se-rin-imagen-attack.png",
        "se-rin-imagen-dash.png",
        "se-rin-imagen-dodge.png",
        "se-rin-imagen-victory.png",
    ]

    labels = ["IDLE", "ATTACK", "DASH", "DODGE", "VICTORY"]

    sheet_width = 1100
    sheet_height = 382
    num_cols = 5
    col_width = sheet_width // num_cols
    header_height = 40
    char_max_height = sheet_height - header_height - 10

    canvas = Image.new("RGBA", (sheet_width, sheet_height), (10, 15, 20, 255))
    draw = ImageDraw.Draw(canvas)

    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Cache/SFNS.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    font = None
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, 16)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    cyan_color = (0, 229, 255, 255)
    border_color = (20, 40, 50, 255)

    for i in range(num_cols):
        img_path = os.path.join(base_dir, files[i])
        if not os.path.exists(img_path):
            print(f"Error: {img_path} not found")
            continue

        img = Image.open(img_path)
        img_nobg = remove_white_background(img)
        img_cropped = get_character_bbox_and_crop(img_nobg)

        w, h = img_cropped.size
        ratio = char_max_height / h
        new_w = int(w * ratio)
        new_h = char_max_height

        if new_w > col_width - 10:
            ratio = (col_width - 10) / w
            new_w = col_width - 10
            new_h = int(h * ratio)

        img_resized = img_cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

        col_x_start = i * col_width
        paste_x = col_x_start + (col_width - new_w) // 2
        paste_y = header_height + (char_max_height - new_h) // 2 + 5

        canvas.paste(img_resized, (paste_x, paste_y), img_resized)

        text_bbox = draw.textbbox((0, 0), labels[i], font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
        text_x = col_x_start + (col_width - text_w) // 2
        text_y = (header_height - text_h) // 2
        draw.text((text_x, text_y), labels[i], fill=cyan_color, font=font)

        if i > 0:
            draw.line([(col_x_start, 0), (col_x_start, sheet_height)], fill=border_color, width=1)

    draw.line([(0, header_height), (sheet_width, header_height)], fill=border_color, width=1)

    out_dir = "outputs/combat-sprite-compare/gemini"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "se-rin-gemini-final.png")

    canvas.convert("RGB").save(out_path, "PNG")
    print(f"Successfully saved combined sheet to {out_path}")


if __name__ == "__main__":
    main()
