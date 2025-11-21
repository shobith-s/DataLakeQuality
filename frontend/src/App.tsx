
import { useState } from "react";

function App() {
  const [datasetName, setDatasetName] = useState("customers");
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("dataset_name", datasetName);
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze dataset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>DataLakeQ Quality Gate</h1>

      <div style={{ marginTop: "1rem" }}>
        <label>
          Dataset name:{" "}
          <input
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
          />
        </label>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={loading}
        style={{ marginTop: "1rem" }}
      >
        {loading ? "Analyzing..." : "Run Quality Gate"}
      </button>

      {report && (
        <pre style={{ marginTop: "2rem", background: "#111", color: "#0f0", padding: "1rem" }}>
          {JSON.stringify(report, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default App;
