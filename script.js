// Global variables
const LOG_ENABLED = true;
const IFRAME_URL = 'https://hcm-eu10-sales.hr.cloud.sap/sf/liveprofile?mdfObjectType=cust_kpr2';

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

                                // WAŻNE: Monitoruj zmiany DOM po kliknięciu drugiego przycisku, aby wykryć moment pojawienia się przycisków
                                monitorDialogAppearance(iframe);
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

// Nowa funkcja do ciągłego monitorowania zmian DOM w poszukiwaniu przycisków dialogu
// Funkcja do monitorowania pojawienia się przycisków dialogu
function monitorDialogAppearance(iframe) {
    logInfo("Rozpoczynam monitorowanie pojawienia się przycisków Anuluj/Zapisz - nowa metoda");

    let buttonCheckCount = 0;
    const maxChecks = 300; // Zwiększona liczba prób

    // Sprawdzaj regularnie, czy przyciski się pojawiły
    const dialogCheckInterval = setInterval(() => {
        buttonCheckCount++;

        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDocument) return;

            if (buttonCheckCount % 10 === 0) {
                logInfo(`Próba #${buttonCheckCount} wyszukania przycisków Anuluj/Zapisz`);
            }

            // Szukaj przycisków i dodaj obsługę zdarzeń
            const foundButtons = findDialogButtons(iframeDocument);

            if (foundButtons.cancelButton || foundButtons.saveButton) {
                // Dodaj obsługę zdarzeń do znalezionych przycisków
                if (foundButtons.cancelButton) {
                    addCloseHandlerToButton(foundButtons.cancelButton, "Anuluj");
                }

                if (foundButtons.saveButton) {
                    addCloseHandlerToButton(foundButtons.saveButton, "Zapisz");
                }
            } else if (buttonCheckCount >= maxChecks) {
                logInfo("Osiągnięto maksymalną liczbę prób. Zatrzymuję sprawdzanie.");
                clearInterval(dialogCheckInterval);
            }

            // Szukaj również przycisków w zagnieżdżonych iframe
            processNestedIframes(iframeDocument);

        } catch (e) {
            logError("Błąd podczas monitorowania dialogu: " + e);
            if (buttonCheckCount >= maxChecks) {
                clearInterval(dialogCheckInterval);
            }
        }
    }, 100); // Częstsze sprawdzanie

    // Zatrzymaj sprawdzanie po dłuższym czasie
    setTimeout(() => {
        clearInterval(dialogCheckInterval);
        logInfo("Zakończono monitorowanie przycisków po upływie maksymalnego czasu");
    }, 300000); // 5 minut
}

// Funkcja wyszukująca przyciski Anuluj/Zapisz w dokumencie
function findDialogButtons(document) {
    // 1. Szukaj po atrybutach data-help-id
    const cancelByHelpId = document.querySelector('button[data-help-id="editPageCancelAddButton"]');
    const saveByHelpId = document.querySelector('button[data-help-id="editPageSaveButton"]');

    // 2. Szukaj po title
    const cancelByTitle = document.querySelector('button[title="Anuluj"]');
    const saveByTitle = document.querySelector('button[title="Zapisz"]');

    // 3. Szukaj po tekście przycisku (sprawdzamy wszystkie przyciski)
    let cancelByText = null;
    let saveByText = null;

    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
        const buttonText = button.textContent?.trim();
        if (buttonText?.includes('Anuluj')) {
            cancelByText = button;
        } else if (buttonText?.includes('Zapisz')) {
            saveByText = button;
        }
    }

    // Wybierz znalezione przyciski (w kolejności preferencji)
    const cancelButton = cancelByHelpId || cancelByTitle || cancelByText;
    const saveButton = saveByHelpId || saveByTitle || saveByText;

    return { cancelButton, saveButton };
}

// Funkcja dodająca obsługę zdarzenia do przycisku
function addCloseHandlerToButton(button, buttonType) {
    if (!button._hasCloseListener) {
        // Dodajemy oznaczenie, że przycisk ma już obsługę zdarzenia
        button._hasCloseListener = true;
        button.setAttribute('data-listener', 'true');

        // Przygotuj informacje debugowe
        const buttonAttrs = {
            id: button.id,
            helpId: button.getAttribute('data-help-id'),
            title: button.getAttribute('title'),
            text: button.textContent?.trim(),
            className: button.className
        };
        logInfo(`Znaleziono przycisk ${buttonType}: ${JSON.stringify(buttonAttrs)}`);

        // Funkcja zamykająca modal
        const closeFunc = function() {
            logInfo(`KLIKNIĘCIE ${buttonType} - zamykam modal bezpośrednio`);
            const background = document.getElementById('myModal');
            const iframeContainer = document.getElementById('iframeContainer');

            if (background) background.style.display = 'none';
            if (iframeContainer) iframeContainer.innerHTML = '';
        };

        // Dodaj obsługę zdarzenia na dwa sposoby dla pewności
        button.onclick = closeFunc;
        button.addEventListener('click', closeFunc);
        logInfo(`Dodano obsługę zdarzenia do przycisku ${buttonType}`);
    }
}

// Funkcja przetwarzająca zagnieżdżone ramki iframe
function processNestedIframes(document) {
    const nestedIframes = document.querySelectorAll('iframe');
    for (const nestedIframe of nestedIframes) {
        try {
            const nestedDoc = nestedIframe.contentDocument || nestedIframe.contentWindow.document;
            if (nestedDoc) {
                const nestedButtons = nestedDoc.querySelectorAll('button');
                for (const button of nestedButtons) {
                    const buttonText = button.textContent?.trim();

                    if (buttonText?.includes('Anuluj') && !button._hasCloseListener) {
                        addCloseHandlerToButton(button, "ZAGNIEŻDŻONY Anuluj");
                    } else if (buttonText?.includes('Zapisz') && !button._hasCloseListener) {
                        addCloseHandlerToButton(button, "ZAGNIEŻDŻONY Zapisz");
                    }
                }
            }
        } catch (e) {
            // Ignoruj błędy dostępu do iframe z innego źródła
        }
    }
}// Funkcja znajdująca przycisk SAP UI5 po ID
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
    modalContent.style.backgroundColor = '#ff5a00';
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