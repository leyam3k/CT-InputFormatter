/**
 * CT-InputFormatter - A SillyTavern extension for formatting chat input text
 * @description Provides customizable text formatting templates that can be applied to the chat input
 */

// Module constants
const MODULE_NAME = "CT-InputFormatter";
const EXTENSION_FOLDER_PATH = `scripts/extensions/third-party/${MODULE_NAME}`;

// Default settings configuration
const DEFAULT_SETTINGS = Object.freeze({
  formatters: [
    { name: "Do", icon: "fa-person-running", template: "> {{msg}}" },
    { name: "Say", icon: "fa-comment", template: '> "{{csr}}{{msg}}"' },
    { name: "Quote", icon: "fa-quote-left", template: '{{msg}} "{{csr}}"' },
  ],
});

// Default formatter state (used when no formatter is selected)
const DEFAULT_FORMATTER = Object.freeze({
  name: "default",
  icon: "fa-pen-nib",
  template: "{{msg}}",
});

/**
 * @typedef {Object} Formatter
 * @property {string} name - Display name of the formatter
 * @property {string} icon - FontAwesome icon class (without 'fa-solid' prefix)
 * @property {string} template - Template string with {{msg}} and optional {{csr}} placeholders
 * @property {HTMLElement} [element] - Reference to the picker item element
 */

/**
 * @typedef {Object} ExtensionState
 * @property {HTMLTextAreaElement} textarea - The chat input textarea
 * @property {HTMLElement} picker - The formatter picker popup element
 * @property {HTMLElement} triggerButton - The button that opens the picker
 * @property {Formatter[]} formatters - Array of available formatters
 * @property {Object} popper - Popper.js instance for positioning
 */

/** @type {ExtensionState} */
const state = {
  textarea: null,
  picker: null,
  triggerButton: null,
  formatters: [],
  popper: null,
};

/**
 * Gets the extension settings from the SillyTavern context
 * @returns {Object} The extension settings object
 */
function getSettings() {
  const { extensionSettings } = SillyTavern.getContext();

  if (!extensionSettings[MODULE_NAME]) {
    extensionSettings[MODULE_NAME] = structuredClone(DEFAULT_SETTINGS);
  }

  // Ensure all default keys exist
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
      extensionSettings[MODULE_NAME][key] = structuredClone(
        DEFAULT_SETTINGS[key],
      );
    }
  }

  return extensionSettings[MODULE_NAME];
}

/**
 * Saves the current settings to the server
 */
function saveSettings() {
  const { saveSettingsDebounced } = SillyTavern.getContext();
  saveSettingsDebounced();
}

/**
 * Creates a formatter picker item element
 * @param {Formatter} formatter - The formatter configuration
 * @returns {HTMLElement} The created picker item element
 */
function createFormatterPickerItem(formatter) {
  const { name, icon, template } = formatter;

  const item = document.createElement("div");
  item.classList.add("ctif-picker-item");
  item.title = name;

  // Prevent text selection on mousedown
  item.addEventListener("mousedown", (e) => e.preventDefault());

  // Icon container
  const iconContainer = document.createElement("div");
  iconContainer.classList.add("ctif-picker-icon");
  const iconElement = document.createElement("i");
  iconElement.classList.add("fa-lg", "fa-solid", icon || "fa-icons");
  iconContainer.appendChild(iconElement);
  item.appendChild(iconContainer);

  // Label container
  const labelContainer = document.createElement("div");
  labelContainer.classList.add("ctif-picker-label");
  const titleElement = document.createElement("div");
  titleElement.classList.add("ctif-picker-title");
  titleElement.textContent = name;
  labelContainer.appendChild(titleElement);
  item.appendChild(labelContainer);

  // Click handler to apply the formatter
  item.addEventListener("click", (e) => {
    e.preventDefault();
    applyFormatter(template);
  });

  return item;
}

/**
 * Applies a formatter template to the current textarea content
 * @param {string} template - The template string to apply
 */
