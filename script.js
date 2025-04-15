// Global variables
const LOG_ENABLED = true;
const IFRAME_URL = 'https://hcm-eu10-sales.hr.cloud.sap/sf/liveprofile?mdfObjectType=cust_kpr2';
// Stała określająca tytuł dialogu, który ma być monitorowany
const DIALOG_TITLE_TO_MONITOR = 'cust_kpr1:';

function logInfo(logMessage) {
    if (LOG_ENABLED) {
        console.log(logMessage);
    }
}

function logError(errorMessage) {
    if (LOG_ENABLED) {
        console.error(errorMessage);
    }
}

function createModal() {
    const background = createBackground();
    const modalContent = createModalContent();
    const closeModal = createCloseModal();
    const iframeContainer = createIframeContainer();
    const iframe = createIframe(IFRAME_URL);

    document.body.appendChild(background);
    background.appendChild(modalContent);
    modalContent.appendChild(closeModal);
    modalContent.appendChild(iframeContainer);
    iframeContainer.appendChild(iframe);

    handleContentContainerStyle(iframe);
    closeModal.addEventListener('click', () => handleCloseModalClick(background, iframeContainer));
    window.addEventListener('click', (event) => handleWindowClick(event, background, iframeContainer));
    setupAcceptButtonListener(iframe, background, iframeContainer);

    iframe.onload = () => handleIframeLoad(iframe);
}

// Główna funkcja sterująca sekwencją kliknięć
function startClickSequence(iframe) {
    logInfo("Rozpoczynam sekwencję kliknięć");

    // Funkcja sprawdzająca dostępność elementów w regularnych odstępach czasu
    const checkInterval = setInterval(() => {
        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDocument) {
                logInfo("Dokument iframe niedostępny, próbuję ponownie...");
                return;
            }

            // Szukamy pierwszego przycisku
            const firstButton = findSAPButton(iframeDocument, "__button2");
            if (firstButton) {
                logInfo("Znaleziono przycisk Edytuj - ID: __button2");

                // Zatrzymujemy interwał po znalezieniu przycisku
                clearInterval(checkInterval);

                // Klikamy w przycisk na różne sposoby
                triggerSAPButtonClick(firstButton);

                // Po kliknięciu pierwszego przycisku ustawiamy timeout na kliknięcie drugiego
                setTimeout(() => {
                    logInfo("Szukam drugiego przycisku...");
                    const secondCheckInterval = setInterval(() => {
                        try {
                            const updatedDoc = iframe.contentDocument || iframe.contentWindow.document;
                            if (!updatedDoc) return;

                            const secondButton = findSAPButton(updatedDoc, "__button12");
                            if (secondButton) {
                                logInfo("Znaleziono przycisk Dodaj - ID: __button12");

                                clearInterval(secondCheckInterval);
                                triggerSAPButtonClick(secondButton);

                                // ZMODYFIKOWANE: Rozpoczynamy monitorowanie widoczności dialogu z tytułem cust_kpr1:
                                startDialogVisibilityMonitoring(iframe);
                            }
                        } catch (e) {
                            logError("Błąd podczas szukania drugiego przycisku: " + e);
                        }
                    }, 300);

                    setTimeout(() => clearInterval(secondCheckInterval), 10000);
                }, 800);
            }
        } catch (e) {
            logError("Błąd podczas sprawdzania przycisków: " + e);
        }
    }, 300);

    setTimeout(() => clearInterval(checkInterval), 10000);
}

