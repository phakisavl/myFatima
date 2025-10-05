// 🚨 REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT WEB APP URL 🚨
const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz2qff-CsSOJOax66WCspC5P7arcIUPi580x2_9oY2iUYp2QjzKCybS6OT86jpUum0Q/exec';

let memberCount = 0;
let childCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Add the initial member section when the page loads
    addMember(); 
    document.getElementById('census-form').addEventListener('submit', handleFormSubmit);
});

// Toggles visibility of conditional fields (e.g., date of baptism)
function toggleFields(selectElement, className) {
    const parent = selectElement.closest('.section-box');
    const fields = parent.querySelector(`.${className}-fields`);
    if (selectElement.value === 'Yes') {
        fields.style.display = 'block';
    } else {
        fields.style.display = 'none';
    }
}

// Calculates age based on Date of Birth for children
function calculateAge(dobInput) {
    const dob = new Date(dobInput.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    const parent = dobInput.closest('.child-section');
    parent.querySelector('[data-name="Age"]').value = age >= 0 ? age : '';
}

// Clones the member template and appends it to the container
function addMember() {
    memberCount++;
    const template = document.getElementById('member-template');
    const newSection = template.content.cloneNode(true).querySelector('.member-section');
    newSection.querySelector('.member-number').textContent = memberCount;

    // Reset fields visibility
    newSection.querySelectorAll('select').forEach(select => {
        const className = select.getAttribute('onchange').match(/toggleFields\(this, '(.*?)'\)/);
        if (className) toggleFields(select, className[1]);
    });

    document.getElementById('members-container').appendChild(newSection);
}

// Clones the child template and appends it to the container
function addChild() {
    childCount++;
    const template = document.getElementById('child-template');
    const newSection = template.content.cloneNode(true).querySelector('.child-section');
    newSection.querySelector('.child-number').textContent = childCount;

    // Reset fields visibility
    newSection.querySelectorAll('select').forEach(select => {
        const className = select.getAttribute('onchange').match(/toggleFields\(this, '(.*?)'\)/);
        if (className) toggleFields(select, className[1]);
    });
    
    document.getElementById('children-container').appendChild(newSection);
}

// Removes a dynamic section and re-numbers the remaining (optional)
function removeSection(button) {
    if (!confirm('Are you sure you want to remove this entry?')) return;
    const section = button.closest('.section-box');
    section.remove();
    // Simple removal, won't re-number dynamically to keep JS simple.
}

// --- DATA COLLECTION AND SUBMISSION ---

// Collects data from all instances of a dynamic section (members/children)
function getSectionData(selector) {
    const dataArray = [];
    document.querySelectorAll(selector).forEach(section => {
        const sectionData = {};
        // Find all input/select elements with a 'data-name' attribute
        section.querySelectorAll('[data-name]').forEach(input => {
            const key = input.getAttribute('data-name');
            // Ensure empty date/text fields are submitted as empty string, not null/undefined
            sectionData[key] = input.value || ''; 
        });
        dataArray.push(sectionData);
    });
    return dataArray;
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const submitButton = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    statusMessage.style.display = 'none';

    // 1. Collect Household Data
    const householdData = {
        Block_Name: document.getElementById('block-name').value,
        Residential_Address: document.getElementById('address').value,
        Contact_No: document.getElementById('contact-no').value,
    };

    // 2. Collect Members and Children Data
    const membersArray = getSectionData('.member-section');
    const childrenArray = getSectionData('.child-section');
    
    if (membersArray.length === 0) {
        alert('Please add at least one adult member.');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Census Data';
        return;
    }

    // 3. Create Final Payload (matching Apps Script expected structure)
    const finalPayload = {
        household: householdData,
        members: membersArray, 
        children: childrenArray
    };

    // 4. Send to Google Apps Script Web App
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            mode: 'no-cors', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(finalPayload),
        });

        // Since we use 'no-cors', we cannot read the response body directly, 
        // so we must assume success if the fetch operation completes without network error.
        
        statusMessage.className = 'alert alert-success';
        statusMessage.innerHTML = '✅ Data submitted successfully! Thank you.';
        document.getElementById('census-form').reset();
        
        // Reset dynamic sections
        document.getElementById('members-container').innerHTML = '';
        document.getElementById('children-container').innerHTML = '';
        memberCount = 0;
        childCount = 0;
        addMember(); // Add back the initial member
        
    } catch (error) {
        console.error('Submission Error:', error);
        statusMessage.className = 'alert alert-error';
        statusMessage.innerHTML = `❌ Network Error: Could not submit data. Check your API URL and internet connection.`;
    } finally {
        statusMessage.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Census Data';
    }
}