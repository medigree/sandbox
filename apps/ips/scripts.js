document.addEventListener("DOMContentLoaded", () => {
    fetch('Bundle-IPS-examples-Bundle-01.json')
        .then(response => response.json())
        .then(data => {
            populateHeader(data);
            populateContent(data);
        })
        .catch(error => console.error('Error loading data:', error));

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
        const patient = bundle.entry.find(entry => entry.fullUrl.endsWith(composition.subject.reference.split('/')[1])).resource;

        patientDetails.innerHTML = `
            <p><strong>${patient.name[0].given.join(" ")} ${patient.name[0].family}</strong></p>
            <p><strong>Identifier:</strong> ${patient.identifier[0].value}</p>
            <p><strong>Birth Date:</strong> ${patient.birthDate}</p>
            <p><strong>Gender:</strong> ${patient.gender}</p>
        `;
        patientAddress.innerHTML = `<p><strong>Address:</strong> ${patient.address[0].line.join(", ")}, ${patient.address[0].city}, ${patient.address[0].postalCode}, ${patient.address[0].country}</p>`;

        const author = composition.author ? getResourceByReference(bundle, composition.author[0].reference) : null;
        const attester = composition.attester ? getResourceByReference(bundle, composition.attester[0].party.reference) : null;
        const custodian = composition.custodian ? getResourceByReference(bundle, composition.custodian.reference) : null;

        authorCard.innerHTML = author ? `Author: ${author.name[0].text}` : "Author: No data available";
        attesterCard.innerHTML = attester ? `Attester: ${attester.name[0].text}` : "Attester: No data available";
        custodianCard.innerHTML = custodian ? `Custodian: ${custodian.name}` : "Custodian: No data available";

        authorContent.innerHTML = author ? generateDetailsHTML(author) : "";
        attesterContent.innerHTML = attester ? generateDetailsHTML(attester) : "";
        custodianContent.innerHTML = custodian ? generateDetailsHTML(custodian) : "";
    }

    function getResourceByReference(bundle, reference) {
        const id = reference.split('/')[1];
        return bundle.entry.find(entry => entry.resource.id === id).resource;
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
            <div id="${section.code.coding[0].code}" class="card mb-3 ${section.text.status === 'empty' ? 'greyed-out' : ''} section tab-${getIconClass(section.code.coding[0].code)}">
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
            case '8716-3': return 'vials';
            default: return 'file-medical-alt';
        }
    }

    function getIconClass(code) {
        switch (code) {
            case '10160-0': return 'meds';
            case '48765-2': return 'allergies';
            case '11450-4': return 'problems';
            case '11348-0': return 'history';
            case '8716-3': return 'vials';
            default: return 'default';
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
});