function applyFormatter(template) {
  const { substituteParams } = SillyTavern.getContext();

  // Preserve quick reply bar visibility state before modifying textarea
  const replyButtons = document.getElementById("form_group_reply_buttons");
  const wasReplyBarVisible =
    replyButtons && replyButtons.style.display !== "none";

  const currentText = state.textarea.value;

  // Apply macro substitution and replace {{msg}} placeholder
  let formattedText = substituteParams(template).replace(
    /\{\{msg\}\}/gi,
    currentText,
  );

  // Trim leading whitespace if the input was empty
  if (currentText.trim() === "") {
    formattedText = formattedText.trimStart();
  }

  // Find and handle cursor position placeholder
  const cursorPosition = formattedText.indexOf("{{csr}}");
  if (cursorPosition !== -1) {
    formattedText = formattedText.replace("{{csr}}", "");
  }

  // Update textarea value and trigger input event
  state.textarea.value = formattedText;
  $(state.textarea).trigger("input");

  // Restore quick reply bar visibility if it was visible before
  if (wasReplyBarVisible && replyButtons) {
    replyButtons.style.display = "";
  }

  // Set cursor position if placeholder was found
  if (cursorPosition !== -1) {
    state.textarea.selectionStart = cursorPosition;
    state.textarea.selectionEnd = cursorPosition;
  }

  // Close the picker and update its position
  closePicker();

  // Focus textarea on non-mobile devices
  if (!isMobileDevice()) {
    state.textarea.focus();
  }
}

/**
 * Checks if the current device is mobile
 * @returns {boolean} True if mobile device
 */
function isMobileDevice() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

/**
 * Opens the formatter picker popup
 */
function openPicker() {
  state.picker.classList.add("ctif-picker-active");
  state.popper?.update();
}

/**
 * Closes the formatter picker popup
 */
function closePicker() {
  state.picker.classList.remove("ctif-picker-active");
  state.popper?.update();
}

/**
 * Toggles the formatter picker popup visibility
 */
function togglePicker() {
  state.picker.classList.toggle("ctif-picker-active");
  state.popper?.update();
}

/**
 * Rebuilds the picker with current formatters from settings
 */
function rebuildPicker() {
  // Clear existing items
  state.picker.innerHTML = "";
  state.formatters = [];

  const settings = getSettings();
  const configuredFormatters = settings.formatters || [];

  // Create picker items for each formatter
  configuredFormatters.forEach((formatterConfig) => {
    const element = createFormatterPickerItem(formatterConfig);
    state.picker.appendChild(element);
    state.formatters.push({ ...formatterConfig, element });
  });
}

/**
 * Initializes the formatter picker UI
 */
function initializePicker() {
  // Get the chat textarea
  const textarea = document.getElementById("send_textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) {
    console.error(`[${MODULE_NAME}] Could not find send_textarea element`);
    return;
  }
  state.textarea = textarea;

  // Create the picker container
  state.picker = document.createElement("div");
  state.picker.id = "ctif-picker";
  state.picker.classList.add("ctif-picker");

  // Create the trigger button - append to leftSendForm for less aggressive positioning
  const buttonContainer = document.getElementById("leftSendForm");
  if (!buttonContainer) {
    console.error(`[${MODULE_NAME}] Could not find leftSendForm element`);
    return;
  }

  state.triggerButton = document.createElement("div");
  state.triggerButton.id = "ctif-trigger-button";
  state.triggerButton.classList.add("interactable");
  state.triggerButton.tabIndex = 0;
  state.triggerButton.title = "Input Formatter";
  state.triggerButton.innerHTML = '<i class="fa-solid fa-pen-nib"></i>';

  // Prevent focus loss when clicking the trigger button
  state.triggerButton.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });

  // Toggle picker on button click
  state.triggerButton.addEventListener("click", () => {
    togglePicker();
  });

  buttonContainer.appendChild(state.triggerButton);
  document.body.appendChild(state.picker);

  // Initialize Popper.js for positioning
  state.popper = Popper.createPopper(state.triggerButton, state.picker, {
    placement: "top-start",
    modifiers: [{ name: "offset", options: { offset: [0, 5] } }],
  });

  // Close picker when clicking outside
  document.body.addEventListener("click", (event) => {
    const target = event.target;
    if (
      !state.picker.contains(target) &&
      !state.triggerButton.contains(target)
    ) {
      closePicker();
    }
  });

  // Close picker on Escape key
  document.body.addEventListener("keyup", (event) => {
    if (event.key === "Escape") {
      closePicker();
    }
  });

  // Build the picker with current formatters
  rebuildPicker();
}

