import { useState, useRef, useCallback } from "react";
import "./BulkUpload.css";

const FILE_ICONS = {
  "image/": "🖼️",
  "video/": "🎬",
  "audio/": "🎵",
  "application/pdf": "📄",
  "text/": "📝",
  "application/zip": "🗜️",
  "application/x-zip": "🗜️",
};

function getIcon(type) {
  for (const [key, icon] of Object.entries(FILE_ICONS)) {
    if (type.startsWith(key) || type === key) return icon;
  }
  return "📦";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function simulateUpload(onProgress) {
  return new Promise((resolve, reject) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        onProgress(100);
        Math.random() < 0.1 ? reject(new Error("Upload failed")) : resolve();
      } else {
        onProgress(Math.round(progress));
      }
    }, 150);
  });
}

export default function BulkUpload() {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const addFiles = useCallback((newFiles) => {
    const items = Array.from(newFiles).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: "pending",
      progress: 0,
      error: null,
    }));
    setFiles((prev) => [...prev, ...items]);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFile = (id, patch) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;
    setUploading(true);

    await Promise.all(
      pending.map(async ({ id }) => {
        updateFile(id, { status: "uploading", progress: 0 });
        try {
          await simulateUpload((progress) => updateFile(id, { progress }));
          updateFile(id, { status: "success", progress: 100 });
        } catch {
          updateFile(id, { status: "error", progress: 100, error: "Failed" });
        }
      })
    );

    setUploading(false);
  };

  const clearAll = () => setFiles([]);

  const counts = files.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="uploader">
      <h1>Bulk Upload</h1>
      <p className="subtitle">Drop files · select · upload</p>

      <div
        className={`drop-zone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
      >
        <div className="drop-icon">📂</div>
        <p className="drop-text">Drop files here</p>
        <p className="drop-hint">or click to browse</p>
        <div
          className="browse-btn"
          onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
        >
          Browse files
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className="file-list">
            {files.map(({ id, file, status, progress }) => (
              <div key={id} className={`file-item ${status}`}>
                <div className="file-icon">{getIcon(file.type)}</div>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-meta">
                    {formatSize(file.size)} · {file.type || "unknown"}
                  </div>
                  {status !== "pending" && (
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${
                          status === "success" ? "success" : status === "error" ? "error" : ""
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <span className={`status-badge ${status}`}>{status}</span>
                {status !== "uploading" && (
                  <button className="remove-btn" onClick={() => removeFile(id)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="actions">
            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={uploading || !files.some((f) => f.status === "pending")}
            >
              {uploading
                ? "Uploading..."
                : `Upload ${files.filter((f) => f.status === "pending").length} File(s)`}
            </button>
            <button className="clear-btn" onClick={clearAll} disabled={uploading}>
              Clear
            </button>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-val">{files.length}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat">
              <div className="stat-val green">{counts.success || 0}</div>
              <div className="stat-label">Done</div>
            </div>
            <div className="stat">
              <div className="stat-val red">{counts.error || 0}</div>
              <div className="stat-label">Failed</div>
            </div>
            <div className="stat">
              <div className="stat-val">{counts.pending || 0}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
