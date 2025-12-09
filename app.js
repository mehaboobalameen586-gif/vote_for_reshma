// EVM Logic & View Controller
const EVM = (() => {
  // Config
  const CONFIG = {
    vvpatHoldTime: 7000, // 7 Seconds visible
    beepFreq: 3000,      // High pitched beep
    beepDur: 2000        // Long beep
  };

  // State
  let tally = JSON.parse(localStorage.getItem('evm_tally') || '{}');
  const candidates = [
    { id: 1, name: 'Candidate One', symbol: 'assets/logos/candidate-1.png' },
    { id: 2, name: 'Candidate Two', symbol: 'assets/logos/candidate-2.png' },
    { id: 3, name: 'രേഷ്‌മ വളരോത്ത്', symbol: 'assets/logos/candidate-3.png', isSpecial: true },
    { id: 4, name: 'Candidate Four', symbol: 'assets/logos/candidate-4.png' },
    { id: 5, name: 'Candidate Five', symbol: 'assets/logos/candidate-5.png' },
    { id: 6, name: 'Candidate Six', symbol: 'assets/logos/candidate-6.png' },
    { id: 7, name: 'Candidate Seven', symbol: 'assets/logos/candidate-7.png' },
    { id: 8, name: 'Candidate Eight', symbol: 'assets/logos/candidate-8.png' }
  ];

  // DOM Elements
  const views = {
    ballot: document.getElementById('ballot-view'),
    vvpat: document.getElementById('vvpat-view'),
    tally: document.getElementById('tally-view')
  };

  const els = {
    candidateList: document.getElementById('candidateList'),
    paperTrack: document.getElementById('paperTrack'),
    statusLed: document.getElementById('statusLed'),
    vvpatLed: document.getElementById('vvpatLed'),
    tallyList: document.getElementById('tallyList'),
    nextVoteBtn: document.getElementById('nextVoteBtn'),
    clearBtn: document.getElementById('clearBtn')
  };

  // Init
  function init() {
    renderBallot();
    renderTally();
    setupListeners();
    registerSW();
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(() => console.log('SW Registered'))
        .catch(err => console.error('SW Fail', err));
    }
  }

  // View Switcher
  function showView(viewName) {
    Object.values(views).forEach(v => {
      v.classList.remove('active');
      v.classList.add('hidden');
    });
    views[viewName].classList.remove('hidden');
    void views[viewName].offsetWidth; // force reflow
    views[viewName].classList.add('active');
  }

  // Render Methods
  function renderBallot() {
    els.candidateList.innerHTML = '';
    
    // Reset Ready Light to Green
    if(els.statusLed) {
        els.statusLed.classList.remove('on'); // Remove Red/Busy
        els.statusLed.classList.add('ready'); // Set Green/Ready
    }
    
    // Unlock interface
    const allBtns = document.querySelectorAll('.blue-btn');
    allBtns.forEach(b => b.disabled = false);

    candidates.forEach((c, idx) => {
      const row = document.createElement('div');
      row.className = 'candidate-row';
      row.innerHTML = `
        <div class="serial-no">${c.id}</div>
        <div class="candidate-info">
            <span class="c-name">${c.name}</span>
            <img src="${c.symbol}" class="c-symbol" onerror="this.style.display='none'">
        </div>
        <div class="led-col">
            <div class="cand-led" id="led-${c.id}"></div>
        </div>
        <div class="btn-col">
            <button class="blue-btn" data-id="${c.id}"></button>
        </div>
      `;
      els.candidateList.appendChild(row);
    });
  }

  function renderTally() {
    els.tallyList.innerHTML = '';
    let total = 0;
    candidates.forEach(c => {
      const count = tally[c.id] || 0;
      total += count;
      const li = document.createElement('li');
      li.innerHTML = `<span>${c.name}</span> <strong>${count}</strong>`;
      els.tallyList.appendChild(li);
    });
    const totalLi = document.createElement('li');
    totalLi.style.fontWeight = 'bold';
    totalLi.style.background = '#eee';
    totalLi.innerHTML = `<span>TOTAL VOTES</span> <span>${total}</span>`;
    els.tallyList.appendChild(totalLi);
  }

  // Actions
  function setupListeners() {
    els.candidateList.addEventListener('click', e => {
      if (e.target.classList.contains('blue-btn')) {
        const cid = parseInt(e.target.dataset.id);
        castVote(cid);
      }
    });

    els.nextVoteBtn.addEventListener('click', () => {
      renderBallot(); // Re-render to reset lights and buttons
      showView('ballot');
    });

    els.clearBtn.addEventListener('click', () => {
      if (confirm('SECRET ACTION: Clear all votes?')) {
        tally = {};
        localStorage.setItem('evm_tally', '{}');
        renderTally();
      }
    });
  }

  function castVote(cid) {
    // 1. Lock Interface
    const allBtns = document.querySelectorAll('.blue-btn');
    allBtns.forEach(b => b.disabled = true);

    // 2. Light RED LED on Ballot Unit (and turn OFF Ready Green)
    const led = document.getElementById(`led-${cid}`);
    const globalLed = document.getElementById('statusLed');
    if (led) led.classList.add('on');
    if (globalLed) {
        globalLed.classList.remove('ready'); // Remove Green
        globalLed.classList.add('on');       // Add Red
    }

    // 3. Switch to VVPAT View after short delay (interaction feedback)
    setTimeout(() => {
      showView('vvpat');
      startVVPATSequence(cid);
    }, 1000);
  }

  function startVVPATSequence(cid) {
    const candidate = candidates.find(c => c.id === cid);
    const slip = document.createElement('div');
    slip.className = 'paper-slip';
    slip.innerHTML = `
        <div class="slip-serial">${pad(cid)}</div>
        <div class="slip-name">${candidate.name}</div>
        <img src="${candidate.symbol}" class="slip-symbol" onerror="this.style.display='none'">
    `;

    els.paperTrack.appendChild(slip);

    // VVPAT LED ON (Green - Printing)
    els.vvpatLed.classList.add('on');

    // Animation: Using Web Animations API for precision
    // 1. Enter
    const enterAnim = slip.animate([
      { top: '-150px' },
      { top: '20px' }
    ], {
      duration: 800,
      fill: 'forwards',
      easing: 'ease-out'
    });

    enterAnim.onfinish = () => {
      // 2. Hold for 7 seconds (Official spec is ~7s)
      setTimeout(() => {
        // 3. Drop (Exit)
        const exitAnim = slip.animate([
          { top: '20px', opacity: 1 },
          { top: '300px', opacity: 0 }
        ], {
          duration: 600,
          fill: 'forwards',
          easing: 'ease-in'
        });

        exitAnim.onfinish = () => {
          // Sequence Complete
          slip.remove();
          els.vvpatLed.classList.remove('on');

          // Record Vote
          tally[cid] = (tally[cid] || 0) + 1;
          localStorage.setItem('evm_tally', JSON.stringify(tally));
          renderTally();

          // Play Beep
          playBeep().then(() => {
            // Reset Ballot Unit LEDs
            const allLeds = document.querySelectorAll('.cand-led.on');
            allLeds.forEach(l => l.classList.remove('on'));
            document.getElementById('statusLed').classList.remove('on');

            // Show Tally
            showView('tally');
          });
        };
      }, CONFIG.vvpatHoldTime);
    };
  }

  // Audio Context (must be resumed on user gesture)
  let audioCtx = null;
  function playBeep() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    return new Promise(resolve => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square'; // Harsh electronic beep
      osc.frequency.setValueAtTime(CONFIG.beepFreq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      setTimeout(() => {
        osc.stop();
        resolve();
      }, CONFIG.beepDur);
    });
  }

  function pad(n) { return n < 10 ? '0' + n : n; }

  init();
})();