function createModal() {
    const background = createBackground();
    const modalContent = createModalContent();
    const closeModal = createCloseModal();
    const iframeContainer = createIframeContainer();
    const iframe = createIframe('https://hcm-eu10-sales.hr.cloud.sap/sf/liveprofile?mdfObjectType=cust_kpr2');

    document.body.appendChild(background);
    background.appendChild(modalContent);
    modalContent.appendChild(closeModal);
    modalContent.appendChild(iframeContainer);
    iframeContainer.appendChild(iframe);

    // Nasłuchiwanie załadowania iframe
    iframe.onload = () => {
        adjustIframeSize(iframe);
        console.log("Iframe załadowany, czekam na gotowość DOM");

        // Po załadowaniu iframe, obserwuj zmiany w dokumencie
        observeIframeForButtons(iframe);
    };

    handleContentContainerStyle(iframe, background, iframeContainer);
    checkAndHideIframeElements(iframe, background, iframeContainer);
    closeModal.addEventListener('click', () => handleCloseModalClick(background, iframeContainer));
    window.addEventListener('click', (event) => handleWindowClick(event, background, iframeContainer));
    setupAcceptButtonListener(iframe, background, iframeContainer);
}

// Obserwacja zmian w iframe do wykrywania przycisków
function observeIframeForButtons(iframe) {
    let isFirstButtonClicked = false;
    let observerInstance = null;

    // Funkcja do obsługi zmian w DOM
    function handleDOMChanges() {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc) return;

            if (!isFirstButtonClicked) {
                // Szukamy pierwszego przycisku
                const firstButton = findSAPButton(iframeDoc, "__button2");
                if (firstButton) {
                    console.log("Znaleziono przycisk Edytuj - gotowy do kliknięcia");

                    // Dajemy chwilę na stabilizację DOM
                    requestAnimationFrame(() => {
                        triggerSAPButtonClick(firstButton);
                        isFirstButtonClicked = true;
                        console.log("Kliknięto pierwszy przycisk, oczekuję na pojawienie się drugiego przycisku");

                        // Restartujemy obserwacje do wyszukiwania drugiego przycisku
                        if (observerInstance) {
                            observerInstance.disconnect();
                        }

                        // Dajemy chwilę na przeładowanie zawartości po kliknięciu
                        setTimeout(() => {
                            setupObserver(iframe);
                        }, 500);
                    });
                }
            } else {
                // Szukamy drugiego przycisku
                const secondButton = findSAPButton(iframeDoc, "__button12");
                if (secondButton) {
                    console.log("Znaleziono przycisk Dodaj - gotowy do kliknięcia");

                    // Dajemy chwilę na stabilizację DOM
                    requestAnimationFrame(() => {
                        triggerSAPButtonClick(secondButton);
                        console.log("Kliknięto drugi przycisk");

                        // Zatrzymujemy obserwację po kliknięciu drugiego przycisku
                        if (observerInstance) {
                            observerInstance.disconnect();
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Błąd podczas obserwacji DOM:", e);
        }
    }

    // Ustawienie obserwatora MutationObserver
    function setupObserver(iframe) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc) {
                console.log("Dokument iframe niedostępny, próbuję ponownie za chwilę");
                setTimeout(() => setupObserver(iframe), 200);
                return;
            }

            // Sprawdź najpierw, czy przyciski już istnieją
            handleDOMChanges();

            // Utwórz nowy obserwator
            const observer = new MutationObserver((mutations) => {
                handleDOMChanges();
            });

            // Konfiguracja obserwatora - obserwuj cały dokument, w tym zmiany w drzewie i atrybutach
            const config = {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class', 'id']
            };

            // Rozpocznij obserwację
            observer.observe(iframeDoc.documentElement, config);
            observerInstance = observer;

            console.log("Ustawiono obserwator DOM dla iframe");

            // Dodatkowe nasłuchiwanie na zdarzenia związane z ładowaniem elementów
            iframe.contentWindow.addEventListener('DOMContentLoaded', handleDOMChanges);
            iframe.contentWindow.addEventListener('load', handleDOMChanges);

            // Fallback: Sprawdź jeszcze raz po ustalonym czasie (w przypadku gdy zdarzenia nie zadziałają)
            setTimeout(handleDOMChanges, 1000);
            setTimeout(handleDOMChanges, 3000);
        } catch (e) {
            console.error("Błąd podczas ustawiania obserwatora:", e);
            // W przypadku błędu, spróbuj ponownie za chwilę
            setTimeout(() => setupObserver(iframe), 500);
        }
    }

    // Rozpocznij obserwację
    setupObserver(iframe);
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
            console.log("Brak dostępu do zawartości iframe:", e);
        }
    }

    return null;
}

