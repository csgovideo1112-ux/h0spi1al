document.addEventListener('DOMContentLoaded', () => {
    
    // ==== TELEGRAM WEB APP INIT ====
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
        tg.expand();
        
        if (tg.requestFullscreen) {
            try { tg.requestFullscreen(); } catch (e) { console.log('Fullscreen error:', e); }
        }
        
        if (tg.disableVerticalSwipes) {
            tg.disableVerticalSwipes();
        }
        
        if (tg.setHeaderColor) {
            tg.setHeaderColor('#1a1a1a');
        }
        
        if (tg.setBackgroundColor) {
            tg.setBackgroundColor('#1a1a1a');
        }
        
        tg.ready();
        
        console.log('Telegram WebApp активен. User:', tg.initDataUnsafe?.user);
    } else {
        console.log('Запущено вне Telegram (браузер)');
    }
    // ==== /TELEGRAM WEB APP INIT ====
    
    
    const gameContainer = document.getElementById('game-container');
    
    // --- 1. СИСТЕМА МАСШТАБИРОВАНИЯ ---
    const BASE_WIDTH = 1920;
    const BASE_HEIGHT = 1080;

    function resizeGame() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Считаем масштаб по обеим осям, берём минимальный
        const scaleX = windowWidth / BASE_WIDTH;
        const scaleY = windowHeight / BASE_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        // Фиксируем размеры контейнера
        gameContainer.style.width = BASE_WIDTH + 'px';
        gameContainer.style.height = BASE_HEIGHT + 'px';
        gameContainer.style.transformOrigin = 'top left';

        // Центрируем контейнер в окне
        const offsetX = (windowWidth - BASE_WIDTH * scale) / 2;
        const offsetY = (windowHeight - BASE_HEIGHT * scale) / 2;

        gameContainer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    window.addEventListener('resize', resizeGame);
    resizeGame();
    
    // Пересчёт после разворачивания окна (Telegram / fullscreen)
    setTimeout(resizeGame, 100);
    setTimeout(resizeGame, 500);
    
    // Слушаем события Telegram
    if (tg) {
        if (tg.onEvent) {
            tg.onEvent('viewportChanged', resizeGame);
            tg.onEvent('fullscreenChanged', resizeGame);
        }
    }


    // --- 2. ЛОГИКА КНОПОК МЕНЮ ---
    const buttons = document.querySelectorAll('.menu-text');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id === 'btn-map') {
                startBossFight();
            } else {
                console.log(`Кнопка ${btn.id} пока не реализована.`);
            }
        });
    });


    // --- 3. ПЕРЕХОД В БОЙ + ТАЙМЕР ---
    const lobbyScreen = document.getElementById('lobby-screen');
    const bossScreen = document.getElementById('boss-screen');
    const timerElement = document.getElementById('battle-timer');
    const bossSprite = document.getElementById('boss-sprite');
    const handSprite = document.getElementById('hand-sprite');

    let battleTimeLeft = 15 * 60;
    let timerInterval = null;
    let turnLocked = false;
    let battleEnded = false;

    function startBossFight() {
        battleEnded = false;
        turnLocked = false;
        
        lobbyScreen.classList.add('hidden');
        bossScreen.classList.remove('hidden');

        bossScreen.classList.remove('zoomed', 'shaking');
        bossSprite.classList.remove('attacking-left', 'attacking-right', 'attacking-center', 'returning');
        handSprite.classList.remove('punching');
        
        const damageLayer = document.getElementById('damage-layer');
        if (damageLayer) damageLayer.innerHTML = '';
        
        bossSprite.style.backgroundImage = '';
        bossSprite.style.transform = '';
        bossSprite.style.animation = '';

        battleTimeLeft = 15 * 60;
        updateTimerDisplay();
        
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            battleTimeLeft--;
            updateTimerDisplay();

            if (battleTimeLeft <= 0) {
                clearInterval(timerInterval);
                endBossFight('timeout');
            }
        }, 1000);

        setTimeout(() => {
            bossHpPercent = 100;
            playerHpPercent = 100;
            setPlayerHP(100);
            setBossHP(100);
        }, 50);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(battleTimeLeft / 60);
        const seconds = battleTimeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function endBossFight(reason) {
        if (battleEnded) return;
        battleEnded = true;
        
        console.log('Бой закончен. Причина:', reason);
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        setTimeout(() => {
            bossScreen.classList.add('hidden');
            lobbyScreen.classList.remove('hidden');
            
            bossScreen.classList.remove('zoomed', 'shaking');
            bossSprite.classList.remove('attacking-left', 'attacking-right', 'attacking-center', 'returning');
            handSprite.classList.remove('punching');
        }, 1500);
    }


    // --- 4. УПРАВЛЕНИЕ HP ---
    const MAX_PLAYER_HP = 500;
    const MAX_BOSS_HP = 1000;
    
    let bossHpPercent = 100;
    let playerHpPercent = 100;
    
    function applyMask(element, percent) {
        if (!element) return;
        const clampedPercent = Math.max(0, Math.min(100, percent));
        const hideFrom = 100 - clampedPercent;
        
        element.style.webkitMaskImage = `linear-gradient(to bottom, transparent ${hideFrom}%, black ${hideFrom}%)`;
        element.style.maskImage = `linear-gradient(to bottom, transparent ${hideFrom}%, black ${hideFrom}%)`;
        element.style.webkitMaskSize = '100% 100%';
        element.style.maskSize = '100% 100%';
    }
    
    function setPlayerHP(percent) {
        const fill = document.getElementById('player-hp-fill');
        const aliveIcon = document.getElementById('player-hud-icon');
        const text = document.getElementById('player-hp-text');
        
        const clampedPercent = Math.max(0, Math.min(100, percent));
        
        if (fill) fill.style.width = clampedPercent + '%';
        applyMask(aliveIcon, clampedPercent);
        
        if (text) {
            const currentHP = Math.round(MAX_PLAYER_HP * (clampedPercent / 100));
            text.textContent = currentHP;
        }
    }
    
    function setBossHP(percent) {
        const fill = document.getElementById('boss-hp-fill');
        const aliveIcon = document.getElementById('boss-hud-icon');
        const text = document.getElementById('boss-hp-text');
        
        const clampedPercent = Math.max(0, Math.min(100, percent));
        
        if (fill) fill.style.width = clampedPercent + '%';
        applyMask(aliveIcon, clampedPercent);
        
        if (text) {
            const currentHP = Math.round(MAX_BOSS_HP * (clampedPercent / 100));
            text.textContent = currentHP;
        }
    }


    // --- 5. МЕХАНИКА УДАРА ---
    const damageLayer = document.getElementById('damage-layer');
    
    const PLAYER_DAMAGE = 30;
    const BOSS_DAMAGE = 50;
    
    bossScreen.addEventListener('click', () => {
        if (turnLocked) return;
        if (battleEnded) return;
        if (bossHpPercent <= 0 || playerHpPercent <= 0) return;
        
        turnLocked = true;
        
        bossScreen.classList.add('zoomed');
        
        handSprite.classList.remove('punching');
        void handSprite.offsetWidth;
        handSprite.classList.add('punching');
        
        setTimeout(() => {
            dealDamageToBoss(PLAYER_DAMAGE);
        }, 150);
        
        setTimeout(() => {
            bossScreen.classList.remove('zoomed');
            handSprite.classList.remove('punching');
        }, 400);
        
        setTimeout(() => {
            if (battleEnded || bossHpPercent <= 0 || playerHpPercent <= 0) {
                turnLocked = false;
                return;
            }
            
            bossCounterAttack(() => {
                turnLocked = false;
            });
        }, 700);
    });
    
    
    function bossCounterAttack(onComplete) {
        if (battleEnded || playerHpPercent <= 0) {
            if (onComplete) onComplete();
            return;
        }
        
        bossSprite.classList.add('attacking-left');
        
        setTimeout(() => {
            if (battleEnded) return;
            bossSprite.classList.remove('attacking-left');
            bossSprite.classList.add('attacking-right');
        }, 250);
        
        setTimeout(() => {
            if (battleEnded) return;
            bossSprite.classList.remove('attacking-right');
            bossSprite.classList.add('attacking-center');
        }, 500);
        
        setTimeout(() => {
            if (battleEnded) return;
            
            bossScreen.classList.add('zoomed');
            bossScreen.classList.add('shaking');
            
            dealDamageToPlayer(BOSS_DAMAGE);
            
            setTimeout(() => {
                bossScreen.classList.remove('shaking');
            }, 500);
        }, 750);
        
        setTimeout(() => {
            if (battleEnded) return;
            bossSprite.classList.remove('attacking-center');
            bossSprite.classList.add('returning');
        }, 1100);
        
        setTimeout(() => {
            bossSprite.classList.remove('returning');
            bossScreen.classList.remove('zoomed');
            
            if (!battleEnded && onComplete) onComplete();
        }, 1500);
    }
    
    
    function dealDamageToBoss(damage) {
        if (battleEnded) return;
        
        const damagePercent = (damage / MAX_BOSS_HP) * 100;
        bossHpPercent = Math.max(0, bossHpPercent - damagePercent);
        
        setBossHP(bossHpPercent);
        spawnDamageNumber(damage, 'boss');
        
        if (bossHpPercent <= 0) {
            console.log('Босс повержен!');
            endBossFight('boss-dead');
        }
    }
    
    
    function dealDamageToPlayer(damage) {
        if (battleEnded) return;
        
        const damagePercent = (damage / MAX_PLAYER_HP) * 100;
        playerHpPercent = Math.max(0, playerHpPercent - damagePercent);
        
        setPlayerHP(playerHpPercent);
        spawnDamageNumber(damage, 'player');
        
        if (playerHpPercent <= 0) {
            console.log('Игрок погиб!');
            endBossFight('player-dead');
        }
    }
    
    
    function spawnDamageNumber(damage, target) {
        const el = document.createElement('div');
        el.className = 'damage-number';
        el.textContent = '-' + damage;
        
        if (target === 'boss') {
            const randomOffset = (Math.random() - 0.5) * 200;
            el.style.left = `calc(50% + ${randomOffset}px)`;
            el.style.top = `40%`;
        } else {
            const randomOffset = (Math.random() - 0.5) * 100;
            el.style.left = `calc(20% + ${randomOffset}px)`;
            el.style.top = `25%`;
        }
        
        damageLayer.appendChild(el);
        
        setTimeout(() => {
            el.remove();
        }, 600);
    }
});
