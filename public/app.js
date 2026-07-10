window.onerror = function(msg, url, lineNo, columnNo, error) {
    alert("JAVASCRIPT ERROR:\\n" + msg + "\\nLine: " + lineNo + "\\nCol: " + columnNo);
    return false;
};

try {
    const socket = io();
// DOM Elements
const connectionDot = document.getElementById('connection-dot');
const connectionText = document.getElementById('connection-text');
const btnConnect = document.getElementById('btn-connect');
const ipInput = document.getElementById('matrix-ip');
const portInput = document.getElementById('matrix-port');
const btnScan = document.getElementById('btn-scan');
const extendedInput = document.getElementById('matrix-extended');

const inputsCountInput = document.getElementById('matrix-inputs');
const outputsCountInput = document.getElementById('matrix-outputs');
const btnGenerate = document.getElementById('btn-generate');
const matrixGrid = document.getElementById('matrix-grid');

const layoutNameInput = document.getElementById('layout-name');

// Sorting State
let sortState = {
    rowsAlpha: 1, // 1 for asc, -1 for desc
    colsAlpha: 1,
    rowsId: 1,
    colsId: 1
};

const btnSortRows = document.getElementById('btn-sort-rows');
const btnSortCols = document.getElementById('btn-sort-cols');
const btnSortRowsId = document.getElementById('btn-sort-rows-id');
const btnSortColsId = document.getElementById('btn-sort-cols-id');

function saveAndRenderSort() {
    renderGrid();
    const activeName = document.getElementById('saved-layouts').value || document.getElementById('layout-name').value;
    if (activeName) {
        const layoutsObj = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
        if (layoutsObj[activeName]) {
            layoutsObj[activeName].inputsData = inputsData;
            layoutsObj[activeName].outputsData = outputsData;
            socket.emit('save_layout', { name: activeName, layout: layoutsObj[activeName] });
        }
    }
}

if (btnSortRows) {
    btnSortRows.addEventListener('click', () => {
        sortState.rowsAlpha *= -1;
        inputsData.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            if (nameA < nameB) return 1 * sortState.rowsAlpha;
            if (nameA > nameB) return -1 * sortState.rowsAlpha;
            return 0;
        });
        saveAndRenderSort();
    });
}
if (btnSortCols) {
    btnSortCols.addEventListener('click', () => {
        sortState.colsAlpha *= -1;
        outputsData.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            if (nameA < nameB) return 1 * sortState.colsAlpha;
            if (nameA > nameB) return -1 * sortState.colsAlpha;
            return 0;
        });
        saveAndRenderSort();
    });
}
if (btnSortRowsId) {
    btnSortRowsId.addEventListener('click', () => {
        sortState.rowsId *= -1;
        inputsData.sort((a, b) => {
            const idA = parseInt(a.id, 10) || 0;
            const idB = parseInt(b.id, 10) || 0;
            return (idA - idB) * sortState.rowsId;
        });
        saveAndRenderSort();
    });
}
if (btnSortColsId) {
    btnSortColsId.addEventListener('click', () => {
        sortState.colsId *= -1;
        outputsData.sort((a, b) => {
            const idA = parseInt(a.id, 10) || 0;
            const idB = parseInt(b.id, 10) || 0;
            return (idA - idB) * sortState.colsId;
        });
        saveAndRenderSort();
    });
}

const btnSaveLayout = document.getElementById('btn-save-layout');
const btnLoadLayout = document.getElementById('btn-load-layout');
const btnDeleteLayout = document.getElementById('btn-delete-layout');
const savedLayoutsSelect = document.getElementById('saved-layouts');

const selectedOutEl = document.getElementById('selected-out');
const currentConnEl = document.getElementById('current-connection');
const selectedInEl = document.getElementById('selected-in');
const btnTake = document.getElementById('btn-take');
const btnUndo = document.getElementById('btn-undo');

const btnSortToggle = document.getElementById('btn-sort-toggle');
if (btnSortToggle) {
    btnSortToggle.addEventListener('click', () => {
        window.sortDropdownsAlphabetically = !window.sortDropdownsAlphabetically;
        if (window.sortDropdownsAlphabetically) {
            btnSortToggle.style.background = 'var(--primary)';
            btnSortToggle.style.color = 'white';
        } else {
            btnSortToggle.style.background = '';
            btnSortToggle.style.color = '';
        }
        if (typeof renderGrid === 'function') renderGrid();
    });
}


const btnTrash = document.getElementById('btn-trash');

if (btnTrash) {
    btnTrash.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.style.transform = 'scale(1.1)'; });
    btnTrash.addEventListener('dragleave', (e) => { e.currentTarget.style.transform = 'scale(1)'; });
    btnTrash.addEventListener('drop', (e) => {
        e.preventDefault();
        e.currentTarget.style.transform = 'scale(1)';
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            if (data.type === 'output') {
                if (multiSelectedOutputs.has(data.index)) {
                    let sortedOuts = Array.from(multiSelectedOutputs).sort((a,b)=>b-a);
                    sortedOuts.forEach(idx => { outputsData.splice(idx, 1); numOutputs--; });
                    let sortedIns = Array.from(multiSelectedInputs).sort((a,b)=>b-a);
                    sortedIns.forEach(idx => { inputsData.splice(idx, 1); numInputs--; });
                    multiSelectedOutputs.clear();
                    multiSelectedInputs.clear();
                } else {
                    outputsData.splice(data.index, 1);
                    numOutputs--;
                }
                document.getElementById('matrix-outputs').value = numOutputs;
                document.getElementById('matrix-inputs').value = numInputs;
                const activeNameOut = document.getElementById('saved-layouts').value || document.getElementById('layout-name').value;
                if (activeNameOut) {
                    const layoutsObj = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
                    if (layoutsObj[activeNameOut]) {
                        layoutsObj[activeNameOut].outputsData = outputsData;
                        layoutsObj[activeNameOut].inputsData = inputsData;
                        layoutsObj[activeNameOut].numOutputs = numOutputs;
                        layoutsObj[activeNameOut].numInputs = numInputs;
                        socket.emit('save_layout', { name: activeNameOut, layout: layoutsObj[activeNameOut] });
                    }
                }
                renderGrid();
 
            } else if (data.type === 'input') {
                if (multiSelectedInputs.has(data.index)) {
                    let sortedOuts = Array.from(multiSelectedOutputs).sort((a,b)=>b-a);
                    sortedOuts.forEach(idx => { outputsData.splice(idx, 1); numOutputs--; });
                    let sortedIns = Array.from(multiSelectedInputs).sort((a,b)=>b-a);
                    sortedIns.forEach(idx => { inputsData.splice(idx, 1); numInputs--; });
                    multiSelectedOutputs.clear();
                    multiSelectedInputs.clear();
                } else {
                    inputsData.splice(data.index, 1);
                    numInputs--;
                }
                document.getElementById('matrix-outputs').value = numOutputs;
                document.getElementById('matrix-inputs').value = numInputs;
                const activeNameIn = document.getElementById('saved-layouts').value || document.getElementById('layout-name').value;
                if (activeNameIn) {
                    const layoutsObj = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
                    if (layoutsObj[activeNameIn]) {
                        layoutsObj[activeNameIn].outputsData = outputsData;
                        layoutsObj[activeNameIn].inputsData = inputsData;
                        layoutsObj[activeNameIn].numOutputs = numOutputs;
                        layoutsObj[activeNameIn].numInputs = numInputs;
                        socket.emit('save_layout', { name: activeNameIn, layout: layoutsObj[activeNameIn] });
                    }
                }
                renderGrid();
            }
        } catch(err) {}
    });
}

