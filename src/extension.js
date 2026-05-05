const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    let disposable = vscode.commands.registerCommand('vscode-pdf-editor.startEditor', async function () {

        const fileUris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select PDF to Edit',
            filters: { 'PDF Files': ['pdf'] }
        });

        if (!fileUris || fileUris.length === 0) return;

        const selectedPdfUri = fileUris[0];
        const libsFolder = path.join(context.extensionPath, 'src', 'libs');
        
        const panel = vscode.window.createWebviewPanel(
            'pdfEditor',
            'PDF Pro Editor',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: false, 
                localResourceRoots: [ 
                    vscode.Uri.file(libsFolder),
                    vscode.Uri.file(path.dirname(selectedPdfUri.fsPath)) 
                ]
            }
        );

        const pdfJsUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(libsFolder, 'pdf.min.js')));
        const pdfWorkerUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(libsFolder, 'pdf.worker.min.js')));
        const pdfLibUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(libsFolder, 'pdf-lib.min.js')));
        const pdfWebviewUrl = panel.webview.asWebviewUri(selectedPdfUri).toString();

        const nonce = getNonce();

        panel.webview.html = getWebviewContent(pdfJsUri, pdfLibUri, pdfWorkerUri, nonce);

        panel.webview.onDidReceiveMessage(async message => {
            if (!message || typeof message !== 'object') return;

            if (message.command === 'saveFile') {
                if (!message.data) {
                    vscode.window.showErrorMessage('Failed to receive data!');
                    return;
                }

                let dataBuffer;
                if (Buffer.isBuffer(message.data)) {
                    dataBuffer = message.data;
                } else if (message.data instanceof Uint8Array || typeof message.data === 'object') {
                    dataBuffer = Buffer.from(Object.values(message.data));
                } else {
                    vscode.window.showErrorMessage('Incompatible data format.');
                    return;
                }

                if (dataBuffer.byteLength > 50 * 1024 * 1024) {
                    vscode.window.showErrorMessage('File too large! Maximum 50MB can be saved.');
                    return;
                }

                // Save directly to the original file path
                const filePath = selectedPdfUri.fsPath;

                try {
                    fs.writeFileSync(filePath, dataBuffer);
                    vscode.window.showInformationMessage(`Successfully saved: ${path.basename(filePath)}`);
                } catch (err) {
                    vscode.window.showErrorMessage(`Error saving file: ${err.message}`);
                }
            }
            if (message.command === 'ready') {
                panel.webview.postMessage({ command: 'loadPdf', url: pdfWebviewUrl });
            }
            if (message.command === 'error') {
                vscode.window.showErrorMessage(message.text);
            }
        });
    });

    context.subscriptions.push(disposable);
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function getWebviewContent(pdfJsUri, pdfLibUri, pdfWorkerUri, nonce) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src vscode-webview-resource: blob: data:; script-src 'nonce-${nonce}' vscode-webview-resource:; style-src 'nonce-${nonce}'; img-src data: blob: vscode-webview-resource:;">
        <title>PDF Pro Editor</title>
        
        <script nonce="${nonce}" src="${pdfJsUri}"></script>
        <script nonce="${nonce}" src="${pdfLibUri}"></script>
        
        <style nonce="${nonce}">
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background-color: #1e1e1e; font-family: 'Segoe UI', sans-serif; overflow: auto; user-select: none; }

            .textLayer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; line-height: 1; text-size-adjust: none; transform-origin: 0 0; z-index: 3; color: transparent; user-select: text; }
            .textLayer span { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
            .textLayer br { display: none; }
            
            .textLayer span::selection { color: transparent !important; background: rgba(0, 120, 255, 0.2) !important; }
            .textLayer span::-moz-selection { color: transparent !important; background: rgba(0, 120, 255, 0.2) !important; }

            body.eraser-mode .textLayer {
                cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='white' stroke='black' stroke-width='2'%3E%3Cpath d='M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z'/%3E%3Cpath d='M16 16L10 10'/%3E%3C/svg%3E") 4 20, crosshair !important;
            }

            #master-toolbar {
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;
                background: #252526; border: 1px solid #454545; border-radius: 30px;
                padding: 6px 10px; display: flex; align-items: center; gap: 6px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5); white-space: nowrap;
                transition: padding 0.4s ease, border-radius 0.4s ease;
            }
            #master-toolbar.dragging { box-shadow: 0 12px 40px rgba(0,0,0,0.7); cursor: grabbing !important; transition: none; }
            #master-toolbar.collapsed { padding: 6px; }

            #toolbar-content {
                display: flex; align-items: center; gap: 8px;
                overflow: hidden; max-width: 600px; opacity: 1;
                transition: max-width 0.4s ease, opacity 0.3s ease, margin 0.4s ease;
            }
            #master-toolbar.collapsed #toolbar-content { max-width: 0; opacity: 0; margin: 0; gap: 0; pointer-events: none; }

            #drag-grip {
                cursor: grab; color: #666; display: flex; align-items: center; justify-content: center;
                padding: 6px; border-radius: 50%; transition: 0.2s;
            }
            #drag-grip:hover { color: white; background: #333; }
            #drag-grip svg { width: 16px; height: 16px; }

            #toggle-collapse-btn {
                background: transparent; border: none; color: #888; cursor: pointer;
                padding: 6px; display: flex; align-items: center; justify-content: center;
                border-radius: 50%; transition: 0.2s;
            }
            #toggle-collapse-btn:hover { color: white; background: #333; }
            #toggle-collapse-btn svg { width: 18px; height: 18px; transition: transform 0.4s ease; }
            #master-toolbar.collapsed #toggle-collapse-btn svg { transform: rotate(180deg); }

            .group { display: flex; align-items: center; gap: 4px; border-right: 1px solid #444; padding-right: 8px; }
            .group:last-child { border-right: none; padding-right: 0; }

            .btn { 
                background: transparent; border: none; color: #ccc; cursor: pointer; 
                padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; 
                transition: 0.2s; 
            }
            .btn svg { width: 18px; height: 18px; }
            .btn:hover { background: #3c3c3c; color: white; }
            .btn.active { background: #007acc; color: white; }

            .save-btn { color: #28a745; }
            .save-btn:hover { background: #28a745; color: white; }

            .color-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: 0.2s; }
            .color-dot.active { border-color: white; transform: scale(1.25); box-shadow: 0 0 5px rgba(255,255,255,0.4); }

            .c-yellow { background-color: #ffff00; }
            .c-green { background-color: #00ff00; }
            .c-pink { background-color: #ff00ff; }
            .c-red { background-color: #ff4444; }
            .c-blue { background-color: #00ccff; }

            #pages-container {
                display: flex; flex-direction: column; align-items: center; gap: 20px;
                padding-top: 80px; padding-bottom: 50px; background: #2d2d2d; min-height: 100vh;
            }
            .page-wrapper { position: relative; box-shadow: 0 0 20px rgba(0,0,0,0.5); background: white; }
            .pdf-canvas { display: block; z-index: 1; }
            .draw-layer { position: absolute; top: 0; left: 0; z-index: 2; mix-blend-mode: multiply; pointer-events: none; }
            #loading-msg { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 16px; z-index: 999; }
        </style>
    </head>
    <body>

    <div id="master-toolbar">
        <div id="drag-grip" title="Drag Toolbar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
        </div>

        <div id="toolbar-content">
            <div class="group">
                <button class="btn active" data-tool="highlight" title="Highlight">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.5 3.5a2.828 2.828 0 0 0-4 0L4 16v4h4L20.5 7.5a2.828 2.828 0 0 0 0-4z"></path><path d="M12 19h9"></path></svg>
                </button>
                <button class="btn" data-tool="underline" title="Underline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>
                </button>
                <button class="btn" data-tool="strike" title="Strikethrough">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.1 1-5.1 3.6 0 3.3 4.5 4.1 8 5 3.4.8 4.6 2.2 4.6 4.3 0 2.6-2.5 4.3-5.7 4.1-3-.2-5-1.4-6.4-2.5"></path><line x1="3" y1="12" x2="21" y2="12"></line></svg>
                </button>
                <button class="btn" data-tool="eraser" title="Eraser (Select text to erase)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"></path><path d="M16 16L10 10"></path></svg>
                </button>
            </div>

            <div class="group">
                <div class="color-dot c-yellow active" data-color="#ffff00" title="Yellow"></div>
                <div class="color-dot c-green" data-color="#00ff00" title="Green"></div>
                <div class="color-dot c-pink" data-color="#ff00ff" title="Pink"></div>
                <div class="color-dot c-red" data-color="#ff4444" title="Red"></div>
                <div class="color-dot c-blue" data-color="#00ccff" title="Blue"></div>
            </div>

            <div class="group">
                <button class="btn save-btn" id="save-btn" title="Save PDF">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                </button>
            </div>
        </div>

        <button id="toggle-collapse-btn" title="Toggle Toolbar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

    </div>

    <div id="loading-msg">Loading PDF Pages... ⏳</div>
    <div id="pages-container"></div>

    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();
            
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = "${pdfWorkerUri}";
            }

            let pdfDoc = null; let pdfLibDoc = null; 
            let currentTool = 'highlight'; let currentColor = '#ffff00';
            
            let annotationsMap = {}; 

            const toolbar = document.getElementById('master-toolbar');
            const collapseBtn = document.getElementById('toggle-collapse-btn');
            let dragging = false, dragOffX, dragOffY;

            function updateAnchors() {
                const rect = toolbar.getBoundingClientRect();
                toolbar.style.transform = 'none'; 

                if (rect.left + rect.width / 2 > window.innerWidth / 2) {
                    toolbar.style.left = 'auto';
                    toolbar.style.right = (window.innerWidth - rect.right) + 'px';
                } else {
                    toolbar.style.right = 'auto';
                    toolbar.style.left = rect.left + 'px';
                }
            }

            collapseBtn.addEventListener('click', () => {
                updateAnchors(); 
                toolbar.classList.toggle('collapsed');
                setTimeout(enforceBounds, 400); 
            });

            document.getElementById('drag-grip').addEventListener('mousedown', (e) => {
                dragging = true; 
                toolbar.classList.add('dragging');
                const rect = toolbar.getBoundingClientRect();
                toolbar.style.transform = 'none';
                toolbar.style.right = 'auto';
                toolbar.style.left = rect.left + 'px';
                toolbar.style.top = rect.top + 'px';
                dragOffX = e.clientX - rect.left; 
                dragOffY = e.clientY - rect.top;
            });

            document.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                toolbar.style.left = (e.clientX - dragOffX) + 'px'; 
                toolbar.style.top = (e.clientY - dragOffY) + 'px';
            });
            
            document.addEventListener('mouseup', () => { 
                if (dragging) {
                    dragging = false; 
                    toolbar.classList.remove('dragging');
                    updateAnchors(); 
                    enforceBounds();
                }
            });

            function enforceBounds() {
                const rect = toolbar.getBoundingClientRect();
                const padding = 20;
                let isRightAnchored = toolbar.style.right && toolbar.style.right !== 'auto';

                if (isRightAnchored) {
                    let currentRight = parseFloat(toolbar.style.right) || (window.innerWidth - rect.right);
                    if (rect.right > window.innerWidth - padding) currentRight += (rect.right - (window.innerWidth - padding));
                    if (rect.left < padding) currentRight -= (padding - rect.left);
                    toolbar.style.left = 'auto';
                    toolbar.style.right = currentRight + 'px';
                } else {
                    let currentLeft = parseFloat(toolbar.style.left) || rect.left;
                    if (rect.left < padding) currentLeft += (padding - rect.left);
                    if (rect.right > window.innerWidth - padding) currentLeft -= (rect.right - (window.innerWidth - padding));
                    toolbar.style.right = 'auto';
                    toolbar.style.left = currentLeft + 'px';
                }

                let currentTop = parseFloat(toolbar.style.top) || rect.top;
                if (rect.top < padding) currentTop += (padding - rect.top);
                if (rect.bottom > window.innerHeight - padding) currentTop -= (rect.bottom - (window.innerHeight - padding));
                toolbar.style.top = currentTop + 'px';
            }

            document.querySelectorAll('.btn[data-tool]').forEach(b => {
                b.addEventListener('click', () => { 
                    document.querySelectorAll('.btn[data-tool]').forEach(x => x.classList.remove('active')); 
                    b.classList.add('active'); 
                    currentTool = b.dataset.tool; 
                    if (currentTool === 'eraser') document.body.classList.add('eraser-mode');
                    else document.body.classList.remove('eraser-mode');
                });
            });
            document.querySelectorAll('.color-dot').forEach(d => {
                d.addEventListener('click', () => { document.querySelectorAll('.color-dot').forEach(x => x.classList.remove('active')); d.classList.add('active'); currentColor = d.dataset.color; });
            });

            window.addEventListener('message', event => { if (event.data.command === 'loadPdf') loadPdf(event.data.url); });
            vscode.postMessage({ command: 'ready' });

            async function loadPdf(url) {
                try {
                    const response = await fetch(url); 
                    const arrayBuffer = await response.arrayBuffer();

                    if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
                        vscode.postMessage({ command: 'error', text: 'PDF file is too large (Maximum 50MB).' });
                        return;
                    }

                    pdfDoc = await pdfjsLib.getDocument({ 
                        data: new Uint8Array(arrayBuffer),
                        isEvalSupported: false 
                    }).promise;
                    
                    pdfLibDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                    document.getElementById('loading-msg').style.display = 'none';
                    const container = document.getElementById('pages-container'); container.innerHTML = '';
                    
                    for (let i = 1; i <= pdfDoc.numPages; i++) { 
                        createPageDOM(i, container); 
                        annotationsMap[i] = []; 
                    }

                    const BATCH_SIZE = 3;
                    for (let i = 1; i <= pdfDoc.numPages; i += BATCH_SIZE) {
                        let promises = [];
                        for(let j = 0; j < BATCH_SIZE && (i + j) <= pdfDoc.numPages; j++) {
                            promises.push(renderPage(i + j));
                        }
                        await Promise.all(promises);
                        await new Promise(r => setTimeout(r, 10)); 
                    }
                    
                    setupHighlighting();
                } catch (err) { document.getElementById('loading-msg').innerText = 'Failed to open PDF: ' + err.message; }
            }

            function createPageDOM(pageNum, container) {
                const wrapper = document.createElement('div'); wrapper.className = 'page-wrapper'; wrapper.id = 'page-wrapper-' + pageNum;
                const pdfCanvas = document.createElement('canvas'); pdfCanvas.className = 'pdf-canvas'; pdfCanvas.id = 'pdf-canvas-' + pageNum;
                const drawLayer = document.createElement('canvas'); drawLayer.className = 'draw-layer'; drawLayer.id = 'draw-layer-' + pageNum;
                const textLayer = document.createElement('div'); textLayer.className = 'textLayer'; textLayer.id = 'text-layer-' + pageNum;
                wrapper.appendChild(pdfCanvas); wrapper.appendChild(drawLayer); wrapper.appendChild(textLayer); container.appendChild(wrapper);
            }

            async function renderPage(pageNum) {
                const page = await pdfDoc.getPage(pageNum);
                const scale = 2.0; const viewport = page.getViewport({ scale });
                const wrapper = document.getElementById('page-wrapper-' + pageNum);
                const canvas = document.getElementById('pdf-canvas-' + pageNum);
                const drawCanvas = document.getElementById('draw-layer-' + pageNum);
                const textLayer = document.getElementById('text-layer-' + pageNum);

                wrapper.style.width = viewport.width + 'px'; wrapper.style.height = viewport.height + 'px';
                canvas.width = viewport.width; canvas.height = viewport.height;
                drawCanvas.width = viewport.width; drawCanvas.height = viewport.height;
                textLayer.style.width = viewport.width + 'px'; textLayer.style.height = viewport.height + 'px';

                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
                
                const textContent = await page.getTextContent();
                const textLayerRenderTask = pdfjsLib.renderTextLayer({ 
                    textContent: textContent, 
                    container: textLayer, 
                    viewport: viewport, 
                    textDivs: [] 
                });
                await textLayerRenderTask.promise;
            }

            function subtractRect(A, E) {
                const aL = A.x, aR = A.x + A.w, aT = A.y, aB = A.y + A.h;
                const eL = E.x, eR = E.x + E.w, eT = E.y, eB = E.y + E.h;

                if (eL >= aR || eR <= aL || eT >= aB || eB <= aT) return [A];

                let res = [];
                if (eT > aT) res.push({ ...A, y: aT, h: eT - aT });
                if (eB < aB) res.push({ ...A, y: eB, h: aB - eB });

                const y1 = Math.max(aT, eT);
                const y2 = Math.min(aB, eB);
                if (y2 > y1) {
                    if (eL > aL) res.push({ ...A, x: aL, y: y1, w: eL - aL, h: y2 - y1 });
                    if (eR < aR) res.push({ ...A, x: eR, y: y1, w: aR - eR, h: y2 - y1 });
                }
                return res;
            }

            function setupHighlighting() {
                if (window.isHighlightingSetup) return;
                window.isHighlightingSetup = true;

                document.addEventListener('mouseup', () => {
                    if (dragging) return;
                    const sel = window.getSelection();
                    if (!sel || sel.isCollapsed) return;

                    const node = sel.anchorNode;
                    if (!node || !node.parentElement) return;
                    const textLayerEl = node.parentElement.closest('.textLayer');
                    if (!textLayerEl) return;
                    
                    const pageNum = parseInt(textLayerEl.id.replace('text-layer-', ''));

                    if (!annotationsMap[pageNum]) annotationsMap[pageNum] = [];
                    
                    if (annotationsMap[pageNum].length > 1500) {
                        vscode.postMessage({ command: 'error', text: 'Maximum annotation limit reached on this page. Please save the file.' });
                        sel.removeAllRanges();
                        return;
                    }
                    
                    const wrapper = document.getElementById('page-wrapper-' + pageNum);
                    const wrapRect = wrapper.getBoundingClientRect();
                    const range = sel.getRangeAt(0);
                    const rects = range.getClientRects();

                    let rawRects = [];
                    for (const r of rects) {
                        if (r.width < 2 || r.height < 2) continue;
                        rawRects.push({ x: r.left - wrapRect.left, y: r.top - wrapRect.top, w: r.width, h: r.height });
                    }
                    
                    let lines = [];
                    for (let r of rawRects) {
                        let added = false;
                        let cy = r.y + r.h/2;
                        for (let l of lines) {
                            let lcy = l[0].y + l[0].h/2;
                            if (Math.abs(cy - lcy) < (r.h / 2)) { 
                                l.push(r); added = true; break;
                            }
                        }
                        if (!added) lines.push([r]);
                    }
                    
                    let mergedRects = [];
                    for (let line of lines) {
                        line.sort((a, b) => a.x - b.x);
                        let current = line[0];
                        for (let i = 1; i < line.length; i++) {
                            let next = line[i];
                            if (current.x + current.w >= next.x - 2) { 
                                let rightEdge = Math.max(current.x + current.w, next.x + next.w);
                                let bottomEdge = Math.max(current.y + current.h, next.y + next.h);
                                current.y = Math.min(current.y, next.y);
                                current.x = Math.min(current.x, next.x);
                                current.w = rightEdge - current.x;
                                current.h = bottomEdge - current.y;
                            } else {
                                mergedRects.push(current);
                                current = next;
                            }
                        }
                        mergedRects.push(current);
                    }

                    let hasDeletedSomething = false;

                    if (currentTool === 'eraser') {
                        let currentAnnos = annotationsMap[pageNum];
                        let changed = false;

                        for (const E of mergedRects) {
                            let nextAnnos = [];
                            for (const A of currentAnnos) {
                                if (E.x > A.x + A.w || E.x + E.w < A.x || E.y > A.y + A.h || E.y + E.h < A.y) {
                                    nextAnnos.push(A);
                                    continue;
                                }

                                const sub = subtractRect(A, E);
                                if (sub.length !== 1 || sub[0].x !== A.x || sub[0].w !== A.w || sub[0].y !== A.y || sub[0].h !== A.h) {
                                    changed = true;
                                }
                                nextAnnos.push(...sub);
                            }
                            currentAnnos = nextAnnos;
                        }

                        if (changed) {
                            annotationsMap[pageNum] = currentAnnos;
                            hasDeletedSomething = true;
                        }
                    } else {
                        for (const E of mergedRects) {
                            drawOnCanvas(pageNum, E.x, E.y, E.w, E.h, currentColor, currentTool);
                            annotationsMap[pageNum].push({ x: E.x, y: E.y, w: E.w, h: E.h, color: currentColor, tool: currentTool });
                        }
                    }

                    if (currentTool === 'eraser' && hasDeletedSomething) {
                        const drawCanvas = document.getElementById('draw-layer-' + pageNum);
                        const drawCtx = drawCanvas.getContext('2d');
                        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
                        
                        for (const a of annotationsMap[pageNum]) {
                            drawOnCanvas(pageNum, a.x, a.y, a.w, a.h, a.color, a.tool);
                        }
                    }

                    sel.removeAllRanges(); 
                });
            }

            function drawOnCanvas(pageNum, x, y, w, h, color, tool) {
                const drawCtx = document.getElementById('draw-layer-' + pageNum).getContext('2d');
                if (tool === 'highlight') {
                    drawCtx.fillStyle = color; drawCtx.globalAlpha = 0.45; drawCtx.fillRect(x, y, w, h); drawCtx.globalAlpha = 1.0;
                } else {
                    drawCtx.strokeStyle = color; drawCtx.lineWidth = 2; drawCtx.beginPath();
                    const lineY = (tool === 'strike') ? y + h / 2 : y + h - 1;
                    drawCtx.moveTo(x, lineY); drawCtx.lineTo(x + w, lineY); drawCtx.stroke();
                }
            }

            document.getElementById('save-btn').addEventListener('click', async () => {
                if (!pdfLibDoc) return;
                const saveBtn = document.getElementById('save-btn');
                const originalIcon = saveBtn.innerHTML;
                saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
                saveBtn.disabled = true;

                try {
                    for (const pageNum of Object.keys(annotationsMap)) {
                        const pageAnnos = annotationsMap[pageNum];
                        if(pageAnnos.length === 0) continue;
                        
                        const p = pdfLibDoc.getPage(parseInt(pageNum) - 1);
                        const { width, height } = p.getSize();
                        const canvas = document.getElementById('pdf-canvas-' + pageNum);
                        const sx = width / canvas.width; const sy = height / canvas.height;
                        
                        for (const a of pageAnnos) {
                            const c = a.color, r = parseInt(c.slice(1,3), 16)/255, g = parseInt(c.slice(3,5), 16)/255, b = parseInt(c.slice(5,7), 16)/255;
                            if (a.tool === 'highlight') {
                                p.drawRectangle({ x: a.x*sx, y: height-(a.y+a.h)*sy, width: a.w*sx, height: a.h*sy, color: PDFLib.rgb(r,g,b), opacity: 0.5 });
                            } else {
                                const lineY = a.tool === 'strike' ? height-(a.y+a.h/2)*sy : height-(a.y+a.h-1)*sy;
                                p.drawLine({ start: { x: a.x*sx, y: lineY }, end: { x: (a.x+a.w)*sx, y: lineY }, thickness: 1.5, color: PDFLib.rgb(r,g,b) });
                            }
                        }
                    }

                    const pdfBytes = await pdfLibDoc.save();
                    vscode.postMessage({ command: 'saveFile', data: pdfBytes });
                } catch (err) { 
                    console.error('Save error:', err); 
                    vscode.postMessage({ command: 'error', text: 'An error occurred while saving the PDF: ' + err.message });
                } finally {
                    saveBtn.innerHTML = originalIcon;
                    saveBtn.disabled = false;
                }
            });

            function hexToRgb(hex) {
                const r = parseInt(hex.slice(1, 3), 16) / 255; const g = parseInt(hex.slice(3, 5), 16) / 255; const b = parseInt(hex.slice(5, 7), 16) / 255;
                return { r, g, b };
            }
        })();
    </script>
    </body>
    </html>
    `;
}

function deactivate() {}
module.exports = { activate, deactivate };