// Nowa funkcja dodająca overlay wokół dialogu
function addOverlayAroundDialog(doc, dialogElement) {
    try {
        // Sprawdzamy, czy overlay już istnieje
        const existingOverlay = doc.getElementById('sapDialogOverlay');
        if (existingOverlay) {
            // Jeśli istnieje, aktualizujemy jego pozycję
            positionOverlayAroundDialog(existingOverlay, dialogElement);
            return;
        }

        // Tworzymy nowy overlay
        const overlay = doc.createElement('div');
        overlay.id = 'sapDialogOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9998;
            pointer-events: none;
        `;

        // Dodajemy do dokumentu
        doc.body.appendChild(overlay);

        // Pozycjonujemy overlay wokół dialogu
        positionOverlayAroundDialog(overlay, dialogElement);

        log("Dodano overlay wokół dialogu");
    } catch (e) {
        log("Błąd podczas dodawania overlay: " + e, true);
    }
}

// Funkcja do pozycjonowania overlay wokół dialogu
function positionOverlayAroundDialog(overlay, dialogElement) {
    try {
        // Pobieramy pozycję i wymiary dialogu
        const rect = dialogElement.getBoundingClientRect();

        // Dodajemy margines wokół dialogu (piksele)
        const margin = 10;

        // Tworzymy "dziurę" w overlay poprzez clip-path
        overlay.style.clipPath = `
            polygon(
                0% 0%, 
                100% 0%, 
                100% 100%, 
                0% 100%,
                0% ${rect.top - margin}px, 
                ${rect.left - margin}px ${rect.top - margin}px, 
                ${rect.left - margin}px ${rect.bottom + margin}px, 
                ${rect.right + margin}px ${rect.bottom + margin}px, 
                ${rect.right + margin}px ${rect.top - margin}px, 
                0% ${rect.top - margin}px
            )
        `;

        // Dodajemy dodatkowy efekt dla lepszej widoczności dialogu
        dialogElement.style.boxShadow = '0 0 15px 5px rgba(255, 255, 255, 0.6)';
        dialogElement.style.zIndex = '9999';
    } catch (e) {
        log("Błąd podczas pozycjonowania overlay: " + e, true);
    }
}

// Funkcja czyszcząca overlay
function cleanupOverlay(iframe) {
    try {
        if (!iframe) return;

        const cleanupFromDoc = (doc) => {
            if (!doc) return;

            // Usuwamy overlay
            const overlay = doc.getElementById('sapDialogOverlay');
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }

            // Sprawdzamy wszystkie iframe
            const frames = doc.querySelectorAll('iframe');
            for (const frame of frames) {
                try {
                    const frameDoc = getIframeDocument(frame);
                    if (frameDoc) {
                        cleanupFromDoc(frameDoc);
                    }
                } catch (e) {
                    // Ignorujemy błędy dostępu do iframe
                }
            }
        };

        const doc = getIframeDocument(iframe);
        cleanupFromDoc(doc);

        log("Usunięto overlay");
    } catch (e) {
        log("Błąd podczas usuwania overlay: " + e, true);
    }
}// IIFE (Immediately Invoked Function Expression) dla ochrony zmiennych globalnych
(function() {
// Global variables - teraz są zamknięte w zakresie IIFE
    const LOG_ENABLED = true;
    const IFRAME_URL = 'https://hcm-eu10-sales.hr.cloud.sap/sf/liveprofile?mdfObjectType=cust_kpr2';
    const DIALOG_TITLE_TO_MONITOR = 'cust_kpr1:';
    const CHECK_INTERVAL_MS = 300;
    const DIALOG_CHECK_INTERVAL_MS = 200;
    const MAX_DIALOG_CHECKS = 1500; // 5 minut przy interwale 200ms

// Przechowywanie referencji do interwałów dla łatwiejszego czyszczenia
    const intervals = {
        buttonCheck: null,
        dialogVisibility: null,
        contentContainer: null
    };

    function log(message, isError = false) {
        if (LOG_ENABLED) {
            isError ? console.error(message) : console.log(message);
        }
    }

// Sprawdzenie, czy modal już istnieje przed utworzeniem nowego
    function createModal() {
        // Najpierw sprawdzamy, czy modal już istnieje
        const existingModal = document.getElementById('myModal');
        if (existingModal) {
            // Jeśli istnieje, usuwamy go
            existingModal.parentNode.removeChild(existingModal);
            log("Usunięto istniejący modal przed utworzeniem nowego");
        }

        // Tworzenie elementów UI
        const background = document.createElement('div');
        background.id = 'myModal';
        background.style.cssText = 'position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0, 0, 0, 0.5); display: block;';

        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'background-color: #aaaaaa; margin: 4% auto; padding: 20px; border: 1px solid #888; width: 645px; border-radius: 2rem;';

        const closeModal = document.createElement('span');
        closeModal.innerHTML = '&times;';
        closeModal.style.cssText = 'cursor: pointer; float: right; font-size: 28px; font-weight: bold; padding: 0 10px; z-index: 100; position: relative;';
        closeModal.setAttribute('role', 'button');
        closeModal.setAttribute('tabindex', '0');
        closeModal.setAttribute('aria-label', 'Zamknij');

        const iframeContainer = document.createElement('div');
        iframeContainer.id = 'iframeContainer';
        iframeContainer.style.position = 'relative';

        const iframe = document.createElement('iframe');
        iframe.id = 'iframe';
        iframe.src = IFRAME_URL;
        iframe.style.cssText = 'width: 100%; height: 460px; border: none; border-radius: 1.5rem;';

        // Dodanie elementów do DOM
        document.body.appendChild(background);
        background.appendChild(modalContent);
        modalContent.appendChild(closeModal);
        modalContent.appendChild(iframeContainer);
        iframeContainer.appendChild(iframe);

        // Obsługa zdarzeń
        // Używamy większej liczby zdarzeń dla przycisku zamykania
        closeModal.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            log("Kliknięto przycisk zamykania (onclick)");
            closeModalAndCleanup(background, iframeContainer);
        };

        closeModal.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            log("Kliknięto przycisk zamykania (addEventListener)");
            closeModalAndCleanup(background, iframeContainer);
        }, false);

        // Dodajemy obsługę klawiatury (Enter/Space)
        closeModal.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                log("Naciśnięto Enter/Space na przycisku zamykania");
                closeModalAndCleanup(background, iframeContainer);
            }
        });

        // Dodajemy wyraźne podświetlenie przy najechaniu
        closeModal.addEventListener('mouseover', function() {
            this.style.color = 'red';
            this.style.transform = 'scale(1.2)';
            this.style.transition = 'all 0.2s';
        });

        closeModal.addEventListener('mouseout', function() {
            this.style.color = '';
            this.style.transform = '';
        });

        background.addEventListener('click', (event) => {
            if (event.target === background) {
                closeModalAndCleanup(background, iframeContainer);
            }
        });

        // Inicjalizacja
        iframe.onload = () => {
            checkContentContainerStyle(iframe);
            setTimeout(() => startClickSequence(iframe), 800);
        };
    }

    function checkContentContainerStyle(iframe) {
        intervals.contentContainer = setInterval(() => {
            try {
                const iframeDocument = getIframeDocument(iframe);
                if (!iframeDocument) return;

                const contentContainer = iframeDocument.getElementById('contentContainer');
                if (contentContainer) {
                    contentContainer.style.cssText = 'margin: 20px; border: 0px; background: none;';
                    clearInterval(intervals.contentContainer);
                    intervals.contentContainer = null;
                }
            } catch (e) {
                log('Error accessing iframe content: ' + e, true);
                clearInterval(intervals.contentContainer);
                intervals.contentContainer = null;
            }
        }, CHECK_INTERVAL_MS);
    }

    function startClickSequence(iframe) {
        log("Rozpoczynam sekwencję kliknięć");

        intervals.buttonCheck = setInterval(() => {
            try {
                const iframeDocument = getIframeDocument(iframe);
                if (!iframeDocument) return;

                // Szukamy pierwszego przycisku
                const firstButton = findButtonInDocument(iframeDocument, "__button2");
                if (firstButton) {
                    log("Znaleziono przycisk Edytuj - ID: __button2");
                    clearInterval(intervals.buttonCheck);
                    intervals.buttonCheck = null;

                    // Klikamy w przycisk
                    clickButton(firstButton);

                    // Ustawiamy timeout na kliknięcie drugiego przycisku
                    setTimeout(() => {
                        log("Szukam drugiego przycisku...");
                        const secondInterval = setInterval(() => {
                            try {
                                const updatedDoc = getIframeDocument(iframe);
                                if (!updatedDoc) return;

                                const secondButton = findButtonInDocument(updatedDoc, "__button12");
                                if (secondButton) {
                                    log("Znaleziono przycisk Dodaj - ID: __button12");
                                    clearInterval(secondInterval);

                                    clickButton(secondButton);
                                    startDialogMonitoring(iframe);
                                }
                            } catch (e) {
                                log("Błąd podczas szukania drugiego przycisku: " + e, true);
                            }
                        }, CHECK_INTERVAL_MS);

                        // Czyszczenie interwału po czasie
                        setTimeout(() => {
                            clearInterval(secondInterval);
                        }, 10000);
                    }, 800);
                }
            } catch (e) {
                log("Błąd podczas sprawdzania przycisków: " + e, true);
            }
        }, CHECK_INTERVAL_MS);

        // Czyszczenie interwału po czasie
        setTimeout(() => {
            if (intervals.buttonCheck) {
                clearInterval(intervals.buttonCheck);
                intervals.buttonCheck = null;
            }
        }, 10000);
    }

    function startDialogMonitoring(iframe) {
        log(`Rozpoczynam monitorowanie dialogu: ${DIALOG_TITLE_TO_MONITOR}`);

        let dialogFound = false;
        let checkCount = 0;

        intervals.dialogVisibility = setInterval(() => {
            checkCount++;

            try {
                if (checkCount % 15 === 0) {
                    log(`Monitorowanie dialogu, próba #${checkCount}`);
                }

                // Sprawdzamy czy dialog jest obecny
                const isVisible = checkDocumentForDialog(iframe);

                // Dialog został znaleziony po raz pierwszy
                if (isVisible && !dialogFound) {
                    dialogFound = true;
                    log(`Dialog został znaleziony po raz pierwszy`);
                }

                // Dialog był widoczny ale zniknął - zamykamy iframe
                if (dialogFound && !isVisible) {
                    log(`Dialog zniknął - zamykam iframe`);
                    cleanupAndCloseModal();
                    return;
                }

                // Osiągnięto maksymalną liczbę sprawdzeń
                if (checkCount >= MAX_DIALOG_CHECKS) {
                    log("Osiągnięto maksymalną liczbę sprawdzeń dialogu");
                    cleanupIntervals();
                }
            } catch (e) {
                log("Błąd monitorowania dialogu: " + e, true);
                if (checkCount >= MAX_DIALOG_CHECKS) {
                    cleanupIntervals();
                }
            }
        }, DIALOG_CHECK_INTERVAL_MS);
    }

