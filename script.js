class TabTimer {
    constructor() {
        this.hours = 0;
        this.minutes = 0;
        this.seconds = 0;
        this.totalSeconds = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.intervalId = null;
        this.currentEditingGroup = null;
        this.tempInput = '';

        this.initializeElements();
        this.initializeTheme();
        this.bindEvents();
        this.updateDisplay();
    }

    initializeElements() {
        this.startPauseBtn = document.getElementById('start-pause-btn');
        this.hoursElement = document.querySelector('[data-group="hours"]');
        this.minutesElement = document.querySelector('[data-group="minutes"]');
        this.secondsElement = document.querySelector('[data-group="seconds"]');
        this.gongSound = document.getElementById('gong-sound');
        this.themeToggle = document.getElementById('theme-toggle');

        this.digitGroups = [this.hoursElement, this.minutesElement, this.secondsElement];
    }

    initializeTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

        this.themeToggle.checked = isDark;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    bindEvents() {
        this.startPauseBtn.addEventListener('click', () => this.toggleTimer());
        this.themeToggle.addEventListener('change', () => this.toggleTheme());

        this.digitGroups.forEach(group => {
            group.addEventListener('click', (e) => this.selectDigitGroup(e.target));
            group.addEventListener('focus', (e) => this.selectDigitGroup(e.target));
        });

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('click', (e) => this.handleDocumentClick(e));

        window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
            if (!localStorage.getItem('theme')) {
                this.themeToggle.checked = e.matches;
                document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        });
    }

    toggleTheme() {
        const isDark = this.themeToggle.checked;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    selectDigitGroup(element) {
        if (this.isRunning && !this.isPaused) return;

        this.clearSelection();
        this.currentEditingGroup = element;
        element.classList.add('selected');
        this.tempInput = '';
    }

    clearSelection() {
        this.digitGroups.forEach(group => group.classList.remove('selected'));
        this.currentEditingGroup = null;
        this.tempInput = '';
    }

    handleDocumentClick(e) {
        const isDigitGroup = e.target.classList.contains('digit-group');
        const isButton = e.target.id === 'start-pause-btn';
        const isToggle = e.target.closest('.theme-toggle');

        if (!isDigitGroup && !isButton && !isToggle && this.currentEditingGroup) {
            this.finalizeTempInput();
            this.clearSelection();
        }
    }

    handleKeyDown(e) {
        if (this.isRunning && !this.isPaused) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            this.handleTabNavigation(e.shiftKey);
            return;
        }

        if (e.key === 'Enter') {
            if (this.currentEditingGroup) {
                this.finalizeTempInput();
                this.clearSelection();
            }
            return;
        }

        if (this.currentEditingGroup && /^\d$/.test(e.key)) {
            e.preventDefault();
            this.handleDigitInput(e.key);
        }
    }

    handleTabNavigation(reverse = false) {
        if (!this.currentEditingGroup) {
            this.selectDigitGroup(this.digitGroups[0]);
            return;
        }

        this.finalizeTempInput();

        const currentIndex = this.digitGroups.indexOf(this.currentEditingGroup);
        let nextIndex;

        if (reverse) {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : this.digitGroups.length - 1;
        } else {
            nextIndex = currentIndex < this.digitGroups.length - 1 ? currentIndex + 1 : 0;
        }

        this.selectDigitGroup(this.digitGroups[nextIndex]);
    }

    handleDigitInput(digit) {
        this.tempInput += digit;

        if (this.tempInput.length >= 2) {
            this.finalizeTempInput();
        } else {
            this.updateTempDisplay();
        }
    }

    updateTempDisplay() {
        if (this.currentEditingGroup && this.tempInput) {
            const paddedInput = this.tempInput.padStart(2, '0');
            this.currentEditingGroup.textContent = paddedInput;
        }
    }

    finalizeTempInput() {
        if (!this.currentEditingGroup || !this.tempInput) return;

        const value = parseInt(this.tempInput);
        const groupType = this.currentEditingGroup.dataset.group;

        let finalValue;
        if (groupType === 'hours') {
            finalValue = Math.min(value, 99);
            this.hours = finalValue;
        } else {
            finalValue = Math.min(value, 59);
            if (groupType === 'minutes') {
                this.minutes = finalValue;
            } else {
                this.seconds = finalValue;
            }
        }

        this.tempInput = '';
        this.updateDisplay();
    }

    toggleTimer() {
        if (!this.isRunning) {
            this.startTimer();
        } else {
            this.pauseTimer();
        }
    }

    startTimer() {
        if (this.currentEditingGroup) {
            this.finalizeTempInput();
            this.clearSelection();
        }

        this.totalSeconds = this.hours * 3600 + this.minutes * 60 + this.seconds;

        if (this.totalSeconds === 0) return;

        this.isRunning = true;
        this.isPaused = false;
        this.startPauseBtn.textContent = 'Pause';

        this.intervalId = setInterval(() => {
            this.totalSeconds--;
            this.updateTimeFromTotal();
            this.updateDisplay();

            if (this.totalSeconds <= 0) {
                this.completeTimer();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isPaused = true;
        this.startPauseBtn.textContent = 'Start';
        clearInterval(this.intervalId);
    }

    completeTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.startPauseBtn.textContent = 'Start';
        clearInterval(this.intervalId);

        this.hours = 0;
        this.minutes = 0;
        this.seconds = 0;
        this.totalSeconds = 0;
        this.updateDisplay();

        this.playGong();
    }

    playGong() {
        try {
            if (this.gongSound.src) {
                this.gongSound.currentTime = 0;
                this.gongSound.play();
            } else {
                this.playsyntheticGong();
            }
        } catch (error) {
            this.playsyntheticGong();
        }
    }

    playsyntheticGong() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 2);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 2);
        } catch (error) {
            console.log('Could not play gong sound:', error);
        }
    }

    updateTimeFromTotal() {
        this.hours = Math.floor(this.totalSeconds / 3600);
        this.minutes = Math.floor((this.totalSeconds % 3600) / 60);
        this.seconds = this.totalSeconds % 60;
    }

    updateDisplay() {
        this.hoursElement.textContent = this.formatTwoDigits(this.hours);
        this.minutesElement.textContent = this.formatTwoDigits(this.minutes);
        this.secondsElement.textContent = this.formatTwoDigits(this.seconds);
    }

    formatTwoDigits(num) {
        return num.toString().padStart(2, '0');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TabTimer();
});