const CMAX_HOME = {
  currentStep: 'site',

  init() {
    // Delayed init to ensure all functions are loaded
    setTimeout(() => this.bindEvents(), 100);
  },

  bindEvents() {
    const langButtons = document.querySelectorAll('#homeLangSelector .lang-btn');
    langButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = e.target.getAttribute('data-cmax-args').replace(/["\[\]]/g, '');
        if (typeof CMAX !== 'undefined' && CMAX.utils && CMAX.utils.setLanguage) {
          CMAX.utils.setLanguage(lang);
          this.updateTexts();
          this.updateLangButtons();
        }
      });
    });

    const moduleButtons = document.querySelectorAll('.home-btn[data-module]');
    moduleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const module = e.target.closest('.home-btn').getAttribute('data-module');
        this.selectModule(module);
      });
    });
  },

  updateTexts() {
    const t = (key) => {
      if (typeof window.t !== 'undefined') return window.t(key);
      return key;
    };
    const els = {
      homeTitle: t('homeTitle'),
      siteSelectionTitle: t('siteSelectionTitle'),
      moduleSelectionTitle: t('moduleSelectionTitle'),
      homePlannerText: t('homePlannerText'),
      homeTidplanText: t('homeTidplanText'),
      homeBinsText: t('homeBinsText'),
      homeWarehouseText: t('homeWarehouseText'),
      homeNotificationsText: t('homeNotificationsText'),
      homeSurveysText: t('homeSurveysText'),
      homeAdminText: t('homeAdminText'),
      homeLogoutText: t('homeLogoutText'),
    };
    Object.entries(els).forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  },

  show() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('homeOverlay').style.display = 'flex';
    this.currentStep = 'site';
    this.showSiteSelection();
    this.updateTexts();
    this.updateLangButtons();
  },

  hide() {
    document.getElementById('homeOverlay').style.display = 'none';
  },

  showSiteSelection() {
    document.getElementById('siteSelectionStep').style.display = 'block';
    document.getElementById('moduleSelectionStep').style.display = 'none';
    this.populateSites();
  },

  showModuleSelection() {
    document.getElementById('siteSelectionStep').style.display = 'none';
    document.getElementById('moduleSelectionStep').style.display = 'block';
  },

  populateSites() {
    const siteOptions = document.getElementById('siteOptions');
    siteOptions.innerHTML = '';

    if (typeof window.getAccessibleSites !== 'undefined') {
      const allowedSites = window.getAccessibleSites();
      if (!allowedSites || allowedSites.length === 0) {
        this.addSiteButton('default');
        return;
      }
      allowedSites.forEach(site => {
        this.addSiteButton(site);
      });
    } else {
      this.addSiteButton('default');
    }
  },

  addSiteButton(site) {
    const siteOptions = document.getElementById('siteOptions');
    const btn = document.createElement('button');
    btn.className = 'home-btn';
    btn.setAttribute('data-site', site);
    const displayName = this.getSiteDisplayName(site);
    btn.innerHTML = `
      <div class="home-icon">🏗️</div>
      <div class="home-label">${displayName}</div>
    `;
    btn.addEventListener('click', () => this.selectSite(site));
    siteOptions.appendChild(btn);
  },

  getSiteDisplayName(site) {
    const t = (key) => {
      if (typeof window.t !== 'undefined') return window.t(key);
      return key;
    };
    return site === 'default' ? t('siteDefaultName') : site;
  },

  selectSite(site) {
    if (typeof window.switchSiteFromLocal !== 'undefined') {
      window.switchSiteFromLocal(site);
    }
    this.currentStep = 'module';
    this.showModuleSelection();
  },

  selectModule(module) {
    this.hide();
    const moduleMap = {
      'planner': () => { if (typeof window.showPlanner === 'function') window.showPlanner(); },
      'tidplan': () => { if (typeof window.showTidplan === 'function') window.showTidplan(); },
      'bins': () => { if (typeof window.showBins === 'function') window.showBins(); },
      'warehouse': () => { if (typeof window.showWarehouse === 'function') window.showWarehouse(); },
      'store': () => { if (typeof window.showWorkwear === 'function') window.showWorkwear(); },
      'notifications': () => { if (typeof window.showNotifications === 'function') window.showNotifications(); },
      'surveys': () => { if (typeof window.showSurveys === 'function') window.showSurveys(); },
      'admin': () => { if (typeof window.showAdminPanel === 'function') window.showAdminPanel(); },
      'logout': () => { if (typeof window.logout === 'function') window.logout(); },
    };
    const action = moduleMap[module];
    if (action) action();
  },

  updateLangButtons() {
    const getCurrentLang = () => {
      if (typeof window.currentLang !== 'undefined') return window.currentLang;
      return localStorage.getItem('cmax_lang') || 'hr';
    };
    const current = getCurrentLang();
    document.querySelectorAll('#homeLangSelector .lang-btn').forEach(btn => {
      btn.classList.remove('active');
      const text = btn.textContent.trim();
      if (
        (current === 'hr' && text.includes('HR')) ||
        (current === 'en' && text.includes('EN')) ||
        (current === 'sv' && text.includes('SV'))
      ) {
        btn.classList.add('active');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  CMAX_HOME.init();
});