function updateUndoUI() {
    if (undoStack.length > 0) {
        btnUndo.classList.remove('disabled');
        btnUndo.classList.add('primary-btn');
    } else {
        btnUndo.classList.add('disabled');
        btnUndo.classList.remove('primary-btn');
    }
}

btnUndo.addEventListener('click', () => {
    if (btnUndo.classList.contains('disabled') || undoStack.length === 0) return;
    
    const lastState = undoStack.pop();
    updateUndoUI();
    
    const restoreCommands = [];
    Object.keys(lastState).forEach(outIdStr => {
        const outId = parseInt(outIdStr, 10);
        const prevInId = lastState[outIdStr];
        if (prevInId !== undefined && prevInId !== null) {
            restoreCommands.push({ out: outId, in: prevInId });
        }
    });
    
    if (restoreCommands.length > 0) {
        socket.emit('take_multi', restoreCommands);
    }
});

// State
let numInputs = 8;
let numOutputs = 8;
let selectedInput = null;
let selectedOutputs = [];
let inputsData = [];
let outputsData = [];

// Recent Colors Logic
let recentColors = [];
try {
    const saved = localStorage.getItem('recentColors');
    if (saved) recentColors = JSON.parse(saved);
} catch(e) {}

if (recentColors.length === 0) {
    recentColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#1e293b', '#ffffff'];
}

function updateRecentColorsDatalist() {
    let datalist = document.getElementById('recent-colors');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'recent-colors';
        document.body.appendChild(datalist);
    }
    datalist.innerHTML = '';
    recentColors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        datalist.appendChild(option);
    });
}

function addRecentColor(color) {
    if (!color) return;
    recentColors = recentColors.filter(c => c.toLowerCase() !== color.toLowerCase());
    recentColors.unshift(color);
    if (recentColors.length > 8) {
        recentColors.pop();
    }
    try {
        localStorage.setItem('recentColors', JSON.stringify(recentColors));
    } catch(e) {}
    updateRecentColorsDatalist();
}

// Initialize datalist on load
updateRecentColorsDatalist();

let activeConnections = {};
let previewingSnapshot = null;
let takeLocks = {}; // Map of output ID -> input ID
let multiSelectedInputs = new Set();
let multiSelectedOutputs = new Set();

document.addEventListener('click', (e) => {
    if (!e.ctrlKey && !e.metaKey && !e.target.closest('.row-label') && !e.target.closest('.header-port') && !e.target.closest('#btn-trash') && !e.target.closest('.color-picker')) {
        if (multiSelectedInputs.size > 0 || multiSelectedOutputs.size > 0) {
            multiSelectedInputs.clear();
            multiSelectedOutputs.clear();
            renderGrid();
        }
    }
});

let undoStack = []; // Array of previous states { outputId: inputId }

// Initialize state
function init() {
    loadLayoutOptions();
}

// WebSocket Events
socket.on('matrix_status', (data) => {
    connectionText.textContent = data.message;
    if (data.connected) {
        connectionDot.className = 'dot green';
        btnConnect.textContent = 'Disconnect';
    } else {
        connectionDot.className = 'dot red';
        btnConnect.textContent = 'Connect';
    }
});

socket.on('layouts_list', (serverLayouts) => {
    console.log("Layouts list received from server:", serverLayouts);
    localStorage.setItem('probelLayouts', JSON.stringify(serverLayouts));
    loadLayoutOptions();
});


socket.on('take_success', (data) => {
    const { output, input } = data;
    // Update local state to reflect matrix state
    
        if (Array.isArray(output)) {
            output.forEach(o => {
                activeConnections[o] = input;
                takeLocks[o] = Date.now() + 3000;
            });
        } else {
            activeConnections[output] = input;
            takeLocks[output] = Date.now() + 3000;
        }
    updateGridVisuals();
    
    // Clear selection after take
    selectedInput = null;
    selectedOutputs = [];
    updateSelectionUI();
});

socket.on('matrix_error', (data) => {
    alert('Matrix Error: ' + data.message);
});

socket.on('scan_result', (data) => {
    btnScan.textContent = 'Auto';
    btnScan.disabled = false;
    
    if (data.success) {
        portInput.value = data.port;
        // Optionally auto connect:
        // socket.emit('connect_matrix', { ip: ipInput.value, port: data.port });
        alert(data.message);
    } else {
        alert(data.message);
    }
});

// UI Event Listeners
btnScan.addEventListener('click', () => {
    const ip = ipInput.value.trim();
    if (!ip) return alert('Please enter an IP address first');
    
    btnScan.textContent = '...';
    btnScan.disabled = true;
    socket.emit('scan_ports', { ip });
});

btnConnect.addEventListener('click', () => {
    if (btnConnect.textContent === 'Disconnect' || connectionDot.classList.contains('green')) {
        socket.emit('disconnect_matrix');
        btnConnect.textContent = 'Connect';
        btnConnect.classList.remove('danger');
        connectionDot.className = 'dot red';
        connectionText.textContent = 'Disconnected';
    } else {
        const ip = ipInput.value;
        const port = parseInt(portInput.value, 10);
        const extended = extendedInput.checked;
        socket.emit('connect_matrix', { ip, port, extended });
        connectionText.textContent = 'Connecting...';
    }
});

