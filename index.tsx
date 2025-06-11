/**
 * CROSSWORD MASTER v1.0
 * Système de mots croisés éducatifs interactifs
 */

// --- Interfaces ---
interface WordEntry {
    id: string;
    word: string;
    definition: string;
    direction: 'horizontal' | 'vertical';
    startRow?: number;
    startCol?: number;
    number?: number;
}

interface CrosswordPuzzle {
    id: string;
    title: string;
    theme: string;
    words: WordEntry[];
    grid?: GridCell[][];
    createdAt: string;
}

interface GridCell {
    letter: string | null;
    number: number | null;
    isBlocked: boolean;
    userLetter?: string;
    isCorrect?: boolean;
}

interface CompletedPuzzle {
    puzzleId: string;
    completed: boolean;
    score: number;
    completedAt: string;
}

// --- App State ---
type AppMode = 'welcome' | 'createPuzzle' | 'puzzleList' | 'solvePuzzle' | 'puzzleComplete' | 'loading';

interface AppState {
    mode: AppMode;
    puzzles: CrosswordPuzzle[];
    currentPuzzle: CrosswordPuzzle | null;
    userAnswers: Map<string, string>;
    score: number;
    startTime: number | null;
    errorMessage: string | null;
    studentAccessMode: boolean;
    completedPuzzles: CompletedPuzzle[];
}

const appState: AppState = {
    mode: 'welcome',
    puzzles: [],
    currentPuzzle: null,
    userAnswers: new Map(),
    score: 0,
    startTime: null,
    errorMessage: null,
    studentAccessMode: false,
    completedPuzzles: []
};

// --- localStorage Functions ---
const STORAGE_KEY = 'crossword_master_puzzles';
const COMPLETED_KEY = 'crossword_master_completed';

function savePuzzlesToStorage(puzzles: CrosswordPuzzle[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
        console.log("Crossword Master: Puzzles saved to localStorage");
    } catch (error) {
        console.error("Crossword Master: Failed to save puzzles:", error);
    }
}

function loadPuzzlesFromStorage(): CrosswordPuzzle[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error("Crossword Master: Failed to load puzzles:", error);
    }
    return [];
}

function saveCompletedPuzzles(completed: CompletedPuzzle[]) {
    try {
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
    } catch (error) {
        console.error("Crossword Master: Failed to save completed puzzles:", error);
    }
}

