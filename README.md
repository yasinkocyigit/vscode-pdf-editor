# PDF Editor

A secure, lightweight, and offline PDF tool for Visual Studio Code. Designed primarily to view PDFs directly in a VS Code tab and highlight important sections without leaving your development environment.

---

### Why Choose PDF Editor?
- **Zero Latency:** Extremely fast page loading and smooth scrolling.
- **Privacy First:** Your PDFs never leave your machine.
- **Native Experience:** Integrated perfectly into the VS Code ecosystem.

## Features

* **Built for the Workspace:** Opens PDFs seamlessly in a native VS Code tab, allowing you to read and annotate side-by-side with your code.
* **Fully Offline & Secure:** Operates entirely locally. No external API calls or internet connection required, ensuring maximum privacy for your documents.
* **Smart Floating Toolbar:** Features a draggable and collapsible toolbar that adapts to your screen.
* **Annotation Tools:** Core tools to highlight, underline, strikethrough, and erase text annotations.
* **Color Palette:** Multiple color options (Yellow, Green, Pink, Red, Blue) for organizing your highlights and notes.
* **In-Place Saving:** Directly overwrite and save your annotations to the original PDF file with a single click.
* **High Performance:** Optimized memory management and batch rendering for smooth scrolling even on large documents.

## Usage

1. Open the Command Palette (`Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on macOS).
2. Type and run the command: **`PDF Editor: Start`** (or `vscode-pdf-editor.startEditor`).
3. Select a PDF file from your local file system.
4. Use the toolbar to highlight and annotate the document.
5. Click the save icon to apply your changes to the file.

## Project Structure

```text
vscode-pdf-editor/
├── src/                # Source code
│   ├── extension.js    # Extension entry point
│   └── libs/           # PDF.js and pdf-lib libraries
├── test/               # Extension tests
├── .vscode/            # VS Code configuration
├── package.json        # Extension manifest
├── README.md           # Documentation
└── LICENSE             # MIT License
```

## Contributing

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Press `F5` in VS Code to start debugging the extension.
4. Make your changes and submit a pull request!

## Release Notes

### 1.0.0
* Initial release.
* Added core PDF viewing within a VS Code tab.
* Added highlighting, underlining, strikethrough, and erasing capabilities.
* Implemented secure local file saving and offline support.

## Behind the Project

This project represents a significant milestone for me as it was my first attempt at developing VS Code extensions and working with PDF processing libraries. It was an intensive learning journey focused on integrating complex webviews into a native environment and managing local file systems securely.

I am committed to continuing the development of this tool. If you find it useful, please feel free to leave a comment or show your support. Your feedback is highly appreciated!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.