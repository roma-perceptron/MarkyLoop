// MarkyLoop - YouTube Video Timecode Manager
// Main JavaScript file with YouTube API integration

class MarkyLoop {
    constructor() {
        this.player = null;
        this.timecodes = [
            {
                id: Date.now(),
                name: 'Разбор',
                start: 173,
                end: 212.5,
                mode: 0 // 0: A>B, 1: A<>B, 2: B>A
            },
            {
                id: Date.now() + 1,
                name: 'Базовый лик, счёт',
                start: 214.9,
                end: 219.75,
                mode: 1
            },
            {
                id: Date.now() + 2,
                name: 'Базовый лик',
                start: 217.65,
                end: 219.75,
                mode: 1
            },
            {
                id: Date.now() + 3,
                name: 'Джем',
                start: 62.65,
                end: 118.25,
                mode: 1
            },
        ];
        this.currentVideoId = '';
        this.videoTitle = 'MarkyLoop';
        this.activeLoop = null;
        this.timeUpdateInterval = null;
        
        this.initializeEventListeners();
    }

    // Initialize all event listeners
    initializeEventListeners() {
        // URL change button
        document.getElementById('changeUrlBtn').addEventListener('click', () => {
            this.showUrlModal();
        });

        // Load video button in modal
        document.getElementById('loadVideoBtn').addEventListener('click', () => {
            this.loadVideoFromUrl();
        });

        // Add timecode button
        document.getElementById('addTimecodeBtn').addEventListener('click', () => {
            this.addTimecode();
        });

        // Save button
        document.getElementById('saveBtn').addEventListener('click', (e) => {
            if (e.shiftKey) {
                this.saveAsFile();
            } else {
                this.saveToFile();
            }
        });

        // Load button
        document.getElementById('loadBtn').addEventListener('click', () => {
            document.getElementById('loadFile').click();
        });

        // Theme toggle button
        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Stop loop button
        document.getElementById('stopLoopBtn').addEventListener('click', () => {
            this.stopLoop();
            if (this.player && this.player.pauseVideo) {
                this.player.pauseVideo();
            }
        });

        // Speed slider
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.setPlaybackSpeed(speed);
            document.getElementById('speedValue').textContent = speed.toFixed(2) + 'x';
        });

        // Delete all confirmation
        document.getElementById('confirmDeleteAllBtn').addEventListener('click', () => {
            this.deleteAllTimecodes();
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteAllModal'));
            modal.hide();
        });

        // Menu toggle button
        document.getElementById('menuToggleBtn').addEventListener('click', () => {
            this.toggleSideMenu();
        });

        // Current time click to copy
        document.getElementById('currentTime').addEventListener('click', () => {
            this.copyCurrentTimeToClipboard();
        });

        // Refresh presets button
        document.getElementById('refreshPresetsBtn').addEventListener('click', () => {
            this.loadPresets();
        });

        // File input change
        document.getElementById('loadFile').addEventListener('change', (e) => {
            this.loadFromFile(e.target.files[0]);
        });

        // Enter key in URL input
        document.getElementById('videoUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadVideoFromUrl();
            }
        });
    }

    // Show URL input modal
    showUrlModal() {
        const modal = new bootstrap.Modal(document.getElementById('urlModal'));
        modal.show();
        
        // Set focus after modal is fully shown
        document.getElementById('urlModal').addEventListener('shown.bs.modal', () => {
            document.getElementById('videoUrl').focus();
        }, { once: true });
    }

    // Extract YouTube video ID from URL
    extractVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    // Load video from URL input
    loadVideoFromUrl() {
        const url = document.getElementById('videoUrl').value.trim();
        if (!url) {
            this.showAlert('Пожалуйста, введите URL видео', 'warning');
            return;
        }

        const videoId = this.extractVideoId(url);
        if (!videoId) {
            this.showAlert('Неверный URL YouTube видео', 'danger');
            return;
        }

        this.currentVideoId = videoId;
        this.loadVideo(videoId);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('urlModal'));
        modal.hide();
        
        // Clear input
        document.getElementById('videoUrl').value = '';
    }

    // Load YouTube video
    loadVideo(videoId, updateTitle = true) {
        if (this.player) {
            this.player.cueVideoById({
                videoId: videoId,
                suggestedQuality: 'small'  // hd1080
            });
            this.currentVideoId = videoId;
            
            // Update title after video is cued only if requested
            if (updateTitle) {
                setTimeout(() => {
                    this.updateVideoTitle();
                }, 1500);
            }
        } else {
            this.currentVideoId = videoId;
        }
    }

    // Get video title from YouTube API
    async getVideoTitle(videoId) {
        try {
            // Use YouTube Data API v3 (requires API key in production)
            // For now, we'll use the player's getVideoData method
            if (this.player && this.player.getVideoData) {
                const videoData = this.player.getVideoData();
                return videoData.title || 'Untitled Video';
            }
        } catch (error) {
            console.log('Could not fetch video title:', error);
        }
        return 'YouTube Video';
    }

    // Update video title
    async updateVideoTitle() {
        if (this.currentVideoId && this.player) {
            const title = await this.getVideoTitle(this.currentVideoId);
            this.videoTitle = title;
            this.updateTitleDisplay();
        }
    }

    // Update title display
    updateTitleDisplay() {
        const titleElement = document.getElementById('videoTitle');
        if (titleElement && !titleElement.classList.contains('editing')) {
            titleElement.textContent = this.videoTitle;
        }
    }

    // Add new timecode
    addTimecode() {
        const currentTime = this.player ? this.player.getCurrentTime() : 0;
        const lastTimecode = this.timecodes[this.timecodes.length - 1];
        
        const start = lastTimecode ? Math.max(lastTimecode.end + 1, currentTime) : currentTime;
        const end = start + 10; // Default 10 second duration
        
        const timecode = {
            id: Date.now(),
            name: `Метка ${this.timecodes.length + 1}`,
            start: parseFloat(start.toFixed(2)),
            end: parseFloat(end.toFixed(2)),
            mode: 0 // 0: A>B, 1: A<>B, 2: B>A
        };

        this.timecodes.push(timecode);
        this.renderTimecodes();
    }

    // Render all timecodes
    renderTimecodes() {
        const container = document.getElementById('timecodeTiles');
        container.innerHTML = '';

        this.timecodes.forEach(timecode => {
            const tile = this.createTimecodeTile(timecode);
            container.appendChild(tile);
        });
    }

    // Create timecode tile element
    createTimecodeTile(timecode) {
        const tile = document.createElement('div');
        tile.className = 'timecode-tile new';
        tile.innerHTML = `
            <button class="delete-btn" data-id="${timecode.id}">
                <i class="fas fa-times"></i>
            </button>
            <div class="tile-header">
                <div class="tile-title magic-text" data-field="name" data-id="${timecode.id}">
                    ${timecode.name}
                </div>
            </div>
            <div class="tile-times">
                <div>
                    Начало: <input type="number" class="time-input" 
                           data-field="start" data-id="${timecode.id}" 
                           value="${timecode.start}" step="0.01" min="0">
                </div>
                <div>
                    Конец: <input type="number" class="time-input" 
                          data-field="end" data-id="${timecode.id}" 
                          value="${timecode.end}" step="0.01" min="0">
                </div>
            </div>
            <div class="tile-controls">
                <button class="play-btn" data-id="${timecode.id}">
                    <i class="fas fa-play"></i> Играть
                </button>
                <button class="loop-btn mode-${timecode.mode}" data-id="${timecode.id}">
                    ${this.getModeIcon(timecode.mode)}
                </button>
            </div>
        `;

        // Add event listeners
        this.addTileEventListeners(tile, timecode.id);

        // Remove animation class after animation completes
        setTimeout(() => tile.classList.remove('new'), 300);

        return tile;
    }

    // Add event listeners to tile elements
    addTileEventListeners(tile, timecodeId) {
        // Delete button
        tile.querySelector('.delete-btn').addEventListener('click', (e) => {
            if (e.shiftKey) {
                this.showDeleteAllModal();
            } else {
                this.deleteTimecode(timecodeId);
            }
        });

        // Play button
        tile.querySelector('.play-btn').addEventListener('click', () => {
            this.playTimecode(timecodeId);
        });

        // Loop button
        tile.querySelector('.loop-btn').addEventListener('click', () => {
            this.toggleMode(timecodeId);
        });

        // Time inputs
        tile.querySelectorAll('.time-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateTimecodeField(timecodeId, e.target.dataset.field, parseFloat(e.target.value));
            });
        });

        // Magic text for name editing
        const nameElement = tile.querySelector('.magic-text');
        this.initializeMagicText(nameElement);
    }

    // Delete timecode
    deleteTimecode(id) {
        this.timecodes = this.timecodes.filter(tc => tc.id !== id);
        this.renderTimecodes();
        
        // Stop loop if this timecode was active
        if (this.activeLoop && this.activeLoop.id === id) {
            this.stopLoop();
        }
    }

    // Show delete all modal
    showDeleteAllModal() {
        const modal = new bootstrap.Modal(document.getElementById('deleteAllModal'));
        modal.show();
    }

    // Delete all timecodes
    deleteAllTimecodes() {
        this.timecodes = [];
        this.stopLoop();
        this.renderTimecodes();
        this.showAlert('Все метки удалены', 'success');
    }

    // Play timecode
    playTimecode(id) {
        const timecode = this.timecodes.find(tc => tc.id === id);
        if (!timecode || !this.player) return;

        this.stopLoop();
        
        switch(timecode.mode) {
            case 0: // A>B - Simple mode
                this.player.seekTo(timecode.start, true);
                this.player.playVideo();
                this.startSimplePlayback(timecode);
                break;
            case 1: // A<>B - Loop mode
                this.player.seekTo(timecode.start, true);
                this.player.playVideo();
                this.startLoop(timecode);
                break;
            case 2: // B>A - Practice mode
                this.startPracticeMode(timecode);
                break;
        }
    }

    // Get mode icon
    getModeIcon(mode) {
        switch(mode) {
            case 0: return 'A→B'; // Simple mode
            case 1: return 'A↩B'; // Loop mode
            case 2: return 'B↩A'; // Practice mode
            default: return 'A→B';
        }
    }

    // Toggle playback mode
    toggleMode(id) {
        const timecode = this.timecodes.find(tc => tc.id === id);
        if (!timecode) return;

        timecode.mode = (timecode.mode + 1) % 3;
        
        // Update button appearance
        const button = document.querySelector(`[data-id="${id}"].loop-btn`);
        if (button) {
            button.className = `loop-btn mode-${timecode.mode}`;
            button.innerHTML = this.getModeIcon(timecode.mode);
        }

        // Stop current loop if changing mode
        if (this.activeLoop && this.activeLoop.id === id) {
            this.stopLoop();
        }
    }

    // Start simple playback (A>B)
    startSimplePlayback(timecode) {
        this.activeLoop = timecode;
        
        const checkTime = () => {
            if (!this.activeLoop || this.activeLoop.id !== timecode.id) return;
            
            if (this.player && this.player.getCurrentTime) {
                const currentTime = this.player.getCurrentTime();
                if (currentTime >= timecode.end) {
                    this.player.pauseVideo();
                    this.stopLoop();
                    return;
                }
            }
            
            setTimeout(checkTime, 50);
        };
        
        setTimeout(checkTime, 50);
    }

    // Start practice mode (B>A)
    startPracticeMode(timecode) {
        this.activeLoop = timecode;
        let practicePhase = 'ending'; // 'ending' or 'beginning'
        
        const playEndingPhase = () => {
            const startPos = Math.max(timecode.start, timecode.end - 2);
            this.player.seekTo(startPos, true);
            this.player.playVideo();
            practicePhase = 'ending';
        };
        
        const playBeginningPhase = () => {
            this.player.seekTo(timecode.start, true);
            this.player.playVideo();
            practicePhase = 'beginning';
        };
        
        const checkPracticeTime = () => {
            if (!this.activeLoop || this.activeLoop.id !== timecode.id) return;
            
            const currentTime = this.player.getCurrentTime();
            
            if (practicePhase === 'ending' && currentTime >= timecode.end) {
                playBeginningPhase();
            } else if (practicePhase === 'beginning' && currentTime >= timecode.start + 2) {
                playEndingPhase();
            }
            
            if (this.activeLoop) {
                setTimeout(checkPracticeTime, 50);
            }
        };
        
        playEndingPhase();
        setTimeout(checkPracticeTime, 50);
    }

    // Start looping a timecode (A<>B)
    startLoop(timecode) {
        this.activeLoop = timecode;
        
        const checkLoop = () => {
            if (!this.activeLoop || this.activeLoop.id !== timecode.id) return;
            
            const currentTime = this.player.getCurrentTime();
            if (currentTime >= timecode.end || currentTime < timecode.start) {
                this.player.seekTo(timecode.start, true);
                if (this.player.getPlayerState() !== YT.PlayerState.PLAYING) {
                    this.player.playVideo();
                }
            }
            
            if (this.activeLoop) {
                setTimeout(checkLoop, 50);
            }
        };
        
        setTimeout(checkLoop, 50);
    }

    // Stop current loop
    stopLoop() {
        this.activeLoop = null;
    }
    updateTimecodeField(id, field, value) {
        const timecode = this.timecodes.find(tc => tc.id === id);
        if (timecode) {
            timecode[field] = value;
            
            // Ensure end time is after start time
            if (field === 'start' && timecode.end <= timecode.start) {
                timecode.end = timecode.start + 1;
                const endInput = document.querySelector(`[data-id="${id}"][data-field="end"]`);
                if (endInput) endInput.value = timecode.end;
            } else if (field === 'end' && timecode.end <= timecode.start) {
                timecode.start = Math.max(0, timecode.end - 1);
                const startInput = document.querySelector(`[data-id="${id}"][data-field="start"]`);
                if (startInput) startInput.value = timecode.start;
            }
        }
    }

    // Initialize magic text editing
    initializeMagicText(element) {
        element.addEventListener('dblclick', () => {
            if (element.classList.contains('editing')) return;

            const currentText = element.textContent;
            element.classList.add('editing');
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'magic-text-input';
            input.value = currentText;
            
            element.textContent = '';
            element.appendChild(input);
            input.focus();
            input.select();

            const finishEditing = () => {
                const newText = input.value.trim() || currentText;
                element.classList.remove('editing');
                element.textContent = newText;
                
                // Update data if this is a timecode name
                const id = parseInt(element.dataset.id);
                const field = element.dataset.field;
                if (id && field) {
                    this.updateTimecodeField(id, field, newText);
                } else if (element.id === 'videoTitle') {
                    this.videoTitle = newText;
                }
            };

            input.addEventListener('blur', finishEditing);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
        });
    }

    // Start time update interval
    startTimeUpdate() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }

        this.timeUpdateInterval = setInterval(() => {
            if (this.player && this.player.getCurrentTime) {
                const currentTime = this.player.getCurrentTime();
                document.getElementById('currentTime').textContent = currentTime.toFixed(2);
            }
        }, 1);
    }

    // Stop time update interval
    stopTimeUpdate() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
    }

    // Save data to file
    saveToFile() {
        const data = {
            videoId: this.currentVideoId,
            title: this.videoTitle,
            timecodes: this.timecodes
        };

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create filename from title
        const filename = this.transliterate(this.videoTitle) + '.MarkyLoop';
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        
        // Cleanup
        URL.revokeObjectURL(link.href);
        
        this.showAlert('Файл сохранен', 'success');
    }

    // Save as (with file picker)
    saveAsFile() {
        if ('showSaveFilePicker' in window) {
            // Use modern File System Access API if available
            this.saveWithFilePicker();
        } else {
            // Fallback to regular download
            this.saveToFile();
            this.showAlert('Shift+Сохранить не поддерживается в этом браузере', 'warning');
        }
    }

    // Save with file picker (modern browsers)
    async saveWithFilePicker() {
        try {
            const data = {
                videoId: this.currentVideoId,
                title: this.videoTitle,
                timecodes: this.timecodes
            };

            const jsonString = JSON.stringify(data, null, 2);
            const filename = this.transliterate(this.videoTitle) + '.MarkyLoop';

            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'MarkyLoop files',
                    accept: { 'application/json': ['.MarkyLoop'] }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();

            this.showAlert('Файл сохранен', 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Save error:', error);
                this.showAlert('Ошибка сохранения файла', 'danger');
            }
        }
    }

    // Load data from file
    loadFromFile(file) {
        if (!file) return;

        if (!file.name.endsWith('.MarkyLoop')) {
            this.showAlert('Неверный формат файла. Ожидается .MarkyLoop', 'danger');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.loadData(data);
                this.showAlert('Файл загружен успешно', 'success');
            } catch (error) {
                this.showAlert('Ошибка при чтении файла', 'danger');
                console.error('File load error:', error);
            }
        };
        reader.readAsText(file);
    }

    // Load data into application
    loadData(data) {
        if (data.videoId) {
            this.currentVideoId = data.videoId;
            this.loadVideo(data.videoId, false);
        }
        
        if (data.title) {
            this.videoTitle = data.title;
            this.updateTitleDisplay();
        }
        
        if (data.timecodes && Array.isArray(data.timecodes)) {
            this.timecodes = data.timecodes;
            this.renderTimecodes();
        }
        
        // Stop any active loops
        this.stopLoop();
    }

    // Transliterate text for filename
    transliterate(text) {
        const translitMap = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
            'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };

        return text.toLowerCase()
            .split('')
            .map(char => translitMap[char] || char)
            .join('')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    // Show alert message
    showAlert(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toastDiv = document.createElement('div');
        toastDiv.id = toastId;
        toastDiv.className = `toast align-items-center text-bg-${type} border-0`;
        toastDiv.setAttribute('role', 'alert');
        toastDiv.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toastDiv);

        // Initialize and show toast
        const toast = new bootstrap.Toast(toastDiv, {
            autohide: true,
            delay: 3000
        });
        toast.show();

        // Remove toast element after it's hidden
        toastDiv.addEventListener('hidden.bs.toast', () => {
            toastDiv.remove();
        });
    }

    // Initialize player when YouTube API is ready
    initializePlayer() {
        this.player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: this.currentVideoId || 'F021LjyDAmE', // Default video
            playerVars: {
                autoplay: 0,
                controls: 1,
                rel: 0,
                showinfo: 0,
                modestbranding: 1,
                fs: 1,
                cc_load_policy: 0,
                iv_load_policy: 3,
                autohide: 0
            },
            events: {
                'onReady': (event) => {
                    console.log('YouTube player ready');
                    this.startTimeUpdate();
                    this.updateVideoTitle();
                    this.renderTimecodes(); // Render default timecode
                    this.loadPresets(); // Load presets on startup
                },
                'onStateChange': (event) => {
                    if (event.data === YT.PlayerState.PLAYING) {
                        this.startTimeUpdate();
                    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                        // Continue time updates even when paused for precision
                    }
                }
            }
        });

        // Initialize magic text for title
        const titleElement = document.getElementById('videoTitle');
        this.initializeMagicText(titleElement);
    }

    // Toggle side menu
    toggleSideMenu() {
        const sideMenu = document.getElementById('sideMenu');
        const mainContainer = document.querySelector('.main-container');
        
        sideMenu.classList.toggle('open');
        mainContainer.classList.toggle('menu-open');
    }

    // Copy current time to clipboard
    copyCurrentTimeToClipboard() {
        const currentTime = document.getElementById('currentTime').textContent;
        navigator.clipboard.writeText(currentTime).then(() => {
            this.showAlert('Время скопировано: ' + currentTime, 'success');
        }).catch(() => {
            this.showAlert('Ошибка копирования', 'danger');
        });
    }

    // Set playback speed
    setPlaybackSpeed(speed) {
        if (this.player && this.player.setPlaybackRate) {
            this.player.setPlaybackRate(speed);
        }
    }

    // Load presets from presets folder
    async loadPresets() {
        const presetsList = document.getElementById('presetsList');
        
        // Check if File System Access API is supported
        if ('showDirectoryPicker' in window) {
            // Modern browser - show directory picker button
            presetsList.innerHTML = `
                <div class="text-center">
                    <button class="btn btn-primary" id="selectPresetsFolder">
                        <i class="fas fa-folder-open me-2"></i>
                        Выбрать папку пресетов
                    </button>
                </div>
            `;
            
            document.getElementById('selectPresetsFolder').addEventListener('click', () => {
                this.selectPresetsFolder();
            });
        } else {
            // Fallback for browsers without File System Access API
            presetsList.innerHTML = `
                <div class="text-center">
                    <input type="file" id="presetFileInput" multiple accept=".MarkyLoop" style="display: none;">
                    <button class="btn btn-secondary" onclick="document.getElementById('presetFileInput').click()">
                        <i class="fas fa-upload me-2"></i>
                        Загрузить пресеты
                    </button>
                    <div class="text-muted mt-2 small">Можно выбрать несколько файлов</div>
                </div>
            `;
            
            document.getElementById('presetFileInput').addEventListener('change', (e) => {
                this.loadMultiplePresets(e.target.files);
            });
        }
    }
    
    // Select presets folder using File System Access API
    async selectPresetsFolder() {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const presets = [];
            
            for await (const [name, handle] of dirHandle.entries()) {
                if (handle.kind === 'file' && name.endsWith('.MarkyLoop')) {
                    presets.push({ name, handle });
                }
            }
            
            this.renderPresetsList(presets);
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error selecting folder:', error);
                this.showAlert('Ошибка выбора папки', 'danger');
            }
        }
    }
    
    // Load multiple preset files (fallback method)
    loadMultiplePresets(files) {
        const presets = Array.from(files)
            .filter(file => file.name.endsWith('.MarkyLoop'))
            .map(file => ({ name: file.name, file }));
            
        this.renderPresetsList(presets, true);
    }
    
    // Render presets list
    renderPresetsList(presets, isFileList = false) {
        const presetsList = document.getElementById('presetsList');
        
        if (presets.length === 0) {
            presetsList.innerHTML = '<div class="text-muted text-center">Пресеты не найдены</div>';
            return;
        }
        
        presetsList.innerHTML = '';
        presets.forEach(preset => {
            const presetButton = document.createElement('button');
            presetButton.className = 'preset-item';
            presetButton.textContent = preset.name.replace('.MarkyLoop', '');
            presetButton.addEventListener('click', () => {
                if (isFileList) {
                    this.loadPresetFromFile(preset.file);
                } else {
                    this.loadPresetFromHandle(preset.handle);
                }
            });
            presetsList.appendChild(presetButton);
        });
    }
    
    // Load preset from file handle
    async loadPresetFromHandle(fileHandle) {
        try {
            const file = await fileHandle.getFile();
            const jsonText = await file.text();
            const data = JSON.parse(jsonText);
            this.loadData(data);
            this.showAlert(`Пресет загружен: ${fileHandle.name.replace('.MarkyLoop', '')}`, 'success');
        } catch (error) {
            console.error('Error loading preset:', error);
            this.showAlert('Ошибка загрузки пресета', 'danger');
        }
    }
    
    // Load preset from file object
    async loadPresetFromFile(file) {
        try {
            const jsonText = await file.text();
            const data = JSON.parse(jsonText);
            this.loadData(data);
            this.showAlert(`Пресет загружен: ${file.name.replace('.MarkyLoop', '')}`, 'success');
        } catch (error) {
            console.error('Error loading preset:', error);
            this.showAlert('Ошибка загрузки пресета', 'danger');
        }
    }
    toggleTheme() {
        const html = document.documentElement;
        const button = document.getElementById('themeToggleBtn');
        const icon = button.querySelector('i');
        
        html.classList.toggle('dark-theme');
        
        // Change icon based on theme
        if (html.classList.contains('dark-theme')) {
            icon.className = 'fas fa-sun'; // Sun icon for dark theme
        } else {
            icon.className = 'fas fa-moon'; // Moon icon for light theme
        }
    }
}

// Initialize application when YouTube API is ready
let markyLoop;

function onYouTubeIframeAPIReady() {
    markyLoop = new MarkyLoop();
    markyLoop.initializePlayer();
}

// Initialize if API is already loaded
if (window.YT && window.YT.Player) {
    onYouTubeIframeAPIReady();
}