function loadCompletedPuzzles(): CompletedPuzzle[] {
    try {
        const stored = localStorage.getItem(COMPLETED_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error("Crossword Master: Failed to load completed puzzles:", error);
    }
    return [];
}

function addPuzzleToStorage(puzzle: CrosswordPuzzle) {
    const existingPuzzles = loadPuzzlesFromStorage();
    existingPuzzles.push(puzzle);
    savePuzzlesToStorage(existingPuzzles);
}

// --- DOM Elements ---
const appRoot = document.getElementById('app-root') as HTMLDivElement;

// --- Utility Functions ---
function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// --- Grid Generation Algorithm (Basic) ---
function generateGrid(words: WordEntry[]): GridCell[][] {
    // Pour l'instant, on crée une grille simple 15x15
    // L'algorithme de placement optimal sera amélioré plus tard
    const gridSize = 15;
    const grid: GridCell[][] = Array(gridSize).fill(null).map(() => 
        Array(gridSize).fill(null).map(() => ({
            letter: null,
            number: null,
            isBlocked: false
        }))
    );

    // Placement basique pour démonstration
    // TODO: Implémenter l'algorithme de placement intelligent
    let currentNumber = 1;
    let currentRow = 1;
    let currentCol = 1;

    words.forEach((wordEntry, index) => {
        if (wordEntry.word.length <= gridSize - currentCol) {
            // Placement horizontal
            wordEntry.startRow = currentRow;
            wordEntry.startCol = currentCol;
            wordEntry.number = currentNumber++;
            wordEntry.direction = 'horizontal';

            for (let i = 0; i < wordEntry.word.length; i++) {
                if (currentRow < gridSize && currentCol + i < gridSize) {
                    grid[currentRow][currentCol + i] = {
                        letter: wordEntry.word[i].toUpperCase(),
                        number: i === 0 ? wordEntry.number : null,
                        isBlocked: false
                    };
                }
            }
            currentRow += 2; // Espace entre les mots
            if (currentRow >= gridSize - 1) {
                currentRow = 1;
                currentCol += 8;
            }
        }
    });

    return grid;
}

// --- Rendering Functions ---
function renderHeader() {
    const header = document.createElement('header');
    header.className = 'app-header';
    
    const headerContent = document.createElement('div');
    headerContent.className = 'header-content';
    
    const logoSection = document.createElement('div');
    logoSection.className = 'logo-section';
    
    // Placeholder pour le logo
    const logoPlaceholder = document.createElement('div');
    logoPlaceholder.className = 'logo-placeholder';
    logoPlaceholder.textContent = 'LOGO';
    
    const title = document.createElement('h1');
    title.textContent = 'Crossword Master';
    title.className = 'app-title';
    
    logoSection.appendChild(logoPlaceholder);
    logoSection.appendChild(title);
    
    if (appState.studentAccessMode && appState.currentPuzzle) {
        const studentMode = document.createElement('span');
        studentMode.className = 'student-mode';
        studentMode.textContent = `Mode Étudiant : ${appState.currentPuzzle.title}`;
        logoSection.appendChild(studentMode);
    }
    
    headerContent.appendChild(logoSection);
    header.appendChild(headerContent);
    
    return header;
}

function clearAppRoot() {
    if (appRoot) {
        appRoot.innerHTML = '';
        appRoot.appendChild(renderHeader());
    }
}

function renderErrorMessage() {
    if (appState.errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = appState.errorMessage;
        const screenContent = appRoot.querySelector('.screen');
        if (screenContent) {
            screenContent.prepend(errorDiv);
        }
    }
}

function clearErrorMessage() {
    appState.errorMessage = null;
    const errorDiv = appRoot.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function navigateTo(mode: AppMode) {
    console.log(`Navigating to: ${mode}`);
    appState.mode = mode;
    clearErrorMessage();
    renderApp();
}

function renderWelcomeScreen() {
    clearAppRoot();
    const screen = document.createElement('div');
    screen.className = 'screen welcome-screen';

    if (appState.studentAccessMode && appState.currentPuzzle === null) {
        const studentErrorMsg = document.createElement('p');
        studentErrorMsg.textContent = "Si vous êtes un étudiant, veuillez vérifier le lien du puzzle qui vous a été fourni.";
        studentErrorMsg.className = 'student-error';
        screen.appendChild(studentErrorMsg);
    } else if (!appState.studentAccessMode) {
        const intro = document.createElement('div');
        intro.className = 'welcome-intro';
        
        const title = document.createElement('h2');
        title.textContent = 'Créez et partagez des mots croisés éducatifs';
        
        const description = document.createElement('p');
        description.textContent = 'Outil professionnel pour créer des mots croisés interactifs pour vos élèves ou testez vos connaissances.';
        
        intro.appendChild(title);
        intro.appendChild(description);
        screen.appendChild(intro);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const createButton = document.createElement('button');
        createButton.textContent = 'Créer un nouveau Puzzle';
        createButton.className = 'btn btn-primary';
        createButton.onclick = () => navigateTo('createPuzzle');

        const solveButton = document.createElement('button');
        solveButton.textContent = 'Résoudre un Puzzle';
        solveButton.className = 'btn btn-secondary';
        solveButton.onclick = () => navigateTo('puzzleList');

        buttonContainer.appendChild(createButton);
        buttonContainer.appendChild(solveButton);
        screen.appendChild(buttonContainer);
    }

    appRoot.appendChild(screen);
    renderErrorMessage();
}

function renderCreatePuzzleScreen() {
    clearAppRoot();
    const screen = document.createElement('div');
    screen.className = 'screen create-puzzle-screen';

    const title = document.createElement('h2');
    title.textContent = 'Créer un nouveau Puzzle';
    screen.appendChild(title);

    const form = document.createElement('form');
    form.className = 'puzzle-form';
    form.onsubmit = (e) => {
        e.preventDefault();
        handleSavePuzzle(form);
    };

    // Informations générales
    const infoSection = document.createElement('div');
    infoSection.className = 'form-section';
    
    const infoTitle = document.createElement('h3');
    infoTitle.textContent = 'Informations générales';
    infoSection.appendChild(infoTitle);

    const titleGroup = document.createElement('div');
    titleGroup.className = 'form-group';
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Titre du puzzle :';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.name = 'puzzleTitle';
    titleInput.required = true;
    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);

    const themeGroup = document.createElement('div');
    themeGroup.className = 'form-group';
    const themeLabel = document.createElement('label');
    themeLabel.textContent = 'Thématique :';
    const themeInput = document.createElement('input');
    themeInput.type = 'text';
    themeInput.name = 'puzzleTheme';
    themeInput.placeholder = 'ex: Cybersécurité, Leadership...';
    themeInput.required = true;
    themeGroup.appendChild(themeLabel);
    themeGroup.appendChild(themeInput);

    infoSection.appendChild(titleGroup);
    infoSection.appendChild(themeGroup);
    form.appendChild(infoSection);

    // Section mots
    const wordsSection = document.createElement('div');
    wordsSection.className = 'form-section';
    
    const wordsTitle = document.createElement('h3');
    wordsTitle.textContent = 'Mots et définitions';
    wordsSection.appendChild(wordsTitle);

    const wordsContainer = document.createElement('div');
    wordsContainer.id = 'words-container';
    wordsContainer.className = 'words-container';
    wordsSection.appendChild(wordsContainer);

    const addWordButton = document.createElement('button');
    addWordButton.type = 'button';
    addWordButton.textContent = 'Ajouter un mot';
    addWordButton.className = 'btn btn-secondary add-word-btn';
    addWordButton.onclick = () => addWordEntry(wordsContainer);
    wordsSection.appendChild(addWordButton);

    form.appendChild(wordsSection);

    // Ajout du premier mot par défaut
    addWordEntry(wordsContainer);

    // Boutons de contrôle
    const controlsSection = document.createElement('div');
    controlsSection.className = 'form-controls';

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Créer le puzzle';
    saveButton.className = 'btn btn-primary';

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.textContent = 'Retour';
    backButton.className = 'btn btn-secondary';
    backButton.onclick = () => navigateTo('welcome');

    controlsSection.appendChild(saveButton);
    controlsSection.appendChild(backButton);
    form.appendChild(controlsSection);

    screen.appendChild(form);
    appRoot.appendChild(screen);
    renderErrorMessage();
}

function addWordEntry(container: HTMLElement) {
    const wordId = generateId();
    const wordEntry = document.createElement('div');
    wordEntry.className = 'word-entry';
    wordEntry.dataset.wordId = wordId;

    const wordGroup = document.createElement('div');
    wordGroup.className = 'word-group';

    const wordLabel = document.createElement('label');
    wordLabel.textContent = 'Mot :';
    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.name = `word-${wordId}`;
    wordInput.placeholder = 'EXEMPLE';
    wordInput.required = true;
    wordInput.style.textTransform = 'uppercase';
    wordInput.oninput = (e) => {
        (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase();
    };

    const definitionLabel = document.createElement('label');
    definitionLabel.textContent = 'Définition :';
    const definitionInput = document.createElement('textarea');
    definitionInput.name = `definition-${wordId}`;
    definitionInput.placeholder = 'Définition ou question pour ce mot...';
    definitionInput.required = true;
    definitionInput.rows = 2;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = '×';
    removeButton.className = 'btn btn-remove';
    removeButton.onclick = () => {
        if (container.children.length > 1) {
            wordEntry.remove();
        } else {
            appState.errorMessage = "Un puzzle doit contenir au moins un mot.";
            renderErrorMessage();
        }
    };

    wordGroup.appendChild(wordLabel);
    wordGroup.appendChild(wordInput);
    wordGroup.appendChild(definitionLabel);
    wordGroup.appendChild(definitionInput);
    wordGroup.appendChild(removeButton);

    wordEntry.appendChild(wordGroup);
    container.appendChild(wordEntry);
}

function renderPuzzleListScreen() {
    clearAppRoot();
    const screen = document.createElement('div');
    screen.className = 'screen puzzle-list-screen';

    const title = document.createElement('h2');
    title.textContent = 'Choisissez un Puzzle';
    screen.appendChild(title);

    if (appState.puzzles.length === 0) {
        const noPuzzlesMessage = document.createElement('div');
        noPuzzlesMessage.className = 'no-puzzles';
        noPuzzlesMessage.innerHTML = `
            <p>Aucun puzzle disponible pour le moment.</p>
            <button class="btn btn-primary" onclick="navigateTo('createPuzzle')">Créer le premier puzzle</button>
        `;
        screen.appendChild(noPuzzlesMessage);
    } else {
        const puzzleGrid = document.createElement('div');
        puzzleGrid.className = 'puzzle-grid';

        appState.puzzles.forEach(puzzle => {
            const puzzleCard = document.createElement('div');
            puzzleCard.className = 'puzzle-card';

            const isCompleted = appState.completedPuzzles.some(cp => cp.puzzleId === puzzle.id);
            if (isCompleted) {
                puzzleCard.classList.add('completed');
            }

            puzzleCard.innerHTML = `
                <div class="puzzle-card-header">
                    <h3>${puzzle.title}</h3>
                    <span class="puzzle-theme">${puzzle.theme}</span>
                </div>
                <div class="puzzle-card-content">
                    <p>${puzzle.words.length} mots</p>
                    <p>Créé le ${new Date(puzzle.createdAt).toLocaleDateString()}</p>
                    ${isCompleted ? '<span class="completed-badge">✓ Terminé</span>' : ''}
                </div>
                <div class="puzzle-card-actions">
                    <button class="btn btn-primary solve-btn" data-puzzle-id="${puzzle.id}">
                        ${isCompleted ? 'Refaire' : 'Résoudre'}
                    </button>
                    <button class="btn btn-secondary share-btn" data-puzzle-id="${puzzle.id}">Partager</button>
                </div>
            `;

            // Event listeners
            const solveBtn = puzzleCard.querySelector('.solve-btn') as HTMLButtonElement;
            const shareBtn = puzzleCard.querySelector('.share-btn') as HTMLButtonElement;

            solveBtn.onclick = () => startPuzzle(puzzle.id);
            shareBtn.onclick = () => showShareModal(puzzle);

            puzzleGrid.appendChild(puzzleCard);
        });

        screen.appendChild(puzzleGrid);
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Retour à l\'accueil';
    backButton.className = 'btn btn-secondary back-btn';
    backButton.onclick = () => navigateTo('welcome');
    screen.appendChild(backButton);

    appRoot.appendChild(screen);
    renderErrorMessage();
}

function renderSolvePuzzleScreen() {
    clearAppRoot();
    const screen = document.createElement('div');
    screen.className = 'screen solve-puzzle-screen';

    if (!appState.currentPuzzle) {
        navigateTo(appState.studentAccessMode ? 'welcome' : 'puzzleList');
        return;
    }

    const header = document.createElement('div');
    header.className = 'puzzle-header';

    const titleSection = document.createElement('div');
    titleSection.className = 'puzzle-title-section';
    const title = document.createElement('h2');
    title.textContent = appState.currentPuzzle.title;
    const theme = document.createElement('p');
    theme.textContent = `Thème : ${appState.currentPuzzle.theme}`;
    theme.className = 'puzzle-theme';
    titleSection.appendChild(title);
    titleSection.appendChild(theme);

    const statsSection = document.createElement('div');
    statsSection.className = 'puzzle-stats';
    const timer = document.createElement('div');
    timer.className = 'timer';
    timer.textContent = '00:00';
    const score = document.createElement('div');
    score.className = 'score';
    score.textContent = `Score: ${appState.score}`;
    statsSection.appendChild(timer);
    statsSection.appendChild(score);

    header.appendChild(titleSection);
    header.appendChild(statsSection);
    screen.appendChild(header);

    // Grille et définitions
    const puzzleContent = document.createElement('div');
    puzzleContent.className = 'puzzle-content';

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid-container';
    gridContainer.appendChild(renderGrid());

    const cluesContainer = document.createElement('div');
    cluesContainer.className = 'clues-container';
    cluesContainer.appendChild(renderClues());

    puzzleContent.appendChild(gridContainer);
    puzzleContent.appendChild(cluesContainer);
    screen.appendChild(puzzleContent);

    // Contrôles
    const controls = document.createElement('div');
    controls.className = 'puzzle-controls';

    const checkButton = document.createElement('button');
    checkButton.textContent = 'Vérifier';
    checkButton.className = 'btn btn-primary';
    checkButton.onclick = checkAnswers;

    const quitButton = document.createElement('button');
    quitButton.textContent = 'Quitter';
    quitButton.className = 'btn btn-secondary';
    quitButton.onclick = () => {
        if (confirm('Êtes-vous sûr de vouloir quitter ? Votre progression sera perdue.')) {
            navigateTo(appState.studentAccessMode ? 'welcome' : 'puzzleList');
        }
    };

    controls.appendChild(checkButton);
    controls.appendChild(quitButton);
    screen.appendChild(controls);

    appRoot.appendChild(screen);
    renderErrorMessage();

    // Démarrer le timer
    if (!appState.startTime) {
        appState.startTime = Date.now();
        startTimer();
    }
}

function renderGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'crossword-grid';

    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) {
        return grid;
    }

    appState.currentPuzzle.grid.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.className = 'grid-cell';
            
            if (cell.isBlocked) {
                cellElement.classList.add('blocked');
            } else if (cell.letter) {
                cellElement.classList.add('active');
                
                if (cell.number) {
                    const numberElement = document.createElement('span');
                    numberElement.className = 'cell-number';
                    numberElement.textContent = cell.number.toString();
                    cellElement.appendChild(numberElement);
                }

                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 1;
                input.value = cell.userLetter || '';
                input.dataset.row = rowIndex.toString();
                input.dataset.col = colIndex.toString();
                input.oninput = (e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.toUpperCase();
                    updateUserAnswer(rowIndex, colIndex, target.value);
                };
                cellElement.appendChild(input);
            }

            grid.appendChild(cellElement);
        });
    });

    return grid;
}