const btnShutdown = document.getElementById('btn-shutdown');
if (btnShutdown) {
    btnShutdown.addEventListener('click', () => {
        if (confirm("Are you sure you want to completely shut down the Server?\n\nThe app will stop communicating with the matrix until you restart it (by double-clicking the executable).")) {
            socket.emit('shutdown_server');
            document.body.innerHTML = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0f172a;"><h1 style="color:var(--danger); font-size:3rem; margin-bottom: 20px;">SERVER SHUTDOWN</h1><p style="color:white; font-size:1.2rem;">You can safely close this window.</p></div>';
        }
    });
}

btnGenerate.addEventListener('click', () => {
    numInputs = parseInt(inputsCountInput.value, 10) || 8;
    numOutputs = parseInt(outputsCountInput.value, 10) || 8;
    
    // Resize data arrays
    inputsData = Array(numInputs).fill(null).map((_, i) => inputsData[i] || { name: `IN ${i+1}`, id: i });
    outputsData = Array(numOutputs).fill(null).map((_, i) => outputsData[i] || { name: `OUT ${i+1}`, id: i });
    
    renderGrid();
});


    function updateGridVisuals() {
    // If preview mode, highlight TAKE button to indicate action needed
    if (btnTake) {
        if (previewingSnapshot) {
            btnTake.classList.remove('disabled');
            btnTake.style.backgroundColor = '#f59e0b'; // Amber/Yellow
            btnTake.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.4)';
            btnTake.textContent = 'TAKE SNAPSHOT';
        } else {
            btnTake.style.backgroundColor = ''; // Restore default
            btnTake.style.boxShadow = '';
            btnTake.textContent = 'TAKE';
        }
    }
    
    for (let inIdx = 0; inIdx < numInputs; inIdx++) {
        for (let outIdx = 0; outIdx < numOutputs; outIdx++) {
            const cp = document.getElementById(`cp-${outIdx}-${inIdx}`);
            if (cp) {
                const outId = outputsData[outIdx].id;
                const inId = inputsData[inIdx].id;
                
                const isSelected = selectedOutputs.includes(outIdx) && selectedInput === inIdx;
                const isActive = activeConnections[outId] === inId;
                
                let isPreview = false;
                if (previewingSnapshot && previewingSnapshot[outId] !== undefined) {
                    if (parseInt(previewingSnapshot[outId], 10) === parseInt(inId, 10) && !isActive) {
                        isPreview = true;
                    }
                }
                
                cp.classList.remove('selected', 'active', 'preview');
                
                if (isSelected) cp.classList.add('selected');
                if (isActive) cp.classList.add('active');
                if (isPreview) cp.classList.add('preview');
            }
        }
    }
}

function handleCrosspointClick(outIdx, inIdx) {
    if (typeof previewingSnapshot !== 'undefined' && previewingSnapshot) {
        const outId = outputsData[outIdx].id;
        const inId = inputsData[inIdx].id;
        
        if (previewingSnapshot[outId] === inId) {
            delete previewingSnapshot[outId];
        } else {
            previewingSnapshot[outId] = inId;
        }
        
        updateGridVisuals();
        return;
    }
    if (selectedInput !== inIdx) {
        selectedInput = inIdx;
        selectedOutputs = [outIdx];
    } else {
        const index = selectedOutputs.indexOf(outIdx);
        if (index > -1) {
            selectedOutputs.splice(index, 1);
            if (selectedOutputs.length === 0) selectedInput = null;
        } else {
            selectedOutputs.push(outIdx);
        }
    }
    
    // Request real connection state for the clicked output
    const outId = outputsData[outIdx].id;
    socket.emit('request_connection_state', { target: outId });

    updateSelectionUI();
    updateGridVisuals();
}

function updateSelectionUI() {
    if (selectedInput !== null && selectedOutputs.length > 0) {
        const outNames = selectedOutputs.map(oIdx => outputsData[oIdx] ? `${outputsData[oIdx].name} (ID: ${outputsData[oIdx].id})` : `OUT ${oIdx + 1}`).join(', ');
        
        // Find current connections for selected outputs
        const currentInNames = selectedOutputs.map(oIdx => {
            const outId = outputsData[oIdx] ? outputsData[oIdx].id : oIdx + 1;
            const inId = activeConnections[outId];
            if (inId === undefined || inId === null) return 'Nessuna';
            
            // Try to resolve name from globalNamesData or inputsData
            if (globalNamesData && globalNamesData.sources && globalNamesData.sources[inId]) {
                return globalNamesData.sources[inId];
            }
            const localIn = inputsData.find(i => i.id === inId);
            return localIn ? localIn.name : `IN ${inId}`;
        }).join(', ');

        const inData = inputsData[selectedInput] || {name: `IN ${selectedInput + 1}`, id: selectedInput + 1};
        
        selectedOutEl.textContent = outNames;
        selectedOutEl.title = outNames;
        currentConnEl.textContent = currentInNames;
        currentConnEl.title = currentInNames;
        selectedInEl.textContent = `${inData.name} (ID: ${inData.id})`;
        
        btnTake.classList.remove('disabled');
    } else {
        selectedOutEl.textContent = '-';
        selectedOutEl.title = '';
        if(currentConnEl) {
            currentConnEl.textContent = '-';
            currentConnEl.title = '';
        }
        selectedInEl.textContent = '-';
        btnTake.classList.add('disabled');
    }
    
    // If previewing a snapshot, override the disabled state so TAKE SNAPSHOT remains enabled
    if (typeof previewingSnapshot !== 'undefined' && previewingSnapshot) {
        btnTake.classList.remove('disabled');
    }
}

btnTake.addEventListener('click', () => {
        if (previewingSnapshot) {
            socket.emit('take_snapshot', previewingSnapshot);
            
            // Optimistic lock
            if (typeof takeLocks !== 'undefined') {
                Object.keys(previewingSnapshot).forEach(outStr => {
                    const outInt = parseInt(outStr, 10);
                    takeLocks[outInt] = Date.now() + 3000;
                });
            }
            
            previewingSnapshot = null;
            updateGridVisuals();
            return;
        }

    if (btnTake.classList.contains('disabled')) return;
    
    // Save current state for undo
    const currentStates = {};
    selectedOutputs.forEach(oIdx => {
        const outId = outputsData[oIdx].id;
        let previewInId = null;
        if (previewingSnapshot && previewingSnapshot[outId] !== undefined) {
            previewInId = parseInt(previewingSnapshot[outId], 10);
        }
        currentStates[outId] = activeConnections[outId]; // Might be undefined
    });
    undoStack.push(currentStates);
    if (undoStack.length > 20) undoStack.shift();
    updateUndoUI();
    
    socket.emit('take', {
        output: selectedOutputs.map(o => outputsData[o].id), // sending ARRAY of IDs to backend
        input: inputsData[selectedInput].id     // sending ID to backend
    });
});

