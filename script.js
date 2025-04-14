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
        // Dodane: automatyczne kliknięcie w pierwszy przycisk po załadowaniu iframe
        setTimeout(() => clickFirstButton(iframe), 1000);
    };

    handleContentContainerStyle(iframe, background, iframeContainer);
    checkAndHideIframeElements(iframe, background, iframeContainer);
    closeModal.addEventListener('click', () => handleCloseModalClick(background, iframeContainer));
    window.addEventListener('click', (event) => handleWindowClick(event, background, iframeContainer));
    setupAcceptButtonListener(iframe, background, iframeContainer);
}

// Dodana funkcja do kliknięcia pierwszego przycisku
function clickFirstButton(iframe) {
    try {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDocument) {
            const firstButton = iframeDocument.querySelector('span[id="__button2-img"]');
            if (firstButton) {
                console.log("Kliknięcie w pierwszy przycisk");
                // Znajdujemy rodzica (przycisk), który można kliknąć
                const parentButton = findClickableParent(firstButton);
                if (parentButton) {
                    parentButton.click();
                    // Po kliknięciu pierwszego przycisku, czekamy na załadowanie i klikamy drugi
                    setTimeout(() => clickSecondButton(iframe), 2000);
                } else {
                    console.error("Nie można znaleźć klikalnego rodzica dla pierwszego przycisku");
                }
            } else {
                console.error("Nie znaleziono pierwszego przycisku");
                // Jeśli nie znaleziono, próbujemy ponownie za chwilę
                setTimeout(() => clickFirstButton(iframe), 1000);
            }
        }
    } catch (e) {
        console.error('Błąd podczas klikania pierwszego przycisku:', e);
    }
}

// Dodana funkcja do kliknięcia drugiego przycisku
function clickSecondButton(iframe) {
    try {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDocument) {
            const secondButton = iframeDocument.querySelector('span[id="__button12-img"]');
            if (secondButton) {
                console.log("Kliknięcie w drugi przycisk");
                // Znajdujemy rodzica (przycisk), który można kliknąć
                const parentButton = findClickableParent(secondButton);
                if (parentButton) {
                    parentButton.click();
                } else {
                    console.error("Nie można znaleźć klikalnego rodzica dla drugiego przycisku");
                }
            } else {
                console.error("Nie znaleziono drugiego przycisku");
                // Jeśli nie znaleziono, próbujemy ponownie za chwilę
                setTimeout(() => clickSecondButton(iframe), 1000);
            }
        }
    } catch (e) {
        console.error('Błąd podczas klikania drugiego przycisku:', e);
    }
}

// Funkcja pomocnicza do znalezienia klikalnego rodzica elementu
function findClickableParent(element) {
    let current = element;
    while (current) {
        // Sprawdzamy, czy element jest przyciskiem lub ma rolę przycisku
        if (current.tagName === 'BUTTON' ||
            current.getAttribute('role') === 'button' ||
            current.classList.contains('sapMBtn')) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
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