function renderClues(): HTMLElement {
    const cluesContainer = document.createElement('div');
    cluesContainer.className = 'clues';

    if (!appState.currentPuzzle) {
        return cluesContainer;
    }

    const horizontalClues = document.createElement('div');
    horizontalClues.className = 'clues-section';
    horizontalClues.innerHTML = '<h3>Horizontal</h3>';

    const verticalClues = document.createElement('div');
    verticalClues.className = 'clues-section';
    verticalClues.innerHTML = '<h3>Vertical</h3>';

    const horizontalList = document.createElement('ol');
    const verticalList = document.createElement('ol');

    appState.currentPuzzle.words.forEach(word => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span class="clue-number">${word.number}.</span> ${word.definition}`;
        
        if (word.direction === 'horizontal') {
            horizontalList.appendChild(listItem);
        } else {
            verticalList.appendChild(listItem);
        }
    });

    horizontalClues.appendChild(horizontalList);
    verticalClues.appendChild(verticalList);

    cluesContainer.appendChild(horizontalClues);
    cluesContainer.appendChild(verticalClues);

    return cluesContainer;
}

// --- Event Handlers ---
function handleSavePuzzle(form: HTMLFormElement) {
    clearErrorMessage();
    const formData = new FormData(form);
    
    const title = formData.get('puzzleTitle') as string;
    const theme = formData.get('puzzleTheme') as string;

    if (!title?.trim() || !theme?.trim()) {
        appState.errorMessage = "Le titre et la thématique sont obligatoires.";
        renderErrorMessage();
        return;
    }

    const words: WordEntry[] = [];
    const wordEntries = form.querySelectorAll('.word-entry');

    try {
        wordEntries.forEach(entry => {
            const wordId = (entry as HTMLElement).dataset.wordId!;
            const word = formData.get(`word-${wordId}`) as string;
            const definition = formData.get(`definition-${wordId}`) as string;

            if (!word?.trim() || !definition?.trim()) {
                throw new Error("Tous les mots et définitions doivent être renseignés.");
            }

            words.push({
                id: wordId,
                word: word.trim().toUpperCase(),
                definition: definition.trim(),
                direction: 'horizontal' // Sera déterminé par l'algorithme
            });
        });

        if (words.length === 0) {
            throw new Error("Le puzzle doit contenir au moins un mot.");
        }

        const puzzle: CrosswordPuzzle = {
            id: generateId(),
            title: title.trim(),
            theme: theme.trim(),
            words: words,
            createdAt: new Date().toISOString()
        };

        // Générer la grille
        puzzle.grid = generateGrid(words);

        // Sauvegarder
        appState.puzzles.push(puzzle);
        addPuzzleToStorage(puzzle);

        navigateTo('puzzleList');

    } catch (error: any) {
        appState.errorMessage = error.message || "Erreur lors de la création du puzzle.";
        renderErrorMessage();
    }
}

function startPuzzle(puzzleId: string) {
    const puzzle = appState.puzzles.find(p => p.id === puzzleId);
    if (puzzle) {
        appState.currentPuzzle = JSON.parse(JSON.stringify(puzzle));
        appState.userAnswers.clear();
        appState.score = 0;
        appState.startTime = null;
        
        // Initialiser la grille utilisateur
        if (appState.currentPuzzle.grid) {
            appState.currentPuzzle.grid.forEach(row => {
                row.forEach(cell => {
                    if (!cell.isBlocked && cell.letter) {
                        cell.userLetter = '';
                        cell.isCorrect = false;
                    }
                });
            });
        }

        navigateTo('solvePuzzle');
    } else {
        appState.errorMessage = "Puzzle non trouvé.";
        navigateTo(appState.studentAccessMode ? 'welcome' : 'puzzleList');
    }
}

function updateUserAnswer(row: number, col: number, letter: string) {
    if (appState.currentPuzzle && appState.currentPuzzle.grid) {
        const cell = appState.currentPuzzle.grid[row][col];
        if (cell && !cell.isBlocked) {
            cell.userLetter = letter;
        }
    }
}

function checkAnswers() {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;

    let correctAnswers = 0;
    let totalCells = 0;

    appState.currentPuzzle.grid.forEach(row => {
        row.forEach(cell => {
            if (!cell.isBlocked && cell.letter) {
                totalCells++;
                if (cell.userLetter === cell.letter) {
                    cell.isCorrect = true;
                    correctAnswers++;
                } else {
                    cell.isCorrect = false;
                }
            }
        });
    });

    // Calculer le score
    const completionPercentage = (correctAnswers / totalCells) * 100;
    const timeBonus = appState.startTime ? Math.max(0, 300 - Math.floor((Date.now() - appState.startTime) / 1000)) : 0;
    appState.score = Math.round(completionPercentage * 10 + timeBonus);

    if (correctAnswers === totalCells) {
        // Puzzle terminé !
        const completed: CompletedPuzzle = {
            puzzleId: appState.currentPuzzle.id,
            completed: true,
            score: appState.score,
            completedAt: new Date().toISOString()
        };

        const existingCompleted = appState.completedPuzzles.filter(cp => cp.puzzleId !== appState.currentPuzzle!.id);
        existingCompleted.push(completed);
        appState.completedPuzzles = existingCompleted;
        saveCompletedPuzzles(appState.completedPuzzles);

        navigateTo('puzzleComplete');
    } else {
        // Re-render pour montrer les bonnes/mauvaises réponses
        renderApp();
    }
}

function startTimer() {
    setInterval(() => {
        if (appState.startTime && appState.mode === 'solvePuzzle') {
            const elapsed = Math.floor((Date.now() - appState.startTime) / 1000);
            const timerElement = document.querySelector('.timer');
            if (timerElement) {
                timerElement.textContent = formatTime(elapsed);
            }
        }
    }, 1000);
}

function showShareModal(puzzle: CrosswordPuzzle) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const title = document.createElement('h3');
    title.textContent = `Partager: ${puzzle.title}`;
    
    const url = `${window.location.origin}${window.location.pathname}?puzzleId=${puzzle.id}`;
    
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = url;
    urlInput.readOnly = true;
    urlInput.className = 'share-url';
    urlInput.onclick = () => urlInput.select();
    
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copier le lien';
    copyButton.className = 'btn btn-primary';
    copyButton.onclick = () => {
        navigator.clipboard.writeText(url).then(() => {
            copyButton.textContent = 'Copié !';
            setTimeout(() => copyButton.textContent = 'Copier le lien', 2000);
        });
    };
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Les étudiants accédant via ce lien ne pourront que résoudre ce puzzle.';
    instructions.className = 'share-instructions';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Fermer';
    closeButton.className = 'btn btn-secondary';
    closeButton.onclick = () => modal.remove();
    
    modalContent.appendChild(title);
    modalContent.appendChild(urlInput);
    modalContent.appendChild(copyButton);
    modalContent.appendChild(instructions);
    modalContent.appendChild(closeButton);
    
    modal.appendChild(modalContent);
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

function renderPuzzleCompleteScreen() {
    clearAppRoot();
    const screen = document.createElement('div');
    screen.className = 'screen puzzle-complete-screen';

    const celebration = document.createElement('div');
    celebration.className = 'celebration';
    celebration.innerHTML = '🎉';

    const title = document.createElement('h2');
    title.textContent = 'Félicitations !';

    const message = document.createElement('p');
    message.textContent = `Vous avez terminé "${appState.currentPuzzle?.title}" !`;

    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'score-display';
    scoreDisplay.innerHTML = `
        <h3>Votre Score</h3>
        <div class="score-value">${appState.score}</div>
        <p>Temps: ${appState.startTime ? formatTime(Math.floor((Date.now() - appState.startTime) / 1000)) : 'N/A'}</p>
    `;

    const controls = document.createElement('div');
    controls.className = 'puzzle-complete-controls';

    if (appState.studentAccessMode) {
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Refaire ce puzzle';
        retryButton.className = 'btn btn-primary';
        retryButton.onclick = () => {
            if (appState.currentPuzzle) {
                startPuzzle(appState.currentPuzzle.id);
            }
        };
        controls.appendChild(retryButton);

        const finishMessage = document.createElement('p');
        finishMessage.textContent = 'Vous pouvez fermer cette page.';
        finishMessage.className = 'finish-message';
        controls.appendChild(finishMessage);
    } else {
        const anotherButton = document.createElement('button');
        anotherButton.textContent = 'Autre puzzle';
        anotherButton.className = 'btn btn-primary';
        anotherButton.onclick = () => navigateTo('puzzleList');

        const homeButton = document.createElement('button');
        homeButton.textContent = 'Accueil';
        homeButton.className = 'btn btn-secondary';
        homeButton.onclick = () => navigateTo('welcome');

        controls.appendChild(anotherButton);
        controls.appendChild(homeButton);
    }

    screen.appendChild(celebration);
    screen.appendChild(title);
    screen.appendChild(message);
    screen.appendChild(scoreDisplay);
    screen.appendChild(controls);

    appRoot.appendChild(screen);
    renderErrorMessage();
}

// --- Main App Rendering ---
function renderApp() {
    console.log(`Crossword Master: Rendering ${appState.mode}`);
    
    if (!appRoot) {
        console.error('Crossword Master: App root not found!');
        return;
    }

    switch (appState.mode) {
        case 'loading':
            clearAppRoot();
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            spinner.textContent = 'Chargement...';
            appRoot.appendChild(spinner);
            break;
        case 'welcome':
            renderWelcomeScreen();
            break;
        case 'createPuzzle':
            if (appState.studentAccessMode) {
                navigateTo('welcome');
            } else {
                renderCreatePuzzleScreen();
            }
            break;
        case 'puzzleList':
            if (appState.studentAccessMode) {
                navigateTo('welcome');
            } else {
                renderPuzzleListScreen();
            }
            break;
        case 'solvePuzzle':
            renderSolvePuzzleScreen();
            break;
        case 'puzzleComplete':
            renderPuzzleCompleteScreen();
            break;
        default:
            console.warn(`Unknown mode: ${appState.mode}`);
            navigateTo('welcome');
    }
}

// --- CSS Styles ---
const styles = `
/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    min-height: 100vh;
    color: #2c3e50;
}

/* Header Styles */
.app-header {
    background: linear-gradient(135deg, #0066cc 0%, #1e88e5 100%);
    color: white;
    padding: 1rem 0;
    box-shadow: 0 2px 10px rgba(0,102,204,0.2);
}

.header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
}

.logo-section {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.logo-placeholder {
    background: #ffb800;
    color: #0066cc;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: bold;
    font-size: 1.2rem;
}

.app-title {
    font-size: 2rem;
    font-weight: 300;
    margin: 0;
}

.student-mode {
    background: rgba(255,255,255,0.2);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.9rem;
    margin-left: auto;
}

/* Layout */
.screen {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    min-height: calc(100vh - 100px);
}

/* Buttons */
.btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-block;
    text-align: center;
}

.btn-primary {
    background: linear-gradient(135deg, #0066cc 0%, #1e88e5 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(0,102,204,0.3);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,102,204,0.4);
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background: #5a6268;
    transform: translateY(-1px);
}

.btn-remove {
    background: #dc3545;
    color: white;
    padding: 0.5rem;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
    line-height: 1;
}

/* Welcome Screen */
.welcome-screen {
    text-align: center;
    padding: 4rem 2rem;
}

.welcome-intro h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: #0066cc;
}

.welcome-intro p {
    font-size: 1.2rem;
    margin-bottom: 3rem;
    color: #6c757d;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.button-container {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}

.student-error {
    color: #dc3545;
    font-size: 1.1rem;
    text-align: center;
    margin: 2rem 0;
    padding: 1rem;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
}

/* Form Styles */
.puzzle-form {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.form-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e9ecef;
}

.form-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.form-section h3 {
    color: #0066cc;
    margin-bottom: 1rem;
    font-size: 1.3rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #2c3e50;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 3px rgba(0,102,204,0.1);
}

/* Words Container */
.words-container {
    space-y: 1rem;
}

.word-entry {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border-left: 4px solid #0066cc;
}

.word-group {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 1rem;
    align-items: end;
}

.word-group label {
    margin-bottom: 0.5rem;
}

.add-word-btn {
    margin-top: 1rem;
}

.form-controls {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #e9ecef;
}

/* Puzzle List */
.puzzle-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
}

.puzzle-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border-left: 4px solid #0066cc;
}

