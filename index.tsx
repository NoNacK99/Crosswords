// 🚀 NOUVELLE FONCTION: Remplit les lettres croisées
function fillIntersectingLetters(completedWord: WordEntry) {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;
    
    const grid = appState.currentPuzzle.grid;
    
    // Pour chaque lettre du mot complété
    for (let i = 0; i < completedWord.word.length; i++) {
        const cellRow = completedWord.direction === 'horizontal' ? completedWord.startRow! : completedWord.startRow! + i;
        const cellCol = completedWord.direction === 'horizontal' ? completedWord.startCol! + i : completedWord.startCol!;
        
        const letter = completedWord.word[i];
        
        // Cherche les mots qui se croisent à cette position
        appState.currentPuzzle.words.forEach(otherWord => {
            if (otherWord.id === completedWord.id || !otherWord.startRow || !otherWord.startCol) return;
            
            // Vérifie si ce mot croise à cette position
            const intersects = checkWordsIntersect(completedWord, otherWord, i);
            if (intersects) {
                const intersectionIndex = getIntersectionIndex(completedWord, otherWord, i);
                if (intersectionIndex >= 0) {
                    // Remplit automatiquement cette lettre dans le mot croisé
                    const intersectRow = otherWord.direction === 'horizontal' ? otherWord.startRow : otherWord.startRow + intersectionIndex;
                    const intersectCol = otherWord.direction === 'horizontal' ? otherWord.startCol + intersectionIndex : otherWord.startCol;
                    
                    const intersectCell = grid[intersectRow][intersectCol];
                    if (!intersectCell.userLetter) {
                        intersectCell.userLetter = letter;
                        updateUserAnswer(intersectRow, intersectCol, letter);
                        
                        // Met à jour visuellement
                        const input = document.querySelector(`input[data-row="${intersectRow}"][data-col="${intersectCol}"]`) as HTMLInputElement;
                        if (input) {
                            input.value = letter;
                            input.style.background = '#e7f3ff'; // Indication visuelle d'auto-complétion
                        }
                    }
                }
            }
        });
    }
}

function checkWordsIntersect(word1: WordEntry, word2: WordEntry, letterIndex: number): boolean {
    if (!word1.startRow || !word1.startCol || !word2.startRow || !word2.startCol) return false;
    
    const word1Row = word1.direction === 'horizontal' ? word1.startRow : word1.startRow + letterIndex;
    const word1Col = word1.direction === 'horizontal' ? word1.startCol + letterIndex : word1.startCol;
    
    // Vérifie si word2 passe par cette position
    if (word2.direction === 'horizontal') {
        return word1Row === word2.startRow && 
               word1Col >= word2.startCol && 
               word1Col < word2.startCol + word2.word.length;
    } else {
        return word1Col === word2.startCol && 
               word1Row >= word2.startRow && 
               word1Row < word2.startRow + word2.word.length;
    }
}