// Funkcja sprawdzająca dokument i jego zagnieżdżone iframe
    function checkDocumentForDialog(iframe, depth = 0) {
        if (depth > 2) return false; // Ograniczenie głębokości zagnieżdżenia

        try {
            const doc = getIframeDocument(iframe);
            if (!doc) return false;

            // Sprawdzamy dialog w głównym dokumencie
            const dialogElement = findDialogElement(doc);
            if (dialogElement) {
                // Dodajemy overlay jeśli znaleziono dialog
                addOverlayAroundDialog(doc, dialogElement);
                return true;
            }

            // Sprawdzamy wszystkie zagnieżdżone iframe
            const frames = doc.querySelectorAll('iframe');
            for (const frame of frames) {
                try {
                    if (checkDocumentForDialog(frame, depth + 1)) {
                        return true;
                    }
                } catch (e) {
                    // Ignorujemy błędy dostępu do iframe z innego źródła
                }
            }
        } catch (e) {
            log("Błąd podczas sprawdzania dokumentu: " + e, true);
        }

        return false;
    }

// Nowa funkcja do znajdowania elementu dialogu
    function findDialogElement(doc) {
        try {
            // Sprawdzamy dialogi po klasach SAP UI5
            const dialogSelectors = [
                '.sapMDialog.sapMDialogOpen',
                '.sapMPopup-CTX:not(.sapMDialogClosed)',
                '.sapMDialog',
                '.sapMPopup-CTX',
                '.sapMDialogOpen'
            ];

            // Łączymy selektory dla jednego zapytania
            const dialogElements = doc.querySelectorAll(dialogSelectors.join(', '));

            for (const dialog of dialogElements) {
                if (isElementVisible(dialog) &&
                    dialog.textContent &&
                    dialog.textContent.indexOf(DIALOG_TITLE_TO_MONITOR) !== -1) {
                    return dialog;
                }
            }

            // Sprawdzamy nagłówki dialogów
            const headerSelectors = [
                '.sapMDialogTitle',
                '.sapMIBar.sapMHeader-CTX',
                '.sapMBarMiddle'
            ];

            const headerElements = doc.querySelectorAll(headerSelectors.join(', '));

            for (const header of headerElements) {
                if (isElementVisible(header) &&
                    header.textContent &&
                    header.textContent.indexOf(DIALOG_TITLE_TO_MONITOR) !== -1) {

                    // Sprawdzamy, czy nagłówek jest częścią widocznego dialogu
                    let parent = header.parentElement;
                    while (parent) {
                        if (parent.classList &&
                            parent.classList.contains('sapMDialog') &&
                            isElementVisible(parent)) {
                            return parent;
                        }
                        parent = parent.parentElement;
                    }
                }
            }

            return null;
        } catch (e) {
            log("Błąd podczas szukania elementu dialogu: " + e, true);
            return null;
        }
    }

