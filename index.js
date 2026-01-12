// Import required functions
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import {
    substituteParams,
    saveSettingsDebounced,
    eventSource,
    event_types,
} from "../../../../script.js";

// Keep track of where your extension is located; name should match repo name
const extensionName = "sillytavern-actions";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Default settings
const defaultSettings = {
    actions: [
        { name: "Do", icon: "fa-person-running", template: "> {{msg}}" },
        { name: "Say", icon: "fa-comment", template: '> "{{csr}}{{msg}}"' },
        { name: "Quote", icon: "fa-quote-left", template: '{{msg}} "{{csr}}"' },
    ],
    selected_action: "default",
};

// Define a dedicated default state (separate from the list)
const defaultAction = {
    link: undefined,
    name: "default",
    icon: "fa-pen-nib",
    template: "{{msg}}",
};

const context = getContext();
let actions = []; // This holds the actions for the UI picker, not the settings.

const textarea = document.getElementById('send_textarea');
if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error('Element with id "send_textarea" is not a textarea.');
}

// ==============================
// Create the actions picker with styling
// ==============================
const picker = document.createElement('div');
picker.id = 'actions-picker';
picker.classList.add('act--picker');
picker.classList.remove('act--active'); // Initial state

// ------------------------------
// Add an action item to the picker
// ------------------------------
function addActionToPicker(actionData) {
    const { name, icon, template } = actionData;

    const item = document.createElement('div');
    item.classList.add('act--item');
    item.title = name;

    item.addEventListener('mousedown', (e) => e.preventDefault());

    const iconDiv = document.createElement('div');
    iconDiv.classList.add('act--icon');
    const iconEl = document.createElement('i');
    iconEl.classList.add('fa-lg', 'fa-solid', icon || 'fa-icons');
    iconDiv.appendChild(iconEl);
    item.appendChild(iconDiv);

    const labelDiv = document.createElement('div');
    labelDiv.classList.add('act--label');
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('act--title');
    titleDiv.textContent = name;
    labelDiv.appendChild(titleDiv);
    item.appendChild(labelDiv);

    // Click event: This is where the new logic is implemented.
    item.addEventListener('click', (e) => {
        e.preventDefault();

        // *** FIX FOR QUICK REPLY BAR ***
        // 1. Check if the quick reply bar is visible BEFORE we do anything.
        const replyButtons = document.getElementById('form_group_reply_buttons');
        const wasVisible = replyButtons && replyButtons.style.display !== 'none';
        // *** END OF STEP 1 ***

        const currentText = textarea.value;
        let formattedText = substituteParams(template).replace(/{{msg}}/gi, currentText);

        if (currentText.trim() === '') {
            formattedText = formattedText.trimStart();
        }

        const cursorPos = formattedText.indexOf('{{csr}}');

        if (cursorPos !== -1) {
            formattedText = formattedText.replace('{{csr}}', '');
        }

        textarea.value = formattedText;
        $(textarea).trigger('input'); // This is the event that hides the bar.

        // *** FIX FOR QUICK REPLY BAR ***
        // 2. If the bar was visible before, show it again to restore its state.
        if (wasVisible) {
            replyButtons.style.display = ''; // Set back to default display
        }
        // *** END OF STEP 2 ***

        if (cursorPos !== -1) {
            textarea.selectionStart = cursorPos;
            textarea.selectionEnd = cursorPos;
        }

        extension_settings[extensionName].selected_action = "default";
        updateSelectedActionDisplay();
        picker.classList.remove('act--active');
        popper.update();

        if (!/Mobi|Android/i.test(navigator.userAgent)) {
            textarea.focus();
        }
    });

    picker.appendChild(item);
    actions.push({ ...actionData, link: item });
    return item;
}


let currentAction = defaultAction;

// ==============================
// Update the selected action display icon
// ==============================
function updateSelectedActionDisplay() {
    selectActionButton.className = `fa-solid ${defaultAction.icon}`;
}

// ==============================
// Create and attach the action selection button
// ==============================
const buttonContainer = document.getElementById('rightSendForm');
const selectActionButton = document.createElement('div');
selectActionButton.id = 'selectActionButton';
selectActionButton.title = 'Actions';
selectActionButton.classList.add('fa-solid');

selectActionButton.addEventListener('mousedown', (e) => e.preventDefault());

const popper = Popper.createPopper(selectActionButton, picker, {
    placement: 'top-start',
    modifiers: [],
});

buttonContainer.appendChild(selectActionButton);

// ------------------------------
// Toggle the actions picker on button click
// ------------------------------
selectActionButton.addEventListener('click', (e) => {
    e.stopPropagation();
    picker.classList.toggle('act--active');
    popper.update();
    if (!/Mobi|Android/i.test(navigator.userAgent)) {
        setTimeout(() => textarea.focus(), 50);
    }
});

document.body.appendChild(picker);
document.body.addEventListener('click', (event) => {
    if (!picker.contains(event.target) && !selectActionButton.contains(event.target)) {
        picker.classList.remove('act--active');
        popper.update();
    }
});
document.body.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') {
        picker.classList.remove('act--active');
        popper.update();
    }
});


// ==============================
// SETTINGS UI
// ==============================