// ============================================================================
// Settings UI Functions
// ============================================================================

/**
 * Renders the settings panel with current formatters
 */
function renderSettingsPanel() {
  const container = $("#ctif-formatters-list");
  container.html("");

  const settings = getSettings();
  const formatters = settings.formatters;

  if (!formatters || formatters.length === 0) {
    container.html(
      '<p class="ctif-empty-message">No formatters configured. Click "Add Formatter" to create one.</p>',
    );
    return;
  }

  formatters.forEach((formatter, index) => {
    const formatterHtml = `
            <div class="ctif-settings-item" data-index="${index}">
                <div class="ctif-settings-item-header">
                    <b>${escapeHtml(formatter.name) || "New Formatter"}</b>
                    <div class="ctif-settings-controls">
                        <i class="fa-solid fa-arrow-up ctif-move-up" title="Move Up"></i>
                        <i class="fa-solid fa-arrow-down ctif-move-down" title="Move Down"></i>
                        <i class="fa-solid fa-trash-can ctif-delete" title="Delete"></i>
                        <i class="fa-solid fa-chevron-down ctif-toggle-icon"></i>
                    </div>
                </div>
                <div class="ctif-settings-item-content ctif-collapsed">
                    <div class="ctif-field">
                        <label>Name:</label>
                        <input data-property="name" class="text_pole" value="${escapeHtml(
                          formatter.name,
                        )}">
                    </div>
                    <div class="ctif-field">
                        <label>Icon (FontAwesome class):</label>
                        <input data-property="icon" class="text_pole" value="${escapeHtml(
                          formatter.icon,
                        )}" placeholder="fa-icon-name">
                    </div>
                    <div class="ctif-field">
                        <label>Template:</label>
                        <textarea data-property="template" class="text_pole" rows="3">${escapeHtml(
                          formatter.template,
                        )}</textarea>
                        <small class="ctif-help-text">Use <code>{{msg}}</code> for input text, <code>{{csr}}</code> for cursor position</small>
                    </div>
                </div>
            </div>
        `;
    container.append(formatterHtml);
  });
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} The escaped text
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Adds a new formatter to the settings
 */
function addFormatter() {
  const settings = getSettings();
  settings.formatters.push({
    name: `Formatter #${settings.formatters.length + 1}`,
    icon: "fa-question-circle",
    template: "{{msg}}{{csr}}",
  });

  saveSettings();
  renderSettingsPanel();
  rebuildPicker();
}

/**
 * Removes a formatter from the settings
 * @param {number} index - The index of the formatter to remove
 */
function removeFormatter(index) {
  const settings = getSettings();
  settings.formatters.splice(index, 1);

  saveSettings();
  renderSettingsPanel();
  rebuildPicker();
}

/**
 * Moves a formatter in the settings list
 * @param {number} index - The current index of the formatter
 * @param {number} direction - The direction to move (-1 for up, 1 for down)
 */
function moveFormatter(index, direction) {
  const settings = getSettings();
  const formatters = settings.formatters;
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= formatters.length) {
    return;
  }

  const [item] = formatters.splice(index, 1);
  formatters.splice(targetIndex, 0, item);

  saveSettings();
  renderSettingsPanel();
  rebuildPicker();
}

/**
 * Migrates old settings format to new format
 */
