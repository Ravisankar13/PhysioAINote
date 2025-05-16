import React, { useState, useEffect } from "react";
import Papa from "papaparse";

interface TranscriptionTableProps {
  transcriptUrl: string;
}

interface CsvRow {
  [key: string]: string;
}

const TranscriptionTable: React.FC<TranscriptionTableProps> = ({
  transcriptUrl,
}) => {
  const [csvData, setCsvData] = useState<CsvRow[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
              setCsvData(result.data as CsvRow[]);
              setError(null);
            } else {
              setError("No data found in CSV");
            }
            setLoading(false);
          },
          header: true,
          error: (error: any) => {
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          },
        });
      } catch (err) {
        setError(
          `Error fetching CSV: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        setLoading(false);
      }
    };

    if (transcriptUrl) {
      fetchAndParseCSV();
    } else {
      setLoading(false);
      setError("No transcript URL provided");
    }
  }, [transcriptUrl]);

  if (loading)
    return <div className="loading-spinner">Loading transcript...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!csvData || csvData.length === 0)
    return <div className="no-data">No transcript data available</div>;

  return (
    <div className="transcription-table-container">
      <h3>Transcription</h3>
      <table className="transcription-table">
        <thead>
          <tr>
            {Object.keys(csvData[0]).map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {csvData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {Object.values(row).map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TranscriptionTable;