// NOWA FUNKCJA: monitorowanie widoczności dialogu zamiast przycisków
function startDialogVisibilityMonitoring(iframe) {
    logInfo(`Rozpoczynam monitorowanie widoczności dialogu z tytułem: ${DIALOG_TITLE_TO_MONITOR}`);

    let dialogFound = false;
    let visibilityCheckCount = 0;
    const maxChecks = 3000; // Maksymalna liczba prób monitorowania (5 minut przy interwale 100ms)

    const dialogVisibilityInterval = setInterval(() => {
        visibilityCheckCount++;

        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDocument) {
                return;
            }

            if (visibilityCheckCount % 30 === 0) {
                logInfo(`Próba #${visibilityCheckCount} sprawdzania widoczności dialogu z tytułem: ${DIALOG_TITLE_TO_MONITOR}`);
            }

            // Używamy nowej, bardziej ogólnej metody do sprawdzania widoczności dialogu
            const isDialogVisible = isDialogPresent(iframeDocument);

            // Jeśli dialog został znaleziony po raz pierwszy, zapisujemy tę informację
            if (isDialogVisible && !dialogFound) {
                dialogFound = true;
                logInfo(`Dialog z tytułem ${DIALOG_TITLE_TO_MONITOR} został znaleziony po raz pierwszy.`);
            }

            // Jeśli dialog został znaleziony wcześniej, ale teraz zniknął, zamykamy iframe
            if (dialogFound && !isDialogVisible) {
                logInfo(`Dialog z tytułem ${DIALOG_TITLE_TO_MONITOR} był widoczny, ale zniknął. Zamykam iframe.`);
                clearInterval(dialogVisibilityInterval);

                // Zamykamy modal/iframe
                const background = document.getElementById('myModal');
                const iframeContainer = document.getElementById('iframeContainer');

                if (background) background.style.display = 'none';
                if (iframeContainer) iframeContainer.innerHTML = '';

                return;
            }

            // Sprawdzamy zagnieżdżone iframe
            if (!isDialogVisible) {
                let nestedDialogFound = false;

                // Pobieramy wszystkie iframe z dokumentu
                const frames = iframeDocument.querySelectorAll('iframe');
                for (const frame of frames) {
                    try {
                        const frameDoc = frame.contentDocument || frame.contentWindow.document;
                        if (frameDoc) {
                            // Używamy nowej metody również do zagnieżdżonych iframe
                            if (isDialogPresent(frameDoc)) {
                                nestedDialogFound = true;
                                break;
                            }

                            // Sprawdzamy jeszcze głębiej zagnieżdżone iframe (do 2 poziomów)
                            const nestedFrames = frameDoc.querySelectorAll('iframe');
                            for (const nestedFrame of nestedFrames) {
                                try {
                                    const nestedDoc = nestedFrame.contentDocument || nestedFrame.contentWindow.document;
                                    if (nestedDoc && isDialogPresent(nestedDoc)) {
                                        nestedDialogFound = true;
                                        break;
                                    }
                                } catch (e) {
                                    // Ignoruj błędy dostępu do iframe z innego źródła
                                }
                            }

                            if (nestedDialogFound) break;
                        }
                    } catch (e) {
                        // Ignoruj błędy dostępu do iframe z innego źródła
                    }
                }

                if (nestedDialogFound && !dialogFound) {
                    dialogFound = true;
                    logInfo(`Dialog z tytułem ${DIALOG_TITLE_TO_MONITOR} został znaleziony w zagnieżdżonym iframe.`);
                } else if (dialogFound && !nestedDialogFound) {
                    logInfo(`Dialog z tytułem ${DIALOG_TITLE_TO_MONITOR} był widoczny w zagnieżdżonym iframe, ale zniknął. Zamykam iframe.`);
                    clearInterval(dialogVisibilityInterval);

                    // Zamykamy modal/iframe
                    const background = document.getElementById('myModal');
                    const iframeContainer = document.getElementById('iframeContainer');

                    if (background) background.style.display = 'none';
                    if (iframeContainer) iframeContainer.innerHTML = '';

                    return;
                }
            }

            // Jeśli osiągnęliśmy maksymalną liczbę prób, zatrzymujemy monitorowanie
            if (visibilityCheckCount >= maxChecks) {
                logInfo("Osiągnięto maksymalną liczbę prób. Zatrzymuję monitorowanie widoczności dialogu.");
                clearInterval(dialogVisibilityInterval);
            }

        } catch (e) {
            logError("Błąd podczas monitorowania widoczności dialogu: " + e);
            if (visibilityCheckCount >= maxChecks) {
                clearInterval(dialogVisibilityInterval);
            }
        }
    }, 100);

    // Zatrzymaj monitorowanie po dłuższym czasie (5 minut)
    setTimeout(() => {
        if (dialogVisibilityInterval) {
            clearInterval(dialogVisibilityInterval);
            logInfo("Zakończono monitorowanie widoczności dialogu po upływie maksymalnego czasu");
        }
    }, 300000);
}

