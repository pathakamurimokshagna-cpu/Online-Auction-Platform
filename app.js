const audioSynth = {
  ctx: null,
  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },
  playTone(type, startFreq, endFreq, duration, gainVal = 0.15) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration * 0.8);
      }
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  },
  playBidSound() {
    this.playTone('sine', 587.33, 880, 0.3, 0.15);
  },
  playOutbidSound() {
    this.playTone('sawtooth', 440, 293.66, 0.3, 0.12);
  },
  playWinSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const start = ctx.currentTime + (idx * 0.08);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch (e) {}
  }
};

const app = {
  wallet: 25000,
  activeCategory: 'All',
  searchQuery: '',
  sortOption: 'ending',
  showOnlyWatchlist: false,
  watchlist: new Set([101]),
  activeInspectId: null,
  lots: [
    {
      id: 101,
      title: 'Rolex Daytona Reference 6263 "Big Red"',
      category: 'High Horology',
      currentBid: 34500,
      reservePrice: 38000,
      buyNowPrice: 48000,
      endTime: Date.now() + 140000,
      topBidder: 'Collector_Geneva',
      isUserLeading: false,
      settled: false,
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
      desc: 'Iconic 1978 stainless steel chronograph with immaculate black matte dial and crisp silver sub-dials. Retains unpolished bevels and original box and papers.',
      history: [
        { bidder: 'Collector_Geneva', amount: 34500, time: '2 mins ago' },
        { bidder: 'Zurich_Vault', amount: 32000, time: '6 mins ago' },
        { bidder: 'Initial Consignor', amount: 28000, time: '14 mins ago' }
      ]
    },
    {
      id: 102,
      title: 'Jean-Michel Basquiat (1982) "Untitled Study"',
      category: 'Fine Art',
      currentBid: 52000,
      reservePrice: 50000,
      buyNowPrice: 75000,
      endTime: Date.now() + 290000,
      topBidder: 'SOHO_Collection',
      isUserLeading: false,
      settled: false,
      image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
      desc: 'Acrylic and oilstick on linen canvas. Documented in the 1996 Galerie Enrico Navarra catalogue raisonne. Acquired directly from Annina Nosei Gallery.',
      history: [
        { bidder: 'SOHO_Collection', amount: 52000, time: '4 mins ago' },
        { bidder: 'Consortium_NY', amount: 48000, time: '10 mins ago' }
      ]
    },
    {
      id: 103,
      title: 'Imperial Roman Bronze Gladius Hilt (1st Century AD)',
      category: 'Rare Antiquities',
      currentBid: 8200,
      reservePrice: 8000,
      buyNowPrice: 14000,
      endTime: Date.now() + 85000,
      topBidder: 'British_Curator',
      isUserLeading: false,
      settled: false,
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80',
      desc: 'Exquisite cast bronze anthropomorphic hilt excavated near the Rhine limes in 1964. Accompanied by Oxford TL authenticity report.',
      history: [
        { bidder: 'British_Curator', amount: 8200, time: '1 min ago' },
        { bidder: 'Consignor Floor', amount: 6500, time: '20 mins ago' }
      ]
    },
    {
      id: 104,
      title: 'Apple-1 Operational Motherboard Signed by Woz',
      category: 'Precision Tech',
      currentBid: 19500,
      reservePrice: 22000,
      buyNowPrice: 32000,
      endTime: Date.now() + 420000,
      topBidder: 'Silicon_Historian',
      isUserLeading: false,
      settled: false,
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
      desc: 'Fully restored and operating condition Byte Shop Apple Computer 1 with original cassette interface and period Datanetics keyboard.',
      history: [
        { bidder: 'Silicon_Historian', amount: 19500, time: '5 mins ago' }
      ]
    }
  ],
  wonLots: [],
  auditLog: [],

  init() {
    this.logAudit('SALEROOM_INIT', 'Saleroom floor opened with 4 authenticated consignments.');
    this.renderFloor();
    this.renderAdminKPIs();
    this.renderAdminTable();
    this.updateWalletDisplay();
    setInterval(() => this.tickClock(), 1000);
  },

  logAudit(action, detail) {
    const time = new Date().toLocaleTimeString();
    this.auditLog.unshift({ action, detail, time });
    if (this.auditLog.length > 50) this.auditLog.pop();
    this.renderAuditFeed();
  },

  notify(msg, icon = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'bg-surface/95 border border-slate-700/80 text-slate-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs backdrop-blur-md pointer-events-auto transition transform translate-y-2';
    const iconClass = icon === 'win' ? 'trophy text-gold-400' : icon === 'outbid' ? 'triangle-exclamation text-rose-400' : 'circle-check text-emerald-400';
    t.innerHTML = `<i class="fa-solid fa-${iconClass} text-sm"></i><div class="font-mono">${msg}</div>`;
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, 3600);
  },

  switchView(view) {
    document.getElementById('saleroomFloorView').classList.toggle('hidden', view !== 'floor');
    document.getElementById('adminSuiteView').classList.toggle('hidden', view !== 'admin');
    
    const fBtn = document.getElementById('navBtnFloor');
    const aBtn = document.getElementById('navBtnAdmin');
    if (view === 'floor') {
      fBtn.className = 'px-4 py-1.5 rounded-lg bg-gold-500 text-slate-950 font-bold transition shadow-sm';
      aBtn.className = 'px-4 py-1.5 rounded-lg text-slate-400 hover:text-white transition';
      this.renderFloor();
    } else {
      aBtn.className = 'px-4 py-1.5 rounded-lg bg-gold-500 text-slate-950 font-bold transition shadow-sm';
      fBtn.className = 'px-4 py-1.5 rounded-lg text-slate-400 hover:text-white transition';
      this.renderAdminKPIs();
      this.renderAdminTable();
    }
  },

  switchAdminSubTab(tab) {
    document.getElementById('adminLotsContainer').classList.toggle('hidden', tab !== 'lots');
    document.getElementById('adminAuditContainer').classList.toggle('hidden', tab !== 'audit');
    document.getElementById('adminTabLotsBtn').className = tab === 'lots' ? 'px-3 py-1 rounded-lg bg-gold-500 text-slate-950 font-bold transition' : 'px-3 py-1 rounded-lg text-slate-400 hover:text-white transition';
    document.getElementById('adminTabAuditBtn').className = tab === 'audit' ? 'px-3 py-1 rounded-lg bg-gold-500 text-slate-950 font-bold transition' : 'px-3 py-1 rounded-lg text-slate-400 hover:text-white transition';
  },

  setCategory(cat) {
    this.activeCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(b => {
      b.className = b.dataset.cat === cat ? 'cat-pill whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gold-500 text-slate-950 shadow-md shadow-gold-500/10' : 'cat-pill whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/40 border border-slate-800';
    });
    this.renderFloor();
  },

  handleSearch(q) {
    this.searchQuery = q.toLowerCase();
    this.renderFloor();
  },

  handleSort(val) {
    this.sortOption = val;
    this.renderFloor();
  },

  toggleWatchlistFilter() {
    this.showOnlyWatchlist = !this.showOnlyWatchlist;
    const btn = document.getElementById('watchlistToggleBtn');
    btn.classList.toggle('bg-gold-500/10', this.showOnlyWatchlist);
    btn.classList.toggle('border-gold-500/50', this.showOnlyWatchlist);
    this.renderFloor();
  },

  toggleWatchlist(id) {
    if (this.watchlist.has(id)) {
      this.watchlist.delete(id);
    } else {
      this.watchlist.add(id);
    }
    document.getElementById('watchlistCountBadge').innerText = this.watchlist.size;
    this.renderFloor();
  },

  renderFloor() {
    const grid = document.getElementById('lotGrid');
    const empty = document.getElementById('emptyCatalogState');
    if (!grid) return;
    
    let filtered = this.lots.filter(lot => {
      const matchCat = this.activeCategory === 'All' || lot.category === this.activeCategory;
      const matchSearch = lot.title.toLowerCase().includes(this.searchQuery) || lot.category.toLowerCase().includes(this.searchQuery);
      const matchWatch = !this.showOnlyWatchlist || this.watchlist.has(lot.id);
      return matchCat && matchSearch && matchWatch;
    });

    filtered.sort((a, b) => {
      if (this.sortOption === 'ending') return a.endTime - b.endTime;
      if (this.sortOption === 'price-desc') return b.currentBid - a.currentBid;
      if (this.sortOption === 'price-asc') return a.currentBid - b.currentBid;
      if (this.sortOption === 'bids-desc') return (b.history?.length || 0) - (a.history?.length || 0);
      return 0;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    grid.innerHTML = filtered.map(lot => {
      const isEnded = lot.endTime <= Date.now();
      const tLeft = Math.max(0, Math.floor((lot.endTime - Date.now()) / 1000));
      const mins = Math.floor(tLeft / 60);
      const secs = tLeft % 60;
      const isClosingSoon = !isEnded && tLeft < 120;
      const isReserveMet = lot.currentBid >= lot.reservePrice;
      const isWatched = this.watchlist.has(lot.id);

      return `
        <div class="group bg-surface/70 hover:bg-surface border ${lot.isUserLeading ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/5' : 'border-slate-800/80 hover:border-slate-700'} rounded-3xl overflow-hidden transition duration-300 flex flex-col justify-between backdrop-blur-sm">
          <div class="relative aspect-[4/3] bg-saleroom overflow-hidden">
            <img src="${lot.image}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='https://placehold.co/600x400/0b0f19/f59e0b?text=Authenticated+Lot'"/>
            <div class="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80"></div>

            <div class="absolute top-3 left-3 flex items-center gap-1.5">
              <span class="bg-saleroom/90 backdrop-blur-md border border-slate-700/80 text-gold-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg shadow">LOT #${lot.id}</span>
              <span class="bg-surface/90 backdrop-blur-md border border-slate-700/80 text-slate-300 font-mono text-[9px] uppercase px-2 py-0.5 rounded-lg">${lot.category}</span>
            </div>

            <button onclick="app.toggleWatchlist(${lot.id})" class="absolute top-3 right-3 w-8 h-8 rounded-xl bg-saleroom/80 backdrop-blur-md border border-slate-700/80 flex items-center justify-center text-xs transition ${isWatched ? 'text-amber-500' : 'text-slate-400 hover:text-white'}">
              <i class="fa-solid fa-bookmark"></i>
            </button>

            <div class="absolute bottom-3 inset-x-3 flex items-center justify-between">
              <span class="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md ${isReserveMet ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}">
                ${isReserveMet ? 'Reserve Met' : 'Reserve Pending'}
              </span>
              <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-md ${isEnded ? 'bg-slate-900/90 text-slate-500' : isClosingSoon ? 'bg-rose-500/90 text-white animate-pulse' : 'bg-saleroom/90 text-gold-400 border border-slate-700'}">
                <i class="fa-regular fa-clock mr-1 text-[10px]"></i>
                ${isEnded ? 'CONCLUDED' : `${mins}m ${secs < 10 ? '0' : ''}${secs}s`}
              </span>
            </div>
          </div>

          <div class="p-5 space-y-4">
            <div>
              <h4 class="font-serif text-base font-bold text-white group-hover:text-gold-400 transition truncate">${lot.title}</h4>
              <p class="text-xs text-slate-400 line-clamp-1 mt-1 leading-relaxed">${lot.desc}</p>
            </div>

            <div class="flex items-end justify-between border-t border-slate-800/80 pt-3">
              <div>
                <span class="text-[10px] uppercase font-mono tracking-wider text-slate-500">Current Valuation</span>
                <div class="font-mono text-xl font-bold text-gold-400">$${lot.currentBid.toLocaleString()}</div>
              </div>
              <div>
                ${lot.isUserLeading ? 
                  `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-crown text-[9px]"></i> You Lead</span>` :
                  `<span class="text-slate-500 text-[10px] font-mono">High Bidder: <span class="text-slate-300 font-semibold">${lot.topBidder}</span></span>`
                }
              </div>
            </div>

            <div class="space-y-2 pt-1">
              <div class="flex gap-2">
                <button ${isEnded ? 'disabled' : ''} onclick="app.placeBid(${lot.id}, 100)" class="flex-1 py-2 bg-saleroom hover:bg-surfaceLight disabled:opacity-40 border border-slate-800 rounded-xl font-mono text-xs font-bold text-slate-200 transition">
                  + $100
                </button>
                <button ${isEnded ? 'disabled' : ''} onclick="app.placeBid(${lot.id}, 500)" class="flex-1 py-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 disabled:opacity-40 rounded-xl font-mono text-xs font-bold transition">
                  + $500
                </button>
              </div>
              <button onclick="app.openInspectModal(${lot.id})" class="w-full py-2 bg-surfaceLight hover:bg-slate-700/60 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 transition flex items-center justify-center gap-2">
                <i class="fa-solid fa-magnifying-glass text-gold-400 text-[10px]"></i> Inspect Lot & Verified Ledger
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  tickClock() {
    let needsReRender = false;
    const now = Date.now();

    this.lots.forEach(lot => {
      if (lot.endTime <= now && !lot.settled) {
        lot.settled = true;
        needsReRender = true;
        this.logAudit('HAMMER_DROP', `Auction closed on Lot #${lot.id} ("${lot.title}") at $${lot.currentBid.toLocaleString()}`);

        if (lot.isUserLeading && !this.wonLots.find(w => w.id === lot.id)) {
          this.wonLots.push(lot);
          audioSynth.playWinSound();
          this.notify(`CONGRATULATIONS! You won Lot #${lot.id} ("${lot.title}") for $${lot.currentBid.toLocaleString()}!`, 'win');
          const badge = document.getElementById('wonLotsCountBadge');
          if (badge) badge.innerText = this.wonLots.length;
        }
      }
    });

    if (this.activeInspectId) {
      const inspected = this.lots.find(l => l.id === this.activeInspectId);
      if (inspected) {
        const isEnded = inspected.endTime <= now;
        const tLeft = Math.max(0, Math.floor((inspected.endTime - now) / 1000));
        const timerBadge = document.getElementById('inspectModalTimerBadge');
        if (timerBadge) {
          timerBadge.innerText = isEnded ? 'AUCTION CONCLUDED' : `${Math.floor(tLeft / 60)}m ${tLeft % 60}s remaining`;
        }
      }
    }

    const floor = document.getElementById('saleroomFloorView');
    if (floor && !floor.classList.contains('hidden')) {
      this.renderFloor();
    }
  },

  placeBid(lotId, incAmount) {
    const lot = this.lots.find(l => l.id === lotId);
    if (!lot || lot.endTime <= Date.now()) return;

    const prospectiveBid = lot.currentBid + incAmount;
    if (prospectiveBid > this.wallet) {
      this.notify(`Insufficient escrow liquidity. Bid exceeds your vault balance ($${this.wallet.toLocaleString()}).`, 'outbid');
      return;
    }

    lot.currentBid = prospectiveBid;
    lot.topBidder = 'Verified Bidder #7109 (You)';
    lot.isUserLeading = true;

    const remaining = lot.endTime - Date.now();
    if (remaining < 30000) {
      lot.endTime += 45000;
      this.notify(`ANTI-SNIPE EXTENSION: Auction clock extended +45 seconds on Lot #${lot.id}!`, 'info');
    }

    lot.history.unshift({
      bidder: 'Verified Bidder #7109 (You)',
      amount: prospectiveBid,
      time: 'Just now'
    });

    audioSynth.playBidSound();
    this.logAudit('USER_BID', `Placed $${prospectiveBid.toLocaleString()} on Lot #${lot.id}`);
    this.notify(`Bid authorized: $${prospectiveBid.toLocaleString()} on Lot #${lot.id}`, 'info');

    this.renderFloor();
    this.renderAdminKPIs();
    this.renderAdminTable();

    if (this.activeInspectId === lotId) {
      this.populateInspectModal(lot);
    }

    setTimeout(() => {
      if (lot.endTime > Date.now() && Math.random() < 0.75) {
        const botNames = ['Geneva_Syndicate', 'Monaco_Vault', 'Savile_Row_Collector', 'Mayfair_Partner'];
        const bot = botNames[Math.floor(Math.random() * botNames.length)];
        const botIncrement = Math.random() > 0.5 ? 500 : 250;
        
        lot.currentBid += botIncrement;
        lot.topBidder = bot;
        lot.isUserLeading = false;
        lot.history.unshift({
          bidder: bot,
          amount: lot.currentBid,
          time: 'Just now'
        });

        audioSynth.playOutbidSound();
        this.logAudit('RIVAL_BID', `${bot} placed counter-bid of $${lot.currentBid.toLocaleString()} on Lot #${lot.id}`);
        this.notify(`OUTBID WARNING: ${bot} placed counter-bid of $${lot.currentBid.toLocaleString()} on "${lot.title}"!`, 'outbid');

        this.renderFloor();
        this.renderAdminKPIs();
        this.renderAdminTable();

        if (this.activeInspectId === lotId) {
          this.populateInspectModal(lot);
        }
      }
    }, 2500);
  },

  buyItNow(lotId) {
    const lot = this.lots.find(l => l.id === lotId);
    if (!lot || lot.endTime <= Date.now()) return;

    if (lot.buyNowPrice > this.wallet) {
      this.notify(`Insufficient escrow vault balance for Buy-It-Now price ($${lot.buyNowPrice.toLocaleString()}).`, 'outbid');
      return;
    }

    lot.currentBid = lot.buyNowPrice;
    lot.topBidder = 'Verified Bidder #7109 (You)';
    lot.isUserLeading = true;
    lot.endTime = Date.now();
    lot.history.unshift({
      bidder: 'Verified Bidder #7109 (You) [BUY-IT-NOW]',
      amount: lot.buyNowPrice,
      time: 'Just now'
    });

    audioSynth.playWinSound();
    this.logAudit('BUY_NOW_EXEC', `Immediate buy executed on Lot #${lot.id} at $${lot.buyNowPrice.toLocaleString()}`);
    this.notify(`IMMEDIATE HAMMER: Lot #${lot.id} purchased outright!`, 'win');

    this.closeInspectModal();
    this.renderFloor();
    this.renderAdminKPIs();
    this.renderAdminTable();
  },

  openInspectModal(id) {
    this.activeInspectId = id;
    const lot = this.lots.find(l => l.id === id);
    if (!lot) return;

    this.populateInspectModal(lot);
    document.getElementById('inspectModal').classList.remove('hidden');
  },

  populateInspectModal(lot) {
    const isEnded = lot.endTime <= Date.now();
    const isReserveMet = lot.currentBid >= lot.reservePrice;

    document.getElementById('inspectModalLotNum').innerText = `LOT #${lot.id}`;
    document.getElementById('inspectModalCategory').innerText = lot.category;
    document.getElementById('inspectModalTitle').innerText = lot.title;
    document.getElementById('inspectModalDesc').innerText = lot.desc;
    document.getElementById('inspectModalImage').src = lot.image;
    document.getElementById('inspectModalCurrentBid').innerText = `$${lot.currentBid.toLocaleString()}`;

    const reserveBadge = document.getElementById('inspectModalReserveBadge');
    reserveBadge.innerText = isReserveMet ? 'Reserve Met' : 'Reserve Pending';
    reserveBadge.className = `absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase backdrop-blur-md ${isReserveMet ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`;

    const leadStatus = document.getElementById('inspectModalLeadStatus');
    leadStatus.innerHTML = lot.isUserLeading ?
      `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5"><i class="fa-solid fa-crown"></i> High Bidder (You)</span>` :
      `<span class="text-xs font-mono text-slate-400">Led by: <span class="text-white font-bold">${lot.topBidder}</span></span>`;

    const histContainer = document.getElementById('inspectModalHistory');
    histContainer.innerHTML = lot.history.map((h, i) => `
      <div class="flex justify-between items-center py-1 border-b border-slate-800/60 last:border-0">
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-slate-500">#${lot.history.length - i}</span>
          <span class="${h.bidder.includes('You') ? 'text-gold-400 font-bold' : 'text-slate-300'}">${h.bidder}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-bold text-white">$${h.amount.toLocaleString()}</span>
          <span class="text-[10px] text-slate-500">${h.time}</span>
        </div>
      </div>
    `).join('');

    document.getElementById('inspectBiddingControls').classList.toggle('hidden', isEnded);
    document.getElementById('inspectClosedNotice').classList.toggle('hidden', !isEnded);

    const binCont = document.getElementById('inspectBuyNowContainer');
    if (lot.buyNowPrice && !isEnded) {
      binCont.innerHTML = `
        <button onclick="app.buyItNow(${lot.id})" class="w-full py-2 bg-gradient-to-r from-amber-600/30 to-gold-500/30 hover:from-amber-600/50 hover:to-gold-500/50 border border-gold-500/40 rounded-xl text-gold-400 font-mono text-xs font-bold transition flex items-center justify-center gap-2">
          <i class="fa-solid fa-bolt"></i> Instant Hammer (Buy-It-Now): $${lot.buyNowPrice.toLocaleString()}
        </button>
      `;
    } else {
      binCont.innerHTML = '';
    }

    document.getElementById('inspectMinBidHint').innerText = `Min Next: $${(lot.currentBid + 50).toLocaleString()}`;
    document.getElementById('inspectCustomBidInput').min = lot.currentBid + 50;
    document.getElementById('inspectCustomBidInput').value = lot.currentBid + 100;
  },

  closeInspectModal() {
    this.activeInspectId = null;
    document.getElementById('inspectModal').classList.add('hidden');
  },

  placeCustomBidFromModal() {
    if (!this.activeInspectId) return;
    const val = parseFloat(document.getElementById('inspectCustomBidInput').value);
    const lot = this.lots.find(l => l.id === this.activeInspectId);
    if (!lot) return;
    if (val <= lot.currentBid) {
      this.notify(`Bid must exceed current high bid ($${lot.currentBid.toLocaleString()}).`, 'outbid');
      return;
    }
    this.placeBid(this.activeInspectId, val - lot.currentBid);
  },

  placeIncrementBidFromModal(inc) {
    if (!this.activeInspectId) return;
    this.placeBid(this.activeInspectId, inc);
  },

  toggleCartDrawer(open) {
    document.getElementById('cartDrawer').classList.toggle('hidden', !open);
    if (open) {
      this.renderCartWonItems();
      this.updateCheckoutCalculations();
    }
  },

  renderCartWonItems() {
    const list = document.getElementById('cartWonItemsList');
    const footer = document.getElementById('cartDrawerFooter');
    const details = document.getElementById('cartCheckoutDetails');

    if (this.wonLots.length === 0) {
      list.innerHTML = `
        <div class="text-center py-12 bg-saleroom/50 rounded-2xl border border-dashed border-slate-800">
          <i class="fa-solid fa-trophy text-3xl text-slate-600 mb-2"></i>
          <div class="text-xs font-mono text-slate-400 font-bold">No Settled Acquisitions Ready</div>
          <p class="text-[11px] text-slate-500 mt-1">Participate in live lots to secure winning hammers.</p>
        </div>
      `;
      footer.classList.add('hidden');
      details.classList.add('hidden');
      return;
    }

    footer.classList.remove('hidden');
    details.classList.remove('hidden');

    list.innerHTML = this.wonLots.map(item => `
      <div class="bg-saleroom/80 border border-slate-800 rounded-2xl p-3.5 flex gap-3 items-center">
        <img src="${item.image}" class="w-14 h-14 rounded-xl object-cover border border-slate-800">
        <div class="flex-1 min-w-0">
          <span class="text-[9px] font-mono text-gold-500">LOT #${item.id}</span>
          <h5 class="font-serif font-bold text-white text-xs truncate">${item.title}</h5>
          <div class="text-[10px] text-slate-400 font-mono">Category: ${item.category}</div>
        </div>
        <div class="text-right font-mono">
          <div class="text-[10px] text-slate-500 uppercase">Hammer</div>
          <div class="text-xs font-bold text-gold-400">$${item.currentBid.toLocaleString()}</div>
        </div>
      </div>
    `).join('');

    document.getElementById('cartEscrowBalance').innerText = `$${this.wallet.toLocaleString()}`;
  },

  updateCheckoutCalculations() {
    const hammerTotal = this.wonLots.reduce((acc, lot) => acc + lot.currentBid, 0);
    const premium = hammerTotal * 0.10;
    const shipping = parseFloat(document.getElementById('checkoutShippingTier').value || 75);
    const tax = (hammerTotal + premium) * 0.08;
    const grandTotal = hammerTotal + premium + shipping + tax;

    this.currentSettlementFigures = { hammerTotal, premium, shipping, tax, grandTotal };

    document.getElementById('ledgerHammerPrice').innerText = `$${hammerTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('ledgerPremium').innerText = `$${premium.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('ledgerShipping').innerText = `$${shipping.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('ledgerTax').innerText = `$${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('ledgerGrandTotal').innerText = `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const payBtn = document.getElementById('btnAuthorizeSettlement');
    if (grandTotal > this.wallet) {
      payBtn.disabled = true;
      payBtn.className = 'w-full py-3 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs uppercase cursor-not-allowed';
      payBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-1"></i> Insufficient Escrow Vault Funds';
    } else {
      payBtn.disabled = false;
      payBtn.className = 'w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2';
      payBtn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Authorize Escrow Settlement';
    }
  },

  executeEscrowSettlement() {
    const { grandTotal, hammerTotal, premium, shipping, tax } = this.currentSettlementFigures;
    if (grandTotal > this.wallet) return;

    this.wallet -= grandTotal;
    this.updateWalletDisplay();

    const invNumber = 'AUCTIO-INV-' + Math.floor(100000 + Math.random() * 900000);
    const hash = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');

    document.getElementById('invNumberDisplay').innerText = invNumber;
    document.getElementById('invDateDisplay').innerText = 'Date: ' + new Date().toISOString().split('T')[0];
    document.getElementById('invHammer').innerText = `$${hammerTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('invPremium').innerText = `$${premium.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('invShipping').innerText = `$${shipping.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('invTax').innerText = `$${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('invGrandTotal').innerText = `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('invCryptoHash').innerText = hash;

    document.getElementById('invItemsTable').innerHTML = this.wonLots.map(item => `
      <div class="py-2 flex justify-between">
        <div>
          <div class="font-bold text-slate-800">LOT #${item.id}: ${item.title}</div>
          <div class="text-[10px] text-slate-500">Authenticated Category: ${item.category}</div>
        </div>
        <div class="font-bold text-slate-900">$${item.currentBid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
    `).join('');

    this.logAudit('ESCROW_SETTLED', `Settled ${this.wonLots.length} lot(s) totaling $${grandTotal.toLocaleString()} under ${invNumber}`);
    this.notify(`Escrow settlement complete! Official invoice generated.`, 'win');

    this.wonLots = [];
    document.getElementById('wonLotsCountBadge').innerText = '0';
    this.toggleCartDrawer(false);
    document.getElementById('invoiceModal').classList.remove('hidden');
    this.renderAdminKPIs();
  },

  openDepositModal() {
    document.getElementById('depositModal').classList.remove('hidden');
  },

  executeDeposit(amt) {
    if (!amt || isNaN(amt) || amt <= 0) return;
    this.wallet += amt;
    this.updateWalletDisplay();
    this.logAudit('ESCROW_DEPOSIT', `Credited +$${amt.toLocaleString()} to escrow vault.`);
    this.notify(`Vault credited: +$${amt.toLocaleString()}`, 'info');
    document.getElementById('depositModal').classList.add('hidden');
    if (!document.getElementById('cartDrawer').classList.contains('hidden')) {
      this.updateCheckoutCalculations();
    }
  },

  updateWalletDisplay() {
    const formatted = `$${this.wallet.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('escrowBalanceDisplay').innerText = formatted;
  },

  renderAdminKPIs() {
    const grossVol = this.lots.reduce((acc, l) => acc + l.currentBid, 0);
    const activeCount = this.lots.filter(l => l.endTime > Date.now()).length;
    const settledCount = this.lots.filter(l => l.endTime <= Date.now()).length;
    const commissions = grossVol * 0.10;

    document.getElementById('kpiGrossVolume').innerText = `$${grossVol.toLocaleString()}`;
    document.getElementById('kpiActiveLots').innerText = activeCount;
    document.getElementById('kpiSettledLots').innerText = settledCount;
    document.getElementById('kpiHouseCommissions').innerText = `$${commissions.toLocaleString()}`;
  },

  renderAdminTable() {
    const tbody = document.getElementById('adminLotsTableBody');
    if (!tbody) return;
    tbody.innerHTML = this.lots.map(lot => {
      const isEnded = lot.endTime <= Date.now();
      const tLeft = Math.max(0, Math.floor((lot.endTime - Date.now()) / 1000));
      return `
        <tr class="hover:bg-saleroom/50 transition">
          <td class="p-3">
            <div class="font-bold text-white font-sans text-xs">${lot.title}</div>
            <div class="text-[10px] text-slate-500">LOT #${lot.id} • ${lot.category}</div>
          </td>
          <td class="p-3 text-gold-400 font-bold">$${lot.currentBid.toLocaleString()}</td>
          <td class="p-3 text-slate-300">$${lot.reservePrice.toLocaleString()}</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isEnded ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/10 text-emerald-400'}">
              ${isEnded ? 'CLOSED' : `${Math.floor(tLeft / 60)}m ${tLeft % 60}s`}
            </span>
          </td>
          <td class="p-3 text-right space-x-1.5">
            ${!isEnded ? `<button onclick="app.adminForceClose(${lot.id})" class="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-gold-400 border border-gold-500/20 transition text-[10px]">Close Hammer</button>` : ''}
            <button onclick="app.adminDeleteLot(${lot.id})" class="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition text-[10px]"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderAuditFeed() {
    const feed = document.getElementById('auditLogFeed');
    if (!feed) return;
    feed.innerHTML = this.auditLog.map(item => `
      <div class="py-2 flex items-start justify-between gap-3">
        <div>
          <span class="text-gold-500 font-bold">[${item.action}]</span>
          <span class="text-slate-300 ml-1.5">${item.detail}</span>
        </div>
        <span class="text-[10px] text-slate-500 whitespace-nowrap">${item.time}</span>
      </div>
    `).join('');
  },

  handleNewConsignment(e) {
    e.preventDefault();
    const title = document.getElementById('formLotTitle').value;
    const category = document.getElementById('formLotCategory').value;
    const startingBid = parseFloat(document.getElementById('formLotStart').value);
    const reservePrice = parseFloat(document.getElementById('formLotReserve').value);
    const durationMins = parseInt(document.getElementById('formLotDuration').value);
    const image = document.getElementById('formLotImage').value || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80';
    const desc = document.getElementById('formLotDesc').value || 'Consignor authenticated lot.';

    const newId = this.lots.length > 0 ? Math.max(...this.lots.map(l => l.id)) + 1 : 101;

    const newLot = {
      id: newId,
      title,
      category,
      currentBid: startingBid,
      reservePrice,
      buyNowPrice: reservePrice * 1.5,
      endTime: Date.now() + (durationMins * 60 * 1000),
      topBidder: 'House Floor Consignment',
      isUserLeading: false,
      settled: false,
      image,
      desc,
      history: [
        { bidder: 'House Consignor Opening', amount: startingBid, time: 'Just now' }
      ]
    };

    this.lots.unshift(newLot);
    e.target.reset();

    this.logAudit('LOT_CONSIGNED', `Published LOT #${newId} ("${title}") to saleroom floor.`);
    this.notify(`Consignment published: LOT #${newId} is now live!`, 'info');

    this.renderFloor();
    this.renderAdminKPIs();
    this.renderAdminTable();
  },

  adminForceClose(id) {
    const lot = this.lots.find(l => l.id === id);
    if (!lot) return;
    lot.endTime = Date.now();
    this.logAudit('ADMIN_OVERRIDE', `Auction clock terminated early on LOT #${id}`);
    this.notify(`Hammer dropped early on LOT #${id}`, 'info');
    this.renderFloor();
    this.renderAdminKPIs();
    this.renderAdminTable();
  },

  adminDeleteLot(id) {
    this.lots = this.lots.filter(l => l.id !== id);
    this.logAudit('LOT_DELETED', `Consignment record LOT #${id} expunged.`);
    this.notify(`LOT #${id} deleted from catalog.`, 'info');
    this.renderFloor();
    this.renderAdminKPIs();
    this.renderAdminTable();
  }
};

window.addEventListener('DOMContentLoaded', () => app.init());
