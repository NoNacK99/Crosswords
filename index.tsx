/**
 * CROSSWORD MASTER v2.1
 * Système de mots croisés éducatifs interactifs avec algorithme intelligent et verrou de direction
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

// --- Nouvelles interfaces pour l'algorithme ---
interface CrosswordPosition {
    row: number;
    col: number;
    direction: 'horizontal' | 'vertical';
    word: string;
    intersections: Array<{
        letterIndex: number;
        intersectingWord: string;
        intersectingIndex: number;
    }>;
}

interface IntersectionCandidate {
    word1: string;
    word1Index: number;
    word2: string;
    word2Index: number;
    letter: string;
    score: number;
}

// --- Classe d'algorithme intelligent (VERSION AMÉLIORÉE) ---
class CrosswordGenerator {
    private gridSize: number = 20;
    private placedWords: Map<string, WordEntry> = new Map();
    private grid: GridCell[][] = [];
    private intersectionCache: Map<string, IntersectionCandidate[]> = new Map();

    constructor() {
        this.initializeGrid();
    }

    private initializeGrid(): void {
        this.grid = Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill(null).map(() => ({
                letter: null,
                number: null,
                isBlocked: false
            }))
        );
    }
    
    private precomputeIntersections(words: WordEntry[]): void {
        this.intersectionCache.clear();
        for (let i = 0; i < words.length; i++) {
            for (let j = i + 1; j < words.length; j++) {
                const word1 = words[i].word;
                const word2 = words[j].word;
                const key1 = `${word1}-${word2}`;
                const key2 = `${word2}-${word1}`;

                const intersections = this.findIntersections(word1, word2);
                if (intersections.length > 0) {
                    this.intersectionCache.set(key1, intersections);
                    this.intersectionCache.set(key2, intersections.map(int => ({
                        word1: int.word2,
                        word1Index: int.word2Index,
                        word2: int.word1,
                        word2Index: int.word1Index,
                        letter: int.letter,
                        score: int.score
                    })));
                }
            }
        }
    }

    private findIntersections(word1: string, word2: string): IntersectionCandidate[] {
        const intersections: IntersectionCandidate[] = [];
        for (let i = 0; i < word1.length; i++) {
            for (let j = 0; j < word2.length; j++) {
                if (word1[i] === word2[j]) {
                    intersections.push({
                        word1, word1Index: i,
                        word2, word2Index: j,
                        letter: word1[i],
                        score: 1
                    });
                }
            }
        }
        return intersections;
    }
    
    private calculatePlacementScore(word: string, row: number, col: number, direction: 'horizontal' | 'vertical'): number {
        let score = 0;
        let intersections = 0;

        for (let i = 0; i < word.length; i++) {
            const current_row = direction === 'horizontal' ? row : row + i;
            const current_col = direction === 'horizontal' ? col + i : col;

            if (this.grid[current_row][current_col].letter === word[i].toUpperCase()) {
                intersections++;
                score += 50;
            }
            
            if (direction === 'horizontal') {
                if (current_row > 0 && this.grid[current_row - 1][current_col].letter !== null) score += 1;
                if (current_row < this.gridSize - 1 && this.grid[current_row + 1][current_col].letter !== null) score += 1;
            }
            else {
                if (current_col > 0 && this.grid[current_row][current_col - 1].letter !== null) score += 1;
                if (current_col < this.gridSize - 1 && this.grid[current_row][current_col + 1].letter !== null) score += 1;
            }
        }

        if (intersections === 0) {
            return -1;
        }
        
        score += intersections * 100;
        
        const centerMalus = Math.abs(row - this.gridSize / 2) + Math.abs(col - this.gridSize / 2);
        score -= centerMalus;
        
        return score;
    }

    private canPlaceWord(word: string, row: number, col: number, direction: 'horizontal' | 'vertical'): boolean {
        if (direction === 'horizontal') {
            if (col < 0 || row < 0 || row >= this.gridSize || col + word.length > this.gridSize) return false;
        } else {
            if (col < 0 || row < 0 || col >= this.gridSize || row + word.length > this.gridSize) return false;
        }

        for (let i = 0; i < word.length; i++) {
            const r = direction === 'horizontal' ? row : row + i;
            const c = direction === 'horizontal' ? col + i : col;

            const cell = this.grid[r][c];
            const letterAtCell = cell.letter;
            const currentWordLetter = word[i].toUpperCase();

            if (letterAtCell !== null && letterAtCell !== currentWordLetter) {
                return false;
            }
            if (letterAtCell === null) {
                if (direction === 'horizontal') {
                    if ((r > 0 && this.grid[r - 1][c].letter !== null) || (r < this.gridSize - 1 && this.grid[r + 1][c].letter !== null)) {
                        return false;
                    }
                } else {
                    if ((c > 0 && this.grid[r][c - 1].letter !== null) || (c < this.gridSize - 1 && this.grid[r][c + 1].letter !== null)) {
                        return false;
                    }
                }
            }
        }
        
        if (direction === 'horizontal') {
            if ((col > 0 && this.grid[row][col-1].letter !== null) || (col + word.length < this.gridSize && this.grid[row][col+word.length].letter !== null)){
                return false;
            }
        } else {
             if ((row > 0 && this.grid[row-1][col].letter !== null) || (row + word.length < this.gridSize && this.grid[row+word.length][col].letter !== null)){
                return false;
            }
        }

        return true;
    }

    private findBestPosition(wordToPlace: WordEntry): { row: number; col: number; direction: 'horizontal' | 'vertical'; score: number } | null {
        let bestPosition = null;

        for (const placedWord of this.placedWords.values()) {
            const key = `${placedWord.word}-${wordToPlace.word}`;
            const intersections = this.intersectionCache.get(key) || [];

            for (const intersection of intersections) {
                const newWordDirection = placedWord.direction === 'horizontal' ? 'vertical' : 'horizontal';
                
                let row: number, col: number;
                
                if (newWordDirection === 'horizontal') {
                    row = placedWord.startRow! + intersection.word1Index;
                    col = placedWord.startCol! - intersection.word2Index;
                } else {
                    row = placedWord.startRow! - intersection.word2Index;
                    col = placedWord.startCol! + intersection.word1Index;
                }

                if (this.canPlaceWord(wordToPlace.word, row, col, newWordDirection)) {
                    const score = this.calculatePlacementScore(wordToPlace.word, row, col, newWordDirection);
                    if (!bestPosition || score > bestPosition.score) {
                        bestPosition = { row, col, direction: newWordDirection, score };
                    }
                }
            }
        }
        return bestPosition;
    }
    
    private placeWord(wordEntry: WordEntry, row: number, col: number, direction: 'horizontal' | 'vertical', number: number): void {
        wordEntry.startRow = row;
        wordEntry.startCol = col;
        wordEntry.direction = direction;
        wordEntry.number = number;

        for (let i = 0; i < wordEntry.word.length; i++) {
            const cellRow = direction === 'horizontal' ? row : row + i;
            const cellCol = direction === 'horizontal' ? col + i : col;
            
            this.grid[cellRow][cellCol].letter = wordEntry.word[i].toUpperCase();
            if (i === 0) {
                 if (this.grid[cellRow][cellCol].number === null) {
                    this.grid[cellRow][cellCol].number = number;
                 }
            }
        }
        this.placedWords.set(wordEntry.word, wordEntry);
    }
    
    public generateGrid(words: WordEntry[]): GridCell[][] {
        if (words.length === 0) return this.grid;

        this.initializeGrid();
        this.placedWords.clear();
        
        this.precomputeIntersections(words);
        const sortedWords = [...words].sort((a, b) => b.word.length - a.word.length);
        
        let unplacedWords = [...sortedWords];
        let wordNumber = 1;
        
        const firstWord = unplacedWords.shift();
        if(!firstWord) return this.grid;
        
        const startRow = Math.floor(this.gridSize / 2);
        const startCol = Math.floor((this.gridSize - firstWord.word.length) / 2);
        this.placeWord(firstWord, startRow, startCol, 'horizontal', wordNumber++);

        let attempts = 0;
        while (unplacedWords.length > 0 && attempts < words.length * 2) {
            let bestPlacement: { word: WordEntry; pos: any; } | null = null;
            let wordIndexToPlace = -1;

            for (let i = 0; i < unplacedWords.length; i++) {
                const wordToPlace = unplacedWords[i];
                const position = this.findBestPosition(wordToPlace);
                if (position && position.score > (bestPlacement?.pos.score ?? -1)) {
                    bestPlacement = { word: wordToPlace, pos: position };
                    wordIndexToPlace = i;
                }
            }

            if (bestPlacement) {
                const {row, col} = bestPlacement.pos;
                let newWordNumber = wordNumber;
                if(this.grid[row][col].number === null) {
                    wordNumber++;
                } else {
                    newWordNumber = this.grid[row][col].number!;
                }

                this.placeWord(bestPlacement.word, row, col, bestPlacement.pos.direction, newWordNumber);
                unplacedWords.splice(wordIndexToPlace, 1);
            } else {
                console.warn("Impossible de placer d'autres mots avec des intersections. Mots restants:", unplacedWords.map(w=>w.word));
                break; 
            }
            attempts++;
        }

        const numberMap = new Map<number, number>();
        let nextNumber = 1;
        const wordsByPosition = [...this.placedWords.values()].sort((a,b) => (a.startRow! * this.gridSize + a.startCol!) - (b.startRow! * this.gridSize + b.startCol!));
        for (const word of wordsByPosition) {
            const cell = this.grid[word.startRow!][word.startCol!];
            if (cell.number) {
                 if (!numberMap.has(cell.number)) {
                    numberMap.set(cell.number, nextNumber++);
                 }
                 word.number = numberMap.get(cell.number);
            }
        }

        return this.grid;
    }
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
    // --- NOUVELLE GESTION DE DIRECTION ---
    currentDirection: 'horizontal' | 'vertical';
    lastFocusedCell: { row: number, col: number } | null;
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
    completedPuzzles: [],
    // --- NOUVELLE GESTION DE DIRECTION ---
    currentDirection: 'horizontal',
    lastFocusedCell: null
};

// --- localStorage Functions ---
const STORAGE_KEY = 'crossword_master_puzzles';
const COMPLETED_KEY = 'crossword_master_completed';

function savePuzzlesToStorage(puzzles: CrosswordPuzzle[]) {
    try {
        console.log("Crossword Master: Puzzles saved to memory");
    } catch (error) {
        console.error("Crossword Master: Failed to save puzzles:", error);
    }
}

function loadPuzzlesFromStorage(): CrosswordPuzzle[] {
    try {
        return [];
    } catch (error) {
        console.error("Crossword Master: Failed to load puzzles:", error);
        return [];
    }
}

function saveCompletedPuzzles(completed: CompletedPuzzle[]) {
    try {
        console.log("Crossword Master: Completed puzzles saved to memory");
    } catch (error) {
        console.error("Crossword Master: Failed to save completed puzzles:", error);
    }
}

function loadCompletedPuzzles(): CompletedPuzzle[] {
    try {
        return [];
    } catch (error) {
        console.error("Crossword Master: Failed to load completed puzzles:", error);
        return [];
    }
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

function generateGrid(words: WordEntry[]): GridCell[][] {
    console.log("🧠 Génération intelligente de la grille avec", words.length, "mots");
    const generator = new CrosswordGenerator();
    const result = generator.generateGrid(words);
    
    words.forEach(word => {
        if (word.startRow !== undefined && word.startCol !== undefined) {
            console.log(`📍 ${word.word}: ${word.direction} à (${word.startRow}, ${word.startCol}) #${word.number}`);
        }
    });
    
    return result;
}

// --- Rendering Functions ---
function renderHeader() {
    const header = document.createElement('header');
    header.className = 'app-header';
    
    const headerContent = document.createElement('div');
    headerContent.className = 'header-content';
    
    const logoSection = document.createElement('div');
    logoSection.className = 'logo-section';
    
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

    const pasteSection = document.createElement('div');
    pasteSection.className = 'form-section';
    
    const pasteTitle = document.createElement('h3');
    pasteTitle.textContent = '⚡ Import rapide depuis IA';
    pasteSection.appendChild(pasteTitle);

    const pasteDescription = document.createElement('p');
    pasteDescription.textContent = 'Collez directement depuis ChatGPT/Claude au format: MOT | Définition';
    pasteDescription.style.fontSize = '0.9rem';
    pasteDescription.style.color = '#666';
    pasteSection.appendChild(pasteDescription);

    const pasteGroup = document.createElement('div');
    pasteGroup.className = 'form-group';
    const pasteLabel = document.createElement('label');
    pasteLabel.textContent = 'Données à importer :';
    const pasteTextarea = document.createElement('textarea');
    pasteTextarea.name = 'bulkPaste';
    pasteTextarea.placeholder = `FIREWALL | Ce qui empêche de passer
VIRUS | Logiciel malfaisant
SECURITE | Le sujet principal`;
    pasteTextarea.rows = 8;
    pasteGroup.appendChild(pasteLabel);
    pasteGroup.appendChild(pasteTextarea);

    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.textContent = 'Importer ces mots';
    importButton.className = 'btn btn-secondary';
    importButton.onclick = () => handleBulkImport(pasteTextarea.value);
    pasteGroup.appendChild(importButton);

    pasteSection.appendChild(pasteGroup);
    form.appendChild(pasteSection);

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

    addWordEntry(wordsContainer);

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

function handleBulkImport(text: string) {
    clearErrorMessage();
    
    if (!text.trim()) {
        appState.errorMessage = "Veuillez coller du texte à importer.";
        renderErrorMessage();
        return;
    }

    const lines = text.trim().split('\n');
    const wordsContainer = document.getElementById('words-container') as HTMLElement;
    
    wordsContainer.innerHTML = '';
    
    let importedCount = 0;
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
            const separators = ['|', ':', '-'];
            let parts: string[] = [];
            
            for (const sep of separators) {
                if (trimmedLine.includes(sep)) {
                    parts = trimmedLine.split(sep).map(p => p.trim());
                    break;
                }
            }
            
            if (parts.length >= 2 && parts[0] && parts[1]) {
                let word = parts[0].toUpperCase()
                    .replace(/[^A-Z]/g, '')
                    .replace(/\s+/g, '');
                
                const definition = parts[1];
                
                if (word.length > 0 && word.length <= 15) {
                    addWordEntry(wordsContainer, word, definition);
                    importedCount++;
                } else if (word.length > 15) {
                    console.warn(`❌ Mot "${parts[0]}" trop long (${word.length} lettres), ignoré`);
                } else {
                    console.warn(`❌ Mot "${parts[0]}" invalide, ignoré`);
                }
            }
        }
    });
    
    if (importedCount === 0) {
        appState.errorMessage = "Aucun mot valide trouvé. Format attendu: MOT | Définition (pas d'espaces dans les mots)";
        renderErrorMessage();
        addWordEntry(wordsContainer);
    } else {
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = `✅ ${importedCount} mots importés avec succès !`;
        
        const screenContent = appRoot.querySelector('.screen');
        if (screenContent) {
            screenContent.prepend(successMsg);
            setTimeout(() => successMsg.remove(), 3000);
        }
    }
}

function addWordEntry(container: HTMLElement, prefillWord: string = '', prefillDefinition: string = '') {
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
    wordInput.value = prefillWord;
    wordInput.oninput = (e) => {
        (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z]/g, '');
    };

    const definitionLabel = document.createElement('label');
    definitionLabel.textContent = 'Définition :';
    const definitionInput = document.createElement('textarea');
    definitionInput.name = `definition-${wordId}`;
    definitionInput.placeholder = 'Définition ou question pour ce mot...';
    definitionInput.required = true;
    definitionInput.rows = 2;
    definitionInput.value = prefillDefinition;

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

    const puzzleContent = document.createElement('div');
    puzzleContent.className = 'puzzle-content';

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid-container';
    gridContainer.appendChild(renderGrid());

    const cluesContainer = document.createElement('div');
    cluesContainer.className = 'clues-container';
    
    const verifySection = document.createElement('div');
    verifySection.className = 'verify-section-top';
    
    const checkButton = document.createElement('button');
    checkButton.textContent = 'Vérifier';
    checkButton.className = 'btn btn-primary verify-btn';
    checkButton.onclick = checkAnswers;
    
    verifySection.appendChild(checkButton);
    cluesContainer.appendChild(verifySection);
    
    cluesContainer.appendChild(renderClues());

    puzzleContent.appendChild(gridContainer);
    puzzleContent.appendChild(cluesContainer);
    screen.appendChild(puzzleContent);

    const controls = document.createElement('div');
    controls.className = 'puzzle-controls';

    const quitButton = document.createElement('button');
    quitButton.textContent = 'Quitter';
    quitButton.className = 'btn btn-secondary';
    quitButton.onclick = () => {
        if (confirm('Êtes-vous sûr de vouloir quitter ? Votre progression sera perdue.')) {
            navigateTo(appState.studentAccessMode ? 'welcome' : 'puzzleList');
        }
    };

    controls.appendChild(quitButton);
    screen.appendChild(controls);

    const helpSection = document.createElement('div');
    helpSection.className = 'help-section';
    
    const helpTitle = document.createElement('h4');
    helpTitle.textContent = '💡 Astuces';
    helpSection.appendChild(helpTitle);

    const tips = [
        { icon: '🖱️', text: 'Cliquez sur une définition pour sélectionner un mot.' },
        { icon: '⌨️', text: 'Cliquez une 2ème fois sur une case pour changer de direction (H/V).' },
        { icon: '🗑️', text: 'Double-cliquez sur une case pour effacer le mot entier.' },
        { icon: '🔄', text: 'Les lettres aux intersections se remplissent automatiquement.' }
    ];

    tips.forEach(tip => {
        const tipDiv = document.createElement('div');
        tipDiv.className = 'help-tip';
        tipDiv.innerHTML = `<span class="tip-icon">${tip.icon}</span> ${tip.text}`;
        helpSection.appendChild(tipDiv);
    });

    screen.appendChild(helpSection);

    appRoot.appendChild(screen);
    renderErrorMessage();

    if (!appState.startTime) {
        appState.startTime = Date.now();
        startTimer();
    }
}

function renderGrid(): HTMLElement {
    const grid = document.createElement('div');
    
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) {
        grid.className = 'crossword-grid';
        return grid;
    }
    
    const gridSize = appState.currentPuzzle.grid.length;
    grid.className = `crossword-grid`;
    grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;


    appState.currentPuzzle.grid.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.className = 'grid-cell';
            cellElement.dataset.row = rowIndex.toString();
            cellElement.dataset.col = colIndex.toString();
            
            if (cell.letter === null) {
                cellElement.classList.add('blocked');
            } else {
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

    // Vérifie si la case était vide AVANT de taper
    const cell = appState.currentPuzzle!.grid![rowIndex][colIndex];
    const wasEmpty = !(cell.userLetter?.length);

    updateUserAnswer(rowIndex, colIndex, target.value);
    checkWordCompletion(rowIndex, colIndex);

    // Avance seulement si on vient de remplir une case qui était vide
    if (target.value && wasEmpty) {
        navigateToNextCell(rowIndex, colIndex);
    }
};

                
                // --- NOUVELLE GESTION DE DIRECTION ---
                input.onfocus = () => {
                    handleCellFocus(rowIndex, colIndex);
                };
                
                input.ondblclick = () => {
                    clearWordAtPosition(rowIndex, colIndex);
                };
                
                input.onkeydown = (e) => {
                    if (e.key === 'Escape') {
                        clearWordAtPosition(rowIndex, colIndex);
                        e.preventDefault();
                    }
                };
                
                if (cell.isCorrect === true) {
                    cellElement.classList.add('correct');
                } else if (cell.isCorrect === false) {
                    cellElement.classList.add('incorrect');
                }
                
                cellElement.appendChild(input);
            }

            grid.appendChild(cellElement);
        });
    });

    return grid;
}

// --- NOUVELLE GESTION DE DIRECTION ---
function getWordsAtPosition(row: number, col: number): WordEntry[] {
    if (!appState.currentPuzzle) return [];
    return appState.currentPuzzle.words.filter(word => {
        if (word.startRow === undefined || word.startCol === undefined) return false;
        if (word.direction === 'horizontal') {
            return row === word.startRow && col >= word.startCol && col < word.startCol + word.word.length;
        } else { // vertical
            return col === word.startCol && row >= word.startRow && row < word.startRow + word.word.length;
        }
    });
}

function handleCellFocus(row: number, col: number) {
    const wordsHere = getWordsAtPosition(row, col);
    const canGoHorizontal = wordsHere.some(w => w.direction === 'horizontal');
    const canGoVertical = wordsHere.some(w => w.direction === 'vertical');
    
    const isSameCell = appState.lastFocusedCell?.row === row && appState.lastFocusedCell?.col === col;

    if (isSameCell) {
        // Toggle direction if both are possible
        if (canGoHorizontal && canGoVertical) {
            appState.currentDirection = appState.currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
        }
    } else {
        // On new cell, prefer horizontal, then vertical
        if (canGoHorizontal) {
            appState.currentDirection = 'horizontal';
        } else if (canGoVertical) {
            appState.currentDirection = 'vertical';
        }
    }
    
    appState.lastFocusedCell = { row, col };
    highlightActiveWord();
}

function highlightActiveWord() {
    // Clear previous highlight
    document.querySelectorAll('.active-word').forEach(el => el.classList.remove('active-word'));

    if (!appState.lastFocusedCell) return;

    const { row, col } = appState.lastFocusedCell;
    const words = getWordsAtPosition(row, col);
    const activeWord = words.find(w => w.direction === appState.currentDirection);

    if (activeWord && activeWord.startRow !== undefined && activeWord.startCol !== undefined) {
        for (let i = 0; i < activeWord.word.length; i++) {
            const r = activeWord.direction === 'horizontal' ? activeWord.startRow : activeWord.startRow + i;
            const c = activeWord.direction === 'horizontal' ? activeWord.startCol + i : activeWord.startCol;
            const cellEl = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
            if (cellEl) {
                cellEl.classList.add('active-word');
            }
        }
    }
}
// --- FIN NOUVELLE GESTION DE DIRECTION ---


function focusOnWord(word: WordEntry) {
    if (!appState.currentPuzzle?.grid || word.startRow === undefined || word.startCol === undefined) return;
    
    // MODIFIÉ: Verrouiller la direction en cliquant sur une définition
    appState.currentDirection = word.direction;
    
    const input = document.querySelector(`input[data-row="${word.startRow}"][data-col="${word.startCol}"]`) as HTMLInputElement;
    if (input) {
        input.focus();
        input.select();
        
        // La fonction de focus mettra à jour le highlight
        handleCellFocus(word.startRow, word.startCol);
    } else {
        console.error(`❌ Input non trouvé pour le mot "${word.word}"`);
    }
}

function clearWordAtPosition(row: number, col: number) {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;
    
    const wordsAtPosition = getWordsAtPosition(row, col);
    let wordToClear: WordEntry | undefined;
    
    if (wordsAtPosition.length > 1) {
        // Priorise la direction actuelle pour l'effacement
        wordToClear = wordsAtPosition.find(w => w.direction === appState.currentDirection) || wordsAtPosition[0];
    } else if (wordsAtPosition.length === 1) {
        wordToClear = wordsAtPosition[0];
    } else {
        return;
    }
    
    if (!wordToClear || wordToClear.startRow === undefined || wordToClear.startCol === undefined) return;
    
    for (let i = 0; i < wordToClear.word.length; i++) {
        const cellRow = wordToClear.direction === 'horizontal' ? wordToClear.startRow : wordToClear.startRow + i;
        const cellCol = wordToClear.direction === 'horizontal' ? wordToClear.startCol + i : wordToClear.startCol;
        
        const cell = appState.currentPuzzle.grid[cellRow][cellCol];
        if (cell) {
            cell.userLetter = '';
            cell.isCorrect = undefined;
            
            const input = document.querySelector(`input[data-row="${cellRow}"][data-col="${cellCol}"]`) as HTMLInputElement;
            if (input) {
                input.value = '';
                const cellElement = input.parentElement;
                if (cellElement) {
                    cellElement.classList.remove('correct', 'incorrect');
                }
            }
        }
    }
    
    const firstInput = document.querySelector(`input[data-row="${wordToClear.startRow}"][data-col="${wordToClear.startCol}"]`) as HTMLInputElement;
    if (firstInput) {
        firstInput.focus();
    }
    
    console.log(`✅ Mot "${wordToClear.word}" effacé`);
}

// MODIFIÉ: Logique de navigation simplifiée grâce au verrou de direction
function navigateToNextCell(currentRow: number, currentCol: number) {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;
    
    const grid = appState.currentPuzzle.grid;
    const direction = appState.currentDirection; // Utilise la direction verrouillée

    if (direction === 'horizontal') {
        for (let col = currentCol + 1; col < grid[currentRow].length; col++) {
            const cell = grid[currentRow][col];
            if (cell.letter) {
                const nextInput = document.querySelector(`input[data-row="${currentRow}"][data-col="${col}"]`) as HTMLInputElement;
                if (nextInput) {
                    nextInput.focus();
                    return;
                }
            } else { break; } // Arrêt sur une case bloquée
        }
    } else { // 'vertical'
        for (let row = currentRow + 1; row < grid.length; row++) {
            const cell = grid[row][currentCol];
            if (cell.letter) {
                const nextInput = document.querySelector(`input[data-row="${row}"][data-col="${currentCol}"]`) as HTMLInputElement;
                if (nextInput) {
                    nextInput.focus();
                    return;
                }
            } else { break; } // Arrêt sur une case bloquée
        }
    }
}

function checkWordCompletion(row: number, col: number) {
    if (!appState.currentPuzzle) return;
    
    const wordsToCheck = getWordsAtPosition(row, col);
    
    wordsToCheck.forEach(word => {
        if (checkIfWordIsComplete(word)) {
            fillIntersectingLetters(word);
        }
    });
}

function checkIfWordIsComplete(word: WordEntry): boolean {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return false;
    if (word.startRow === undefined || word.startCol === undefined) return false;
    
    const grid = appState.currentPuzzle.grid;
    
    for (let i = 0; i < word.word.length; i++) {
        const cellRow = word.direction === 'horizontal' ? word.startRow : word.startRow + i;
        const cellCol = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
        
        const cell = grid[cellRow][cellCol];
        if (!cell.userLetter || cell.userLetter.toUpperCase() !== word.word[i].toUpperCase()) {
            return false;
        }
    }
    
    return true;
}

function fillIntersectingLetters(completedWord: WordEntry) {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;
    if (completedWord.startRow === undefined || completedWord.startCol === undefined) return;
    
    const grid = appState.currentPuzzle.grid;
    
    for (let i = 0; i < completedWord.word.length; i++) {
        const cellRow = completedWord.direction === 'horizontal' ? completedWord.startRow : completedWord.startRow + i;
        const cellCol = completedWord.direction === 'horizontal' ? completedWord.startCol + i : completedWord.startCol;
        
        const letter = completedWord.word[i].toUpperCase();
        
        const intersectingCell = grid[cellRow][cellCol];
        
        if (intersectingCell && !intersectingCell.userLetter) {
            intersectingCell.userLetter = letter;
            updateUserAnswer(cellRow, cellCol, letter);
            
            const input = document.querySelector(`input[data-row="${cellRow}"][data-col="${cellCol}"]`) as HTMLInputElement;
            if (input) {
                input.value = letter;
            }
        }
    }
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

    const horizontalList = document.createElement('ul');
    const verticalList = document.createElement('ul');

    const sortedWords = [...appState.currentPuzzle.words]
        .filter(w => w.number)
        .sort((a,b) => (a.number!) - (b.number!));

    const displayedNumbers: Set<number> = new Set();
    sortedWords.forEach(word => {
        if(displayedNumbers.has(word.number!)) return;

        const listItem = document.createElement('li');
        listItem.innerHTML = `<span class="clue-number">${word.number}.</span> ${word.definition}`;
        
        listItem.style.cursor = 'pointer';
        listItem.onclick = () => {
            focusOnWord(word);
        };
        
        if (word.direction === 'horizontal') {
            horizontalList.appendChild(listItem);
        } else {
            verticalList.appendChild(listItem);
        }
        displayedNumbers.add(word.number!);
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
                direction: 'horizontal'
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

        puzzle.grid = generateGrid(puzzle.words);

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
        appState.lastFocusedCell = null;
        appState.currentDirection = 'horizontal';
        
        if (appState.currentPuzzle && appState.currentPuzzle.grid) {
            appState.currentPuzzle.grid.forEach(row => {
                row.forEach(cell => {
                    if (cell.letter) {
                        cell.userLetter = '';
                        cell.isCorrect = undefined;
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
            cell.userLetter = letter.toUpperCase();
        }
    }
}

function checkAnswers() {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;

    let correctAnswers = 0;
    let totalCells = 0;
    let completedWords = 0;

    appState.currentPuzzle.words.forEach(word => {
        if(checkIfWordIsComplete(word)) {
            completedWords++;
        }
    });

    appState.currentPuzzle.grid.forEach(row => {
        row.forEach(cell => {
            if (cell.letter) {
                totalCells++;
                if (cell.userLetter && cell.userLetter.toUpperCase() === cell.letter.toUpperCase()) {
                    cell.isCorrect = true;
                    correctAnswers++;
                } else {
                    cell.isCorrect = false;
                }
            }
        });
    });

    const timeElapsed = appState.startTime ? Math.floor((Date.now() - appState.startTime) / 1000) : 0;
    
    let score = completedWords * 10;
    
    if (appState.currentPuzzle.words.length > 0) {
        const averageTimePerWord = timeElapsed / appState.currentPuzzle.words.length;
        if (averageTimePerWord < 30) {
            score += completedWords * 5;
        }
    }
    
    appState.currentPuzzle.words.forEach(word => {
        if (checkIfWordIsComplete(word)) {
            if (word.word.length >= 8) score += 5;
            else if (word.word.length >= 6) score += 3;
        }
    });
    
    if (correctAnswers === totalCells && totalCells > 0) {
        score += 20;
    }

    appState.score = score;

    if (correctAnswers === totalCells && totalCells > 0) {
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
            
            const scoreElement = document.querySelector('.score');
            if (scoreElement) {
                scoreElement.textContent = `Score: ${appState.score}`;
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
    
    const timeElapsed = appState.startTime ? Math.floor((Date.now() - appState.startTime) / 1000) : 0;
    scoreDisplay.innerHTML = `
        <h3>Votre Score</h3>
        <div class="score-value">${appState.score}</div>
        <div class="score-details">
            <p>⏱️ Temps: ${formatTime(timeElapsed)}</p>
            <p>📝 Mots: ${appState.currentPuzzle?.words.filter(w=>w.startRow !== undefined).length || 0}</p>
            <p>🎯 Performance: ${appState.score >= 50 ? 'Excellent' : appState.score >= 30 ? 'Bien' : 'À améliorer'}</p>
        </div>
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
            renderCreatePuzzleScreen();
            break;
        case 'puzzleList':
            renderPuzzleListScreen();
            break;
        case 'solvePuzzle':
            renderSolvePuzzleScreen();
            break;
        case 'puzzleComplete':
            renderPuzzleCompleteScreen();
            break;
        default:
            navigateTo('welcome');
    }
}

// --- CSS Styles complets ---
const styles = `
:root {
    --primary-color: #0066cc;
    --secondary-color: #6c757d;
    --light-bg: #f8f9fa;
    --dark-bg: #e9ecef;
    --text-color: #2c3e50;
    --highlight-color: #ffeb3b; /* Jaune pour le surlignage du mot actif */
    /* 🎨 MODIFICATION COULEUR */
    --blocked-cell-color: #c8d4de; /* Gris ardoise plus doux */
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, var(--light-bg) 0%, var(--dark-bg) 100%);
    min-height: 100vh;
    color: var(--text-color);
}
.app-header {
    background: linear-gradient(135deg, #0066cc 0%, #1e88e5 100%);
    color: white; padding: 1rem 0; box-shadow: 0 2px 10px rgba(0,102,204,0.2);
}
.header-content { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
.logo-section { display: flex; align-items: center; gap: 1rem; }
.logo-placeholder { background: #ffb800; color: var(--primary-color); padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; font-size: 1.2rem; }
.app-title { font-size: 2rem; font-weight: 300; margin: 0; }
.screen { max-width: 1200px; margin: 0 auto; padding: 2rem; min-height: calc(100vh - 100px); }
.btn { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: all 0.3s ease; }
.btn-primary { background: linear-gradient(135deg, #0066cc 0%, #1e88e5 100%); color: white; box-shadow: 0 4px 15px rgba(0,102,204,0.3); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,102,204,0.4); }
.btn-secondary { background: var(--secondary-color); color: white; }
.btn-secondary:hover { background: #5a6268; }
.welcome-screen { text-align: center; padding: 4rem 2rem; }
.welcome-intro h2 { font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color); }
.welcome-intro p { font-size: 1.2rem; margin-bottom: 3rem; color: var(--secondary-color); max-width: 600px; margin: 0 auto 3rem; }
.button-container { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.puzzle-form { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
.form-section { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid var(--dark-bg); }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
.form-group input, .form-group textarea { width: 100%; padding: 0.75rem; border: 2px solid var(--dark-bg); border-radius: 8px; font-size: 1rem; }
.word-entry { background: var(--light-bg); padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid var(--primary-color); }
.word-group { display: grid; grid-template-columns: 1fr 2fr auto; gap: 1rem; align-items: end; }
.form-controls { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; }
.puzzle-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 2rem; }
.puzzle-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: transform 0.3s ease; }
.puzzle-card:hover { transform: translateY(-5px); }
.puzzle-card-header h3 { color: var(--primary-color); }
.puzzle-content { display: grid; grid-template-columns: 1fr 350px; gap: 2rem; align-items: flex-start; }
.grid-container { background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: flex; justify-content: center; align-items: center; }
.crossword-grid { display: grid; gap: 2px; aspect-ratio: 1 / 1; width: 100%; max-width: 600px; }
.grid-cell { width: 100%; height: 100%; position: relative; background: var(--light-bg); }
.grid-cell.blocked { background: var(--blocked-cell-color); border: none; }
.grid-cell.active { background: white; border: 1px solid #bdc3c7; }
.cell-number { position: absolute; top: 1px; left: 2px; font-size: clamp(0.4rem, 1.5vw, 0.6rem); font-weight: bold; color: var(--primary-color); z-index: 2; }
.grid-cell input { width: 100%; height: 100%; border: none; outline: none; text-align: center; font-size: clamp(0.6rem, 2.5vw, 1.1rem); font-weight: bold; background: transparent; z-index: 1; padding: 0; }
.grid-cell input:focus { background: #e7f3ff; }
/* NOUVEAU: Style pour le mot actif */
.grid-cell.active-word { background-color: #fffbe6; }
.grid-cell.active-word input:focus { background-color: #fff3c4; }

.grid-cell.correct input { background: #d4edda !important; }
.grid-cell.incorrect input { background: #f8d7da !important; }
.clues-container { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-height: 65vh; overflow-y: auto; }
.clues-section h3 { color: var(--primary-color); margin-bottom: 1rem; }
.clues-section ul { list-style: none; padding: 0; }
.clues-section li { margin-bottom: 0.75rem; padding: 0.5rem; border-radius: 6px; border-left: 3px solid transparent; transition: all 0.2s ease; cursor: pointer; }
.clues-section li:hover { background: #e7f3ff; border-left-color: var(--primary-color); }
.clue-number { font-weight: bold; margin-right: 0.5rem; }
.help-section { background: white; padding: 1.5rem; border-radius: 12px; margin-top: 1rem; border-left: 4px solid var(--primary-color); }
.help-tip { display: flex; align-items: center; margin-bottom: 0.75rem; font-size: 0.9rem; }
.tip-icon { font-size: 1.2rem; margin-right: 0.75rem; }

@media (max-width: 992px) {
    .puzzle-content { grid-template-columns: 1fr; }
    .clues-container { max-height: 40vh; }
}
@media (max-width: 768px) {
    .word-group { grid-template-columns: 1fr; }
    .button-container, .form-controls { flex-direction: column; align-items: stretch; }
}
`;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Crossword Master v2.1: Initializing with direction lock...");
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    appState.puzzles = loadPuzzlesFromStorage();
    appState.completedPuzzles = loadCompletedPuzzles();
    
    if (appState.puzzles.length === 0) {
        const samplePuzzle: CrosswordPuzzle = {
            id: 'sample1',
            title: 'Puzzle de Cybersécurité',
            theme: 'Cybersécurité',
            words: [
                { id: 'w1', word: 'FIREWALL', definition: 'Mur de protection réseau', direction: 'horizontal' },
                { id: 'w2', word: 'VIRUS', definition: 'Logiciel malfaisant qui se réplique', direction: 'horizontal' },
                { id: 'w3', word: 'SECURITE', definition: 'Le sujet principal de la protection', direction: 'horizontal' },
                { id: 'w4', word: 'ANTIVIRUS', definition: 'Logiciel qui protège contre les menaces', direction: 'horizontal' },
                { id: 'w5', word: 'HAMEÇONNAGE', definition: 'Technique de fraude par email', direction: 'horizontal' },
                { id: 'w6', word: 'CHIFFREMENT', definition: 'Rend les données illisibles sans clé', direction: 'horizontal' },
                { id: 'w7', word: 'RESEAU', definition: 'Ensemble d\'ordinateurs connectés', direction: 'horizontal' },
                { id: 'w8', word: 'PIRATE', definition: 'Personne qui exploite les failles', direction: 'horizontal' },
            ],
            createdAt: new Date().toISOString()
        };
        
        samplePuzzle.grid = generateGrid(samplePuzzle.words);
        appState.puzzles.push(samplePuzzle);
        savePuzzlesToStorage(appState.puzzles);
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const puzzleIdFromUrl = urlParams.get('puzzleId');
    
    if (puzzleIdFromUrl) {
        const puzzleToLoad = appState.puzzles.find(p => p.id === puzzleIdFromUrl);
        if (puzzleToLoad) {
            appState.studentAccessMode = true;
            startPuzzle(puzzleIdFromUrl);
        } else {
            appState.studentAccessMode = true;
            appState.errorMessage = "Puzzle introuvable ou lien invalide. Veuillez vérifier l'URL.";
            navigateTo('welcome');
        }
    } else {
        renderApp();
    }
    
    console.log("✅ Crossword Master v2.1: Initialization complete!");
});