// Funkcja sprawdzająca widoczność dialogu z określonym tytułem
function checkDialogVisibility(document) {
    try {
        // Sprawdzamy wszystkie dialogi SAP UI5 po klasach
        const dialogs = document.querySelectorAll('.sapMDialog, .sapMPopup-CTX, .sapMDialogOpen');

        for (const dialog of dialogs) {
            // Unikamy badania ID, sprawdzamy czy dialog jest widoczny po stylach
            if (getComputedStyle(dialog).visibility !== 'hidden' && getComputedStyle(dialog).display !== 'none') {
                // Sprawdzamy czy dialog zawiera tytuł, którego szukamy
                const titleTexts = dialog.querySelectorAll('.sapMTitle, .sapMDialogTitle, .sapMIBarText, h1, h2, .sapUiInvisibleText');

                for (const titleText of titleTexts) {
                    if (titleText.textContent && titleText.textContent.includes(DIALOG_TITLE_TO_MONITOR)) {
                        return true;
                    }
                }

                // Sprawdzamy wszystkie elementy span w dialogu
                const spans = dialog.querySelectorAll('span');
                for (const span of spans) {
                    if (span.textContent && span.textContent.includes(DIALOG_TITLE_TO_MONITOR)) {
                        return true;
                    }
                }
            }
        }

        // Sprawdzamy też po zawartości bez względu na strukturę (jako ostatnia deska ratunku)
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
            // Sprawdzamy tylko elementy, które mogą zawierać tekst i są widoczne
            if (element.textContent &&
                element.textContent.includes(DIALOG_TITLE_TO_MONITOR) &&
                getComputedStyle(element).visibility !== 'hidden' &&
                getComputedStyle(element).display !== 'none') {

                // Sprawdzamy, czy element jest częścią dialogu
                const isInDialog = element.closest('.sapMDialog') ||
                    element.closest('.sapMPopup-CTX') ||
                    element.closest('.sapMDialogOpen');

                if (isInDialog) {
                    return true;
                }
            }
        }

        return false;
    } catch (e) {
        logError("Błąd podczas sprawdzania widoczności dialogu: " + e);
        return false;
    }
}

// Funkcja znajdująca dialog po treści, bez polegania na ID
function findDialogByContent(document) {
    try {
        // Szukamy najpierw po atrybutach danych zamiast po ID
        const allElements = document.querySelectorAll('[data-help-id], [aria-label], [title]');

        for (const element of allElements) {
            // Sprawdzamy różne atrybuty które mogą zawierać informacje o dialogu
            const helpId = element.getAttribute('data-help-id');
            const ariaLabel = element.getAttribute('aria-label');
            const title = element.getAttribute('title');

            // Sprawdzamy czy którykolwiek z atrybutów zawiera szukany tekst
            if ((helpId && helpId.includes('kpr1')) ||
                (ariaLabel && ariaLabel.includes('kpr1')) ||
                (title && title.includes('kpr1'))) {

                // Sprawdzamy czy element jest widoczny
                if (getComputedStyle(element).display !== 'none' &&
                    getComputedStyle(element).visibility !== 'hidden') {
                    return true;
                }
            }

            // Sprawdzamy również bezpośrednią zawartość tekstową
            if (element.textContent && element.textContent.includes(DIALOG_TITLE_TO_MONITOR)) {
                // Sprawdzamy, czy element jest częścią dialogu SAP po klasach
                if (element.closest('.sapMDialog') ||
                    element.closest('.sapMPopup-CTX') ||
                    element.closest('.sapMDialogOpen')) {
                    return true;
                }
            }
        }

        return false;
    } catch (e) {
        logError("Błąd podczas szukania dialogu po treści: " + e);
        return false;
    }
}