// Optymalizacja sprawdzania widoczności dialogu
    function isDialogVisible(doc) {
        return findDialogElement(doc) !== null;
    }

// Sprawdzenie czy element jest widoczny
    function isElementVisible(element) {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

// Zoptymalizowana funkcja do znajdowania przycisku w dokumencie
    function findButtonInDocument(doc, buttonId) {
        // Próbujemy znaleźć przycisk na różne sposoby
        let button = doc.getElementById(buttonId) ||
            doc.querySelector(`button[id="${buttonId}"]`) ||
            doc.querySelector(`button[data-sap-ui="${buttonId}"]`);

        if (button) return button;

        // Rekurencyjne przeszukiwanie iframe
        return findButtonInIframes(doc, buttonId);
    }

// Pomocnicza funkcja do znajdowania przycisku w iframe
    function findButtonInIframes(doc, buttonId) {
        const frames = doc.querySelectorAll('iframe');
        for (const frame of frames) {
            try {
                const frameDoc = getIframeDocument(frame);
                if (!frameDoc) continue;

                let button = frameDoc.getElementById(buttonId) ||
                    frameDoc.querySelector(`button[id="${buttonId}"]`) ||
                    frameDoc.querySelector(`button[data-sap-ui="${buttonId}"]`);

                if (button) return button;

                // Rekurencyjne sprawdzenie zagnieżdżonych iframe
                button = findButtonInIframes(frameDoc, buttonId);
                if (button) return button;
            } catch (e) {
                // Ignorujemy błędy dostępu do iframe z innego źródła
            }
        }
        return null;
    }

// Zoptymalizowana funkcja klikania przycisku
    function clickButton(button) {
        log("Klikam przycisk");

        try {
            // Standardowe kliknięcie
            button.click();

            // Event kliknięcia
            const mouseEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: button.ownerDocument.defaultView
            });
            button.dispatchEvent(mouseEvent);

            // Kliknięcie wewnętrznego elementu (typowe dla SAP UI5)
            const innerElement = button.querySelector('[id$="-inner"]');
            if (innerElement) {
                innerElement.click();
            }

            // Wykonanie skryptu w kontekście dokumentu
            executeClickScript(button);
        } catch (e) {
            log("Błąd podczas klikania przycisku: " + e, true);
        }
    }