.puzzle-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.puzzle-card.completed {
    border-left-color: #28a745;
}

.puzzle-card-header h3 {
    color: #0066cc;
    margin-bottom: 0.5rem;
}

.puzzle-theme {
    background: #e7f3ff;
    color: #0066cc;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.9rem;
    display: inline-block;
}

.puzzle-card-content {
    margin: 1rem 0;
    color: #6c757d;
}

.completed-badge {
    background: #28a745;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    display: inline-block;
    margin-top: 0.5rem;
}

.puzzle-card-actions {
    display: flex;
    gap: 0.5rem;
}

.no-puzzles {
    text-align: center;
    padding: 3rem;
    color: #6c757d;
}

.back-btn {
    margin-top: 2rem;
}

/* Solve Puzzle Screen */
.puzzle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.puzzle-title-section h2 {
    color: #0066cc;
    margin-bottom: 0.5rem;
}

.puzzle-stats {
    display: flex;
    gap: 2rem;
    align-items: center;
}

.timer, .score {
    font-size: 1.2rem;
    font-weight: 500;
    padding: 0.5rem 1rem;
    background: #e7f3ff;
    border-radius: 8px;
    color: #0066cc;
}

.puzzle-content {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
    margin-bottom: 2rem;
}

/* Crossword Grid */
.grid-container {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.crossword-grid {
    display: grid;
    grid-template-columns: repeat(15, 1fr);
    gap: 2px;
    max-width: 600px;
    margin: 0 auto;
}

.grid-cell {
    width: 35px;
    height: 35px;
    position: relative;
    border: 1px solid #e9ecef;
}

.grid-cell.blocked {
    background: #2c3e50;
}

.grid-cell.active {
    background: white;
    border: 2px solid #0066cc;
}

.cell-number {
    position: absolute;
    top: 2px;
    left: 3px;
    font-size: 0.7rem;
    font-weight: bold;
    color: #0066cc;
    z-index: 2;
}

.grid-cell input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    text-align: center;
    font-size: 1.2rem;
    font-weight: bold;
    color: #2c3e50;
    background: transparent;
    z-index: 1;
    position: relative;
}