socket.on('take_multi_success', (commands) => {
    
        commands.forEach(cmd => {
            activeConnections[cmd.out] = cmd.in;
            takeLocks[cmd.out] = Date.now() + 3000;
        });
    updateGridVisuals();
});


socket.on('matrix_state', (stateData) => {
    // stateData format: { matrixNumber: { levelNumber: { destId: sourceId } } }
    console.log("Matrix state received:", stateData);
    if (!stateData) return;
    
    const matrixKeys = Object.keys(stateData);
    if (matrixKeys.length === 0) return;
    const matrixObj = stateData[matrixKeys[0]];
    const levelKeys = Object.keys(matrixObj);
    if (levelKeys.length === 0) return;
    const levelObj = matrixObj[levelKeys[0]];
    
    // Update our activeConnections based on real matrix IDs
    
        Object.keys(levelObj).forEach(destId => {
            const destInt = parseInt(destId, 10);
            if (takeLocks[destInt] && Date.now() < takeLocks[destInt]) {
                // Ignore stale update from Pro-Bel polling
                return;
            }
            const sourceId = levelObj[destId];
            activeConnections[destInt] = parseInt(sourceId, 10);
        });
    renderGrid();
});

socket.on('matrix_crosspoint', (data) => {
    console.log("Live Crosspoint Update:", data);
    if (!data) return;
    const matrixKeys = Object.keys(data);
    if (matrixKeys.length === 0) return;
    const matrixObj = data[matrixKeys[0]];
    const levelKeys = Object.keys(matrixObj);
    if (levelKeys.length === 0) return;
    const levelObj = matrixObj[levelKeys[0]];
    
    Object.keys(levelObj).forEach(destId => {
        const destInt = parseInt(destId, 10);
        if (takeLocks[destInt] && Date.now() < takeLocks[destInt]) return;
        const sourceId = levelObj[destId];
        activeConnections[destInt] = parseInt(sourceId, 10);
    });
    updateGridVisuals();
    updateSelectionUI();
});

let globalNamesData = { sources: {}, destinations: {} };

socket.on('matrix_names', (namesData) => {
    console.log("Matrix names received:", namesData);
    globalNamesData = namesData || { sources: {}, destinations: {} };
    let changed = false;
    
    if (namesData && namesData.sources) {
        Object.keys(namesData.sources).forEach(srcId => {
            const id = parseInt(srcId, 10);
            const name = namesData.sources[srcId];
            if (name && name.trim()) {
                const localInput = inputsData.find(i => i.id === id);
                if (localInput) {
                    localInput.name = name.trim();
                    changed = true;
                }
            }
        });
    }
    
    if (namesData && namesData.destinations) {
        Object.keys(namesData.destinations).forEach(dstId => {
            const id = parseInt(dstId, 10);
            const name = namesData.destinations[dstId];
            if (name && name.trim()) {
                const localOutput = outputsData.find(o => o.id === id);
                if (localOutput) {
                    localOutput.name = name.trim();
                    changed = true;
                }
            }
        });
    }
    
    if (changed) {
        updateSelectionUI();
        renderGrid();
    }
});

// Grid Rendering
function renderGrid() {
    matrixGrid.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-wrapper';

    // Helper to create select options
    const createSelect = (dataObj, currentId) => {
        const selectEl = document.createElement('select');
        selectEl.className = 'label-input name-select';
        selectEl.style.width = '100%';
        
        // Add default/unknown option
        const defOpt = document.createElement('option');
        defOpt.value = currentId;
        defOpt.textContent = `ID: ${currentId}`;
        selectEl.appendChild(defOpt);

        if (dataObj) {
            let keys = Object.keys(dataObj);
            if (window.sortDropdownsAlphabetically) {
                keys.sort((a, b) => {
                    const nameA = dataObj[a].toString().toLowerCase();
                    const nameB = dataObj[b].toString().toLowerCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;
                    return 0;
                });
            } else {
                keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            }
            keys.forEach(idStr => {
                const id = parseInt(idStr, 10);
                const name = dataObj[idStr];
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = `${name} (${id})`;
                if (id === currentId) opt.selected = true;
                selectEl.appendChild(opt);
            });
        }
        return selectEl;
    };

    // Header Row (Outputs)
    const headerRow = document.createElement('div');
    headerRow.className = 'grid-header-row';
    for (let outIdx = 0; outIdx < numOutputs; outIdx++) {
        const portConfig = document.createElement('div');
        portConfig.className = 'port-config header-port';
        portConfig.id = `header-out-${outIdx}`;
        portConfig.draggable = true;
        portConfig.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'output', index: outIdx }));
            e.currentTarget.classList.add('dragging');
        });
        portConfig.addEventListener('dragend', (e) => {
            e.currentTarget.classList.remove('dragging');
        });
        portConfig.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        });
        portConfig.addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('drag-over');
        });
        portConfig.addEventListener('click', (e) => {
            if (e.target.closest('.color-picker') || e.target.closest('.name-select')) return;
            if (e.ctrlKey || e.metaKey) {
                if (multiSelectedOutputs.has(outIdx)) multiSelectedOutputs.delete(outIdx);
                else multiSelectedOutputs.add(outIdx);
            } else {
                multiSelectedInputs.clear();
                multiSelectedOutputs.clear();
                multiSelectedOutputs.add(outIdx);
            }
            renderGrid();
        });
        portConfig.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'output') {
                    const fromIdx = data.index;
                    const toIdx = outIdx;
                    if (fromIdx !== toIdx) {
                        const moved = outputsData.splice(fromIdx, 1)[0];
                        outputsData.splice(toIdx, 0, moved);
                        if (typeof activeLayoutName !== 'undefined' && activeLayoutName) {
                            if (typeof layouts !== 'undefined' && layouts[activeLayoutName]) {
                                layouts[activeLayoutName].outputsData = outputsData;
                    layouts[activeLayoutName].numOutputs = numOutputs;
                    socket.emit('save_layout', { name: activeLayoutName, layout: layouts[activeLayoutName] });
                            }
                        }
                        selectedInput = null;
                        selectedOutputs = [];
                        renderGrid();
                    }
                }
            } catch(err) {}
        });

        
        const currentOutId = outputsData[outIdx].id;
        if (multiSelectedOutputs.has(outIdx)) {
            portConfig.style.boxShadow = '0 0 0 2px var(--accent)';
        }
        if (globalNamesData && globalNamesData.destinations && globalNamesData.destinations[currentOutId]) {
            outputsData[outIdx].name = globalNamesData.destinations[currentOutId];
        }
        
        const selectEl = createSelect(globalNamesData.destinations, currentOutId);
