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

    iframe.onload = () => {
        adjustIframeSize(iframe);
        console.log("Iframe załadowany, rozpoczynam sekwencję kliknięć");
        // Skrócony czas oczekiwania na załadowanie strony
        setTimeout(() => startClickSequence(iframe), 800);
    };

    handleContentContainerStyle(iframe, background, iframeContainer);
    checkAndHideIframeElements(iframe, background, iframeContainer);
    closeModal.addEventListener('click', () => handleCloseModalClick(background, iframeContainer));
    window.addEventListener('click', (event) => handleWindowClick(event, background, iframeContainer));
    setupAcceptButtonListener(iframe, background, iframeContainer);
}

// Główna funkcja sterująca sekwencją kliknięć
function startClickSequence(iframe) {
    console.log("Rozpoczynam sekwencję kliknięć");

    // Funkcja sprawdzająca dostępność elementów w regularnych odstępach czasu
    const checkInterval = setInterval(() => {
        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDocument) {
                console.log("Dokument iframe niedostępny, próbuję ponownie...");
                return;
            }

            // Szukamy pierwszego przycisku
            const firstButton = findSAPButton(iframeDocument, "__button2");
            if (firstButton) {
                console.log("Znaleziono przycisk Edytuj - ID: __button2");

                // Zatrzymujemy interwał po znalezieniu przycisku
                clearInterval(checkInterval);

                // Klikamy w przycisk na różne sposoby
                triggerSAPButtonClick(firstButton);

                // Po kliknięciu pierwszego przycisku, ustawiamy timeout na kliknięcie drugiego
                setTimeout(() => {
                    console.log("Szukam drugiego przycisku...");
                    const secondCheckInterval = setInterval(() => {
                        try {
                            const updatedDoc = iframe.contentDocument || iframe.contentWindow.document;
                            if (!updatedDoc) return;

                            const secondButton = findSAPButton(updatedDoc, "__button12");
                            if (secondButton) {
                                console.log("Znaleziono przycisk Dodaj - ID: __button12");

                                clearInterval(secondCheckInterval);
                                triggerSAPButtonClick(secondButton);

                                // WAŻNE: Monitoruj zmiany DOM po kliknięciu drugiego przycisku
                                // aby wykryć moment pojawienia się przycisków Anuluj/Zapisz
                                monitorDialogAppearance(iframe);
                            }
                        } catch (e) {
                            console.error("Błąd podczas szukania drugiego przycisku:", e);
                        }
                    }, 300);

                    setTimeout(() => clearInterval(secondCheckInterval), 10000);
                }, 800);
            }
        } catch (e) {
            console.error("Błąd podczas sprawdzania przycisków:", e);
        }
    }, 300);

    setTimeout(() => clearInterval(checkInterval), 10000);
}