// Funkcja sprawdzająca, czy dialog jest widoczny - bardziej ogólna implementacja
function isDialogPresent(document) {
    try {
        // Sprawdzamy obecność dialogu po klasach SAP UI5, bez polegania na ID
        const sapDialogs = document.querySelectorAll('.sapMDialog.sapMDialogOpen, .sapMPopup-CTX:not(.sapMDialogClosed)');

        for (const dialog of sapDialogs) {
            // Sprawdzamy styl widoczności
            const dialogStyle = getComputedStyle(dialog);
            if (dialogStyle.display !== 'none' && dialogStyle.visibility !== 'hidden') {
                // Sprawdzamy, czy dialog zawiera tekst, którego szukamy
                if (dialog.textContent && dialog.textContent.includes(DIALOG_TITLE_TO_MONITOR)) {
                    return true;
                }
            }
        }

        // Alternatywne podejście - szukamy elementów nagłówka dialogu
        const dialogHeaders = document.querySelectorAll('.sapMDialogTitle, .sapMIBar.sapMHeader-CTX, .sapMBarMiddle');
        for (const header of dialogHeaders) {
            if (header.textContent && header.textContent.includes(DIALOG_TITLE_TO_MONITOR)) {
                // Sprawdzamy, czy nagłówek jest częścią widocznego dialogu (przez rodzica)
                let parent = header.parentElement;
                while (parent) {
                    if (parent.classList &&
                        parent.classList.contains('sapMDialog') &&
                        !parent.classList.contains('sapMDialogClosed')) {
                        const parentStyle = getComputedStyle(parent);
                        if (parentStyle.display !== 'none' && parentStyle.visibility !== 'hidden') {
                            return true;
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }

        return false;
    } catch (e) {
        logError("Błąd podczas sprawdzania obecności dialogu: " + e);
        return false;
    }
}

// Funkcja znajdująca przycisk SAP UI5 po ID
function findSAPButton(doc, buttonId) {
    // Próbujemy najpierw bezpośrednio przez ID
    let button = doc.getElementById(buttonId);
    if (button) return button;

    // Jeśli nie znaleziono, próbujemy przez selektor
    button = doc.querySelector(`button[id="${buttonId}"]`);
    if (button) return button;

    // Próbujemy przez atrybut data-sap-ui
    button = doc.querySelector(`button[data-sap-ui="${buttonId}"]`);
    if (button) return button;

    // Jeśli wciąż nie znaleziono, sprawdzamy wszystkie ramki w dokumencie
    const frames = doc.querySelectorAll('iframe');
    for (const frame of frames) {
        try {
            const frameDoc = frame.contentDocument || frame.contentWindow.document;
            if (frameDoc) {
                const frameButton = findSAPButton(frameDoc, buttonId);
                if (frameButton) return frameButton;
            }
        } catch (e) {
            logInfo("Brak dostępu do zawartości iframe: " + e);
        }
    }
    return null;
}

// Funkcja wywołująca kliknięcie na różne sposoby
// Główna funkcja klikająca przycisk na różne sposoby
function triggerSAPButtonClick(button) {
    logInfo("Próbuję kliknąć przycisk na różne sposoby");
    performStandardClick(button);
    performMouseEventClick(button);
    performInnerElementClick(button);
    performScriptExecution(button);
}

function performStandardClick(button) {
// Funkcja wykonująca standardowe kliknięcie
    button.click();
    logInfo("Wykonano standardowe kliknięcie");
}

function performMouseEventClick(button) {
// Funkcja symulująca zdarzenie myszy
    try {
        const mouseEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: button.ownerDocument.defaultView
        });
        button.dispatchEvent(mouseEvent);
        logInfo("Wykonano kliknięcie przez MouseEvent");
    } catch (e) {
        logError("Błąd podczas symulacji zdarzenia myszy: " + e);
    }
}

function performInnerElementClick(button) {
// Funkcja klikająca wewnętrzny element (często używany w SAP UI5)
    try {
        const innerElement = button.querySelector('[id$="-inner"]');
        if (innerElement) {
            innerElement.click();
            logInfo("Wykonano kliknięcie na wewnętrznym elemencie");
        }
    } catch (e) {
        logError("Błąd podczas klikania wewnętrznego elementu: " + e);
    }
}

function performScriptExecution(button) {
// Funkcja wykonująca skrypt bezpośrednio w kontekście dokumentu
    try {
        const doc = button.ownerDocument;
        const script = doc.createElement('script');
        const buttonId = button.id;
        script.textContent = createButtonClickScript(buttonId);

        doc.body.appendChild(script);
        doc.body.removeChild(script);
        logInfo("Wykonano skrypt bezpośrednio w dokumencie");
    } catch (e) {
        logError("Błąd podczas wykonywania skryptu w dokumencie: " + e);
    }
}

function createButtonClickScript(buttonId) {
// Funkcja przygotowująca skrypt do wykonania kliknięcia
    return `
        (function() {
            try {
                var btn = document.getElementById('${buttonId}');
                if (btn) {
                    console.log('Znaleziono przycisk w skrypcie');
                    btn.click();
                    
                    // Próba wywołania zdarzenia SAP UI5 (jeśli dostępne)
                    if (window.sap && window.sap.ui) {
                        var control = sap.ui.getCore().byId('${buttonId}');
                        if (control && typeof control.firePress === 'function') {
                            control.firePress();
                            console.log('Wywołano firePress na kontrolce SAP UI5');
                        }
                    }
                }
            } catch(e) {
                console.error('Błąd w skrypcie kliknięcia:', e);
            }
        })();
    `;
}

function createBackground() {
    const background = document.createElement('div');
    background.id = 'myModal';
    background.style.display = 'none';
    background.style.position = 'fixed';
    background.style.zIndex = '1';
    background.style.left = '0';
    background.style.top = '0';
    background.style.width = '100%';
    background.style.height = '100%';
    background.style.overflow = 'auto';
    background.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    background.style.display = 'block';
    return background;
}

function createModalContent() {
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#aaaaaa';
    modalContent.style.margin = '4% auto';
    modalContent.style.padding = '20px';
    modalContent.style.border = '1px solid #888';
    modalContent.style.width = '645px';
    modalContent.style.borderRadius = '2rem';
    return modalContent;
}

function createCloseModal() {
    const closeModal = document.createElement('span');
    closeModal.innerHTML = '&times;';
    closeModal.style.cursor = 'pointer';
    closeModal.style.float = 'right';
    closeModal.style.fontSize = '28px';
    closeModal.style.fontWeight = 'bold';
    return closeModal;
}

function createIframeContainer() {
    const iframeContainer = document.createElement('div');
    iframeContainer.id = 'iframeContainer';
    iframeContainer.style.position = 'relative';
    return iframeContainer;
}

function createIframe(src) {
    const iframe = document.createElement('iframe');
    iframe.id = 'iframe';
    iframe.src = src;
    iframe.style.width = '100%';
    iframe.style.height = '460px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '1.5rem';
    return iframe;
}

function handleContentContainerStyle(iframe) {
    const checkContentContainer = setInterval(() => {
        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDocument) {
                const contentContainer = iframeDocument.getElementById('contentContainer');
                if (contentContainer) {
                    contentContainer.style.margin = '20px';
                    contentContainer.style.border = '0px';
                    contentContainer.style.background = 'none';
                    clearInterval(checkContentContainer);
                }
            }
        } catch (e) {
            logError('Error accessing iframe content: ' + e);
            clearInterval(checkContentContainer);
        }
    }, 500);
}