const dragHandleOut = document.createElement('div');
dragHandleOut.style.position = 'absolute';
dragHandleOut.style.top = '0';
dragHandleOut.style.left = '0';
dragHandleOut.style.width = '100%';
dragHandleOut.style.height = '10px';
dragHandleOut.style.background = 'rgba(255,255,255,0.2)';
dragHandleOut.style.cursor = 'grab';
dragHandleOut.style.borderRadius = '4px 4px 0 0';
dragHandleOut.title = 'Drag to move';
dragHandleOut.draggable = true;
dragHandleOut.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'output', index: outIdx })); e.stopPropagation(); });
portConfig.style.position = 'relative';
portConfig.draggable = false;
portConfig.appendChild(dragHandleOut);
        selectEl.addEventListener('change', (e) => {
            const newId = parseInt(e.target.value, 10);
            outputsData[outIdx].id = newId;
            outputsData[outIdx].name = globalNamesData.destinations ? globalNamesData.destinations[newId] : `OUT ${newId}`;
            updateSelectionUI();
        });

        // Apply custom colors if saved
        if (outputsData[outIdx].bgColor) {
            portConfig.style.backgroundColor = outputsData[outIdx].bgColor;
            portConfig.style.borderRadius = '6px';
            portConfig.style.border = '1px solid rgba(255,255,255,0.1)';
        }
        if (outputsData[outIdx].fgColor) {
            selectEl.style.color = outputsData[outIdx].fgColor;
        }

        // Add color pickers container
        const colorContainer = document.createElement('div');
        colorContainer.className = 'color-pickers-container';

        const bgPicker = document.createElement('input');
        bgPicker.type = 'color';
        if (!bgPicker.hasAttribute('list')) bgPicker.setAttribute('list', 'recent-colors');
        bgPicker.setAttribute('list', 'recent-colors');
        bgPicker.className = 'color-picker bg-color-picker';
        bgPicker.title = 'Background';
        bgPicker.value = outputsData[outIdx].bgColor || '#1e293b';
        bgPicker.addEventListener('change', (e) => {
            const newColor = e.target.value;
            addRecentColor(newColor);
            if (multiSelectedOutputs.has(outIdx)) {
                multiSelectedOutputs.forEach(idx => outputsData[idx].bgColor = newColor);
                multiSelectedInputs.forEach(idx => inputsData[idx].bgColor = newColor);
                renderGrid();
            } else {
                outputsData[outIdx].bgColor = newColor;
                portConfig.style.backgroundColor = newColor;
                portConfig.style.borderRadius = '6px';
                portConfig.style.border = '1px solid rgba(255,255,255,0.1)';
            }
        });

        const fgPicker = document.createElement('input');
        fgPicker.type = 'color';
        if (!fgPicker.hasAttribute('list')) fgPicker.setAttribute('list', 'recent-colors');
        fgPicker.setAttribute('list', 'recent-colors');
        fgPicker.className = 'color-picker fg-color-picker';
        fgPicker.title = 'Text';
        fgPicker.value = outputsData[outIdx].fgColor || '#ffffff';
        fgPicker.addEventListener('change', (e) => {
            const newColor = e.target.value;
            addRecentColor(newColor);
            if (multiSelectedOutputs.has(outIdx)) {
                multiSelectedOutputs.forEach(idx => outputsData[idx].fgColor = newColor);
                multiSelectedInputs.forEach(idx => inputsData[idx].fgColor = newColor);
                renderGrid();
            } else {
                outputsData[outIdx].fgColor = newColor;
                selectEl.style.color = newColor;
            }
        });

        colorContainer.appendChild(bgPicker);
        colorContainer.appendChild(fgPicker);

        portConfig.appendChild(selectEl);
        portConfig.appendChild(colorContainer);
        headerRow.appendChild(portConfig);
    }
    wrapper.appendChild(headerRow);

    // Rows (Inputs)
    for (let inIdx = 0; inIdx < numInputs; inIdx++) {
        const row = document.createElement('div');
        row.className = 'grid-row';
        
        // Row Label (Input Name & ID)
        const rowLabel = document.createElement('div');
        rowLabel.className = 'row-label';
        rowLabel.id = `header-in-${inIdx}`;
        rowLabel.draggable = true;
        rowLabel.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'input', index: inIdx }));
            e.currentTarget.classList.add('dragging');
        });
        rowLabel.addEventListener('dragend', (e) => {
            e.currentTarget.classList.remove('dragging');
        });
        rowLabel.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        });
        rowLabel.addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('drag-over');
        });
        rowLabel.addEventListener('click', (e) => {
            if (e.target.closest('.color-picker') || e.target.closest('.name-select')) return;
            if (e.ctrlKey || e.metaKey) {
                if (multiSelectedInputs.has(inIdx)) multiSelectedInputs.delete(inIdx);
                else multiSelectedInputs.add(inIdx);
            } else {
                multiSelectedInputs.clear();
                multiSelectedOutputs.clear();
                multiSelectedInputs.add(inIdx);
            }
            renderGrid();
        });
        rowLabel.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'input') {
                    const fromIdx = data.index;
                    const toIdx = inIdx;
                    if (fromIdx !== toIdx) {
                        const moved = inputsData.splice(fromIdx, 1)[0];
                        inputsData.splice(toIdx, 0, moved);
                        if (typeof activeLayoutName !== 'undefined' && activeLayoutName) {
                            if (typeof layouts !== 'undefined' && layouts[activeLayoutName]) {
                                layouts[activeLayoutName].inputsData = inputsData;
                    layouts[activeLayoutName].numInputs = numInputs;
                    socket.emit('save_layout', { name: activeLayoutName, layout: layouts[activeLayoutName] });
                            }
                        }
                        selectedInput = null;
                        selectedOutputs = [];
                        renderGrid();
                    }
                }
            } catch(err) {}
        });

        
        const portConfig = document.createElement('div');
        portConfig.className = 'port-config';
        
        const currentInId = inputsData[inIdx].id;
        if (globalNamesData && globalNamesData.sources && globalNamesData.sources[currentInId]) {
            inputsData[inIdx].name = globalNamesData.sources[currentInId];
        }
        
        const selectEl = createSelect(globalNamesData.sources, currentInId);
