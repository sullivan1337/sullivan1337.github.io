import os
import fitz  # PyMuPDF
from PIL import Image
from io import BytesIO

def optimize_pdf_images(pdf_path, quality=92):
    # Open the PDF file
    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        images = page.get_images(full=True)

        for img_index, img in enumerate(images):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]

            # Open the image with PIL
            image = Image.open(BytesIO(image_bytes))

            # Save the image with reduced quality
            optimized_image_io = BytesIO()
            image.save(optimized_image_io, format=image.format, quality=quality, optimize=True)

            # Replace the original image with the optimized one
            doc.update_image(xref, optimized_image_io.getvalue())

    # Save the optimized PDF
    optimized_pdf_path = os.path.splitext(pdf_path)[0] + "_optimized.pdf"
    doc.save(optimized_pdf_path)
    doc.close()

def optimize_pdfs_in_folder(folder_path, quality=92):
    for filename in os.listdir(folder_path):
        if filename.lower().endswith('.pdf'):
            file_path = os.path.join(folder_path, filename)
            optimize_pdf_images(file_path, quality)

if __name__ == "__main__":
    folder_path = input("Enter the path to the folder containing PDFs: ")
    optimize_pdfs_in_folder(folder_path)
    print("PDF optimization completed.")