function handleCloseModalClick(background, iframeContainer) {
    background.style.display = 'none';
    iframeContainer.innerHTML = '';
    logInfo("Modal został zamknięty przez przycisk X");
}

function setupAcceptButtonListener(iframe, background, iframeContainer) {
    const checkButtonListeners = setInterval(() => {
        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            const dialogs = iframeDocument.querySelectorAll('.dialogBoxWrapper');
            if (iframeDocument && dialogs.length > 0) {
                const dialog = dialogs[0];
                const buttons = dialog.querySelectorAll('.globalPrimaryButton');
                if (buttons.length > 0) {
                    addClickListenerToButtons(buttons, background, iframeContainer, dialog);
                }
            }
        } catch (e) {
            logError('Cannot add listener: ' + e);
            clearInterval(checkButtonListeners);
        }
    }, 300);
}

function addClickListenerToButtons(buttons, background, iframeContainer, dialog) {
    buttons.forEach(button => {
        if (button.name !== "OK" && button.name !== "Upload") {
            if (button.name === "Submit") {
                button.addEventListener('click', () => {
                    waitForDialogClose(dialog, background, iframeContainer);
                });
            } else {
                button.addEventListener('click', () => handleCloseModalClick(background, iframeContainer));
            }
        }
    });
}

function waitForDialogClose(dialog, background, iframeContainer) {
    const checkDialogClosed = setInterval(() => {
        if (!document.body.contains(dialog)) {
            clearInterval(checkDialogClosed);
            handleCloseModalClick(background, iframeContainer);
        }
    }, 300);
}

function handleWindowClick(event, background, iframeContainer) {
    if (event.target === background) {
        handleCloseModalClick(background, iframeContainer);
    }
}

function handleIframeLoad(iframe) {
    logInfo("Iframe załadowany, rozpoczynam sekwencję kliknięć");
    setTimeout(() => startClickSequence(iframe), 800);
}

createModal();