function migrateSettings() {
  const { extensionSettings } = SillyTavern.getContext();
  const settings = extensionSettings[MODULE_NAME];

  if (!settings) return;

  // Check for old "actions" key and migrate to "formatters"
  if (settings.actions && !settings.formatters) {
    console.log(
      `[${MODULE_NAME}] Migrating settings from 'actions' to 'formatters'`,
    );
    settings.formatters = settings.actions.map((action) => ({
      name: action.name,
      icon: action.icon,
      // Keep {{csr}} placeholder as-is
      template: action.template || "{{msg}}",
    }));
    delete settings.actions;
    delete settings.selected_action;
    saveSettings();
  }

  // Migrate legacy numbered action format (action0_name, action1_name, etc.)
  if (settings.action0_name && !settings.formatters) {
    console.log(`[${MODULE_NAME}] Migrating legacy numbered settings format`);
    const newFormatters = [];

    for (let i = 0; i < 10; i++) {
      if (settings[`action${i}_enabled`]) {
        newFormatters.push({
          name: settings[`action${i}_name`],
          icon: settings[`action${i}_icon`],
          // Keep {{csr}} placeholder as-is
          template: settings[`action${i}_template`] || "{{msg}}",
        });
      }

      // Clean up old keys
      delete settings[`action${i}_enabled`];
      delete settings[`action${i}_useprompt`];
      delete settings[`action${i}_name`];
      delete settings[`action${i}_icon`];
      delete settings[`action${i}_template`];
    }

    settings.formatters = newFormatters;
    delete settings.action_prompt;
    delete settings.allow_impersonation;
    saveSettings();
  }
}

/**
 * Initializes the settings UI panel
 */
async function initializeSettingsUI() {
  const settingsHtml = await $.get(`${EXTENSION_FOLDER_PATH}/settings.html`);
  $("#extensions_settings2").append(settingsHtml);

  // Render settings panel immediately so content is ready when drawer is opened
  renderSettingsPanel();

  // Add new formatter button
  $("#ctif-add-formatter-button").on("click", addFormatter);

  // Delegate event handlers for the formatter list
  const container = $("#ctif-formatters-list");

  // Toggle item expansion
  container.on("click", ".ctif-settings-item-header", function (e) {
    e.stopPropagation();
    const header = $(this);
    header.toggleClass("ctif-expanded");
    header
      .siblings(".ctif-settings-item-content")
      .toggleClass("ctif-collapsed");
  });

  // Delete formatter
  container.on("click", ".ctif-delete", function (e) {
    e.stopPropagation();
    const index = $(this).closest(".ctif-settings-item").data("index");
    removeFormatter(index);
  });

  // Move formatter up
  container.on("click", ".ctif-move-up", function (e) {
    e.stopPropagation();
    const index = $(this).closest(".ctif-settings-item").data("index");
    moveFormatter(index, -1);
  });

  // Move formatter down
  container.on("click", ".ctif-move-down", function (e) {
    e.stopPropagation();
    const index = $(this).closest(".ctif-settings-item").data("index");
    moveFormatter(index, 1);
  });

  // Handle input changes
  container.on("input", "input, textarea", function () {
    const item = $(this).closest(".ctif-settings-item");
    const index = item.data("index");
    const property = $(this).data("property");
    const value = $(this).val();

    const settings = getSettings();
    settings.formatters[index][property] = value;

    // Update header title if name changed
    if (property === "name") {
      item.find(".ctif-settings-item-header b").text(value || "New Formatter");
    }

    saveSettings();
    rebuildPicker();
  });
}

// ============================================================================
// Extension Initialization
// ============================================================================

/**
 * Main initialization function
 */
jQuery(async () => {
  console.log(`[${MODULE_NAME}] Initializing extension`);

  // Migrate any old settings format
  migrateSettings();

  // Initialize the settings UI
  await initializeSettingsUI();

  // Initialize the picker UI
  initializePicker();

  // Listen for chat changes to rebuild picker (in case of character-specific formatters in the future)
  const { eventSource, event_types } = SillyTavern.getContext();
  eventSource.on(event_types.CHAT_CHANGED, rebuildPicker);

  console.log(`[${MODULE_NAME}] Extension initialized successfully`);
});
