const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const form = new FormData();
form.append("input", fs.createReadStream("test.txt"), { filename: "test.txt", contentType: "text/plain" });

axios.post("http://localhost:8070/api/processHeaderDocument", form, {
    headers: form.getHeaders(),
    validateStatus: () => true
})
.then(response => {
    console.log("Status:", response.status);
    console.log("Headers:", response.headers["content-type"]);
    console.log("Data:", response.data);
    console.log("Data type:", typeof response.data);
    console.log("First char:", response.data ? response.data.charAt(0) : "none");
})
.catch(err => {
    console.error("Error:", err.message);
    if (err.response) {
        console.log("Response status:", err.response.status);
        console.log("Response data:", err.response.data);
    }
});
