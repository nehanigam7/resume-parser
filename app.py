import spacy
import re
import mammoth
import pdfplumber
from flask import Flask, request, jsonify
from flask_cors import CORS

# Load SpaCy NER model
nlp = spacy.load("en_core_web_sm")

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Function to parse text using NER model
def extract_with_ner(text):
    doc = nlp(text)
    entities = {ent.label_: ent.text for ent in doc.ents}
    return entities

# Function to extract text from uploaded file (PDF/DOCX)
def extract_text_from_file(file):
    if file.content_type == 'application/pdf':
        with pdfplumber.open(file) as pdf:
            return "\n".join(page.extract_text() for page in pdf.pages)
    elif file.content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        doc = mammoth.extract_raw_text(file)
        return doc.value
    elif file.content_type == 'text/plain':
        return file.read().decode('utf-8')
    else:
        raise ValueError('Unsupported file type')

# Fallback to regex-based extraction
def extract_name(text):
    name_regex = r"(?:Name|Full Name|Applicant Name):?\s*([A-Z][a-zA-Z\s]+)"
    match = re.search(name_regex, text, re.IGNORECASE)
    return match.group(1) if match else "Name not found"

def extract_email(text):
    email_regex = r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
    match = re.search(email_regex, text)
    return match.group(1) if match else "Email not found"

# Similar regex functions for other fields...

# Function to parse the resume using ML + regex fallback
def parse_resume_with_ml(file):
    text = extract_text_from_file(file)

    # Extract using NER model
    ner_extracted_data = extract_with_ner(text)

    # Fallback to regex for fields missed by NER
    parsed_data = {
        "name": ner_extracted_data.get("PERSON", extract_name(text)),
        "email": ner_extracted_data.get("EMAIL", extract_email(text)),
        "contactInfo": ner_extracted_data.get("PHONE", "Contact info not found"),
        "currentRole": ner_extracted_data.get("WORK_OF_ART", "Current role not found"),
        "bio": "Bio not found",  # Add proper extraction or use NER
        "address": ner_extracted_data.get("GPE", "Address not found"),
        "urls": extract_urls(text),
        "skills": extract_skills(text),
        "experience": extract_experience(text),
        "languages": extract_languages(text),
        "projects": extract_projects(text),
        "education": extract_education(text),
    }
    return parsed_data

@app.route('/upload', methods=['POST'])
def upload_resume():
    file = request.files['file']
    parsed_data = parse_resume_with_ml(file)
    print("Parsed Data:", parsed_data)  # Log parsed data for debugging
    return jsonify(parsed_data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
