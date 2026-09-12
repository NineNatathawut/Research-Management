const { extractMetadataFromGrobid } = require("./grobidService");
const fs = require("fs");

const pdfBuffer = fs.readFileSync("test2.pdf");

extractMetadataFromGrobid(pdfBuffer)
    .then(metadata => {
        console.log("=== Metadata Extracted ===");
        console.log(JSON.stringify(metadata, null, 2));
    })
    .catch(err => {
        console.error("Error:", err.message);
    });
