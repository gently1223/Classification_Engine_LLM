import React, { useRef, useState } from "react";
import "./Dropzone.css";

const Dropzone = (props) => {
  const [highlight, setHighlight] = useState(false);
  const fileInputRef = useRef(null);

  const openFileDialog = () => {
    if (props.disabled) return;
    fileInputRef.current.click();
  };

  const onFilesAdded = (evt) => {
    if (props.disabled) return;
    const files = evt.target.files;
    if (props.onFilesAdded) {
      const array = fileListToArray(files);
      props.onFilesAdded(array);
    }
  };

  const onDragOver = (event) => {
    event.preventDefault();
    if (props.disabled) return;
    setHighlight(true);
  };

  const onDragLeave = (event) => {
    setHighlight(false);
  };

  const onDrop = (event) => {
    event.preventDefault();
    if (props.disabled) return;
    const files = event.dataTransfer.files;
    if (props.onFilesAdded) {
      const array = fileListToArray(files);
      props.onFilesAdded(array);
    }
    setHighlight(false);
  };

  const fileListToArray = (list) => {
    const array = [];
    for (var i = 0; i < list.length; i++) {
      array.push(list.item(i));
    }
    return array;
  };

  return (
    <div
      className={`Dropzone ${highlight ? "Highlight" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={openFileDialog}
      style={{ cursor: props.disabled ? "default" : "pointer" }}
    >
      <input
        ref={fileInputRef}
        className="FileInput"
        type="file"
        multiple
        onChange={onFilesAdded}
      />
      <img
        alt="upload"
        className="Icon"
        src="baseline-cloud_upload-24px.svg"
      />
      <span>Upload Files</span>
    </div>
  );
};

export default Dropzone;
