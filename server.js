const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Setup multer for multiple files
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage, 
    limits: { fileSize: 10 * 1024 * 1024 }  // Limit file size to 10 MB
});

// Parse multiple resumes
async function parseResumes(files) {
    const results = [];

    for (const file of files) {
        try {
            const parsedData = await parseResume(file);  // Parse each resume
            results.push({ filename: file.originalname, parsedData });
        } catch (error) {
            console.error(`Error parsing file ${file.originalname}:`, error.message);
            results.push({ filename: file.originalname, error: error.message });
        }
    }

    return results;
}

// Parse an individual resume
async function parseResume(file) {
    const fileType = file.mimetype;
    let text = '';

    try {
        if (fileType === 'application/pdf') {
            const pdfData = await pdf(file.buffer);
            text = pdfData.text;
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const docxData = await mammoth.extractRawText({ buffer: file.buffer });
            text = docxData.value;
        } else if (fileType === 'text/plain') {
            text = file.buffer.toString();
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err.message);
        throw err;
    }

    if (!text || text.trim() === '') {
        throw new Error('No text extracted from the resume.');
    }

    const parsedData = {
        fullName: extractName(text),  // First and last name
        contactInfo: extractContactInfo(text),
        experience: extractTotalExperience(text),  // Updated total experience calculation
        mostRecentEducation: extractEducation(text),  
        skills: extractSkills(text)  // Skills extraction
    };

    return parsedData;
}

// Extraction functions
function extractName(text) {
    const nameRegex = /(?:Full Name|Name|Applicant Name|Candidate Name|Resume of)?\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/g;
    const match = text.match(nameRegex);
    
    if (match) {
        const names = match[0].trim().split(' ');
        if (names.length >= 2) {
            return `${names[0]} ${names[names.length - 1]}`;  // Return first and last name
        }
        return names[0];  // Return only first name if no last name
    }
    
    return 'Name not found';
}

function extractContactInfo(text) {
    // General regex to capture phone numbers with or without country code
    const phoneRegex = /(?:Phone|Contact|Mobile|Tel|Phone Number|Mobile Number):?\s*(?:\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/i; 
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/; // Standard email regex

    const phoneMatch = text.match(phoneRegex);
    const emailMatch = text.match(emailRegex);

    // If phoneMatch is found, capture it; else, try to find standalone phone numbers
    let phoneNumber = phoneMatch ? phoneMatch[1].trim() : 'Phone not found';

    // Also, look for a standalone phone number pattern in the text
    if (phoneNumber === 'Phone not found') {
        const standalonePhoneRegex = /(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/; // Matches various phone formats
        const standaloneMatch = text.match(standalonePhoneRegex);
        if (standaloneMatch) {
            phoneNumber = standaloneMatch[0].trim();
        }
    }
    
    return {
        phone: phoneNumber,
        email: emailMatch ? emailMatch[1].trim() : 'Email not found'
    };
}

function extractTotalExperience(text) {
    const dateRegex = /(\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s*\d{4})\s*[-to/]+\s*(\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s*(?:\d{4}|Present|Current))/gi;

    let earliestDate = null;
    const currentDate = new Date();
    
    let match;
    while ((match = dateRegex.exec(text)) !== null) {
        let startDate = parseDate(match[1]);
        let endDate = match[2].toLowerCase().includes('present') || match[2].toLowerCase().includes('current') ? currentDate : parseDate(match[2]);

        if (!earliestDate || (startDate && startDate < earliestDate)) {
            earliestDate = startDate;
        }
    }

    if (earliestDate) {
        const totalMonths = monthDiff(earliestDate, currentDate);
        const totalYears = (totalMonths / 12).toFixed(2);
        return totalYears > 0 ? `${totalYears} years` : 'Experience not found';
    }

    return 'Experience not found';
}

// Function to extract skills from the resume
function extractSkills(text) {
    // Regex to match the skills section
    const skillsRegex = /(Skills|Management Skills|Soft Skills|Technical Skills|Skill Sets):?\s*([\s\S]*?)(?=\n\s*\n|$)/i;
    const match = text.match(skillsRegex);
    
    if (match && match[2]) {
        // Split the skills string into an array
        const skills = match[2]
            .replace(/[\u2022\u2023\u25AA\u25AB]/g, '') // Remove bullet points if they exist
            .replace(/\n/g, ',') // Replace newlines with commas
            .split(',')
            .map(skill => skill.trim()) // Trim whitespace
            .filter(skill => skill && 
                !/\b(?:years?|202[0-9]|201[0-9]|20[0-9]{2})\b/i.test(skill) && // Exclude year ranges
                !/\b(?:languages?|speak|fluent|proficient)\b/i.test(skill) &&  // Exclude language-related phrases
                !/\b(?:English|Spanish|German|French|Chinese|Hindi|Portuguese|Arabic|Russian|Italian|Japanese|Korean)\b/i.test(skill) // Exclude common language names
            );
        
        return skills; // Return the array of skills
    }
    
    return 'Skills not found';
}

// Helper function to parse date strings into JavaScript Date objects
function parseDate(dateString) {
    const monthMap = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    const parts = dateString.trim().split(/\s+/);
    const year = parts[parts.length - 1];  // The last part is the year
    const monthString = parts.length > 1 ? parts[0].toLowerCase() : 'january';  // Default to January if no month is provided
    const month = monthMap[monthString] || 0;  // Default to January if month not recognized

    return new Date(year, month);
}

// Helper function to calculate the difference in months between two dates
function monthDiff(startDate, endDate) {
    const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthsDiff = endDate.getMonth() - startDate.getMonth();
    return yearsDiff * 12 + monthsDiff;
}

function extractEducation(text) {
    const educationRegex = /(Bachelor(?:'s)?|Master(?:'s)?|PhD|Doctorate|MBA|B\.?E\.?|M\.?S\.?)\s*([^,]*)\s*[,]?\s*(\d{4})?\s*[-to]?(\d{4})?/i;
    const match = text.match(educationRegex);
    
    if (match) {
        const degree = match[1] ? match[1].trim() : 'Degree not found';
        const field = match[2] ? match[2].trim() : 'Field not found';
        return `${degree} in ${field}`;
    }
    
    return 'Education not found';
}

// Route to handle multiple resume uploads
app.post('/upload', upload.array('files', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const parsedData = await parseResumes(req.files);
        res.json(parsedData);  // Send parsed data for each file
    } catch (error) {
        console.error("Error parsing resumes:", error.message);
        res.status(500).json({ error: error.message });  // Send error message in response
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
