// Iqamah and Shalat Modal Logic
document.addEventListener('DOMContentLoaded', function() {
    const modalState = window.PublicDisplayModalState;
    if (!modalState) {
        console.error('Public display modal state helpers are not loaded.');
        return;
    }

    const {
        STORAGE_KEY,
        createIqamahState,
        createShalatState,
        createFridayState,
        formatCountdown,
        getRemainingMilliseconds,
        getRemainingSeconds,
        hasModalExpired,
        parseModalState,
    } = modalState;
    const shalatModal = document.getElementById('shalatModal');
    const iqamahIntervalModal = document.getElementById('iqamahIntervalModal');
    const fridayModal = document.getElementById('fridayModal');
    const iqamahIntervalCountdown = document.getElementById('iqamahIntervalCountdown');
    const shalatModalCountdown = document.getElementById('shalatModalCountdown');
    const timeRemainingElement = document.getElementById('timeRemaining');
    let endTimeout = null;
    let countdownInterval = null;
    let closeWatcherInterval = null;
    let shalatCountdownInterval = null;
    let activeModalType = null;

    function saveModalState(state) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function getModalState() {
        return parseModalState(sessionStorage.getItem(STORAGE_KEY));
    }

    function clearModalState() {
        sessionStorage.removeItem(STORAGE_KEY);
    }

    function clearActiveTimers() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (closeWatcherInterval) {
            clearInterval(closeWatcherInterval);
            closeWatcherInterval = null;
        }
        if (shalatCountdownInterval) {
            clearInterval(shalatCountdownInterval);
            shalatCountdownInterval = null;
        }
        if (endTimeout) {
            clearTimeout(endTimeout);
            endTimeout = null;
        }
    }

    function hideAllModals() {
        [iqamahIntervalModal, shalatModal, fridayModal].forEach((modal) => {
            if (modal) {
                modal.classList.remove('show');
            }
        });
    }

    function resetActiveModal() {
        activeModalType = null;
        if (shalatModalCountdown) {
            shalatModalCountdown.textContent = '00:00';
        }
    }

    function renderShalatCountdown(endsAt) {
        if (!shalatModalCountdown) {
            return;
        }

        shalatModalCountdown.textContent = formatCountdown(getRemainingMilliseconds(endsAt, Date.now()));
    }

    function startModalCloseWatcher(modalElement, endsAt) {
        function closeModal() {
            modalElement.classList.remove('show');
            clearModalState();
            clearActiveTimers();
            resetActiveModal();
        }

        const remainingMs = getRemainingMilliseconds(endsAt, Date.now());
        endTimeout = setTimeout(closeModal, remainingMs);
        closeWatcherInterval = setInterval(() => {
            if (hasModalExpired(endsAt, Date.now())) {
                closeModal();
            }
        }, 1000);
    }

    function ensureNextShalatTime() {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (let prop in shalatTimeData.schedules) {
            const value = shalatTimeData.schedules[prop];
            if (value.match(/^\d{2,}:\d{2}$/)) {
                const [hour, minute] = value.split(':').map(Number);
                if (hour * 60 + minute > currentMinutes) {
                    nextShalatTime = prop;
                    break;
                }
            }
        }
    }

    function showShalatModal(shalatKey, endsAt) {
        if (!shalatModal) {
            clearModalState();
            resetActiveModal();
            return;
        }

        clearActiveTimers();
        hideAllModals();
        activeModalType = 'shalat';
        saveModalState(createShalatState(shalatKey, endsAt, Date.now()));
        shalatModal.classList.add('show');
        renderShalatCountdown(endsAt);
        shalatCountdownInterval = setInterval(() => {
            renderShalatCountdown(endsAt);
        }, 1000);
        startModalCloseWatcher(shalatModal, endsAt);
    }

    function showFridayModal(endsAt) {
        if (!fridayModal) {
            clearModalState();
            resetActiveModal();
            return;
        }

        clearActiveTimers();
        hideAllModals();
        activeModalType = 'friday';
        saveModalState(createFridayState(endsAt, Date.now()));
        fridayModal.classList.add('show');
        startModalCloseWatcher(fridayModal, endsAt);
    }

    function showIqamahModal(shalatKey, countdownEndsAt) {
        if (!iqamahIntervalModal || !iqamahIntervalCountdown) {
            clearModalState();
            resetActiveModal();
            return;
        }

        clearActiveTimers();
        hideAllModals();
        activeModalType = 'iqamah';
        saveModalState(createIqamahState(shalatKey, countdownEndsAt, Date.now()));
        iqamahIntervalModal.classList.add('show');

        function renderCountdown() {
            const remainingSeconds = getRemainingSeconds(countdownEndsAt, Date.now());
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            iqamahIntervalCountdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (remainingSeconds === 3) {
                audio.play().catch(() => {
                    console.log('Agar beep bunyi ==> permission browser : sound harus enable');
                });
            }

            if (remainingSeconds <= 0) {
                clearActiveTimers();
                clearModalState();
                iqamahIntervalModal.classList.remove('show');
                const shalatEndsAt = Date.now() + (window.shalatIntervalInMinutes[shalatKey] || 0) * 60 * 1000;
                setTimeout(() => {
                    showShalatModal(shalatKey, shalatEndsAt);
                }, 500);
            }
        }

        renderCountdown();
        countdownInterval = setInterval(renderCountdown, 1000);
    }

    function restoreModalState() {
        const savedState = getModalState();
        if (!savedState) {
            clearModalState();
            return false;
        }

        if (hasModalExpired(savedState.endsAt, Date.now())) {
            clearModalState();
            resetActiveModal();
            return false;
        }

        if (savedState.type === 'iqamah') {
            showIqamahModal(savedState.shalatKey, savedState.countdownEndsAt);
            return true;
        }
        if (savedState.type === 'shalat') {
            showShalatModal(savedState.shalatKey, savedState.endsAt);
            return true;
        }
        if (savedState.type === 'friday') {
            showFridayModal(savedState.endsAt);
            return true;
        }

        clearModalState();
        resetActiveModal();
        return false;
    }

    function checkCountdown() {
        if (!timeRemainingElement || activeModalType) {
            return;
        }

        const timeText = timeRemainingElement.textContent.replace(/\s+/g, '');
        if (timeText === '00:00:03' || timeText === '00:03') {
            audio.play().catch(() => {
                console.log('Agar beep bunyi ==> permission browser : sound harus enable');
            });
        }

        if (timeText !== '00:00:00' && timeText !== '00:00') {
            return;
        }

        clearActiveTimers();
        ensureNextShalatTime();
        const today = new Date();
        const isFriday = today.getDay() === 5;

        if (isFriday && nextShalatTime === 'dzuhr') {
            const fridayEndsAt = Date.now() + (window.shalatIntervalInMinutes.friday || 10) * 60 * 1000;
            showFridayModal(fridayEndsAt);
            return;
        }

        const iqamahMinutes = window.iqamahIntervalInMinutes[nextShalatTime];
        if (!iqamahMinutes) {
            return;
        }

        const iqamahEndsAt = Date.now() + iqamahMinutes * 60 * 1000;
        showIqamahModal(nextShalatTime, iqamahEndsAt);
    }

    ensureNextShalatTime();
    clearActiveTimers();

    if (restoreModalState()) {
        return;
    }

    setInterval(checkCountdown, 1000);
});