// Pomocnicza funkcja do wykonania skryptu klikającego
    function executeClickScript(button) {
        try {
            const doc = button.ownerDocument;
            const buttonId = button.id;
            const script = doc.createElement('script');

            script.textContent = `
            (function() {
                try {
                    var btn = document.getElementById('${buttonId}');
                    if (btn) {
                        btn.click();
                        
                        if (window.sap && window.sap.ui) {
                            var control = sap.ui.getCore().byId('${buttonId}');
                            if (control && typeof control.firePress === 'function') {
                                control.firePress();
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
        } catch (e) {
            log("Błąd wykonywania skryptu: " + e, true);
        }
    }

// Bezpieczne pobieranie dokumentu z iframe
    function getIframeDocument(iframe) {
        try {
            return iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        } catch (e) {
            return null;
        }
    }

// Zamknięcie modalu i wyczyszczenie zasobów
    function closeModalAndCleanup(background, iframeContainer) {
        const iframe = document.getElementById('iframe');
        if (iframe) {
            cleanupOverlay(iframe);
        }

        background.style.display = 'none';
        iframeContainer.innerHTML = '';

        // Dodatkowo usuwamy element z DOM
        if (background.parentNode) {
            background.parentNode.removeChild(background);
        }

        cleanupIntervals();
        log("Modal został zamknięty i usunięty z DOM");
    }

// Znajdź i zamknij modal
    function cleanupAndCloseModal() {
        const background = document.getElementById('myModal');
        const iframeContainer = document.getElementById('iframeContainer');
        const iframe = document.getElementById('iframe');

        if (iframe) {
            cleanupOverlay(iframe);
        }

        if (background) {
            background.style.display = 'none';
            // Dodatkowo usuwamy element z DOM
            if (background.parentNode) {
                background.parentNode.removeChild(background);
            }
        }

        if (iframeContainer) {
            iframeContainer.innerHTML = '';
        }

        cleanupIntervals();
        log("Modal został zamknięty i usunięty z DOM");
    }

// Wyczyść wszystkie interwały
    function cleanupIntervals() {
        Object.keys(intervals).forEach(key => {
            if (intervals[key]) {
                clearInterval(intervals[key]);
                intervals[key] = null;
            }
        });
    }

// Inicjalizacja
    createModal();

// Zamknięcie IIFE
})();