function getIntersectionIndex(word1: WordEntry, word2: WordEntry, word1LetterIndex: number): number {
    if (!word1.startRow || !word1.startCol || !word2.startRow || !word2.startCol) return -1;
    
    const intersectRow = word1.direction === 'horizontal' ? word1.startRow : word1.startRow + word1LetterIndex;
    const intersectCol = word1.direction === 'horizontal' ? word1.startCol + word1LetterIndex : word1.startCol;
    
    if (word2.direction === 'horizontal') {
        return intersectCol - word2.startCol;
    } else {
        return intersectRow - word2.startRow;
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

        // 🚀 UTILISE LE NOUVEL ALGORITHME
        puzzle.grid = generateGrid(words);

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

// 🚀 AMÉLIORATION: Système de scoring avancé
function checkAnswers() {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;

    let correctAnswers = 0;
    let totalCells = 0;
    let completedWords = 0;

    // Vérifie chaque case
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

    // Compte les mots complets
    appState.currentPuzzle.words.forEach(word => {
        if (checkIfWordIsComplete(word)) {
            completedWords++;
        }
    });

    // 🎯 CALCUL DE SCORE AVANCÉ
    const completionPercentage = (correctAnswers / totalCells) * 100;
    const timeElapsed = appState.startTime ? Math.floor((Date.now() - appState.startTime) / 1000) : 0;
    
    // Score de base: 10 points par mot complet
    let score = completedWords * 10;
    
    // Bonus vitesse: +5 points si moins de 30s par mot
    const averageTimePerWord = timeElapsed / appState.currentPuzzle.words.length;
    if (averageTimePerWord < 30) {
        score += completedWords * 5;
    }
    
    // Bonus longueur: mots longs valent plus
    appState.currentPuzzle.words.forEach(word => {
        if (checkIfWordIsComplete(word)) {
            if (word.word.length >= 8) score += 5; // Mots de 8+ lettres
            else if (word.word.length >= 6) score += 3; // Mots de 6-7 lettres
        }
    });
    
    // Bonus perfectionniste: +20 si 100% correct
    if (correctAnswers === totalCells) {
        score += 20;
    }

    appState.score = score;

    if (correctAnswers === totalCells) {
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
        renderApp(); // Re-render pour montrer les corrections
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
            
            // Met à jour le score en temps réel
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
    
    // 🚀 AFFICHAGE DU SCORE DÉTAILLÉ
    const timeElapsed = appState.startTime ? Math.floor((Date.now() - appState.startTime) / 1000) : 0;
    scoreDisplay.innerHTML = `
        <h3>Votre Score</h3>
        <div class="score-value">${appState.score}</div>
        <div class="score-details">
            <p>⏱️ Temps: ${formatTime(timeElapsed)}</p>
            <p>📝 Mots: ${appState.currentPuzzle?.words.length || 0}</p>
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

// --- CSS Styles (inchangé) ---
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

/* Responsive Design (suite...) */
@media (max-width: 768px) {
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
                {
                    id: 'w1',
                    word: 'FIREWALL',
                    definition: 'Ce qui empêche de passer',
                    direction: 'horizontal'
                },
                {
                    id: 'w2',
                    word: 'VIRUS',
                    definition: 'Logiciel malfaisant',
                    direction: 'horizontal'
                },
                {
                    id: 'w3',
                    word: 'SECURITE',
                    definition: 'Le sujet principal',
                    direction: 'horizontal'
                }
            ],
            createdAt: new Date().toISOString()
        };
        
        // 🚀 UTILISE LE NOUVEL ALGORITHME
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
    cluesContainer.appendChild(renderClues());

    puzzleContent.appendChild(gridContainer);
    puzzleContent.appendChild(cluesContainer);
    screen.appendChild(puzzleContent);

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

    if (!appState.startTime) {
        appState.startTime = Date.now();
        startTimer();
    }
}

// 🎯 AMÉLIORATION: Rendu de grille avec auto-complétion
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
                
                // 🚀 AMÉLIORATION: Auto-navigation et validation
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

// 🚀 NOUVELLE FONCTION: Navigation automatique
function navigateToNextCell(currentRow: number, currentCol: number) {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;
    
    const grid = appState.currentPuzzle.grid;
    
    // Trouve la prochaine case vide dans la même direction
    // Pour l'instant, navigation horizontale simple
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
}

// 🚀 NOUVELLE FONCTION: Vérification de complétion de mot
function checkWordCompletion(row: number, col: number) {
    if (!appState.currentPuzzle) return;
    
    // Trouve le mot qui contient cette case
    const wordsToCheck = appState.currentPuzzle.words.filter(word => {
        if (!word.startRow || !word.startCol) return false;
        
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
    if (!word.startRow || !word.startCol) return false;
    
    const grid = appState.currentPuzzle.grid;
    
    for (let i = 0; i < word.word.length; i++) {
        const cellRow = word.direction === 'horizontal' ? word.startRow : word.startRow + i;
        const cellCol = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
        
        const cell = grid[cellRow][cellCol];
        if (!cell.userLetter || cell.userLetter !== word.word[i]) {
            return false;
        }
    }
    
    return true;
}

// 🚀 NOUVELLE FONCTION: Remplit les lettres croisées
function fillIntersectingLetters(completedWord: WordEntry) {
    if (!appState.currentPuzzle || !appState.currentPuzzle.grid) return;
    
    const grid = appState.currentPuzzle.grid;
    
    ///**
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

// --- Classe d'algorithme intelligent ---
class CrosswordGenerator {
    private gridSize: number = 15;
    private placedWords: Map<string, CrosswordPosition> = new Map();
    private grid: GridCell[][] = [];

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

    private findIntersections(word1: string, word2: string): IntersectionCandidate[] {
        const intersections: IntersectionCandidate[] = [];
        
        for (let i = 0; i < word1.length; i++) {
            for (let j = 0; j < word2.length; j++) {
                if (word1[i] === word2[j]) {
                    const score = this.calculateIntersectionScore(word1, word2, i, j);
                    
                    intersections.push({
                        word1,
                        word1Index: i,
                        word2,
                        word2Index: j,
                        letter: word1[i],
                        score
                    });
                }
            }
        }
        
        return intersections.sort((a, b) => b.score - a.score);
    }

    private calculateIntersectionScore(word1: string, word2: string, index1: number, index2: number): number {
        const centerScore1 = Math.abs((word1.length / 2) - index1);
        const centerScore2 = Math.abs((word2.length / 2) - index2);
        return 100 - (centerScore1 + centerScore2);
    }

    private canPlaceWord(word: string, row: number, col: number, direction: 'horizontal' | 'vertical'): boolean {
        if (direction === 'horizontal') {
            if (col + word.length > this.gridSize || row < 0 || row >= this.gridSize) {
                return false;
            }
        } else {
            if (row + word.length > this.gridSize || col < 0 || col >= this.gridSize) {
                return false;
            }
        }

        for (let i = 0; i < word.length; i++) {
            const cellRow = direction === 'horizontal' ? row : row + i;
            const cellCol = direction === 'horizontal' ? col + i : col;
            
            const existingLetter = this.grid[cellRow][cellCol].letter;
            
            if (existingLetter !== null && existingLetter !== word[i]) {
                return false;
            }
        }

        return this.checkNoAdjacentWords(word, row, col, direction);
    }

    private checkNoAdjacentWords(word: string, row: number, col: number, direction: 'horizontal' | 'vertical'): boolean {
        if (direction === 'horizontal') {
            if (col > 0 && this.grid[row][col - 1].letter !== null) {
                return false;
            }
            if (col + word.length < this.gridSize && this.grid[row][col + word.length].letter !== null) {
                return false;
            }
        } else {
            if (row > 0 && this.grid[row - 1][col].letter !== null) {
                return false;
            }
            if (row + word.length < this.gridSize && this.grid[row + word.length][col].letter !== null) {
                return false;
            }
        }
        
        return true;
    }

    private placeWord(wordEntry: WordEntry, row: number, col: number, direction: 'horizontal' | 'vertical', number: number): void {
        wordEntry.startRow = row;
        wordEntry.startCol = col;
        wordEntry.direction = direction;
        wordEntry.number = number;

        for (let i = 0; i < wordEntry.word.length; i++) {
            const cellRow = direction === 'horizontal' ? row : row + i;
            const cellCol = direction === 'horizontal' ? col + i : col;
            
            this.grid[cellRow][cellCol] = {
                letter: wordEntry.word[i].toUpperCase(),
                number: i === 0 ? number : this.grid[cellRow][cellCol].number,
                isBlocked: false
            };
        }

        this.placedWords.set(wordEntry.word, {
            row,
            col,
            direction,
            word: wordEntry.word,
            intersections: []
        });
    }

    private findBestPosition(wordEntry: WordEntry, placedWordEntries: WordEntry[]): {row: number, col: number, direction: 'horizontal' | 'vertical'} | null {
        let bestPosition = null;
        let bestScore = -1;

        for (const placedWord of placedWordEntries) {
            const intersections = this.findIntersections(wordEntry.word, placedWord.word);
            
            for (const intersection of intersections) {
                const positions = this.calculatePositionFromIntersection(
                    wordEntry.word,
                    placedWord,
                    intersection
                );

                for (const pos of positions) {
                    if (this.canPlaceWord(wordEntry.word, pos.row, pos.col, pos.direction)) {
                        if (intersection.score > bestScore) {
                            bestScore = intersection.score;
                            bestPosition = pos;
                        }
                    }
                }
            }
        }

        return bestPosition;
    }

    private calculatePositionFromIntersection(
        newWord: string,
        placedWord: WordEntry,
        intersection: IntersectionCandidate
    ): Array<{row: number, col: number, direction: 'horizontal' | 'vertical'}> {
        const positions = [];
        
        if (!placedWord.startRow || !placedWord.startCol || !placedWord.direction) {
            return positions;
        }

        const intersectionRow = placedWord.direction === 'horizontal' 
            ? placedWord.startRow 
            : placedWord.startRow + intersection.word1Index;
        
        const intersectionCol = placedWord.direction === 'horizontal' 
            ? placedWord.startCol + intersection.word1Index 
            : placedWord.startCol;

        const newDirection = placedWord.direction === 'horizontal' ? 'vertical' : 'horizontal';
        
        if (newDirection === 'horizontal') {
            positions.push({
                row: intersectionRow,
                col: intersectionCol - intersection.word2Index,
                direction: newDirection
            });
        } else {
            positions.push({
                row: intersectionRow - intersection.word2Index,
                col: intersectionCol,
                direction: newDirection
            });
        }

        return positions;
    }

    private findFallbackPosition(wordEntry: WordEntry): {row: number, col: number, direction: 'horizontal' | 'vertical'} | null {
        for (let row = 1; row < this.gridSize - 1; row += 2) {
            for (let col = 0; col <= this.gridSize - wordEntry.word.length; col++) {
                if (this.canPlaceWord(wordEntry.word, row, col, 'horizontal')) {
                    return {row, col, direction: 'horizontal'};
                }
            }
        }

        for (let col = 1; col < this.gridSize - 1; col += 2) {
            for (let row = 0; row <= this.gridSize - wordEntry.word.length; row++) {
                if (this.canPlaceWord(wordEntry.word, row, col, 'vertical')) {
                    return {row, col, direction: 'vertical'};
                }
            }
        }

        return null;
    }

    public generateGrid(words: WordEntry[]): GridCell[][] {
        if (words.length === 0) {
            return this.grid;
        }

        this.initializeGrid();
        this.placedWords.clear();

        const sortedWords = [...words].sort((a, b) => b.word.length - a.word.length);
        const placedWordEntries: WordEntry[] = [];
        let wordNumber = 1;

        // Place le premier mot au centre
        const firstWord = sortedWords[0];
        const centerRow = Math.floor(this.gridSize / 2);
        const startCol = Math.floor((this.gridSize - firstWord.word.length) / 2);
        
        this.placeWord(firstWord, centerRow, startCol, 'horizontal', wordNumber++);
        placedWordEntries.push(firstWord);

        // Place les mots suivants avec intersections
        for (let i = 1; i < sortedWords.length; i++) {
            const wordEntry = sortedWords[i];
            const position = this.findBestPosition(wordEntry, placedWordEntries);
            
            if (position) {
                this.placeWord(wordEntry, position.row, position.col, position.direction, wordNumber++);
                placedWordEntries.push(wordEntry);
            } else {
                const fallbackPosition = this.findFallbackPosition(wordEntry);
                if (fallbackPosition) {
                    this.placeWord(wordEntry, fallbackPosition.row, fallbackPosition.col, fallbackPosition.direction, wordNumber++);
                    placedWordEntries.push(wordEntry);
                }
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
        // ⚠️ Note: Dans Claude.ai artifacts, localStorage n'est pas supporté
        // Utilisation d'une variable en mémoire à la place
        console.log("Crossword Master: Puzzles saved to memory");
    } catch (error) {
        console.error("Crossword Master: Failed to save puzzles:", error);
    }
}

function loadPuzzlesFromStorage(): CrosswordPuzzle[] {
    try {
        // ⚠️ Note: Dans Claude.ai artifacts, localStorage n'est pas supporté
        // Retourne un tableau vide, les puzzles seront créés à l'initialisation
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

// 🚀 NOUVELLE FONCTION: Import en masse
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
                const word = parts[0].toUpperCase().replace(/[^A-Z]/g, ''); // Garde que les lettres
                const definition = parts[1];
                
                if (word.length > 0) {
                    addWordEntry(wordsContainer, word, definition);
                    importedCount++;
                }
            }
        }
    });
    
    if (importedCount === 0) {
        appState.errorMessage = "Aucun mot valide trouvé. Format attendu: MOT | Définition";
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