function renderSettings() {
    const container = $('#actions-list-container');
    container.html(''); 

    const actions = extension_settings[extensionName].actions;

    if (!actions || actions.length === 0) {
        container.html('<p>No actions configured. Click "Add New Action" to begin.</p>');
    }

    actions.forEach((action, index) => {
        const actionHtml = `
            <div class="action-settings-item" data-index="${index}">
                <div class="action-item-header">
                    <b>${action.name || 'New Action'}</b>
                    <div class="action-controls">
                        <i class="fa-solid fa-arrow-up reorder-action-up" title="Move Up"></i>
                        <i class="fa-solid fa-arrow-down reorder-action-down" title="Move Down"></i>
                        <i class="fa-solid fa-trash-can delete-action" title="Delete Action"></i>
                        <i class="fa-solid fa-chevron-down action-toggle-icon"></i>
                    </div>
                </div>
                <div class="action-item-content closed">
                    <div class="action-setting-field">
                        <label>Name:</label>
                        <input data-property="name" class="text_pole" value="${action.name}">
                    </div>
                    <div class="action-setting-field">
                        <label>Icon:</label>
                        <input data-property="icon" class="text_pole" value="${action.icon}" placeholder="fa-solid fa-icon-name">
                    </div>
                    <div class="action-setting-field">
                        <label>Template (use {{csr}} for cursor):</label>
                        <textarea data-property="template" class="text_pole" rows="3">${action.template}</textarea>
                    </div>
                </div>
            </div>
        `;
        container.append(actionHtml);
    });
}

function addActionToSettings() {
    extension_settings[extensionName].actions.push({
        name: `Action #${extension_settings[extensionName].actions.length + 1}`,
        icon: 'fa-question-circle',
        template: '{{msg}}{{csr}}',
    });
    saveSettingsDebounced();
    renderSettings();
    onPickerChanged();
}

function removeActionFromSettings(index) {
    extension_settings[extensionName].actions.splice(index, 1);
    saveSettingsDebounced();
    renderSettings();
    onPickerChanged();
}

function moveActionInSettings(index, direction) {
    const actions = extension_settings[extensionName].actions;
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= actions.length) {
        return;
    }

    const item = actions.splice(index, 1)[0];
    actions.splice(targetIndex, 0, item);
    saveSettingsDebounced();
    renderSettings();
    onPickerChanged();
}

// ==============================
// Data Migration and Loading
// ==============================
function migrateSettings() {
    const settings = extension_settings[extensionName];
    if (settings.actions || !settings.action0_name) {
        return;
    }

    console.log("[Actions] Migrating old settings to new format.");
    const newActions = [];
    for (let i = 0; i < 10; i++) {
        if (settings[`action${i}_enabled`]) {
            newActions.push({
                name: settings[`action${i}_name`],
                icon: settings[`action${i}_icon`],
                template: settings[`action${i}_template`],
            });
        }
        delete settings[`action${i}_enabled`];
        delete settings[`action${i}_useprompt`];
        delete settings[`action${i}_name`];
        delete settings[`action${i}_icon`];
        delete settings[`action${i}_template`];
    }
    settings.actions = newActions;
    delete settings.action_prompt;
    delete settings.allow_impersonation;
    saveSettingsDebounced();
}

async function loadSettings() {
    await loadExtensionSettings(extensionName, defaultSettings);
    migrateSettings();
    extension_settings[extensionName].selected_action = "default";
    renderSettings();
    onPickerChanged();
}


// ==============================
// Update the action picker whenever settings change
// ==============================
function onPickerChanged() {
    picker.innerHTML = '';
    actions = [];
    
    const configuredActions = extension_settings[extensionName].actions || [];
    configuredActions.forEach(actionData => {
        addActionToPicker(actionData);
    });
    
    updateSelectedActionDisplay();
}

// ==============================
// When the extension is loaded
// ==============================
jQuery(async () => {
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
    $("#extensions_settings2").append(settingsHtml);

    const mainDrawerToggle = $('.actions-extension-settings > .inline-drawer > .inline-drawer-toggle');
    mainDrawerToggle.on('click', () => {
        if (!$('.actions-extension-settings .inline-drawer-content').hasClass('closed')) {
            renderSettings();
        }
    });

    $('#add-new-action-button').on('click', addActionToSettings);

    const container = $('#actions-list-container');
    container.on('click', '.action-item-header', function(e) {
        e.stopPropagation(); 
        const header = $(this);
        header.toggleClass('expanded');
        header.siblings('.action-item-content').toggleClass('closed');
    });

    container.on('click', '.delete-action', function(e) {
        e.stopPropagation();
        const index = $(this).closest('.action-settings-item').data('index');
        removeActionFromSettings(index);
    });

    container.on('click', '.reorder-action-up', function(e) {
        e.stopPropagation();
        const index = $(this).closest('.action-settings-item').data('index');
        moveActionInSettings(index, -1);
    });

    container.on('click', '.reorder-action-down', function(e) {
        e.stopPropagation();
        const index = $(this).closest('.action-settings-item').data('index');
        moveActionInSettings(index, 1);
    });

    container.on('input', 'input, textarea', function() {
        const item = $(this).closest('.action-settings-item');
        const index = item.data('index');
        const property = $(this).data('property');
        const value = $(this).val();

        extension_settings[extensionName].actions[index][property] = value;
        
        if (property === 'name') {
            item.find('.action-item-header b').text(value || 'New Action');
        }

        saveSettingsDebounced();
        onPickerChanged();
    });

    loadSettings();
    eventSource.on(event_types.CHAT_CHANGED, onPickerChanged);
});