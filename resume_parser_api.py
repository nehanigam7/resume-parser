import os
import re
import pandas as pd
from flask import Flask, request, jsonify
from PyPDF2 import PdfReader
import docx
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Helper functions for text extraction
def extract_text_from_pdf(file_path):
    reader = PdfReader(file_path)
    text = ''
    for page in reader.pages:
        text += page.extract_text()
    return text

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    text = '\n'.join([para.text for para in doc.paragraphs])
    return text

# Helper function to parse the text for required fields
def parse_resume(text):
    parsed_data = {
        'full_name': re.search(r"([A-Z][a-z]+(?: [A-Z][a-z]+)+)", text).group(0) if re.search(r"([A-Z][a-z]+(?: [A-Z][a-z]+)+)", text) else "N/A",
        'bio': re.search(r"Bio\*\n(.*?)\n", text, re.DOTALL).group(1) if re.search(r"Bio\*\n(.*?)\n", text, re.DOTALL) else "N/A",
        'address': re.search(r"Address\n(.*?)\n", text).group(1) if re.search(r"Address\n(.*?)\n", text) else "N/A",
        'skills': re.search(r"Skills\n(.*?)\n", text).group(1) if re.search(r"Skills\n(.*?)\n", text) else "N/A",
        'experiences': re.search(r"Experiences\n(.*?)\n", text).group(1) if re.search(r"Experiences\n(.*?)\n", text) else "N/A",
        'education': re.search(r"Educations\n(.*?)\n", text).group(1) if re.search(r"Educations\n(.*?)\n", text) else "N/A",
        'languages': re.search(r"Languages\n(.*?)\n", text).group(1) if re.search(r"Languages\n(.*?)\n", text) else "N/A",
        'projects': re.search(r"Projects\n(.*?)\n", text).group(1) if re.search(r"Projects\n(.*?)\n", text) else "N/A",
        'urls': re.search(r"URLs\n(.*?)\n", text).group(1) if re.search(r"URLs\n(.*?)\n", text) else "N/A",
    }
    return parsed_data

# Save parsed resumes to an Excel file
def save_to_excel(parsed_resumes):
    df = pd.DataFrame(parsed_resumes)
    df.to_excel('resumes_data.xlsx', index=False)

# API endpoint to upload and parse resumes
@app.route('/upload_resumes', methods=['POST'])
def upload_resumes():
    uploaded_files = request.files.getlist('files')
    parsed_resumes = []

    for file in uploaded_files:
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension == '.pdf':
            text = extract_text_from_pdf(file)
        elif file_extension == '.docx':
            text = extract_text_from_docx(file)
        elif file_extension == '.txt':
            text = file.read().decode('utf-8')
        else:
            return jsonify({"error": "Unsupported file format"}), 400
        
        parsed_resume = parse_resume(text)
        parsed_resumes.append(parsed_resume)
    
    save_to_excel(parsed_resumes)

    return jsonify({"message": "Resumes parsed and saved successfully", "data": parsed_resumes}), 200

if __name__ == '__main__':
    app.run(debug=True)