.grid-cell input:focus {
    background: #e7f3ff;
}

/* Clues */
.clues-container {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    max-height: 600px;
    overflow-y: auto;
}

.clues-section {
    margin-bottom: 2rem;
}

.clues-section h3 {
    color: #0066cc;
    margin-bottom: 1rem;
    font-size: 1.2rem;
}

.clues-section ol {
    list-style: none;
    padding: 0;
}

.clues-section li {
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 3px solid #0066cc;
}

.clue-number {
    font-weight: bold;
    color: #0066cc;
    margin-right: 0.5rem;
}

/* Puzzle Controls */
.puzzle-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

/* Puzzle Complete */
.puzzle-complete-screen {
    text-align: center;
    padding: 4rem 2rem;
}

.celebration {
    font-size: 4rem;
    margin-bottom: 1rem;
}

.puzzle-complete-screen h2 {
    color: #28a745;
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

.score-display {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    margin: 2rem 0;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
}

.score-value {
    font-size: 3rem;
    font-weight: bold;
    color: #0066cc;
    margin: 1rem 0;
}

.puzzle-complete-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}

.finish-message {
    margin-top: 2rem;
    color: #6c757d;
    font-style: italic;
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    max-width: 500px;
    width: 90%;
}

.modal-content h3 {
    color: #0066cc;
    margin-bottom: 1rem;
}

