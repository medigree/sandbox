document.addEventListener('DOMContentLoaded', function() {
    const uploadMainSwitch = document.getElementById('uploadMain');
    const uploadExamplesSwitch = document.getElementById('uploadExamples');
    const fileInput = document.getElementById('localFileInput');

    fileInput.addEventListener('change', handleFileUpload);
    document.getElementById('confirmUploadBtn').addEventListener('click', confirmUpload);



    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            alert('Please choose a tarball file to upload.');
            return;
        }
        // Logic to handle the tarball file
        // ...
    }

    function confirmUpload() {
        if (uploadMainBtn.classList.contains('active')) {
            // Logic to upload the main package
            // ...
        }
        if (uploadExamplesBtn.classList.contains('active')) {
            // Logic to PUT the example resources
            // ...
        }
    }
});


document.getElementById('listResourcesBtn').addEventListener('click', async () => {
    const file = document.getElementById('localFileInput').files[0];
    if (!file) {
        alert('Please choose a tarball file to upload first.');
        return;
    }

    try {
        const resources = await parseTarball(file);
        populateTable(resources);
    } catch (error) {
        console.error('Error parsing tarball:', error);
    }
});


function populateTable(resources) {
    const tableBody = document.getElementById('resourceTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    const includeMain = document.getElementById('uploadMain').checked;
    const includeExamples = document.getElementById('uploadExamples').checked;

    resources.forEach(resource => {
        if ((includeMain && resource.isMain) || (includeExamples && resource.isExample)) {
            const row = tableBody.insertRow();
            const typeCell = row.insertCell(0);
            const idCell = row.insertCell(1);
            const jsonCell = row.insertCell(2);

            typeCell.textContent = resource.type;
            idCell.textContent = resource.id;

            const jsonButton = document.createElement('button');
            jsonButton.textContent = '...';
            jsonButton.addEventListener('click', () => alert(JSON.stringify(resource.json, null, 2)));
            jsonCell.appendChild(jsonButton);
        }
    });
}

async function parseTarball(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const base64String = event.target.result.split(',')[1];
                const byteChars = atob(base64String);
                const byteNumbers = new Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) {
                    byteNumbers[i] = byteChars.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);

                // Decompress using pako
                const decompressed = pako.inflate(byteArray);

                // Use js-untar to handle the tar archive
                untar(decompressed.buffer)
                    .then(extractedFiles => {
                        const resources = extractedFiles.map(file => {
                            const filePath = file.name;
                            const isMain = filePath.startsWith('package/') && !filePath.startsWith('package/example');
                            const isExample = filePath.startsWith('package/example');

                            if ((isMain || isExample) && filePath.endsWith('.json')) {
                                const jsonContent = JSON.parse(file.buffer);
                                if (jsonContent.resourceType && jsonContent.id) {
                                    return {
                                        type: jsonContent.resourceType,
                                        id: jsonContent.id,
                                        json: jsonContent,
                                        isMain,
                                        isExample
                                    };
                                }
                            }
                        }).filter(Boolean);
                        
                        resolve(resources);
                    })
                    .catch(err => {
                        console.error("Error extracting tarball:", err);
                        reject(err);
                    });
            } catch (err) {
                console.error("Error reading tarball:", err);
                reject(err);
            }
        };
        reader.readAsDataURL(file);
    });
}

function untar(buffer) {
    return window.untar(new Uint8Array(buffer));
}