/**
 * CROSSWORD MASTER v2.0
 * Système de mots croisés éducatifs interactifs avec algorithme intelligent
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
    private gridSize: number = 20; // MODIFIÉ: Un peu plus grand pour plus de 10 mots
    private placedWords: Map<string, WordEntry> = new Map();
    private grid: GridCell[][] = [];
    // NOUVEAU: Stockage des intersections pré-calculées
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
    
    // NOUVEAU: Pré-calcul de toutes les intersections possibles entre paires de mots
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
                    this.intersectionCache.set(key2, intersections.map(int => ({ // Inverser pour la recherche dans l'autre sens
                        word1: int.word2,
                        word1Index: int.word2Index,
                        word2: int.word1,
                        word2Index: int.word1Index,
                        letter: int.letter,
                        score: int.score // Le score de base reste le même
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
                        score: 1 // Score de base, nous allons le complexifier
                    });
                }
            }
        }
        return intersections;
    }
    
    // MODIFIÉ: La fonction de score est maintenant beaucoup plus puissante
    private calculatePlacementScore(word: string, row: number, col: number, direction: 'horizontal' | 'vertical'): number {
        let score = 0;
        let intersections = 0;

        for (let i = 0; i < word.length; i++) {
            const current_row = direction === 'horizontal' ? row : row + i;
            const current_col = direction === 'horizontal' ? col + i : col;

            // Le mot croise un mot existant
            if (this.grid[current_row][current_col].letter === word[i].toUpperCase()) {
                intersections++;
                score += 50; // Gros bonus pour chaque intersection
            }
            
            // Le mot est adjacent à un autre mot (prépare un futur croisement)
            // Vérification haut/bas pour un mot horizontal
            if (direction === 'horizontal') {
                if (current_row > 0 && this.grid[current_row - 1][current_col].letter !== null) score += 1;
                if (current_row < this.gridSize - 1 && this.grid[current_row + 1][current_col].letter !== null) score += 1;
            }
            // Vérification gauche/droite pour un mot vertical
            else {
                if (current_col > 0 && this.grid[current_row][current_col - 1].letter !== null) score += 1;
                if (current_col < this.gridSize - 1 && this.grid[current_row][current_col + 1].letter !== null) score += 1;
            }
        }

        // Pénalité pour les mots sans aucune intersection
        if (intersections === 0) {
            return -1; // On veut absolument éviter ça
        }
        
        // Bonus pour la densité
        score += intersections * 100;
        
        // Bonus de compacité (léger)
        const centerMalus = Math.abs(row - this.gridSize / 2) + Math.abs(col - this.gridSize / 2);
        score -= centerMalus;
        
        return score;
    }

    private canPlaceWord(word: string, row: number, col: number, direction: 'horizontal' | 'vertical'): boolean {
        // Vérification des limites
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

            // Si la case n'est pas vide et ne correspond pas à la lettre d'intersection
            if (letterAtCell !== null && letterAtCell !== currentWordLetter) {
                return false;
            }
            // Si la case est vide, on vérifie que le placement ne colle pas un mot parallèle
            if (letterAtCell === null) {
                if (direction === 'horizontal') {
                    // Vérifie au-dessus et en-dessous
                    if ((r > 0 && this.grid[r - 1][c].letter !== null) || (r < this.gridSize - 1 && this.grid[r + 1][c].letter !== null)) {
                        return false;
                    }
                } else { // 'vertical'
                    // Vérifie à gauche et à droite
                    if ((c > 0 && this.grid[r][c - 1].letter !== null) || (c < this.gridSize - 1 && this.grid[r][c + 1].letter !== null)) {
                        return false;
                    }
                }
            }
        }
        
        // Vérifie qu'on ne colle pas un mot au début ou à la fin
        if (direction === 'horizontal') {
            if ((col > 0 && this.grid[row][col-1].letter !== null) || (col + word.length < this.gridSize && this.grid[row][col+word.length].letter !== null)){
                return false;
            }
        } else { // 'vertical'
             if ((row > 0 && this.grid[row-1][col].letter !== null) || (row + word.length < this.gridSize && this.grid[row+word.length][col].letter !== null)){
                return false;
            }
        }

        return true;
    }

    // MODIFIÉ: La recherche est maintenant basée sur le nouveau score
    private findBestPosition(wordToPlace: WordEntry): { row: number; col: number; direction: 'horizontal' | 'vertical'; score: number } | null {
        let bestPosition = null;

        // Pour chaque mot déjà placé
        for (const placedWord of this.placedWords.values()) {
            const key = `${placedWord.word}-${wordToPlace.word}`;
            const intersections = this.intersectionCache.get(key) || [];

            // Pour chaque intersection possible entre le nouveau mot et un mot placé
            for (const intersection of intersections) {
                // Note: La logique de calcul de la position a été un peu simplifiée et corrigée
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
                 // Ne pas écraser un numéro existant
                 if (this.grid[cellRow][cellCol].number === null) {
                    this.grid[cellRow][cellCol].number = number;
                 }
            }
        }
        this.placedWords.set(wordEntry.word, wordEntry);
    }
    
    // MODIFIÉ: La logique principale de génération
    public generateGrid(words: WordEntry[]): GridCell[][] {
        if (words.length === 0) return this.grid;

        this.initializeGrid();
        this.placedWords.clear();
        
        // NOUVEAU: Pré-calculer les intersections
        this.precomputeIntersections(words);
        const sortedWords = [...words].sort((a, b) => b.word.length - a.word.length);
        
        let unplacedWords = [...sortedWords];
        let wordNumber = 1;
        
        // Place le premier mot au centre
        const firstWord = unplacedWords.shift();
        if(!firstWord) return this.grid;
        
        const startRow = Math.floor(this.gridSize / 2);
        const startCol = Math.floor((this.gridSize - firstWord.word.length) / 2);
        this.placeWord(firstWord, startRow, startCol, 'horizontal', wordNumber++);

        // Placer les mots restants
        let attempts = 0;
        while (unplacedWords.length > 0 && attempts < words.length * 2) {
            let bestPlacement: { word: WordEntry; pos: any; } | null = null;
            let wordIndexToPlace = -1;

            // Trouver le meilleur mot à placer parmi ceux qui restent
            for (let i = 0; i < unplacedWords.length; i++) {
                const wordToPlace = unplacedWords[i];
                const position = this.findBestPosition(wordToPlace);
                if (position && position.score > (bestPlacement?.pos.score ?? -1)) {
                    bestPlacement = { word: wordToPlace, pos: position };
                    wordIndexToPlace = i;
                }
            }

            if (bestPlacement) {
                // Attribuer un numéro seulement si la case de départ est vide
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

        // Finaliser les numéros pour qu'ils soient uniques et séquentiels
        const numberMap = new Map<number, number>();
        let nextNumber = 1;
        for (const word of this.placedWords.values()) {
            if (word.number && !numberMap.has(word.number)) {
                numberMap.set(word.number, nextNumber++);
            }
        }
        for (const word of this.placedWords.values()) {
             if (word.number) {
                word.number = numberMap.get(word.number);
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

// --- NOUVEAU ALGORITHME DE GÉNÉRATION DE GRILLE ---
function generateGrid(words: WordEntry[]): GridCell[][] {
    console.log("🧠 Génération intelligente de la grille avec", words.length, "mots");
    const generator = new CrosswordGenerator();
    const result = generator.generateGrid(words);
    
    // Log pour debug
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

// 🎯 AMÉLIORATION: Interface de création avec option paste en masse
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

    // 🚀 NOUVELLE SECTION: Paste en masse
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

    // Section mots (existante)
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

// 🚀 NOUVELLE FONCTION: Import en masse SÉCURISÉ
function handleBulkImport(text: string) {
    clearErrorMessage();
    
    if (!text.trim()) {
        appState.errorMessage = "Veuillez coller du texte à importer.";
        renderErrorMessage();
        return;
    }

    const lines = text.trim().split('\n');
    const wordsContainer = document.getElementById('words-container') as HTMLElement;
    
    // Vide le container
    wordsContainer.innerHTML = '';
    
    let importedCount = 0;
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
            // Supporte différents séparateurs: |, :, -
            const separators = ['|', ':', '-'];
            let parts: string[] = [];
            
            for (const sep of separators) {
                if (trimmedLine.includes(sep)) {
                    parts = trimmedLine.split(sep).map(p => p.trim());
                    break;
                }
            }
            
            if (parts.length >= 2 && parts[0] && parts[1]) {
                // 🐛 CORRECTION: Nettoyage strict du mot
                let word = parts[0].toUpperCase()
                    .replace(/[^A-Z]/g, '') // Garde que les lettres
                    .replace(/\s+/g, ''); // Supprime tous les espaces
                
                const definition = parts[1];
                
                // 🚨 VALIDATION: Rejette les mots problématiques
                if (word.length > 0 && word.length <= 15) { // Max 15 lettres
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
        addWordEntry(wordsContainer); // Ajoute au moins un champ vide
    } else {
        // Message de succès temporaire
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = `✅ ${importedCount} mots importés avec succès !`;
        successMsg.style.background = '#d4edda';
        successMsg.style.color = '#155724';
        successMsg.style.padding = '1rem';
        successMsg.style.borderRadius = '8px';
        successMsg.style.marginBottom = '1rem';
        
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
        (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase();
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
    
    // 🚀 NOUVEAU: Bouton Vérifier en haut de la zone définitions
    const verifySection = document.createElement('div');
    verifySection.className = 'verify-section-top';
    
    const checkButton = document.createElement('button');
    checkButton.textContent = 'Vérifier';
    checkButton.className = 'btn btn-primary verify-btn';
    checkButton.onclick = checkAnswers;
    
    verifySection.appendChild(checkButton);
    cluesContainer.appendChild(verifySection);
    
    // Puis les définitions
    cluesContainer.appendChild(renderClues());

    puzzleContent.appendChild(gridContainer);
    puzzleContent.appendChild(cluesContainer);
    screen.appendChild(puzzleContent);

    // Contrôles simplifiés (juste Quitter)
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

    // 🚀 NOUVELLES BULLES D'AIDE
    const helpSection = document.createElement('div');
    helpSection.className = 'help-section';
    
    const helpTitle = document.createElement('h4');
    helpTitle.textContent = '💡 Astuces';
    helpTitle.style.color = '#0066cc';
    helpTitle.style.marginBottom = '1rem';
    helpSection.appendChild(helpTitle);

    const tips = [
        {
            icon: '🖱️',
            text: 'Cliquez sur une définition pour aller au mot dans la grille'
        },
        {
            icon: '⌨️',
            text: 'Double-cliquez sur une case pour effacer tout le mot'
        },
        {
            icon: '🏆',
            text: 'Score = 10pts/mot + bonus vitesse (<30s) + bonus longueur + 20pts si parfait'
        },
        {
            icon: '🔄',
            text: 'Les lettres communes se remplissent automatiquement'
        }
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

// 🎯 AMÉLIORATION: Rendu de grille avec auto-complétion
function renderGrid(): HTMLElement {
    const grid = document.createElement('div');
    
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) {
        grid.className = 'crossword-grid';
        return grid;
    }
    
    // Ajustement de la classe CSS pour la taille de la grille
    const gridSize = appState.currentPuzzle.grid.length;
    grid.className = `crossword-grid grid-${gridSize}`;
    grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;


    appState.currentPuzzle.grid.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.className = 'grid-cell';
            
            if (cell.isBlocked || cell.letter === null) { // MODIFIÉ: les cases non utilisées sont aussi bloquées visuellement
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
                
                // 🚀 AMÉLIORATION: Auto-navigation et validation + effacement
                input.oninput = (e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.toUpperCase();
                    updateUserAnswer(rowIndex, colIndex, target.value);
                    
                    // Auto-complétion si le mot est complet
                    checkWordCompletion(rowIndex, colIndex);
                    
                    // Navigation automatique à la case suivante
                    if (target.value) {
                        navigateToNextCell(rowIndex, colIndex);
                    }
                };
                
                // 🚀 NOUVEAU: Double-clic pour effacer tout le mot
                input.ondblclick = () => {
                    clearWordAtPosition(rowIndex, colIndex);
                };
                
                // 🚀 NOUVEAU: Raccourci Escape pour effacer le mot
                input.onkeydown = (e) => {
                    if (e.key === 'Escape') {
                        clearWordAtPosition(rowIndex, colIndex);
                        e.preventDefault();
                    }
                };
                
                // Validation visuelle
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

// 🚀 FONCTION ENTIÈREMENT RECODÉE: Focus sur un mot spécifique
function focusOnWord(word: WordEntry) {
    if (!appState.currentPuzzle?.grid) return;
    
    console.log(`🎯 Recherche du focus pour "${word.word}" #${word.number} (${word.direction})`);
    
    // 🔍 STRATÉGIE 1: Utiliser les coordonnées stockées du mot
    if (word.startRow !== undefined && word.startCol !== undefined) {
        const targetRow = word.startRow;
        const targetCol = word.startCol;
        
        console.log(`📍 Coordonnées stockées: (${targetRow}, ${targetCol})`);
        
        // Vérifier que cette case contient bien une partie du mot
        if (targetRow >= 0 && targetRow < appState.currentPuzzle.grid.length &&
            targetCol >= 0 && targetCol < appState.currentPuzzle.grid[0].length) {
            
            const cell = appState.currentPuzzle.grid[targetRow][targetCol];
            const expectedLetter = word.word[0].toUpperCase();
            
            if (cell.letter === expectedLetter) {
                console.log(`✅ Case trouvée avec la bonne lettre "${expectedLetter}"`);
                focusOnCell(targetRow, targetCol, word);
                return;
            }
        }
    }
    
    // 🔍 STRATÉGIE 2: Recherche par numéro dans toute la grille
    console.log(`🔍 Recherche du numéro ${word.number} dans la grille...`);
    
    for (let row = 0; row < appState.currentPuzzle.grid.length; row++) {
        for (let col = 0; col < appState.currentPuzzle.grid[row].length; col++) {
            const cell = appState.currentPuzzle.grid[row][col];
            
            if (cell.number === word.number) {
                console.log(`✅ Numéro ${word.number} trouvé à (${row}, ${col})`);
                focusOnCell(row, col, word);
                return;
            }
        }
    }
    
    // 🔍 STRATÉGIE 3: Recherche par première lettre du mot
    console.log(`🔍 Recherche de la première lettre "${word.word[0]}" du mot...`);
    
    const firstLetter = word.word[0].toUpperCase();
    const potentialCells: {row: number, col: number, score: number}[] = [];
    
    for (let row = 0; row < appState.currentPuzzle.grid.length; row++) {
        for (let col = 0; col < appState.currentPuzzle.grid[row].length; col++) {
            const cell = appState.currentPuzzle.grid[row][col];
            
            if (cell.letter === firstLetter) {
                // Vérifier si cette position peut être le début de notre mot
                const score = calculateWordStartScore(word, row, col);
                if (score > 0) {
                    potentialCells.push({row, col, score});
                }
            }
        }
    }
    
    if (potentialCells.length > 0) {
        // Prendre la meilleure position
        potentialCells.sort((a, b) => b.score - a.score);
        const best = potentialCells[0];
        console.log(`✅ Meilleure position trouvée à (${best.row}, ${best.col}) score: ${best.score}`);
        focusOnCell(best.row, best.col, word);
        return;
    }
    
    console.error(`❌ Impossible de trouver le début du mot "${word.word}" #${word.number}`);
}

// 🧮 NOUVELLE FONCTION: Calcule le score d'une position pour être le début d'un mot
function calculateWordStartScore(word: WordEntry, row: number, col: number): number {
    if (!appState.currentPuzzle?.grid) return 0;
    
    const grid = appState.currentPuzzle.grid;
    let score = 0;
    
    // Vérifier si on peut placer le mot entier dans cette direction
    if (word.direction === 'horizontal') {
        if (col + word.word.length > grid[0].length) return 0;
        
        // Vérifier chaque lettre du mot
        for (let i = 0; i < word.word.length; i++) {
            if (col + i >= grid[0].length) return 0;
            
            const cell = grid[row][col + i];
            const expectedLetter = word.word[i].toUpperCase();
            
            if (cell.letter === expectedLetter) {
                score += 10; // Bonne lettre = +10 points
            } else if (cell.letter !== null) {
                return 0; // Lettre incorrecte = échec
            }
        }
    } else {
        if (row + word.word.length > grid.length) return 0;
        
        // Vérifier chaque lettre du mot
        for (let i = 0; i < word.word.length; i++) {
            if (row + i >= grid.length) return 0;
            
            const cell = grid[row + i][col];
            const expectedLetter = word.word[i].toUpperCase();
            
            if (cell.letter === expectedLetter) {
                score += 10; // Bonne lettre = +10 points
            } else if (cell.letter !== null) {
                return 0; // Lettre incorrecte = échec
            }
        }
    }
    
    return score;
}

// 🎯 NOUVELLE FONCTION: Focus sur une case spécifique avec effet
function focusOnCell(row: number, col: number, word: WordEntry) {
    const input = document.querySelector(`input[data-row="${row}"][data-col="${col}"]`) as HTMLInputElement;
    
    if (input) {
        input.focus();
        input.select();
        
        console.log(`🎯 Focus réussi sur (${row}, ${col}) pour "${word.word}"`);
        
        // 🎨 EFFET VISUEL: Highlight temporaire du mot
        highlightWordTemporarily(word);
    } else {
        console.error(`❌ Input non trouvé à (${row}, ${col})`);
        
        // Afficher toutes les inputs disponibles pour debug
        const allInputs = document.querySelectorAll('input[data-row][data-col]');
        console.log(`📊 ${allInputs.length} inputs trouvés dans la grille`);
    }
}

// 🎨 NOUVELLE FONCTION: Highlight visuel temporaire
function highlightWordTemporarily(word: WordEntry) {
    if (word.startRow === undefined || word.startCol === undefined || !appState.currentPuzzle?.grid) return;
    
    const cellsToHighlight: HTMLElement[] = [];
    
    // Trouve toutes les cases du mot
    for (let i = 0; i < word.word.length; i++) {
        const cellRow = word.direction === 'horizontal' ? word.startRow : word.startRow + i;
        const cellCol = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
        
        const input = document.querySelector(`input[data-row="${cellRow}"][data-col="${cellCol}"]`) as HTMLInputElement;
        if (input && input.parentElement) {
            cellsToHighlight.push(input.parentElement);
        }
    }
    
    // Ajoute l'effet highlight
    cellsToHighlight.forEach(cell => {
        cell.style.backgroundColor = '#ffeb3b';
        cell.style.transform = 'scale(1.05)';
        cell.style.transition = 'all 0.3s ease';
    });
    
    // Retire l'effet après 1.5 secondes
    setTimeout(() => {
        cellsToHighlight.forEach(cell => {
            cell.style.backgroundColor = '';
            cell.style.transform = '';
        });
    }, 1500);
}
function clearWordAtPosition(row: number, col: number) {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;
    
    // Trouve le(s) mot(s) qui contient/contiennent cette case
    const wordsAtPosition = appState.currentPuzzle.words.filter(word => {
        if (word.startRow === undefined || word.startCol === undefined) return false;
        
        if (word.direction === 'horizontal') {
            return row === word.startRow && 
                   col >= word.startCol && 
                   col < word.startCol + word.word.length;
        } else {
            return col === word.startCol && 
                   row >= word.startRow && 
                   row < word.startRow + word.word.length;
        }
    });
    
    // Si plusieurs mots se croisent, demande lequel effacer
    let wordToClear: WordEntry | undefined;
    
    if (wordsAtPosition.length > 1) {
        // Affiche un menu pour choisir quel mot effacer
        const choice = confirm(`Plusieurs mots se croisent ici.\nCliquez OK pour effacer le mot HORIZONTAL, Annuler pour le VERTICAL.`);
        wordToClear = choice ? 
            wordsAtPosition.find(w => w.direction === 'horizontal') : 
            wordsAtPosition.find(w => w.direction === 'vertical');
    } else if (wordsAtPosition.length === 1) {
        wordToClear = wordsAtPosition[0];
    } else {
        return; // Aucun mot trouvé
    }
    
    if (!wordToClear || wordToClear.startRow === undefined || wordToClear.startCol === undefined) return;
    
    // Efface toutes les lettres du mot
    for (let i = 0; i < wordToClear.word.length; i++) {
        const cellRow = wordToClear.direction === 'horizontal' ? wordToClear.startRow : wordToClear.startRow + i;
        const cellCol = wordToClear.direction === 'horizontal' ? wordToClear.startCol + i : wordToClear.startCol;
        
        const cell = appState.currentPuzzle.grid[cellRow][cellCol];
        if (cell) {
            cell.userLetter = '';
            cell.isCorrect = undefined;
            
            // Met à jour visuellement
            const input = document.querySelector(`input[data-row="${cellRow}"][data-col="${cellCol}"]`) as HTMLInputElement;
            if (input) {
                input.value = '';
                input.style.background = '';
                // Retire les classes de validation
                const cellElement = input.parentElement;
                if (cellElement) {
                    cellElement.classList.remove('correct', 'incorrect');
                }
            }
        }
    }
    
    // Focus sur la première case du mot effacé
    const firstInput = document.querySelector(`input[data-row="${wordToClear.startRow}"][data-col="${wordToClear.startCol}"]`) as HTMLInputElement;
    if (firstInput) {
        firstInput.focus();
    }
    
    console.log(`✅ Mot "${wordToClear.word}" effacé`);
}
function navigateToNextCell(currentRow: number, currentCol: number) {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;
    
    const grid = appState.currentPuzzle.grid;
    
    // Trouve le mot qui contient cette case pour déterminer la direction
    const currentWord = appState.currentPuzzle.words.find(word => {
        if (word.startRow === undefined || word.startCol === undefined) return false;
        
        if (word.direction === 'horizontal') {
            return currentRow === word.startRow && 
                   currentCol >= word.startCol && 
                   currentCol < word.startCol + word.word.length;
        } else {
            return currentCol === word.startCol && 
                   currentRow >= word.startRow && 
                   currentRow < word.startRow + word.word.length;
        }
    });
    
    if (!currentWord) return;
    
    // Navigation selon la direction du mot
    if (currentWord.direction === 'horizontal') {
        for (let col = currentCol + 1; col < grid[currentRow].length; col++) {
            const cell = grid[currentRow][col];
            if (cell.letter && !cell.userLetter) {
                const nextInput = document.querySelector(`input[data-row="${currentRow}"][data-col="${col}"]`) as HTMLInputElement;
                if (nextInput) {
                    nextInput.focus();
                    return;
                }
            }
        }
    } else {
        // 🚀 NOUVEAU: Navigation verticale
        for (let row = currentRow + 1; row < grid.length; row++) {
            const cell = grid[row][currentCol];
            if (cell.letter && !cell.userLetter) {
                const nextInput = document.querySelector(`input[data-row="${row}"][data-col="${currentCol}"]`) as HTMLInputElement;
                if (nextInput) {
                    nextInput.focus();
                    return;
                }
            }
        }
    }
}

// 🚀 NOUVELLE FONCTION: Vérification de complétion de mot
function checkWordCompletion(row: number, col: number) {
    if (!appState.currentPuzzle) return;
    
    // Trouve le mot qui contient cette case
    const wordsToCheck = appState.currentPuzzle.words.filter(word => {
        if (word.startRow === undefined || word.startCol === undefined) return false;
        
        if (word.direction === 'horizontal') {
            return row === word.startRow && 
                   col >= word.startCol && 
                   col < word.startCol + word.word.length;
        } else {
            return col === word.startCol && 
                   row >= word.startRow && 
                   row < word.startRow + word.word.length;
        }
    });
    
    wordsToCheck.forEach(word => {
        const isComplete = checkIfWordIsComplete(word);
        if (isComplete) {
            // Auto-remplir les intersections si le mot est correct
            fillIntersectingLetters(word);
        }
    });
}

// 🚀 NOUVELLE FONCTION: Vérifie si un mot est complet
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

// 🚀 NOUVELLE FONCTION: Remplit les lettres croisées
function fillIntersectingLetters(completedWord: WordEntry) {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;
    if (completedWord.startRow === undefined || completedWord.startCol === undefined) return;
    
    const grid = appState.currentPuzzle.grid;
    
    // Pour chaque lettre du mot complété
    for (let i = 0; i < completedWord.word.length; i++) {
        const cellRow = completedWord.direction === 'horizontal' ? completedWord.startRow : completedWord.startRow + i;
        const cellCol = completedWord.direction === 'horizontal' ? completedWord.startCol + i : completedWord.startCol;
        
        const letter = completedWord.word[i].toUpperCase();
        
        // Trouve la case d'intersection dans la grille
        const intersectingCell = grid[cellRow][cellCol];
        
        // Si cette case n'a pas encore de lettre de l'utilisateur, on la remplit
        if (intersectingCell && !intersectingCell.userLetter) {
            intersectingCell.userLetter = letter;
            updateUserAnswer(cellRow, cellCol, letter);
            
            const input = document.querySelector(`input[data-row="${cellRow}"][data-col="${cellCol}"]`) as HTMLInputElement;
            if (input) {
                input.value = letter;
                input.style.background = '#e7f3ff'; // Met en évidence la lettre auto-complétée
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

    const horizontalList = document.createElement('ul'); // ul pour une liste non ordonnée plus sémantique
    const verticalList = document.createElement('ul');

    // Trier les mots par leur numéro pour un affichage ordonné
    const sortedWords = [...appState.currentPuzzle.words].sort((a,b) => (a.number || 0) - (b.number || 0));

    sortedWords.forEach(word => {
        if(!word.number) return; // Ne pas afficher les mots qui n'ont pas pu être placés

        const listItem = document.createElement('li');
        listItem.innerHTML = `<span class="clue-number">${word.number}.</span> ${word.definition}`;
        
        listItem.style.cursor = 'pointer';
        listItem.style.transition = 'background-color 0.2s ease';
        listItem.onclick = () => {
            focusOnWord(word);
        };
        
        listItem.onmouseover = () => {
            listItem.style.backgroundColor = '#e7f3ff';
        };
        listItem.onmouseout = () => {
            listItem.style.backgroundColor = '';
        };
        
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
                direction: 'horizontal' // La direction est déterminée par l'algorithme
            });
        });

        if (words.length === 0) {
            throw new Error("Le puzzle doit contenir au moins un mot.");
        }

        // Création du puzzle SANS la grille pour l'instant
        const puzzle: CrosswordPuzzle = {
            id: generateId(),
            title: title.trim(),
            theme: theme.trim(),
            words: words, // words sans positions pour l'instant
            createdAt: new Date().toISOString()
        };

        // Génération de la grille et mise à jour des mots avec leurs positions
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

// 🚀 AMÉLIORATION: Système de scoring avancé
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
            if (cell.letter) { // Seules les cases avec des lettres comptent
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

// --- CSS Styles complets ---
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

/* 🚀 NOUVEAUX STYLES pour auto-complétion */
.grid-cell.correct input {
    background: #d4edda !important;
    color: #155724;
    border-color: #c3e6cb;
}