.share-url {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    margin: 1rem 0;
    font-family: monospace;
    font-size: 0.9rem;
}

.share-instructions {
    color: #6c757d;
    font-size: 0.9rem;
    margin: 1rem 0;
    line-height: 1.4;
}

/* Error Messages */
.error-message {
    background: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid #f5c6cb;
}

/* Loading */
.spinner {
    text-align: center;
    padding: 4rem;
    font-size: 1.2rem;
    color: #0066cc;
}

/* Responsive Design */
@media (max-width: 768px) {
    .header-content {
        padding: 0 1rem;
    }
    
    .logo-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }
    
    .app-title {
        font-size: 1.5rem;
    }
    
    .screen {
        padding: 1rem;
    }
    
    .puzzle-content {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .crossword-grid {
        grid-template-columns: repeat(15, 20px);
    }
    
    .grid-cell {
        width: 20px;
        height: 20px;
    }
    
    .grid-cell input {
        font-size: 0.8rem;
    }
    
    .cell-number {
        font-size: 0.5rem;
        top: 1px;
        left: 2px;
    }
    
    .word-group {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }
    
    .button-container,
    .form-controls,
    .puzzle-controls,
    .puzzle-complete-controls {
        flex-direction: column;
        align-items: center;
    }
    
    .puzzle-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }
    
    .puzzle-stats {
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .crossword-grid {
        grid-template-columns: repeat(15, 18px);
    }
    
    .grid-cell {
        width: 18px;
        height: 18px;
    }
}
`;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Crossword Master: Initializing...");
    
    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    // Load puzzles and completed puzzles
    appState.puzzles = loadPuzzlesFromStorage();
    appState.completedPuzzles = loadCompletedPuzzles();
    
    // Add sample puzzle if no puzzles exist
    if (appState.puzzles.length === 0) {
        const samplePuzzle: CrosswordPuzzle = {
            id: 'sample1',
            title: 'Puzzle de Démonstration',
            theme: 'Informatique',
            words: [
                {
                    id: 'w1',
                    word: 'ORDINATEUR',
                    definition: 'Machine électronique de traitement de données',
                    direction: 'horizontal'
                },
                {
                    id: 'w2',
                    word: 'INTERNET',
                    definition: 'Réseau mondial de communication',
                    direction: 'horizontal'
                },
                {
                    id: 'w3',
                    word: 'LOGICIEL',
                    definition: 'Programme informatique',
                    direction: 'horizontal'
                }
            ],
            createdAt: new Date().toISOString()
        };
        
        samplePuzzle.grid = generateGrid(samplePuzzle.words);
        appState.puzzles.push(samplePuzzle);
        savePuzzlesToStorage(appState.puzzles);
    }
    
    // Check for puzzle ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const puzzleIdFromUrl = urlParams.get('puzzleId');
    
    if (puzzleIdFromUrl) {
        console.log(`Crossword Master: Puzzle ID found in URL: ${puzzleIdFromUrl}`);
        const puzzleToLoad = appState.puzzles.find(p => p.id === puzzleIdFromUrl);
        if (puzzleToLoad) {
            appState.studentAccessMode = true;
            startPuzzle(puzzleIdFromUrl);
        } else {
            console.log("Crossword Master: Puzzle not found");
            appState.studentAccessMode = true;
            appState.errorMessage = "Puzzle introuvable ou lien invalide. Veuillez vérifier l'URL.";
            navigateTo('welcome');
        }
    } else {
        appState.studentAccessMode = false;
        renderApp();
    }
    
    console.log("Crossword Master: Initialization complete");
});