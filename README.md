# PDF Editor for VS Code

A lightweight, secure, and fully offline PDF viewer and editor built specifically for Visual Studio Code. Read, highlight, and annotate your documents without ever leaving your coding environment.

---

## Key Features

- **Fast & Lightweight:** Opens PDFs instantly with smooth scrolling.
- **Privacy Focused:** Operates 100% offline. Your files never leave your machine.
- **Annotation Tools:**
  - **Highlight:** Mark important text.
  - **Underline & Strikethrough:** Standard editing tools.
  - **Free Draw:** Draw directly on the document using the Pen tool.
  - **Eraser:** Easily remove your annotations.
- **In-Place Saving:** Save your changes directly back to the original file.
- **Integrated Experience:** Feels like a native part of VS Code.

---

## How to Use

1. Open the **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Run the command: **`PDF Editor: Start`**.
3. Select the PDF file you want to edit.
4. Use the **Floating Toolbar** to annotate your document.
5. Click the **Save Icon** to apply your changes.

---

## Project Structure

```text
vscode-pdf-editor/
├── src/
│   ├── extension.js    # Entry point & VS Code API logic
│   └── libs/           # External libraries (pdf.js, pdf-lib)
├── test/               # Automated tests
├── images/             # Extension icons
├── package.json        # Extension manifest and commands
└── README.md           # This file
```

---

## Development

To run and modify the extension locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yasinkocyigit/vscode-pdf-editor.git
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the extension:**
   Press `F5` in VS Code to launch an "Extension Development Host" window.

4. **Experiment:**
   Modify files inside `src/` and reload to see changes.

---

## Contributing & Feedback

This project is open to feedback, improvements, and contributions.

You can:
- Report issues
- Suggest new features
- Submit pull requests

All contributions are welcome.

---

## Contact

This extension is developed by a 3rd-year Computer Engineering student.

If you are interested in Artificial Intelligence, Machine Learning, or developer tools, feel free to explore my GitHub profile and connect with me:

**GitHub:** [github.com/yasinkocyigit](https://github.com/yasinkocyigit)

---

## License

This project is distributed under the MIT License. See `LICENSE` for more information.
