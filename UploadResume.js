import React, { useState } from 'react';

function UploadResume() {
    const [files, setFiles] = useState(null);
    const [parsedData, setParsedData] = useState([]);

    const handleFileChange = (e) => {
        setFiles(e.target.files);  // Store the selected files
    };

    const handleUpload = async () => {
        if (!files || files.length === 0) {
            alert("Please select files to upload.");
            return;
        }

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);  // Append each file to the FormData
        }

        try {
            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData,
            });

            // Enhanced error handling
            if (!response.ok) {
                const errorData = await response.json();  // Capture the error message from server response
                throw new Error(`Error: ${response.statusText} - ${errorData.error}`);
            }

            const data = await response.json();
            setParsedData(data);  // Store the parsed data
        } catch (error) {
            console.error('Error uploading resumes:', error);
            alert("There was an error uploading the resumes. Check console for details.");  // Update alert message
        }
    };

    return (
        <div>
            <h2>Upload Resumes</h2>
            <input type="file" multiple onChange={handleFileChange} />
            <button onClick={handleUpload}>Parse Resumes</button>

            {/* Display parsed data */}
            {parsedData.length > 0 && parsedData.map((resume, index) => (
                <div key={index}>
                    <h3>Parsed Data for {resume.filename}</h3>

                    {resume.error ? (
                        <p style={{ color: 'red' }}>Error: {resume.error}</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Field</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(resume.parsedData).map(([key, value]) => (
                                    <tr key={key}>
                                        <td>{key}</td>
                                        <td>
                                            {typeof value === 'object' && value !== null ? (
                                                // Render phone and email separately
                                                <>
                                                    {Object.entries(value).map(([subKey, subValue]) => (
                                                        <div key={subKey}>
                                                            {subKey}: {subValue}
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                value
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ))}
        </div>
    );
}

export default UploadResume;
