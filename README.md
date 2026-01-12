# CT-InputFormatter

A SillyTavern/CozyTavern extension that provides quick text formatting templates for your chat input. Transform your messages with customizable formatters to add roleplay actions, quotes, or any other text patterns with a single click.

## Features

- **Quick Formatting**: Apply text templates to your input with one click
- **Customizable Templates**: Create, edit, and organize your own formatters
- **Placeholder Support**: Use `{{msg}}` for your input text and `{{csr}}` for cursor positioning
- **Macro Support**: Templates support SillyTavern's macro substitution
- **Keyboard Accessible**: Close the picker with Escape key
- **Mobile Friendly**: Responsive design that works on mobile devices

## Default Formatters

The extension comes with three pre-configured formatters:

| Name  | Template             | Description                                 |
| ----- | -------------------- | ------------------------------------------- |
| Do    | `> {{msg}}`          | Wraps text as a roleplay action             |
| Say   | `> "{{csr}}{{msg}}"` | Wraps text as dialogue with cursor at start |
| Quote | `{{msg}} "{{csr}}"`  | Appends a quote with cursor inside          |

## Installation

### Using SillyTavern's Extension Installer

1. Open SillyTavern
2. Go to **Extensions** panel
3. Click **Install Extension**
4. Enter the repository URL: `https://github.com/leyam3k/CT-InputFormatter`
5. Click **Install**

### Manual Installation

1. Navigate to your SillyTavern installation folder
2. Go to `public/scripts/extensions/third-party/`
3. Clone or download this repository into that folder
4. Restart SillyTavern

## Usage

### Applying a Formatter

1. Type your message in the chat input
2. Click the pen icon (✎) in the left side of the input area
3. Select a formatter from the popup menu
4. Your text will be formatted according to the template

### Creating Custom Formatters

1. Open the **Extensions** panel in SillyTavern
2. Find and expand **Input Formatter** settings
3. Click **Add Formatter**
4. Configure your formatter:
   - **Name**: Display name shown in the picker
   - **Icon**: FontAwesome icon class (e.g., `fa-star`, `fa-heart`)
   - **Template**: The formatting template

### Template Placeholders

| Placeholder | Description                               |
| ----------- | ----------------------------------------- |
| `{{msg}}`   | Replaced with your current input text     |
| `{{csr}}`   | Sets the cursor position after formatting |

You can also use any SillyTavern macros in your templates (e.g., `{{char}}`, `{{user}}`).

### Example Templates

```
# Thinking action
*{{msg}}*

# Whispering
*whispers* "{{csr}}{{msg}}"

# Character-specific action
{{char}} notices {{user}} {{msg}}

# OOC message
((OOC: {{msg}}))
```

## Prerequisites

- SillyTavern 1.11.0 or higher

## Support and Contributions

### Getting Help

If you encounter issues or have questions:

- Open an issue on the [GitHub repository](https://github.com/leyam3k/CT-InputFormatter/issues)
- Join the SillyTavern Discord community

### Contributing

Contributions are welcome! Feel free to:

- Report bugs or suggest features via GitHub issues
- Submit pull requests with improvements
- Share your custom formatter templates with the community

## License

This project is licensed under the AGPL-3.0 License.
