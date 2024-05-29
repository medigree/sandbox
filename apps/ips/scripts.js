document.addEventListener("DOMContentLoaded", () => {
    const fhirServerUrl = '/fhir';

    const patientSelect = document.getElementById('patientSelect');
    const patientDetails = document.getElementById('patientDetails');
    const ipsSelect = document.getElementById('ipsSelect');
    const viewIpsButton = document.getElementById('viewIpsButton');
    const createIpsButton = document.getElementById('createIpsButton');
    const searchPanel = document.getElementById('search-panel');
    const toggleSearchPanelButton = document.getElementById('toggleSearchPanel');

    // Toggle search panel visibility
    toggleSearchPanelButton.addEventListener('click', () => {
        searchPanel.style.display = searchPanel.style.display === 'block' ? 'none' : 'block';
    });

    // Fetch and populate patient dropdown
    fetch(`${fhirServerUrl}/Patient`)
        .then(response => response.json())
        .then(data => {
            if (data.entry && data.entry.length > 0) {
                data.entry.forEach(entry => {
                    const patient = entry.resource;
                    const option = document.createElement('option');
                    option.value = patient.id;
                    const name = patient.name ? (patient.name[0].text || `${patient.name[0].given.join(" ")} ${patient.name[0].family}`) : 'Unnamed';
                    option.textContent = name;
                    patientSelect.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Error loading patients:', error));

    patientSelect.addEventListener('change', () => {
        const patientId = patientSelect.value;
        fetch(`/fhir/Patient/${patientId}`)
            .then(response => response.json())
            .then(patient => {
                const name = patient.name ? (patient.name[0].text || `${patient.name[0].given.join(" ")} ${patient.name[0].family}`) : 'Unnamed';
                patientDetails.innerHTML = `
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Identifier:</strong> ${patient.identifier[0].value}</p>
                    <p><strong>Birth Date:</strong> ${patient.birthDate}</p>
                    <p><strong>Gender:</strong> ${patient.gender}</p>
                    <p><strong>Address:</strong> ${patient.address[0].line.join(", ")}, ${patient.address[0].city}, ${patient.address[0].postalCode}, ${patient.address[0].country}</p>
                `;
                loadIpsBundles(patientId);
                updateBanner(patient);
            })
            .catch(error => console.error('Error loading patient details:', error));
    });

    function updateBanner(patient) {
        const patientDetails = document.getElementById('patient-details');
        const patientAddress = document.getElementById('patient-address');

        const name = patient.name ? (patient.name[0].text || `${patient.name[0].given.join(" ")} ${patient.name[0].family}`) : 'Unnamed';

        patientDetails.innerHTML = `
            <p><strong>${name}</strong></p>
            <p><strong>Identifier:</strong> ${patient.identifier[0].value}</p>
            <p><strong>Birth Date:</strong> ${patient.birthDate}</p>
            <p><strong>Gender:</strong> ${patient.gender}</p>
        `;
        patientAddress.innerHTML = `<p><strong>Address:</strong> ${patient.address[0].line.join(", ")}, ${patient.address[0].city}, ${patient.address[0].postalCode}, ${patient.address[0].country}</p>`;
    }

    function loadIpsBundles(patientId) {
        ipsSelect.innerHTML = '';
        fetch(`/fhir/Bundle?composition.patient=${patientId}&composition.type=60591-5`)
            .then(response => response.json())
            .then(data => {
                if (data.entry) {
                    data.entry.forEach(entry => {
                        const composition = entry.resource.entry.find(e => e.resource.resourceType === 'Composition').resource;
                        const option = document.createElement('option');
                        option.value = entry.resource.id;
                        option.textContent = composition.title;
                        ipsSelect.appendChild(option);
                    });
                } else {
                    console.warn('No IPS bundles found.');
                }
            })
            .catch(error => console.error('Error loading IPS bundles:', error));
    }

    viewIpsButton.addEventListener('click', () => {
        const bundleId = ipsSelect.value;
        if (bundleId) {
            loadIps(bundleId);
        } else {
            alert('Please select an IPS Bundle to view.');
        }
    });

    createIpsButton.addEventListener('click', () => {
        const patientId = patientSelect.value;
        fetch(`/fhir/Patient/${patientId}/$summary`)
            .then(response => response.json())
            .then(data => {
                if (data.resourceType === 'OperationOutcome') {
                    alert('Error creating IPS: ' + data.issue[0].diagnostics);
                } else if (data.resourceType === 'Bundle') {
                    const bundleId = data.id;
                    localStorage.setItem('newBundle', JSON.stringify(data));
                    window.location.href = `index.html?newBundle=true`;
                }
            })
            .catch(error => console.error('Error creating IPS:', error));
    });

    // Loading the bundle either from URL or local storage
    const urlParams = new URLSearchParams(window.location.search);
    const bundleId = urlParams.get('bundleId');
    const newBundle = urlParams.get('newBundle');

    if (newBundle) {
        const bundleData = JSON.parse(localStorage.getItem('newBundle'));
        populateHeader(bundleData);
        populateContent(bundleData);
    } else if (bundleId) {
        fetch(`/fhir/Bundle/${bundleId}`)
            .then(response => response.json())
            .then(data => {
                populateHeader(data);
                populateContent(data);
            })
            .catch(error => console.error('Error loading bundle:', error));
    } else {
        fetch('Bundle-IPS-examples-Bundle-01.json')
            .then(response => response.json())
            .then(data => {
                populateHeader(data);
                populateContent(data);
            })
            .catch(error => console.error('Error loading data:', error));
    }

    function populateHeader(bundle) {
        const patientDetails = document.getElementById('patient-details');
        const patientAddress = document.getElementById('patient-address');
        const authorCard = document.getElementById('author-card');
        const attesterCard = document.getElementById('attester-card');
        const custodianCard = document.getElementById('custodian-card');
        const authorContent = document.getElementById('author-content');
        const attesterContent = document.getElementById('attester-content');
        const custodianContent = document.getElementById('custodian-content');

        const composition = bundle.entry.find(entry => entry.resource.resourceType === "Composition").resource;
        const patient = bundle.entry.find(entry => getIdFromReference(entry.fullUrl) === getIdFromReference(composition.subject.reference)).resource;

        const name = patient.name ? (patient.name[0].text || `${patient.name[0].given.join(" ")} ${patient.name[0].family}`) : 'Unnamed';

        patientDetails.innerHTML = `
            <p><strong>${name}</strong></p>
            <p><strong>Identifier:</strong> ${patient.identifier[0].value}</p>
            <p><strong>Birth Date:</strong> ${patient.birthDate}</p>
            <p><strong>Gender:</strong> ${patient.gender}</p>
        `;
        patientAddress.innerHTML = `<p><strong>Address:</strong> ${patient.address[0].line.join(", ")}, ${patient.address[0].city}, ${patient.address[0].postalCode}, ${patient.address[0].country}</p>`;

        const author = composition.author ? getResourceByReference(bundle, composition.author[0].reference) : null;
        const attester = composition.attester ? getResourceByReference(bundle, composition.attester[0].party.reference) : null;
        const custodian = composition.custodian ? getResourceByReference(bundle, composition.custodian.reference) : null;

        authorCard.innerHTML = author ? `Author: ${author.name ? author.name[0].text : 'Unnamed'}` : "Author: No data available";
        attesterCard.innerHTML = attester ? `Attester: ${attester.name ? attester.name[0].text : 'Unnamed'}` : "Attester: No data available";
        custodianCard.innerHTML = custodian ? `Custodian: ${custodian.name ? custodian.name : 'Unnamed'}` : "Custodian: No data available";

        authorContent.innerHTML = author ? generateDetailsHTML(author) : "";
        attesterContent.innerHTML = attester ? generateDetailsHTML(attester) : "";
        custodianContent.innerHTML = custodian ? generateDetailsHTML(custodian) : "";
    }

    function getResourceByReference(bundle, reference) {
        const id = getIdFromReference(reference);
        return bundle.entry.find(entry => getIdFromReference(entry.fullUrl) === id).resource;
    }

    function getIdFromReference(reference) {
        if (reference.startsWith('urn:uuid:')) {
            return reference.split(':')[2];
        } else {
            return reference.split('/')[1];
        }
    }

    function generateDetailsHTML(resource) {
        return `
            <p><strong>Name:</strong> ${resource.name ? resource.name[0].text : 'N/A'}</p>
            <p><strong>Identifier:</strong> ${resource.identifier ? resource.identifier[0].value : 'N/A'}</p>
            <p><strong>Role:</strong> ${resource.role ? resource.role.coding[0].display : 'N/A'}</p>
        `;
    }

    function populateContent(bundle) {
        const mainContent = document.getElementById('main-content');
        const sections = bundle.entry.find(entry => entry.resource.resourceType === "Composition").resource.section;

        mainContent.innerHTML = sections.map(section => `
            <div id="${section.code.coding[0].code}" class="card mb-3 ${section.text.status === 'empty' ? 'greyed-out' : ''} section tab-${section.code.coding[0].display.toLowerCase()}">
                <div class="section-header">
                    <i class="fas fa-${getIcon(section.code.coding[0].code)}"></i>
                    <span class="section-title">${section.title}</span>
                </div>
                <div class="card-body">
                    ${section.text.div}
                </div>
            </div>
        `).join('');
    }

    function getIcon(code) {
        switch (code) {
            case '10160-0': return 'pills';
            case '48765-2': return 'allergies';
            case '11450-4': return 'notes-medical';
            case '11348-0': return 'history';
            case '8716-3': return 'vial';
            default: return 'file-medical-alt';
        }
    }

    document.querySelectorAll('.collapsible').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            const content = button.nextElementSibling;
            if (button.classList.contains('active')) {
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        });
    });

    // Toggle search panel visibility
    document.getElementById('toggleSearchPanel').addEventListener('click', () => {
        const searchPanel = document.getElementById('search-panel');
        searchPanel.classList.toggle('hidden');
    });
});