// Nowa funkcja do ciągłego monitorowania zmian DOM w poszukiwaniu przycisków dialogu
function monitorDialogAppearance(iframe) {
    console.log("Rozpoczynam monitorowanie pojawienia się przycisków Anuluj/Zapisz - nowa metoda");

    let buttonCheckCount = 0;
    const maxChecks = 300; // Zwiększona liczba prób

    // Sprawdzaj regularnie czy przyciski się pojawiły
    const dialogCheckInterval = setInterval(() => {
        buttonCheckCount++;

        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDocument) return;

            if (buttonCheckCount % 10 === 0) {
                console.log(`Próba #${buttonCheckCount} wyszukania przycisków Anuluj/Zapisz`);
            }

            // Szukaj przycisków po różnych atrybutach, które mogą być bardziej stabilne

            // 1. Szukaj po atrybutach data-help-id
            const cancelByHelpId = iframeDocument.querySelector('button[data-help-id="editPageCancelAddButton"]');
            const saveByHelpId = iframeDocument.querySelector('button[data-help-id="editPageSaveButton"]');

            // 2. Szukaj po title
            const cancelByTitle = iframeDocument.querySelector('button[title="Anuluj"]');
            const saveByTitle = iframeDocument.querySelector('button[title="Zapisz"]');

            // 3. Szukaj po tekście przycisku (najbardziej niezawodna metoda)
            let cancelByText = null;
            let saveByText = null;

            const buttons = iframeDocument.querySelectorAll('button');
            for (const button of buttons) {
                const buttonText = button.textContent?.trim();
                if (buttonText === 'Anuluj') {
                    cancelByText = button;
                } else if (buttonText === 'Zapisz') {
                    saveByText = button;
                }
            }

            // Wybierz znalezione przyciski (w kolejności preferencji)
            const cancelButton = cancelByHelpId || cancelByTitle || cancelByText;
            const saveButton = saveByHelpId || saveByTitle || saveByText;

            // Dodaj bardziej szczegółowe debugowanie
            if (cancelButton || saveButton) {
                if (cancelButton) {
                    const cancelAttrs = {
                        id: cancelButton.id,
                        helpId: cancelButton.getAttribute('data-help-id'),
                        title: cancelButton.getAttribute('title'),
                        text: cancelButton.textContent?.trim(),
                        className: cancelButton.className
                    };
                    console.log("Znaleziono przycisk Anuluj:", cancelAttrs);
                }

                if (saveButton) {
                    const saveAttrs = {
                        id: saveButton.id,
                        helpId: saveButton.getAttribute('data-help-id'),
                        title: saveButton.getAttribute('title'),
                        text: saveButton.textContent?.trim(),
                        className: saveButton.className
                    };
                    console.log("Znaleziono przycisk Zapisz:", saveAttrs);
                }

                // Dodaj nasłuchiwanie tylko, jeśli jeszcze nie dodano (sprawdź przez atrybut data-listener)
                if (cancelButton && !cancelButton.hasAttribute('data-listener')) {
                    console.log("Dodaję nasłuchiwanie na przycisk Anuluj");
                    cancelButton.setAttribute('data-listener', 'true');
                    cancelButton.addEventListener('click', () => {
                        console.log("Kliknięto Anuluj - zamykam modal");
                        closeModalAndCleanup(iframe);
                    });
                }

                if (saveButton && !saveButton.hasAttribute('data-listener')) {
                    console.log("Dodaję nasłuchiwanie na przycisk Zapisz");
                    saveButton.setAttribute('data-listener', 'true');
                    saveButton.addEventListener('click', () => {
                        console.log("Kliknięto Zapisz - zamykam modal");
                        closeModalAndCleanup(iframe);
                    });
                }

                // Sprawdź, czy wszystkie przyciski są już obserwowane
                if ((cancelButton && cancelButton.hasAttribute('data-listener')) &&
                    (saveButton && saveButton.hasAttribute('data-listener'))) {
                    console.log("Znaleziono i dodano nasłuchiwanie na wszystkie przyciski. Zmniejszam częstotliwość sprawdzania.");
                    clearInterval(dialogCheckInterval);

                    // Ustaw rzadsze sprawdzanie na potrzeby późniejszych dialogów
                    setTimeout(() => {
                        monitorDialogAppearance(iframe);
                    }, 2000);
                }
            } else if (buttonCheckCount >= maxChecks) {
                console.log("Osiągnięto maksymalną liczbę prób. Zatrzymuję sprawdzanie.");
                clearInterval(dialogCheckInterval);
            }

            // Szukaj również przycisków w zagnieżdżonych iframe
            const nestedIframes = iframeDocument.querySelectorAll('iframe');
            for (const nestedIframe of nestedIframes) {
                try {
                    const nestedDoc = nestedIframe.contentDocument || nestedIframe.contentWindow.document;
                    if (nestedDoc) {
                        // Rekurencyjne sprawdzenie zagnieżdżonych iframe
                        const nestedButtons = nestedDoc.querySelectorAll('button');
                        for (const button of nestedButtons) {
                            const buttonText = button.textContent?.trim();
                            if (buttonText === 'Anuluj' && !button.hasAttribute('data-listener')) {
                                button.setAttribute('data-listener', 'true');
                                button.addEventListener('click', () => closeModalAndCleanup(iframe));
                                console.log("Znaleziono przycisk Anuluj w zagnieżdżonym iframe");
                            } else if (buttonText === 'Zapisz' && !button.hasAttribute('data-listener')) {
                                button.setAttribute('data-listener', 'true');
                                button.addEventListener('click', () => closeModalAndCleanup(iframe));
                                console.log("Znaleziono przycisk Zapisz w zagnieżdżonym iframe");
                            }
                        }
                    }
                } catch (e) {
                    // Ignoruj błędy dostępu do iframe z innego źródła
                }
            }
        } catch (e) {
            console.error("Błąd podczas monitorowania dialogu:", e);
            if (buttonCheckCount >= maxChecks) {
                clearInterval(dialogCheckInterval);
            }
        }
    }, 100); // Częstsze sprawdzanie

    // Zatrzymaj sprawdzanie po dłuższym czasie
    setTimeout(() => {
        clearInterval(dialogCheckInterval);
        console.log("Zakończono monitorowanie przycisków po upływie maksymalnego czasu");
    }, 300000); // 5 minut
}

// Funkcja sprawdzająca, czy przycisk Zapisz stał się aktywny
function checkSaveButtonActivation(saveButton, iframe) {
    if (!saveButton) return;

    console.log("Monitoruję aktywację przycisku Zapisz");

    // Sprawdzaj regularnie czy przycisk stał się aktywny
    const activationCheckInterval = setInterval(() => {
        try {
            // Jeśli przycisk nie jest już nieaktywny (disabled)
            if (!saveButton.disabled) {
                console.log("Przycisk Zapisz jest teraz aktywny!");
                clearInterval(activationCheckInterval);
            }
        } catch (e) {
            console.error("Błąd podczas sprawdzania aktywacji przycisku Zapisz:", e);
            clearInterval(activationCheckInterval);
        }
    }, 500);

    // Zatrzymaj sprawdzanie po 30 sekundach
    setTimeout(() => clearInterval(activationCheckInterval), 30000);
}

// Funkcja zamykająca modal i czyszcząca zasoby
function closeModalAndCleanup(iframe) {
    try {
        const background = document.getElementById('myModal');
        const iframeContainer = document.getElementById('iframeContainer');

        console.log("Zamykam modal - closeModalAndCleanup wywołane");

        if (background) {
            background.style.display = 'none';
        }

        if (iframeContainer) {
            iframeContainer.innerHTML = '';
        }

        // Dodatkowe czyszczenie na poziomie globalnym
        const clearTimeouts = () => {
            // Czyścimy wszystkie timeouty i interwały
            const highestTimeoutId = setTimeout(() => {}, 0);
            for (let i = 0; i < highestTimeoutId; i++) {
                clearTimeout(i);
            }

            // Czyścimy wszystkie interwały do pewnego limitu
            const highestIntervalId = setInterval(() => {}, 100000);
            for (let i = 0; i < highestIntervalId; i++) {
                clearInterval(i);
            }
        };

        // Wywołaj czyszczenie z opóźnieniem, aby inne handlery miały szansę się wykonać
        setTimeout(clearTimeouts, 500);

        console.log("Modal został zamknięty");
    } catch (e) {
        console.error("Błąd podczas zamykania modalu:", e);
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
    console.log("Modal został zamknięty przez przycisk X");
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