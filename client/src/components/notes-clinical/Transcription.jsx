import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

const TranscriptionTable = ({ transcriptUrl }) => {
  const [csvData, setCsvData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndParseCSV = async () => {
      try {
        setLoading(true);
        const response = await fetch(transcriptUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvString = await response.text();
        Papa.parse(csvString, {
          complete: (result) => {
            if (result.data && result.data.length > 0) {
              setCsvData(result.data);
              setError(null)
            } else {
              setError('No data found in CSV');
            }
            setLoading(false);
          },
          header: true,
          error: (error) => {
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (error) {
        setError(`Error fetching CSV data: ${error.message}`);
        setLoading(false);
      }
    };

    fetchAndParseCSV();
  }, [transcriptUrl]);

  if (loading) {
    return <div className="loading" style={{ color: 'black' }}>Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!csvData || csvData.length === 0) {
    return <div className="no-data">No data available</div>;
  }

  return (
    <div className="transcription-table">
      <h2>Transcription Data</h2>
      { transcriptUrl &&
        <table>
            <thead>
            <tr>
                <th></th>
                <th>Transcript</th>
            </tr>
            </thead>
            <tbody>
            {csvData.map((row, index) => (
                <tr key={index}>
                {Object.entries(row).map(([key, cell], cellIndex) => (
                    <td key={cellIndex} className={key.toLowerCase() === 'transcript' ? 'transcript-cell' : ''}>
                    {cell}
                    </td>
                ))}
                </tr>
            ))}
            </tbody>
        </table>
    }
    </div>
  );
};

export default TranscriptionTable;