const dragHandleIn = document.createElement('div');
dragHandleIn.style.position = 'absolute';
dragHandleIn.style.top = '0';
dragHandleIn.style.left = '0';
dragHandleIn.style.width = '12px';
dragHandleIn.style.height = '100%';
dragHandleIn.style.background = 'rgba(255,255,255,0.2)';
dragHandleIn.style.cursor = 'grab';
dragHandleIn.style.borderRadius = '4px 0 0 4px';
dragHandleIn.title = 'Drag to move';
dragHandleIn.draggable = true;
dragHandleIn.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'input', index: inIdx })); e.stopPropagation(); });
rowLabel.draggable = false;
rowLabel.appendChild(dragHandleIn);
        if (multiSelectedInputs.has(inIdx)) {
            rowLabel.style.boxShadow = '0 0 0 2px var(--accent)';
        }
        selectEl.addEventListener('change', (e) => {
            const newId = parseInt(e.target.value, 10);
            inputsData[inIdx].id = newId;
            inputsData[inIdx].name = globalNamesData.sources ? globalNamesData.sources[newId] : `IN ${newId}`;
            updateSelectionUI();
        });

        // Apply custom colors if saved
        if (inputsData[inIdx].bgColor) {
            rowLabel.style.backgroundColor = inputsData[inIdx].bgColor;
            rowLabel.style.borderRadius = '6px';
            rowLabel.style.border = '1px solid rgba(255,255,255,0.1)';
        }
        if (inputsData[inIdx].fgColor) {
            selectEl.style.color = inputsData[inIdx].fgColor;
        }

        // Add color pickers container
        const colorContainer = document.createElement('div');
        colorContainer.className = 'color-pickers-container';

        const bgPicker = document.createElement('input');
        bgPicker.type = 'color';
        if (!bgPicker.hasAttribute('list')) bgPicker.setAttribute('list', 'recent-colors');
        bgPicker.className = 'color-picker bg-color-picker';
        bgPicker.title = 'Background';
        bgPicker.value = inputsData[inIdx].bgColor || '#1e293b';
        bgPicker.addEventListener('change', (e) => {
            const newColor = e.target.value;
            addRecentColor(newColor);
            if (multiSelectedInputs.has(inIdx)) {
                multiSelectedInputs.forEach(idx => inputsData[idx].bgColor = newColor);
                multiSelectedOutputs.forEach(idx => outputsData[idx].bgColor = newColor);
                renderGrid();
            } else {
                inputsData[inIdx].bgColor = newColor;
                rowLabel.style.backgroundColor = newColor;
                rowLabel.style.borderRadius = '6px';
                rowLabel.style.border = '1px solid rgba(255,255,255,0.1)';
            }
        });

        const fgPicker = document.createElement('input');
        fgPicker.type = 'color';
        if (!fgPicker.hasAttribute('list')) fgPicker.setAttribute('list', 'recent-colors');
        fgPicker.className = 'color-picker fg-color-picker';
        fgPicker.title = 'Text';
        fgPicker.value = inputsData[inIdx].fgColor || '#ffffff';
        fgPicker.addEventListener('change', (e) => {
            const newColor = e.target.value;
            addRecentColor(newColor);
            if (multiSelectedInputs.has(inIdx)) {
                multiSelectedInputs.forEach(idx => inputsData[idx].fgColor = newColor);
                multiSelectedOutputs.forEach(idx => outputsData[idx].fgColor = newColor);
                renderGrid();
            } else {
                inputsData[inIdx].fgColor = newColor;
                selectEl.style.color = newColor;
            }
        });

        colorContainer.appendChild(bgPicker);
        colorContainer.appendChild(fgPicker);

        portConfig.appendChild(selectEl);
        portConfig.appendChild(colorContainer);
        rowLabel.appendChild(portConfig);
        row.appendChild(rowLabel);

        // Crosspoints
        for (let outIdx = 0; outIdx < numOutputs; outIdx++) {
            const cp = document.createElement('div');
            cp.className = 'crosspoint';
                cp.id = `cp-${outIdx}-${inIdx}`;
            
            // Check state
            const isSelected = selectedOutputs.includes(outIdx) && selectedInput === inIdx;
            const isActive = activeConnections[outputsData[outIdx].id] === inputsData[inIdx].id;

            if (isSelected) cp.classList.add('selected');
            if (isActive) cp.classList.add('active');

            cp.addEventListener('click', () => handleCrosspointClick(outIdx, inIdx));
            
            cp.addEventListener('mouseenter', () => {
                const hOut = document.getElementById(`header-out-${outIdx}`);
                const hIn = document.getElementById(`header-in-${inIdx}`);
                if (hOut) hOut.classList.add('hover-highlight');
                if (hIn) hIn.classList.add('hover-highlight');
            });
            
            cp.addEventListener('mouseleave', () => {
                const hOut = document.getElementById(`header-out-${outIdx}`);
                const hIn = document.getElementById(`header-in-${inIdx}`);
                if (hOut) hOut.classList.remove('hover-highlight');
                if (hIn) hIn.classList.remove('hover-highlight');
            });

            row.appendChild(cp);
        }
        
        wrapper.appendChild(row);
    }

    matrixGrid.appendChild(wrapper);
    if (typeof updateSchedulerDropdowns === 'function') updateSchedulerDropdowns();
}

// Layout Management
function loadLayoutOptions() {
    const prevValue = savedLayoutsSelect.value;
    const layouts = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
    savedLayoutsSelect.innerHTML = '<option value="">Select a layout...</option>';
    Object.keys(layouts).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        savedLayoutsSelect.appendChild(option);
    });
    if (prevValue && layouts[prevValue]) {
        savedLayoutsSelect.value = prevValue;
    }
}

btnSaveLayout.addEventListener('click', () => {
    const name = layoutNameInput.value.trim();
    if (!name) return alert('Please enter a layout name');

    const layout = {
        numInputs,
        numOutputs,
        inputsData,
        outputsData,
        ip: ipInput.value,
        port: portInput.value,
        extended: extendedInput.checked
    };

    socket.emit('save_layout', { name, layout });
    savedLayoutsSelect.value = name;
    alert('Layout saved to server!');
});