// Funkcja wywołująca kliknięcie na różne sposoby
function triggerSAPButtonClick(button) {
    console.log("Próbuję kliknąć przycisk na różne sposoby");

    // Próba 1: Standardowe kliknięcie
    button.click();
    console.log("Wykonano standardowe kliknięcie");

    // Próba 2: Symulacja zdarzenia myszy
    try {
        const mouseEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: button.ownerDocument.defaultView
        });
        button.dispatchEvent(mouseEvent);
        console.log("Wykonano kliknięcie przez MouseEvent");
    } catch (e) {
        console.error("Błąd podczas symulacji zdarzenia myszy:", e);
    }

    // Próba 3: Symulacja zdarzenia UI5 (jeśli SAP UI5 używa własnych zdarzeń)
    try {
        // Sprawdź, czy istnieje wewnętrzny element (często używany w SAP UI5)
        const innerElement = button.querySelector('[id$="-inner"]');
        if (innerElement) {
            innerElement.click();
            console.log("Wykonano kliknięcie na wewnętrznym elemencie");
        }
    } catch (e) {
        console.error("Błąd podczas klikania wewnętrznego elementu:", e);
    }

    // Próba 4: Wykonaj skrypt bezpośrednio w kontekście dokumentu
    try {
        const doc = button.ownerDocument;
        const win = doc.defaultView;
        const script = doc.createElement('script');
        const buttonId = button.id;
        script.textContent = `
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
        doc.body.appendChild(script);
        doc.body.removeChild(script);
        console.log("Wykonano skrypt bezpośrednio w dokumencie");
    } catch (e) {
        console.error("Błąd podczas wykonywania skryptu w dokumencie:", e);
    }
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
    modalContent.style.width = '70%';
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
    return iframeContainer;
}

function createIframe(src) {
    const iframe = document.createElement('iframe');
    iframe.id = 'iframe';
    iframe.src = src;
    iframe.style.width = '100%';
    iframe.style.height = '500px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '1.5rem';
    return iframe;
}

function adjustIframeSize(iframe) {
    try {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDocument) {
            const contentWidth = iframeDocument.body.scrollWidth;
        }
    } catch (e) {
        console.error('Error adjusting iframe size:', e);
    }
}

function handleContentContainerStyle(iframe, background, iframeContainer) {
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
            console.error('Error accessing iframe content:', e);
            clearInterval(checkContentContainer);
        }
    }, 500);
}

function checkAndHideIframeElements(iframe, background, iframeContainer) {
    console.log("refreshed script")
    const checkIframeLoaded = setInterval(() => {
        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDocument) {
                const cancelBtn = iframeDocument.getElementById('dlgButton_327_');
                const topNav = iframeDocument.getElementById('renderTopNavFixedWidthV12');
                const adminBreadcrumbs = iframeDocument.getElementById('admin-breadcrums');
                const metaDataHeader = iframeDocument.getElementById('4__metaDataHeader');
                const searchBarContainer = iframeDocument.getElementById('4__searchBarContainer');
                const header = iframeDocument.getElementById('globalHeaderFullWidthBackground');
                [header, topNav, adminBreadcrumbs, metaDataHeader, searchBarContainer].forEach(el => {
                    if (el) el.style.display = 'none';
                });

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        background.style.display = 'none';
                        iframeContainer.innerHTML = '';
                    });
                    clearInterval(checkIframeLoaded);
                }
            }
        } catch (e) {
            console.error('Cannot find element to hide', e);
            clearInterval(checkIframeLoaded);
        }
    }, 300);
}

function handleCloseModalClick(background, iframeContainer) {
    background.style.display = 'none';
    iframeContainer.innerHTML = '';
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
            console.error('Cannot add listener', e);
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

createModal();