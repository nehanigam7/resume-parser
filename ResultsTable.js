import React from 'react';

const ResultsTable = ({ data }) => {
    return (
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact Info</th>
                    <th>Current Role</th>
                    <th>Bio</th>
                    <th>Address</th>
                    <th>URLs</th>
                    <th>Skills</th>
                    <th>Experience</th>
                    <th>Languages</th>
                    <th>Projects</th>
                    <th>Education</th>
                </tr>
            </thead>
            <tbody>
                {data.map((result, index) => (
                    <tr key={index}>
                        <td>{result.name}</td>
                        <td>{result.email}</td>
                        <td>{result.contactInfo}</td>
                        <td>{result.currentRole}</td>
                        <td>{result.bio}</td>
                        <td>{result.address}</td>
                        <td>{result.urls ? result.urls.join(', ') : 'No URLs found'}</td>
                        <td>{result.skills ? result.skills.join(', ') : 'No Skills found'}</td>
                        <td>{result.experience}</td>
                        <td>{result.languages ? result.languages.join(', ') : 'No Languages found'}</td>
                        <td>{result.projects}</td>
                        <td>{result.education}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ResultsTable;