btnLoadLayout.addEventListener('click', () => {
    const name = savedLayoutsSelect.value;
    if (!name) return;

    const layouts = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
    const layout = layouts[name];
    if (layout) {
        inputsCountInput.value = layout.numInputs;
        outputsCountInput.value = layout.numOutputs;
        ipInput.value = layout.ip;
        portInput.value = layout.port;
        if (layout.extended !== undefined) extendedInput.checked = layout.extended;
        
        numInputs = layout.numInputs;
        numOutputs = layout.numOutputs;
        inputsData = layout.inputsData || (layout.inputLabels ? layout.inputLabels.map((name, i) => ({name, id: i})) : []);
        outputsData = layout.outputsData || (layout.outputLabels ? layout.outputLabels.map((name, i) => ({name, id: i})) : []);
        
        layoutNameInput.value = name;
        renderGrid();
        if (typeof showSnapshotsForCurrentLayout === 'function') {
            showSnapshotsForCurrentLayout(name);
        }
    }
});

if (btnDeleteLayout) {
    btnDeleteLayout.addEventListener('click', () => {
        const name = savedLayoutsSelect.value;
        if (!name) return alert('Please select a layout to delete first.');
        
        if (confirm(`Are you sure you want to delete layout "${name}"?`)) {
            socket.emit('delete_layout', name);
            layoutNameInput.value = '';
        }
    });
}

// Export Layouts
const btnExportLayouts = document.getElementById('btn-export-layouts');
const btnImportLayouts = document.getElementById('btn-import-layouts');
const importFileInput = document.getElementById('import-file-input');

if (btnExportLayouts) {
    btnExportLayouts.addEventListener('click', () => {
        const layoutsStr = localStorage.getItem('probelLayouts') || '{}';
        const blob = new Blob([layoutsStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'matrix_layouts.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

if (btnImportLayouts) {
    btnImportLayouts.addEventListener('click', () => {
        importFileInput.click();
    });
}

if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedLayouts = JSON.parse(event.target.result);
                if (typeof importedLayouts !== 'object' || importedLayouts === null) {
                    throw new Error('Il file JSON non è valido.');
                }
                
                // Merge with existing layouts
                const existingLayouts = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
                const mergedLayouts = { ...existingLayouts, ...importedLayouts };
                
                socket.emit('import_layouts', mergedLayouts);
                alert('Layouts imported successfully!');
            } catch (err) {
                alert('Error importing: ' + err.message);
            }
            importFileInput.value = ''; // Reset file input
        };
        reader.readAsText(file);
    });
}

// --- Scheduler Logic ---
let schedules = JSON.parse(localStorage.getItem('probelSchedules') || '[]');

function saveSchedules() {
    localStorage.setItem('probelSchedules', JSON.stringify(schedules));
    renderSchedules();
}

function updateSchedulerDropdowns() {
    const selOut = document.getElementById('schedule-out');
    const selIn = document.getElementById('schedule-in');
    if (!selOut || !selIn) return;
    
    const valOut = selOut.value;
    const valIn = selIn.value;
    
    selOut.innerHTML = '';
    selIn.innerHTML = '';
    
    // Populate outputs from globalNamesData if available, otherwise fallback to grid outputs
    if (globalNamesData && globalNamesData.destinations && Object.keys(globalNamesData.destinations).length > 0) {
        Object.keys(globalNamesData.destinations).forEach(idStr => {
            const id = parseInt(idStr, 10);
            const name = globalNamesData.destinations[idStr];
            selOut.options.add(new Option(`${name} (ID: ${id})`, id));
        });
    } else {
        outputsData.forEach(out => {
            selOut.options.add(new Option(`${out.name} (ID: ${out.id})`, out.id));
        });
    }

    // Populate inputs from globalNamesData if available, otherwise fallback to grid inputs
    if (globalNamesData && globalNamesData.sources && Object.keys(globalNamesData.sources).length > 0) {
        Object.keys(globalNamesData.sources).forEach(idStr => {
            const id = parseInt(idStr, 10);
            const name = globalNamesData.sources[idStr];
            selIn.options.add(new Option(`${name} (ID: ${id})`, id));
        });
    } else {
        inputsData.forEach(inp => {
            selIn.options.add(new Option(`${inp.name} (ID: ${inp.id})`, inp.id));
        });
    }
    
    if (valOut) selOut.value = valOut;
    if (valIn) selIn.value = valIn;
}

function renderSchedules() {
    const list = document.getElementById('schedules-list');
    if (!list) return;
    list.innerHTML = '';
    
    schedules.forEach(sc => {
        const item = document.createElement('div');
        item.className = 'schedule-item';
        
        let outName = `Out ${sc.outId}`;
        let inName = `In ${sc.inId}`;
        
        if (globalNamesData && globalNamesData.destinations && globalNamesData.destinations[sc.outId]) {
            outName = globalNamesData.destinations[sc.outId];
        } else {
            const outObj = outputsData.find(o => o.id === sc.outId);
            if (outObj) outName = outObj.name;
        }
        
        if (globalNamesData && globalNamesData.sources && globalNamesData.sources[sc.inId]) {
            inName = globalNamesData.sources[sc.inId];
        } else {
            const inObj = inputsData.find(i => i.id === sc.inId);
            if (inObj) inName = inObj.name;
        }
        
        const info = document.createElement('div');
        info.innerHTML = `<div class="time">${sc.time}</div><div class="route">${outName} ← ${inName}</div>`;
        
        const btnDel = document.createElement('button');
        btnDel.className = 'btn-delete-schedule';
        btnDel.innerHTML = '×';
        btnDel.onclick = () => {
            schedules = schedules.filter(s => s.id !== sc.id);
            if (currentWarningTask && currentWarningTask.id === sc.id) {
                warningModal.style.display = 'none';
                currentWarningTask = null;
            }
            saveSchedules();
        };
        
        item.appendChild(info);
        item.appendChild(btnDel);
        list.appendChild(item);
    });
}

const btnAddSched = document.getElementById('btn-add-schedule');
if (btnAddSched) btnAddSched.addEventListener('click', () => {
    const hrVal = document.getElementById('schedule-hour').value;
    const minVal = document.getElementById('schedule-minute').value;
    const outVal = document.getElementById('schedule-out').value;
    const inVal = document.getElementById('schedule-in').value;
    
    if (!hrVal || !minVal || !outVal || !inVal) {
        alert("Please set Time, Output, and Input.");
        return;
    }
    
    const timeVal = `${hrVal.padStart(2, '0')}:${minVal.padStart(2, '0')}`;
    
    const newTask = {
        id: Date.now().toString(),
        time: timeVal,
        outId: parseInt(outVal, 10),
        inId: parseInt(inVal, 10),
        status: 'pending'
    };
    
    schedules.push(newTask);
    schedules.sort((a, b) => a.time.localeCompare(b.time));
    saveSchedules();
});