.grid-cell.incorrect input {
    background: #f8d7da !important;
    color: #721c24;
    border-color: #f5c6cb;
}

.success-message {
    background: #d4edda;
    color: #155724;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid #c3e6cb;
}

.score-details {
    margin-top: 1rem;
    font-size: 0.9rem;
}

.score-details p {
    margin: 0.5rem 0;
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
    align-items: flex-start;
}

/* Crossword Grid */
.grid-container {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
}

.crossword-grid {
    display: grid;
    gap: 2px;
    aspect-ratio: 1 / 1;
}

.grid-cell {
    width: 100%;
    height: 100%;
    position: relative;
    background: #f8f9fa;
}

.grid-cell.blocked {
    background: #2c3e50;
    border: none;
}

.grid-cell.active {
    background: white;
    border: 1px solid #bdc3c7;
}

.cell-number {
    position: absolute;
    top: 1px;
    left: 2px;
    font-size: 0.6rem;
    font-weight: bold;
    color: #0066cc;
    z-index: 2;
    line-height: 1;
}

.grid-cell input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    text-align: center;
    font-size: 1.1rem;
    font-weight: bold;
    color: #2c3e50;
    background: transparent;
    z-index: 1;
    position: relative;
    padding: 0;
}

.grid-cell input:focus {
    background: #e7f3ff;
}

