import React from 'react';
import './App.css';  // Optional styling
import UploadResume from './UploadResume';  // Import the UploadResume component

function App() {
    return (
        <div className="App">
            <h1>Resume Parser</h1>
            <UploadResume />  {/* Use the UploadResume component */}
        </div>
    );
}

export default App;