const warningModal = document.getElementById('warning-modal');
const warningCountdown = document.getElementById('warning-countdown');
const warningDetails = document.getElementById('warning-details');
let currentWarningTask = null;

const btnCancelTake = document.getElementById('btn-cancel-take');
if (btnCancelTake) btnCancelTake.addEventListener('click', () => {
    if (currentWarningTask) {
        schedules = schedules.filter(s => s.id !== currentWarningTask.id);
        saveSchedules();
    }
    warningModal.style.display = 'none';
    currentWarningTask = null;
});

function playWarningSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const playBeep = (time, duration) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, time);
            gain.gain.setValueAtTime(0.1, time);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(time);
            osc.stop(time + duration);
        };
        
        const now = audioCtx.currentTime;
        playBeep(now, 0.15);
        playBeep(now + 0.3, 0.15);
        playBeep(now + 0.6, 0.6);
    } catch (e) {
        console.error("Audio API not supported", e);
    }
}

setInterval(() => {
    schedules.forEach(sc => {
        const parts = sc.time.split(':');
        let targetDate = new Date();
        targetDate.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
        
        if (targetDate.getTime() < Date.now() - 60000) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        
        const diffSeconds = Math.floor((targetDate.getTime() - Date.now()) / 1000);
        
        if (sc.status === 'pending') {
            if (diffSeconds <= 30 && diffSeconds > 0) {
                sc.status = 'warning';
                currentWarningTask = sc;
                const outObj = outputsData.find(o => o.id === sc.outId);
                const outName = outObj ? outObj.name : sc.outId;
                const inObj = inputsData.find(i => i.id === sc.inId);
                const inName = inObj ? inObj.name : sc.inId;
                warningDetails.textContent = `Routing ${inName} to ${outName}`;
                warningModal.style.display = 'flex';
                warningCountdown.textContent = diffSeconds;
                playWarningSound();
            } else if (diffSeconds <= 0 && diffSeconds > -60) {
                // Missed the warning but still within a minute
                socket.emit('take', { output: sc.outId, input: sc.inId });
                schedules = schedules.filter(s => s.id !== sc.id);
                saveSchedules();
            }
        } else if (sc.status === 'warning' && currentWarningTask === sc) {
            if (diffSeconds > 0) {
                warningCountdown.textContent = diffSeconds;
            } else {
                socket.emit('take', { output: sc.outId, input: sc.inId });
                schedules = schedules.filter(s => s.id !== sc.id);
                saveSchedules();
                warningModal.style.display = 'none';
                currentWarningTask = null;
            }
        }
    });
}, 1000);

// Periodic polling of outputs in the loaded layout to keep connections updated
setInterval(() => {
    if (numOutputs > 0 && outputsData && outputsData.length > 0) {
        outputsData.forEach((out, index) => {
            setTimeout(() => {
                socket.emit('request_connection_state', { target: out.id });
            }, index * 30); // Stagger requests
        });
    }
}, 2000); // Check every 2 seconds

// Initialize UI
renderSchedules();

// Start
init();


const btnSaveSnapshot = document.getElementById('btn-save-snapshot');
const btnRecallSnapshot = document.getElementById('btn-recall-snapshot');
const btnDeleteSnapshot = document.getElementById('btn-delete-snapshot');
const savedSnapshotsSelect = document.getElementById('saved-snapshots');
const snapshotNameInput = document.getElementById('snapshot-name');
const snapshotSection = document.getElementById('snapshot-section');

function updateSnapshotsDropdown(layout) {
    savedSnapshotsSelect.innerHTML = '<option value="">Select a snapshot...</option>';
    if (layout && layout.snapshots) {
        Object.keys(layout.snapshots).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            savedSnapshotsSelect.appendChild(opt);
        });
    }
}

// Triggered when btnLoadLayout succeeds
function showSnapshotsForCurrentLayout(layoutName) {
    const layouts = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
    const layout = layouts[layoutName];
    if (layout) {
        snapshotSection.style.display = 'block';
        updateSnapshotsDropdown(layout);
    } else {
        snapshotSection.style.display = 'none';
    }
}

if (btnSaveSnapshot) {
    btnSaveSnapshot.addEventListener('click', () => {
        const name = snapshotNameInput.value.trim();
        if (!name) return alert('Please enter a snapshot name.');
        const activeName = savedLayoutsSelect.value;
        if (!activeName) return alert('Please save or load a layout first.');

        const layoutsObj = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
        const layout = layoutsObj[activeName];
        if (!layout) return alert('Layout not found.');

        if (!layout.snapshots) layout.snapshots = {};
        
        // Capture active connections for CURRENT outputs only
        const state = {};
        outputsData.forEach(out => {
            if (activeConnections[out.id] !== undefined) {
                state[out.id] = activeConnections[out.id];
            }
        });

        layout.snapshots[name] = state;
        socket.emit('save_layout', { name: activeName, layout });
        updateSnapshotsDropdown(layout);
        savedSnapshotsSelect.value = name;
        alert('Snapshot saved successfully!');
    });

    btnRecallSnapshot.addEventListener('click', () => {
        const snapName = savedSnapshotsSelect.value;
        if (!snapName) return alert('Please select a snapshot to recall.');
        const activeName = savedLayoutsSelect.value;
        
        const layoutsObj = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
        const layout = layoutsObj[activeName];
        if (!layout || !layout.snapshots || !layout.snapshots[snapName]) return alert('Snapshot data not found.');

        const stateMap = layout.snapshots[snapName];
        previewingSnapshot = stateMap;
        updateGridVisuals();
    });

    btnDeleteSnapshot.addEventListener('click', () => {
        const snapName = savedSnapshotsSelect.value;
        if (!snapName) return alert('Please select a snapshot to delete.');
        if (!confirm('Are you sure you want to delete this snapshot?')) return;
        
        const activeName = savedLayoutsSelect.value;
        const layoutsObj = JSON.parse(localStorage.getItem('probelLayouts') || '{}');
        const layout = layoutsObj[activeName];
        
        if (layout && layout.snapshots && layout.snapshots[snapName]) {
            delete layout.snapshots[snapName];
            socket.emit('save_layout', { name: activeName, layout });
            updateSnapshotsDropdown(layout);
            alert('Snapshot deleted.');
        }
    });

    savedSnapshotsSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            snapshotNameInput.value = e.target.value;
        }
    });
}

} catch (err) {
    alert("FATAL ERROR:\\n" + err.message + "\\n" + err.stack);
}