/* Clues */
.clues-container {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    max-height: 65vh; /* Hauteur maximale pour permettre le scroll */
    overflow-y: auto;
}
.verify-section-top {
    margin-bottom: 1rem;
}
.verify-btn {
    width: 100%;
}

.clues-section {
    margin-bottom: 1.5rem;
}

.clues-section h3 {
    color: #0066cc;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e9ecef;
}

.clues-section ul {
    list-style: none;
    padding: 0;
}

.clues-section li {
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    border-radius: 6px;
    border-left: 3px solid transparent;
}

.clues-section li:hover {
    background: #e7f3ff;
    border-left-color: #0066cc;
}

.clue-number {
    font-weight: bold;
    color: #0066cc;
    margin-right: 0.5rem;
}

/* Puzzle Controls simplifiés */
.puzzle-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1rem;
}

.puzzle-controls .btn {
    min-width: 120px;
}

/* 🚀 NOUVELLES BULLES D'AIDE */
.help-section {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-top: 1rem;
    border-left: 4px solid #0066cc;
}

.help-tip {
    display: flex;
    align-items: center;
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    background: #f8f9fa;
    border-radius: 6px;
    font-size: 0.9rem;
    line-height: 1.4;
}

.help-tip:last-child {
    margin-bottom: 0;
}

.tip-icon {
    font-size: 1.2rem;
    margin-right: 0.75rem;
    flex-shrink: 0;
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
@media (max-width: 992px) {
    .puzzle-content {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }
    .clues-container {
        max-height: 40vh;
    }
    .grid-container {
        padding: 1.5rem;
    }
}


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
    
    .grid-container {
        padding: 1rem;
    }
    .cell-number {
        font-size: 0.5rem;
    }
    .grid-cell input {
        font-size: 0.9rem;
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
        align-items: stretch;
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
`;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Crossword Master v2.0: Initializing with intelligent algorithm...");
    
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
    
    console.log("✅ Crossword Master v2.0: Initialization complete with intelligent features!");
});
