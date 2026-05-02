/* ==================== TRANSLATIONS ==================== */
const TRANSLATIONS = {
  hr: {
    loginTitle: "CMAX SCM",
    labelEmail: "Email adresa:",
    labelPassword: "Lozinka:",
    loginBtn: "Prijava",
    guestBtn: "👁 Nastavi kao gledatelj (read-only)",
    readonlyBadge: "READ-ONLY",
    guestLoginBtn: "Prijava",
    labelDate: "Odaberi datum:",
    btnPrint: "Print",
    btnExport: "Export PDF",
    btnClear: "Očisti tablicu",
    btnReport: "Prijavi lift",
    btnTidplan: "Tidplan",
    btnBins: "Kante za smeće",
    btnNotifications: "Obavijesti",
    btnSave: "Spremi",
    btnAdmin: "Admin Panel",
    btnLogout: "Odjava",
    listWorkers: "Resursi",
    listLifts: "Liftovi",
    listMoments: "Momenti",
    listPlans: "Planovi",
    listKarnas: "Karne/Delovi",
    colWorkerName: "Naziv",
    colWorkerStatus: "Status",
    colLiftName: "Naziv",
    colLiftStatus: "Status",
    colLiftPlan: "Plan",
    colMomentName: "Naziv",
    colPlanName: "Naziv",
    colKarnaName: "Naziv",
    planningTitle: "Raspored rada",
    thW1: "Radnik 1",
    thW2: "Radnik 2",
    thW3: "Radnik 3",
    thPlan: "Plan",
    thKarna: "Karna",
    thM1: "Moment 1",
    thM2: "Moment 2",
    thL1: "Lift 1",
    thL2: "Lift 2",
    thL3: "Lift 3",
    thComment: "Komentar",
    workerPresent: "Dostupan",
    workerAbsent: "Nedostupan",
    workerBusy: "Zauzet",
    liftAvailable: "Dostupan",
    liftUnavailable: "Nedostupan",
    adminModalTitle: "Upravljanje Adminima",
    tabAdmins: "Admini",
    tabGuest: "Gost mode",
    tabReports: "Prijave liftova",
    tabLogs: "Logovi",
    tabSettings: "Postavke",
    labelNewEmail: "Email adresa:",
    labelNewFirstName: "Ime:",
    labelNewLastName: "Prezime:",
    labelNewPassword: "Lozinka:",
    labelAdminLevel: "Razina admina:",
    adminLevelShort: "Lvl",
    labelPermissions: "Ovlasti novog admina:",
    labelAdminSites: "Gradilišta (pristup):",
    tidplanAvailableWorkers: "📊 Dostupni radnici:",
    tidplanSortBy: "Sortiraj po:",
    tidplanApplySort: "✓ Primijeni sortiraj",
    tidplanClose: "Zatvori",
    tidplanZoneManagerTitle: "⚙️ Upravljanje zonama",
    tidplanZoneNamePlaceholder: "Naziv zone",
    tidplanAddZone: "➕ Dodaj zonu",
    tidplanLegendTitle: "Legenda resursa",
    tidplanLegendSurplus: "Plavo: visak resursa",
    tidplanLegendExact: "Zeleno: tocno dovoljno resursa",
    tidplanLegendShortage: "Crveno: manjak resursa",
    tidplanLegendWeekend: "Sivo: Vikend",
    tidplanLegendHoliday: "Svijetlo crveno: Neradni dan",
    tidplanLegendNote:
      "Predji misem preko donjeg reda resursa za detalje po danu: visak i manjak resursa.",
    weekendLabel: "Vikend",
    perm_canAccessPlanner: "Pristup planneru",
    perm_canAccessTidplan: "Pristup Tidplanu",
    perm_canAccessBins: "Pristup Bins modulu",
    perm_canCreateReports: "Slanje prijava",
    perm_canManageTidplan: "Uređivanje Tidplana",
    perm_canOpenAdminPanel: "Otvaranje admin panela",
    perm_canManageAdmins: "Upravljanje adminima",
    perm_canManageSiteAccess: "Dodjela gradilišta",
    perm_canViewSettings: "Pregled postavki",
    perm_canManageGuestAccess: "Upravljanje guest pristupom",
    perm_canAddTidplanActivity: "Dodavanje aktivnosti",
    perm_canDeleteTidplanActivity: "Brisanje aktivnosti",
    perm_canManageTidplanZones: "Upravljanje zonama",
    perm_canPrintTidplan: "Print Tidplana",
    perm_canClearTidplan: "Ciscenje Tidplana",
    perm_canEditBinsData: "Uredjivanje Bins podataka",
    perm_canManageBinsPlans: "Dodavanje/uklanjanje Bins planova",
    perm_canManageBinsPermissions: "Bins postavke i dozvole",
    perm_canDeleteReports: "Brisanje prijava",
    perm_canPrint: "Print",
    perm_canExport: "Export PDF",
    perm_canClear: "Brisanje tablice",
    perm_canManageWorkers: "Upravljanje radnicima",
    perm_canManageLifts: "Upravljanje liftovima",
    perm_canManageMoments: "Upravljanje momentima",
    perm_canManagePlans: "Upravljanje planovima",
    perm_canManageKarnas: "Upravljanje karnama",
    perm_canViewReports: "Pregled prijava",
    perm_canApproveReports: "Odobravanje prijava",
    perm_canExportPlanner: "Export Plannera",
    perm_canImportPlanner: "Import Plannera",
    perm_canManageBackups: "Upravljanje backupima",
    perm_canViewBackups: "Pregled backupa",
    perm_canViewLogs: "Pregledavanje logova",
    perm_canClearLogs: "Brisanje logova",
    btnAddAdmin: "Dodaj Admina",
    adminListTitle: "Trenutni Admini:",
    btnManage: "Dodaj / Ukloni",
    managePanelTitle: "Dodaj / Ukloni",
    manageCategoryLabel: "Odaberi kategoriju:",
    mcWorkers: "Resursi",
    mcLifts: "Liftovi",
    mcMoments: "Momenti",
    mcPlans: "Planovi",
    mcKarnas: "Karne/Delovi",
    manageBack: "Natrag",
    manageAddBtn: "+ Dodaj",
    manageRemoveBtn: "− Ukloni",
    manageRemoveHint: "Kliknite na stavku za uklanjanje:",
    manageAddLabel: "Naziv:",
    manageConfirmAdd: "Potvrdi",
    manageSuccessAdd: "✅ Uspješno dodano!",
    manageSuccessRemove: "✅ Uspješno uklonjeno!",
    manageErrExists: "⚠️ Stavka s tim nazivom već postoji!",
    manageErrEmpty: "⚠️ Naziv ne može biti prazan!",
    superAdmin: "Super Administrator",
    admin: "Administrator",
    filterAll: "Sve",
    filterPending: "Na čekanju",
    filterApproved: "Odobrene",
    filterRejected: "Odbijene",
    reportModalTitle: "Prijava lifta",
    labelLift: "Broj lifta:",
    labelPlan: "Plan:",
    labelReporter: "Vaše ime:",
    labelComment: "Komentar (neobavezno):",
    btnSubmitReport: "Pošalji prijavu",
    badgePending: "Na čekanju",
    badgeApproved: "Odobreno",
    badgeRejected: "Odbijeno",
    badgeNew: "NOVO",
    btnApprove: "Odobri",
    btnReject: "Odbij",
    btnSavePerms: "Spremi ovlasti",
    confirmLogout: "Jeste li sigurni da se želite odjaviti?",
    confirmLogoutTitle: "Odjava",
    errEmailPassword: "Molimo unesite email i lozinku!",
    errWrongCredentials: "Pogrešan email ili lozinka!",
    errAdminEmailPassword: "Molimo unesite email i lozinku!",
    errAdminExists: "Admin sa ovom email adresom već postoji!",
    errInvalidEmail: "Molimo unesite validnu email adresu!",
    errAdminManageDenied: "Nemate dozvolu za upravljanje ovim adminom.",
    promptRemoveAdminReason: "Unesite razlog uklanjanja admina:",
    adminRemoveReasonRequired: "Morate unijeti razlog uklanjanja.",
    adminRemovedMessage: "Uklonio vas je admin",
    adminRemovedReasonLabel: "Razlog:",
    adminRemovedSiteLabel: "GradiliÅ¡te:",
    adminRemoveReasonUnknown: "Nije naveden",
    unknownUser: "Nepoznat korisnik",
    successAdminAdded: "✅ Admin je uspješno dodan!",
    successAdminRemoved: "✅ Admin je uspješno uklonjen!",
    confirmRemoveAdmin: "Jeste li sigurni da želite ukloniti admina",
    successPermsSaved: "✅ Ovlasti su spravljene!",
    clearTableConfirm:
      "Jeste li sigurni da želite očistiti cijelu tablicu za ovaj datum? Ova radnja se ne može poništiti!",
    clearTableSuccess: "✅ Tablica je uspješno očišćena!",
    momentDuplicateError: "Moment 1 i Moment 2 ne smiju biti isti!",
    errFillReport: "Molimo odaberite lift, plan i unesite vaše ime!",
    reportSubmitSuccess: "✅ Prijava je uspješno poslana!",
    noReports: "Nema prijava.",
    reportAdminNote: "Napomena admina:",
    approveConfirm: "Odobravate ovu prijavu?",
    rejectConfirm: "Unesite razlog odbijanja (opcionalno):",
    editPermsTitle: "Ovlasti za",
    btnCancel: "Odustani",
    btnOk: "U redu",
    btnYes: "Da",
    btnNo: "Ne",
    settingsDarkModeTitle: "Tamna tema",
    darkModeOn: "Uključi tamnu temu",
    darkModeOff: "Isključi tamnu temu",
    settingsThemeTitle: "Boja stranice",
    settingsThemeNote: "Kliknite na boju za primjenu. Promjena se pamti.",
    confirmThemeChange: "Promijeniti boju stranice?",
    confirmDarkMode: "Promijeniti temu stranice?",
    newReportNotif: "Nova prijava lifta!",
    goToReports: "Pogledaj prijave",
    binsTitle: "Kante za smeće",
    thBinPlan: "Plan",
    thBinKarna: "Kärna",
    thBinTotal: "Total available",
    thBinEmpty: "Empty available",
    thBinForEmpty: "For emptying",
    thBinAdditional: "Additional required",
    thBinStatus: "Status",
    logsTitle: "Evidencija aktivnosti",
    btnClearLogs: "Očisti logove",
    btnDeleteReport: "Obriši",
    confirmDeleteReport:
      "Jeste li sigurni da želite obrisati ovu prijavu?",
    reportDeleted: "✅ Prijava je obrisana!",
    dataSaved: "✅ Podaci su spremljeni!",
    changePasswordTitle: "Promjena lozinke",
    changePasswordModalTitle: "Promjena lozinke",
    labelOldPassword: "Stara lozinka:",
    labelCurrentPassword: "Trenutna lozinka:",
    labelNewPassword: "Nova lozinka:",
    labelConfirmPassword: "Potvrdi lozinku:",
    settingsPasswordTitle: "Sigurnost",
    btnChangePassword: "🔐 Promijeni lozinku",
    btnConfirmPasswordChange: "Promijeni lozinku",
    passwordChanged: "✅ Lozinka je uspješno promijenjena!",
    passwordMismatch: "⚠️ Nove lozinke se ne podudaraju!",
    wrongOldPassword: "⚠️ Stara lozinka nije točna!",
    settingsBinsTitle: "Bins tablica - omogući uređivanje kolona",
    guestAccessTitle: "Gost mode pristup",
    guestAccessNote: "Ovdje određuješ što posjetitelj vidi i koje komande su mu dostupne.",
    btnSaveGuestAccess: "Spremi guest pristup",
    presenceActiveLabel: "Aktivni",
    presenceViewing: "pregledava",
    presenceEditing: "uređuje",
    settingsLayoutTitle: "Layout i prikaz",
    settingsResetTidplanLayout: "Reset Tidplan layout",
    settingsResetTheme: "Reset izgled stranice",
    settingsLayoutNote: "Vraća spremljeni layout i temu na početne vrijednosti bez brisanja podataka.",
    permSectionGeneralTitle: "Opće",
    permSectionGeneralNote: "Osnovni pristup modulima i glavnim komandama.",
    permSectionExportImportTitle: "Export/Import",
    permSectionExportImportNote: "Dozvole za export i import podataka.",
    permSectionBackupTitle: "Backup",
    permSectionBackupNote: "Upravljanje backupima.",
    permSectionTidplanTitle: "Tidplan",
    permSectionTidplanNote: "Pristup i sve funkcije vezane uz Tidplan.",
    permSectionBinsTitle: "Bins",
    permSectionBinsNote: "Pristup i upravljanje Bins modulom.",
    permSectionReportsTitle: "Prijave liftova",
    permSectionReportsNote: "Prijave, pregled i obrada prijava liftova.",
    permSectionAdminTitle: "Admin i logovi",
    permSectionAdminNote: "Admin upravljanje, logovi i postavke.",
    permSectionSitesTitle: "Gradilišta",
    permSectionSitesNote: "Dodjela gradilišta adminima.",
    permSectionGuestTitle: "Gost mode",
    permSectionGuestNote: "Što posjetitelj vidi i koje komande može koristiti.",
    loadingDefault: "Učitavanje...",
    loadingLogin: "Provjera prijave...",
    loadingAdminPanel: "Otvaranje admin panela...",
    loadingSiteChange: "Učitavanje podataka gradilišta...",
    loadingTidplan: "Učitavanje Tidplana...",
    accessDenied: "Nemate dozvolu za ovu komandu.",
    accessReportsDenied: "Nemate dozvolu za prijave.",
    accessReportsViewDenied: "Nemate pristup prijavama.",
    accessLogsViewDenied: "Nemate pristup logovima.",
    accessLogsClearDenied: "Nemate dozvolu za brisanje logova!",
    accessBinsDenied: "Nemate pristup Bins modulu.",
    accessPrintDenied: "Nemate dozvolu za print.",
    accessExportDenied: "Nemate dozvolu za export.",
    accessTidplanDenied: "Nemate pristup Tidplanu.",
    accessTidplanPrintDenied: "Nemate dozvolu za print Tidplana.",
    adminNoTabs: "Admin panel nema dostupnih kartica za ovog korisnika.",
    resetTidplanLayoutSuccess: "Tidplan layout je resetiran.",
    resetThemeSuccess: "Izgled stranice je vraćen na zadane postavke.",
    accessNotice: "Trenutno nemate dodijeljen nijedan glavni modul za prikaz.",
    bin_perm_total_label: "Total Available",
    bin_perm_empty_label: "Empty Available",
    bin_perm_forEmpty_label: "For Emptying",
    binStatusOk: "OK",
    binStatusLow: "Low",
    binStatusNotEnough: "Not enough empty",
    binStatusBring: "Bring new",
    binStatusExcess: "Excess",
    binStatusEmpty: "Empty it",
    // Tidplan translations
    tidplanTitle: "TIDPLAN",
    tidplanSiteLabel: "Sada pogled:",
    tidplanDateLabel: "Datum:",
    tidplanAddActivity: "Dodaj aktivnost",
    tidplanPrint: "Print Tidplan",
    tidplanBackToPlanner: "Planner",
    tidplanSort: "Sortiraj",
    tidplanFilterPlan: "Filter Plan",
    tidplanFilterZona: "Filter Zona",
    tidplanFilterMoment: "Filter Moment",
    tidplanTablePlan: "Plan",
    tidplanTableZona: "Zona",
    tidplanTableKarna: "Karna",
    tidplanTableMoment: "Moment",
    tidplanTableResursi: "Resursi",
    tidplanTableStart: "Start",
    tidplanTableEnd: "End",
    tidplanTableActions: "Akcije",
    tidplanNoActivities: "Nema aktivnosti",
    tidplanManageZones: "Dodaj/Ukloni Zone",
    tidplanSiteSelector: "Gradilište",
    tidplanAddSite: "Dodaj",
    tidplanRemoveSite: "Ukloni",
    tidplanClearPlan: "🗑️ Očisti plan",
    tidplanSave: "💾 Spremi",
    notificationsTitle: "Obavijesti",
    notificationComposerTitle: "Nova obavijest",
    notificationTextLabel: "Obavijest:",
    notificationSitesLabel: "Objavi na gradilištima:",
    notificationImagesLabel: "Slike (max 2):",
    btnPublishNotification: "Objavi",
    btnBackFromNotifications: "Planner",
    notificationsEmpty: "Nema obavijesti.",
    accessNotificationsDenied: "Nemate pristup obavijestima.",
    notificationEmptyError: "Upišite obavijest ili dodajte sliku.",
    notificationSitesError: "Odaberite barem jedno gradilište.",
    notificationTooManyImages: "Možete dodati najviše 2 slike.",
    notificationUploadFailed: "Upload slika nije uspio. Pokušajte ponovno.",
    notificationPosted: "Obavijest je objavljena.",
    notificationDeleted: "Obavijest je obrisana.",
    confirmDeleteNotification: "Jeste li sigurni da želite obrisati ovu obavijest?",
    loadingNotifications: "Učitavanje obavijesti...",
    loadingNotificationUpload: "Spremanje obavijesti...",
    btnDeleteNotification: "Obriši",
    permSectionNotificationsTitle: "Obavijesti",
    permSectionNotificationsNote: "Pregled i objava obavijesti.",
    perm_canViewNotifications: "Pregled obavijesti",
    perm_canManageNotifications: "Objava obavijesti",
    perm_canDeleteNotifications: "Brisanje obavijesti",
    notificationFilterLabel: "Gradilište:",
    backupTabTitle: "Backup",
    backupManualBtn: "Kreiraj Backup odmah",
    backupListBtn: "Osvježi listu",
    backupInfoBtn: "Osvježi info",
    notificationSearchLabel: "Pretraga:",
    notificationPinnedOnlyLabel: "Samo pinned",
    // Warehouse translations
    btnWarehouse: "Skladište",
    warehouseTitle: "Upravljanje Skladištem",
    warehouseTabItems: "Stavke",
    warehouseTabAssignments: "Dodjele",
    warehouseTabLogs: "Skladišne logove",
    warehouseItemName: "Naziv stavke",
    warehouseItemDescription: "Opis",
    warehouseItemQuantity: "Količina",
    warehouseItemUnit: "Jedinica",
    warehouseItemCategory: "Kategorija",
    warehouseItemLocation: "Lokacija",
    warehouseItemCreatedAt: "Kreirano",
    warehouseItemUpdatedAt: "Ažurirano",
    warehouseAddItem: "➕ Dodaj stavku",
    warehouseEditItem: "✏️ Uredi stavku",
    warehouseDeleteItem: "🗑️ Obriši stavku",
    warehouseConfirmDelete: "Jeste li sigurni da želite obrisati ovu stavku?",
    warehouseItemAdded: "✅ Stavka je dodana!",
    warehouseItemUpdated: "✅ Stavka je ažurirana!",
    warehouseItemDeleted: "✅ Stavka je obrisana!",
    warehouseAdminEmail: "Email admina",
    warehouseAssignItems: "Dodjeli stavke",
    warehouseUnassignItems: "Ukloni dodjelu stavki",
    warehouseSelectItems: "Odaberite stavke:",
    warehouseAssignmentSuccess: "✅ Stavke su dodijeljene!",
    warehouseUnassignmentSuccess: "✅ Dodjela stavki je uklonjena!",
    warehouseNoItems: "Nema stavki u skladištu.",
    warehouseNoAssignments: "Nema dodjela.",
    warehouseLogsEmpty: "Nema logova skladišta.",
    permSectionWarehouseTitle: "Skladište",
    permSectionWarehouseNote: "Pristup i upravljanje skladištem.",
    perm_canViewWarehouse: "Pregled skladišta",
    perm_canManageWarehouse: "Upravljanje stavkama u skladištu",
    perm_canAssignWarehouseToAdmin: "Dodjela stavki adminima",
    perm_canModifyReadOnly: "Upravljanje read-only načinom",
    perm_canToggleReadOnly: "Uključi/isključi read-only",
    readOnlyModeToggled: "✅ Read-only modo je promijenjen!",
    readOnlyModeSitesUpdated: "✅ Dozvoljeni sajtovi su ažurirani!",
    readOnlyModeEnabled: "Read-only modo je UKLJUČEN",
    readOnlyModeDisabled: "Read-only modo je ISKLJUČEN",
    readOnlyAllowedSites: "Dozvoljeni sajtovi:",
  },
  en: {
    loginTitle: "CMAX SCM",
    labelEmail: "Email address:",
    labelPassword: "Password:",
    loginBtn: "Login",
    guestBtn: "👁 Continue as viewer (read-only)",
    readonlyBadge: "READ-ONLY",
    guestLoginBtn: "Login",
    labelDate: "Select date:",
    btnPrint: "Print",
    btnExport: "Export PDF",
    btnClear: "Clear table",
    btnReport: "Report lift",
    btnTidplan: "Tidplan",
    btnBins: "Waste bins",
    btnNotifications: "Notifications",
    btnSave: "Save",
    btnAdmin: "Admin Panel",
    btnLogout: "Logout",
    listWorkers: "Resources",
    listLifts: "Lifts",
    listMoments: "Moments",
    listPlans: "Plans",
    listKarnas: "Karnas/Parts",
    colWorkerName: "Name",
    colWorkerStatus: "Status",
    colLiftName: "Name",
    colLiftStatus: "Status",
    colLiftPlan: "Plan",
    colMomentName: "Name",
    colPlanName: "Name",
    colKarnaName: "Name",
    planningTitle: "Work schedule",
    thW1: "Worker 1",
    thW2: "Worker 2",
    thW3: "Worker 3",
    thPlan: "Plan",
    thKarna: "Karna",
    thM1: "Moment 1",
    thM2: "Moment 2",
    thL1: "Lift 1",
    thL2: "Lift 2",
    thL3: "Lift 3",
    thComment: "Comment",
    workerPresent: "Available",
    workerAbsent: "Unavailable",
    workerBusy: "Busy",
    liftAvailable: "Available",
    liftUnavailable: "Unavailable",
    adminModalTitle: "Admin Management",
    tabAdmins: "Admins",
    tabGuest: "Guest mode",
    tabReports: "Lift Reports",
    tabLogs: "Logs",
    tabSettings: "Settings",
    labelNewEmail: "Email address:",
    labelNewFirstName: "First name:",
    labelNewLastName: "Last name:",
    labelNewPassword: "Password:",
    labelAdminLevel: "Admin level:",
    adminLevelShort: "Lvl",
    labelPermissions: "New admin permissions:",
    labelAdminSites: "Sites access:",
    tidplanAvailableWorkers: "📊 Available workers:",
    tidplanSortBy: "Sort by:",
    tidplanApplySort: "✓ Apply sorting",
    tidplanClose: "Close",
    tidplanZoneManagerTitle: "⚙️ Zone management",
    tidplanZoneNamePlaceholder: "Zone name",
    tidplanAddZone: "➕ Add zone",
    tidplanLegendTitle: "Resource legend",
    tidplanLegendSurplus: "Blue: resource surplus",
    tidplanLegendExact: "Green: exactly enough resources",
    tidplanLegendShortage: "Red: resource shortage",
    tidplanLegendWeekend: "Gray: Weekend",
    tidplanLegendHoliday: "Light red: Holiday",
    tidplanLegendNote:
      "Hover over the bottom resource row for per-day surplus and shortage details.",
    weekendLabel: "Weekend",
    perm_canAccessPlanner: "Access planner",
    perm_canAccessTidplan: "Access Tidplan",
    perm_canAccessBins: "Access bins",
    perm_canCreateReports: "Create reports",
    perm_canManageTidplan: "Manage Tidplan",
    perm_canOpenAdminPanel: "Open admin panel",
    perm_canManageAdmins: "Manage admins",
    perm_canManageSiteAccess: "Assign sites",
    perm_canViewSettings: "View settings",
    perm_canManageGuestAccess: "Manage guest access",
    perm_canAddTidplanActivity: "Add activities",
    perm_canDeleteTidplanActivity: "Delete activities",
    perm_canManageTidplanZones: "Manage zones",
    perm_canPrintTidplan: "Print Tidplan",
    perm_canClearTidplan: "Clear Tidplan",
    perm_canEditBinsData: "Edit bins data",
    perm_canManageBinsPlans: "Manage bins plans",
    perm_canManageBinsPermissions: "Manage bins permissions",
    perm_canDeleteReports: "Delete reports",
    perm_canPrint: "Print",
    perm_canExport: "Export PDF",
    perm_canClear: "Clear table",
    perm_canManageWorkers: "Manage workers",
    perm_canManageLifts: "Manage lifts",
    perm_canManageMoments: "Manage moments",
    perm_canManagePlans: "Manage plans",
    perm_canManageKarnas: "Manage karnas",
    perm_canViewReports: "View reports",
    perm_canApproveReports: "Approve reports",
    btnAddAdmin: "Add Admin",
    adminListTitle: "Current Admins:",
    btnManage: "Add / Remove",
    managePanelTitle: "Add / Remove",
    manageCategoryLabel: "Select category:",
    mcWorkers: "Resources",
    mcLifts: "Lifts",
    mcMoments: "Moments",
    mcPlans: "Plans",
    mcKarnas: "Karnas/Parts",
    manageBack: "Back",
    manageAddBtn: "+ Add",
    manageRemoveBtn: "− Remove",
    manageRemoveHint: "Click on item to remove:",
    manageAddLabel: "Name:",
    manageConfirmAdd: "Confirm",
    manageSuccessAdd: "✅ Added successfully!",
    manageSuccessRemove: "✅ Removed successfully!",
    manageErrExists: "⚠️ An item with this name already exists!",
    manageErrEmpty: "⚠️ Name cannot be empty!",
    superAdmin: "Super Administrator",
    admin: "Administrator",
    filterAll: "All",
    filterPending: "Pending",
    filterApproved: "Approved",
    filterRejected: "Rejected",
    reportModalTitle: "Lift Report",
    labelLift: "Lift number:",
    labelPlan: "Plan:",
    labelReporter: "Your name:",
    labelComment: "Comment (optional):",
    btnSubmitReport: "Submit report",
    badgePending: "Pending",
    badgeApproved: "Approved",
    badgeRejected: "Rejected",
    badgeNew: "NEW",
    btnApprove: "Approve",
    btnReject: "Reject",
    btnSavePerms: "Save permissions",
    confirmLogout: "Are you sure you want to logout?",
    confirmLogoutTitle: "Logout",
    errEmailPassword: "Please enter email and password!",
    errWrongCredentials: "Wrong email or password!",
    errAdminEmailPassword: "Please enter email and password!",
    errAdminExists: "Admin with this email already exists!",
    errInvalidEmail: "Please enter a valid email address!",
    errAdminManageDenied: "You do not have permission to manage this admin.",
    promptRemoveAdminReason: "Enter the reason for removing this admin:",
    adminRemoveReasonRequired: "You must enter a removal reason.",
    adminRemovedMessage: "You were removed by admin",
    adminRemovedReasonLabel: "Reason:",
    adminRemovedSiteLabel: "Site:",
    adminRemoveReasonUnknown: "Not provided",
    unknownUser: "Unknown user",
    successAdminAdded: "✅ Admin added successfully!",
    successAdminRemoved: "✅ Admin removed successfully!",
    confirmRemoveAdmin: "Are you sure you want to remove admin",
    successPermsSaved: "✅ Permissions saved!",
    clearTableConfirm:
      "Are you sure you want to clear the entire table for this date? This cannot be undone!",
    clearTableSuccess: "✅ Table cleared successfully!",
    momentDuplicateError: "Moment 1 and Moment 2 cannot be the same!",
    errFillReport: "Please select lift, plan and enter your name!",
    reportSubmitSuccess: "✅ Report submitted successfully!",
    noReports: "No reports.",
    reportAdminNote: "Admin note:",
    approveConfirm: "Approve this report?",
    rejectConfirm: "Enter rejection reason (optional):",
    editPermsTitle: "Permissions for",
    btnCancel: "Cancel",
    btnOk: "OK",
    btnYes: "Yes",
    btnNo: "No",
    settingsDarkModeTitle: "Dark mode",
    darkModeOn: "Enable dark mode",
    darkModeOff: "Disable dark mode",
    settingsThemeTitle: "Page color",
    settingsThemeNote: "Click a color to apply. Change is saved.",
    confirmThemeChange: "Change page color?",
    confirmDarkMode: "Change page theme?",
    newReportNotif: "New lift report!",
    goToReports: "View reports",
    binsTitle: "Waste bins",
    thBinPlan: "Plan",
    thBinKarna: "Kärna",
    thBinTotal: "Total available",
    thBinEmpty: "Empty available",
    thBinForEmpty: "For emptying",
    thBinAdditional: "Additional required",
    thBinStatus: "Status",
    logsTitle: "Activity log",
    btnClearLogs: "Clear logs",
    btnDeleteReport: "Delete",
    confirmDeleteReport: "Are you sure you want to delete this report?",
    reportDeleted: "✅ Report deleted!",
    dataSaved: "✅ Data saved!",
    changePasswordTitle: "Change Password",
    changePasswordModalTitle: "Change Password",
    labelOldPassword: "Old password:",
    labelCurrentPassword: "Current password:",
    labelNewPassword: "New password:",
    labelConfirmPassword: "Confirm password:",
    settingsPasswordTitle: "Security",
    btnChangePassword: "🔐 Change Password",
    btnConfirmPasswordChange: "Change Password",
    passwordChanged: "✅ Password changed successfully!",
    passwordMismatch: "⚠️ New passwords do not match!",
    wrongOldPassword: "⚠️ Old password is incorrect!",
    settingsBinsTitle: "Bins table - enable column editing",
    guestAccessTitle: "Guest mode access",
    guestAccessNote: "Here you decide what a visitor can see and which commands are available.",
    btnSaveGuestAccess: "Save guest access",
    presenceActiveLabel: "Active",
    presenceViewing: "viewing",
    presenceEditing: "editing",
    settingsLayoutTitle: "Layout and display",
    settingsResetTidplanLayout: "Reset Tidplan layout",
    settingsResetTheme: "Reset page appearance",
    settingsLayoutNote: "Resets saved layout and theme to defaults without deleting data.",
    permSectionGeneralTitle: "General",
    permSectionGeneralNote: "Basic access to modules and main commands.",
    permSectionExportImportTitle: "Export/Import",
    permSectionExportImportNote: "Permissions for data export and import.",
    permSectionBackupTitle: "Backup",
    permSectionBackupNote: "Backup management.",
    permSectionTidplanTitle: "Tidplan",
    permSectionTidplanNote: "Access and all functions related to Tidplan.",
    permSectionBinsTitle: "Bins",
    permSectionBinsNote: "Access and management of the Bins module.",
    permSectionReportsTitle: "Lift reports",
    permSectionReportsNote: "Submitting, viewing and processing lift reports.",
    permSectionAdminTitle: "Admin and logs",
    permSectionAdminNote: "Admin management, logs and settings.",
    permSectionSitesTitle: "Sites",
    permSectionSitesNote: "Assign sites to admins.",
    permSectionGuestTitle: "Guest mode",
    permSectionGuestNote: "What a visitor can see and which commands can be used.",
    loadingDefault: "Loading...",
    loadingLogin: "Checking login...",
    loadingAdminPanel: "Opening admin panel...",
    loadingSiteChange: "Loading site data...",
    loadingTidplan: "Loading Tidplan...",
    accessDenied: "You do not have permission for this command.",
    accessReportsDenied: "You do not have permission for reports.",
    accessReportsViewDenied: "You do not have access to reports.",
    accessLogsViewDenied: "You do not have access to logs.",
    accessLogsClearDenied: "You do not have permission to clear logs!",
    accessBinsDenied: "You do not have access to the Bins module.",
    accessPrintDenied: "You do not have permission to print.",
    accessExportDenied: "You do not have permission to export.",
    accessTidplanDenied: "You do not have access to Tidplan.",
    accessTidplanPrintDenied: "You do not have permission to print Tidplan.",
    adminNoTabs: "This user has no available admin tabs.",
    resetTidplanLayoutSuccess: "Tidplan layout has been reset.",
    resetThemeSuccess: "Page appearance has been reset to defaults.",
    accessNotice: "You currently have no main module assigned for display.",
    bin_perm_total_label: "Total Available",
    bin_perm_empty_label: "Empty Available",
    bin_perm_forEmpty_label: "For Emptying",
    binStatusOk: "OK",
    binStatusLow: "Low",
    binStatusNotEnough: "Not enough empty",
    binStatusBring: "Bring new",
    binStatusExcess: "Excess",
    binStatusEmpty: "Empty it",
    // Tidplan translations
    tidplanTitle: "TIDPLAN",
    tidplanSiteLabel: "Current view:",
    tidplanDateLabel: "Date:",
    tidplanAddActivity: "Add activity",
    tidplanPrint: "Print Tidplan",
    tidplanBackToPlanner: "Planner",
    tidplanSort: "Sort",
    tidplanFilterPlan: "Filter Plan",
    tidplanFilterZona: "Filter Zone",
    tidplanFilterMoment: "Filter Moment",
    tidplanTablePlan: "Plan",
    tidplanTableZona: "Zone",
    tidplanTableKarna: "Karna",
    tidplanTableMoment: "Moment",
    tidplanTableResursi: "Resources",
    tidplanTableStart: "Start",
    tidplanTableEnd: "End",
    tidplanTableActions: "Actions",
    tidplanNoActivities: "No activities",
    tidplanManageZones: "Add / Remove Zones",
    tidplanSiteSelector: "Construction Site",
    tidplanAddSite: "Add",
    tidplanRemoveSite: "Remove",
    tidplanClearPlan: "🗑️ Clear plan",
    tidplanSave: "💾 Save",
    notificationsTitle: "Notifications",
    notificationComposerTitle: "New notification",
    notificationTextLabel: "Notification:",
    notificationSitesLabel: "Publish to sites:",
    notificationImagesLabel: "Images (max 2):",
    btnPublishNotification: "Publish",
    btnBackFromNotifications: "Planner",
    notificationsEmpty: "No notifications.",
    accessNotificationsDenied: "You do not have access to notifications.",
    notificationEmptyError: "Write a notification or add an image.",
    notificationSitesError: "Select at least one site.",
    notificationTooManyImages: "You can add up to 2 images.",
    notificationUploadFailed: "Image upload failed. Please try again.",
    notificationPosted: "Notification posted.",
    notificationDeleted: "Notification deleted.",
    confirmDeleteNotification: "Are you sure you want to delete this notification?",
    loadingNotifications: "Loading notifications...",
    loadingNotificationUpload: "Saving notification...",
    btnDeleteNotification: "Delete",
    permSectionNotificationsTitle: "Notifications",
    permSectionNotificationsNote: "Viewing and publishing notifications.",
    perm_canViewNotifications: "View notifications",
    perm_canManageNotifications: "Publish notifications",
    perm_canDeleteNotifications: "Delete notifications",
    notificationFilterLabel: "Site:",
    backupTabTitle: "Backup",
    backupManualBtn: "Create Backup Now",
    backupListBtn: "Refresh List",
    backupInfoBtn: "Refresh Info",
    notificationSearchLabel: "Search:",
    notificationPinnedOnlyLabel: "Pinned only",
    btnWarehouse: "Warehouse",
    warehouseTitle: "Warehouse Management",
    warehouseTabItems: "Items",
    warehouseTabAssignments: "Assignments",
    warehouseTabLogs: "Warehouse logs",
    warehouseItemName: "Item name",
    warehouseItemDescription: "Description",
    warehouseItemQuantity: "Quantity",
    warehouseItemUnit: "Unit",
    warehouseItemCategory: "Category",
    warehouseItemLocation: "Location",
    warehouseItemCreatedAt: "Created",
    warehouseItemUpdatedAt: "Updated",
    warehouseAddItem: "➕ Add item",
    warehouseEditItem: "✏️ Edit item",
    warehouseDeleteItem: "🗑️ Delete item",
    warehouseConfirmDelete: "Are you sure you want to delete this item?",
    warehouseItemAdded: "✅ Item added!",
    warehouseItemUpdated: "✅ Item updated!",
    warehouseItemDeleted: "✅ Item deleted!",
    warehouseAdminEmail: "Admin email",
    warehouseAssignItems: "Assign items",
    warehouseUnassignItems: "Remove item assignment",
    warehouseSelectItems: "Select items:",
    warehouseAssignmentSuccess: "✅ Items assigned!",
    warehouseUnassignmentSuccess: "✅ Item assignment removed!",
    warehouseNoItems: "No items in warehouse.",
    warehouseNoAssignments: "No assignments.",
    warehouseLogsEmpty: "No warehouse logs.",
    permSectionWarehouseTitle: "Warehouse",
    permSectionWarehouseNote: "Access and warehouse management.",
    perm_canViewWarehouse: "View warehouse",
    perm_canManageWarehouse: "Manage warehouse items",
    perm_canAssignWarehouseToAdmin: "Assign items to admins",
    perm_canModifyReadOnly: "Manage read-only mode",
    perm_canToggleReadOnly: "Toggle read-only",
    readOnlyModeToggled: "✅ Read-only mode changed!",
    readOnlyModeSitesUpdated: "✅ Allowed sites updated!",
    readOnlyModeEnabled: "Read-only mode ENABLED",
    readOnlyModeDisabled: "Read-only mode DISABLED",
    readOnlyAllowedSites: "Allowed sites:",
    // Export/Import
    export: "Export",
    import: "Import",
    exportExcel: "Export Excel",
    exportPdf: "Export PDF",
    exportWord: "Export Word",
  },
  sv: {
    loginTitle: "CMAX SCM",
    labelEmail: "E-postadress:",
    labelPassword: "Lösenord:",
    loginBtn: "Logga in",
    guestBtn: "👁 Fortsätt som åskådare (skrivskyddad)",
    readonlyBadge: "SKRIVSKYDDAT",
    guestLoginBtn: "Logga in",
    labelDate: "Välj datum:",
    btnPrint: "Skriv ut",
    btnExport: "Exportera PDF",
    btnClear: "Rensa tabell",
    btnReport: "Rapportera hiss",
    btnTidplan: "Tidplan",
    btnBins: "Soptunnor",
    btnNotifications: "Notiser",
    btnSave: "Spara",
    btnAdmin: "Adminpanel",
    btnLogout: "Logga ut",
    listWorkers: "Resurser",
    listLifts: "Hissar",
    listMoments: "Moment",
    listPlans: "Planer",
    listKarnas: "Karnar/Delar",
    colWorkerName: "Namn",
    colWorkerStatus: "Status",
    colLiftName: "Namn",
    colLiftStatus: "Status",
    colLiftPlan: "Plan",
    colMomentName: "Namn",
    colPlanName: "Namn",
    colKarnaName: "Namn",
    planningTitle: "Arbetsschema",
    thW1: "Arbetare 1",
    thW2: "Arbetare 2",
    thW3: "Arbetare 3",
    thPlan: "Plan",
    thKarna: "Karna",
    thM1: "Moment 1",
    thM2: "Moment 2",
    thL1: "Hiss 1",
    thL2: "Hiss 2",
    thL3: "Hiss 3",
    thComment: "Kommentar",
    workerPresent: "Närvarande",
    workerAbsent: "Frånvarande",
    workerBusy: "Upptagen",
    liftAvailable: "Tillgänglig",
    liftUnavailable: "Otillgänglig",
    adminModalTitle: "Admin-hantering",
    tabAdmins: "Admins",
    tabGuest: "Gastläge",
    tabReports: "Hissrapporter",
    tabLogs: "Loggar",
    tabSettings: "Inställningar",
    labelNewEmail: "E-postadress:",
    labelNewFirstName: "Förnamn:",
    labelNewLastName: "Efternamn:",
    labelNewPassword: "Lösenord:",
    labelAdminLevel: "Adminnivå:",
    adminLevelShort: "Lvl",
    labelPermissions: "Behörigheter för ny admin:",
    labelAdminSites: "Byggarbetsplatser (åtkomst):",
    tidplanAvailableWorkers: "📊 Tillgängliga arbetare:",
    tidplanSortBy: "Sortera efter:",
    tidplanApplySort: "✓ Verkställ sortering",
    tidplanClose: "Stäng",
    tidplanZoneManagerTitle: "⚙️ Zonhantering",
    tidplanZoneNamePlaceholder: "Zonnamn",
    tidplanAddZone: "➕ Lägg till zon",
    tidplanLegendTitle: "Resurslegend",
    tidplanLegendSurplus: "Blå: överskott av resurser",
    tidplanLegendExact: "Grön: exakt tillräckligt med resurser",
    tidplanLegendShortage: "Röd: resursbrist",
    tidplanLegendWeekend: "Grå: Helg",
    tidplanLegendHoliday: "Ljus röd: Helgdag",
    tidplanLegendNote:
      "Hovra över den nedersta resursraden för dagsdetaljer om överskott och brist.",
    weekendLabel: "Helg",
    perm_canAccessPlanner: "Åtkomst till planner",
    perm_canAccessTidplan: "Åtkomst till Tidplan",
    perm_canAccessBins: "Åtkomst till Bins-modulen",
    perm_canCreateReports: "Skicka rapporter",
    perm_canManageTidplan: "Hantera Tidplan",
    perm_canOpenAdminPanel: "Öppna adminpanelen",
    perm_canManageAdmins: "Hantera adminer",
    perm_canManageSiteAccess: "Tilldela arbetsplatser",
    perm_canViewSettings: "Visa inställningar",
    perm_canManageGuestAccess: "Hantera guest access",
    perm_canAddTidplanActivity: "Lägg till aktiviteter",
    perm_canDeleteTidplanActivity: "Ta bort aktiviteter",
    perm_canManageTidplanZones: "Hantera zoner",
    perm_canPrintTidplan: "Skriv ut Tidplan",
    perm_canClearTidplan: "Rensa Tidplan",
    perm_canEditBinsData: "Redigera Bins-data",
    perm_canManageBinsPlans: "Lägg till/ta bort Bins-planer",
    perm_canManageBinsPermissions: "Bins-inställningar och behörigheter",
    perm_canDeleteReports: "Ta bort rapporter",
    perm_canPrint: "Skriva ut",
    perm_canExport: "Exportera PDF",
    perm_canClear: "Rensa tabell",
    perm_canManageWorkers: "Hantera arbetare",
    perm_canManageLifts: "Hantera hissar",
    perm_canManageMoments: "Hantera moment",
    perm_canManagePlans: "Hantera planer",
    perm_canManageKarnas: "Hantera karnar",
    perm_canViewReports: "Visa rapporter",
    perm_canApproveReports: "Godkänna rapporter",
    btnAddAdmin: "Lägg till admin",
    adminListTitle: "Nuvarande admins:",
    btnManage: "Lägg till / Ta bort",
    managePanelTitle: "Lägg till / Ta bort",
    manageCategoryLabel: "Välj kategori:",
    mcWorkers: "Resurser",
    mcLifts: "Hissar",
    mcMoments: "Moment",
    mcPlans: "Planer",
    mcKarnas: "Karnar/Delar",
    manageBack: "Tillbaka",
    manageAddBtn: "+ Lägg till",
    manageRemoveBtn: "− Ta bort",
    manageRemoveHint: "Klicka på en post för att ta bort:",
    manageAddLabel: "Namn:",
    manageConfirmAdd: "Bekräfta",
    manageSuccessAdd: "✅ Tillagd!",
    manageSuccessRemove: "✅ Borttagen!",
    manageErrExists: "⚠️ En post med detta namn finns redan!",
    manageErrEmpty: "⚠️ Namn kan inte vara tomt!",
    superAdmin: "Superadministratör",
    admin: "Administratör",
    filterAll: "Alla",
    filterPending: "Väntande",
    filterApproved: "Godkända",
    filterRejected: "Avvisade",
    reportModalTitle: "Hissrapport",
    labelLift: "Hissnummer:",
    labelPlan: "Plan:",
    labelReporter: "Ditt namn:",
    labelComment: "Kommentar (valfritt):",
    btnSubmitReport: "Skicka rapport",
    badgePending: "Väntande",
    badgeApproved: "Godkänd",
    badgeRejected: "Avvisad",
    badgeNew: "NY",
    btnApprove: "Godkänn",
    btnReject: "Avvisa",
    btnSavePerms: "Spara behörigheter",
    confirmLogout: "Är du säker på att du vill logga ut?",
    confirmLogoutTitle: "Logga ut",
    errEmailPassword: "Ange e-post och lösenord!",
    errWrongCredentials: "Fel e-post eller lösenord!",
    errAdminEmailPassword: "Ange e-post och lösenord!",
    errAdminExists: "Admin med denna e-post finns redan!",
    errInvalidEmail: "Ange en giltig e-postadress!",
    errAdminManageDenied: "Du har inte behörighet att hantera denna admin.",
    promptRemoveAdminReason: "Ange orsak till borttagning av admin:",
    adminRemoveReasonRequired: "Du måste ange en orsak.",
    adminRemovedMessage: "Du togs bort av admin",
    adminRemovedReasonLabel: "Orsak:",
    adminRemovedSiteLabel: "Byggarbetsplats:",
    adminRemoveReasonUnknown: "Inte angiven",
    unknownUser: "Okänd användare",
    successAdminAdded: "✅ Admin tillagd!",
    successAdminRemoved: "✅ Admin borttagen!",
    confirmRemoveAdmin: "Är du säker på att du vill ta bort admin",
    successPermsSaved: "✅ Behörigheter sparade!",
    clearTableConfirm:
      "Är du säker på att du vill rensa hela tabellen för detta datum? Detta kan inte ångras!",
    clearTableSuccess: "✅ Tabellen rensad!",
    momentDuplicateError: "Moment 1 och Moment 2 får inte vara samma!",
    errFillReport: "Välj hiss, plan och ange ditt namn!",
    reportSubmitSuccess: "✅ Rapport skickad!",
    noReports: "Inga rapporter.",
    reportAdminNote: "Admins notering:",
    approveConfirm: "Godkänn denna rapport?",
    rejectConfirm: "Ange anledning till avvisning (valfritt):",
    editPermsTitle: "Behörigheter för",
    btnCancel: "Avbryt",
    btnOk: "OK",
    btnYes: "Ja",
    btnNo: "Nej",
    settingsDarkModeTitle: "Mörkt läge",
    darkModeOn: "Aktivera mörkt läge",
    darkModeOff: "Inaktivera mörkt läge",
    settingsThemeTitle: "Sidfärg",
    settingsThemeNote:
      "Klicka på en färg för att tillämpa. Ändringen sparas.",
    confirmThemeChange: "Ändra sidfärg?",
    confirmDarkMode: "Ändra sidtema?",
    newReportNotif: "Ny hissrapport!",
    goToReports: "Visa rapporter",
    binsTitle: "Soptunnor",
    thBinPlan: "Plan",
    thBinKarna: "Karna",
    thBinTotal: "Total available",
    thBinEmpty: "Empty available",
    thBinForEmpty: "For emptying",
    thBinAdditional: "Additional required",
    thBinStatus: "Status",
    logsTitle: "Aktivitetslogg",
    btnClearLogs: "Rensa loggar",
    btnDeleteReport: "Radera",
    confirmDeleteReport:
      "Är du säker på att du vill radera denna rapport?",
    reportDeleted: "✅ Rapport raderad!",
    dataSaved: "✅ Data sparad!",
    changePasswordTitle: "Ändra lösenord",
    changePasswordModalTitle: "Ändra lösenord",
    labelOldPassword: "Gammalt lösenord:",
    labelCurrentPassword: "Nuvarande lösenord:",
    labelNewPassword: "Nytt lösenord:",
    labelConfirmPassword: "Bekräfta lösenord:",
    settingsPasswordTitle: "Säkerhet",
    btnChangePassword: "🔐 Ändra lösenord",
    btnConfirmPasswordChange: "Ändra lösenord",
    passwordChanged: "✅ Lösenordet har ändrats!",
    passwordMismatch: "⚠️ Nya lösenord matchar inte!",
    wrongOldPassword: "⚠️ Gamla lösenordet är felaktigt!",
    settingsBinsTitle: "Bins tabell - aktivera kolumnredigering",
    guestAccessTitle: "Gastläge åtkomst",
    guestAccessNote: "Här bestämmer du vad besökaren kan se och vilka kommandon som är tillgängliga.",
    btnSaveGuestAccess: "Spara guest åtkomst",
    presenceActiveLabel: "Aktiva",
    presenceViewing: "visar",
    presenceEditing: "redigerar",
    settingsLayoutTitle: "Layout och visning",
    settingsResetTidplanLayout: "Återställ Tidplan-layout",
    settingsResetTheme: "Återställ sidans utseende",
    settingsLayoutNote: "Återställer sparad layout och tema till standard utan att radera data.",
    permSectionGeneralTitle: "Allmänt",
    permSectionGeneralNote: "Grundläggande åtkomst till moduler och huvudkommandon.",
    permSectionExportImportTitle: "Exportera/Importera",
    permSectionExportImportNote: "Behörigheter för dataexport och import.",
    permSectionBackupTitle: "Backup",
    permSectionBackupNote: "Säkerhetskopieringshantering.",
    permSectionTidplanTitle: "Tidplan",
    permSectionTidplanNote: "Åtkomst och alla funktioner som hör till Tidplan.",
    permSectionBinsTitle: "Bins",
    permSectionBinsNote: "Åtkomst till och hantering av Bins-modulen.",
    permSectionReportsTitle: "Hissrapporter",
    permSectionReportsNote: "Skicka, visa och hantera hissrapporter.",
    permSectionAdminTitle: "Admin och loggar",
    permSectionAdminNote: "Adminhantering, loggar och inställningar.",
    permSectionSitesTitle: "Byggarbetsplatser",
    permSectionSitesNote: "Tilldela arbetsplatser till adminer.",
    permSectionGuestTitle: "Gastläge",
    permSectionGuestNote: "Vad en besökare kan se och vilka kommandon som kan användas.",
    loadingDefault: "Laddar...",
    loadingLogin: "Kontrollerar inloggning...",
    loadingAdminPanel: "Öppnar adminpanelen...",
    loadingSiteChange: "Laddar arbetsplatsdata...",
    loadingTidplan: "Laddar Tidplan...",
    accessDenied: "Du har inte behörighet för detta kommando.",
    accessReportsDenied: "Du har inte behörighet för rapporter.",
    accessReportsViewDenied: "Du har inte åtkomst till rapporter.",
    accessLogsViewDenied: "Du har inte åtkomst till loggar.",
    accessLogsClearDenied: "Du har inte behörighet att rensa loggar!",
    accessBinsDenied: "Du har inte åtkomst till Bins-modulen.",
    accessPrintDenied: "Du har inte behörighet att skriva ut.",
    accessExportDenied: "Du har inte behörighet att exportera.",
    accessTidplanDenied: "Du har inte åtkomst till Tidplan.",
    accessTidplanPrintDenied: "Du har inte behörighet att skriva ut Tidplan.",
    adminNoTabs: "Den här användaren har inga tillgängliga adminflikar.",
    resetTidplanLayoutSuccess: "Tidplan-layouten har återställts.",
    resetThemeSuccess: "Sidans utseende har återställts till standard.",
    accessNotice: "Du har för närvarande ingen huvudmodul tilldelad för visning.",
    bin_perm_total_label: "Total Available",
    bin_perm_empty_label: "Empty Available",
    bin_perm_forEmpty_label: "For Emptying",
    binStatusOk: "OK",
    binStatusLow: "Low",
    binStatusNotEnough: "Not enough empty",
    binStatusBring: "Bring new",
    binStatusExcess: "Excess",
    binStatusEmpty: "Empty it",
    tidplanTitle: "Tidplan",
    tidplanSiteLabel: "Aktuell vy:",
    tidplanDateLabel: "Datum:",
    tidplanAddActivity: "Lägg till aktivitet",
    tidplanPrint: "Skriv ut Tidplan",
    tidplanBackToPlanner: "Planerare",
    tidplanSort: "Sortera",
    tidplanFilterPlan: "Filter Plan",
    tidplanFilterZona: "Filter Zon",
    tidplanFilterMoment: "Filter Moment",
    tidplanTablePlan: "Plan",
    tidplanTableZona: "Zon",
    tidplanTableKarna: "Karna",
    tidplanTableMoment: "Moment",
    tidplanTableResursi: "Resurser",
    tidplanTableStart: "Start",
    tidplanTableEnd: "Slut",
    tidplanTableActions: "Åtgärder",
    tidplanNoActivities: "Inga aktiviteter",
    tidplanManageZones: "Lägg till / Ta bort zoner",
    tidplanSiteSelector: "Byggarbetsplats",
    tidplanAddSite: "Lägg till",
    tidplanRemoveSite: "Ta bort",
    tidplanClearPlan: "🗑️ Rensa plan",
    tidplanSave: "💾 Spara",
    notificationsTitle: "Notiser",
    notificationComposerTitle: "Ny notis",
    notificationTextLabel: "Notis:",
    notificationSitesLabel: "Publicera på arbetsplatser:",
    notificationImagesLabel: "Bilder (max 2):",
    btnPublishNotification: "Publicera",
    btnBackFromNotifications: "Planerare",
    notificationsEmpty: "Inga notiser.",
    accessNotificationsDenied: "Du har inte åtkomst till notiser.",
    notificationEmptyError: "Skriv en notis eller lägg till en bild.",
    notificationSitesError: "Välj minst en arbetsplats.",
    notificationTooManyImages: "Du kan lägga till högst 2 bilder.",
    notificationUploadFailed: "Bilduppladdningen misslyckades. Försök igen.",
    notificationPosted: "Notisen är publicerad.",
    notificationDeleted: "Notisen är borttagen.",
    confirmDeleteNotification: "Är du säker på att du vill ta bort notisen?",
    loadingNotifications: "Laddar notiser...",
    loadingNotificationUpload: "Sparar notis...",
    btnDeleteNotification: "Ta bort",
    permSectionNotificationsTitle: "Notiser",
    permSectionNotificationsNote: "Visa och publicera notiser.",
    perm_canViewNotifications: "Visa notiser",
    perm_canManageNotifications: "Publicera notiser",
    perm_canDeleteNotifications: "Ta bort notiser",
    notificationFilterLabel: "Byggarbetsplats:",
    backupTabTitle: "Säkerhetskopiering",
    backupManualBtn: "Skapa säkerhetskopia nu",
    backupListBtn: "Uppdatera lista",
    backupInfoBtn: "Uppdatera info",
    notificationSearchLabel: "Sök:",
    notificationPinnedOnlyLabel: "Endast pinned",
  },
};

Object.assign(TRANSLATIONS.hr, {
  perm_canAccessWarehouse: "Pristup skladištu",
  perm_canManageWarehouse: "Uređivanje skladišta",
  perm_canViewWarehouseLogs: "Pregled logova skladišta",
  perm_canViewWarehouseAnalytics: "Pregled warehouse grafova",
  guestWarehouseScopeTitle: "Read-only pristup skladištu",
  guestWarehouseScopeNote:
    "Read-only korisnik vidi skladište tek kada mu omogućiš modul i odobriš stavke za trenutno gradilište.",
  guestWarehouseItemsTitle: "Dozvoljene stavke za read-only",
  guestWarehouseItemsNote: "Ove stavke vrijede za trenutno odabrano gradilište.",
  guestWarehouseNoItems: "Nema stavki u skladištu za ovo gradilište.",
  warehouseIssueTitle: "Izdavanje radnicima",
    warehouseExportExcel: "Export Excel",
    warehouseImportExcel: "Import Excel",
    tidplanExportPdf: "Export PDF",
    tidplanImportPdf: "Import PDF",
    plannerImportExcel: "Import Excel",
    backupManual: "Kreiraj Backup",
  warehouseIssueSubtitle: "8 stupaca za alat ili materijal",
  warehouseIssueColWorker: "Ime i prezime",
  warehouseIssueColComment: "Komentar",
  warehouseIssueColSave: "Spremi",
  warehouseStockTitle: "Ulaz / izlaz robe",
  warehouseStockSubtitle: "Sve ide u logove",
  warehouseStockItemLabel: "Alat / materijal",
  warehouseStockDirectionLabel: "Radnja",
  warehouseStockDirectionIn: "Dodaj",
  warehouseStockDirectionOut: "Oduzmi",
  warehouseStockQuantityLabel: "Količina",
  warehouseStockCommentLabel: "Komentar",
  warehouseStockCommentPlaceholder: "Upiši komentar...",
  warehouseAlertsTitle: "Upozorenja",
  warehouseAlertsSubtitle: "Materijal koji fali ili uskoro nestaje",
  warehouseInventoryTitle: "Stanje skladišta",
  warehouseInventorySubtitle: "Trenutno, ukupno izdano i ukupno zaprimljeno",
  warehouseInventoryColItem: "Alat / materijal",
  warehouseInventoryColUnit: "Jedinica",
  warehouseInventoryColCurrent: "Trenutno",
  warehouseInventoryColIssued: "Ukupno dano",
  warehouseInventoryColReceived: "Ukupno došlo",
  warehouseInventoryColMinimum: "Min. limit",
  warehouseInventoryColNotify: "Obavijesti osobu",
  warehouseCatalogTitle: "Popis alata / materijala",
  warehouseCatalogAdd: "Dodaj",
  warehouseLogsTitle: "Logovi skladišta",
  warehouseLogFiltersTitle: "Filteri logova",
  warehouseLogFiltersSubtitle: "Postavi filtere i klikni Sortiraj za primjenu.",
  warehouseLogDateLabel: "Datum",
  warehouseLogWorkerLabel: "Radnik",
  warehouseLogItemLabel: "Materijal",
  warehouseLogTypeLabel: "Tip",
  warehouseLogTypeIssue: "Izdavanje",
  warehouseLogTypeStock: "Stanje",
  warehouseLogTypeAdjustment: "Ručno",
  warehouseLogFlowLabel: "Smjer",
  warehouseLogFlowIn: "Ulaz",
  warehouseLogFlowOut: "Izlaz",
  warehouseLogSortLabel: "Sortiraj po",
  warehouseLogSortTimestamp: "Datumu",
  warehouseLogSortItem: "Materijalu",
  warehouseLogSortWorker: "Radniku",
  warehouseLogSortType: "Vrsti",
  warehouseLogSortQuantity: "Količini",
  warehouseLogSortBalance: "Stanju nakon",
  warehouseLogDirectionLabel: "Smjer",
  warehouseLogDirectionDesc: "Silazno",
  warehouseLogDirectionAsc: "Uzlazno",
  warehouseApplyLogFilters: "Sortiraj",
  warehouseResetLogFilters: "Reset filtera",
  warehouseLogsColDate: "Datum",
  warehouseLogsColType: "Tip",
  warehouseLogsColWorker: "Radnik",
  warehouseLogsColItem: "Materijal",
  warehouseLogsColQuantity: "Količina",
  warehouseLogsColFlow: "Smjer",
  warehouseLogsColComment: "Komentar",
  warehouseLogsColBalance: "Stanje nakon",
  warehouseLogsColAuthor: "Upisao",
  warehouseGraphTitle: "Graf skladišta",
  warehouseGraphNav: "Graf",
  warehouseGraphWorkersTitle: "Tko odskače po materijalu",
  warehouseGraphItemsTitle: "Najtraženiji materijali",
  warehouseGraphInsightTitle: "Izdvajanje iz prosjeka po alatu / materijalu",
  warehouseNoAssignedAdmin: "nema dodijeljenog admina",
  warehouseCatalogMeta: "Stanje {current} | min {minimum} | obavijesti {admins}",
  warehouseAlertsEmpty: "Trenutno nema upozorenja za skladište.",
  warehouseAlertMessage: "{name} je na {current} {unit} i pao je ispod limita {minimum}.",
  warehouseAlertNotify: "Obavijest: {admins}",
  warehouseLimitPrompt: "Minimalna količina za upozorenje:",
  warehouseRemoveItem: "Ukloni",
  warehouseThreshold: "Prag",
  warehouseSave: "Spremi",
  warehouseNoVisibleItems: "Nema odobrenih stavki za prikaz u skladištu.",
  warehouseNoVisibleLogs: "Nema odobrenih logova za prikaz.",
  warehouseNoVisibleGraph: "Nema dovoljno odobrenih logova za graf.",
  warehouseAccessDenied: "Nemate pristup skladištu.",
  warehouseLogsAccessDenied: "Nemate pristup logovima skladišta.",
  warehouseGraphAccessDenied: "Nemate pristup grafovima skladišta.",
  warehouseDeleteLogConfirm: "Jeste li sigurni da želite obrisati ovaj log?",
  warehouseDeleteLogSuccess: "Log je obrisan.",
  warehouseNoLogsToDelete: "Nema logova za brisanje.",
  warehouseDeleteAllLogsConfirm: "Jeste li sigurni da želite obrisati sve logove skladišta?",
  warehouseDeleteAllLogsSuccess: "Svi logovi skladišta su obrisani.",
  warehouseInsufficientStock: "Nema dovoljno zalihe za {name}.",
  warehouseSelectWorker: "Odaberi radnika.",
  warehouseSelectAtLeastOneItem: "Odaberi barem jedan alat ili materijal.",
  warehouseIssueSaved: "Izdavanje je spremljeno u logove.",
  warehouseStockSaved: "Promjena stanja je spremljena.",
  warehouseNewItemPrompt: "Naziv novog alata ili materijala:",
  warehouseDuplicateItem: "Taj alat ili materijal već postoji.",
  warehouseUnitPrompt: "Jedinica mjere:",
  warehouseRemoveItemConfirm: "Ukloniti {name} iz padajućeg izbornika?",
  warehouseUnknown: "Nepoznato",
});

Object.assign(TRANSLATIONS.en, {
  perm_canAccessWarehouse: "Access warehouse",
  perm_canManageWarehouse: "Manage warehouse",
  perm_canViewWarehouseLogs: "View warehouse logs",
  perm_canViewWarehouseAnalytics: "View warehouse analytics",
  guestWarehouseScopeTitle: "Read-only warehouse access",
  guestWarehouseScopeNote:
    "A read-only user can see the warehouse only after you enable the module and approve items for the current site.",
  guestWarehouseItemsTitle: "Allowed read-only items",
  guestWarehouseItemsNote: "These items apply to the currently selected site.",
  guestWarehouseNoItems: "No warehouse items exist for this site.",
  warehouseIssueTitle: "Issue to workers",
    warehouseExportExcel: "Export Excel",
    warehouseImportExcel: "Import Excel",
    tidplanExportPdf: "Export PDF",
    tidplanImportPdf: "Import PDF",
    plannerImportExcel: "Import Excel",
    backupManual: "Create Backup",
  warehouseIssueSubtitle: "8 columns for tools or materials",
  warehouseIssueColWorker: "Full name",
  warehouseIssueColComment: "Comment",
  warehouseIssueColSave: "Save",
  warehouseStockTitle: "Incoming / outgoing stock",
  warehouseStockSubtitle: "Everything goes to the logs",
  warehouseStockItemLabel: "Tool / material",
  warehouseStockDirectionLabel: "Action",
  warehouseStockDirectionIn: "Add",
  warehouseStockDirectionOut: "Subtract",
  warehouseStockQuantityLabel: "Quantity",
  warehouseStockCommentLabel: "Comment",
  warehouseStockCommentPlaceholder: "Enter a comment...",
  warehouseAlertsTitle: "Alerts",
  warehouseAlertsSubtitle: "Material that is missing or running low",
  warehouseInventoryTitle: "Warehouse stock",
  warehouseInventorySubtitle: "Current, total issued and total received",
  warehouseInventoryColItem: "Tool / material",
  warehouseInventoryColUnit: "Unit",
  warehouseInventoryColCurrent: "Current",
  warehouseInventoryColIssued: "Total issued",
  warehouseInventoryColReceived: "Total received",
  warehouseInventoryColMinimum: "Min. limit",
  warehouseInventoryColNotify: "Notify person",
  warehouseCatalogTitle: "Tool / material list",
  warehouseCatalogAdd: "Add",
  warehouseLogsTitle: "Warehouse logs",
  warehouseLogFiltersTitle: "Log filters",
  warehouseLogFiltersSubtitle: "Set your filters and click Sort to apply them.",
  warehouseLogDateLabel: "Date",
  warehouseLogWorkerLabel: "Worker",
  warehouseLogItemLabel: "Material",
  warehouseLogTypeLabel: "Type",
  warehouseLogTypeIssue: "Issue",
  warehouseLogTypeStock: "Stock",
  warehouseLogTypeAdjustment: "Manual",
  warehouseLogFlowLabel: "Flow",
  warehouseLogFlowIn: "In",
  warehouseLogFlowOut: "Out",
  warehouseLogSortLabel: "Sort by",
  warehouseLogSortTimestamp: "Date",
  warehouseLogSortItem: "Material",
  warehouseLogSortWorker: "Worker",
  warehouseLogSortType: "Type",
  warehouseLogSortQuantity: "Quantity",
  warehouseLogSortBalance: "Balance after",
  warehouseLogDirectionLabel: "Direction",
  warehouseLogDirectionDesc: "Descending",
  warehouseLogDirectionAsc: "Ascending",
  warehouseApplyLogFilters: "Sort",
  warehouseResetLogFilters: "Reset filters",
  warehouseLogsColDate: "Date",
  warehouseLogsColType: "Type",
  warehouseLogsColWorker: "Worker",
  warehouseLogsColItem: "Material",
  warehouseLogsColQuantity: "Quantity",
  warehouseLogsColFlow: "Flow",
  warehouseLogsColComment: "Comment",
  warehouseLogsColBalance: "Balance after",
  warehouseLogsColAuthor: "Created by",
  warehouseGraphTitle: "Warehouse graph",
  warehouseGraphNav: "Graph",
  warehouseGraphWorkersTitle: "Who stands out by material",
  warehouseGraphItemsTitle: "Most requested materials",
  warehouseGraphInsightTitle: "Deviation from average by tool / material",
  warehouseNoAssignedAdmin: "no assigned admin",
  warehouseCatalogMeta: "Stock {current} | min {minimum} | alerts {admins}",
  warehouseAlertsEmpty: "There are currently no warehouse alerts.",
  warehouseAlertMessage: "{name} is at {current} {unit} and dropped below the limit of {minimum}.",
  warehouseAlertNotify: "Alert: {admins}",
  warehouseLimitPrompt: "Minimum quantity for alert:",
  warehouseRemoveItem: "Remove",
  warehouseThreshold: "Threshold",
  warehouseSave: "Save",
  warehouseNoVisibleItems: "No approved items are available for display.",
  warehouseNoVisibleLogs: "No approved logs are available for display.",
  warehouseNoVisibleGraph: "There are not enough approved logs for the graph.",
  warehouseAccessDenied: "You do not have access to the warehouse.",
  warehouseLogsAccessDenied: "You do not have access to warehouse logs.",
  warehouseGraphAccessDenied: "You do not have access to warehouse graphs.",
  warehouseDeleteLogConfirm: "Are you sure you want to delete this log?",
  warehouseDeleteLogSuccess: "The log has been deleted.",
  warehouseNoLogsToDelete: "There are no logs to delete.",
  warehouseDeleteAllLogsConfirm: "Are you sure you want to delete all warehouse logs?",
  warehouseDeleteAllLogsSuccess: "All warehouse logs have been deleted.",
  warehouseInsufficientStock: "There is not enough stock for {name}.",
  warehouseSelectWorker: "Select a worker.",
  warehouseSelectAtLeastOneItem: "Select at least one tool or material.",
  warehouseIssueSaved: "The issue has been saved to the logs.",
  warehouseStockSaved: "The stock change has been saved.",
  warehouseNewItemPrompt: "Name of the new tool or material:",
  warehouseDuplicateItem: "That tool or material already exists.",
  warehouseUnitPrompt: "Unit of measure:",
  warehouseRemoveItemConfirm: "Remove {name} from the dropdown list?",
  warehouseUnknown: "Unknown",
});

Object.assign(TRANSLATIONS.sv, {
  perm_canAccessWarehouse: "Åtkomst till lager",
  perm_canManageWarehouse: "Hantera lager",
  perm_canViewWarehouseLogs: "Visa lagerloggar",
  perm_canViewWarehouseAnalytics: "Visa lageranalys",
  guestWarehouseScopeTitle: "Skrivskyddad lageråtkomst",
  guestWarehouseScopeNote:
    "En skrivskyddad användare ser lagret först när du aktiverar modulen och godkänner artiklar för den aktuella arbetsplatsen.",
  guestWarehouseItemsTitle: "Tillåtna artiklar för skrivskyddad användare",
  guestWarehouseItemsNote: "Dessa artiklar gäller för den valda arbetsplatsen.",
  guestWarehouseNoItems: "Det finns inga lagerartiklar för den här arbetsplatsen.",
  warehouseIssueTitle: "Utlämning till arbetare",
    warehouseExportExcel: "Exportera Excel",
    warehouseImportExcel: "Importera Excel",
    tidplanExportPdf: "Exportera PDF",
    tidplanImportPdf: "Importera PDF",
    plannerImportExcel: "Importera Excel",
    backupManual: "Skapa säkerhetskopia",
  warehouseIssueSubtitle: "8 kolumner för verktyg eller material",
  warehouseIssueColWorker: "För- och efternamn",
  warehouseIssueColComment: "Kommentar",
  warehouseIssueColSave: "Spara",
  warehouseStockTitle: "In / ut av varor",
  warehouseStockSubtitle: "Allt går till loggarna",
  warehouseStockItemLabel: "Verktyg / material",
  warehouseStockDirectionLabel: "Åtgärd",
  warehouseStockDirectionIn: "Lägg till",
  warehouseStockDirectionOut: "Dra av",
  warehouseStockQuantityLabel: "Antal",
  warehouseStockCommentLabel: "Kommentar",
  warehouseStockCommentPlaceholder: "Skriv en kommentar...",
  warehouseAlertsTitle: "Varningar",
  warehouseAlertsSubtitle: "Material som saknas eller snart tar slut",
  warehouseInventoryTitle: "Lagersaldo",
  warehouseInventorySubtitle: "Nuvarande, totalt utlämnat och totalt mottaget",
  warehouseInventoryColItem: "Verktyg / material",
  warehouseInventoryColUnit: "Enhet",
  warehouseInventoryColCurrent: "Nuvarande",
  warehouseInventoryColIssued: "Totalt utlämnat",
  warehouseInventoryColReceived: "Totalt mottaget",
  warehouseInventoryColMinimum: "Min. gräns",
  warehouseInventoryColNotify: "Meddela person",
  warehouseCatalogTitle: "Lista över verktyg / material",
  warehouseCatalogAdd: "Lägg till",
  warehouseLogsTitle: "Lagerloggar",
  warehouseLogFiltersTitle: "Loggfilter",
  warehouseLogFiltersSubtitle: "Ställ in filter och klicka på Sortera för att tillämpa dem.",
  warehouseLogDateLabel: "Datum",
  warehouseLogWorkerLabel: "Arbetare",
  warehouseLogItemLabel: "Material",
  warehouseLogTypeLabel: "Typ",
  warehouseLogTypeIssue: "Utlämning",
  warehouseLogTypeStock: "Lager",
  warehouseLogTypeAdjustment: "Manuell",
  warehouseLogFlowLabel: "Flöde",
  warehouseLogFlowIn: "In",
  warehouseLogFlowOut: "Ut",
  warehouseLogSortLabel: "Sortera efter",
  warehouseLogSortTimestamp: "Datum",
  warehouseLogSortItem: "Material",
  warehouseLogSortWorker: "Arbetare",
  warehouseLogSortType: "Typ",
  warehouseLogSortQuantity: "Antal",
  warehouseLogSortBalance: "Saldo efter",
  warehouseLogDirectionLabel: "Riktning",
  warehouseLogDirectionDesc: "Fallande",
  warehouseLogDirectionAsc: "Stigande",
  warehouseApplyLogFilters: "Sortera",
  warehouseResetLogFilters: "Återställ filter",
  warehouseLogsColDate: "Datum",
  warehouseLogsColType: "Typ",
  warehouseLogsColWorker: "Arbetare",
  warehouseLogsColItem: "Material",
  warehouseLogsColQuantity: "Antal",
  warehouseLogsColFlow: "Flöde",
  warehouseLogsColComment: "Kommentar",
  warehouseLogsColBalance: "Saldo efter",
  warehouseLogsColAuthor: "Registrerad av",
  warehouseGraphTitle: "Lagergraf",
  warehouseGraphNav: "Graf",
  warehouseGraphWorkersTitle: "Vem sticker ut per material",
  warehouseGraphItemsTitle: "Mest efterfrågade material",
  warehouseGraphInsightTitle: "Avvikelse från genomsnitt per verktyg / material",
  warehouseNoAssignedAdmin: "ingen tilldelad admin",
  warehouseCatalogMeta: "Saldo {current} | min {minimum} | varningar {admins}",
  warehouseAlertsEmpty: "Det finns för närvarande inga lagervarningar.",
  warehouseAlertMessage: "{name} är på {current} {unit} och har fallit under gränsen {minimum}.",
  warehouseAlertNotify: "Varning: {admins}",
  warehouseLimitPrompt: "Minsta antal för varning:",
  warehouseRemoveItem: "Ta bort",
  warehouseThreshold: "Gräns",
  warehouseSave: "Spara",
  warehouseNoVisibleItems: "Det finns inga godkända artiklar att visa.",
  warehouseNoVisibleLogs: "Det finns inga godkända loggar att visa.",
  warehouseNoVisibleGraph: "Det finns inte tillräckligt med godkända loggar för grafen.",
  warehouseAccessDenied: "Du har inte åtkomst till lagret.",
  warehouseLogsAccessDenied: "Du har inte åtkomst till lagerloggar.",
  warehouseGraphAccessDenied: "Du har inte åtkomst till lagergrafer.",
  warehouseDeleteLogConfirm: "Är du säker på att du vill ta bort den här loggen?",
  warehouseDeleteLogSuccess: "Loggen har tagits bort.",
  warehouseNoLogsToDelete: "Det finns inga loggar att ta bort.",
  warehouseDeleteAllLogsConfirm: "Är du säker på att du vill ta bort alla lagerloggar?",
  warehouseDeleteAllLogsSuccess: "Alla lagerloggar har tagits bort.",
  warehouseInsufficientStock: "Det finns inte tillräckligt med lager för {name}.",
  warehouseSelectWorker: "Välj en arbetare.",
  warehouseSelectAtLeastOneItem: "Välj minst ett verktyg eller material.",
  warehouseIssueSaved: "Utlämningen har sparats i loggarna.",
  warehouseStockSaved: "Lagerändringen har sparats.",
  warehouseNewItemPrompt: "Namn på nytt verktyg eller material:",
  warehouseDuplicateItem: "Det verktyget eller materialet finns redan.",
  warehouseUnitPrompt: "Måttenhet:",
  warehouseRemoveItemConfirm: "Ta bort {name} från rullgardinslistan?",
  warehouseUnknown: "Okänd",
});

let currentLang = localStorage.getItem("cmax_lang") || "hr";
let langInitializedOnce = false;

function t(key) {
  return (
    (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) ||
    TRANSLATIONS["hr"][key] ||
    key
  );
}

function tFormat(key, values = {}) {
  let text = t(key);
  Object.entries(values).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, String(value ?? ""));
  });
  return text;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("cmax_lang", lang);

  // First call (during app init): just apply translations without reload
  if (!langInitializedOnce) {
    langInitializedOnce = true;
    updateLangButtons();
    applyTranslations();
    reinitFlatpickr();
    initTidplanDatePickers();
    return;
  }

  // Subsequent calls (user changes language): reload page once
  window.location.reload();
}

function updateLangButtons() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelectorAll(".lang-selector").forEach((sel) => {
    const btns = sel.querySelectorAll(".lang-btn");
    btns.forEach((btn) => {
      const text = btn.textContent.trim();
      if (
        (currentLang === "hr" && text.includes("HR")) ||
        (currentLang === "en" && text.includes("EN")) ||
        (currentLang === "sv" && text.includes("SV"))
      ) {
        btn.classList.add("active");
      }
    });
  });
}

function applyTranslations() {
  const map = {
    loginTitle: "loginTitle",
    labelEmail: "labelEmail",
    labelPassword: "labelPassword",
    readonlyBadgeText: "readonlyBadge",
    guestLoginBtnText: "guestLoginBtn",
    labelDate: "labelDate",
    btnPrintText: "btnPrint",
    btnExportText: "btnExport",
    btnClearText: "btnClear",
    btnReportText: "btnReport",
    btnBinsText: "btnBins",
    btnNotificationsText: "btnNotifications",
    btnSaveText: "btnSave",
    btnAdminText: "btnAdmin",
    btnLogoutText: "btnLogout",
    listTitleWorkers: "listWorkers",
    listTitleLifts: "listLifts",
    listTitleMoments: "listMoments",
    listTitlePlans: "listPlans",
    listTitleKarnas: "listKarnas",
    colWorkerName: "colWorkerName",
    colWorkerStatus: "colWorkerStatus",
    colLiftName: "colLiftName",
    colLiftStatus: "colLiftStatus",
    colLiftPlan: "colLiftPlan",
    colMomentName: "colMomentName",
    colPlanName: "colPlanName",
    colKarnaName: "colKarnaName",
    planningTitle: "planningTitle",
    binsTitle: "binsTitle",
    notificationsTitle: "notificationsTitle",
    notificationComposerTitle: "notificationComposerTitle",
    notificationTextLabel: "notificationTextLabel",
    notificationSitesLabel: "notificationSitesLabel",
    notificationImagesLabel: "notificationImagesLabel",
    btnPublishNotification: "btnPublishNotification",
    btnBackFromNotificationsText: "btnBackFromNotifications",
    btnDeleteNotification: "btnDeleteNotification",
    notificationFilterLabel: "notificationFilterLabel",
    notificationSearchLabel: "notificationSearchLabel",
    notificationPinnedOnlyLabel: "notificationPinnedOnlyLabel",
    btnAddTidplanActivity: "tidplanAddActivity",
    btnManageZones: "tidplanManageZones",
    btnPrintTidplan: "tidplanPrint",
    btnBackToPlanner: "tidplanBackToPlanner",
    thW1: "thW1",
    thW2: "thW2",
    thW3: "thW3",
    thPlan: "thPlan",
    thKarna: "thKarna",
    thM1: "thM1",
    thM2: "thM2",
    thL1: "thL1",
    thL2: "thL2",
    thL3: "thL3",
    thComment: "thComment",
    thBinPlan: "thBinPlan",
    thBinKarna: "thBinKarna",
    thBinTotal: "thBinTotal",
    thBinEmpty: "thBinEmpty",
    thBinForEmpty: "thBinForEmpty",
    thBinAdditional: "thBinAdditional",
    thBinStatus: "thBinStatus",
    adminModalTitle: "adminModalTitle",
    tabBtnAdmins: "tabAdmins",
    tabBtnGuest: "tabGuest",
    tabBtnReports: "tabReports",
    tabBtnLogs: "tabLogs",
    tabBtnSettings: "tabSettings",
    logsTitle: "logsTitle",
    btnClearLogs: "btnClearLogs",
    labelNewEmail: "labelNewEmail",
    labelNewFirstName: "labelNewFirstName",
    labelNewLastName: "labelNewLastName",
    labelNewPassword: "labelNewPassword",
    labelAdminLevel: "labelAdminLevel",
    labelPermissions: "labelPermissions",
    labelAdminSites: "labelAdminSites",
    perm_canPrint: "perm_canPrint",
    perm_canExport: "perm_canExport",
    perm_canClear: "perm_canClear",
    perm_canManageWorkers: "perm_canManageWorkers",
    perm_canManageLifts: "perm_canManageLifts",
    perm_canManageMoments: "perm_canManageMoments",
    perm_canManagePlans: "perm_canManagePlans",
    perm_canManageKarnas: "perm_canManageKarnas",
    perm_canViewReports: "perm_canViewReports",
    perm_canApproveReports: "perm_canApproveReports",
    perm_canViewLogs: "perm_canViewLogs",
    perm_canClearLogs: "perm_canClearLogs",
    btnAddAdminEl: "btnAddAdmin",
    adminListTitle: "adminListTitle",
    btnManageWorkersText: "btnManage",
    btnManageLiftsText: "btnManage",
    btnManageMomentsText: "btnManage",
    btnManagePlansText: "btnManage",
    btnManageKarnasText: "btnManage",
    managePanelTitle: "managePanelTitle",
    manageCategoryLabel: "manageCategoryLabel",
    mcWorkers: "mcWorkers",
    mcLifts: "mcLifts",
    mcMoments: "mcMoments",
    mcPlans: "mcPlans",
    mcKarnas: "mcKarnas",
    filterAll: "filterAll",
    filterPending: "filterPending",
    filterApproved: "filterApproved",
    filterRejected: "filterRejected",
    reportModalTitle: "reportModalTitle",
    labelLift: "labelLift",
    labelPlan: "labelPlan",
    labelReporter: "labelReporter",
    labelComment: "labelComment",
    btnSubmitReportEl: "btnSubmitReport",
    settingsDarkModeTitle: "settingsDarkModeTitle",
    settingsThemeTitle: "settingsThemeTitle",
    settingsThemeNote: "settingsThemeNote",
    settingsBinsTitle: "settingsBinsTitle",
    settingsPasswordTitle: "settingsPasswordTitle",
    changePasswordTitle: "changePasswordTitle",
    accessNotice: "accessNotice",
    guestAccessTitle: "guestAccessTitle",
    guestAccessNote: "guestAccessNote",
    btnSaveGuestAccess: "btnSaveGuestAccess",
    presenceStripLabel: "presenceActiveLabel",
    tidplanLegendTitle: "tidplanLegendTitle",
    tidplanLegendSurplus: "tidplanLegendSurplus",
    tidplanLegendExact: "tidplanLegendExact",
    tidplanLegendShortage: "tidplanLegendShortage",
    tidplanLegendWeekend: "tidplanLegendWeekend",
    tidplanLegendHoliday: "tidplanLegendHoliday",
    tidplanLegendNote: "tidplanLegendNote",
    settingsLayoutTitle: "settingsLayoutTitle",
    btnResetTidplanLayout: "settingsResetTidplanLayout",
    btnResetThemeSettings: "settingsResetTheme",
    settingsLayoutNote: "settingsLayoutNote",
    loadingText: "loadingDefault",
  };

  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });

  const exportBtn = document.getElementById("plannerExportDropdownBtn");
  if (exportBtn) exportBtn.textContent = t("export");
  const importBtn = document.getElementById("plannerImportExcelBtn");
  if (importBtn) importBtn.textContent = t("importExcel");
  const warehouseMap = {
    warehousePageTitle: "btnWarehouse",
    warehouseNavLogsBtn: "warehouseLogsTitle",
    warehouseNavGraphBtn: "warehouseGraphNav",
    warehouseIssueTitle: "warehouseIssueTitle",
    warehouseIssueSubtitle: "warehouseIssueSubtitle",
    warehouseIssueColWorker: "warehouseIssueColWorker",
    btnWarehouseExportExcel: "warehouseExportExcel",
    btnWarehouseImportExcel: "warehouseImportExcel",
    warehouseIssueColComment: "warehouseIssueColComment",
    warehouseIssueColSave: "warehouseIssueColSave",
    warehouseStockTitle: "warehouseStockTitle",
    warehouseStockSubtitle: "warehouseStockSubtitle",
    warehouseStockItemLabel: "warehouseStockItemLabel",
    warehouseStockDirectionLabel: "warehouseStockDirectionLabel",
    warehouseStockDirectionIn: "warehouseStockDirectionIn",
    warehouseStockDirectionOut: "warehouseStockDirectionOut",
    warehouseStockQuantityLabel: "warehouseStockQuantityLabel",
    warehouseStockCommentLabel: "warehouseStockCommentLabel",
    warehouseStockSaveBtn: "warehouseSave",
    warehouseAlertsTitle: "warehouseAlertsTitle",
    warehouseAlertsSubtitle: "warehouseAlertsSubtitle",
    warehouseInventoryTitle: "warehouseInventoryTitle",
    warehouseInventorySubtitle: "warehouseInventorySubtitle",
    warehouseInventoryColItem: "warehouseInventoryColItem",
    warehouseInventoryColUnit: "warehouseInventoryColUnit",
    warehouseInventoryColCurrent: "warehouseInventoryColCurrent",
    warehouseInventoryColIssued: "warehouseInventoryColIssued",
    warehouseInventoryColReceived: "warehouseInventoryColReceived",
    warehouseInventoryColMinimum: "warehouseInventoryColMinimum",
    warehouseInventoryColNotify: "warehouseInventoryColNotify",
    warehouseCatalogTitle: "warehouseCatalogTitle",
    warehouseCatalogAddBtn: "warehouseCatalogAdd",
    warehouseLogsTitle: "warehouseLogsTitle",
    warehouseLogsBackBtn: "btnWarehouse",
    warehouseLogsGraphBtn: "warehouseGraphNav",
    warehouseLogFiltersTitle: "warehouseLogFiltersTitle",
    warehouseLogFiltersSubtitle: "warehouseLogFiltersSubtitle",
    warehouseLogDateLabel: "warehouseLogDateLabel",
    warehouseLogWorkerLabel: "warehouseLogWorkerLabel",
    warehouseLogItemLabel: "warehouseLogItemLabel",
    warehouseLogTypeLabel: "warehouseLogTypeLabel",
    warehouseLogTypeIssue: "warehouseLogTypeIssue",
    warehouseLogTypeStock: "warehouseLogTypeStock",
    warehouseLogTypeAdjustment: "warehouseLogTypeAdjustment",
    warehouseLogFlowLabel: "warehouseLogFlowLabel",
    warehouseLogFlowIn: "warehouseLogFlowIn",
    warehouseLogFlowOut: "warehouseLogFlowOut",
    warehouseLogSortLabel: "warehouseLogSortLabel",
    warehouseLogSortTimestamp: "warehouseLogSortTimestamp",
    warehouseLogSortItem: "warehouseLogSortItem",
    warehouseLogSortWorker: "warehouseLogSortWorker",
    warehouseLogSortType: "warehouseLogSortType",
    warehouseLogSortQuantity: "warehouseLogSortQuantity",
    warehouseLogSortBalance: "warehouseLogSortBalance",
    warehouseLogDirectionLabel: "warehouseLogDirectionLabel",
    warehouseLogDirectionDesc: "warehouseLogDirectionDesc",
    warehouseLogDirectionAsc: "warehouseLogDirectionAsc",
    warehouseApplyLogFiltersBtn: "warehouseApplyLogFilters",
    warehouseResetLogFiltersBtn: "warehouseResetLogFilters",
    warehouseLogsColDate: "warehouseLogsColDate",
    warehouseLogsColType: "warehouseLogsColType",
    warehouseLogsColWorker: "warehouseLogsColWorker",
    warehouseLogsColItem: "warehouseLogsColItem",
    warehouseLogsColQuantity: "warehouseLogsColQuantity",
    warehouseLogsColFlow: "warehouseLogsColFlow",
    warehouseLogsColComment: "warehouseLogsColComment",
    warehouseLogsColBalance: "warehouseLogsColBalance",
    warehouseLogsColAuthor: "warehouseLogsColAuthor",
    warehouseGraphTitle: "warehouseGraphTitle",
    warehouseGraphBackBtn: "btnWarehouse",
    warehouseGraphLogsBtn: "warehouseLogsTitle",
    warehouseGraphWorkersTitle: "warehouseGraphWorkersTitle",
    warehouseGraphItemsTitle: "warehouseGraphItemsTitle",
    warehouseGraphInsightTitle: "warehouseGraphInsightTitle",
    backupTabTitle: "backupTabTitle",
    btnManualBackup: "backupManualBtn",
    btnListBackups: "backupListBtn",
    btnBackupInfo: "backupInfoBtn",
  };
  Object.entries(warehouseMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });
  const warehouseComment = document.getElementById("warehouseStockComment");
  if (warehouseComment) warehouseComment.placeholder = t("warehouseStockCommentPlaceholder");

  const tidplanExportPdfBtn = document.getElementById("btnTidplanExportPdf");
  if (tidplanExportPdfBtn) tidplanExportPdfBtn.textContent = t("exportPdf");
  const tidplanImportPdfBtn = document.getElementById("btnTidplanImportPdf");
  if (tidplanImportPdfBtn) tidplanImportPdfBtn.textContent = t("importPdf");

  const plannerExportExcelBtn = document.getElementById("btnPlannerExportExcel");
  if (plannerExportExcelBtn) plannerExportExcelBtn.textContent = t("exportExcel");
  const plannerExportPdfBtn = document.getElementById("btnPlannerExportPdf");
  if (plannerExportPdfBtn) plannerExportPdfBtn.textContent = t("exportPdf");
  const plannerExportWordBtn = document.getElementById("btnPlannerExportWord");
  if (plannerExportWordBtn) plannerExportWordBtn.textContent = t("exportWord");
  const plannerImportExcelBtn = document.getElementById("btnPlannerImportExcel");
  if (plannerImportExcelBtn) plannerImportExcelBtn.textContent = t("importExcel");


  // Login button text (inside login-btn)
  const loginBtnEl = document.getElementById("loginBtnEl");
  if (loginBtnEl) loginBtnEl.textContent = t("loginBtn");
  const guestBtnEl = document.getElementById("guestBtnEl");
  if (guestBtnEl) guestBtnEl.textContent = t("guestBtn");

  // Dark mode button
  updateDarkModeBtn();
  updateDateDisplay();
  updateNotifBadge();
  if (
    document.getElementById("tidplan-section").style.display === "block"
  ) {
    updateTidplan();
  }
}

/* ==================== GLOBAL STATE ==================== */
let STORAGE_KEY = "cmax_planner_data";
const AUTH_KEY = "cmax_planner_auth";
const ADMINS_KEY = "cmax_planner_admins";
let REPORTS_KEY = "cmax_planner_reports";
let BINS_KEY = "cmax_planner_bins";
let NOTIFICATIONS_KEY = "cmax_planner_notifications";
const LOGS_KEY = "cmax_planner_logs";
const BIN_PERMS_KEY = "cmax_planner_bin_perms";
const DARK_KEY = "cmax_dark";
const THEME_KEY = "cmax_theme";
const SITES_KEY = "cmax_sites";
const CURRENT_SITE_KEY = "cmax_current_site";
const CURRENT_VIEW_KEY = "cmax_current_view";
const NOTIFICATIONS_COUNTER_KEY = "cmax_notifications_counter";
const CSRF_TOKEN_KEY = "cmax_csrf_token";
const SUPER_ADMIN_EMAIL = "admin@cmax.se";
const SUPER_ADMIN_PASSWORD = "cmax2026";

function getStorageKey(module) {
  return module + "_" + currentSite;
}

function sanitizeSiteId(site) {
  return String(site || "").replace(/[^A-Za-z0-9_-]/g, "_");
}

function getCsrfToken() {
  return sessionStorage.getItem(CSRF_TOKEN_KEY) || localStorage.getItem(CSRF_TOKEN_KEY) || "";
}

function setCsrfToken(token) {
  if (!token) {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    localStorage.removeItem(CSRF_TOKEN_KEY);
    return;
  }
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  localStorage.setItem(CSRF_TOKEN_KEY, token);
}

function clearCsrfToken() {
  setCsrfToken("");
}

function clearAuthSessionLocal() {
  localStorage.removeItem(AUTH_KEY);
  clearCsrfToken();
}

function applyAuthData(authData) {
  if (!authData) return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  appState.isAdmin = authData.isAdmin;
  appState.isSuperAdmin = authData.isSuperAdmin;
  appState.isReadonly = authData.isReadonly;
  appState.currentUser = authData.email;
  appState.currentUserName = authData.fullName || "";
  appState.adminLevel = authData.level || 1;
  appState.permissions = authData.permissions || normalizePermissions({});
  appState.guestPermissions = getGuestPermissions();
}

const originalFetch = window.fetch.bind(window);
window.fetch = function patchedFetch(resource, options = {}) {
  const requestUrl = typeof resource === "string" ? resource : resource?.url || "";
  const nextOptions = { ...options };
  nextOptions.credentials = nextOptions.credentials || "same-origin";
  const method = (nextOptions.method || "GET").toUpperCase();
  const isApiRequest = requestUrl.startsWith("/api/");
  if (isApiRequest) {
    nextOptions.headers = new Headers(nextOptions.headers || {});
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && !requestUrl.includes("/api/login")) {
      const csrfToken = getCsrfToken();
      if (csrfToken && !nextOptions.headers.has("x-csrf-token")) {
        nextOptions.headers.set("x-csrf-token", csrfToken);
      }
    }
  }
  return originalFetch(resource, nextOptions).then((response) => {
    if (isApiRequest && response.status === 401 && !requestUrl.includes("/api/login")) {
      clearAuthSessionLocal();
      appState.isAdmin = false;
      appState.isSuperAdmin = false;
      appState.isReadonly = false;
      appState.currentUser = null;
      appState.currentUserName = "";
      appState.adminLevel = 1;
      appState.permissions = normalizePermissions({});
      if (document.getElementById("mainContainer")?.style.display !== "none") {
        showToast("Sesija je istekla. Prijavi se ponovno.", "error");
        showLogin();
      }
    }
    return response;
  });
};

function compareNaturally(a, b) {
  return (a || "").toString().localeCompare((b || "").toString(), "hr", {
    numeric: true,
    sensitivity: "base",
  });
}

function sortNaturally(items) {
  return [...items].sort(compareNaturally);
}

function isPastDate(dateValue) {
  const text = String(dateValue || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${text}T00:00:00`);
  return date < today;
}

function canEditDate(dateValue = appState.currentDate) {
  if (appState.isReadonly) return false;
  if (!isPastDate(dateValue)) return true;
  return appState.isSuperAdmin || getCurrentAdminLevel() >= 6 || hasPermission("canUnlockPastDays");
}

function canEditTidplan() {
  return (
    !appState.isReadonly &&
    canEditDate(appState.currentDate) &&
    canAccessTidplanModule() &&
    (appState.isSuperAdmin ||
      (appState.isAdmin && appState.permissions.canManageTidplan !== false))
  );
}

let currentView = "main"; // 'main' or 'bins'
let suppressRoutePush = false;
let autoSaveInterval = null;
let presenceHeartbeatInterval = null;
let presenceRefreshInterval = null;
let reportsRefreshInterval = null;
let siteMetaRefreshInterval = null;
let lastEditAt = 0;
const PRESENCE_EDITING_WINDOW_MS = 2 * 60 * 1000;
let lastPresenceEditPingAt = 0;
const PRESENCE_EDIT_PING_COOLDOWN_MS = 3000;
let adminRemovalHandled = false;
let pendingAdminPermsByEmail = {};
let pendingServerSyncOptions = {
  includeAdmins: false,
  includeGuestPermissions: false,
  includeBinPermissions: false,
  includeSites: false,
  includeAdminRemovalNotices: false,
};
let presenceSessionId =
  sessionStorage.getItem("cmax_presence_session") ||
  `presence_${Math.random().toString(36).slice(2)}_${Date.now()}`;
sessionStorage.setItem("cmax_presence_session", presenceSessionId);
let currentSite = localStorage.getItem(CURRENT_SITE_KEY) || "default";
let sites = safeParseStoredJson(localStorage.getItem(SITES_KEY), ["default"]) || ["default"];
let tidplanData = [];
let tidplanZones = [];
let availablePlans = [];
let availableMoments = ["Moment 1", "Moment 2"];
let availableKarne = ["Karna 1", "Karna 2", "Karna 3", "Karna 4"];
let warehouseData = null;
let logsCache = [];
let logsLoadedOnce = false;
let tidplanDataChanged = false;
let notificationViewerImages = [];
let notificationViewerIndex = 0;
let notificationsRefreshInterval = null;
let pendingAdminLevelSelections = {};
const WAREHOUSE_SLOTS_PER_ROW = 8;
const BACKEND_ENABLED =
  typeof window !== "undefined" &&
  window.location &&
  window.location.protocol !== "file:";

const DEFAULT_PERMISSIONS = {
  canAccessPlanner: true,
  canAccessTidplan: true,
  canAccessBins: true,
  canAccessWarehouse: true,
  canManageWarehouse: true,
  canViewWarehouseLogs: true,
  canViewWarehouseAnalytics: true,
  canViewNotifications: true,
  canManageNotifications: false,
  canDeleteNotifications: false,
  canCreateReports: true,
  canOpenAdminPanel: true,
  canManageAdmins: false,
  canManageSiteAccess: false,
  canViewSettings: true,
  canManageGuestAccess: false,
  canPrint: true,
  canExport: true,
  canClear: true,
  canUnlockPastDays: false,
  canManageTidplan: true,
  canAddTidplanActivity: true,
  canDeleteTidplanActivity: true,
  canManageTidplanZones: true,
  canPrintTidplan: true,
  canClearTidplan: true,
  canManageWorkers: true,
  canManageLifts: true,
  canManageMoments: true,
  canManagePlans: true,
  canManageKarnas: true,
  canEditBinsData: true,
  canManageBinsPlans: true,
  canManageBinsPermissions: false,
  canViewReports: true,
  canApproveReports: true,
  canDeleteReports: false,
  canViewLogs: true,
  canClearLogs: true,
};

const ADMIN_LEVELS = [1, 2, 3, 4, 5, 6];

const ADMIN_LEVEL_PERMISSION_KEYS = {
  1: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canViewNotifications",
    "canCreateReports",
  ],
  2: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canViewNotifications",
    "canCreateReports",
    "canPrint",
    "canExport",
    "canViewReports",
  ],
  3: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canManageWarehouse",
    "canViewNotifications",
    "canCreateReports",
    "canPrint",
    "canExport",
    "canViewReports",
    "canOpenAdminPanel",
    "canManageWorkers",
    "canManageLifts",
    "canManageMoments",
    "canManagePlans",
    "canManageKarnas",
    "canManageTidplan",
    "canAddTidplanActivity",
    "canDeleteTidplanActivity",
    "canManageTidplanZones",
    "canPrintTidplan",
    "canClearTidplan",
    "canEditBinsData",
    "canManageBinsPlans",
  ],
  4: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canManageWarehouse",
    "canViewWarehouseLogs",
    "canViewWarehouseAnalytics",
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
    "canViewNotifications",
    "canCreateReports",
    "canPrint",
    "canExport",
    "canViewReports",
    "canOpenAdminPanel",
    "canManageWorkers",
    "canManageLifts",
    "canManageMoments",
    "canManagePlans",
    "canManageKarnas",
    "canManageTidplan",
    "canAddTidplanActivity",
    "canDeleteTidplanActivity",
    "canManageTidplanZones",
    "canPrintTidplan",
    "canClearTidplan",
    "canEditBinsData",
    "canManageBinsPlans",
    "canManageBinsPermissions",
    "canManageNotifications",
    "canApproveReports",
    "canViewLogs",
    "canViewSettings",
  ],
  5: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canManageWarehouse",
    "canViewWarehouseLogs",
    "canViewWarehouseAnalytics",
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
    "canViewNotifications",
    "canCreateReports",
    "canPrint",
    "canExport",
    "canViewReports",
    "canOpenAdminPanel",
    "canManageWorkers",
    "canManageLifts",
    "canManageMoments",
    "canManagePlans",
    "canManageKarnas",
    "canManageTidplan",
    "canAddTidplanActivity",
    "canDeleteTidplanActivity",
    "canManageTidplanZones",
    "canPrintTidplan",
    "canClearTidplan",
    "canEditBinsData",
    "canManageBinsPlans",
    "canManageBinsPermissions",
    "canManageNotifications",
    "canDeleteNotifications",
    "canApproveReports",
    "canDeleteReports",
    "canManageAdmins",
    "canManageSiteAccess",
    "canManageGuestAccess",
    "canViewLogs",
    "canClearLogs",
    "canViewSettings",
  ],
  6: Object.keys(DEFAULT_PERMISSIONS),
};

function getLevelTemplate(level) {
  const keys = ADMIN_LEVEL_PERMISSION_KEYS[level] || [];
  const template = {};
  Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
    template[key] = keys.includes(key);
  });
  return template;
}

function getLevelDefaultPermissions(level) {
  return getLevelTemplate(level);
}

function permissionsFitLevel(perms, level) {
  const template = getLevelTemplate(level);
  const normalized = normalizePermissions(perms);
  return Object.keys(DEFAULT_PERMISSIONS).every((key) => {
    if (normalized[key] !== false) {
      return template[key] === true;
    }
    return true;
  });
}

function deriveLevelFromPermissions(perms) {
  for (let i = ADMIN_LEVELS.length - 1; i >= 0; i -= 1) {
    const level = ADMIN_LEVELS[i];
    if (permissionsFitLevel(perms, level)) return level;
  }
  return 1;
}

function clampPermissionsToLevel(perms, level) {
  const template = getLevelTemplate(level);
  const normalized = normalizePermissions(perms);
  const clamped = {};
  Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
    clamped[key] = template[key] === true && normalized[key] !== false;
  });
  return clamped;
}

function getAdminLevel(admin) {
  if (admin?.isSuperAdmin) return 6;
  const raw = Number(admin?.level);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 6) return raw;
  return deriveLevelFromPermissions(admin?.permissions || {});
}

function getCurrentAdminLevel() {
  if (appState.isSuperAdmin) return 6;
  const raw = Number(appState.adminLevel);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 6) return raw;
  return deriveLevelFromPermissions(appState.permissions);
}

function canManageAdminsByLevel() {
  return hasAdminPermission("canManageAdmins") && getCurrentAdminLevel() >= 5;
}

function getMaxGrantableLevel() {
  const currentLevel = getCurrentAdminLevel();
  return currentLevel >= 6 ? 6 : Math.max(1, currentLevel - 1);
}

function canManageAdminRecord(targetAdmin) {
  if (!canManageAdminsByLevel()) return false;
  if (targetAdmin?.isSuperAdmin) return false;
  const currentLevel = getCurrentAdminLevel();
  if (currentLevel >= 6) return true;
  const targetLevel = getAdminLevel(targetAdmin);
  return targetLevel < currentLevel;
}

function getPendingAdminLevel(email, fallbackLevel) {
  const stored = pendingAdminLevelSelections[email];
  if (Number.isFinite(stored) && stored >= 1 && stored <= 6) return stored;
  return fallbackLevel;
}

function setPendingAdminLevel(email, level) {
  if (!email) return;
  const value = Number(level);
  if (Number.isFinite(value) && value >= 1 && value <= 6) {
    pendingAdminLevelSelections[email] = value;
  }
}

function clearPendingAdminLevel(email) {
  if (email && pendingAdminLevelSelections[email]) {
    delete pendingAdminLevelSelections[email];
  }
}

function getPendingAdminPerms(email, fallbackPerms) {
  if (!email) return fallbackPerms;
  const stored = pendingAdminPermsByEmail[email];
  if (stored && typeof stored === "object") return stored;
  return fallbackPerms;
}

function setPendingAdminPerms(email, perms) {
  if (!email || !perms) return;
  pendingAdminPermsByEmail[email] = { ...perms };
}

function clearPendingAdminPerms(email) {
  if (email && pendingAdminPermsByEmail[email]) {
    delete pendingAdminPermsByEmail[email];
  }
}

const DEFAULT_GUEST_PERMISSIONS = {
  canAccessPlanner: true,
  canAccessTidplan: true,
  canAccessBins: false,
  canAccessWarehouse: false,
  canViewWarehouseLogs: false,
  canViewWarehouseAnalytics: false,
  canViewNotifications: false,
  canDeleteNotifications: false,
  canCreateReports: true,
  canPrint: false,
  canExport: false,
  canExportWarehouse: false,
  canImportWarehouse: false,
  canExportTidplan: false,
  canImportTidplan: false,
  canUnlockPastDays: false,
  warehouseAccessBySite: {},
};

const GUEST_PERMISSIONS_KEY = "cmax_guest_permissions";
const ADMIN_REMOVAL_NOTICES_KEY = "cmax_admin_removal_notices";

const ADMIN_PERMISSION_SECTIONS = [
  {
    titleKey: "permSectionGeneralTitle",
    noteKey: "permSectionGeneralNote",
    keys: [
      "canAccessPlanner",
      "canPrint",
      "canExport",
      "canClear",
      "canManageWorkers",
      "canManageLifts",
      "canManageMoments",
      "canManagePlans",
      "canManageKarnas",
    ],
  },
  {
    titleKey: "permSectionExportImportTitle",
    noteKey: "permSectionExportImportNote",
    keys: [
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
      "canUnlockPastDays",
    ],
  },
  {
    titleKey: "permSectionTidplanTitle",
    noteKey: "permSectionTidplanNote",
    keys: [
      "canAccessTidplan",
      "canManageTidplan",
      "canAddTidplanActivity",
      "canDeleteTidplanActivity",
      "canManageTidplanZones",
      "canPrintTidplan",
      "canClearTidplan",
    ],
  },
  {
    titleKey: "permSectionBinsTitle",
    noteKey: "permSectionBinsNote",
    keys: [
      "canAccessBins",
      "canEditBinsData",
      "canManageBinsPlans",
      "canManageBinsPermissions",
    ],
  },
  {
    titleKey: "permSectionWarehouseTitle",
    noteKey: "permSectionWarehouseNote",
    keys: [
      "canAccessWarehouse",
      "canManageWarehouse",
      "canViewWarehouseLogs",
      "canViewWarehouseAnalytics",
    ],
  },
  {
    titleKey: "permSectionNotificationsTitle",
    noteKey: "permSectionNotificationsNote",
    keys: ["canViewNotifications", "canManageNotifications", "canDeleteNotifications"],
  },
  {
    titleKey: "permSectionReportsTitle",
    noteKey: "permSectionReportsNote",
    keys: [
      "canCreateReports",
      "canViewReports",
      "canApproveReports",
      "canDeleteReports",
    ],
  },
  {
    titleKey: "permSectionAdminTitle",
    noteKey: "permSectionAdminNote",
    keys: [
      "canManageAdmins",
      "canManageSiteAccess",
      "canViewLogs",
      "canClearLogs",
      "canViewSettings",
      "canManageGuestAccess",
    ],
  },
  {
    titleKey: "permSectionBackupTitle",
    noteKey: "permSectionBackupNote",
    keys: [
      "canManageBackups",
      "canViewBackups",
    ],
  },
];

const GUEST_PERMISSION_SECTIONS = [
  {
    titleKey: "permSectionGuestTitle",
    noteKey: "permSectionGuestNote",
    keys: [
      "canAccessPlanner",
      "canAccessTidplan",
      "canAccessBins",
      "canAccessWarehouse",
      "canViewWarehouseLogs",
      "canViewWarehouseAnalytics",
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
      "canViewNotifications",
      "canCreateReports",
      "canPrint",
      "canExport",
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
    ],
  },
];

let appState = {
  workers: [
    "Aleksandar Antonovic",
    "Alois-Francisc Stojan",
    "Amel Husic",
    "Amir Gholami",
    "Boyan Sazdanovski",
    "Branislav Jovicic",
    "Branislav Madzar",
    "Danijel Sumic",
    "Danijel-Gabrijel Dia",
    "Darko Ivandic",
    "Ergin Makic",
    "Filip Fiolic",
    "Ivan Mijatovic",
    "Josip Ivandic",
    "Jovan Panic",
    "Marius Constantin",
    "Marko Mladenovic",
    "Mohammad Kabir",
    "Nebojsa Stanisic",
    "Radenko Tesanovic",
    "Radomir Mitrovic",
    "Sinan Ayhan",
    "Sinisa Gataric",
    "Tommie Andersson",
    "Venijamin Visekruna",
    "Vicenco Mijic",
    "William Asovic",
    "Yevhenii Marin",
    "Yurii Volkov",
  ],
  lifts: [
    "11788",
    "4865",
    "4820",
    "11698",
    "4451",
    "11513",
    "13286",
    "13441",
    "8468",
    "12113",
    "13444",
    "11685",
    "11684",
    "11945",
    "11114",
    "4883",
    "12095",
    "13879",
    "12090",
    "11484",
    "11521",
    "4328",
    "11857",
    "11676",
    "4739",
    "13859",
    "11442",
    "5227",
    "12101",
    "13315",
    "11495",
    "13776",
    "11755",
    "12094",
    "12044",
  ],
  moments: [
    "IV Utsättning",
    "IV Stomme",
    "IV Enkling",
    "IV Isolering",
    "IV Dubbling",
    "UT Utsättning",
    "UT Stomme",
    "UT Isolering",
    "UT Dubbling",
    "YV Utsättning",
    "YV Stomme",
    "YV Isolering",
    "YV Plastfolie",
    "IZ Stomme",
    "IZ Isolering",
    "IZ Dubbling",
    "Kontor",
    "Mont.fönster",
    "Ometablering",
    "Kortlingar",
    "Transport material",
    "Håltagning",
    "Rivning",
    "Fönsterbänkar",
    "Fönstersmygar",
    "Övrigt",
    "Möte",
    "Städning",
    "Fasad",
  ],
  plans: [],
  karnas: ["Karna 1", "Karna 2", "Karna 3", "Karna 4"],
  dailyData: {},
  binsData: {}, // { date: { planCount: 20, rows: [...] } }
  resourceHistory: [],
  binPermissions: {
    // which columns can guests edit
    totalAvailable: true,
    emptyAvailable: true,
    forEmptying: true,
    additionalRequired: false,
  },
  currentDate: new Date().toISOString().split("T")[0],
  isAdmin: false,
  isSuperAdmin: false,
  isReadonly: false,
  adminLevel: 1,
  currentUser: null,
  currentUserName: "",
  permissions: { ...DEFAULT_PERMISSIONS },
  guestPermissions: { ...DEFAULT_GUEST_PERMISSIONS },
  hasUnsavedChanges: false, // Track changes for Save button
};

for (let i = 1; i <= 20; i++) appState.plans.push(`Plan ${i}`);

const DEFAULT_SITE_TEMPLATE = {
  workers: [...appState.workers],
  lifts: [...appState.lifts],
  moments: [...appState.moments],
  plans: [...appState.plans],
  karnas: [...appState.karnas],
  dailyData: {},
  binsData: {},
  tidplan: [],
  resourceHistory: [],
  tidplanZones: [
    { name: "Zona A", color: "#8fbc8f" },
    { name: "Zona B", color: "#add8e6" },
    { name: "Zona C", color: "#f4a460" },
  ],
  warehouse: null,
  reports: [],
  notifications: [],
};

function createWarehouseSlots() {
  return Array.from({ length: WAREHOUSE_SLOTS_PER_ROW }, () => ({
    itemId: "",
    quantity: 1,
  }));
}

function createWarehouseIssueDraft() {
  return {
    worker: "",
    comment: "",
    slots: createWarehouseSlots(),
  };
}

function getDefaultWarehouseCatalog() {
  return [
    { id: "itm_meter", name: "Metar", unit: "kom", minimum: 2, notifyPerson: "" },
    { id: "itm_olovka", name: "Olovka", unit: "kom", minimum: 10, notifyPerson: "" },
    { id: "itm_raspa", name: "Raspa", unit: "kom", minimum: 2, notifyPerson: "" },
    { id: "itm_zaga", name: "Zaga", unit: "kom", minimum: 1, notifyPerson: "" },
    { id: "itm_pistolj", name: "Pistolj za silikon", unit: "kom", minimum: 1, notifyPerson: "" },
    { id: "itm_rukavice", name: "Rukavice", unit: "pari", minimum: 20, notifyPerson: "" },
  ];
}

function createWarehouseLogEntry(overrides = {}) {
  return {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: "adjustment",
    worker: "",
    itemId: "",
    itemName: "",
    quantity: 0,
    direction: "in",
    comment: "",
    performedBy: appState.currentUser || "Guest",
    balanceAfter: 0,
    ...overrides,
  };
}

function getDefaultWarehouseData() {
  const catalog = getDefaultWarehouseCatalog();
  const stock = {};
  catalog.forEach((item) => {
    stock[item.id] = {
      current: 0,
      totalIssued: 0,
      totalReceived: 0,
    };
  });
  return {
    catalog,
    stock,
    procurementUsers: [],
    issueDraft: createWarehouseIssueDraft(),
    stockForm: {
      itemId: catalog[0]?.id || "",
      quantity: 1,
      direction: "in",
      comment: "",
    },
    logs: [],
  };
}

function normalizeWarehouseData(rawWarehouse) {
  const base = getDefaultWarehouseData();
  const raw = rawWarehouse && typeof rawWarehouse === "object" ? rawWarehouse : {};
  const catalog = Array.isArray(raw.catalog) && raw.catalog.length
    ? raw.catalog
        .map((item, index) => ({
          id: item?.id || `itm_${Date.now()}_${index}`,
          name: (item?.name || "").toString().trim(),
          unit: (item?.unit || "kom").toString().trim() || "kom",
          minimum: Math.max(Number(item?.minimum) || 0, 0),
          notifyPerson: (item?.notifyPerson || "").toString().trim(),
        }))
        .filter((item) => item.name)
    : base.catalog;

  const stock = {};
  catalog.forEach((item) => {
    const existing = raw.stock && raw.stock[item.id] ? raw.stock[item.id] : {};
    stock[item.id] = {
      current: Number(existing.current) || 0,
      totalIssued: Number(existing.totalIssued) || 0,
      totalReceived: Number(existing.totalReceived) || 0,
    };
  });

  const draftSlots = Array.isArray(raw.issueDraft?.slots) ? raw.issueDraft.slots : [];
  const normalizedSlots = createWarehouseSlots().map((slot, index) => {
    const source = draftSlots[index] || {};
    return {
      itemId: source.itemId || "",
      quantity: Math.max(Number(source.quantity) || 1, 1),
    };
  });

  const stockFormItemId =
    raw.stockForm?.itemId && stock[raw.stockForm.itemId] ? raw.stockForm.itemId : catalog[0]?.id || "";

  return {
    catalog,
    stock,
    procurementUsers: Array.isArray(raw.procurementUsers)
      ? raw.procurementUsers.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)
      : [],
    issueDraft: {
      worker: (raw.issueDraft?.worker || "").toString(),
      comment: (raw.issueDraft?.comment || "").toString(),
      slots: normalizedSlots,
    },
    stockForm: {
      itemId: stockFormItemId,
      quantity: Math.max(Number(raw.stockForm?.quantity) || 1, 1),
      direction: raw.stockForm?.direction === "out" ? "out" : "in",
      comment: (raw.stockForm?.comment || "").toString(),
    },
    logs: Array.isArray(raw.logs)
      ? raw.logs.map((entry) => createWarehouseLogEntry(entry))
      : [],
  };
}

function initializeSiteStorage(siteName) {
  const plannerKey = getSiteStorageKey("cmax_planner_data", siteName);
  const binsKey = getSiteStorageKey("cmax_planner_bins", siteName);
  const tidplanKey = getSiteStorageKey("tidplan", siteName);
  const tidplanZonesKey = getSiteStorageKey("tidplan_zones", siteName);
  const warehouseKey = getSiteStorageKey("cmax_warehouse_data", siteName);
  const reportsKey = getSiteStorageKey("cmax_planner_reports", siteName);
  const notificationsKey = getSiteStorageKey("cmax_planner_notifications", siteName);

  localStorage.setItem(
    plannerKey,
    JSON.stringify({
      workers: [...DEFAULT_SITE_TEMPLATE.workers],
      lifts: [...DEFAULT_SITE_TEMPLATE.lifts],
      moments: [...DEFAULT_SITE_TEMPLATE.moments],
      plans: [...DEFAULT_SITE_TEMPLATE.plans],
      karnas: [...DEFAULT_SITE_TEMPLATE.karnas],
      dailyData: {},
    }),
  );
  localStorage.setItem(binsKey, JSON.stringify({}));
  localStorage.setItem(tidplanKey, JSON.stringify([]));
  localStorage.setItem(
    tidplanZonesKey,
    JSON.stringify(DEFAULT_SITE_TEMPLATE.tidplanZones.map((zone) => ({ ...zone }))),
  );
  localStorage.setItem(warehouseKey, JSON.stringify(getDefaultWarehouseData()));
  localStorage.setItem(reportsKey, JSON.stringify([]));
  localStorage.setItem(notificationsKey, JSON.stringify([]));
}

function normalizePermissions(permissions) {
  return { ...DEFAULT_PERMISSIONS, ...(permissions || {}) };
}

function normalizeAdminRecord(admin) {
  const firstName = (admin?.firstName || "").trim();
  const lastName = (admin?.lastName || "").trim();
  const fullName =
    (
      admin?.fullName ||
      admin?.name ||
      `${firstName} ${lastName}` ||
      (admin?.email === SUPER_ADMIN_EMAIL ? "Super Admin" : "")
    ).trim();

  const inferredLevel = getAdminLevel(admin);
  const normalizedPerms = admin?.isSuperAdmin
    ? { ...DEFAULT_PERMISSIONS }
    : clampPermissionsToLevel(admin?.permissions || {}, inferredLevel);

  return {
    ...admin,
    firstName,
    lastName,
    fullName,
    level: inferredLevel,
    allowedSites: Array.isArray(admin?.allowedSites) ? admin.allowedSites : null,
    permissions: normalizedPerms,
  };
}

function getCurrentReporterName() {
  const cachedName = (appState.currentUserName || "").trim();
  if (cachedName) return cachedName;

  const currentEmail = (appState.currentUser || "").trim().toLowerCase();
  if (!currentEmail || currentEmail === "readonly") return "";

  const authData = safeParseStoredJson(localStorage.getItem(AUTH_KEY), {});
  const authFullName = (authData?.fullName || authData?.name || "").trim();
  if (authFullName) {
    appState.currentUserName = authFullName;
    return authFullName;
  }

  const matchedAdmin = getAdmins().find(
    (admin) => (admin.email || "").trim().toLowerCase() === currentEmail,
  );
  const resolvedName = (matchedAdmin?.fullName || "").trim();
  if (resolvedName) {
    appState.currentUserName = resolvedName;
    const nextAuthData = { ...(authData || {}), fullName: resolvedName };
    localStorage.setItem(AUTH_KEY, JSON.stringify(nextAuthData));
    return resolvedName;
  }

  const localPart = currentEmail.split("@")[0] || "";
  const fallbackName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .trim();

  if (fallbackName) {
    appState.currentUserName = fallbackName;
    const nextAuthData = { ...(authData || {}), fullName: fallbackName };
    localStorage.setItem(AUTH_KEY, JSON.stringify(nextAuthData));
    return fallbackName;
  }

  return "";
}

function getGuestPermissions() {
  const raw = localStorage.getItem(GUEST_PERMISSIONS_KEY);
  return normalizeGuestPermissions(safeParseStoredJson(raw, {}));
}

function normalizeGuestPermissions(permissions) {
  const next = { ...DEFAULT_GUEST_PERMISSIONS, ...(permissions || {}) };
  next.warehouseAccessBySite =
    permissions?.warehouseAccessBySite && typeof permissions.warehouseAccessBySite === "object"
      ? { ...permissions.warehouseAccessBySite }
      : {};
  return next;
}

function saveGuestPermissions(permissions) {
  const normalized = normalizeGuestPermissions(permissions);
  localStorage.setItem(GUEST_PERMISSIONS_KEY, JSON.stringify(normalized));
  appState.guestPermissions = normalized;
  scheduleServerSync(3000, { includeGuestPermissions: true });
}

function getPermissionLabel(key) {
  return t(`perm_${key}`);
}

function hasPermission(key) {
  if (appState.isSuperAdmin) return true;
  if (appState.isReadonly) {
    return appState.guestPermissions[key] !== false;
  }
  return appState.permissions[key] !== false;
}

function hasAdminPermission(key) {
  return appState.isSuperAdmin || (!appState.isReadonly && appState.permissions[key] !== false);
}

function getGuestWarehouseSiteAccess(site = currentSite) {
  const map = appState.guestPermissions?.warehouseAccessBySite;
  const rawEntry = map && typeof map === "object" ? map[site] : null;
  return {
    allowedItemIds: Array.isArray(rawEntry?.allowedItemIds)
      ? rawEntry.allowedItemIds.filter(Boolean)
      : [],
  };
}

function setGuestWarehouseSiteAccess(permissions, site, access = {}) {
  const next = normalizeGuestPermissions(permissions);
  next.warehouseAccessBySite = {
    ...(next.warehouseAccessBySite || {}),
    [site]: {
      allowedItemIds: Array.isArray(access.allowedItemIds) ? access.allowedItemIds.filter(Boolean) : [],
    },
  };
  return next;
}

function canAccessPlannerModule() {
  return hasPermission("canAccessPlanner");
}

function canExportPlanner() { return hasPermission("canExportPlanner"); }
function canImportPlanner() { return hasPermission("canImportPlanner"); }


function canAccessTidplanModule() {
  return appState.isReadonly
    ? hasPermission("canAccessTidplan")
    : appState.isSuperAdmin || appState.permissions.canAccessTidplan !== false;
}

function canAccessBinsModule() {
  return hasPermission("canAccessBins");
}
function canExportTidplan() { return hasPermission("canExportTidplan"); }
function canImportTidplan() { return hasPermission("canImportTidplan"); }

function canAccessWarehouseModule() {
  if (!hasPermission("canAccessWarehouse")) return false;
  if (!appState.isReadonly) return true;
  return getGuestWarehouseSiteAccess().allowedItemIds.length > 0;
}

function canExportWarehouse() { return hasPermission("canExportWarehouse"); }
function canImportWarehouse() { return hasPermission("canImportWarehouse"); }

function canEditWarehouse() {
  return !appState.isReadonly && hasPermission("canManageWarehouse");
}

function canViewWarehouseLogsSection() {
  if (!hasPermission("canViewWarehouseLogs")) return false;
  if (!appState.isReadonly) return true;
  return getGuestWarehouseSiteAccess().allowedItemIds.length > 0;
}

function canViewWarehouseAnalyticsSection() {
  if (!hasPermission("canViewWarehouseAnalytics")) return false;
  if (!appState.isReadonly) return true;
  return getGuestWarehouseSiteAccess().allowedItemIds.length > 0;
}

function canAccessNotificationsModule() {
  return hasPermission("canViewNotifications");
}

function canManageNotificationsAccess() {
  return !appState.isReadonly && hasPermission("canManageNotifications");
}

function canDeleteNotificationsAccess() {
  return !appState.isReadonly && hasPermission("canDeleteNotifications");
}

function canManageSiteAccess() {
  return appState.isSuperAdmin || hasAdminPermission("canManageSiteAccess");
}

function canManageBackups() { return !appState.isReadonly && hasAdminPermission("canManageBackups"); }
function canViewBackups() { return hasAdminPermission("canViewBackups"); }

function getCurrentAdminAllowedSites() {
  if (appState.isSuperAdmin) return null;
  if (!canManageSiteAccess()) return null;
  if (!appState.currentUser) return null;
  const admin = getAdmins().find((a) => a.email === appState.currentUser);
  if (admin && Array.isArray(admin.allowedSites)) {
    return admin.allowedSites;
  }
  return null;
}

function getAccessibleSites() {
  const allowed = getCurrentAdminAllowedSites();
  if (allowed === null) return (sites || []).slice();
  return (sites || []).filter((site) => allowed.includes(site));
}

function canCreateReportsAccess() {
  return hasPermission("canCreateReports");
}

function canEditBinsDataAccess() {
  return !appState.isReadonly && canEditDate(appState.currentDate) && hasPermission("canEditBinsData");
}

function canOpenAdminPanelAccess() {
  return !appState.isReadonly && appState.isAdmin && hasPermission("canOpenAdminPanel");
}

function renderPermissionEditor(containerId, prefix, permissionSource, sections) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  sections.forEach((section) => {
    const sectionEl = document.createElement("div");
    sectionEl.className = "permission-section";

    const header = document.createElement("div");
    header.className = "permission-section-header";
    header.innerHTML = `<div class="permission-section-title">${t(section.titleKey)}</div>${section.noteKey ? `<div class="permission-section-note">${t(section.noteKey)}</div>` : ""}`;
    sectionEl.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "permission-section-grid";

    section.keys.forEach((key) => {
      const label = document.createElement("label");
      label.className = "perm-label";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `${prefix}${key}`;
      checkbox.checked = permissionSource[key] !== false;
      const span = document.createElement("span");
      span.textContent = getPermissionLabel(key);
      label.appendChild(checkbox);
      label.appendChild(span);
      grid.appendChild(label);
    });

    sectionEl.appendChild(grid);
    container.appendChild(sectionEl);
  });
}

function readPermissionEditor(prefix, keys, defaults) {
  const permissions = { ...defaults };
  keys.forEach((key) => {
    const checkbox = document.getElementById(`${prefix}${key}`);
    permissions[key] = checkbox ? checkbox.checked : defaults[key] !== false;
  });
  return permissions;
}

function initTooltips() {
  if (window.__cmaxTooltipsInit) return;
  window.__cmaxTooltipsInit = true;

  const tooltip = document.createElement("div");
  tooltip.className = "cmax-tooltip";
  tooltip.id = "cmaxTooltip";
  document.body.appendChild(tooltip);

  let currentTarget = null;

  const showTooltip = (el, text) => {
    if (!text) return;
    currentTarget = el;
    tooltip.textContent = text;
    tooltip.classList.add("visible");
  };

  const hideTooltip = (el) => {
    tooltip.classList.remove("visible");
    tooltip.textContent = "";
    if (el && el.dataset.tooltipTitle) {
      el.setAttribute("title", el.dataset.tooltipTitle);
      delete el.dataset.tooltipTitle;
    }
    currentTarget = null;
  };

  const moveTooltip = (evt) => {
    const padding = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const rect = tooltip.getBoundingClientRect();
    const preferredX = evt.clientX + 12;
    const preferredY = evt.clientY + 12;

    let x = preferredX;
    let y = preferredY;

    if (preferredX + rect.width + padding > viewportW) {
      x = evt.clientX - rect.width - 12;
    }
    if (x < padding) x = padding;

    if (preferredY + rect.height + padding > viewportH) {
      y = evt.clientY - rect.height - 12;
    }
    if (y < padding) y = padding;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  };

  document.addEventListener("mouseover", (evt) => {
    const target = evt.target && evt.target.closest
      ? evt.target.closest("[title]")
      : null;
    if (!target || target === currentTarget) return;
    const title = target.getAttribute("title");
    if (!title) return;
    target.dataset.tooltipTitle = title;
    target.removeAttribute("title");
    showTooltip(target, title);
    moveTooltip(evt);
  });

  document.addEventListener("mousemove", (evt) => {
    if (!currentTarget) return;
    moveTooltip(evt);
  });

  document.addEventListener("mouseout", (evt) => {
    if (!currentTarget) return;
    const related = evt.relatedTarget;
    if (related && currentTarget.contains && currentTarget.contains(related)) return;
    hideTooltip(currentTarget);
  });

  document.addEventListener("focusin", (evt) => {
    const target = evt.target && evt.target.closest
      ? evt.target.closest("[title]")
      : null;
    if (!target) return;
    const title = target.getAttribute("title");
    if (!title) return;
    target.dataset.tooltipTitle = title;
    target.removeAttribute("title");
    showTooltip(target, title);
    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 8}px`;
    tooltip.style.top = `${rect.top}px`;
  });

  document.addEventListener("focusout", () => {
    if (!currentTarget) return;
    hideTooltip(currentTarget);
  });
}

/* ==================== INITIALIZATION ==================== */
function initApp() {
  // Apply saved theme/dark mode
  const savedTheme = localStorage.getItem(THEME_KEY) || "blue";
  const savedDark = localStorage.getItem(DARK_KEY) === "true";
  document.documentElement.setAttribute("data-theme", savedTheme);
  document.documentElement.setAttribute(
    "data-dark",
    savedDark ? "true" : "false",
  );
  updateThemeBtns(savedTheme);

  setLanguage(currentLang);
  initTooltips();
  STORAGE_KEY = getStorageKey("cmax_planner_data");
  BINS_KEY = getStorageKey("cmax_planner_bins");
  REPORTS_KEY = getStorageKey("cmax_planner_reports");
  NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
  populateSiteSelect();
  updateMainTitle();
  initAdmins();
  appState.guestPermissions = getGuestPermissions();
  checkAuth();
  setupEventListeners();
  loadAllData()
    .catch((error) => {
      console.error("Initial data load failed:", error);
    })
    .finally(() => {
      populateSiteSelect();
      updateMainTitle();
      renderAll();
      updateNotifBadge();
      if (document.getElementById("tidplan-section").style.display === "block") {
        updateTidplan();
      }
      if (document.getElementById("mainContainer").style.display !== "none") {
        restoreLastView();
      }
    });
  startAutoSave();
  window.addEventListener("focus", () => {
    refreshSiteMetadata()
      .then(() => refreshSharedDataIfSafe())
      .catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshSiteMetadata()
        .then(() => refreshSharedDataIfSafe())
        .catch(() => {});
    }
  });
  window.addEventListener("beforeunload", () => {
    if (!appState.isReadonly) {
      persistCurrentStateToLocalStorage();
      syncServerState({ keepalive: true }).catch(() => {});
    }
    sendPresence(false, true).catch(() => {});
  });
}

function saveCurrentView(view) {
  localStorage.setItem(CURRENT_VIEW_KEY, view);
}

function routeForView(view = currentView) {
  const routes = {
    main: "/planner",
    home: "/home",
    planner: "/planner",
    tidplan: "/tidplan",
    warehouse: "/warehouse",
    warehouseLogs: "/warehouse",
    warehouseGraph: "/warehouse",
    notifications: "/notifications",
    surveys: "/surveys",
    bins: "/bins",
  };
  return routes[view] || "/planner";
}

function viewFromPath(pathname = window.location.pathname) {
  const path = String(pathname || "/").toLowerCase();
  if (path === "/login") return "login";
  if (path === "/" || path === "/home" || path === "/planner") return "main";
  if (path === "/tidplan") return "tidplan";
  if (path === "/warehouse") return "warehouse";
  if (path === "/notifications") return "notifications";
  if (path === "/surveys") return "surveys";
  if (path === "/bins" || path === "/kante") return "bins";
  return null;
}

function pushRouteForView(view = currentView, options = {}) {
  if (suppressRoutePush || !window.history) return;
  const path = options.path || routeForView(view);
  if (window.location.pathname === path) return;
  const state = { view };
  if (options.replace) history.replaceState(state, "", path);
  else history.pushState(state, "", path);
}

function applyRouteFromPath(pathname = window.location.pathname) {
  const view = viewFromPath(pathname);
  if (!view) return false;
  suppressRoutePush = true;
  try {
    if (view === "login") {
      showLogin();
    } else if (view === "main") {
      showPlanner();
    } else if (view === "tidplan") {
      showTidplan();
    } else if (view === "warehouse") {
      showWarehouse();
    } else if (view === "notifications") {
      showNotifications();
    } else if (view === "surveys") {
      showSurveys();
    } else if (view === "bins") {
      if (currentView !== "bins") toggleBinsView();
    }
  } finally {
    suppressRoutePush = false;
  }
  return true;
}

function restoreLastView() {
  if (applyRouteFromPath(window.location.pathname)) return;
  const savedView = localStorage.getItem(CURRENT_VIEW_KEY) || "main";
  if (savedView === "tidplan") {
    if (document.getElementById("tidplan-section").style.display !== "block") {
      showTidplan();
    }
    return;
  }
  if (savedView === "notifications") {
    showNotifications();
    return;
  }
  if (savedView === "bins") {
    if (currentView !== "bins") {
      toggleBinsView();
    }
    return;
  }
  if (savedView === "warehouse") {
    showWarehouse();
    return;
  }
  if (savedView === "warehouseLogs") {
    showWarehouseLogs();
    return;
  }
  if (savedView === "warehouseGraph") {
    showWarehouseGraph();
    return;
  }
  // main view: leave defaults as-is
}

function initAdmins() {
  if (BACKEND_ENABLED) return;
  const admins = getAdmins();
  const superAdminExists = admins.some(
    (a) => a.email === SUPER_ADMIN_EMAIL,
  );
  if (!superAdminExists) {
    admins.push({
      firstName: "Super",
      lastName: "Admin",
      fullName: "Super Admin",
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      isSuperAdmin: true,
      level: 6,
      permissions: { ...DEFAULT_PERMISSIONS },
    });
    localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
  }
}

function getAdmins() {
  const d = localStorage.getItem(ADMINS_KEY);
  const parsed = safeParseStoredJson(d, []);
  return Array.isArray(parsed)
    ? parsed.map((admin) => normalizeAdminRecord(admin))
    : [];
}

function getReports() {
  const d = localStorage.getItem(REPORTS_KEY);
  const parsed = safeParseStoredJson(d, []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveReports(reports) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  if (BACKEND_ENABLED) {
    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reports,
        userEmail: appState.currentUser || null,
        site: currentSite,
      }),
    }).catch(() => {});
  }
  scheduleServerSync();
}

function loadReportsData() {
  if (!BACKEND_ENABLED) {
    return Promise.resolve(getReports());
  }

  return fetch(`/api/reports?site=${encodeURIComponent(currentSite)}`, {
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((reports) => {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports || []));
      return reports || [];
    })
    .catch(() => getReports());
}

/* ==================== NOTIFICATIONS ==================== */
function getNotificationStorageKey(site) {
  return getSiteStorageKey("cmax_planner_notifications", site);
}

function getNotificationsForSite(site = currentSite) {
  const stored = localStorage.getItem(getNotificationStorageKey(site));
  return safeParseStoredJson(stored, []) || [];
}

function saveNotificationsForSite(site, notifications) {
  localStorage.setItem(
    getNotificationStorageKey(site),
    JSON.stringify(notifications),
  );
  if (site === currentSite) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }
  if (!BACKEND_ENABLED) return Promise.resolve(true);
  return fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notifications,
      userEmail: appState.currentUser || null,
      site,
    }),
  })
    .then((res) => (res.ok ? true : Promise.reject()))
    .catch(() => {
      scheduleServerSync();
      return false;
    });
}

function loadNotificationsData(site = currentSite) {
  if (!BACKEND_ENABLED) {
    return Promise.resolve(getNotificationsForSite(site));
  }

  return fetch(`/api/notifications?site=${encodeURIComponent(site)}`, {
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((notifications) => {
      const list = Array.isArray(notifications) ? notifications : [];
      localStorage.setItem(
        getNotificationStorageKey(site),
        JSON.stringify(list),
      );
      if (site === currentSite) {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
        updateNotificationsBadge();
      }
      return list;
    })
    .catch(() =>
      fetch("/api/state", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          serverStateVersion = Number(data?.version) || serverStateVersion || 1;
          const state = data?.state;
          const list =
            state &&
            state.siteData &&
            state.siteData[site] &&
            Array.isArray(state.siteData[site].notifications)
              ? state.siteData[site].notifications
              : getNotificationsForSite(site);
          localStorage.setItem(
            getNotificationStorageKey(site),
            JSON.stringify(list),
          );
      if (site === currentSite) {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
        updateNotificationsBadge();
      }
      return list;
    })
        .catch(() => getNotificationsForSite(site)),
    );
}

function getNextNotificationId() {
  const storedCounter = parseInt(
    localStorage.getItem(NOTIFICATIONS_COUNTER_KEY) || "0",
    10,
  );
  let maxId = Number.isFinite(storedCounter) ? storedCounter : 0;
  (sites || []).forEach((site) => {
    const list = getNotificationsForSite(site);
    list.forEach((item) => {
      const idNum = Number(item?.id || 0);
      if (Number.isFinite(idNum)) {
        maxId = Math.max(maxId, idNum);
      }
    });
  });
  const nextId = maxId + 1;
  localStorage.setItem(NOTIFICATIONS_COUNTER_KEY, String(nextId));
  return nextId;
}

function formatNotificationId(id) {
  const num = Number(id) || 0;
  return `#${String(num).padStart(5, "0")}`;
}

function getCurrentNotificationAuthor() {
  return appState.currentUserName || appState.currentUser || "Unknown";
}

function renderNotificationSiteOptions() {
  const container = document.getElementById("notificationSites");
  if (!container) return;
  container.innerHTML = "";
  const sortedSites = getAccessibleSites()
    .slice()
    .sort((a, b) => a.localeCompare(b, "hr"));
  sortedSites.forEach((site) => {
    const label = document.createElement("label");
    label.className = "notification-site-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = site;
    checkbox.checked = site === currentSite;
    label.appendChild(checkbox);
    const span = document.createElement("span");
    span.textContent = site;
    label.appendChild(span);
    container.appendChild(label);
  });
}

function renderNotificationFilterSites() {
  const select = document.getElementById("notificationFilterSite");
  if (!select) return;
  const accessible = getAccessibleSites();
  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = t("filterAll") || "Sve";
  select.appendChild(allOption);
  accessible
    .slice()
    .sort((a, b) => a.localeCompare(b, "hr"))
    .forEach((site) => {
      const option = document.createElement("option");
      option.value = site;
      option.textContent = site;
      select.appendChild(option);
    });
}

function renderNotificationImagePreview(files) {
  const preview = document.getElementById("notificationImagePreview");
  if (!preview) return;
  preview.innerHTML = "";
  if (!files || !files.length) return;
  Array.from(files).forEach((file) => {
    const img = document.createElement("img");
    img.alt = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    preview.appendChild(img);
  });
}

function uploadNotificationImages(files) {
  const fileList = Array.from(files || []);
  if (!fileList.length) return Promise.resolve([]);

  const normalizeUploadUrl = (fileInfo) => {
    if (!fileInfo) return "";
    let url = fileInfo.url || fileInfo.path || fileInfo.filename || "";
    if (!url) return "";
    if (typeof url !== "string") return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/uploads/")) return url;
    if (url.includes("uploads")) {
      const idx = url.lastIndexOf("uploads");
      if (idx >= 0) {
        const tail = url
          .slice(idx + "uploads".length)
          .replace(/\\/g, "/")
          .replace(/^\/+/, "");
        return `/uploads/${tail}`;
      }
    }
    return url.replace(/\\/g, "/");
  };

  if (!BACKEND_ENABLED) {
    return Promise.all(
      fileList.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({ url: reader.result, name: file.name });
            };
            reader.readAsDataURL(file);
          }),
      ),
    );
  }

  return Promise.all(
    fileList.map((file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userEmail", appState.currentUser || "");
      return fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const fileInfo = (data && data.file) || data || null;
          const url = normalizeUploadUrl(fileInfo);
          return { url, name: (fileInfo && fileInfo.originalName) || file.name };
        })
        .catch((err) => {
          console.error("Image upload failed:", err);
          return { url: "", name: file.name };
        });
    }),
  );
}

function renderNotificationsList() {
  const container = document.getElementById("notificationsList");
  if (!container) return;
  const siteFilter = document.getElementById("notificationFilterSite")?.value || "";
  const searchText = (document.getElementById("notificationSearch")?.value || "").trim().toLowerCase();
  const pinnedOnly = document.getElementById("notificationPinnedOnly")?.checked === true;

  const sourceSites = siteFilter ? [siteFilter] : getAccessibleSites();
  let notifications = [];
  sourceSites.forEach((site) => {
    const list = getNotificationsForSite(site);
    list.forEach((note) => {
      notifications.push({ ...note, site });
    });
  });

  notifications = notifications
    .filter((note) => (pinnedOnly ? !!note.pinned : true))
    .filter((note) => {
      if (!searchText) return true;
      const text = `${note.message || ""}`.toLowerCase();
      return text.includes(searchText);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!notifications.length) {
    container.innerHTML = `<div class="notification-empty">${escapeHtml(t("notificationsEmpty"))}</div>`;
    return;
  }

  container.innerHTML = "";
  notifications.forEach((note) => {
    const card = document.createElement("div");
    card.className = "notification-card";

    const author = document.createElement("div");
    author.className = "notification-author";
    author.textContent = note.authorName || note.createdBy || "Unknown";
    card.appendChild(author);

    const title = document.createElement("h4");
    title.textContent = `${note.pinned ? "📌 " : ""}Post ${formatNotificationId(note.id)}`;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "notification-meta";
    const siteLabel = note.site ? ` • ${note.site}` : "";
    meta.textContent = `${new Date(note.createdAt).toLocaleString(getCurrentLocale())}${siteLabel}`;
    card.appendChild(meta);

    if (note.message) {
      const body = document.createElement("div");
      body.className = "notification-body";
      body.textContent = note.message;
      card.appendChild(body);
    }

    if (Array.isArray(note.images) && note.images.length) {
      const imagesWrap = document.createElement("div");
      imagesWrap.className = "notification-images";
      note.images.forEach((img, idx) => {
        const imageEl = document.createElement("img");
        imageEl.src = img.url;
        imageEl.alt = img.name || "notification";
        imageEl.addEventListener("click", () => {
          openNotificationViewer(
            note.images.map((i) => i.url),
            idx,
          );
        });
        imagesWrap.appendChild(imageEl);
      });
      card.appendChild(imagesWrap);
    }

    if (canManageNotificationsAccess() || canDeleteNotificationsAccess()) {
      const actions = document.createElement("div");
      actions.className = "notification-actions";
      if (canManageNotificationsAccess()) {
        const pinBtn = document.createElement("button");
        pinBtn.className = "btn btn-small";
        pinBtn.textContent = note.pinned ? "Unpin" : "Pin";
        pinBtn.addEventListener("click", () => {
          toggleNotificationPin(note.id, note.site, !note.pinned);
        });
        actions.appendChild(pinBtn);
      }
      if (canDeleteNotificationsAccess()) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-small btn-danger";
        deleteBtn.textContent = t("btnDeleteNotification");
        deleteBtn.addEventListener("click", () => {
          deleteNotification(note.id, note.site);
        });
        actions.appendChild(deleteBtn);
      }
      card.appendChild(actions);
    }

    container.appendChild(card);
  });
}

function resetNotificationComposer() {
  const textEl = document.getElementById("notificationText");
  if (textEl) textEl.value = "";
  const fileInput = document.getElementById("notificationImages");
  if (fileInput) fileInput.value = "";
  const preview = document.getElementById("notificationImagePreview");
  if (preview) preview.innerHTML = "";
  renderNotificationSiteOptions();
}

function submitNotification() {
  if (!canManageNotificationsAccess()) {
    showToast(t("accessNotificationsDenied"), "error");
    return;
  }
  const textEl = document.getElementById("notificationText");
  const message = (textEl?.value || "").trim();
  const fileInput = document.getElementById("notificationImages");
  const files = fileInput?.files ? Array.from(fileInput.files) : [];

  if (files.length > 2) {
    showToast(t("notificationTooManyImages"), "error");
    return;
  }

  const siteContainer = document.getElementById("notificationSites");
  const selectedSites = [];
  if (siteContainer) {
    siteContainer
      .querySelectorAll("input[type='checkbox']")
      .forEach((cb) => {
        if (cb.checked) selectedSites.push(cb.value);
      });
  }

  if (!selectedSites.length) {
    const accessibleSites = getAccessibleSites();
    if (accessibleSites.includes(currentSite)) {
      selectedSites.push(currentSite);
    } else {
      showToast(t("notificationSitesError"), "error");
      return;
    }
  }

  if (!message && files.length === 0) {
    showToast(t("notificationEmptyError"), "error");
    return;
  }

  const postId = getNextNotificationId();
  const createdAt = new Date().toISOString();
  const authorName = getCurrentNotificationAuthor();

  withLoadingPromise("loadingNotificationUpload", () =>
    uploadNotificationImages(files).then((uploadedImages) => {
      const images = (uploadedImages || []).filter((img) => img.url);
      if (files.length && images.length === 0) {
        showToast(t("notificationUploadFailed"), "error");
      }
      if (!message && images.length === 0) {
        showToast(t("notificationUploadFailed"), "error");
        return;
      }
      const baseNotification = {
        id: postId,
        createdAt,
        authorName,
        message,
        images,
        sites: [...selectedSites],
      };

      const savePromises = selectedSites.map((site) => {
        const list = getNotificationsForSite(site);
        list.unshift({ ...baseNotification, site });
        return saveNotificationsForSite(site, list);
      });

      addLog("Objavio obavijest", `Post ${formatNotificationId(postId)}`);

      return Promise.all(savePromises).then(() => {
        trackEditActivity();
        syncServerState().catch(() => {});
        showToast(t("notificationPosted"), "success");
        resetNotificationComposer();
        if (selectedSites.includes(currentSite)) {
          renderNotificationsList();
        }
      });
    }),
  );
}

function deleteNotification(notificationId, site = currentSite) {
  if (!canDeleteNotificationsAccess()) {
    showToast(t("accessNotificationsDenied"), "error");
    return;
  }
  showConfirm(t("confirmDeleteNotification"), null, "⚠️", () => {
    const list = getNotificationsForSite(site);
    const next = list.filter((n) => n.id !== notificationId);
    saveNotificationsForSite(site, next).then(() => {
      trackEditActivity();
      showToast(t("notificationDeleted"), "success");
      renderNotificationsList();
      syncServerState().catch(() => {});
      addLog("Obrisao obavijest", `Post ${formatNotificationId(notificationId)}`);
    });
  });
}

function toggleNotificationPin(notificationId, site = currentSite, pinned = true) {
  if (!canManageNotificationsAccess()) return;
  const list = getNotificationsForSite(site);
  const idx = list.findIndex((n) => n.id === notificationId);
  if (idx === -1) return;
  list[idx].pinned = pinned;
  saveNotificationsForSite(site, list).then(() => {
    trackEditActivity();
    renderNotificationsList();
  });
}

function showNotifications() {
  if (!canAccessNotificationsModule()) {
    showToast(t("accessNotificationsDenied"), "error");
    return;
  }
  withLoading("loadingNotifications", () => {
    const plannerSection = document.getElementById("planner-section");
    const listsContainer = document.querySelector(".lists-container");
    const binsSection = document.getElementById("binsSection");
    const tidplanSection = document.getElementById("tidplan-section");
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");
    const warehouseLogsSection = document.getElementById("warehouse-logs-section");
    const warehouseGraphSection = document.getElementById("warehouse-graph-section");

    if (tidplanSection) tidplanSection.style.display = "none";
    if (plannerSection) plannerSection.style.display = "none";
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "none";
    if (notificationsSection) notificationsSection.style.display = "block";

    currentView = "notifications";
    saveCurrentView("notifications");
    pushRouteForView("notifications");

    Promise.all(getAccessibleSites().map((site) => loadNotificationsData(site)))
      .then(() => {
        renderNotificationSiteOptions();
        renderNotificationFilterSites();
        renderNotificationsList();
        const composer = document.getElementById("notificationsComposer");
        if (composer) {
          composer.style.display = canManageNotificationsAccess() ? "block" : "none";
        }
        const currentList = getNotificationsForSite(currentSite);
        markNotificationsRead(currentList);
        updateNotificationsBadge();
      })
      .catch(() => {
        renderNotificationsList();
      });

    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  });
}

function openNotificationViewer(images, startIndex = 0) {
  if (!Array.isArray(images) || !images.length) return;
  notificationViewerImages = images.slice();
  notificationViewerIndex = Math.max(0, Math.min(startIndex, images.length - 1));
  updateNotificationViewer();
  const viewer = document.getElementById("notificationImageViewer");
  if (viewer) viewer.style.display = "flex";
}

function updateNotificationViewer() {
  const imgEl = document.getElementById("notificationViewerImage");
  const prevBtn = document.getElementById("notificationViewerPrev");
  const nextBtn = document.getElementById("notificationViewerNext");
  if (imgEl) {
    imgEl.src = notificationViewerImages[notificationViewerIndex] || "";
  }
  const disableNav = notificationViewerImages.length <= 1;
  if (prevBtn) prevBtn.disabled = disableNav;
  if (nextBtn) nextBtn.disabled = disableNav;
}

function closeNotificationViewer() {
  const viewer = document.getElementById("notificationImageViewer");
  if (viewer) viewer.style.display = "none";
  notificationViewerImages = [];
  notificationViewerIndex = 0;
}

function prevNotificationImage() {
  if (!notificationViewerImages.length) return;
  notificationViewerIndex =
    (notificationViewerIndex - 1 + notificationViewerImages.length) %
    notificationViewerImages.length;
  updateNotificationViewer();
}

function nextNotificationImage() {
  if (!notificationViewerImages.length) return;
  notificationViewerIndex =
    (notificationViewerIndex + 1) % notificationViewerImages.length;
  updateNotificationViewer();
}

/* ==================== SURVEYS ==================== */
let surveysCache = [];

function getSurveyReadKey() {
  return `cmax_surveys_read_${currentSite}_${getCurrentUserEmail() || "guest"}`;
}

function getCurrentUserEmail() {
  const savedAuth = safeParseStoredJson(localStorage.getItem(AUTH_KEY), {}) || {};
  return (appState.currentUser || savedAuth.email || "").toString().trim().toLowerCase();
}

function getReadSurveyIds() {
  return safeParseStoredJson(localStorage.getItem(getSurveyReadKey()), []) || [];
}

function markSurveysRead(surveys = surveysCache) {
  const next = new Set(getReadSurveyIds());
  (surveys || []).forEach((survey) => {
    if (survey?.id) next.add(survey.id);
  });
  localStorage.setItem(getSurveyReadKey(), JSON.stringify(Array.from(next)));
  updateSurveysBadge();
}

function getUnreadSurveysCount() {
  if (!hasPermission("canViewSurveys")) return 0;
  const readIds = new Set(getReadSurveyIds());
  return (surveysCache || []).filter((survey) => survey?.id && !readIds.has(survey.id)).length;
}

function updateSurveysBadge() {
  const badge = document.getElementById("surveysNotifBadge");
  if (!badge) return;
  const count = getUnreadSurveysCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-flex" : "none";
}

function getSurveysList() {
  if (!BACKEND_ENABLED) return Promise.resolve(surveysCache);

  return fetch(`/api/surveys?site=${encodeURIComponent(currentSite)}`, {
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      const surveys = Array.isArray(data.surveys) ? data.surveys : [];
      surveysCache = surveys;
      updateSurveysBadge();
      return surveys;
    })
    .catch(() => {
      updateSurveysBadge();
      return surveysCache;
    });
}

function submitSurvey() {
  if (!hasAdminPermission("canCreateSurveys") || !hasAdminPermission("canPublishSurveys")) {
    showToast("Nemate dozvolu za objavu anketa.", "error");
    return;
  }

  const question = (document.getElementById("surveyQuestion")?.value || "").trim();
  const imageFile = document.getElementById("surveyImage")?.files[0];
  const startDate = document.getElementById("surveyStartDate")?.value;
  const startTime = document.getElementById("surveyStartTime")?.value;
  const endDate = document.getElementById("surveyEndDate")?.value;
  const endTime = document.getElementById("surveyEndTime")?.value;
  
  if (!question) {
    showToast("Molim unesite pitanje.", "error");
    return;
  }

  if (!startDate || !startTime || !endDate || !endTime) {
    showToast("Molim postavite datum i vrijeme početka i kraja.", "error");
    return;
  }

  // Collect answers
  const answersContainer = document.getElementById("surveyAnswers");
  const answers = [];
  if (answersContainer) {
    answersContainer.querySelectorAll("input[type='text']").forEach((input) => {
      const answer = input.value.trim();
      if (answer) answers.push(answer);
    });
  }

  if (answers.length < 2) {
    showToast("Molim dodajte najmanje 2 odgovora.", "error");
    return;
  }

  // Collect target users with construction site grouping
  const targetAll = document.getElementById("surveyTargetAll")?.checked === true;
  const targetSite = document.getElementById("surveyTargetSite")?.checked === true;
  const targetUsers = [];

  const usersContainer = document.getElementById("surveyTargetUsersCheckboxes");
  if (usersContainer) {
    usersContainer.querySelectorAll("input[data-survey-user]:checked").forEach((cb) => {
      const email = cb.value.trim().toLowerCase();
      if (email && !targetUsers.includes(email)) {
        targetUsers.push(email);
      }
    });
  }

  if (!targetAll && !targetSite && targetUsers.length === 0) {
    showToast("Molim odaberite barem jednu osobu ili cijelo gradilište.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("question", question);
  formData.append("answers", JSON.stringify(answers));
  formData.append("startDate", startDate);
  formData.append("startTime", startTime);
  formData.append("endDate", endDate);
  formData.append("endTime", endTime);
  formData.append("timezoneOffset", String(new Date().getTimezoneOffset()));
  formData.append("targetAll", targetAll);
  formData.append("targetSite", targetSite);
  formData.append("targetUsers", JSON.stringify(targetUsers));
  formData.append("privacy", document.getElementById("surveyPrivacy")?.value || "semiAnonymous");
  formData.append("site", currentSite);
  
  if (imageFile) {
    formData.append("image", imageFile);
  }

  withLoadingPromise("loadingNotificationUpload", () =>
    fetch("/api/surveys", {
      method: "POST",
      body: formData,
    })
      .then((res) =>
        res.ok
          ? res.json()
          : res
              .json()
              .catch(() => ({}))
              .then((data) => Promise.reject(new Error(data.error || "SURVEY_SAVE_FAILED"))),
      )
      .then(() => {
        showToast("Anketa je objavljena!", "success");
        resetSurveyForm();
        return getSurveysList();
      })
      .then(() => {
        renderSurveysList();
      })
      .catch((err) => {
        console.error("Greška pri objavi ankete:", err);
        showToast("Greška pri objavi ankete.", "error");
      })
  );
}

function resetSurveyForm() {
  document.getElementById("surveyQuestion").value = "";
  document.getElementById("surveyImage").value = "";
  document.getElementById("surveyStartDate").value = "";
  document.getElementById("surveyStartTime").value = "";
  document.getElementById("surveyEndDate").value = "";
  document.getElementById("surveyEndTime").value = "";
  const answersContainer = document.getElementById("surveyAnswers");
  if (answersContainer) answersContainer.innerHTML = "";
  document.getElementById("surveyTargetAll").checked = false;
  document.getElementById("surveyTargetSite").checked = false;
  renderSurveyTargetUsers();
}

function addSurveyAnswerField() {
  const container = document.getElementById("surveyAnswers");
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.marginBottom = "8px";
  wrapper.style.gap = "8px";
  wrapper.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-group";
  input.style.flex = "1";
  input.style.padding = "10px 12px";
  input.style.border = "2px solid var(--border-color)";
  input.style.borderRadius = "8px";
  input.style.fontSize = "14px";
  input.style.backgroundColor = "var(--input-bg)";
  input.style.color = "var(--text-dark)";
  input.placeholder = "Odgovor...";

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn btn-danger btn-small";
  removeBtn.textContent = "Ukloni";
  removeBtn.onclick = () => wrapper.remove();

  wrapper.appendChild(input);
  wrapper.appendChild(removeBtn);
  container.appendChild(wrapper);
}

function renderSurveyTargetUsers() {
  const container = document.getElementById("surveyTargetUsersCheckboxes");
  if (!container) return;
  container.innerHTML = "";

  const admins = getAdmins()
    .filter((admin) => admin?.email)
    .map((admin) => ({
      email: String(admin.email || "").trim().toLowerCase(),
      name: admin.fullName || `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.email,
      sites: Array.isArray(admin.allowedSites) && admin.allowedSites.length ? admin.allowedSites : (sites || []),
      isSuperAdmin: admin.isSuperAdmin === true,
    }))
    .filter((admin, index, list) => admin.email && list.findIndex((entry) => entry.email === admin.email) === index)
    .sort((a, b) => compareNaturally(a.name, b.name));

  const hint = document.getElementById("surveyCurrentSiteHint");
  if (hint) hint.textContent = `${t("tidplanSiteSelector")}: ${currentSite}`;

  if (!admins.length) {
    container.innerHTML = `<div class="notification-empty">Nema korisnika za odabir.</div>`;
    return;
  }

  admins.forEach((user) => {
    const label = document.createElement("label");
    label.className = "survey-user-row";
    label.dataset.sites = (user.sites || []).join("|");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = user.email;
    checkbox.dataset.surveyUser = "true";
    checkbox.dataset.siteMember = user.isSuperAdmin || (user.sites || []).includes(currentSite) ? "true" : "false";

    const name = document.createElement("span");
    name.className = "survey-user-name";
    name.textContent = user.name;

    const userSites = document.createElement("span");
    userSites.className = "survey-user-site";
    userSites.textContent = user.isSuperAdmin ? "Sva gradilista" : (user.sites || []).join(", ");

    label.appendChild(checkbox);
    label.appendChild(name);
    label.appendChild(userSites);
    container.appendChild(label);
  });

  syncSurveyTargetSelection();
}

function setSurveyUserCheckboxes(predicate) {
  document
    .querySelectorAll("#surveyTargetUsersCheckboxes input[data-survey-user]")
    .forEach((checkbox) => {
      checkbox.checked = Boolean(predicate(checkbox));
    });
}

function syncSurveyTargetSelection() {
  const targetAll = document.getElementById("surveyTargetAll")?.checked === true;
  const targetSite = document.getElementById("surveyTargetSite")?.checked === true;
  if (targetAll) {
    setSurveyUserCheckboxes(() => true);
  } else if (targetSite) {
    setSurveyUserCheckboxes((checkbox) => checkbox.dataset.siteMember === "true");
  }
}

function setupSurveyTargetHandlers() {
  const targetAll = document.getElementById("surveyTargetAll");
  const targetSite = document.getElementById("surveyTargetSite");
  if (targetAll && !targetAll.dataset.boundSurveyTargets) {
    targetAll.dataset.boundSurveyTargets = "true";
    targetAll.addEventListener("change", () => {
      if (targetAll.checked && targetSite) targetSite.checked = false;
      if (targetAll.checked) setSurveyUserCheckboxes(() => true);
      else setSurveyUserCheckboxes(() => false);
    });
  }
  if (targetSite && !targetSite.dataset.boundSurveyTargets) {
    targetSite.dataset.boundSurveyTargets = "true";
    targetSite.addEventListener("change", () => {
      if (targetSite.checked && targetAll) targetAll.checked = false;
      if (targetSite.checked) setSurveyUserCheckboxes((checkbox) => checkbox.dataset.siteMember === "true");
      else setSurveyUserCheckboxes(() => false);
    });
  }
}

function renderSurveysList() {
  const container = document.getElementById("surveysList");
  if (!container) return;

  getSurveysList().then((surveys) => {
    if (!surveys || surveys.length === 0) {
      container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-light);">Nema objavljenih anketa.</div>`;
      return;
    }

    container.innerHTML = "";

    surveys.forEach((survey) => {
      const card = document.createElement("div");
      card.className = "notification-card";
      card.style.marginBottom = "16px";

      // Header with pin status
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.marginBottom = "12px";

      const title = document.createElement("h4");
      title.textContent = `${survey.pinned ? "📌 " : ""}Anketa: ${survey.question?.substring(0, 50)}...`;
      header.appendChild(title);

      card.appendChild(header);

      // Time window
      const times = document.createElement("div");
      times.style.fontSize = "12px";
      times.style.color = "var(--text-light)";
      times.style.marginBottom = "8px";

      const startDate = new Date(survey.startAt);
      const endDate = new Date(survey.endAt);
      const now = new Date();

      let statusText = "";
      if (now < startDate) {
        statusText = `Počinje: ${startDate.toLocaleString(getCurrentLocale())}`;
      } else if (now > endDate) {
        statusText = `Završena`;
      } else {
        statusText = `Aktivna do: ${endDate.toLocaleString(getCurrentLocale())}`;
      }

      times.textContent = statusText;
      card.appendChild(times);

      const author = document.createElement("div");
      author.className = "survey-author";
      author.textContent = `Objavio: ${survey.createdByName || survey.createdBy || "-"}`;
      card.appendChild(author);

      // Answers
      if (survey.answers && survey.answers.length > 0) {
        const answersDiv = document.createElement("div");
        answersDiv.style.marginBottom = "12px";

        if (survey.active && !survey.myVote) {
          const subtitle = document.createElement("div");
          subtitle.style.fontSize = "14px";
          subtitle.style.marginBottom = "8px";
          subtitle.textContent = "Odaberi odgovor:";
          answersDiv.appendChild(subtitle);

          survey.answers.forEach((answer) => {
            const label = document.createElement("label");
            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.marginBottom = "6px";
            label.style.cursor = "pointer";
            label.style.padding = "8px";
            label.style.borderRadius = "6px";
            label.style.backgroundColor = "var(--hover-bg)";

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = `survey_${survey.id}`;
            radio.value = answer.id;
            radio.style.marginRight = "8px";
            radio.addEventListener("change", () => {
              voteSurvey(survey.id, answer.id);
            });

            label.appendChild(radio);
            const span = document.createElement("span");
            span.textContent = answer.text;
            label.appendChild(span);
            answersDiv.appendChild(label);
          });
        } else if (survey.results && survey.results.length > 0) {
          const resultsTitle = document.createElement("div");
          resultsTitle.style.fontSize = "14px";
          resultsTitle.style.fontWeight = "600";
          resultsTitle.style.marginBottom = "8px";
          resultsTitle.textContent = survey.myVote ? "Moj odgovor: " + (survey.results.find(r => r.id === survey.myVote)?.text || "?") : "Rezultati:";
          answersDiv.appendChild(resultsTitle);

          survey.results.forEach((result) => {
            const totalVotes = survey.results.reduce((sum, r) => sum + r.count, 0);
            const percentage = totalVotes > 0 ? Math.round((result.count / totalVotes) * 100) : 0;

            const resultDiv = document.createElement("div");
            resultDiv.style.marginBottom = "8px";

            const labelDiv = document.createElement("div");
            labelDiv.style.fontSize = "13px";
            labelDiv.style.marginBottom = "4px";
            labelDiv.textContent = `${result.text}: ${result.count} (${percentage}%)`;
            resultDiv.appendChild(labelDiv);

            const barDiv = document.createElement("div");
            barDiv.style.height = "6px";
            barDiv.style.backgroundColor = "var(--border-color)";
            barDiv.style.borderRadius = "3px";
            barDiv.style.overflow = "hidden";

            const fillDiv = document.createElement("div");
            fillDiv.style.height = "100%";
            fillDiv.style.width = `${percentage}%`;
            fillDiv.style.backgroundColor = "#4CAF50";
            barDiv.appendChild(fillDiv);
            resultDiv.appendChild(barDiv);

            answersDiv.appendChild(resultDiv);
          });
        }

        card.appendChild(answersDiv);
      }

      // Actions (pin/delete for admin level 6+)
      if (survey.canDelete || survey.canPin) {
        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";
        actions.style.marginTop = "12px";
        actions.style.borderTop = "1px solid var(--border-color)";
        actions.style.paddingTop = "12px";

        if (survey.canPin) {
          const pinBtn = document.createElement("button");
          pinBtn.className = "btn btn-small";
          pinBtn.textContent = survey.pinned ? "Ukloni pin" : "Piniraj";
          pinBtn.onclick = () => toggleSurveyPin(survey.id, !survey.pinned);
          actions.appendChild(pinBtn);
        }

        if (survey.canDelete) {
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "btn btn-small btn-danger";
          deleteBtn.textContent = "Obriši";
          deleteBtn.onclick = () => deleteSurvey(survey.id);
          actions.appendChild(deleteBtn);
        }

        card.appendChild(actions);
      }

      container.appendChild(card);
    });
  });
}

function voteSurvey(surveyId, answerId) {
  if (!BACKEND_ENABLED) return;

  fetch(`/api/surveys/${encodeURIComponent(surveyId)}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answerId,
      site: currentSite,
    }),
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then(() => {
      showToast("Hvala na glasanju!", "success");
      getSurveysList().then(() => renderSurveysList());
    })
    .catch(() => {
      showToast("Greška pri glasanju.", "error");
    });
}

function toggleSurveyPin(surveyId, pinned) {
  if (!BACKEND_ENABLED) return;

  fetch(`/api/surveys/${encodeURIComponent(surveyId)}/pin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pinned,
      site: currentSite,
    }),
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then(() => {
      getSurveysList().then(() => renderSurveysList());
    })
    .catch(() => {
      showToast("Greška pri promjeni statusa.", "error");
    });
}

function deleteSurvey(surveyId) {
  showConfirm("Jeste li sigurni da želite obrisati ovu anketu?", null, "⚠️", () => {
    if (!BACKEND_ENABLED) return;

    fetch(`/api/surveys/${encodeURIComponent(surveyId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site: currentSite,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        showToast("Anketa je obrisana!", "success");
        getSurveysList().then(() => renderSurveysList());
      })
      .catch(() => {
        showToast("Greška pri brisanju ankete.", "error");
      });
  });
}

function showSurveys() {
  if (!hasPermission("canViewSurveys")) {
    showToast("Nemate pristup anketama.", "error");
    return;
  }

  withLoading("loadingNotifications", () => {
    const plannerSection = document.getElementById("planner-section");
    const listsContainer = document.querySelector(".lists-container");
    const binsSection = document.getElementById("binsSection");
    const tidplanSection = document.getElementById("tidplan-section");
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");

    if (tidplanSection) tidplanSection.style.display = "none";
    if (plannerSection) plannerSection.style.display = "none";
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "block";

    currentView = "surveys";
    saveCurrentView("surveys");
    pushRouteForView("surveys");

    setupSurveyTargetHandlers();
    renderSurveyTargetUsers();
    initSurveyDateTimePickers();

    getSurveysList().then(() => {
      renderSurveysList();
      markSurveysRead(surveysCache);
      const composer = document.getElementById("surveysComposer");
      if (composer) {
        composer.style.display = hasAdminPermission("canPublishSurveys") ? "block" : "none";
      }
    });

    sendPresence(true).catch(() => {});
  });
}

function checkAuth() {
  const authData = localStorage.getItem(AUTH_KEY);
  if (!authData) {
    showLogin();
    return;
  }
  const auth = safeParseStoredJson(authData, null);
  if (!auth) {
    showLogin();
    return;
  }
  const now = new Date().getTime();
  if (now - auth.timestamp > 24 * 60 * 60 * 1000) {
    showLogin();
    return;
  }
  appState.isAdmin = auth.isAdmin;
  appState.isSuperAdmin = auth.isSuperAdmin;
  appState.isReadonly = auth.isReadonly;
  appState.currentUser = auth.email;
  if (appState.isAdmin && !appState.isReadonly && !appState.isSuperAdmin) {
    const stillExists = getAdmins().some(
      (admin) => admin.email === auth.email,
    );
    if (!stillExists) {
      handleAdminRemoval(getAdminRemovalNotice(auth.email));
      return;
    }
  }
  const matchedAdmin = normalizeAdminRecord(
    getAdmins().find((admin) => admin.email === auth.email) || {},
  );
  const resolvedLevel =
    Number(auth.level) ||
    matchedAdmin.level ||
    deriveLevelFromPermissions(auth.permissions || {});
  appState.adminLevel = resolvedLevel;
  appState.currentUserName =
    auth.fullName || matchedAdmin.fullName || "";
  appState.permissions = auth.isSuperAdmin
    ? { ...DEFAULT_PERMISSIONS }
    : clampPermissionsToLevel(auth.permissions || {}, resolvedLevel);
  appState.guestPermissions = getGuestPermissions();
  if (BACKEND_ENABLED) {
    fetch("/api/session", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("SESSION_INVALID");
        return res.json();
      })
      .then((data) => {
        if (data?.csrfToken) setCsrfToken(data.csrfToken);
        if (data?.auth) {
          const nextAuth = {
            ...auth,
            ...data.auth,
            permissions: data.auth.permissions || auth.permissions || {},
            level: data.auth.level || auth.level || resolvedLevel,
            timestamp: new Date().getTime(),
          };
          applyAuthData(nextAuth);
        }
        showMainApp();
      })
      .catch(() => {
        clearAuthSessionLocal();
        showLogin();
      });
    return;
  }
  showMainApp();
}

function showLogin() {
  pushRouteForView("login", { path: "/login", replace: true });
  document.getElementById("loginOverlay").style.display = "flex";
  document.getElementById("mainContainer").style.display = "none";
  renderPresence([]);
  stopPresenceTracking();
  stopReportsPolling();
  stopNotificationsPolling();
  stopSiteMetaRefresh();
  updateLangButtons();
}

function showMainApp() {
  if (window.location.pathname === "/login") {
    pushRouteForView("main", { path: "/home", replace: true });
  }
  document.getElementById("loginOverlay").style.display = "none";
  document.getElementById("mainContainer").style.display = "block";
  updateLangButtons();
  startPresenceTracking();
  startReportsPolling();
  startNotificationsPolling();
  startSiteMetaRefresh();
  if (hasPermission("canViewSurveys")) {
    getSurveysList().catch(() => {});
  } else {
    updateSurveysBadge();
  }

  document.getElementById("readonlyBadge").style.display = appState.isReadonly
    ? "inline-block"
    : "none";
  document.getElementById("guestLoginBtn").style.display = appState.isReadonly
    ? "inline-flex"
    : "none";

  if (appState.isReadonly) {
    document.getElementById("mainContainer").classList.add("readonly");
    hideEl("btnAddRow");
    hideEl("btnRemoveRow");
  } else {
    document.getElementById("mainContainer").classList.remove("readonly");
  }

  applyPermissionVisibility();

  document.getElementById("datePicker").value = appState.currentDate;
  reinitFlatpickr();
  updateNotifBadge();
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "inline-flex";
}
function hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
function setVisibility(id, v) {
  const el = document.getElementById(id);
  if (el) el.style.display = v ? "inline-flex" : "none";
}
function setElVisibility(id, v) {
  const el = document.getElementById(id);
  if (el) el.style.display = v ? "flex" : "none";
}

function showLoading(messageKey = "loadingDefault") {
  const overlay = document.getElementById("loadingOverlay");
  const text = document.getElementById("loadingText");
  if (text) text.textContent = t(messageKey);
  if (overlay) overlay.style.display = "flex";
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.style.display = "none";
}

function withLoading(messageKey, callback) {
  showLoading(messageKey);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        callback();
      } finally {
        hideLoading();
      }
    });
  });
}

function withLoadingPromise(messageKey, callback) {
  showLoading(messageKey);
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      hideLoading();
    });
}

function applyPermissionVisibility() {
  const canPlanner = canAccessPlannerModule();
  const canTidplan = canAccessTidplanModule();
  const canBins = canAccessBinsModule();
  const canWarehouse = canAccessWarehouseModule();
  const canWarehouseLogs = canViewWarehouseLogsSection();
  const canWarehouseGraph = canViewWarehouseAnalyticsSection();
  const canReports = canCreateReportsAccess();
  const canExportWarehouseAccess = canExportWarehouse();
  const canImportWarehouseAccess = canImportWarehouse();
  const canExportTidplanAccess = canExportTidplan();
  const canImportTidplanAccess = canImportTidplan();
  const canAdminPanel = canOpenAdminPanelAccess();
  const canManagePlannerRows = !appState.isReadonly && appState.isAdmin;

  setVisibility("btnPrint", hasPermission("canPrint"));
  setVisibility("btnExport", hasPermission("canExport"));
  setVisibility("btnClear", !appState.isReadonly && hasPermission("canClear") && canEditDate(appState.currentDate));
  setVisibility("btnReport", canReports);

  setVisibility("btnWarehouseExportExcel", canExportWarehouseAccess);
  setVisibility("btnWarehouseImportExcel", canImportWarehouseAccess);
  setVisibility("btnTidplanExportPdf", canExportTidplanAccess);
  setVisibility("btnTidplanImportPdf", canImportTidplanAccess);
  setVisibility("plannerExportDropdown", canExportPlanner());
  setVisibility("btnPlannerImportExcel", canImportPlanner());
  setVisibility("btnTidplan", canTidplan);
  setVisibility("btnBins", canBins);
  setVisibility("btnWarehouse", canWarehouse);
  setVisibility("btnNotifications", canAccessNotificationsModule());
  setVisibility("btnSurveys", hasPermission("canViewSurveys"));
  setVisibility("adminBtn", canAdminPanel);
  setVisibility("btnLogout", !appState.isReadonly);
  setVisibility("btnAddRow", canManagePlannerRows);
  setVisibility("btnRemoveRow", canManagePlannerRows);
  hide("btnSave");

  setElVisibility("workersControls", !appState.isReadonly && hasPermission("canManageWorkers"));
  setElVisibility("liftsControls", !appState.isReadonly && hasPermission("canManageLifts"));
  setElVisibility("momentsControls", !appState.isReadonly && hasPermission("canManageMoments"));
  setElVisibility("plansControls", !appState.isReadonly && hasPermission("canManagePlans"));
  setElVisibility("karnasControls", !appState.isReadonly && hasPermission("canManageKarnas"));

  // Admin panel specific permissions
  setVisibility("tabBtnBackup", canViewBackups());


  const planningSection = document.querySelector(".planning-section");
  const listsContainer = document.querySelector(".lists-container");
  const binsSection = document.getElementById("binsSection");
  const tidplanSection = document.getElementById("tidplan-section");
  const notificationsSection = document.getElementById("notifications-section");
  const surveysSection = document.getElementById("surveys-section");
  const warehouseSection = document.getElementById("warehouse-section");
  const warehouseLogsSection = document.getElementById("warehouse-logs-section");
  const warehouseGraphSection = document.getElementById("warehouse-graph-section");
  const accessNotice = document.getElementById("accessNotice");
  const canNotifications = canAccessNotificationsModule();

  if (currentView === "bins" && !canBins) {
    currentView = "main";
    if (binsSection) binsSection.classList.remove("active");
    const binsBtn = document.getElementById("btnBins");
    if (binsBtn) binsBtn.classList.remove("btn-success");
  }

  if (currentView === "notifications" && !canNotifications) {
    currentView = "main";
    if (notificationsSection) notificationsSection.style.display = "none";
  }

  if (currentView === "warehouse" && !canWarehouse) {
    currentView = "main";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  }

  if (currentView === "warehouseLogs" && !canWarehouseLogs) {
    currentView = canWarehouse ? "warehouse" : "main";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
  }

  if (currentView === "warehouseGraph" && !canWarehouseGraph) {
    currentView = canWarehouse ? "warehouse" : "main";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  }

  if (tidplanSection && tidplanSection.style.display === "block" && !canTidplan) {
    showPlanner();
  }

  if (currentView === "main") {
    if (planningSection) planningSection.classList.toggle("hidden", !canPlanner);
    if (listsContainer) listsContainer.classList.toggle("hidden", !canPlanner);
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  } else if (currentView === "bins") {
    if (planningSection) planningSection.classList.add("hidden");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.add("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  } else if (currentView === "notifications") {
    if (planningSection) planningSection.classList.add("hidden");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "block";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  } else if (["warehouse", "warehouseLogs", "warehouseGraph"].includes(currentView)) {
    if (planningSection) planningSection.classList.add("hidden");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = currentView === "warehouse" ? "block" : "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = currentView === "warehouseLogs" ? "block" : "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = currentView === "warehouseGraph" ? "block" : "none";
  }

  if (!canPlanner && currentView === "main") {
    if (canTidplan && (!tidplanSection || tidplanSection.style.display !== "block")) {
      showTidplan();
      return;
    }
    if (canBins) {
      toggleBinsView();
      return;
    }
    if (canNotifications) {
      showNotifications();
      return;
    }
    if (canWarehouse) {
      showWarehouse();
      return;
    }
  }

  if (accessNotice) {
    const hasAnyPrimaryModule = canPlanner || canTidplan || canBins || canNotifications || canWarehouse;
    accessNotice.style.display = hasAnyPrimaryModule ? "none" : "block";
  }

  setElVisibility("warehouseNavLogsBtn", canWarehouseLogs);
  setElVisibility("warehouseNavGraphBtn", canWarehouseGraph);
  setElVisibility("warehouseLogsGraphBtn", canWarehouseGraph);
  setElVisibility("warehouseGraphLogsBtn", canWarehouseLogs);
}

/* ==================== FLATPICKR INIT ==================== */
let fpInstance = null;

function reinitFlatpickr() {
  if (typeof flatpickr === "undefined") return;
  if (fpInstance) {
    fpInstance.destroy();
    fpInstance = null;
  }
  const locales = {
    hr: flatpickr.l10ns.hr,
    en: flatpickr.l10ns.default,
    sv: flatpickr.l10ns.sv,
  };
  fpInstance = flatpickr("#datePicker", {
    locale: locales[currentLang] || flatpickr.l10ns.default,
    dateFormat: "Y-m-d",
    defaultDate: appState.currentDate,
    disableMobile: false,
    allowInput: false,
    clickOpens: true,
    onChange: function (selectedDates, dateStr) {
      if (!dateStr) return;
      appState.currentDate = dateStr;
      ensureBinsDataForDate(dateStr);
      updateDateDisplay();
      applyPermissionVisibility();
      renderPlanningTable();
      renderWorkersList();
      renderLiftsList();
      renderMomensList();
      renderPlansList();
      renderKarnasList();
      if (currentView === "bins") renderBinsTable();
      if (document.getElementById("tidplan-section")?.style.display === "block") {
        loadTidplanData();
        updateTidplan();
      }
      updatePrintDate();
    },
  });
  const datePickerSection = document.querySelector(".date-picker-section");
  if (datePickerSection && !datePickerSection.dataset.boundOpenPicker) {
    datePickerSection.dataset.boundOpenPicker = "true";
    datePickerSection.addEventListener("click", () => {
      if (fpInstance) fpInstance.open();
    });
  }
}

function initSurveyDateTimePickers() {
  if (typeof flatpickr === "undefined") return;
  if (window.surveyDateTimePickers) {
    window.surveyDateTimePickers.forEach((picker) => picker.destroy());
  }
  window.surveyDateTimePickers = [];

  const locales = {
    hr: flatpickr.l10ns.hr,
    en: flatpickr.l10ns.default,
    sv: flatpickr.l10ns.sv,
  };
  const locale = locales[currentLang] || flatpickr.l10ns.default;

  ["surveyStartDate", "surveyEndDate"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    const picker = flatpickr(input, {
      locale,
      dateFormat: "Y-m-d",
      defaultDate: input.value || null,
      disableMobile: false,
      allowInput: false,
      clickOpens: true,
    });
    window.surveyDateTimePickers.push(picker);
  });

  ["surveyStartTime", "surveyEndTime"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    const picker = flatpickr(input, {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      time_24hr: true,
      minuteIncrement: 5,
      defaultDate: input.value || null,
      disableMobile: false,
      allowInput: false,
      clickOpens: true,
    });
    window.surveyDateTimePickers.push(picker);
  });

  document.querySelectorAll(".survey-inline-fields").forEach((wrapper) => {
    if (wrapper.dataset.boundSurveyPickerOpen) return;
    wrapper.dataset.boundSurveyPickerOpen = "true";
    wrapper.addEventListener("click", (event) => {
      const input = event.target.closest("input") || wrapper.querySelector("input");
      if (input && input._flatpickr) input._flatpickr.open();
    });
  });
}

/* ==================== TIDPLAN DATEPICKERS ==================== */
function initTidplanDatePickers() {
  // Destroy existing tidplan datepickers
  if (window.tidplanDatePickers) {
    window.tidplanDatePickers.forEach(picker => picker.destroy());
  }
  window.tidplanDatePickers = [];
  if (typeof flatpickr === "undefined") return;

  const locales = {
    hr: flatpickr.l10ns.hr,
    en: flatpickr.l10ns.default,
    sv: flatpickr.l10ns.sv,
  };

  // Initialize datepickers for all tidplan date inputs
  const dateInputs = document.querySelectorAll('.tidplan-table input[type="date"]');
  dateInputs.forEach(input => {
    const picker = flatpickr(input, {
      locale: locales[currentLang] || flatpickr.l10ns.default,
      dateFormat: "Y-m-d",
      altInput: false,
      altFormat: "Y-m-d",
      defaultDate: input.value || null,
      disableMobile: false,
      allowInput: true,
      clickOpens: true,
      onChange: function(selectedDates, dateStr, instance) {
        // Trigger the original onchange event
        const event = new Event('change', { bubbles: true });
        instance.input.dispatchEvent(event);
      }
    });
    window.tidplanDatePickers.push(picker);
  });
}

/* ==================== AUTH ==================== */
function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) {
    showToast(t("errEmailPassword"), "error");
    return;
  }

  showLoading("loadingLogin");
  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("LOGIN_FAILED");
      return res.json();
    })
    .then((data) => {
      if (!data || !data.auth) throw new Error("LOGIN_FAILED");
      const auth = data.auth;
      const level = Number(auth.level) || deriveLevelFromPermissions(auth.permissions || {});
      const perms = auth.permissions
        ? auth.isSuperAdmin
          ? { ...DEFAULT_PERMISSIONS }
          : clampPermissionsToLevel(auth.permissions || {}, level)
        : auth.isSuperAdmin
          ? { ...DEFAULT_PERMISSIONS }
          : clampPermissionsToLevel(appState.permissions || {}, level);
      const authData = {
        email: auth.email,
        fullName: auth.fullName || "",
        isAdmin: auth.isAdmin,
        isSuperAdmin: auth.isSuperAdmin,
        isReadonly: auth.isReadonly,
        permissions: perms,
        level,
        timestamp: new Date().getTime(),
      };
      setCsrfToken(data.csrfToken || "");
      applyAuthData(authData);
      addLog("Logged in");
      pushRouteForView("main", { path: "/home", replace: true });
      showMainApp();
      renderAll();
      hideLoading();
    })
    .catch(() => {
      showToast(t("errWrongCredentials"), "error");
      hideLoading();
    });
}

function enterReadonlyMode() {
  showLoading("loadingLogin");
  fetch("/api/login/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => {
      if (!res.ok) throw new Error("READONLY_FAILED");
      return res.json();
    })
    .then((data) => {
      const auth = data.auth || {};
      const authData = {
        email: auth.email || "readonly",
        fullName: auth.fullName || "",
        isAdmin: !!auth.isAdmin,
        isSuperAdmin: !!auth.isSuperAdmin,
        isReadonly: true,
        permissions: auth.permissions || {},
        level: auth.level || 1,
        timestamp: new Date().getTime(),
      };
      setCsrfToken(data.csrfToken || "");
      applyAuthData(authData);
      addLog("Entered read-only mode");
      pushRouteForView("main", { path: "/home", replace: true });
      showMainApp();
      renderAll();
      hideLoading();
    })
    .catch(() => {
      showToast("Read-only prijava nije uspjela.", "error");
      hideLoading();
    });
}

function switchToLogin() {
  sendPresence(false, true).catch(() => {});
  document.getElementById("loginOverlay").style.display = "flex";
  document.getElementById("mainContainer").style.display = "none";
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
  updateLangButtons();
}

function logout() {
  showConfirm(t("confirmLogout"), t("confirmLogoutTitle"), "🚪", () => {
    sendPresence(false, true).catch(() => {});
    fetch("/api/logout", { method: "POST" }).catch(() => {});
    clearAuthSessionLocal();
    appState.isAdmin = false;
    appState.isSuperAdmin = false;
    appState.isReadonly = false;
    appState.currentUser = null;
    appState.currentUserName = "";
    appState.adminLevel = 1;
    appState.permissions = normalizePermissions({});
    appState.guestPermissions = getGuestPermissions();
    showLogin();
  });
}

/* ==================== EVENT LISTENERS ==================== */
function setupEventListeners() {
  document
    .getElementById("loginPassword")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  document
    .getElementById("loginEmail")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleLogin();
    });

  const notificationImagesInput = document.getElementById("notificationImages");
  if (notificationImagesInput) {
    notificationImagesInput.addEventListener("change", () => {
      const files = Array.from(notificationImagesInput.files || []);
      if (files.length > 2) {
        showToast(t("notificationTooManyImages"), "error");
        notificationImagesInput.value = "";
        renderNotificationImagePreview([]);
        return;
      }
      renderNotificationImagePreview(files);
    });
  }

  const notificationFilterSite = document.getElementById("notificationFilterSite");
  if (notificationFilterSite) {
    notificationFilterSite.addEventListener("change", () => {
      renderNotificationsList();
    });
  }
  const notificationSearch = document.getElementById("notificationSearch");
  if (notificationSearch) {
    notificationSearch.addEventListener("input", () => {
      renderNotificationsList();
    });
  }
  const notificationPinnedOnly = document.getElementById("notificationPinnedOnly");
  if (notificationPinnedOnly) {
    notificationPinnedOnly.addEventListener("change", () => {
      renderNotificationsList();
    });
  }

  const newAdminLevel = document.getElementById("newAdminLevel");
  if (newAdminLevel) {
    newAdminLevel.addEventListener("change", () => {
      renderNewAdminPermissionsPanel();
    });
  }
}

/* ==================== DATE DISPLAY ==================== */
function updateDateDisplay() {
  const date = new Date(appState.currentDate + "T00:00:00");
  const locale =
    { hr: "hr-HR", en: "en-US", sv: "sv-SE" }[currentLang] || "hr-HR";
  const formatted = date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const el = document.getElementById("dateDisplay");
  if (el) el.textContent = formatted.toUpperCase();
  updatePrintDate();
}

function updatePrintDate() {
  const el = document.getElementById("printHeaderDate");
  if (el) {
    const date = new Date(appState.currentDate + "T00:00:00");
    const locale =
      { hr: "hr-HR", en: "en-US", sv: "sv-SE" }[currentLang] || "hr-HR";
    el.textContent =
      "CMAX SCM — " +
      date
        .toLocaleDateString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        .toUpperCase();
  }
}

function getCurrentLocale() {
  return { hr: "hr-HR", en: "en-US", sv: "sv-SE" }[currentLang] || "hr-HR";
}

function canUserPerformEdits() {
  if (appState.isReadonly) return false;
  if (appState.isAdmin) return true;
  if (appState.isSuperAdmin) return true;
  const editKeys = [
    "canManageWorkers",
    "canManageLifts",
    "canManageMoments",
    "canManagePlans",
    "canManageKarnas",
    "canManageTidplan",
    "canAddTidplanActivity",
    "canDeleteTidplanActivity",
    "canManageTidplanZones",
    "canEditBinsData",
    "canManageBinsPlans",
    "canManageBinsPermissions",
    "canManageNotifications",
    "canDeleteNotifications",
    "canCreateReports",
    "canApproveReports",
    "canDeleteReports",
    "canManageAdmins",
    "canManageSiteAccess",
    "canManageGuestAccess",
    "canClear",
    "canClearTidplan",
  ];
  return editKeys.some((key) => hasPermission(key));
}

function trackEditActivity() {
  if (!canUserPerformEdits()) return;
  lastEditAt = Date.now();
  const now = Date.now();
  if (
    BACKEND_ENABLED &&
    appState.currentUser &&
    appState.currentUser !== "readonly" &&
    now - lastPresenceEditPingAt >= PRESENCE_EDIT_PING_COOLDOWN_MS
  ) {
    lastPresenceEditPingAt = now;
    sendPresence(true).catch(() => {});
  }
}

function getPresenceMode() {
  if (!canUserPerformEdits()) return "viewing";
  return Date.now() - lastEditAt <= PRESENCE_EDITING_WINDOW_MS
    ? "editing"
    : "viewing";
}

function getPresenceView() {
  if (document.getElementById("tidplan-section")?.style.display === "block") {
    return "tidplan";
  }
  if (currentView === "notifications") {
    return "notifications";
  }
  if (currentView === "bins") {
    return "bins";
  }
  if (currentView === "warehouse") {
    return "warehouse";
  }
  if (currentView === "warehouseLogs") {
    return "warehouseLogs";
  }
  if (currentView === "warehouseGraph") {
    return "warehouseGraph";
  }
  return "planner";
}

function getPresenceInitials(email) {
  const base = (email || "?").split("@")[0].replace(/[^A-Za-z0-9]/g, "");
  return (base.slice(0, 2) || "?").toUpperCase();
}

function getPresenceDisplayName(email) {
  return email || "Unknown";
}

function renderPresence(users = []) {
  const strip = document.getElementById("presenceStrip");
  const list = document.getElementById("presenceList");
  if (!strip || !list) return;

  list.innerHTML = "";
  if (!users.length || !appState.currentUser || appState.currentUser === "readonly") {
    strip.style.display = "none";
    return;
  }

  users.forEach((user) => {
    const avatar = document.createElement("span");
    avatar.className = `presence-avatar ${user.mode === "viewing" ? "is-viewing" : "is-editing"}`;
    avatar.textContent = user.initials || getPresenceInitials(user.email);
    const statusLabel =
      user.mode === "viewing" ? t("presenceViewing") : t("presenceEditing");
    avatar.title = `${user.displayName || user.email} - ${statusLabel}`;
    list.appendChild(avatar);
  });

  strip.style.display = "inline-flex";
  appState.activePresenceCount = users.length;
}

function refreshPresence() {
  if (!BACKEND_ENABLED || !appState.currentUser || appState.currentUser === "readonly") {
    renderPresence([]);
    return Promise.resolve();
  }

  return fetch(`/api/presence?site=${encodeURIComponent(currentSite)}`, {
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      renderPresence(Array.isArray(data.users) ? data.users : []);
    })
    .catch(() => {
      renderPresence([]);
    });
}

function canRefreshSharedData() {
  return !appState.hasUnsavedChanges && !tidplanDataChanged;
}

function refreshSharedDataIfSafe() {
  if (!BACKEND_ENABLED || !canRefreshSharedData()) {
    return Promise.resolve(false);
  }

  return loadAllData()
    .then(() => {
      renderAll();
      if (currentView === "bins") {
        renderBinsTable();
      }
      if (currentView === "warehouse") {
        renderWarehousePage();
      }
      if (currentView === "warehouseLogs") {
        renderWarehouseLogsPage();
      }
      if (currentView === "warehouseGraph") {
        renderWarehouseGraphPage();
      }
      if (document.getElementById("tidplan-section")?.style.display === "block") {
        updateTidplan();
      }
      updateNotifBadge();
      return true;
    })
    .catch(() => false);
}

function syncSiteMetadata(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return Promise.resolve(false);

  if (snapshot.adminRemovalNotices) {
    saveAdminRemovalNotices(snapshot.adminRemovalNotices);
  }

  const snapshotSites =
    Array.isArray(snapshot.sites) && snapshot.sites.length
      ? snapshot.sites
      : ["default"];
  const nextSites = [...snapshotSites];
  const currentStillExists = nextSites.includes(currentSite);
  const nextCurrentSite = currentStillExists
    ? currentSite
    : snapshot.currentSite && nextSites.includes(snapshot.currentSite)
      ? snapshot.currentSite
      : nextSites[0];

  const sitesChanged =
    nextSites.length !== sites.length ||
    nextSites.some((site, index) => site !== sites[index]);
  const currentChanged = nextCurrentSite !== currentSite;

  if (
    Array.isArray(snapshot.admins) &&
    appState.currentUser &&
    !appState.isReadonly &&
    !appState.isSuperAdmin
  ) {
    const stillAdmin = snapshot.admins.some(
      (admin) => admin.email === appState.currentUser,
    );
    if (!stillAdmin) {
      handleAdminRemoval(getAdminRemovalNotice(appState.currentUser));
      return Promise.resolve(true);
    }
  }

  if (!sitesChanged && !currentChanged) {
    let metaChanged = false;

    if (Array.isArray(snapshot.admins)) {
      const normalizedAdmins = snapshot.admins.map((admin) => normalizeAdminRecord(admin));
      const currentAdmins = getAdmins();
      if (JSON.stringify(normalizedAdmins) !== JSON.stringify(currentAdmins)) {
        localStorage.setItem(ADMINS_KEY, JSON.stringify(normalizedAdmins));
        metaChanged = true;

        if (appState.currentUser && !appState.isReadonly) {
          const currentAdmin = normalizedAdmins.find(
            (admin) => admin.email === appState.currentUser,
          );
          if (currentAdmin) {
            const currentLevel = getAdminLevel(currentAdmin);
            appState.adminLevel = currentLevel;
            appState.permissions = currentAdmin.isSuperAdmin
              ? { ...DEFAULT_PERMISSIONS }
              : clampPermissionsToLevel(currentAdmin.permissions || {}, currentLevel);
            appState.currentUserName = currentAdmin.fullName || appState.currentUserName;

            const authData = safeParseStoredJson(localStorage.getItem(AUTH_KEY), null);
            if (authData) {
              authData.permissions = appState.permissions;
              authData.fullName = currentAdmin.fullName || authData.fullName || "";
              authData.isSuperAdmin = !!currentAdmin.isSuperAdmin;
              authData.level = currentLevel;
              localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
            }

            applyPermissionVisibility();
            if (document.getElementById("adminModal")?.style.display === "flex") {
              openAdminPanel();
            }
          } else if (!appState.isSuperAdmin && !appState.isReadonly) {
            handleAdminRemoval(getAdminRemovalNotice(appState.currentUser));
          }
        }
      }
    }


    if (snapshot.guestPermissions) {
      const normalizedGuestPermissions = normalizeGuestPermissions(snapshot.guestPermissions);
      if (
        JSON.stringify(normalizedGuestPermissions) !==
        JSON.stringify(getGuestPermissions())
      ) {
        localStorage.setItem(
          GUEST_PERMISSIONS_KEY,
          JSON.stringify(normalizedGuestPermissions),
        );
        appState.guestPermissions = normalizedGuestPermissions;
        metaChanged = true;
        if (appState.isReadonly) {
          applyPermissionVisibility();
        }
      }
    }

    if (snapshot.binPermissions) {
      const currentBinPermissions = appState.binPermissions || {};
      if (JSON.stringify(snapshot.binPermissions) !== JSON.stringify(currentBinPermissions)) {
        localStorage.setItem(BIN_PERMS_KEY, JSON.stringify(snapshot.binPermissions));
        appState.binPermissions = { ...snapshot.binPermissions };
        metaChanged = true;
      }
    }

    return Promise.resolve(metaChanged);
  }

  sites = nextSites;
  currentSite = nextCurrentSite;
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));
  localStorage.setItem(CURRENT_SITE_KEY, currentSite);
  STORAGE_KEY = getStorageKey("cmax_planner_data");
  BINS_KEY = getStorageKey("cmax_planner_bins");
  REPORTS_KEY = getStorageKey("cmax_planner_reports");

  populateSiteSelect();
  updateMainTitle();

  if (currentChanged) {
    return loadAllData()
      .then(() => {
        renderAll();
        updateNotifBadge();
        if (document.getElementById("tidplan-section")?.style.display === "block") {
          updateTidplan();
        }
        if (currentView === "warehouse") {
          renderWarehousePage();
        }
        if (currentView === "warehouseLogs") {
          renderWarehouseLogsPage();
        }
        if (currentView === "warehouseGraph") {
          renderWarehouseGraphPage();
        }
      })
      .then(() => true)
      .catch(() => false);
  }

  return Promise.resolve(true);
}

function refreshSiteMetadata() {
  if (!BACKEND_ENABLED) {
    return Promise.resolve(false);
  }

  return fetch("/api/state", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      serverStateVersion = Number(data?.version) || serverStateVersion || 1;
      return syncSiteMetadata(data?.state);
    })
    .then((changed) =>
      loadNotificationsData()
        .then(() => {
          if (currentView === "notifications") {
            renderNotificationsList();
          }
          return changed;
        })
        .catch(() => changed),
    )
    .catch(() => false);
}

function startSiteMetaRefresh() {
  stopSiteMetaRefresh();
  refreshSiteMetadata().catch(() => {});
  siteMetaRefreshInterval = setInterval(() => {
    refreshSiteMetadata().catch(() => {});
  }, 15000);
}

function stopSiteMetaRefresh() {
  if (siteMetaRefreshInterval) clearInterval(siteMetaRefreshInterval);
  siteMetaRefreshInterval = null;
}

function sendPresence(active = true, keepalive = false) {
  if (!BACKEND_ENABLED || !appState.currentUser || appState.currentUser === "readonly") {
    return Promise.resolve();
  }

  return fetch("/api/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive,
    body: JSON.stringify({
      sessionId: presenceSessionId,
      email: appState.currentUser,
      displayName: getPresenceDisplayName(appState.currentUser),
      initials: getPresenceInitials(appState.currentUser),
      mode: getPresenceMode(),
      currentSite,
      currentView: getPresenceView(),
      active,
    }),
  }).catch(() => {});
}

function startPresenceTracking() {
  stopPresenceTracking();
  if (!BACKEND_ENABLED || !appState.currentUser || appState.currentUser === "readonly") {
    return;
  }

  sendPresence(true).catch(() => {});
  refreshPresence().catch(() => {});
  presenceHeartbeatInterval = setInterval(() => {
    sendPresence(true).catch(() => {});
  }, 20000);
  presenceRefreshInterval = setInterval(() => {
    refreshPresence().catch(() => {});
  }, 20000);
}

function stopPresenceTracking() {
  if (presenceHeartbeatInterval) clearInterval(presenceHeartbeatInterval);
  if (presenceRefreshInterval) clearInterval(presenceRefreshInterval);
  presenceHeartbeatInterval = null;
  presenceRefreshInterval = null;
}

function startReportsPolling() {
  stopReportsPolling();
  if (!BACKEND_ENABLED || !hasAdminPermission("canViewReports")) return;

  loadReportsData()
    .then(() => {
      updateNotifBadge();
      if (document.getElementById("tabReports")?.classList.contains("active")) {
        renderReportsList(currentReportFilter);
      }
    })
    .catch(() => {});

  reportsRefreshInterval = setInterval(() => {
    loadReportsData()
      .then(() => {
        updateNotifBadge();
        if (document.getElementById("tabReports")?.classList.contains("active")) {
          renderReportsList(currentReportFilter);
        }
      })
      .catch(() => {});
  }, 20000);
}

function stopReportsPolling() {
  if (reportsRefreshInterval) clearInterval(reportsRefreshInterval);
  reportsRefreshInterval = null;
}

function startNotificationsPolling() {
  stopNotificationsPolling();
  if (!BACKEND_ENABLED || !canAccessNotificationsModule()) return;

  loadNotificationsData()
    .then(() => {
      if (currentView === "notifications") {
        renderNotificationsList();
        const currentList = getNotificationsForSite(currentSite);
        markNotificationsRead(currentList);
        updateNotificationsBadge();
      }
    })
    .catch(() => {});

  notificationsRefreshInterval = setInterval(() => {
    loadNotificationsData()
      .then(() => {
        if (currentView === "notifications") {
          renderNotificationsList();
          const currentList = getNotificationsForSite(currentSite);
          markNotificationsRead(currentList);
          updateNotificationsBadge();
        }
      })
      .catch(() => {});
  }, 20000);
}

function stopNotificationsPolling() {
  if (notificationsRefreshInterval) clearInterval(notificationsRefreshInterval);
  notificationsRefreshInterval = null;
}

/* ==================== CUSTOM DIALOG SYSTEM ==================== */
function normalizeText(value) {
  if (typeof value !== "string") return value;
  if (!/[ÃÂâÅÄ]/.test(value)) return value;
  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

function showAlert(message, icon, callback) {
  const overlay = document.getElementById("customDialogOverlay");
  document.getElementById("dialogIcon").textContent =
    normalizeText(icon || "\u26A0\uFE0F");
  document.getElementById("dialogMessage").textContent =
    normalizeText(message);
  document.getElementById("dialogInput").style.display = "none";

  const btns = document.getElementById("dialogButtons");
  btns.innerHTML = "";
  const okBtn = document.createElement("button");
  okBtn.className = "btn";
  okBtn.textContent = t("btnOk");
  okBtn.onclick = () => {
    overlay.style.display = "none";
    if (callback) callback();
  };
  btns.appendChild(okBtn);
  overlay.style.display = "flex";
}

function showConfirm(message, title, icon, onYes, onNo) {
  const overlay = document.getElementById("customDialogOverlay");
  document.getElementById("dialogIcon").textContent =
    normalizeText(icon || "\u2753");
  const safeTitle = normalizeText(title);
  const safeMessage = normalizeText(message);
  document.getElementById("dialogMessage").innerHTML =
    (safeTitle ? `<strong>${safeTitle}</strong><br><br>` : "") + safeMessage;
  document.getElementById("dialogInput").style.display = "none";

  const btns = document.getElementById("dialogButtons");
  btns.innerHTML = "";

  const noBtn = document.createElement("button");
  noBtn.className = "btn btn-secondary";
  noBtn.textContent = t("btnNo");
  noBtn.onclick = () => {
    overlay.style.display = "none";
    if (onNo) onNo();
  };

  const yesBtn = document.createElement("button");
  yesBtn.className = "btn";
  yesBtn.textContent = t("btnYes");
  yesBtn.onclick = () => {
    overlay.style.display = "none";
    if (onYes) onYes();
  };

  btns.appendChild(noBtn);
  btns.appendChild(yesBtn);
  overlay.style.display = "flex";
}

function showPromptDialog(message, icon, placeholder, callback) {
  const overlay = document.getElementById("customDialogOverlay");
  document.getElementById("dialogIcon").textContent =
    normalizeText(icon || "\u270F\uFE0F");
  document.getElementById("dialogMessage").textContent =
    normalizeText(message);

  const inp = document.getElementById("dialogInput");
  inp.style.display = "block";
  inp.value = "";
  inp.placeholder = placeholder || "";

  const btns = document.getElementById("dialogButtons");
  btns.innerHTML = "";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.textContent = t("btnCancel");
  cancelBtn.onclick = () => {
    overlay.style.display = "none";
    callback(null);
  };

  const okBtn = document.createElement("button");
  okBtn.className = "btn";
  okBtn.textContent = t("btnOk");
  okBtn.onclick = () => {
    overlay.style.display = "none";
    callback(inp.value.trim());
  };

  inp.onkeypress = (e) => {
    if (e.key === "Enter") {
      overlay.style.display = "none";
      callback(inp.value.trim());
    }
  };

  btns.appendChild(cancelBtn);
  btns.appendChild(okBtn);
  overlay.style.display = "flex";
  setTimeout(() => inp.focus(), 100);
}

/* ==================== TOAST NOTIFICATION ==================== */
function showToast(message, type = "default") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.textContent = normalizeText(message);
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/* ==================== MANAGE PANEL ==================== */
let currentManageCategory = null;

function openManagePanel(category) {
  currentManageCategory = category || null;
  document.getElementById("managePanelTitle").textContent =
    t("managePanelTitle");
  showManageStep(category ? 2 : 1);
  document.getElementById("managePanel").style.display = "flex";
}

function closeManagePanel() {
  document.getElementById("managePanel").style.display = "none";
  currentManageCategory = null;
}

function showManageStep(step) {
  document.getElementById("manageStep1").style.display =
    step === 1 ? "block" : "none";
  document.getElementById("manageStep2").style.display =
    step === 2 ? "block" : "none";
  document.getElementById("manageStepAdd").style.display =
    step === 3 ? "block" : "none";
  document.getElementById("manageStepRemove").style.display =
    step === 4 ? "block" : "none";

  if (step === 2 && currentManageCategory) {
    const names = {
      workers: t("mcWorkers"),
      lifts: t("mcLifts"),
      moments: t("mcMoments"),
      plans: t("mcPlans"),
      karnas: t("mcKarnas"),
    };
    document.getElementById("manageStep2Title").textContent =
      names[currentManageCategory] || "";
    document.getElementById("manageAddBtn").textContent =
      t("manageAddBtn");
    document.getElementById("manageRemoveBtn").textContent =
      t("manageRemoveBtn");
    const lbls = ["manageBackLbl", "manageBackLbl2", "manageBackLbl3"];
    lbls.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t("manageBack");
    });
  }
}

function manageSelectCategory(cat) {
  currentManageCategory = cat;
  showManageStep(2);
}

function manageGoBack(toStep) {
  if (toStep === 1) {
    currentManageCategory = null;
  }
  showManageStep(toStep);
  document.getElementById("manageAddResult").style.display = "none";
  document.getElementById("manageRemoveResult").style.display = "none";
}

function manageGoAdd() {
  const names = {
    workers: t("mcWorkers"),
    lifts: t("mcLifts"),
    moments: t("mcMoments"),
    plans: t("mcPlans"),
    karnas: t("mcKarnas"),
  };
  document.getElementById("manageAddTitle").textContent =
    names[currentManageCategory] || "";
  document.getElementById("manageAddLabel").textContent =
    t("manageAddLabel");
  document.getElementById("manageConfirmAddBtn").textContent =
    t("manageConfirmAdd");
  document.getElementById("manageAddInput").value = "";
  document.getElementById("manageAddResult").style.display = "none";
  showManageStep(3);
  setTimeout(
    () => document.getElementById("manageAddInput").focus(),
    100,
  );
}

function manageGoRemove() {
  const names = {
    workers: t("mcWorkers"),
    lifts: t("mcLifts"),
    moments: t("mcMoments"),
    plans: t("mcPlans"),
    karnas: t("mcKarnas"),
  };
  document.getElementById("manageRemoveTitle").textContent =
    names[currentManageCategory] || "";
  document.getElementById("manageRemoveHint").textContent =
    t("manageRemoveHint");
  document.getElementById("manageRemoveResult").style.display = "none";
  renderManageRemoveList();
  showManageStep(4);
}

function manageDoAdd() {
  const input = document.getElementById("manageAddInput");
  const name = input.value.trim();
  const resultEl = document.getElementById("manageAddResult");

  if (!name) {
    resultEl.textContent = t("manageErrEmpty");
    resultEl.className = "manage-result error";
    resultEl.style.display = "block";
    return;
  }

  const list = appState[currentManageCategory];
  if (list.includes(name)) {
    resultEl.textContent = t("manageErrExists");
    resultEl.className = "manage-result error";
    resultEl.style.display = "block";
    return;
  }

  list.push(name);
  recordResourceAdded(currentManageCategory, name, appState.currentDate);
  saveData();
  syncServerState({ skipLog: true }).catch(() => {});
  markDirty();
  renderAll();

  resultEl.textContent = t("manageSuccessAdd");
  resultEl.className = "manage-result success";
  resultEl.style.display = "block";
  input.value = "";
  setTimeout(() => input.focus(), 100);
}

function renderManageRemoveList() {
  const container = document.getElementById("manageRemoveList");
  const list = [...appState[currentManageCategory]].sort((a, b) =>
    a.localeCompare(b, "hr"),
  );
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-light); font-size:14px;">—</div>`;
    return;
  }

  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "manage-remove-item";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = item;
    const removeSpan = document.createElement("span");
    removeSpan.className = "remove-x";
    removeSpan.textContent = "✕";
    div.appendChild(nameSpan);
    div.appendChild(removeSpan);
    div.onclick = () => manageRemoveItem(item);
    container.appendChild(div);
  });
}

function manageRemoveItem(name) {
  const list = appState[currentManageCategory];
  const idx = list.indexOf(name);
  if (idx === -1) return;

  // Log lift deletions to backend so they remain in audit logs
  if (currentManageCategory === "lifts" && BACKEND_ENABLED) {
    try {
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: appState.currentUser || null,
          action: "delete_lift",
          details: { liftName: name },
        }),
      }).catch(() => {});
    } catch (e) {}
  }

  recordResourceRemoved(currentManageCategory, name, appState.currentDate);
  list.splice(idx, 1);
  saveData();
  syncServerState({ skipLog: true }).catch(() => {});
  markDirty();
  renderAll();

  const resultEl = document.getElementById("manageRemoveResult");
  resultEl.textContent = t("manageSuccessRemove") + " " + name;
  resultEl.className = "manage-result success";
  resultEl.style.display = "block";
  renderManageRemoveList();
  setTimeout(() => {
    resultEl.style.display = "none";
  }, 2500);
}

/* ==================== NOTIFICATION BADGE ==================== */
function updateNotifBadge() {
  const reports = getReports();
  const pendingCount = reports.filter(
    (r) => r.status === "pending",
  ).length;

  const adminBadge = document.getElementById("adminNotifBadge");
  const reportBadge = document.getElementById("reportNotifBadge");

  if (adminBadge) {
    adminBadge.textContent = pendingCount;
    adminBadge.style.display =
      pendingCount > 0 && canOpenAdminPanelAccess() && hasAdminPermission("canViewReports")
        ? "inline-flex"
        : "none";
  }
  if (reportBadge) {
    reportBadge.textContent = pendingCount;
    reportBadge.style.display =
      pendingCount > 0 && hasAdminPermission("canViewReports")
        ? "inline-flex"
        : "none";
  }

  updateNotificationsBadge();
}

function getUnreadNotificationsCount() {
  const key = `cmax_notifications_read_${currentSite}`;
  const readIds = safeParseStoredJson(localStorage.getItem(key), []) || [];
  const notifications = getNotificationsForSite(currentSite);
  const unread = notifications.filter((n) => !readIds.includes(n.id));
  return unread.length;
}

function markNotificationsRead(notifications) {
  const key = `cmax_notifications_read_${currentSite}`;
  const readIds = safeParseStoredJson(localStorage.getItem(key), []) || [];
  const next = new Set(readIds);
  (notifications || []).forEach((n) => {
    if (n && n.id != null) next.add(n.id);
  });
  localStorage.setItem(key, JSON.stringify(Array.from(next)));
}

function updateNotificationsBadge() {
  const btnBadge = document.getElementById("notificationsNotifBadge");
  if (!btnBadge) return;
  const unreadCount = getUnreadNotificationsCount();
  btnBadge.textContent = unreadCount;
  btnBadge.style.display = unreadCount > 0 ? "inline-flex" : "none";
}

/* ==================== DATA MANAGEMENT ==================== */
function loadData() {
  if (!BACKEND_ENABLED) {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        appState.workers = parsed.workers || appState.workers;
        appState.lifts = parsed.lifts || appState.lifts;
        appState.moments = parsed.moments || appState.moments;
        appState.plans = parsed.plans || appState.plans;
        appState.karnas = parsed.karnas || appState.karnas;
        appState.dailyData = parsed.dailyData || {};
      } catch (e) {
        console.error("Error loading data:", e);
      }
    }
    renderAll();
    collectPlans();
    return Promise.resolve();
  }

  // First try server state (shared between korisnici)
  return fetch("/api/state", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      serverStateVersion = Number(data?.version) || serverStateVersion || 1;
      if (data && data.state) {
        if (applyServerStateSnapshot(data.state)) {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const parsed = JSON.parse(savedData);
            appState.workers = parsed.workers || appState.workers;
            appState.lifts = parsed.lifts || appState.lifts;
            appState.moments = parsed.moments || appState.moments;
            appState.plans = parsed.plans || appState.plans;
            appState.karnas = parsed.karnas || appState.karnas;
            appState.dailyData = parsed.dailyData || {};
            if (Array.isArray(parsed.resourceHistory)) appState.resourceHistory = normalizeResourceHistory(parsed.resourceHistory);
          }
          renderAll();
          collectPlans();
          return;
        }
        const parsed = data.state;
        appState.workers = parsed.workers || appState.workers;
        appState.lifts = parsed.lifts || appState.lifts;
        appState.moments = parsed.moments || appState.moments;
        appState.plans = parsed.plans || appState.plans;
        appState.karnas = parsed.karnas || appState.karnas;
        appState.dailyData = parsed.dailyData || {};
        if (Array.isArray(parsed.resourceHistory)) appState.resourceHistory = normalizeResourceHistory(parsed.resourceHistory);
        renderAll();
        collectPlans();
        return;
      }
      // Ako nema ništa na serveru, padamo na lokalni storage
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          appState.workers = parsed.workers || appState.workers;
          appState.lifts = parsed.lifts || appState.lifts;
          appState.moments = parsed.moments || appState.moments;
          appState.plans = parsed.plans || appState.plans;
          appState.karnas = parsed.karnas || appState.karnas;
          appState.dailyData = parsed.dailyData || {};
          if (Array.isArray(parsed.resourceHistory)) appState.resourceHistory = normalizeResourceHistory(parsed.resourceHistory);
        } catch (e) {
          console.error("Error loading data:", e);
        }
      }
      renderAll();
      collectPlans();
    })
    .catch(() => {
      // Backend nije dostupan – koristi samo lokalne podatke
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          appState.workers = parsed.workers || appState.workers;
          appState.lifts = parsed.lifts || appState.lifts;
          appState.moments = parsed.moments || appState.moments;
          appState.plans = parsed.plans || appState.plans;
          appState.karnas = parsed.karnas || appState.karnas;
          appState.dailyData = parsed.dailyData || {};
          if (Array.isArray(parsed.resourceHistory)) appState.resourceHistory = normalizeResourceHistory(parsed.resourceHistory);
        } catch (e) {
          console.error("Error loading data:", e);
        }
      }
      renderAll();
      collectPlans();
    });
}

function loadAllData() {
  return Promise.resolve(loadData()).then(() => {
    loadBinsData();
    loadTidplanData();
    loadWarehouseData();
    return loadReportsData().then(() => loadNotificationsData());
  });
}

function loadWarehouseData() {
  warehouseData = normalizeWarehouseData(
    safeParseStoredJson(localStorage.getItem(getStorageKey("cmax_warehouse_data")), null),
  );
}


function getSiteStorageKey(module, site) {
  return `${module}_${site}`;
}

function safeParseStoredJson(rawValue, fallbackValue = null) {
  if (!rawValue) return fallbackValue;
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return fallbackValue;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeDateOnly(value) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : new Date().toISOString().slice(0, 10);
}

function addDaysToDate(dateValue, days) {
  const date = new Date(`${normalizeDateOnly(dateValue)}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeResourceHistory(history) {
  return Array.isArray(history)
    ? history
        .map((entry) => ({
          type: String(entry?.type || "").trim(),
          resourceId: String(entry?.resourceId || "").trim(),
          siteId: String(entry?.siteId || currentSite || "default").trim(),
          activeFrom: normalizeDateOnly(entry?.activeFrom || "1970-01-01"),
          activeTo: entry?.activeTo ? normalizeDateOnly(entry.activeTo) : null,
          changedAt: entry?.changedAt || new Date().toISOString(),
          changedBy: entry?.changedBy || "",
        }))
        .filter((entry) => entry.type && entry.resourceId)
    : [];
}

function seedResourceHistoryForCurrentLists() {
  appState.resourceHistory = normalizeResourceHistory(appState.resourceHistory);
  ["workers", "lifts", "moments", "plans", "karnas"].forEach((type) => {
    (appState[type] || []).forEach((resourceId) => {
      const exists = appState.resourceHistory.some(
        (entry) =>
          entry.type === type &&
          entry.resourceId === resourceId &&
          entry.siteId === currentSite &&
          !entry.activeTo,
      );
      if (!exists) {
        appState.resourceHistory.push({
          type,
          resourceId,
          siteId: currentSite,
          activeFrom: "1970-01-01",
          activeTo: null,
          changedAt: new Date().toISOString(),
          changedBy: appState.currentUser || "",
        });
      }
    });
  });
}

function isResourceActiveOnDate(type, resourceId, dateValue = appState.currentDate, history = appState.resourceHistory) {
  const date = normalizeDateOnly(dateValue);
  return normalizeResourceHistory(history).some((entry) => {
    if (entry.type !== type || entry.resourceId !== resourceId || entry.siteId !== currentSite) return false;
    return entry.activeFrom <= date && (!entry.activeTo || entry.activeTo >= date);
  });
}

function getActiveResourceList(type, dateValue = appState.currentDate) {
  seedResourceHistoryForCurrentLists();
  const names = new Set(Array.isArray(appState[type]) ? appState[type] : []);
  normalizeResourceHistory(appState.resourceHistory)
    .filter((entry) => entry.type === type && entry.siteId === currentSite)
    .forEach((entry) => names.add(entry.resourceId));
  return sortNaturally(
    Array.from(names).filter((resourceId) =>
      isResourceActiveOnDate(type, resourceId, dateValue, appState.resourceHistory),
    ),
  );
}

function recordResourceAdded(type, resourceId, dateValue = appState.currentDate) {
  const activeFrom = normalizeDateOnly(dateValue);
  appState.resourceHistory = normalizeResourceHistory(appState.resourceHistory);
  appState.resourceHistory.push({
    type,
    resourceId,
    siteId: currentSite,
    activeFrom,
    activeTo: null,
    changedAt: new Date().toISOString(),
    changedBy: appState.currentUser || "",
  });
}

function recordResourceRemoved(type, resourceId, dateValue = appState.currentDate) {
  const activeTo = addDaysToDate(dateValue, -1);
  appState.resourceHistory = normalizeResourceHistory(appState.resourceHistory);
  let touched = false;
  appState.resourceHistory = appState.resourceHistory.map((entry) => {
    if (
      entry.type === type &&
      entry.resourceId === resourceId &&
      entry.siteId === currentSite &&
      !entry.activeTo
    ) {
      touched = true;
      return { ...entry, activeTo, changedAt: new Date().toISOString(), changedBy: appState.currentUser || "" };
    }
    return entry;
  });
  if (!touched) {
    appState.resourceHistory.push({
      type,
      resourceId,
      siteId: currentSite,
      activeFrom: "1970-01-01",
      activeTo,
      changedAt: new Date().toISOString(),
      changedBy: appState.currentUser || "",
    });
  }
}

function persistCurrentStateToLocalStorage() {
  seedResourceHistoryForCurrentLists();
  const plannerPayload = {
    workers: appState.workers,
    lifts: appState.lifts,
    moments: appState.moments,
    plans: appState.plans,
    karnas: appState.karnas,
    dailyData: appState.dailyData,
    resourceHistory: normalizeResourceHistory(appState.resourceHistory),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerPayload));
  localStorage.setItem(
    getSiteStorageKey("cmax_planner_data", currentSite),
    JSON.stringify(plannerPayload),
  );
  localStorage.setItem(BINS_KEY, JSON.stringify(appState.binsData || {}));
  localStorage.setItem(BIN_PERMS_KEY, JSON.stringify(appState.binPermissions || {}));
  localStorage.setItem(
    getStorageKey("tidplan"),
    JSON.stringify(tidplanData || []),
  );
  localStorage.setItem(
    getStorageKey("tidplan_zones"),
    JSON.stringify(tidplanZones || []),
  );
  localStorage.setItem(
    getStorageKey("cmax_warehouse_data"),
    JSON.stringify(normalizeWarehouseData(warehouseData)),
  );
  localStorage.setItem(
    GUEST_PERMISSIONS_KEY,
    JSON.stringify(appState.guestPermissions || getGuestPermissions()),
  );
}

function mergePlannerSnapshot(localPlanner, serverPlanner) {
  const local = localPlanner && typeof localPlanner === "object" ? localPlanner : {};
  const server = serverPlanner && typeof serverPlanner === "object" ? serverPlanner : {};
  const authoritativeList = (localList, serverList) => {
    if (Array.isArray(localList)) {
      return sortNaturally(Array.from(new Set(localList)));
    }
    return sortNaturally(Array.from(new Set(Array.isArray(serverList) ? serverList : [])));
  };

  return {
    ...server,
    ...local,
    workers: authoritativeList(local.workers, server.workers),
    lifts: authoritativeList(local.lifts, server.lifts),
    moments: authoritativeList(local.moments, server.moments),
    plans: authoritativeList(local.plans, server.plans),
    karnas: authoritativeList(local.karnas, server.karnas),
    resourceHistory: normalizeResourceHistory([
      ...(Array.isArray(server.resourceHistory) ? server.resourceHistory : []),
      ...(Array.isArray(local.resourceHistory) ? local.resourceHistory : []),
    ]),
    dailyData:
      local.dailyData && typeof local.dailyData === "object"
        ? local.dailyData
        : server.dailyData || {},
  };
}

function mergeNotificationsSnapshot(localNotifications, serverNotifications) {
  const localList = Array.isArray(localNotifications) ? localNotifications : [];
  const serverList = Array.isArray(serverNotifications) ? serverNotifications : [];
  const mergedById = new Map();

  serverList.forEach((item) => {
    if (!item) return;
    const key = item.id || `${item.createdAt || ""}_${item.authorName || ""}`;
    mergedById.set(key, item);
  });

  localList.forEach((item) => {
    if (!item) return;
    const key = item.id || `${item.createdAt || ""}_${item.authorName || ""}`;
    mergedById.set(key, item);
  });

  return Array.from(mergedById.values()).sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function buildServerStateSnapshot(baseState = null, options = {}) {
  persistCurrentStateToLocalStorage();
  const serverState = baseState && typeof baseState === "object" ? baseState : {};
  const siteList = Array.isArray(sites) && sites.length ? [...sites] : ["default"];
  const siteData = {};
  const localAdmins = safeParseStoredJson(localStorage.getItem(ADMINS_KEY), []);
  const localGuestPermissions = safeParseStoredJson(
    localStorage.getItem(GUEST_PERMISSIONS_KEY),
    appState.guestPermissions,
  );
  const localAdminRemovalNotices = safeParseStoredJson(
    localStorage.getItem(ADMIN_REMOVAL_NOTICES_KEY),
    {},
  );
  const localBinPermissions = safeParseStoredJson(
    localStorage.getItem(BIN_PERMS_KEY),
    appState.binPermissions,
  );
  const snapshotSites =
    options.includeSites === true
      ? siteList
      : Array.isArray(serverState.sites) && serverState.sites.length
        ? [...serverState.sites]
        : siteList;

  siteList.forEach((site) => {
    const localPlanner = safeParseStoredJson(
      localStorage.getItem(getSiteStorageKey("cmax_planner_data", site)),
      null,
    );
    const serverPlanner =
      serverState.siteData &&
      serverState.siteData[site] &&
      serverState.siteData[site].planner &&
      typeof serverState.siteData[site].planner === "object"
        ? serverState.siteData[site].planner
        : null;
    const serverNotifications =
      serverState.siteData &&
      serverState.siteData[site] &&
      Array.isArray(serverState.siteData[site].notifications)
        ? serverState.siteData[site].notifications
        : null;
    const localNotifications = safeParseStoredJson(
      localStorage.getItem(getSiteStorageKey("cmax_planner_notifications", site)),
      null,
    );
    siteData[site] = {
      planner: mergePlannerSnapshot(localPlanner, serverPlanner),
      bins: safeParseStoredJson(
        localStorage.getItem(getSiteStorageKey("cmax_planner_bins", site)),
        null,
      ),
      tidplan: safeParseStoredJson(
        localStorage.getItem(getSiteStorageKey("tidplan", site)),
        null,
      ),
      tidplanZones: safeParseStoredJson(
        localStorage.getItem(getSiteStorageKey("tidplan_zones", site)),
        null,
      ),
      warehouse: normalizeWarehouseData(
        safeParseStoredJson(
          localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", site)),
          null,
        ),
      ),
      reports: safeParseStoredJson(
        localStorage.getItem(getSiteStorageKey("cmax_planner_reports", site)),
        [],
      ),
      notifications: Array.isArray(localNotifications)
        ? localNotifications
        : Array.isArray(serverNotifications)
          ? serverNotifications
          : [],
    };
  });

  return {
    version: 2,
    savedAt: new Date().toISOString(),
    savedBy: appState.currentUser || null,
    sites: snapshotSites,
    currentSite:
      options.includeSites === true
        ? currentSite
        : serverState.currentSite && snapshotSites.includes(serverState.currentSite)
          ? serverState.currentSite
          : currentSite,
    admins:
      options.includeAdmins === true
        ? localAdmins
        : Array.isArray(serverState.admins)
          ? serverState.admins
          : localAdmins,
    guestPermissions:
      options.includeGuestPermissions === true
        ? localGuestPermissions
        : serverState.guestPermissions || localGuestPermissions,
    adminRemovalNotices:
      options.includeAdminRemovalNotices === true
        ? localAdminRemovalNotices
        : serverState.adminRemovalNotices || localAdminRemovalNotices,
    binPermissions:
      options.includeBinPermissions === true
        ? localBinPermissions
        : serverState.binPermissions || localBinPermissions,
    siteData,
  };
}

function applyServerStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || snapshot.version !== 2) {
    return false;
  }

  const snapshotSites =
    Array.isArray(snapshot.sites) && snapshot.sites.length
      ? snapshot.sites
      : ["default"];
  sites = [...snapshotSites];
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));

  const storedCurrentSite = localStorage.getItem(CURRENT_SITE_KEY);
  const preferredCurrentSite =
    storedCurrentSite && sites.includes(storedCurrentSite)
      ? storedCurrentSite
      : snapshot.currentSite && sites.includes(snapshot.currentSite)
        ? snapshot.currentSite
        : sites[0];
  currentSite = preferredCurrentSite;
  localStorage.setItem(CURRENT_SITE_KEY, currentSite);

  if (Array.isArray(snapshot.admins)) {
    localStorage.setItem(ADMINS_KEY, JSON.stringify(snapshot.admins));
  }
  if (snapshot.guestPermissions) {
    localStorage.setItem(
      GUEST_PERMISSIONS_KEY,
      JSON.stringify(normalizeGuestPermissions(snapshot.guestPermissions)),
    );
  }
  if (snapshot.binPermissions) {
    localStorage.setItem(
      BIN_PERMS_KEY,
      JSON.stringify(snapshot.binPermissions),
    );
  }

  const snapshotSiteData = snapshot.siteData || {};
  sites.forEach((site) => {
    const siteEntry = snapshotSiteData[site] || {};
    if (siteEntry.planner) {
      localStorage.setItem(
        getSiteStorageKey("cmax_planner_data", site),
        JSON.stringify(siteEntry.planner),
      );
    }
    if (siteEntry.bins) {
      localStorage.setItem(
        getSiteStorageKey("cmax_planner_bins", site),
        JSON.stringify(siteEntry.bins),
      );
    }
    if (siteEntry.tidplan) {
      localStorage.setItem(
        getSiteStorageKey("tidplan", site),
        JSON.stringify(siteEntry.tidplan),
      );
    }
    if (siteEntry.tidplanZones) {
      localStorage.setItem(
        getSiteStorageKey("tidplan_zones", site),
        JSON.stringify(siteEntry.tidplanZones),
      );
    }
    if (siteEntry.warehouse) {
      localStorage.setItem(
        getSiteStorageKey("cmax_warehouse_data", site),
        JSON.stringify(normalizeWarehouseData(siteEntry.warehouse)),
      );
    }
    if (siteEntry.reports) {
      localStorage.setItem(
        getSiteStorageKey("cmax_planner_reports", site),
        JSON.stringify(siteEntry.reports),
      );
    }
    if (siteEntry.notifications) {
      localStorage.setItem(
        getSiteStorageKey("cmax_planner_notifications", site),
        JSON.stringify(siteEntry.notifications),
      );
    }
  });

  STORAGE_KEY = getStorageKey("cmax_planner_data");
  BINS_KEY = getStorageKey("cmax_planner_bins");
  REPORTS_KEY = getStorageKey("cmax_planner_reports");
  NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
  const currentPlanner = safeParseStoredJson(localStorage.getItem(STORAGE_KEY), null);
  if (currentPlanner) {
    appState.workers = Array.isArray(currentPlanner.workers) ? currentPlanner.workers : appState.workers;
    appState.lifts = Array.isArray(currentPlanner.lifts) ? currentPlanner.lifts : appState.lifts;
    appState.moments = Array.isArray(currentPlanner.moments) ? currentPlanner.moments : appState.moments;
    appState.plans = Array.isArray(currentPlanner.plans) ? currentPlanner.plans : appState.plans;
    appState.karnas = Array.isArray(currentPlanner.karnas) ? currentPlanner.karnas : appState.karnas;
    appState.dailyData = currentPlanner.dailyData || appState.dailyData;
    appState.resourceHistory = normalizeResourceHistory(currentPlanner.resourceHistory);
  }
  appState.guestPermissions = getGuestPermissions();
  populateSiteSelect();
  updateMainTitle();
  return true;
}

let serverSyncTimeout = null;
let serverStateVersion = 1;

function syncServerState(options = {}) {
  const {
    showSuccess = false,
    markAsClean = false,
    keepalive = false,
    includeAdmins = false,
    includeGuestPermissions = false,
    includeBinPermissions = false,
    includeSites = false,
    includeAdminRemovalNotices = false,
    skipLog = false,
  } = options;

  persistCurrentStateToLocalStorage();

  if (!BACKEND_ENABLED) {
    if (markAsClean) markClean();
    if (showSuccess) showToast(t("dataSaved"), "success");
    return Promise.resolve(true);
  }

  return fetch("/api/state", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`STATE_LOAD_${res.status}`))))
    .then((data) => {
      serverStateVersion = Number(data?.version) || serverStateVersion || 1;
      return data?.state || null;
    })
    .then((serverState) =>
      fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: buildServerStateSnapshot(serverState, {
            includeAdmins,
            includeGuestPermissions,
            includeBinPermissions,
            includeSites,
          }),
          lastKnownVersion: serverStateVersion || 1,
          userEmail: appState.currentUser || null,
          skipLog,
        }),
        keepalive,
      }),
    )
    .then((res) => {
      if (!res.ok) {
        return res.json()
          .catch(() => ({}))
          .then((payload) => {
            throw new Error(payload?.error || "STATE_SAVE_FAILED");
          });
      }
      return res.json().catch(() => ({}));
    })
    .then((payload) => {
      serverStateVersion = Number(payload?.version) || serverStateVersion || 1;
      if (markAsClean) markClean();
      if (includeAdmins) pendingServerSyncOptions.includeAdmins = false;
      if (includeGuestPermissions) pendingServerSyncOptions.includeGuestPermissions = false;
      if (includeBinPermissions) pendingServerSyncOptions.includeBinPermissions = false;
      if (includeSites) pendingServerSyncOptions.includeSites = false;
      if (includeAdminRemovalNotices) pendingServerSyncOptions.includeAdminRemovalNotices = false;
      if (showSuccess) showToast(t("dataSaved"), "success");
      return true;
    })
    .catch((error) => {
      console.error("Server sync failed:", error);
      if (showSuccess) showToast("Server save failed.", "error");
      return false;
    });
}

function scheduleServerSync(delay = 3000, options = {}) {
  if (!BACKEND_ENABLED || appState.isReadonly) return;
  if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
  pendingServerSyncOptions.includeAdmins =
    pendingServerSyncOptions.includeAdmins || options.includeAdmins === true;
  pendingServerSyncOptions.includeGuestPermissions =
    pendingServerSyncOptions.includeGuestPermissions ||
    options.includeGuestPermissions === true;
  pendingServerSyncOptions.includeBinPermissions =
    pendingServerSyncOptions.includeBinPermissions ||
    options.includeBinPermissions === true;
  pendingServerSyncOptions.includeSites =
    pendingServerSyncOptions.includeSites || options.includeSites === true;
  pendingServerSyncOptions.includeAdminRemovalNotices =
    pendingServerSyncOptions.includeAdminRemovalNotices ||
    options.includeAdminRemovalNotices === true;
  serverSyncTimeout = setTimeout(() => {
    const queuedOptions = { ...pendingServerSyncOptions };
    syncServerState(queuedOptions).catch(() => {});
  }, delay);
}

function saveData() {
  persistCurrentStateToLocalStorage();
  scheduleServerSync();
}

function getCurrentDayData() {
  if (!appState.dailyData[appState.currentDate]) {
    appState.dailyData[appState.currentDate] = {
      workerAttendance: {},
      liftAvailability: {},
      liftPlans: {},
      planningRows: [],
    };
  }
  return appState.dailyData[appState.currentDate];
}

/* ==================== RENDER FUNCTIONS ==================== */
function renderAll() {
  seedResourceHistoryForCurrentLists();
  updateDateDisplay();
  renderWorkersList();
  renderLiftsList();
  renderMomensList();
  renderPlansList();
  renderKarnasList();
  renderPlanningTable();
}

function getWorkersInUse() {
  const dayData = getCurrentDayData();
  const inUse = new Set();
  dayData.planningRows.forEach((row) => {
    if (row.w1) inUse.add(row.w1);
    if (row.w2) inUse.add(row.w2);
    if (row.w3) inUse.add(row.w3);
  });
  return inUse;
}

function renderWorkersList() {
  const tbody = document.getElementById("workersList");
  const dayData = getCurrentDayData();
  const inUse = getWorkersInUse();
  const sortedWorkers = getActiveResourceList("workers", appState.currentDate);
  tbody.innerHTML = "";

  sortedWorkers.forEach((worker) => {
    const isPresent = dayData.workerAttendance[worker] !== false;
    const isBusy = inUse.has(worker);
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = worker;
    tdName.style.textAlign = "left";
    tr.appendChild(tdName);

    const tdCheck = document.createElement("td");
    tdCheck.className = "checkbox-cell";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isPresent;
    checkbox.onchange = () => toggleWorkerAttendance(worker);
    if (appState.isReadonly || !canEditDate(appState.currentDate)) checkbox.disabled = true;
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    const tdStatus = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = "status-badge";
    if (!isPresent) {
      statusBadge.classList.add("status-absent");
      statusBadge.textContent = t("workerAbsent");
    } else if (isBusy) {
      statusBadge.classList.add("status-busy");
      statusBadge.textContent = t("workerBusy");
    } else {
      statusBadge.classList.add("status-available");
      statusBadge.textContent = t("workerPresent");
    }
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  });
}

function renderLiftsList() {
  const tbody = document.getElementById("liftsList");
  const dayData = getCurrentDayData();
  const sortedLifts = getActiveResourceList("lifts", appState.currentDate);
  tbody.innerHTML = "";

  sortedLifts.forEach((lift) => {
    const isAvailable = dayData.liftAvailability[lift] !== false;
    const liftPlan = dayData.liftPlans[lift] || "";
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = lift;
    tdName.style.textAlign = "left";
    tr.appendChild(tdName);

    const tdCheck = document.createElement("td");
    tdCheck.className = "checkbox-cell";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isAvailable;
    checkbox.onchange = () => toggleLiftAvailability(lift);
    if (appState.isReadonly || !canEditDate(appState.currentDate)) checkbox.disabled = true;
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    const tdStatus = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = "status-badge";
    if (isAvailable) {
      statusBadge.classList.add("status-available");
      statusBadge.textContent = t("liftAvailable");
    } else {
      statusBadge.classList.add("status-unavailable");
      statusBadge.textContent = t("liftUnavailable");
    }
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    const tdPlan = document.createElement("td");
    const planInput = document.createElement("input");
    planInput.type = "text";
    planInput.className = "plan-input";
    planInput.value = liftPlan;
    planInput.placeholder = "Plan";
    planInput.oninput = () => updateLiftPlan(lift, planInput.value);
    if (appState.isReadonly || !canEditDate(appState.currentDate)) planInput.disabled = true;
    tdPlan.appendChild(planInput);
    tr.appendChild(tdPlan);

    tbody.appendChild(tr);
  });
}

function renderMomensList() {
  const tbody = document.getElementById("momentsList");
  tbody.innerHTML = "";
  getActiveResourceList("moments", appState.currentDate).forEach((m) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = m;
    td.style.textAlign = "left";
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

function renderPlansList() {
  const tbody = document.getElementById("plansList");
  tbody.innerHTML = "";
  getActiveResourceList("plans", appState.currentDate).forEach((p) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = p;
    td.style.textAlign = "left";
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

function renderKarnasList() {
  const tbody = document.getElementById("karnasList");
  tbody.innerHTML = "";
  getActiveResourceList("karnas", appState.currentDate).forEach((k) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = k;
    td.style.textAlign = "left";
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

function renderPlanningTable() {
  const tbody = document.getElementById("planningTableBody");
  const dayData = getCurrentDayData();
  tbody.innerHTML = "";
  dayData.planningRows.forEach((rowData, index) => {
    tbody.appendChild(createPlanningRow(rowData, index));
  });
  if (!appState.isReadonly && canEditDate(appState.currentDate)) {
    tbody.appendChild(createPlanningRow({}, dayData.planningRows.length));
  }
  applyColorCoding();
  renderWorkersList(); // update busy status
}

function addPlanningRow() {
  if (appState.isReadonly || !appState.isAdmin || !canEditDate(appState.currentDate)) return;
  const dayData = getCurrentDayData();
  dayData.planningRows.push({});
  saveData();
  markDirty();
  renderPlanningTable();
}

function removePlanningRow() {
  if (appState.isReadonly || !appState.isAdmin || !canEditDate(appState.currentDate)) return;
  const dayData = getCurrentDayData();
  // Ukloni zadnji puni red ako postoji (ne brišemo sve redove odjednom)
  if (dayData.planningRows.length > 0) {
    dayData.planningRows.pop();
    saveData();
    markDirty();
    renderPlanningTable();
  }
}

function createPlanningRow(rowData, index) {
  const tr = document.createElement("tr");
  tr.dataset.rowIndex = index;
  const fields = [
    ["w1", getActiveResourceList("workers", appState.currentDate)],
    ["w2", getActiveResourceList("workers", appState.currentDate)],
    ["w3", getActiveResourceList("workers", appState.currentDate)],
    ["plan", getActiveResourceList("plans", appState.currentDate)],
    ["karna", getActiveResourceList("karnas", appState.currentDate)],
    ["m1", getActiveResourceList("moments", appState.currentDate)],
    ["m2", getActiveResourceList("moments", appState.currentDate)],
    ["l1", getActiveResourceList("lifts", appState.currentDate)],
    ["l2", getActiveResourceList("lifts", appState.currentDate)],
    ["l3", getActiveResourceList("lifts", appState.currentDate)],
  ];
  fields.forEach(([f, opts]) =>
    tr.appendChild(createSelectCell(f, rowData[f], opts, index)),
  );
  tr.appendChild(createCommentCell(rowData.comment || "", index));
  return tr;
}

function createSelectCell(fieldName, selectedValue, options, rowIndex) {
  const td = document.createElement("td");
  td.dataset.field = fieldName;
  td.dataset.pval = selectedValue || "-";

  const select = document.createElement("select");
  select.disabled = appState.isReadonly || !canEditDate(appState.currentDate);
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "-";
  select.appendChild(emptyOpt);

  const sorted = sortNaturally(options);
  if (selectedValue && !sorted.includes(selectedValue)) {
    sorted.push(selectedValue);
  }

  sortNaturally(sorted).forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (selectedValue === opt) o.selected = true;
    select.appendChild(o);
  });

  select.onchange = () => {
    td.dataset.pval = select.value || "-";
    handlePlanningCellChange(rowIndex, fieldName, select.value);
  };
  td.appendChild(select);
  return td;
}

function createCommentCell(value, rowIndex) {
  const td = document.createElement("td");
  td.dataset.field = "comment";
  td.dataset.pval = value || "";
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "Komentar...";
  input.disabled = appState.isReadonly || !canEditDate(appState.currentDate);
  input.oninput = () => {
    td.dataset.pval = input.value;
    handlePlanningCellChange(rowIndex, "comment", input.value);
  };
  td.appendChild(input);
  return td;
}

function handlePlanningCellChange(rowIndex, fieldName, value) {
  if (!canEditDate(appState.currentDate)) {
    showToast("Prošli datumi su zaključani.", "error");
    renderPlanningTable();
    return;
  }
  const dayData = getCurrentDayData();
  if (!dayData.planningRows[rowIndex])
    dayData.planningRows[rowIndex] = {};

  if (
    fieldName === "m2" &&
    value &&
    value === dayData.planningRows[rowIndex].m1
  ) {
    showAlert(t("momentDuplicateError"), "⚠️");
    dayData.planningRows[rowIndex][fieldName] = "";
    saveData();
    markDirty();
    renderPlanningTable();
    return;
  }
  if (
    fieldName === "m1" &&
    value &&
    value === dayData.planningRows[rowIndex].m2
  ) {
    showAlert(t("momentDuplicateError"), "⚠️");
    dayData.planningRows[rowIndex].m2 = "";
    saveData();
    markDirty();
    renderPlanningTable();
    return;
  }

  dayData.planningRows[rowIndex][fieldName] = value;
  const isNewRow = rowIndex === dayData.planningRows.length;
  if (isNewRow) {
    dayData.planningRows.push({});
  }
  saveData();
  markDirty();
  if (isNewRow) {
    // Re-render whole planning table so a new empty row appears immediately
    renderPlanningTable();
  } else {
    applyColorCoding();
    renderWorkersList();
  }
}

function applyColorCoding() {
  const dayData = getCurrentDayData();
  const tbody = document.getElementById("planningTableBody");
  const workerCounts = {};
  const liftCounts = {};

  dayData.planningRows.forEach((row) => {
    ["w1", "w2", "w3"].forEach((f) => {
      if (row[f]) workerCounts[row[f]] = (workerCounts[row[f]] || 0) + 1;
    });
    ["l1", "l2", "l3"].forEach((f) => {
      if (row[f]) liftCounts[row[f]] = (liftCounts[row[f]] || 0) + 1;
    });
  });

  Array.from(tbody.rows).forEach((tr, rowIndex) => {
    if (rowIndex >= dayData.planningRows.length) return;
    const row = dayData.planningRows[rowIndex];

    ["w1", "w2", "w3"].forEach((field) => {
      const td = tr.querySelector(`[data-field="${field}"]`);
      if (!td) return;
      td.classList.remove("duplicate-error", "absent-warning");
      const v = row[field];
      if (v) {
        if (dayData.workerAttendance[v] === false)
          td.classList.add("absent-warning");
        else if (workerCounts[v] > 1) td.classList.add("duplicate-error");
      }
    });

    ["l1", "l2", "l3"].forEach((field) => {
      const td = tr.querySelector(`[data-field="${field}"]`);
      if (!td) return;
      td.classList.remove("duplicate-error", "absent-warning");
      const v = row[field];
      if (v) {
        if (dayData.liftAvailability[v] === false)
          td.classList.add("absent-warning");
        else if (liftCounts[v] > 1) td.classList.add("duplicate-error");
      }
    });

    if (row.m1 && row.m2 && row.m1 === row.m2) {
      const td = tr.querySelector('[data-field="m2"]');
      if (td) {
        td.classList.remove("duplicate-error", "absent-warning");
        td.classList.add("moment-error");
      }
    }
  });
}

/* ==================== TOGGLE FUNCTIONS ==================== */
function toggleWorkerAttendance(worker) {
  if (!canEditDate(appState.currentDate)) {
    showToast("Prošli datumi su zaključani.", "error");
    renderWorkersList();
    return;
  }
  const dayData = getCurrentDayData();
  if (dayData.workerAttendance[worker] === false)
    delete dayData.workerAttendance[worker];
  else dayData.workerAttendance[worker] = false;
  saveData();
  markDirty();
  renderWorkersList();
  renderPlanningTable();
}

function toggleLiftAvailability(lift) {
  if (!canEditDate(appState.currentDate)) {
    showToast("Prošli datumi su zaključani.", "error");
    renderLiftsList();
    return;
  }
  const dayData = getCurrentDayData();
  if (dayData.liftAvailability[lift] === false)
    delete dayData.liftAvailability[lift];
  else dayData.liftAvailability[lift] = false;
  saveData();
  markDirty();
  renderLiftsList();
  renderPlanningTable();
}

function updateLiftPlan(lift, plan) {
  if (!canEditDate(appState.currentDate)) {
    showToast("Prošli datumi su zaključani.", "error");
    renderLiftsList();
    return;
  }
  const dayData = getCurrentDayData();
  dayData.liftPlans[lift] = plan;
  saveData();
  markDirty();
}

function toggleList(name) {
  const content = document.getElementById(`${name}-content`);
  const icon = document.getElementById(`${name}-icon`);
  content.classList.toggle("collapsed");
  icon.classList.toggle("collapsed");
}

/* ==================== CLEAR TABLE ==================== */
function clearAllTable() {
  if (appState.isReadonly || !hasPermission("canClear") || !canEditDate(appState.currentDate)) {
    showToast(t("accessDenied"), "error");
    return;
  }
  if (currentView === "bins") {
    // Clear Bins table only
    showConfirm(t("clearTableConfirm"), null, "⚠️", () => {
      const binsData = getBinsDataForDate(appState.currentDate);
      const planCount = binsData.planCount;
      binsData.rows = [];
      // Reinitialize with empty rows
      for (let p = 1; p <= planCount; p++) {
        for (let k = 1; k <= 4; k++) {
          binsData.rows.push({
            plan: `Plan ${p}`,
            karna: `Kärna ${k}`,
            totalAvailable: 0,
            emptyAvailable: 0,
            forEmptying: 0,
            additionalRequired: 0,
          });
        }
      }
      saveBinsData();
      markDirty();
      renderBinsTable();
      showToast(t("clearTableSuccess"), "success");
    });
  } else {
    // Clear Planning table (main view)
    showConfirm(t("clearTableConfirm"), null, "⚠️", () => {
      const dayData = getCurrentDayData();
      dayData.planningRows = [];
      saveData();
      markDirty();
      renderPlanningTable();
      showToast(t("clearTableSuccess"), "success");
    });
  }
}

/* ==================== ADMIN PANEL ==================== */
function getAllAdminPermissionKeys() {
  return ADMIN_PERMISSION_SECTIONS.flatMap((section) => section.keys);
}

function getAllGuestPermissionKeys() {
  return GUEST_PERMISSION_SECTIONS.flatMap((section) => section.keys);
}

function getAdminRemovalNotices() {
  return safeParseStoredJson(localStorage.getItem(ADMIN_REMOVAL_NOTICES_KEY), {}) || {};
}

function saveAdminRemovalNotices(notices) {
  localStorage.setItem(ADMIN_REMOVAL_NOTICES_KEY, JSON.stringify(notices || {}));
}

function getAdminRemovalNotice(email) {
  if (!email) return null;
  const notices = getAdminRemovalNotices();
  return notices[email] || null;
}

function setAdminRemovalNotice(email, notice) {
  if (!email) return;
  const notices = getAdminRemovalNotices();
  notices[email] = notice;
  saveAdminRemovalNotices(notices);
}

function formatAdminRemovalMessage(notice) {
  const removedBy =
    notice?.removedByName || notice?.removedBy || t("unknownUser");
  const reason = notice?.reason || t("adminRemoveReasonUnknown");
  const site = notice?.site || currentSite || "";
  return `${t("adminRemovedMessage")} ${removedBy}. ${t("adminRemovedReasonLabel")} ${reason}.${site ? ` ${t("adminRemovedSiteLabel")} ${site}.` : ""}`;
}

function forceLogoutAndReload() {
  clearAuthSessionLocal();
  appState.isAdmin = false;
  appState.isSuperAdmin = false;
  appState.isReadonly = false;
  appState.currentUser = null;
  appState.currentUserName = "";
  appState.adminLevel = 1;
  appState.permissions = normalizePermissions({});
  appState.guestPermissions = getGuestPermissions();
  showLogin();
  setTimeout(() => {
    window.location.reload();
  }, 300);
}

function handleAdminRemoval(notice) {
  if (adminRemovalHandled) return;
  adminRemovalHandled = true;
  const message = formatAdminRemovalMessage(notice);
  showAlert(message, "⚠️", () => {
    forceLogoutAndReload();
  });
}

function buildAdminLevelOptions(selectEl, options = {}) {
  if (!selectEl) return;
  const { maxLevel = 6, selectedLevel = 1, disable = false } = options;
  selectEl.innerHTML = "";
  ADMIN_LEVELS.filter((lvl) => lvl <= maxLevel).forEach((lvl) => {
    const opt = document.createElement("option");
    opt.value = String(lvl);
    opt.textContent = `${t("adminLevelShort")} ${lvl}`;
    selectEl.appendChild(opt);
  });
  selectEl.value = String(selectedLevel);
  selectEl.disabled = disable;
}

function getSelectedNewAdminLevel() {
  const el = document.getElementById("newAdminLevel");
  const level = Number(el?.value);
  if (Number.isFinite(level) && level >= 1 && level <= 6) return level;
  return 1;
}

function renderNewAdminLevelSelector() {
  const levelSelect = document.getElementById("newAdminLevel");
  if (!levelSelect) return;
  const maxLevel = getMaxGrantableLevel();
  const selectedLevel = Math.min(getSelectedNewAdminLevel(), maxLevel);
  const disable = !canManageAdminsByLevel();
  buildAdminLevelOptions(levelSelect, {
    maxLevel,
    selectedLevel,
    disable,
  });
}

function renderNewAdminPermissionsPanel() {
  const level = getSelectedNewAdminLevel();
  renderPermissionEditor(
    "newAdminPermsPanel",
    "np_",
    getLevelDefaultPermissions(level),
    ADMIN_PERMISSION_SECTIONS,
  );
  const template = getLevelTemplate(level);
  getAllAdminPermissionKeys().forEach((key) => {
    const cb = document.getElementById(`np_${key}`);
    if (!cb) return;
    const canGrantKey = appState.isSuperAdmin || hasAdminPermission(key);
    if (!template[key]) {
      cb.checked = false;
      cb.disabled = true;
      return;
    }
    if (!canManageAdminsByLevel() || !canGrantKey) {
      cb.disabled = true;
    }
  });
}

function renderSiteAccessEditor(containerTarget, prefix, selectedSites, options = {}) {
  const { disableAll = false, allowedGrantSites = null } = options;
  const container =
    typeof containerTarget === "string"
      ? document.getElementById(containerTarget)
      : containerTarget;
  if (!container) return;
  container.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "permission-section-grid";
  const sortedSites = (sites || []).slice().sort((a, b) => a.localeCompare(b, "hr"));
  sortedSites.forEach((site) => {
    const label = document.createElement("label");
    label.className = "perm-label";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.site = site;
    cb.id = `${prefix}${sanitizeSiteId(site)}`;
    const hasSelection = Array.isArray(selectedSites);
    cb.checked = !hasSelection || selectedSites.includes(site);
    const canGrantSite =
      appState.isSuperAdmin ||
      allowedGrantSites === null ||
      allowedGrantSites.includes(site);
    if (disableAll || !canGrantSite) cb.disabled = true;
    const span = document.createElement("span");
    span.textContent = site;
    label.appendChild(cb);
    label.appendChild(span);
    grid.appendChild(label);
  });

  container.appendChild(grid);
}

function readSiteAccessEditor(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const selected = [];
  container.querySelectorAll("input[type='checkbox'][data-site]").forEach((cb) => {
    if (cb.checked) selected.push(cb.dataset.site);
  });
  return selected;
}

function renderNewAdminSitesPanel() {
  if (!canManageSiteAccess()) {
    renderSiteAccessEditor("newAdminSitesPanel", "ns_", null, { disableAll: true });
    return;
  }
  const allowedGrantSites = getCurrentAdminAllowedSites();
  renderSiteAccessEditor("newAdminSitesPanel", "ns_", allowedGrantSites, {
    allowedGrantSites,
  });
}

function renderGuestAccessPanel() {
  if (!(appState.isSuperAdmin || hasAdminPermission("canManageGuestAccess"))) return;

  renderPermissionEditor(
    "guestAccessPermsPanel",
    "gp_",
    appState.guestPermissions,
    GUEST_PERMISSION_SECTIONS,
  );

  const accessPanel = document.getElementById("guestWarehouseAccessPanel");
  if (!accessPanel) return;
  accessPanel.innerHTML = "";

  const section = document.createElement("div");
  section.className = "permission-section";
  section.innerHTML = `
    <div class="permission-section-header">
      <div class="permission-section-title">${t("guestWarehouseScopeTitle")}</div>
      <div class="permission-section-note">${t("guestWarehouseScopeNote")}</div>
    </div>
  `;

  const itemsSection = document.createElement("div");
  itemsSection.className = "permission-section";
  itemsSection.innerHTML = `
    <div class="permission-section-header">
      <div class="permission-section-title">${t("guestWarehouseItemsTitle")}</div>
      <div class="permission-section-note">${t("guestWarehouseItemsNote")} ${escapeHtml(currentSite || "-")}</div>
    </div>
  `;

  const itemsGrid = document.createElement("div");
  itemsGrid.className = "permission-section-grid";
  const siteWarehouse = normalizeWarehouseData(
    safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", currentSite)), null),
  );
  const allowedItemIds = new Set(getGuestWarehouseSiteAccess(currentSite).allowedItemIds);
  const visibleItems = (siteWarehouse.catalog || []).slice().sort((a, b) => compareNaturally(a.name, b.name));

  if (!visibleItems.length) {
    const empty = document.createElement("div");
    empty.className = "admin-section-note";
    empty.textContent = t("guestWarehouseNoItems");
    itemsSection.appendChild(empty);
  } else {
    visibleItems.forEach((item) => {
      const label = document.createElement("label");
      label.className = "perm-label";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.guestWarehouseItem = item.id;
      checkbox.checked = allowedItemIds.has(item.id);
      const span = document.createElement("span");
      span.textContent = `${item.name} (${item.unit || "kom"})`;
      label.appendChild(checkbox);
      label.appendChild(span);
      itemsGrid.appendChild(label);
    });
    itemsSection.appendChild(itemsGrid);
  }

  accessPanel.appendChild(section);
  accessPanel.appendChild(itemsSection);
}

function saveGuestAccessSettings() {
  if (!(appState.isSuperAdmin || hasAdminPermission("canManageGuestAccess"))) return;
  let permissions = readPermissionEditor(
    "gp_",
    getAllGuestPermissionKeys(),
    DEFAULT_GUEST_PERMISSIONS,
  );
  const accessPanel = document.getElementById("guestWarehouseAccessPanel");
  const selectedItemIds = accessPanel
    ? Array.from(accessPanel.querySelectorAll("input[data-guest-warehouse-item]:checked")).map(
        (el) => el.dataset.guestWarehouseItem,
      )
    : [];
  permissions = setGuestWarehouseSiteAccess(permissions, currentSite, {
    allowedItemIds: selectedItemIds,
  });
  saveGuestPermissions(permissions);
  if (appState.isReadonly) {
    applyPermissionVisibility();
  }
  showToast(t("successPermsSaved"), "success");
}

function resetTidplanLayoutSettings() {
  localStorage.removeItem("tidplanLeftPanelWidth");
  localStorage.removeItem("tidplanPanelMode");
  localStorage.removeItem("tidplanFullscreen");
  showToast(t("resetTidplanLayoutSuccess"), "success");
}

function resetThemeSettings() {
  localStorage.setItem(THEME_KEY, "blue");
  localStorage.setItem(DARK_KEY, "false");
  document.documentElement.setAttribute("data-theme", "blue");
  document.documentElement.setAttribute("data-dark", "false");
  updateThemeBtns("blue");
  showToast(t("resetThemeSuccess"), "success");
}

function getAdminSummaryLabels(permissions) {
  const labels = [];
  if (permissions.canAccessPlanner !== false) labels.push("Planner");
  if (permissions.canAccessTidplan !== false) labels.push("Tidplan");
  if (permissions.canAccessBins !== false) labels.push("Bins");
  if (permissions.canAccessWarehouse !== false) labels.push(t("btnWarehouse"));
  if (permissions.canViewNotifications !== false) labels.push("Obavijesti");
  if (permissions.canCreateReports !== false) labels.push("Prijave");
  return labels;
}

function openAdminPanel() {
  if (!canOpenAdminPanelAccess()) return;
  withLoading("loadingAdminPanel", () => {
    document.getElementById("adminModal").style.display = "flex";

    const canManageAdmins = canManageAdminsByLevel();
    const canManageGuest = appState.isSuperAdmin || hasAdminPermission("canManageGuestAccess");
    const canViewReports = hasAdminPermission("canViewReports");
    const canViewLogs = hasAdminPermission("canViewLogs");
    const canViewSettings = hasAdminPermission("canViewSettings") || appState.isSuperAdmin;
    const canViewBackupsAccess = canViewBackups();


    setVisibility("tabBtnAdmins", canManageAdmins);
    document.getElementById("tabAdmins").style.display = canManageAdmins ? "" : "none";
    setVisibility("tabBtnGuest", canManageGuest);
    document.getElementById("tabGuest").style.display = canManageGuest ? "" : "none";
    setVisibility("tabBtnReports", canViewReports);
    document.getElementById("tabReports").style.display = canViewReports ? "" : "none";
    setVisibility("tabBtnLogs", canViewLogs);
    document.getElementById("tabLogs").style.display = canViewLogs ? "" : "none";
    setVisibility("tabBtnSettings", canViewSettings);
    document.getElementById("tabSettings").style.display = canViewSettings ? "" : "none";
    setVisibility("tabBtnBackup", canViewBackupsAccess);
    const backupTab = document.getElementById("tabBackup");
    if (backupTab) backupTab.style.display = canViewBackupsAccess ? "" : "none";

    renderNewAdminLevelSelector();
    renderNewAdminPermissionsPanel();
    renderNewAdminSitesPanel();
    renderGuestAccessPanel();

    if (canManageAdmins) {
      renderAdminList();
    }
    if (canViewReports) {
      loadReportsData()
        .then(() => {
          renderReportsList("all");
          updateNotifBadge();
        })
        .catch(() => {
          renderReportsList("all");
          updateNotifBadge();
        });
    }
    if (canViewSettings) {
      initBinPermissionsUI();
    }

    const firstTab =
      (canManageAdmins && "tabAdmins") ||
      (canManageGuest && "tabGuest") ||
      (canViewReports && "tabReports") ||
      (canViewLogs && "tabLogs") ||
      (canViewSettings && "tabSettings") ||
      (canViewBackupsAccess && "tabBackup");

    if (!firstTab) {
      document.getElementById("adminModal").style.display = "none";
      showToast(t("adminNoTabs"), "error");
      return;
    }

    switchTab(firstTab);
    updateNotifBadge();
  });
}

function closeAdminPanel() {
  document.getElementById("adminModal").style.display = "none";
  document.getElementById("newAdminEmail").value = "";
  document.getElementById("newAdminPassword").value = "";
}

function switchTab(tabId) {
  if (
    (tabId === "tabAdmins" && !canManageAdminsByLevel()) ||
    (tabId === "tabGuest" &&
      !(appState.isSuperAdmin || hasAdminPermission("canManageGuestAccess"))) ||
    (tabId === "tabReports" && !hasAdminPermission("canViewReports")) ||
    (tabId === "tabLogs" && !hasAdminPermission("canViewLogs")) ||
    (tabId === "tabSettings" &&
      !(hasAdminPermission("canViewSettings") || appState.isSuperAdmin))
  ) {
    return;
  }
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  const btnMap = {
    tabAdmins: "tabBtnAdmins",
    tabGuest: "tabBtnGuest",
    tabReports: "tabBtnReports",
    tabLogs: "tabBtnLogs",
    tabSettings: "tabBtnSettings",
    tabBtnBackup: "tabBtnBackup",
  };
  if (btnMap[tabId])
    document.getElementById(btnMap[tabId]).classList.add("active");
  if (tabId === "tabReports") {
    loadReportsData()
      .then(() => {
        renderReportsList("all");
        updateNotifBadge();
      })
      .catch(() => {
        renderReportsList("all");
        updateNotifBadge();
      });
  }
  if (tabId === "tabLogs") {
    renderLogs();
  }
  if (tabId === "tabGuest") {
    renderGuestAccessPanel();
  }
  if (tabId === "tabBackup") {
    handleListBackups();
    handleBackupInfo();
  }
}

function renderAdminList() {
  if (!canManageAdminsByLevel()) return;
  const admins = getAdmins();
  const listEl = document.getElementById("adminList");
  listEl.innerHTML = "";
  const allowedGrantSites = getCurrentAdminAllowedSites();

  admins.forEach((admin, idx) => {
    const level = getAdminLevel(admin);
    const effectiveLevel = getPendingAdminLevel(admin.email, level);
    const div = document.createElement("div");
    div.className =
      `admin-item admin-level-${level}` + (admin.isSuperAdmin ? " super-admin" : "");
    const isSelf = admin.email === appState.currentUser;
    const canManageThisAdmin = canManageAdminRecord(admin);
    const canEditThisAdmin =
      canManageThisAdmin &&
      (!isSelf || appState.isSuperAdmin || getCurrentAdminLevel() >= 6);

    const header = document.createElement("div");
    header.className = "admin-item-header";

    const infoDiv = document.createElement("div");
    infoDiv.className = "admin-info";
    if (admin.fullName) {
      const nameDiv = document.createElement("div");
      nameDiv.className = "admin-email";
      nameDiv.textContent = admin.fullName;
      infoDiv.appendChild(nameDiv);
    }
    const emailDiv = document.createElement("div");
    emailDiv.className = "admin-email";
    emailDiv.textContent = admin.email;
    const roleDiv = document.createElement("div");
    roleDiv.className = "admin-role";
    roleDiv.textContent = admin.isSuperAdmin
      ? t("superAdmin")
      : `${t("admin")} - ${t("adminLevelShort")} ${level}`;
    infoDiv.appendChild(emailDiv);
    infoDiv.appendChild(roleDiv);

    const levelBadge = document.createElement("span");
    levelBadge.className = `admin-level-badge level-${level}`;
    levelBadge.textContent = `${t("adminLevelShort")} ${level}`;
    infoDiv.appendChild(levelBadge);
    header.appendChild(infoDiv);

    const btnGroup = document.createElement("div");
    btnGroup.style.cssText = "display:flex; gap:6px;";

    if (!admin.isSuperAdmin) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-small";
      editBtn.textContent = "⚙️";
      editBtn.title = t("editPermsTitle") + " " + admin.email;
      if (canEditThisAdmin) {
        editBtn.onclick = () => toggleAdminPerms(div, idx);
        btnGroup.appendChild(editBtn);
      }

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-small btn-danger";
      removeBtn.textContent = "✕";
      if (canManageThisAdmin && !isSelf) {
        removeBtn.onclick = () => removeAdminAction(admin.email);
        btnGroup.appendChild(removeBtn);
      }
    }

    header.appendChild(btnGroup);
    div.appendChild(header);

    if (!admin.isSuperAdmin) {
      const summary = document.createElement("div");
      summary.className = "admin-item-summary";
      getAdminSummaryLabels(admin.permissions || normalizePermissions({})).forEach(
        (labelText) => {
          const chip = document.createElement("span");
          chip.className = "admin-summary-chip";
          chip.textContent = labelText;
          summary.appendChild(chip);
        },
      );
      div.appendChild(summary);
    }

    if (!admin.isSuperAdmin) {
      const permsDiv = document.createElement("div");
      permsDiv.className = "admin-permissions";
      permsDiv.id = `perms_${idx}`;
    const basePerms = normalizePermissions(admin.permissions);
    const perms = normalizePermissions(getPendingAdminPerms(admin.email, basePerms));
    const levelTemplate = getLevelTemplate(effectiveLevel);

      const levelSection = document.createElement("div");
      levelSection.className = "permission-section";
      const levelHeader = document.createElement("div");
      levelHeader.className = "permission-section-header";
      levelHeader.innerHTML = `<div class="permission-section-title">${t("labelAdminLevel")}</div>`;
      levelSection.appendChild(levelHeader);
      const levelRow = document.createElement("div");
      levelRow.className = "admin-level-row";
      const levelSelect = document.createElement("select");
      levelSelect.id = `level_${idx}`;
      const maxLevel = canEditThisAdmin ? getMaxGrantableLevel() : 6;
      buildAdminLevelOptions(levelSelect, {
        maxLevel,
        selectedLevel: Math.min(effectiveLevel, maxLevel),
        disable: !canEditThisAdmin,
      });
      levelSelect.addEventListener("change", () => {
        const nextLevel = Number(levelSelect.value) || effectiveLevel;
        setPendingAdminLevel(admin.email, nextLevel);
        const nextPerms =
          nextLevel >= 6
            ? getLevelDefaultPermissions(6)
            : clampPermissionsToLevel(perms, nextLevel);
        setPendingAdminPerms(admin.email, nextPerms);
        renderAdminList();
      });
      levelRow.appendChild(levelSelect);
      levelSection.appendChild(levelRow);
      permsDiv.appendChild(levelSection);

      ADMIN_PERMISSION_SECTIONS.forEach((section) => {
        const sectionEl = document.createElement("div");
        sectionEl.className = "permission-section";
        const headerEl = document.createElement("div");
        headerEl.className = "permission-section-header";
        headerEl.innerHTML = `<div class="permission-section-title">${t(section.titleKey)}</div>${section.noteKey ? `<div class="permission-section-note">${t(section.noteKey)}</div>` : ""}`;
        sectionEl.appendChild(headerEl);

        const grid = document.createElement("div");
        grid.className = "permission-section-grid";
        section.keys.forEach((key) => {
          const canGrantKey =
            appState.isSuperAdmin || hasAdminPermission(key);
          const label = document.createElement("label");
          label.className = "perm-label";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.id = `perm_${idx}_${key}`;
          cb.checked = levelTemplate[key] === true && perms[key] !== false;
          if (!levelTemplate[key]) cb.checked = false;
          if (!canEditThisAdmin || !canGrantKey || !levelTemplate[key]) cb.disabled = true;
          cb.addEventListener("change", () => {
            const nextPerms = readPermissionEditor(
              `perm_${idx}_`,
              getAllAdminPermissionKeys(),
              getLevelDefaultPermissions(effectiveLevel),
            );
            setPendingAdminPerms(admin.email, nextPerms);
          });
          const span = document.createElement("span");
          span.textContent = getPermissionLabel(key);
          label.appendChild(cb);
          label.appendChild(span);
          grid.appendChild(label);
        });
        sectionEl.appendChild(grid);
        permsDiv.appendChild(sectionEl);
      });

      const sitesSection = document.createElement("div");
      sitesSection.className = "permission-section";
      const sitesHeader = document.createElement("div");
      sitesHeader.className = "permission-section-header";
      sitesHeader.innerHTML = `<div class="permission-section-title">${t("labelAdminSites")}</div>`;
      sitesSection.appendChild(sitesHeader);
      const sitesContainer = document.createElement("div");
      sitesContainer.id = `sites_${idx}`;
      sitesSection.appendChild(sitesContainer);
      renderSiteAccessEditor(sitesContainer, `site_${idx}_`, admin.allowedSites || null, {
        disableAll: !canEditThisAdmin || !canManageSiteAccess(),
        allowedGrantSites,
      });
      permsDiv.appendChild(sitesSection);

      if (canEditThisAdmin) {
        const saveBtn = document.createElement("button");
        saveBtn.className = "btn btn-small btn-success";
        saveBtn.textContent = t("btnSavePerms");
        saveBtn.onclick = () => saveAdminPerms(admin.email, idx);
        permsDiv.appendChild(saveBtn);
      }
      div.appendChild(permsDiv);
    } else {
      // For Super Admin, just display info
      const permsDiv = document.createElement("div");
      permsDiv.className = "admin-permissions";
      permsDiv.style.display = "block"; // Always show for Super Admin
      permsDiv.innerHTML = `
        <div class="permission-section">
          <div class="permission-section-header">
            <div class="permission-section-title">Super Admin</div>
            <div class="permission-section-note">This user has all permissions.</div>
          </div>
        </div>`;
      div.appendChild(permsDiv);
    }

    listEl.appendChild(div);
  });
}

function toggleAdminPerms(div, idx) {
  const pd = document.getElementById(`perms_${idx}`);
  if (pd) pd.classList.toggle("open");
}

function saveAdminPerms(email, idx) {
  if (!canManageAdminsByLevel()) return;
  if (email === appState.currentUser) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  const admins = getAdmins();
  const adminIndex = admins.findIndex((a) => a.email === email);
  if (adminIndex === -1) return;
  const targetAdmin = admins[adminIndex];
  if (!canManageAdminRecord(targetAdmin)) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  const currentLevel = getCurrentAdminLevel();
  const maxLevel = getMaxGrantableLevel();
  const requestedLevel = Number(document.getElementById(`level_${idx}`)?.value);
  const safeRequested =
    Number.isFinite(requestedLevel) && requestedLevel >= 1 && requestedLevel <= 6
      ? requestedLevel
      : getAdminLevel(targetAdmin);
  const nextLevel = currentLevel >= 6 ? safeRequested : Math.min(safeRequested, maxLevel);

  const newPerms = readPermissionEditor(
    `perm_${idx}_`,
    getAllAdminPermissionKeys(),
    getLevelDefaultPermissions(nextLevel),
  );
  const selectedSites = readSiteAccessEditor(`sites_${idx}`);
  const filteredSites = canManageSiteAccess()
    ? selectedSites
    : getCurrentAdminAllowedSites();
  const guardedPerms = clampPermissionsToLevel(newPerms, nextLevel);
  if (!appState.isSuperAdmin) {
    Object.keys(guardedPerms).forEach((key) => {
      if (!hasAdminPermission(key)) {
        guardedPerms[key] = false;
      }
    });
  }
  if (!canManageSiteAccess()) {
    admins[adminIndex].allowedSites = admins[adminIndex].allowedSites || null;
  }
  admins[adminIndex].level = nextLevel;
  admins[adminIndex].permissions = normalizePermissions(guardedPerms);
  if (canManageSiteAccess() && Array.isArray(filteredSites)) {
    const allSitesSelected = filteredSites.length === (sites || []).length;
    admins[adminIndex].allowedSites = allSitesSelected ? null : filteredSites;
  }
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
  clearPendingAdminLevel(email);
  clearPendingAdminPerms(email);
  trackEditActivity();
  if (appState.currentUser === email) {
    appState.adminLevel = nextLevel;
    appState.permissions = normalizePermissions(guardedPerms);
    const authData = safeParseStoredJson(localStorage.getItem(AUTH_KEY), {}) || {};
    authData.permissions = appState.permissions;
    authData.level = nextLevel;
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    applyPermissionVisibility();
  }
  syncServerState({ includeAdmins: true }).catch(() => {});
  renderAdminList();
  populateSiteSelect();
  updateNotificationsBadge();
  addLog(
    "Updated admin permissions",
    `${email} (level ${nextLevel})`,
  );
  showToast(t("successPermsSaved"), "success");
}

function addNewAdmin() {
  if (!canManageAdminsByLevel()) return;
  if (!canManageAdminsByLevel()) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  const firstName = document.getElementById("newAdminFirstName").value.trim();
  const lastName = document.getElementById("newAdminLastName").value.trim();
  const email = document.getElementById("newAdminEmail").value.trim();
  const password = document.getElementById("newAdminPassword").value;
  if (!firstName || !lastName || !email || !password) {
    showToast(t("errAdminEmailPassword"), "error");
    return;
  }
  if (!email.includes("@")) {
    showToast(t("errInvalidEmail"), "error");
    return;
  }
  const admins = getAdmins();
  if (admins.some((a) => a.email === email)) {
    showToast(t("errAdminExists"), "error");
    return;
  }
  const requestedLevel = getSelectedNewAdminLevel();
  const maxLevel = getMaxGrantableLevel();
  const level = getCurrentAdminLevel() >= 6 ? requestedLevel : Math.min(requestedLevel, maxLevel);
  const perms = readPermissionEditor(
    "np_",
    getAllAdminPermissionKeys(),
    getLevelDefaultPermissions(level),
  );
  const guardedPerms = clampPermissionsToLevel(perms, level);
  if (!appState.isSuperAdmin) {
    Object.keys(guardedPerms).forEach((key) => {
      if (!hasAdminPermission(key)) {
        guardedPerms[key] = false;
      }
    });
  }
  const selectedSites = readSiteAccessEditor("newAdminSitesPanel");
  const filteredSites = canManageSiteAccess()
    ? selectedSites
    : getCurrentAdminAllowedSites();
  admins.push({
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email,
    password,
    isSuperAdmin: false,
    level,
    permissions: normalizePermissions(guardedPerms),
    allowedSites:
      canManageSiteAccess() && Array.isArray(filteredSites)
        ? filteredSites.length === (sites || []).length
          ? null
          : filteredSites
        : filteredSites,
  });
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
  syncServerState({ includeAdmins: true }).catch(() => {});
  trackEditActivity();
  document.getElementById("newAdminFirstName").value = "";
  document.getElementById("newAdminLastName").value = "";
  document.getElementById("newAdminEmail").value = "";
  document.getElementById("newAdminPassword").value = "";
  renderNewAdminLevelSelector();
  renderNewAdminPermissionsPanel();
  renderAdminList();
  showToast(t("successAdminAdded"), "success");
}

function removeAdminActionOld(email) {
  if (!canManageAdminsByLevel()) return;
  const targetAdmin = getAdmins().find((a) => a.email === email);
  if (!targetAdmin || !canManageAdminRecord(targetAdmin)) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  showConfirm(
    `${t("confirmRemoveAdmin")} "${email}"?`,
    null,
    "⚠️",
    () => {
      let admins = getAdmins();
      admins = admins.filter((a) => a.email !== email);
      localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
      syncServerState({ includeAdmins: true }).catch(() => {});
      trackEditActivity();
      renderAdminList();
      showToast(t("successAdminRemoved"), "success");
    },
  );
}

function removeAdminAction(email) {
  if (!canManageAdminsByLevel()) return;
  const targetAdmin = getAdmins().find((a) => a.email === email);
  if (!targetAdmin || !canManageAdminRecord(targetAdmin)) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  showPromptDialog(t("promptRemoveAdminReason"), "⚠️", "", (reason) => {
    const trimmed = (reason || "").trim();
    if (!trimmed) {
      showToast(t("adminRemoveReasonRequired"), "error");
      return;
    }
    showConfirm(
      `${t("confirmRemoveAdmin")} "${email}"?\n${t("adminRemovedReasonLabel")} ${trimmed}`,
      null,
      "⚠️",
      () => {
        let admins = getAdmins();
        admins = admins.filter((a) => a.email !== email);
        localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));

        const removedByName = appState.currentUserName || appState.currentUser || "";
        setAdminRemovalNotice(email, {
          removedEmail: email,
          removedBy: appState.currentUser || "",
          removedByName,
          reason: trimmed,
          site: currentSite,
          at: new Date().toISOString(),
        });
        addLog("Removed admin", `${email} - ${trimmed}`);

        syncServerState({
          includeAdmins: true,
          includeAdminRemovalNotices: true,
        }).catch(() => {});
        trackEditActivity();
        renderAdminList();
        showToast(t("successAdminRemoved"), "success");
      },
    );
  });
}

/* ==================== BACKUP MANAGEMENT ==================== */
async function handleManualBackup() {
  if (!canManageBackups()) {
    showToast("Nemate dozvolu za kreiranje backupa.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch("/api/backup", {
      method: "POST",
    });
    if (response.status === 429) {
      showToast(BACKUP_RATE_LIMIT_MESSAGE, "error");
      return;
    }
    if (!response.ok) throw new Error("Failed to create backup");
    const data = await response.json();
    showToast(`Backup created: ${data.file}`, "success");
    addLog("Manual backup created", data.file);
    handleListBackups(); // Refresh list after creating
  } catch (error) {
    console.error("Error creating backup:", error);
    showToast("Failed to create backup.", "error");
  } finally {
    hideLoading();
  }
}

async function runManualBackup() {
  const status = document.getElementById("manualBackupStatus");
  if (status) status.textContent = "";
  try {
    await handleManualBackup();
    if (status) status.textContent = "Backup je pokrenut. Provjerite poruku o statusu.";
  } catch (error) {
    if (status) status.textContent = "Backup nije uspio.";
  }
}

async function openBackupRestorePanel() {
  if (!canManageBackups()) {
    showToast("Nemate dozvolu za vraćanje backupa.", "error");
    return;
  }
  const panel = document.getElementById("backupRestorePanel");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" || !panel.style.display ? "block" : "none";
  if (panel.style.display === "block") {
    await loadBackupRestoreOptions();
  }
}

async function loadBackupRestoreOptions() {
  if (!canViewBackups()) {
    showToast("Nemate dozvolu za pregled backupa.", "error");
    return;
  }
  const select = document.getElementById("backupRestoreSelect");
  const status = document.getElementById("backupRestoreStatus");
  if (status) status.textContent = "Učitavam backup listu...";
  try {
    const response = await fetch("/api/backups", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to list backups");
    const data = await response.json();
    const backups = Array.isArray(data.backups) ? data.backups : [];
    if (select) {
      select.innerHTML = "";
      backups.forEach((backup) => {
        const option = document.createElement("option");
        option.value = backup.id || backup.filename;
        const sizeText = backup.size ? `, ${(backup.size / 1024).toFixed(1)} KB` : "";
        option.textContent = `${backup.filename || backup.id} (${new Date(backup.createdAt).toLocaleString()}${sizeText})`;
        select.appendChild(option);
      });
    }
    if (status) status.textContent = backups.length ? "Odaberi backup za vraćanje." : "Nema dostupnih backupova.";
  } catch (error) {
    console.error("Error loading restore backups:", error);
    if (status) status.textContent = "Greška pri učitavanju backupova.";
    showToast("Failed to list backups.", "error");
  }
}

async function restoreSelectedBackup() {
  if (!canManageBackups()) {
    showToast("Nemate dozvolu za vraćanje backupa.", "error");
    return;
  }
  const select = document.getElementById("backupRestoreSelect");
  const backupId = select?.value;
  if (!backupId) {
    showToast("Odaberite backup za vraćanje.", "error");
    return;
  }
  showConfirm(
    "Vratiti odabrani backup? Trenutno stanje će prvo biti spremljeno kao pre-restore backup.",
    null,
    "⚠️",
    async () => {
      const status = document.getElementById("backupRestoreStatus");
      if (status) status.textContent = "Vraćam backup...";
      showLoading("loadingDefault");
      try {
        const response = await fetch("/api/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: backupId }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "BACKUP_RESTORE_FAILED");
        if (status) status.textContent = "Backup je vraćen. Osvježavam podatke...";
        showToast("Backup je uspješno vraćen.", "success");
        await loadAllData();
        restoreLastView();
        setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        console.error("Error restoring backup:", error);
        if (status) status.textContent = "Vraćanje backupa nije uspjelo.";
        showToast(error.message || "Backup restore failed.", "error");
      } finally {
        hideLoading();
      }
    },
  );
}

async function handleListBackups() {
  if (!canViewBackups()) {
    showToast("Nemate dozvolu za pregled backupa.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch("/api/backups");
    if (!response.ok) throw new Error("Failed to list backups");
    const data = await response.json();
    renderBackupList(data.backups);
  } catch (error) {
    console.error("Error listing backups:", error);
    showToast("Failed to list backups.", "error");
  } finally {
    hideLoading();
  }
}

function renderBackupList(backups) {
  const container = document.getElementById("backupListContainer");
  if (!container) return;
  container.innerHTML = "";
  if (!backups || backups.length === 0) {
    container.innerHTML = "<p>No backups found.</p>";
    return;
  }
  const ul = document.createElement("ul");
  backups.forEach((backup) => {
    const li = document.createElement("li");
    li.textContent = `${backup.filename} (${(backup.size / 1024).toFixed(2)} KB) - ${new Date(backup.createdAt).toLocaleString()}`;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

async function handleBackupInfo() {
  if (!canViewBackups()) {
    showToast("Nemate dozvolu za pregled informacija o backupu.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch("/api/backup/info");
    if (!response.ok) throw new Error("Failed to get backup info");
    const data = await response.json();
    renderBackupInfo(data);
  } catch (error) {
    console.error("Error getting backup info:", error);
    showToast("Failed to get backup info.", "error");
  } finally {
    hideLoading();
  }
}

function renderBackupInfo(info) {
  const container = document.getElementById("backupInfoContainer");
  if (!container) return;
  container.innerHTML = `
    <p><strong>Interval:</strong> ${info.backupInterval} hours (${info.backupIntervalMs} ms)</p>
    <p><strong>Storage Type:</strong> ${info.storageType}</p>
    <p><strong>Backup Location:</strong> ${info.backupsDir}</p>
    <p><strong>Last Backup:</strong> ${info.lastBackupTime ? new Date(info.lastBackupTime).toLocaleString() : 'N/A'}</p>
  `;
}


/* ==================== REPORTS ==================== */
let currentReportFilter = "all";

function openReportModal() {
  if (!canCreateReportsAccess()) {
    showToast(t("accessReportsDenied"), "error");
    return;
  }
  const liftSel = document.getElementById("reportLift");
  liftSel.innerHTML = '<option value="">-</option>';
  [...appState.lifts]
    .sort((a, b) => a.localeCompare(b))
    .forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l;
      opt.textContent = l;
      liftSel.appendChild(opt);
    });
  const planSel = document.getElementById("reportPlan");
  planSel.innerHTML = '<option value="">-</option>';
  appState.plans.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    planSel.appendChild(opt);
  });
  const reporterInput = document.getElementById("reporterName");
  const reporterName = getCurrentReporterName();
  if (reporterInput) {
    reporterInput.value = reporterName;
    reporterInput.disabled = true;
    reporterInput.readOnly = true;
  }
  document.getElementById("reportComment").value = "";
  document.getElementById("reportModal").style.display = "flex";
}

function closeReportModal() {
  document.getElementById("reportModal").style.display = "none";
}

function openChangePasswordModal() {
  closeAdminPanel();
  document.getElementById("oldPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  document.getElementById("changePasswordModal").style.display = "flex";
}

function closeChangePasswordModal() {
  document.getElementById("changePasswordModal").style.display = "none";
}

function submitChangePassword() {
  const oldPassword = document.getElementById("oldPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document
    .getElementById("confirmPassword")
    .value.trim();

  // Validation
  if (!oldPassword || !newPassword || !confirmPassword) {
    showAlert("Molimo popunite sva polja.", "⚠️");
    return;
  }

  if (newPassword.length < 6) {
    showAlert("Nova lozinka mora imati najmanje 6 znakova.", "⚠️");
    return;
  }

  if (newPassword !== confirmPassword) {
    showAlert("Nove lozinke se ne podudaraju.", "⚠️");
    return;
  }

  if (oldPassword === newPassword) {
    showAlert("Nova lozinka mora biti različita od stare.", "⚠️");
    return;
  }

  // Get current logged-in user email from AUTH_KEY
  const authData = JSON.parse(
    localStorage.getItem(AUTH_KEY) || '{"email":""}',
  );
  const currentUserEmail = authData.email || appState.currentUser;

  if (!currentUserEmail) {
    showAlert("Korisnik nije pronađen.", "⚠️");
    return;
  }

  // Find user in admins list and verify old password
  const admins = getAdmins();
  const userIndex = admins.findIndex((a) => a.email === currentUserEmail);

  if (userIndex === -1) {
    showAlert("Korisnik nije pronađen u sustavu.", "⚠️");
    return;
  }

  if (admins[userIndex].password !== oldPassword) {
    showAlert("Stara lozinka nije točna!", "⚠️");
    return;
  }

  // Update password
  admins[userIndex].password = newPassword;
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
  syncServerState({ includeAdmins: true }).catch(() => {});

  // Log password change
  addLog("Changed password", currentUserEmail);

  // Clear inputs and close modal
  document.getElementById("oldPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";

  closeChangePasswordModal();
  showAlert("Lozinka je uspješno promijenjena!", "✅");
}

function submitReport() {
  const liftNumber = document.getElementById("reportLift").value;
  const plan = document.getElementById("reportPlan").value;
  const reporterName = getCurrentReporterName();
  const comment = document.getElementById("reportComment").value.trim();

  if (!liftNumber || !plan || !reporterName) {
    showToast(t("errFillReport"), "error");
    return;
  }

  const reports = getReports();
  reports.push({
    id: Date.now(),
    liftNumber,
    plan,
    reporterName,
    comment,
    status: "pending",
    adminNote: "",
    date: new Date().toISOString(),
    isNew: true,
  });
  saveReports(reports);
  trackEditActivity();
  closeReportModal();
  showToast(t("reportSubmitSuccess"), "success");
  updateNotifBadge();
}

function filterReports(status) {
  currentReportFilter = status;
  document
    .querySelectorAll("#reportFilterBar .btn")
    .forEach((b) => b.classList.remove("active"));
  const map = {
    all: "filterAll",
    pending: "filterPending",
    approved: "filterApproved",
    rejected: "filterRejected",
  };
  if (map[status]) {
    const el = document.getElementById(map[status]);
    if (el) el.classList.add("active");
  }
  renderReportsList(status);
}

function renderReportsList(status) {
  const container = document.getElementById("reportsList");
  if (!hasAdminPermission("canViewReports")) {
    container.innerHTML =
      `<p style="color:var(--text-light); text-align:center; padding:20px; font-size:14px;">${t("accessReportsViewDenied")}</p>`;
    return;
  }
  let reports = getReports();
  if (status !== "all")
    reports = reports.filter((r) => r.status === status);

  if (reports.length === 0) {
    container.innerHTML = `<p style="color:var(--text-light); text-align:center; padding:20px; font-size:14px;">${t("noReports")}</p>`;
    return;
  }

  container.innerHTML = "";
  reports
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((report) => {
      const div = document.createElement("div");
      div.className = `report-item ${report.status}`;

      const badgeClass =
        report.status === "approved"
          ? "badge-approved"
          : report.status === "rejected"
            ? "badge-rejected"
            : "badge-pending";
      const badgeText =
        report.status === "approved"
          ? t("badgeApproved")
          : report.status === "rejected"
            ? t("badgeRejected")
            : t("badgePending");

      div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:6px;">
        <div>
          <strong>🛗 ${escapeHtml(report.liftNumber)}</strong> — <strong>${escapeHtml(report.plan)}</strong>
          <span class="report-status-badge ${badgeClass}" style="margin-left:8px;">${badgeText}</span>
          ${report.isNew ? `<span class="report-status-badge badge-new" style="margin-left:4px;">${t("badgeNew")}</span>` : ""}
        </div>
        <div class="report-meta">${new Date(report.date).toLocaleString()}</div>
      </div>
      <div class="report-meta" style="margin-top:4px;">👤 ${escapeHtml(report.reporterName)}</div>
      ${report.comment ? `<div class="report-comment">💬 ${escapeHtml(report.comment)}</div>` : ""}
      ${report.adminNote ? `<div class="report-comment" style="color:#e74c3c;">📝 ${t("reportAdminNote")} ${escapeHtml(report.adminNote)}</div>` : ""}
    `;

      if (report.status === "pending" && hasAdminPermission("canApproveReports")) {
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "report-actions";

        const approveBtn = document.createElement("button");
        approveBtn.className = "btn btn-small btn-success";
        approveBtn.textContent = t("btnApprove");
        approveBtn.onclick = () => reviewReport(report.id, "approved");

        const rejectBtn = document.createElement("button");
        rejectBtn.className = "btn btn-small btn-danger";
        rejectBtn.textContent = t("btnReject");
        rejectBtn.onclick = () => reviewReport(report.id, "rejected");

        actionsDiv.appendChild(approveBtn);
        actionsDiv.appendChild(rejectBtn);
        div.appendChild(actionsDiv);
      }

      if (appState.isSuperAdmin || hasAdminPermission("canDeleteReports")) {
        const deleteDiv = document.createElement("div");
        deleteDiv.className = "report-actions";
        deleteDiv.style.marginTop = "8px";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-small btn-danger";
        deleteBtn.textContent = "🗑️ " + t("btnDeleteReport");
        deleteBtn.onclick = () => deleteReport(report.id);

        deleteDiv.appendChild(deleteBtn);
        div.appendChild(deleteDiv);
      }

      container.appendChild(div);
    });

  // Mark all as seen
  const allReports = getReports();
  allReports.forEach((r) => {
    r.isNew = false;
  });
  saveReports(allReports);
  updateNotifBadge();
}

function reviewReport(id, action) {
  if (!hasAdminPermission("canApproveReports")) return;
  if (action === "rejected") {
    showPromptDialog(t("rejectConfirm"), "❌", "", (note) => {
      doReviewReport(id, action, note || "");
    });
  } else {
    showConfirm(t("approveConfirm"), null, "✅", () => {
      doReviewReport(id, action, "");
    });
  }
}

function doReviewReport(id, action, note) {
  const reports = getReports();
  const idx = reports.findIndex((r) => r.id === id);
  if (idx !== -1) {
    const report = reports[idx];
    reports[idx].status = action;
    reports[idx].adminNote = note;
    saveReports(reports);
    trackEditActivity();
    addLog(
      `${action === "approved" ? "Approved" : "Rejected"} report`,
      `Lift ${report.liftNumber}, Plan ${report.plan}, Reporter: ${report.reporterName}`,
    );
    renderReportsList(currentReportFilter);
    updateNotifBadge();
  }
}

/* ==================== DARK MODE ==================== */
function toggleDarkMode() {
  showConfirm(t("confirmDarkMode"), null, "🌙", () => {
    const isDark =
      document.documentElement.getAttribute("data-dark") === "true";
    const newDark = !isDark;
    document.documentElement.setAttribute(
      "data-dark",
      newDark ? "true" : "false",
    );
    localStorage.setItem(DARK_KEY, newDark ? "true" : "false");
    updateDarkModeBtn();
  });
}

function updateDarkModeBtn() {
  const btn = document.getElementById("darkModeToggleBtn");
  if (!btn) return;
  const isDark =
    document.documentElement.getAttribute("data-dark") === "true";
  btn.textContent = isDark ? t("darkModeOff") : t("darkModeOn");
}

/* ==================== COLOR THEME ==================== */
function setColorTheme(theme) {
  showConfirm(t("confirmThemeChange"), null, "🎨", () => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeBtns(theme);
    // Re-init flatpickr to pick up new colors
    reinitFlatpickr();
  });
}

function updateThemeBtns(theme) {
  document
    .querySelectorAll(".theme-btn")
    .forEach((b) => b.classList.remove("active"));
  const map = {
    blue: "themeBtnBlue",
    orange: "themeBtnOrange",
    red: "themeBtnRed",
    teal: "themeBtnTeal",
    indigo: "themeBtnIndigo",
    emerald: "themeBtnEmerald",
    slate: "themeBtnSlate",
    olive: "themeBtnOlive",
    rose: "themeBtnRose",
  };
  if (map[theme]) {
    const el = document.getElementById(map[theme]);
    if (el) el.classList.add("active");
  }
}

/* ==================== LOG SYSTEM ==================== */
function getLogs() {
  return logsCache.slice();
}

function loadLogsData() {
  if (!BACKEND_ENABLED) {
    logsLoadedOnce = true;
    return Promise.resolve(getLogs());
  }

  return fetch("/api/logs", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((logs) => {
      logsCache = Array.isArray(logs) ? logs : [];
      logsLoadedOnce = true;
      return logsCache;
    })
    .catch(() => getLogs());
}

function addLog(action, details = "") {
  const entry = {
    timestamp: new Date().toISOString(),
    user: appState.currentUser || "Guest",
    action,
    details,
  };

  logsCache.push(entry);
  if (logsCache.length > 500) logsCache.splice(0, logsCache.length - 500);

  if (BACKEND_ENABLED) {
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: entry.user,
        action: entry.action,
        details: entry.details,
      }),
    }).catch(() => {});
  }
}

function formatLogDetails(details) {
  if (details === null || details === undefined) return "";
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

function localizeLogPhrase(key) {
  const map = {
    hr: {
      loginSuccess: "Uspješna prijava",
      loginFail: "Neuspješna prijava",
      logout: "Odjava",
    },
    en: {
      loginSuccess: "Successfully logged in",
      loginFail: "Login failed",
      logout: "Logged out",
    },
    sv: {
      loginSuccess: "Inloggning lyckades",
      loginFail: "Inloggning misslyckades",
      logout: "Utloggad",
    },
  };
  const langKey =
    currentLang === "sv" ? "sv" : currentLang === "en" ? "en" : "hr";
  return (map[langKey] && map[langKey][key]) || key;
}

function formatLogEntry(log) {
  const actionRaw = normalizeText(log.action || "");
  let details = log.details;
  if (typeof details === "string") {
    const trimmed = details.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        details = JSON.parse(trimmed);
      } catch {
        details = details;
      }
    }
  }
  if (actionRaw.toLowerCase() === "login") {
    if (details && typeof details === "object" && "success" in details) {
      return {
        action: actionRaw,
        details: localizeLogPhrase(
          details.success ? "loginSuccess" : "loginFail",
        ),
      };
    }
  }
  if (actionRaw.toLowerCase() === "logged in") {
    return { action: actionRaw, details: localizeLogPhrase("loginSuccess") };
  }
  if (actionRaw.toLowerCase() === "logged out") {
    return { action: actionRaw, details: localizeLogPhrase("logout") };
  }
  return { action: actionRaw, details: normalizeText(formatLogDetails(details)) };
}

function renderLogs() {
  const container = document.getElementById("logsContainer");
  if (!container) return;
  if (!hasAdminPermission("canViewLogs")) {
    container.innerHTML =
      `<p style="color:var(--text-light); text-align:center; padding:20px;">${t("accessLogsViewDenied")}</p>`;
    return;
  }
  if (BACKEND_ENABLED && !logsLoadedOnce) {
    loadLogsData()
      .then(() => renderLogs())
      .catch(() => renderLogs());
    return;
  }
  const logs = getLogs().reverse(); // Show newest first

  if (logs.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-light); text-align:center; padding:20px;">Nema logova.</p>';
    return;
  }

  container.innerHTML = "";
  logs.forEach((log) => {
    const div = document.createElement("div");
    div.className = "log-entry";
    const date = new Date(log.timestamp);
    const timeStr = date.toLocaleString(
      currentLang === "hr"
        ? "hr-HR"
        : currentLang === "sv"
          ? "sv-SE"
          : "en-US",
    );
    const formatted = formatLogEntry(log);
    const safeUser = normalizeText(log.user);
    const safeAction = formatted.action || "";
    const detailsText = formatted.details || "";
    div.innerHTML = `<span class="log-time">${escapeHtml(timeStr)}</span> <span class="log-user">${escapeHtml(safeUser)}</span> <span class="log-action">${escapeHtml(safeAction)}</span> ${detailsText ? `<span style="color:var(--text-light);">(${escapeHtml(detailsText)})</span>` : ""}`;
    container.appendChild(div);
  });
}

function clearLogs() {
  if (!hasAdminPermission("canClearLogs")) {
    showToast(`❌ ${t("accessLogsClearDenied")}`, "error");
    return;
  }
  showConfirm(
    "Jeste li sigurni da želite obrisati sve logove?",
    null,
    "⚠️",
    () => {
      const finishClear = () => {
        logsCache = [];
        addLog("Cleared all logs");
        loadLogsData()
          .then(() => renderLogs())
          .catch(() => renderLogs());
        showToast("✅ Logovi su obrisani!", "success");
      };

      if (!BACKEND_ENABLED) {
        finishClear();
        return;
      }

      fetch("/api/logs", { method: "DELETE" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then(() => finishClear())
        .catch(() => {
          showToast(`❌ ${t("accessLogsClearDenied")}`, "error");
        });
    },
  );
}

function clearLogs() {
  if (!hasAdminPermission("canClearLogs")) {
    showToast(`❌ ${t("accessLogsClearDenied")}`, "error");
    return;
  }
  showConfirm(
    "Jeste li sigurni da želite obrisati sve logove?",
    null,
    "⚠️",
    () => {
      const finishClear = () => {
        logsCache = [];
        addLog("Cleared all logs");
        loadLogsData()
          .then(() => renderLogs())
          .catch(() => renderLogs());
        showToast("✅ Logovi su obrisani!", "success");
      };

      if (!BACKEND_ENABLED) {
        finishClear();
        return;
      }

      fetch("/api/logs", { method: "DELETE" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then(() => finishClear())
        .catch(() => {
          showToast(`❌ ${t("accessLogsClearDenied")}`, "error");
        });
    },
  );
}

function initBinPermissionsUI() {
  // Set checkbox values from appState.binPermissions
  const cb1 = document.getElementById("bin_perm_totalAvailable");
  const cb2 = document.getElementById("bin_perm_emptyAvailable");
  const cb3 = document.getElementById("bin_perm_forEmptying");
  if (cb1) cb1.checked = appState.binPermissions.totalAvailable !== false;
  if (cb2) cb2.checked = appState.binPermissions.emptyAvailable !== false;
  if (cb3) cb3.checked = appState.binPermissions.forEmptying !== false;
  const canManageBinsPerms =
    appState.isSuperAdmin || hasAdminPermission("canManageBinsPermissions");
  [cb1, cb2, cb3].forEach((checkbox) => {
    if (checkbox) checkbox.disabled = !canManageBinsPerms;
  });
}

function toggleBinPermission(field) {
  if (!hasAdminPermission("canManageBinsPermissions")) return;
  const checkboxId = "bin_perm_" + field;
  const checkbox = document.getElementById(checkboxId);
  if (checkbox) {
    appState.binPermissions[field] = checkbox.checked;
    saveBinPermissions();
    renderBinsTable();
    addLog("Updated bin permissions", field + ": " + checkbox.checked);
  }
}

/* ==================== BINS SYSTEM ==================== */
function loadBinsData() {
  const stored = localStorage.getItem(BINS_KEY);
  if (stored) {
    appState.binsData = safeParseStoredJson(stored, {}) || {};
  }
  // Initialize default data structure for current date if not exists
  ensureBinsDataForDate(appState.currentDate);
  // Load bin permissions
  loadBinPermissions();
}

function loadBinPermissions() {
  const stored = localStorage.getItem(BIN_PERMS_KEY);
  if (stored) {
    appState.binPermissions =
      safeParseStoredJson(stored, appState.binPermissions) ||
      appState.binPermissions;
  }
}

function saveBinPermissions() {
  localStorage.setItem(
    BIN_PERMS_KEY,
    JSON.stringify(appState.binPermissions),
  );
  scheduleServerSync(3000, { includeBinPermissions: true });
}

function saveBinsData() {
  localStorage.setItem(BINS_KEY, JSON.stringify(appState.binsData));
  scheduleServerSync();
}

function ensureBinsDataForDate(date) {
  if (!appState.binsData[date]) {
    const rows = [];
    // Create 20 plans x 4 karnas = 80 rows
    for (let p = 1; p <= 20; p++) {
      for (let k = 1; k <= 4; k++) {
        rows.push({
          plan: `Plan ${p}`,
          karna: `Kärna ${k}`,
          totalAvailable: 0,
          emptyAvailable: 0,
          forEmptying: 0,
          additionalRequired: 0,
        });
      }
    }
    appState.binsData[date] = { planCount: 20, rows };
  }
}

function getBinsDataForDate(date) {
  ensureBinsDataForDate(date);
  return appState.binsData[date];
}

function toggleBinsView() {
  if (!canAccessBinsModule()) {
    showToast(t("accessBinsDenied"), "error");
    return;
  }
  const notificationsSection = document.getElementById("notifications-section");
  const surveysSection = document.getElementById("surveys-section");
  const warehouseSection = document.getElementById("warehouse-section");
  const warehouseLogsSection = document.getElementById("warehouse-logs-section");
  const warehouseGraphSection = document.getElementById("warehouse-graph-section");
  if (notificationsSection) notificationsSection.style.display = "none";
  if (surveysSection) surveysSection.style.display = "none";
  if (warehouseSection) warehouseSection.style.display = "none";
  if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
  if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  if (currentView === "notifications") {
    currentView = "main";
  }
  if (currentView === "main") {
    currentView = "bins";
    saveCurrentView("bins");
    pushRouteForView("bins");
    document.querySelector(".planning-section").classList.add("hidden");
    document.querySelector(".lists-container").classList.add("hidden");
    document.getElementById("binsSection").classList.add("active");
    document.getElementById("btnBins").classList.add("btn-success");
    // Show Save button if there are unsaved changes
    if (appState.hasUnsavedChanges) {
      document.getElementById("btnSave").style.display = "inline-flex";
    }
    if (appState.isSuperAdmin) {
      document.getElementById("binsAdminControls").style.display = "flex";
    }
    renderBinsTable();
    addLog("Switched to Bins view");
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  } else {
    currentView = "main";
    saveCurrentView("main");
    pushRouteForView("main");
    document
      .querySelector(".planning-section")
      .classList.remove("hidden");
    document.querySelector(".lists-container").classList.remove("hidden");
    document.getElementById("binsSection").classList.remove("active");
    document.getElementById("btnBins").classList.remove("btn-success");
    // Show Save button if there are unsaved changes
    if (appState.hasUnsavedChanges) {
      document.getElementById("btnSave").style.display = "inline-flex";
    }
    addLog("Switched to Main view");
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  }
}

function renderBinsTable() {
  const binsData = getBinsDataForDate(appState.currentDate);
  const tbody = document.getElementById("binsTableBody");
  tbody.innerHTML = "";

  binsData.rows.forEach((row, idx) => {
    const tr = document.createElement("tr");

    // Plan cell
    const tdPlan = document.createElement("td");
    tdPlan.textContent = row.plan;
    tdPlan.style.fontWeight = "600";
    tr.appendChild(tdPlan);

    // Karna cell
    const tdKarna = document.createElement("td");
    tdKarna.textContent = row.karna;
    tr.appendChild(tdKarna);

    // Total Available
    const tdTotal = document.createElement("td");
    tdTotal.dataset.field = "totalAvailable";
    tdTotal.dataset.idx = idx;
    const inputTotal = createBinInput(
      idx,
      "totalAvailable",
      row.totalAvailable,
    );
    tdTotal.appendChild(inputTotal);
    tr.appendChild(tdTotal);

    // Empty Available
    const tdEmpty = document.createElement("td");
    tdEmpty.dataset.field = "emptyAvailable";
    tdEmpty.dataset.idx = idx;
    const inputEmpty = createBinInput(
      idx,
      "emptyAvailable",
      row.emptyAvailable,
    );
    tdEmpty.appendChild(inputEmpty);
    tr.appendChild(tdEmpty);

    // For Emptying
    const tdForEmpty = document.createElement("td");
    tdForEmpty.dataset.field = "forEmptying";
    tdForEmpty.dataset.idx = idx;
    const inputForEmpty = createBinInput(
      idx,
      "forEmptying",
      row.forEmptying,
    );
    tdForEmpty.appendChild(inputForEmpty);
    tr.appendChild(tdForEmpty);

    // Additional Required
    const tdAdditional = document.createElement("td");
    tdAdditional.dataset.field = "additionalRequired";
    tdAdditional.dataset.idx = idx;
    const selectAdditional = document.createElement("select");
    selectAdditional.dataset.idx = idx;
    selectAdditional.dataset.field = "additionalRequired";

    // Check permissions - super admin only
    const canEditAdditional =
      appState.isSuperAdmin || (!appState.isReadonly && hasPermission("canEditBinsData"));
    selectAdditional.disabled = !canEditAdditional || !canEditDate(appState.currentDate);

    // Create options 0-25
    for (let i = 0; i <= 25; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = i;
      if (i === (row.additionalRequired || 0)) opt.selected = true;
      selectAdditional.appendChild(opt);
    }

    selectAdditional.addEventListener("change", (e) => {
      updateBinCell(
        idx,
        "additionalRequired",
        parseInt(e.target.value) || 0,
      );
    });

    selectAdditional.style.cssText =
      "padding: 6px; border-radius: 6px; font-size: 12px; text-align: center; border: 1.5px solid var(--border-color); background: var(--input-bg); color: var(--text-dark); cursor: pointer;";

    tdAdditional.appendChild(selectAdditional);
    tr.appendChild(tdAdditional);

    // Status
    const tdStatus = document.createElement("td");
    tdStatus.className = "bin-status-cell";
    tdStatus.dataset.field = "status";
    tdStatus.dataset.idx = idx;
    tdStatus.textContent = calculateBinStatus(row);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });

  // Apply colors after rendering
  applyBinColors();
}

function createBinInput(idx, field, value) {
  const select = document.createElement("select");
  select.dataset.idx = idx;
  select.dataset.field = field;

  // Check permissions
  const canEdit =
    appState.isSuperAdmin ||
    (hasPermission("canEditBinsData") &&
      appState.binPermissions[field] &&
      !appState.isReadonly);
  select.disabled = !canEdit || !canEditDate(appState.currentDate);

  // Create options 0-25
  for (let i = 0; i <= 25; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    if (i === (value || 0)) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener("change", (e) => {
    updateBinCell(idx, field, parseInt(e.target.value) || 0);
  });

  select.style.cssText =
    "padding: 6px; border-radius: 6px; font-size: 12px; text-align: center; border: 1.5px solid var(--border-color); background: var(--input-bg); color: var(--text-dark); cursor: pointer;";

  return select;
}

function updateBinCell(idx, field, value) {
  if (!canEditDate(appState.currentDate)) {
    showToast("Prošli datumi su zaključani.", "error");
    renderBinsTable();
    return;
  }
  const binsData = getBinsDataForDate(appState.currentDate);
  const row = binsData.rows[idx];
  row[field] = value;

  // Auto-calculate logic similar to Excel
  // If totalAvailable changes and emptyAvailable > totalAvailable, adjust emptyAvailable
  if (field === "totalAvailable" && row.emptyAvailable > value) {
    row.emptyAvailable = value;
    const emptyInput = document.querySelector(
      `input[data-idx="${idx}"][data-field="emptyAvailable"]`,
    );
    if (emptyInput) emptyInput.value = value;
  }

  // If forEmptying changes, totalAvailable increases
  if (field === "forEmptying") {
    // Old value was already in total, now we add new emptied bins
    // Actually, we need to track what was emptied and add to total
    // For simplicity: user manages total manually or we auto-add
    // Per spec: "kad imam 10 total i empty 10, ako jednu napunim i dodam u for empty, on mi odma prebaci na 11 total"
    // This means: forEmptying affects both total and reduces empty
    // Let's NOT auto-modify total here since spec says "ako ne moze i ne mora"
  }

  // DO NOT auto-calculate Additional Required - user sets it manually
  // It's only used for status display, not calculated from other fields

  // Update display
  const additionalSelect = document.querySelector(
    `select[data-idx="${idx}"][data-field="additionalRequired"]`,
  );
  if (additionalSelect && field !== "additionalRequired") {
    additionalSelect.value = row.additionalRequired || 0;
  }

  const statusCell = document.querySelector(
    `td[data-field="status"][data-idx="${idx}"]`,
  );
  if (statusCell) statusCell.textContent = calculateBinStatus(row);

  saveBinsData();
  markDirty();
  applyBinColors();
}

function calculateBinStatus(row) {
  const G = row.totalAvailable;
  const H = row.emptyAvailable;
  const I = row.forEmptying;
  const J = row.additionalRequired;

  if (G === 0) return "";

  const ratio = H / G;
  let parts = [];

  // Additional required only affects status - if > 0 show "Bring new"
  if (J > 0) parts.push(t("binStatusBring"));

  // Other status indicators
  if (ratio < 0.33) parts.push(t("binStatusNotEnough"));
  else if (ratio >= 0.33 && ratio < 0.66) parts.push(t("binStatusLow"));
  else if (J === 0 && ratio >= 0.66) parts.push(t("binStatusOk"));
  if (I > H) parts.push(t("binStatusEmpty"));

  return parts.join(" /// ");
}

function applyBinColors() {
  const binsData = getBinsDataForDate(appState.currentDate);

  binsData.rows.forEach((row, idx) => {
    const G = row.totalAvailable;
    const H = row.emptyAvailable;
    const I = row.forEmptying;
    const J = row.additionalRequired;

    if (G === 0) return;

    const ratio = H / G;

    // Total Available cell
    const totalCell = document.querySelector(
      `td[data-field="totalAvailable"][data-idx="${idx}"]`,
    );
    if (totalCell) {
      totalCell.classList.remove(
        "bin-cell-green",
        "bin-cell-yellow",
        "bin-cell-red",
      );
      if (ratio >= 0.66) totalCell.classList.add("bin-cell-green");
      else if (ratio >= 0.33) totalCell.classList.add("bin-cell-yellow");
      else totalCell.classList.add("bin-cell-red");
    }

    // Empty Available cell
    const emptyCell = document.querySelector(
      `td[data-field="emptyAvailable"][data-idx="${idx}"]`,
    );
    if (emptyCell) {
      emptyCell.classList.remove(
        "bin-cell-green",
        "bin-cell-yellow",
        "bin-cell-red",
      );
      if (ratio >= 0.66) emptyCell.classList.add("bin-cell-green");
      else if (ratio >= 0.33) emptyCell.classList.add("bin-cell-yellow");
      else emptyCell.classList.add("bin-cell-red");
    }

    // For Emptying cell
    const forEmptyCell = document.querySelector(
      `td[data-field="forEmptying"][data-idx="${idx}"]`,
    );
    if (forEmptyCell) {
      forEmptyCell.classList.remove(
        "bin-cell-green",
        "bin-cell-yellow",
        "bin-cell-red",
      );
      const forEmptyRatio = I / G;
      if (forEmptyRatio >= 0.66)
        forEmptyCell.classList.add("bin-cell-red");
      else if (forEmptyRatio >= 0.33)
        forEmptyCell.classList.add("bin-cell-yellow");
      else forEmptyCell.classList.add("bin-cell-green");
    }

    // Additional Required cell - color based on value
    const additionalCell = document.querySelector(
      `td[data-field="additionalRequired"][data-idx="${idx}"]`,
    );
    if (additionalCell) {
      additionalCell.classList.remove(
        "bin-cell-green",
        "bin-cell-yellow",
        "bin-cell-red",
      );
      // Yellow if > 0, Red if > 3
      if (J > 3) additionalCell.classList.add("bin-cell-red");
      else if (J > 0) additionalCell.classList.add("bin-cell-yellow");
      else additionalCell.classList.add("bin-cell-green");
    }
  });
}

function addBinPlan() {
  if (!(appState.isSuperAdmin || hasAdminPermission("canManageBinsPlans")) || !canEditDate(appState.currentDate)) return;
  const binsData = getBinsDataForDate(appState.currentDate);
  const newPlanNum = binsData.planCount + 1;
  for (let k = 1; k <= 4; k++) {
    binsData.rows.push({
      plan: `Plan ${newPlanNum}`,
      karna: `Kärna ${k}`,
      totalAvailable: 0,
      emptyAvailable: 0,
      forEmptying: 0,
      additionalRequired: 0,
    });
  }
  binsData.planCount = newPlanNum;
  saveBinsData();
  markDirty();
  renderBinsTable();
  addLog("Added bin plan", `Plan ${newPlanNum}`);
  showToast("✅ Plan dodan!", "success");
}

function removeBinPlan() {
  if (!(appState.isSuperAdmin || hasAdminPermission("canManageBinsPlans")) || !canEditDate(appState.currentDate)) return;
  const binsData = getBinsDataForDate(appState.currentDate);
  if (binsData.planCount <= 1) {
    showToast("⚠️ Ne možete ukloniti sve planove!", "error");
    return;
  }
  showConfirm(`Ukloniti Plan ${binsData.planCount}?`, null, "⚠️", () => {
    binsData.rows.splice(-4, 4); // Remove last 4 rows (1 plan)
    binsData.planCount--;
    saveBinsData();
    markDirty();
    renderBinsTable();
    addLog("Removed bin plan", `Plan ${binsData.planCount + 1}`);
    showToast("✅ Plan uklonjen!", "success");
  });
}

function getWarehouseCatalogSorted() {
  return (warehouseData?.catalog || []).slice().sort((a, b) => compareNaturally(a.name, b.name));
}

function getVisibleWarehouseCatalog() {
  const catalog = getWarehouseCatalogSorted();
  if (!appState.isReadonly) return catalog;
  const allowedItemIds = new Set(getGuestWarehouseSiteAccess().allowedItemIds);
  return catalog.filter((item) => allowedItemIds.has(item.id));
}

function getVisibleWarehouseLogs() {
  const logs = warehouseData?.logs || [];
  if (!appState.isReadonly) return logs;
  const allowedItemIds = new Set(getGuestWarehouseSiteAccess().allowedItemIds);
  return logs.filter((entry) => allowedItemIds.has(entry.itemId));
}

function createDefaultWarehouseLogFilters() {
  return {
    filterDate: "",
    filterWorker: "",
    filterItem: "",
    filterType: "",
    filterFlow: "",
    sortField: "timestamp",
    sortDirection: "desc",
  };
}

let warehouseLogFilterState = createDefaultWarehouseLogFilters();

function getWarehouseItemById(itemId) {
  return (warehouseData?.catalog || []).find((item) => item.id === itemId) || null;
}

function ensureWarehouseStockRecord(itemId) {
  if (!warehouseData) loadWarehouseData();
  if (!warehouseData.stock[itemId]) {
    warehouseData.stock[itemId] = { current: 0, totalIssued: 0, totalReceived: 0 };
  }
  return warehouseData.stock[itemId];
}

function persistWarehouseData() {
  warehouseData = normalizeWarehouseData(warehouseData);
  localStorage.setItem(getStorageKey("cmax_warehouse_data"), JSON.stringify(warehouseData));
  trackEditActivity();
  scheduleServerSync();
}

function getWarehouseAlerts() {
  return getVisibleWarehouseCatalog()
    .map((item) => {
      const stock = ensureWarehouseStockRecord(item.id);
      if ((item.minimum || 0) <= 0 || stock.current > item.minimum) return null;
      return {
        item,
        stock,
      };
    })
    .filter(Boolean);
}

function getWarehouseResponsibleAdmins(site = currentSite) {
  const selected = new Set((warehouseData?.procurementUsers || []).map((email) => String(email || "").trim().toLowerCase()));
  if (!selected.size) return [];
  return getAdmins().filter((admin) => {
    if (!admin || !admin.email) return false;
    if (!selected.has(String(admin.email).trim().toLowerCase())) return false;
    if (admin.isSuperAdmin) return true;
    if (!Array.isArray(admin.allowedSites)) return true;
    return admin.allowedSites.includes(site);
  });
}

function getWarehouseResponsibleAdminsLabel(site = currentSite) {
  const admins = getWarehouseResponsibleAdmins(site);
  if (!admins.length) return t("warehouseNoAssignedAdmin");
  return admins
    .map((admin) => admin.fullName || admin.email)
    .join(", ");
}

function renderWarehouseProcurementOptions() {
  const details = document.getElementById("warehouseProcurementDetails");
  const options = document.getElementById("warehouseProcurementOptions");
  const summary = document.getElementById("warehouseProcurementSummary");
  if (!details || !options || !summary || !warehouseData) return;

  const selected = new Set((warehouseData.procurementUsers || []).map((email) => String(email || "").trim().toLowerCase()));
  const admins = getAdmins()
    .filter((admin) => admin?.email)
    .map((admin) => ({
      email: String(admin.email || "").trim().toLowerCase(),
      name: (admin.fullName || `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.email),
      allowedSites: Array.isArray(admin.allowedSites) ? admin.allowedSites : [],
      isSuperAdmin: admin.isSuperAdmin === true,
    }))
    .filter((admin) => admin.isSuperAdmin || !admin.allowedSites.length || admin.allowedSites.includes(currentSite))
    .sort((a, b) => compareNaturally(a.name, b.name));

  options.innerHTML = "";
  if (!admins.length) {
    options.innerHTML = `<div class="warehouse-multi-select-option">${escapeHtml(t("warehouseNoAssignedAdmin"))}</div>`;
  } else {
    admins.forEach((admin) => {
      const label = document.createElement("label");
      label.className = "warehouse-multi-select-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = admin.email;
      checkbox.checked = selected.has(admin.email);
      checkbox.disabled = !canEditWarehouse();
      checkbox.addEventListener("change", () => {
        const nextSelected = new Set((warehouseData.procurementUsers || []).map((email) => String(email || "").trim().toLowerCase()));
        if (checkbox.checked) nextSelected.add(admin.email);
        else nextSelected.delete(admin.email);
        warehouseData.procurementUsers = Array.from(nextSelected);
        persistWarehouseData();
        renderWarehouseProcurementOptions();
        renderWarehouseAlerts();
        renderWarehouseInventorySummary();
      });
      const text = document.createElement("span");
      text.textContent = admin.name;
      label.appendChild(checkbox);
      label.appendChild(text);
      options.appendChild(label);
    });
  }

  const selectedNames = admins.filter((admin) => selected.has(admin.email)).map((admin) => admin.name);
  summary.textContent = selectedNames.length ? selectedNames.join(", ") : "Odaberi osobe";
  details.classList.toggle("is-disabled", !canEditWarehouse());
}

function createWarehouseSelect(selectedValue, onchange) {
  const select = document.createElement("select");
  select.className = "warehouse-select";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "-";
  select.appendChild(emptyOption);
  getVisibleWarehouseCatalog().forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    if (item.id === selectedValue) option.selected = true;
    select.appendChild(option);
  });
  select.disabled = !canEditWarehouse();
  select.addEventListener("change", onchange);
  return select;
}

function createWorkerSelect(selectedValue, onchange) {
  const select = document.createElement("select");
  select.className = "warehouse-select";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "-";
  select.appendChild(emptyOption);
  sortNaturally(appState.workers || []).forEach((worker) => {
    const option = document.createElement("option");
    option.value = worker;
    option.textContent = worker;
    if (worker === selectedValue) option.selected = true;
    select.appendChild(option);
  });
  select.disabled = !canEditWarehouse();
  select.addEventListener("change", onchange);
  return select;
}

function saveWarehouseDraft() {
  persistWarehouseData();
  renderWarehouseIssueTable();
}

function renderWarehouseIssueTable() {
  const tbody = document.getElementById("warehouseIssueBody");
  if (!tbody || !warehouseData) return;
  tbody.innerHTML = "";

  const tr = document.createElement("tr");
  const workerTd = document.createElement("td");
  workerTd.appendChild(
    createWorkerSelect(warehouseData.issueDraft.worker, (event) => {
      warehouseData.issueDraft.worker = event.target.value;
      saveWarehouseDraft();
    }),
  );
  tr.appendChild(workerTd);

  warehouseData.issueDraft.slots.forEach((slot, slotIndex) => {
    const td = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "warehouse-slot-cell";
    wrap.appendChild(
      createWarehouseSelect(slot.itemId, (event) => {
        warehouseData.issueDraft.slots[slotIndex].itemId = event.target.value;
        saveWarehouseDraft();
      }),
    );
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.value = Math.max(Number(slot.quantity) || 1, 1);
    qtyInput.className = "warehouse-qty-input";
    qtyInput.disabled = !canEditWarehouse();
    qtyInput.addEventListener("change", () => {
      warehouseData.issueDraft.slots[slotIndex].quantity = Math.max(Number(qtyInput.value) || 1, 1);
      saveWarehouseDraft();
    });
    wrap.appendChild(qtyInput);
    td.appendChild(wrap);
    tr.appendChild(td);
  });

  const commentTd = document.createElement("td");
  const commentInput = document.createElement("input");
  commentInput.type = "text";
  commentInput.className = "warehouse-comment-input";
  commentInput.placeholder = t("warehouseStockCommentPlaceholder");
  commentInput.value = warehouseData.issueDraft.comment || "";
  commentInput.disabled = !canEditWarehouse();
  commentInput.addEventListener("change", () => {
    warehouseData.issueDraft.comment = commentInput.value;
    saveWarehouseDraft();
  });
  commentTd.appendChild(commentInput);
  tr.appendChild(commentTd);

  const actionsTd = document.createElement("td");
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn";
  saveBtn.textContent = t("warehouseSave");
  saveBtn.disabled = !canEditWarehouse();
  saveBtn.addEventListener("click", saveWarehouseIssueRow);
  actionsTd.appendChild(saveBtn);
  tr.appendChild(actionsTd);
  tbody.appendChild(tr);
}

function renderWarehouseInventorySummary() {
  const tbody = document.getElementById("warehouseInventoryBody");
  if (!tbody || !warehouseData) return;
  tbody.innerHTML = "";
  const visibleCatalog = getVisibleWarehouseCatalog();
  if (!visibleCatalog.length) {
    tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(t("warehouseNoVisibleItems"))}</td></tr>`;
    return;
  }
  visibleCatalog.forEach((item) => {
    const stock = ensureWarehouseStockRecord(item.id);
    const tr = document.createElement("tr");
    if ((item.minimum || 0) > 0 && stock.current <= item.minimum) {
      tr.className = "warehouse-low-stock-row";
    }
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.unit || "kom")}</td>
      <td>${stock.current}</td>
      <td>${stock.totalIssued}</td>
      <td>${stock.totalReceived}</td>
      <td>${item.minimum || 0}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderWarehouseCatalogManager() {
  const list = document.getElementById("warehouseCatalogList");
  if (!list || !warehouseData) return;
  list.innerHTML = "";
  const visibleCatalog = getVisibleWarehouseCatalog();
  if (!visibleCatalog.length) {
    list.innerHTML = `<div class="warehouse-alert-empty">${escapeHtml(t("warehouseNoVisibleItems"))}</div>`;
    return;
  }
  visibleCatalog.forEach((item) => {
    const stock = ensureWarehouseStockRecord(item.id);
    const row = document.createElement("div");
    row.className = "warehouse-catalog-item";
    row.innerHTML = `<strong>${escapeHtml(item.name)} (${escapeHtml(item.unit || "kom")})</strong><span class="warehouse-catalog-meta">Stanje ${stock.current} | min ${item.minimum || 0}</span>`;

    const actions = document.createElement("div");
    actions.className = "warehouse-catalog-actions";

    const limitBtn = document.createElement("button");
    limitBtn.className = "btn btn-small";
    limitBtn.textContent = t("warehouseThreshold");
    limitBtn.disabled = !canEditWarehouse();
    limitBtn.onclick = () => {
      showPromptDialog(t("warehouseLimitPrompt"), "⚙️", String(item.minimum || 0), (value) => {
        item.minimum = Math.max(Number(value) || 0, 0);
        persistWarehouseData();
        renderWarehousePage();
      });
    };
    actions.appendChild(limitBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-small btn-danger";
    removeBtn.textContent = t("warehouseRemoveItem");
    removeBtn.disabled = !canEditWarehouse();
    removeBtn.onclick = () => removeWarehouseCatalogItem(item.id);
    actions.appendChild(removeBtn);

    row.appendChild(actions);
    list.appendChild(row);
  });
}

function renderWarehouseAlerts() {
  const container = document.getElementById("warehouseAlerts");
  if (!container || !warehouseData) return;
  const alerts = getWarehouseAlerts();
  if (!alerts.length) {
    container.innerHTML = `<div class="warehouse-alert-empty">${escapeHtml(t("warehouseAlertsEmpty"))}</div>`;
    return;
  }
  container.innerHTML = "";
  alerts.forEach((alert) => {
    const card = document.createElement("div");
    card.className = "warehouse-alert-card";
    card.innerHTML = `<strong>${escapeHtml(alert.item.name)}</strong><span>Stanje: ${Number(alert.stock.current) || 0}</span><span>Minimum: ${Number(alert.item.minimum) || 0}</span>`;
    container.appendChild(card);
  });
}

function renderWarehousePage() {
  if (!warehouseData) loadWarehouseData();
  renderWarehouseIssueTable();
  renderWarehouseInventorySummary();
  renderWarehouseCatalogManager();
  renderWarehouseAlerts();
  renderWarehouseProcurementOptions();

  const itemSelect = document.getElementById("warehouseStockItem");
  if (itemSelect) {
    itemSelect.innerHTML = "";
    getVisibleWarehouseCatalog().forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      if (item.id === warehouseData.stockForm.itemId) option.selected = true;
      itemSelect.appendChild(option);
    });
  }
  const qtyInput = document.getElementById("warehouseStockQuantity");
  if (qtyInput) qtyInput.value = warehouseData.stockForm.quantity || 1;
  const dirSelect = document.getElementById("warehouseStockDirection");
  if (dirSelect) dirSelect.value = warehouseData.stockForm.direction || "in";
  const commentInput = document.getElementById("warehouseStockComment");
  if (commentInput) commentInput.value = warehouseData.stockForm.comment || "";
  const saveButton = document.getElementById("warehouseStockSaveBtn");
  if (saveButton) saveButton.disabled = !canEditWarehouse();
  const catalogAddButton = document.getElementById("warehouseCatalogAddBtn");
  if (catalogAddButton) catalogAddButton.disabled = !canEditWarehouse();
}

function showWarehouse() {
  if (!canAccessWarehouseModule()) {
    showToast(t("warehouseAccessDenied"), "error");
    return;
  }
  document.getElementById("tidplan-section").style.display = "none";
  document.getElementById("notifications-section").style.display = "none";
  document.getElementById("surveys-section").style.display = "none";
  document.getElementById("planner-section").style.display = "none";
  document.getElementById("warehouse-logs-section").style.display = "none";
  document.getElementById("warehouse-graph-section").style.display = "none";
  document.getElementById("warehouse-section").style.display = "block";
  currentView = "warehouse";
  saveCurrentView("warehouse");
  pushRouteForView("warehouse");
  renderWarehousePage();
  sendPresence(true).catch(() => {});
  refreshPresence().catch(() => {});
}

function showWarehouseLogs() {
  if (!canViewWarehouseLogsSection()) {
    showToast(t("warehouseLogsAccessDenied"), "error");
    return;
  }
  document.getElementById("tidplan-section").style.display = "none";
  document.getElementById("notifications-section").style.display = "none";
  document.getElementById("planner-section").style.display = "none";
  document.getElementById("warehouse-section").style.display = "none";
  document.getElementById("warehouse-graph-section").style.display = "none";
  document.getElementById("warehouse-logs-section").style.display = "block";
  currentView = "warehouseLogs";
  saveCurrentView("warehouseLogs");
  pushRouteForView("warehouseLogs");
  renderWarehouseLogsPage();
}

function showWarehouseGraph() {
  if (!canViewWarehouseAnalyticsSection()) {
    showToast(t("warehouseGraphAccessDenied"), "error");
    return;
  }
  document.getElementById("tidplan-section").style.display = "none";
  document.getElementById("notifications-section").style.display = "none";
  document.getElementById("planner-section").style.display = "none";
  document.getElementById("warehouse-section").style.display = "none";
  document.getElementById("warehouse-logs-section").style.display = "none";
  document.getElementById("warehouse-graph-section").style.display = "block";
  currentView = "warehouseGraph";
  saveCurrentView("warehouseGraph");
  pushRouteForView("warehouseGraph");
  renderWarehouseGraphPage();
}





function updateWarehouseStockForm(field, value) {
  warehouseData.stockForm[field] = value;
  persistWarehouseData();
}

function applyWarehouseMovement(itemId, quantity, direction, extra = {}) {
  const item = getWarehouseItemById(itemId);
  if (!item) return false;
  const stock = ensureWarehouseStockRecord(itemId);
  const amount = Math.max(Number(quantity) || 0, 0);
  if (!amount) return false;
  if (direction === "out" && stock.current < amount) {
    showToast(tFormat("warehouseInsufficientStock", { name: item.name }), "error");
    return false;
  }
  if (direction === "out") {
    stock.current -= amount;
    stock.totalIssued += amount;
  } else {
    stock.current += amount;
    stock.totalReceived += amount;
  }
  warehouseData.logs.push(
    createWarehouseLogEntry({
      type: extra.type || "adjustment",
      worker: extra.worker || "",
      itemId,
      itemName: item.name,
      quantity: amount,
      direction,
      comment: extra.comment || "",
      balanceAfter: stock.current,
    }),
  );
  if (warehouseData.logs.length > 3000) {
    warehouseData.logs = warehouseData.logs.slice(-3000);
  }
  return true;
}

function saveWarehouseIssueRow() {
  if (!canEditWarehouse()) return;
  const worker = (warehouseData.issueDraft.worker || "").trim();
  if (!worker) {
    showToast(t("warehouseSelectWorker"), "error");
    return;
  }
  const chosenSlots = warehouseData.issueDraft.slots
    .map((slot) => ({ itemId: slot.itemId, quantity: Math.max(Number(slot.quantity) || 1, 1) }))
    .filter((slot) => slot.itemId);
  if (!chosenSlots.length) {
    showToast(t("warehouseSelectAtLeastOneItem"), "error");
    return;
  }
  const comment = (warehouseData.issueDraft.comment || "").trim();
  for (const slot of chosenSlots) {
    const ok = applyWarehouseMovement(slot.itemId, slot.quantity, "out", {
      type: "issue",
      worker,
      comment,
    });
    if (!ok) return;
  }
  warehouseData.issueDraft = createWarehouseIssueDraft();
  persistWarehouseData();
  addLog("warehouse_issue", { worker, items: chosenSlots.length, site: currentSite });
  renderWarehousePage();
  showToast(t("warehouseIssueSaved"), "success");
}

function saveWarehouseStockAdjustment() {
  if (!canEditWarehouse()) return;
  const { itemId, quantity, direction, comment } = warehouseData.stockForm || {};
  if (!itemId) {
    showToast("Odaberi alat ili materijal.", "error");
    return;
  }
  if (!applyWarehouseMovement(itemId, quantity, direction, { type: "stock", comment })) {
    return;
  }
  warehouseData.stockForm.quantity = 1;
  warehouseData.stockForm.comment = "";
  persistWarehouseData();
  addLog("warehouse_stock_update", { itemId, quantity, direction, site: currentSite });
  renderWarehousePage();
  showToast(t("warehouseStockSaved"), "success");
}

function addWarehouseCatalogItem() {
  if (!canEditWarehouse()) return;
  showPromptDialog(t("warehouseNewItemPrompt"), "📦", "", (nameValue) => {
    const name = (nameValue || "").trim();
    if (!name) return;
    if ((warehouseData.catalog || []).some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      showToast(t("warehouseDuplicateItem"), "error");
      return;
    }
    showPromptDialog(t("warehouseUnitPrompt"), "📏", "kom", (unitValue) => {
      const unit = (unitValue || "kom").trim() || "kom";
      const id = `itm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      warehouseData.catalog.push({ id, name, unit, minimum: 0, notifyPerson: "" });
      warehouseData.stock[id] = { current: 0, totalIssued: 0, totalReceived: 0 };
      warehouseData.stockForm.itemId = id;
      persistWarehouseData();
      addLog("warehouse_catalog_add", { name, unit, site: currentSite });
      renderWarehousePage();
    });
  });
}

function removeWarehouseCatalogItem(itemId) {
  if (!canEditWarehouse()) return;
  const item = getWarehouseItemById(itemId);
  if (!item) return;
  showConfirm(tFormat("warehouseRemoveItemConfirm", { name: item.name }), null, "⚠️", () => {
    warehouseData.catalog = warehouseData.catalog.filter((entry) => entry.id !== itemId);
    delete warehouseData.stock[itemId];
    warehouseData.issueDraft.slots = warehouseData.issueDraft.slots.map((slot) =>
      slot.itemId === itemId ? { itemId: "", quantity: 1 } : slot,
    );
    if (warehouseData.stockForm.itemId === itemId) {
      warehouseData.stockForm.itemId = warehouseData.catalog[0]?.id || "";
    }
    persistWarehouseData();
    addLog("warehouse_catalog_remove", { name: item.name, site: currentSite });
    renderWarehousePage();
  });
}

function populateWarehouseLogFilters() {
  if (!warehouseData) return;
  const workerSelect = document.getElementById("warehouseLogWorker");
  const itemSelect = document.getElementById("warehouseLogItem");
  const previousWorker = warehouseLogFilterState.filterWorker || "";
  const previousItem = warehouseLogFilterState.filterItem || "";

  if (workerSelect) {
    const workers = Array.from(
      new Set(getVisibleWarehouseLogs().map((entry) => (entry.worker || "").trim()).filter(Boolean)),
    ).sort((a, b) => compareNaturally(a, b));
    workerSelect.innerHTML = '<option value="">-</option>';
    workers.forEach((worker) => {
      const option = document.createElement("option");
      option.value = worker;
      option.textContent = worker;
      workerSelect.appendChild(option);
    });
    workerSelect.value = workers.includes(previousWorker) ? previousWorker : "";
  }

  if (itemSelect) {
    const items = Array.from(
      new Set(getVisibleWarehouseLogs().map((entry) => (entry.itemName || "").trim()).filter(Boolean)),
    ).sort((a, b) => compareNaturally(a, b));
    itemSelect.innerHTML = '<option value="">-</option>';
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      itemSelect.appendChild(option);
    });
    itemSelect.value = items.includes(previousItem) ? previousItem : "";
  }
}

function readWarehouseLogControls() {
  return {
    filterDate: (document.getElementById("warehouseLogDate")?.value || "").trim(),
    filterWorker: (document.getElementById("warehouseLogWorker")?.value || "").trim(),
    filterItem: (document.getElementById("warehouseLogItem")?.value || "").trim(),
    filterType: (document.getElementById("warehouseLogType")?.value || "").trim(),
    filterFlow: (document.getElementById("warehouseLogFlow")?.value || "").trim(),
    sortField: document.getElementById("warehouseLogSort")?.value || "timestamp",
    sortDirection: document.getElementById("warehouseLogDirection")?.value || "desc",
  };
}

function syncWarehouseLogControls() {
  const state = warehouseLogFilterState || createDefaultWarehouseLogFilters();
  const map = {
    warehouseLogDate: state.filterDate,
    warehouseLogWorker: state.filterWorker,
    warehouseLogItem: state.filterItem,
    warehouseLogType: state.filterType,
    warehouseLogFlow: state.filterFlow,
    warehouseLogSort: state.sortField,
    warehouseLogDirection: state.sortDirection,
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  });
}

function applyWarehouseLogFilters() {
  warehouseLogFilterState = readWarehouseLogControls();
  renderWarehouseLogsPage();
}

function getFilteredWarehouseLogs() {
  const { filterDate, filterWorker, filterItem, filterType, filterFlow } = warehouseLogFilterState;

  return getVisibleWarehouseLogs().filter((entry) => {
    const entryDate = (entry.timestamp || "").split("T")[0];
    if (filterDate && entryDate !== filterDate) return false;
    if (filterWorker && (entry.worker || "") !== filterWorker) return false;
    if (filterItem && (entry.itemName || "") !== filterItem) return false;
    if (filterType && (entry.type || "") !== filterType) return false;
    if (filterFlow && (entry.direction || "") !== filterFlow) return false;
    return true;
  });
}

function getWarehouseSortedLogs() {
  const { sortField, sortDirection } = warehouseLogFilterState;
  const logs = getFilteredWarehouseLogs();
  logs.sort((a, b) => {
    const aValue = a?.[sortField] ?? "";
    const bValue = b?.[sortField] ?? "";
    let result = 0;
    if (sortField === "timestamp") {
      result = new Date(aValue).getTime() - new Date(bValue).getTime();
    } else if (sortField === "quantity" || sortField === "balanceAfter") {
      result = Number(aValue) - Number(bValue);
    } else {
      result = compareNaturally(String(aValue), String(bValue));
    }
    return sortDirection === "asc" ? result : -result;
  });
  return logs;
}

function resetWarehouseLogFilters() {
  warehouseLogFilterState = createDefaultWarehouseLogFilters();
  syncWarehouseLogControls();
  renderWarehouseLogsPage();
}

function deleteWarehouseLog(logId) {
  if (!appState.isSuperAdmin || !warehouseData) return;
  const entry = (warehouseData.logs || []).find((log) => log.id === logId);
  if (!entry) return;

  showConfirm(t("warehouseDeleteLogConfirm"), null, "⚠️", () => {
    warehouseData.logs = warehouseData.logs.filter((log) => log.id !== logId);
    persistWarehouseData();
    addLog("warehouse_log_delete", { logId, site: currentSite });
    renderWarehouseLogsPage();
    showToast(t("warehouseDeleteLogSuccess"), "success");
  });
}

function clearAllWarehouseLogs() {
  if (!appState.isSuperAdmin || !warehouseData) return;
  if (!warehouseData.logs.length) {
    showToast(t("warehouseNoLogsToDelete"), "error");
    return;
  }

  showConfirm(t("warehouseDeleteAllLogsConfirm"), null, "⚠️", () => {
    warehouseData.logs = [];
    persistWarehouseData();
    addLog("warehouse_logs_clear", { site: currentSite });
    renderWarehouseLogsPage();
    showToast(t("warehouseDeleteAllLogsSuccess"), "success");
  });
}

function renderWarehouseLogsPage() {
  const tbody = document.getElementById("warehouseLogsBody");
  const clearBtn = document.getElementById("warehouseClearLogsBtn");
  const actionsHead = document.getElementById("warehouseLogsActionsHead");
  if (!tbody || !warehouseData) return;
  populateWarehouseLogFilters();
  syncWarehouseLogControls();
  if (clearBtn) clearBtn.style.display = appState.isSuperAdmin ? "inline-flex" : "none";
  if (actionsHead) actionsHead.style.display = appState.isSuperAdmin ? "" : "none";
  tbody.innerHTML = "";
  const visibleLogs = getWarehouseSortedLogs();
  if (!visibleLogs.length) {
    tbody.innerHTML = `<tr><td colspan="${appState.isSuperAdmin ? 10 : 9}">${escapeHtml(t("warehouseNoVisibleLogs"))}</td></tr>`;
    return;
  }
  visibleLogs.forEach((entry) => {
    const tr = document.createElement("tr");
    const actionCell = appState.isSuperAdmin
      ? `<td><button class="btn btn-small btn-danger" onclick="deleteWarehouseLog('${escapeHtml(entry.id)}')">${escapeHtml(t("btnDeleteReport"))}</button></td>`
      : "";
    tr.innerHTML = `
      <td>${new Date(entry.timestamp).toLocaleString(getCurrentLocale())}</td>
      <td>${escapeHtml(entry.type)}</td>
      <td>${escapeHtml(entry.worker || "-")}</td>
      <td>${escapeHtml(entry.itemName || "-")}</td>
      <td>${entry.quantity}</td>
      <td>${escapeHtml(entry.direction || "-")}</td>
      <td>${escapeHtml(entry.comment || "-")}</td>
      <td>${entry.balanceAfter}</td>
      <td>${escapeHtml(entry.performedBy || "-")}</td>
      ${actionCell}
    `;
    tbody.appendChild(tr);
  });
}

function renderWarehouseGraphPage() {
  const workerChart = document.getElementById("warehouseGraphWorkers");
  const itemChart = document.getElementById("warehouseGraphItems");
  const insight = document.getElementById("warehouseGraphInsight");
  if (!workerChart || !itemChart || !insight || !warehouseData) return;
  const issueLogs = getVisibleWarehouseLogs().filter((entry) => entry.type === "issue");
  const workerTotals = {};
  const itemTotals = {};
  const itemWorkerTotals = {};
  issueLogs.forEach((entry) => {
    workerTotals[entry.worker || t("warehouseUnknown")] =
      (workerTotals[entry.worker || t("warehouseUnknown")] || 0) + (Number(entry.quantity) || 0);
    itemTotals[entry.itemName || t("warehouseUnknown")] =
      (itemTotals[entry.itemName || t("warehouseUnknown")] || 0) + (Number(entry.quantity) || 0);
    const itemName = entry.itemName || t("warehouseUnknown");
    const workerName = entry.worker || t("warehouseUnknown");
    itemWorkerTotals[itemName] = itemWorkerTotals[itemName] || {};
    itemWorkerTotals[itemName][workerName] = (itemWorkerTotals[itemName][workerName] || 0) + (Number(entry.quantity) || 0);
  });

  const renderBars = (container, source) => {
    container.innerHTML = "";
    const entries = Object.entries(source).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = entries[0]?.[1] || 1;
    if (!entries.length) {
      container.innerHTML = `<div class="warehouse-graph-empty">${escapeHtml(t("warehouseNoVisibleGraph"))}</div>`;
      return;
    }
    entries.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "warehouse-graph-bar";
      row.innerHTML = `<span class="warehouse-graph-label">${escapeHtml(label)}</span><div class="warehouse-graph-track"><div class="warehouse-graph-fill" style="width:${Math.max((value / max) * 100, 6)}%"></div></div><strong>${value}</strong>`;
      container.appendChild(row);
    });
  };

  const standoutPairs = [];
  Object.entries(itemWorkerTotals).forEach(([itemName, workerMap]) => {
    const entries = Object.entries(workerMap);
    if (!entries.length) return;
    const values = entries.map(([, value]) => value);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    entries.forEach(([workerName, value]) => {
      standoutPairs.push({
        label: `${workerName} - ${itemName}`,
        workerName,
        itemName,
        value,
        avg,
        ratio: avg > 0 ? value / avg : value,
      });
    });
  });
  const standoutSource = {};
  standoutPairs
    .sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      return b.value - a.value;
    })
    .slice(0, 8)
    .forEach((entry) => {
      standoutSource[entry.label] = entry.value;
    });

  renderBars(workerChart, standoutSource);
  renderBars(itemChart, itemTotals);

  const topStandout = standoutPairs.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    return b.value - a.value;
  })[0];
  const workerValues = Object.values(workerTotals);
  const overallAvg = workerValues.length ? workerValues.reduce((sum, value) => sum + value, 0) / workerValues.length : 0;
  const topWorker = Object.entries(workerTotals).sort((a, b) => b[1] - a[1])[0];
  if (topStandout && topStandout.value > topStandout.avg) {
    const primary = `${topStandout.workerName} se izdvaja iznad prosjeka za ${topStandout.itemName}: uzeo je ${topStandout.value}, a prosjek za taj materijal je ${topStandout.avg.toFixed(1)}.`;
    const secondary =
      topWorker && topWorker[1] > overallAvg
        ? ` Ukupno gledano, najviše je uzeo ${topWorker[0]} s ${topWorker[1]}, dok je prosjek ${overallAvg.toFixed(1)}.`
        : "";
    insight.textContent = primary + secondary;
  } else {
    insight.textContent = "Nitko se trenutno ne izdvaja znacajno iznad prosjeka za pojedini alat ili materijal.";
  }
}

function togglePlannerExportDropdown() {
  document.getElementById("plannerExportDropdownMenu").classList.toggle("show");
}

function markDirty() {
  appState.hasUnsavedChanges = true;
  trackEditActivity();
  // Show Save button
  const btnSave = document.getElementById("btnSave");
  if (btnSave && currentView === "main") {
    btnSave.style.display = "inline-flex";
  }
}

function markClean() {
  appState.hasUnsavedChanges = false;
  // Hide Save button if in main view
  const btnSave = document.getElementById("btnSave");
  if (btnSave && currentView === "main") {
    btnSave.style.display = "none";
  }
}

function saveAllData() {
  saveData();
  saveBinsData();
  syncServerState({ showSuccess: true, markAsClean: true }).catch(() => {});
}

function startAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  // Auto-save every 5 minutes
  autoSaveInterval = setInterval(() => {
    if (!appState.isReadonly) {
      saveData();
      saveBinsData();
      syncServerState({ markAsClean: true, skipLog: true }).catch(() => {});
      console.log("Auto-saved at", new Date().toLocaleTimeString());
    }
  }, 300000); // 5 minutes
}

/* ==================== HANDLE PRINT/EXPORT WITH VIEW ==================== */
function handlePrint() {
  if (!hasPermission("canPrint")) {
    showToast(t("accessPrintDenied"), "error");
    return;
  }
  if (currentView === "bins") {
    printBinsTable();
  } else {
    window.print();
  }
  addLog("Printed", currentView === "bins" ? "Bins table" : "Main table");
}

function handlePlannerExportExcel() { exportPlannerToExcel(); }
function handlePlannerExportPdf() { exportPlannerToPDF(); }
function handlePlannerExportWord() { exportPlannerToWord(); }

function handleExport() {
  if (!hasPermission("canExport")) {
    showToast(t("accessExportDenied"), "error");
    return;
  }
  if (currentView === "bins") {
    exportBinsToPDF();
  } else if (currentView === "main") {
    window.print();
  } else {
    exportToPDF();
  }
  addLog(
    "Exported to PDF",
    currentView === "bins" ? "Bins table" : "Main table",
  );
}

function printBinsTable() {
  // Create a print-friendly version
  const printWindow = window.open("", "_blank");
  const binsData = getBinsDataForDate(appState.currentDate);
  const date = new Date(appState.currentDate + "T00:00:00");
  const dateStr = date
    .toLocaleDateString("hr-HR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kante za smeće - ${dateStr}</title><style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    .date { font-size: 14px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #667eea; color: white; padding: 10px; text-align: center; font-weight: 600; }
    td { border: 1px solid #ccc; padding: 8px; text-align: center; }
    tr:hover { background: #f5f5f5; }
    .bin-cell-green { background-color: #d4edda !important; }
    .bin-cell-yellow { background-color: #fff3cd !important; }
    .bin-cell-red { background-color: #f8d7da !important; }
  </style></head><body>
    <h1>CMAX SCM - Kante za smeće</h1>
    <div class="date">${dateStr}</div>
    <table>
      <thead><tr>
        <th>Plan</th><th>Kärna</th><th>Total available</th><th>Empty available</th>
        <th>For emptying</th><th>Additional required</th><th>Status</th>
      </tr></thead>
      <tbody>`;

  binsData.rows.forEach((row) => {
    const G = row.totalAvailable;
    const H = row.emptyAvailable;
    const I = row.forEmptying;
    const J = row.additionalRequired;
    const ratio = G > 0 ? H / G : 0;
    const forEmptyRatio = G > 0 ? I / G : 0;

    let totalClass = "",
      emptyClass = "",
      forEmptyClass = "",
      additionalClass = "";

    if (ratio >= 0.66) {
      totalClass = "bin-cell-green";
      emptyClass = "bin-cell-green";
    } else if (ratio >= 0.33) {
      totalClass = "bin-cell-yellow";
      emptyClass = "bin-cell-yellow";
    } else {
      totalClass = "bin-cell-red";
      emptyClass = "bin-cell-red";
    }

    if (forEmptyRatio >= 0.66) forEmptyClass = "bin-cell-red";
    else if (forEmptyRatio >= 0.33) forEmptyClass = "bin-cell-yellow";
    else forEmptyClass = "bin-cell-green";

    if (J >= 5) additionalClass = "bin-cell-red";
    else if (J >= 2) additionalClass = "bin-cell-yellow";
    else additionalClass = "bin-cell-green";

    html += `<tr>
      <td style="font-weight:600;">${row.plan}</td>
      <td>${row.karna}</td>
      <td class="${totalClass}">${G}</td>
      <td class="${emptyClass}">${H}</td>
      <td class="${forEmptyClass}">${I}</td>
      <td class="${additionalClass}">${J}</td>
      <td style="font-size:10px;">${calculateBinStatus(row)}</td>
    </tr>`;
  });

  html += `</tbody></table></body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function exportBinsToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const binsData = getBinsDataForDate(appState.currentDate);
  const date = new Date(appState.currentDate + "T00:00:00");
  const dateStr = date
    .toLocaleDateString("hr-HR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  // Header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 297, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("CMAX PLANNER - KANTE ZA SMEĆE", 14, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, 14, 17);
  doc.setTextColor(0, 0, 0);

  // Table
  const tableData = binsData.rows.map((row) => [
    row.plan,
    row.karna,
    row.totalAvailable,
    row.emptyAvailable,
    row.forEmptying,
    row.additionalRequired,
    calculateBinStatus(row),
  ]);

  doc.autoTable({
    head: [
      [
        "Plan",
        "Kärna",
        "Total avail.",
        "Empty avail.",
        "For empty",
        "Add. req.",
        "Status",
      ],
    ],
    body: tableData,
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 26, left: 14, right: 14 },
  });

  const fileName = `CMAX_Bins_${appState.currentDate}.pdf`;
  doc.save(fileName);
}

/* ==================== MODULE EXPORT/IMPORT ==================== */
const MODULE_EXPORT_IMPORT_LABELS = {
  planner: "Planner",
  tidplan: "Tidplan",
  warehouse: "Skladište",
};

let pendingModuleImport = null;

function getModulePermission(module, action) {
  const permissionMap = {
    planner: { export: canExportPlanner, import: canImportPlanner },
    tidplan: { export: canExportTidplan, import: canImportTidplan },
    warehouse: { export: canExportWarehouse, import: canImportWarehouse },
  };
  return permissionMap[module]?.[action]?.() === true;
}

async function handleModuleExport(module, format) {
  if (!getModulePermission(module, "export")) {
    showToast("Nemate dozvolu za export.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/${module}/export/${format}?site=${encodeURIComponent(currentSite || "default")}`);
    const data = response.ok ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "EXPORT_FAILED");
    const blob = await response.blob();
    const extension = format === "pdf" ? "pdf" : "xlsx";
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${module}-${currentSite || "site"}-${new Date().toISOString().split("T")[0]}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast(`${MODULE_EXPORT_IMPORT_LABELS[module] || module} export je skinut.`, "success");
  } catch (error) {
    console.error("Module export failed:", error);
    showToast(error.message || "Greška pri exportu.", "error");
  } finally {
    hideLoading();
  }
}

function openModuleImportModal(module, format) {
  if (!getModulePermission(module, "import")) {
    showToast("Nemate dozvolu za import.", "error");
    return;
  }
  pendingModuleImport = { module, format };
  const title = document.getElementById("moduleImportTitle");
  const label = document.getElementById("moduleImportFileLabel");
  const fileInput = document.getElementById("moduleImportFile");
  if (title) title.textContent = `Import ${MODULE_EXPORT_IMPORT_LABELS[module] || module} (${format.toUpperCase()})`;
  if (label) label.textContent = format === "pdf" ? "PDF datoteka" : "Excel datoteka";
  if (fileInput) {
    fileInput.value = "";
    fileInput.accept = format === "pdf" ? ".pdf,application/pdf" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  const modal = document.getElementById("moduleImportModal");
  if (modal) modal.style.display = "flex";
}

function closeModuleImportModal() {
  pendingModuleImport = null;
  const fileInput = document.getElementById("moduleImportFile");
  if (fileInput) fileInput.value = "";
  const modal = document.getElementById("moduleImportModal");
  if (modal) modal.style.display = "none";
}

async function uploadModuleImport() {
  if (!pendingModuleImport) return;
  const { module, format } = pendingModuleImport;
  if (!getModulePermission(module, "import")) {
    showToast("Nemate dozvolu za import.", "error");
    return;
  }
  const fileInput = document.getElementById("moduleImportFile");
  if (!fileInput?.files?.length) {
    showToast("Odaberite datoteku za import.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("site", currentSite || "default");
    const response = await fetch(`/api/${module}/import/${format}`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "IMPORT_FAILED");
    showToast(`${MODULE_EXPORT_IMPORT_LABELS[module] || module} je importan.`, "success");
    closeModuleImportModal();
    await loadAllData();
    if (module === "planner") renderPlanningTable();
    if (module === "tidplan") updateTidplan();
    if (module === "warehouse") renderWarehousePage();
  } catch (error) {
    console.error("Module import failed:", error);
    showToast(error.message || "Greška pri importu.", "error");
  } finally {
    hideLoading();
  }
}

/* ==================== WAREHOUSE EXPORT/IMPORT ==================== */
async function handleWarehouseExportExcel() {
  if (!canExportWarehouse()) {
    showToast("Nemate dozvolu za export skladišta.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/warehouse/export/excel?site=${encodeURIComponent(currentSite || "default")}`);
    if (!response.ok) throw new Error("Failed to export warehouse");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skladiste-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Skladište uspješno exportano u Excel.", "success");
    addLog("Exported warehouse to Excel");
  } catch (error) {
    console.error("Error exporting warehouse:", error);
    showToast("Greška pri exportu skladišta.", "error");
  } finally {
    hideLoading();
  }
}

async function handleWarehouseImportExcel() {
  if (!canImportWarehouse()) {
    showToast("Nemate dozvolu za import skladišta.", "error");
    return;
  }
  const fileInput = document.getElementById("warehouseImportFile");
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showToast("Odaberite Excel datoteku za import.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    const response = await fetch("/api/warehouse/import/excel", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to import warehouse");
    const data = await response.json();
    showToast(`Uspješno importano ${data.itemsImported} stavki u skladište.`, "success");
    addLog("Imported warehouse from Excel", { itemsImported: data.itemsImported });
    closeModal('warehouseImportModal');
    loadWarehouseData();
    renderWarehousePage();
  } catch (error) {
    console.error("Error importing warehouse:", error);
    showToast("Greška pri importu skladišta.", "error");
  } finally {
    hideLoading();
  }
}

/* ==================== TIDPLAN EXPORT/IMPORT ==================== */
async function handleTidplanExportPdf() {
  if (!canExportTidplan()) {
    showToast("Nemate dozvolu za export Tidplana.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/tidplan/export/pdf?site=${encodeURIComponent(currentSite)}`);
    if (!response.ok) throw new Error("Failed to export Tidplan");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tidplan-${currentSite}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Tidplan uspješno exportan u PDF.", "success");
    addLog("Exported Tidplan to PDF", { site: currentSite });
  } catch (error) {
    console.error("Error exporting Tidplan:", error);
    showToast("Greška pri exportu Tidplana.", "error");
  } finally {
    hideLoading();
  }
}

async function handleTidplanImportPdf() {
  if (!canImportTidplan()) {
    showToast("Nemate dozvolu za import Tidplana.", "error");
    return;
  }
  const fileInput = document.getElementById("tidplanImportFile");
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showToast("Odaberite PDF datoteku za import.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("site", currentSite);
    const response = await fetch("/api/tidplan/import/pdf", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to import Tidplan");
    const data = await response.json();
    showToast(`Uspješno importano ${data.itemsImported} stavki u Tidplan.`, "success");
    addLog("Imported Tidplan from PDF", { site: currentSite, itemsImported: data.itemsImported });
    closeModal('tidplanImportModal');
    loadTidplanData();
    updateTidplan();
  } catch (error) {
    console.error("Error importing Tidplan:", error);
    showToast("Greška pri importu Tidplana.", "error");
  } finally {
    hideLoading();
  }
}

/* ==================== PLANNER EXPORT/IMPORT ==================== */
async function exportPlannerToExcel() {
  if (!canExportPlanner()) {
    showToast("Nemate dozvolu za export Plannera.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/planner/export/excel?site=${encodeURIComponent(currentSite)}`);
    if (!response.ok) throw new Error("Failed to export Planner");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planner-${currentSite}-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Planner uspješno exportan u Excel.", "success");
    addLog("Exported Planner to Excel", { site: currentSite });
  } catch (error) {
    console.error("Error exporting Planner:", error);
    showToast("Greška pri exportu Plannera.", "error");
  } finally {
    hideLoading();
  }
}

async function exportPlannerToPDF() {
  if (!canExportPlanner()) {
    showToast("Nemate dozvolu za export Plannera.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/planner/export/pdf?site=${encodeURIComponent(currentSite)}`);
    if (!response.ok) throw new Error("Failed to export Planner");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planner-${currentSite}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Planner uspješno exportan u PDF.", "success");
    addLog("Exported Planner to PDF", { site: currentSite });
  } catch (error) {
    console.error("Error exporting Planner:", error);
    showToast("Greška pri exportu Plannera.", "error");
  } finally {
    hideLoading();
  }
}

async function exportPlannerToWord() {
  if (!canExportPlanner()) {
    showToast("Nemate dozvolu za export Plannera.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/planner/export/word?site=${encodeURIComponent(currentSite)}`);
    if (!response.ok) throw new Error("Failed to export Planner");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planner-${currentSite}-${new Date().toISOString().split('T')[0]}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Planner uspješno exportan u Word.", "success");
    addLog("Exported Planner to Word", { site: currentSite });
  } catch (error) {
    console.error("Error exporting Planner:", error);
    showToast("Greška pri exportu Plannera.", "error");
  } finally {
    hideLoading();
  }
}

async function handlePlannerImportExcel() {
  if (!canImportPlanner()) {
    showToast("Nemate dozvolu za import Plannera.", "error");
    return;
  }
  const fileInput = document.getElementById("plannerImportFile");
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showToast("Odaberite Excel datoteku za import.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("site", currentSite);
    const response = await fetch("/api/planner/import/excel", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to import Planner");
    const data = await response.json();
    showToast(`Uspješno importano ${data.tasksImported} zadataka u Planner.`, "success");
    addLog("Imported Planner from Excel", { site: currentSite, tasksImported: data.tasksImported });
    closeModal('plannerImportModal');
    loadData(); // Reload planner data
    renderPlanningTable();
  } catch (error) {
    console.error("Error importing Planner:", error);
    showToast("Greška pri importu Plannera.", "error");
  } finally {
    hideLoading();
  }
}

/* ==================== DELETE REPORT (SUPER ADMIN) ==================== */
function deleteReport(reportId) {
  if (!(appState.isSuperAdmin || hasAdminPermission("canDeleteReports"))) return;
  showConfirm(t("confirmDeleteReport"), null, "⚠️", () => {
    let reports = getReports();
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      addLog(
        "Deleted report",
        `Lift ${report.liftNumber}, Plan ${report.plan}, Reporter: ${report.reporterName}`,
      );
    }
    reports = reports.filter((r) => r.id !== reportId);
    saveReports(reports);
    trackEditActivity();
    renderReportsList(currentReportFilter);
    updateNotifBadge();
    showToast(t("reportDeleted"), "success");
  });
}

function toggleDropdown(id) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return;
  if (dropdown.style.display === "none" || !dropdown.style.display) {
    dropdown.style.display = "block";
  } else {
    dropdown.style.display = "none";
  }
  dropdown.classList.toggle("show", dropdown.style.display === "block");
}

function togglePlannerExportImportDropdown() {
  toggleDropdown("plannerExportImportDropdown");
}

function toggleTidplanExportImportDropdown() {
  toggleDropdown("tidplanExportImportDropdown");
}

function toggleWarehouseExportImportDropdown() {
  toggleDropdown("warehouseExportImportDropdown");
}

/* ==================== PDF EXPORT ==================== */
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const dayData = getCurrentDayData();
  const date = new Date(appState.currentDate + "T00:00:00");
  const dateStr = date
    .toLocaleDateString("hr-HR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  // Header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 297, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("CMAX PLANNER", 14, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, 14, 17);
  doc.setTextColor(0, 0, 0);

  // Summary row
  const activeWorkers = getActiveResourceList("workers", appState.currentDate);
  const activeLifts = getActiveResourceList("lifts", appState.currentDate);
  const presentWorkers = activeWorkers.filter(
    (w) => dayData.workerAttendance[w] !== false,
  ).length;
  const availableLifts = activeLifts.filter(
    (l) => dayData.liftAvailability[l] !== false,
  ).length;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Resursi: ${presentWorkers}/${activeWorkers.length} dostupno  |  Liftovi: ${availableLifts}/${activeLifts.length} dostupno`,
    14,
    28,
  );
  doc.setTextColor(0, 0, 0);

  const headers = [
    t("thW1"),
    t("thW2"),
    t("thW3"),
    t("thPlan"),
    t("thKarna"),
    t("thM1"),
    t("thM2"),
    t("thL1"),
    t("thL2"),
    t("thL3"),
    t("thComment"),
  ];

  const rows = dayData.planningRows
    .filter((row) => row && Object.values(row).some((v) => v))
    .map((row) => [
      row.w1 || "",
      row.w2 || "",
      row.w3 || "",
      row.plan || "",
      row.karna || "",
      row.m1 || "",
      row.m2 || "",
      row.l1 || "",
      row.l2 || "",
      row.l3 || "",
      row.comment || "",
    ]);

  if (rows.length === 0)
    rows.push(["—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—"]);

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 32,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    bodyStyles: { textColor: [44, 62, 80], halign: "center" },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 28 },
      6: { cellWidth: 28 },
      7: { cellWidth: 18 },
      8: { cellWidth: 18 },
      9: { cellWidth: 18 },
      10: { cellWidth: "auto" },
    },
    margin: { left: 10, right: 10 },
    didDrawCell: (data) => {
      if (data.section === "body") {
        const row = dayData.planningRows[data.row.index];
        if (!row) return;
        const field = [
          "w1",
          "w2",
          "w3",
          "plan",
          "karna",
          "m1",
          "m2",
          "l1",
          "l2",
          "l3",
          "comment",
        ][data.column.index];
        const val = row[field];
        if (!val) return;
        // Color coding
        if (["w1", "w2", "w3"].includes(field)) {
          if (dayData.workerAttendance[val] === false) {
            doc.setFillColor(255, 243, 205);
            doc.rect(
              data.cell.x,
              data.cell.y,
              data.cell.width,
              data.cell.height,
              "F",
            );
            doc.setTextColor(133, 100, 4);
            doc.setFontSize(8);
            doc.text(
              val,
              data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 1,
              { align: "center" },
            );
          }
        }
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
    `CMAX SCM | ${dateStr}`,
      10,
      doc.internal.pageSize.height - 6,
    );
    doc.text(
      `${i} / ${pageCount}`,
      doc.internal.pageSize.width - 20,
      doc.internal.pageSize.height - 6,
    );
  }

  const fileName = `CMAX_Planner_${appState.currentDate}.pdf`;
  doc.save(fileName);
}

function getWarehouseInventoryExportRows() {
  if (!warehouseData) loadWarehouseData();
  return getVisibleWarehouseCatalog().map((item) => {
    const stock = ensureWarehouseStockRecord(item.id);
    return {
      name: item.name || "",
      unit: item.unit || "kom",
      current: Number(stock.current) || 0,
      issued: Number(stock.totalIssued) || 0,
      received: Number(stock.totalReceived) || 0,
      minimum: Number(item.minimum) || 0,
    };
  });
}

function exportWarehouseInventoryToPDF() {
  if (!canAccessWarehouseModule()) {
    showToast(t("warehouseAccessDenied"), "error");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const rows = getWarehouseInventoryExportRows();
  const generatedAt = new Date().toLocaleString(getCurrentLocale());

  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 297, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(`CMAX SKLADISTE - ${currentSite}`, 14, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(generatedAt, 14, 17);
  doc.setTextColor(0, 0, 0);

  doc.autoTable({
    head: [["Alat / materijal", "Jedinica", "Trenutno", "Ukupno dano", "Ukupno doslo", "Min. limit"]],
    body: rows.map((row) => [row.name, row.unit, row.current, row.issued, row.received, row.minimum]),
    startY: 30,
    styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.3 },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    bodyStyles: { textColor: [44, 62, 80] },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const source = rows[data.row.index];
      if (source && source.minimum > 0 && source.current <= source.minimum) {
        data.cell.styles.fillColor = [255, 244, 214];
        data.cell.styles.textColor = [122, 93, 0];
      }
    },
    margin: { left: 10, right: 10 },
  });

  doc.save(`CMAX_Skladiste_${currentSite}_${new Date().toISOString().split("T")[0]}.pdf`);
}

function printWarehouseInventory() {
  if (!canAccessWarehouseModule()) {
    showToast(t("warehouseAccessDenied"), "error");
    return;
  }
  const rows = getWarehouseInventoryExportRows();
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const htmlRows = rows.map((row) => `
    <tr class="${row.minimum > 0 && row.current <= row.minimum ? "low" : ""}">
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.unit)}</td>
      <td>${row.current}</td>
      <td>${row.issued}</td>
      <td>${row.received}</td>
      <td>${row.minimum}</td>
    </tr>
  `).join("");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>CMAX Skladiste</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          .meta { color: #667085; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #667eea; color: #fff; text-align: left; padding: 8px; }
          td { border: 1px solid #d0d5dd; padding: 7px; }
          tr.low td { background: #fff4d6; color: #7a5d00; }
        </style>
      </head>
      <body>
        <h1>CMAX SKLADISTE - ${escapeHtml(currentSite)}</h1>
        <div class="meta">${escapeHtml(new Date().toLocaleString(getCurrentLocale()))}</div>
        <table>
          <thead>
            <tr>
              <th>Alat / materijal</th><th>Jedinica</th><th>Trenutno</th>
              <th>Ukupno dano</th><th>Ukupno doslo</th><th>Min. limit</th>
            </tr>
          </thead>
          <tbody>${htmlRows || `<tr><td colspan="6">Nema stavki.</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}





/* ==================== SITE MANAGEMENT ==================== */
function populateSiteSelect() {
  const select = document.getElementById("siteSelect");
  const accessibleSites = getAccessibleSites();
  if (accessibleSites.length && !accessibleSites.includes(currentSite)) {
    currentSite = accessibleSites[0];
    localStorage.setItem(CURRENT_SITE_KEY, currentSite);
    STORAGE_KEY = getStorageKey("cmax_planner_data");
    BINS_KEY = getStorageKey("cmax_planner_bins");
    REPORTS_KEY = getStorageKey("cmax_planner_reports");
    NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
  }
  if (select) {
    select.innerHTML = "";
    accessibleSites
      .slice()
      .sort((a, b) => a.localeCompare(b, "hr"))
      .forEach((site) => {
        const option = document.createElement("option");
        option.value = site;
        option.textContent = site;
        if (site === currentSite) option.selected = true;
        select.appendChild(option);
      });
    // Add event listener for site selection changes
    select.removeEventListener("change", changeSite);
    select.addEventListener("change", changeSite);
  }
  renderSiteSwitcher();
  renderNotificationSiteOptions();
}

function renderSiteSwitcher() {
  const label = document.getElementById("siteSwitcherLabel");
  if (label)
    label.textContent = `${t("tidplanSiteSelector")} ${currentSite}`;

  const addBtn = document.querySelector(
    "#siteDropdown .site-dropdown-actions button:nth-child(1)",
  );
  if (addBtn) addBtn.textContent = t("tidplanAddSite");
  const removeBtn = document.querySelector(
    "#siteDropdown .site-dropdown-actions button:nth-child(2)",
  );
  if (removeBtn) removeBtn.textContent = t("tidplanRemoveSite");

  const container = document.getElementById("siteListContainer");
  if (!container) return;
  container.innerHTML = "";
  getAccessibleSites()
    .slice()
    .sort((a, b) => a.localeCompare(b, "hr"))
    .forEach((site) => {
      const item = document.createElement("button");
      item.className = "btn btn-small site-option";
      item.style.margin = "2px";
      item.textContent = site;
      item.addEventListener("click", () => {
        withLoadingPromise("loadingSiteChange", () => {
          currentSite = site;
          localStorage.setItem(CURRENT_SITE_KEY, currentSite);
          STORAGE_KEY = getStorageKey("cmax_planner_data");
          BINS_KEY = getStorageKey("cmax_planner_bins");
          REPORTS_KEY = getStorageKey("cmax_planner_reports");
          NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
          return loadAllData().then(() => {
            if (
              document.getElementById("tidplan-section").style.display ===
              "block"
            ) {
              updateTidplan();
            }
            if (document.getElementById("notifications-section").style.display === "block") {
              renderNotificationSiteOptions();
              renderNotificationsList();
            }
            if (currentView === "warehouse") {
              renderWarehousePage();
            }
            if (currentView === "warehouseLogs") {
              renderWarehouseLogsPage();
            }
            if (currentView === "warehouseGraph") {
              renderWarehouseGraphPage();
            }

            updateMainTitle();
            sendPresence(true).catch(() => {});
            refreshPresence().catch(() => {});
            closeSiteDropdown();
          });
        });
      });
      container.appendChild(item);
    });
}

function toggleSiteDropdown() {
  const dropdown = document.getElementById("siteDropdown");
  if (!dropdown) return;
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

function closeSiteDropdown() {
  const dropdown = document.getElementById("siteDropdown");
  if (!dropdown) return;
  dropdown.style.display = "none";
}

window.addEventListener("click", (event) => {
  const switcher = document.querySelector(".site-switcher");
  const dropdown = document.getElementById("siteDropdown");
  if (switcher && dropdown && !event.target.closest(".site-switcher")) {
    dropdown.style.display = "none";
  }

  const plannerExportDropdown = document.getElementById("plannerExportDropdownMenu");
  if (plannerExportDropdown && !event.target.closest("#plannerExportDropdown")) {
    plannerExportDropdown.classList.remove("show");
  }
  const sortGroup = document.querySelector(".tidplan-controls .sort-group");
  if (sortGroup && !sortGroup.contains(event.target)) {
    closeTidplanSortMenu();
  }
});

function promptAddSite() {
  closeSiteDropdown();
  addSite();
}

function confirmRemoveSite() {
  closeSiteDropdown();
  removeSite();
}

function changeSite() {
  const select = document.getElementById("siteSelect");
  if (!select) return;
  withLoadingPromise("loadingSiteChange", () => {
    currentSite = select.value;
    localStorage.setItem(CURRENT_SITE_KEY, currentSite);
    STORAGE_KEY = getStorageKey("cmax_planner_data");
    BINS_KEY = getStorageKey("cmax_planner_bins");
    REPORTS_KEY = getStorageKey("cmax_planner_reports");
    NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
    return loadAllData().then(() => {
      updateTidplan();
      if (document.getElementById("notifications-section").style.display === "block") {
        renderNotificationSiteOptions();
        renderNotificationsList();
      }
      if (currentView === "warehouse") {
        renderWarehousePage();
      }
      if (currentView === "warehouseLogs") {
        renderWarehouseLogsPage();
      }
      if (currentView === "warehouseGraph") {
        renderWarehouseGraphPage();
      }
      updateMainTitle();
      sendPresence(true).catch(() => {});
      refreshPresence().catch(() => {});
    });
  });
}

function addSite() {
  showPromptDialog("Unesite ime novog gradilišta:", "🏗️", "", (siteName) => {
    const newSite = (siteName || "").trim();
    if (!newSite) return;
    if (sites.includes(newSite)) {
      showAlert("Gradilište s tim nazivom već postoji.", "⚠️");
      return;
    }

    withLoadingPromise("loadingSiteChange", () => {
      const previousSites = [...sites];
      const previousCurrentSite = currentSite;
      const newSitePlannerKey = getSiteStorageKey("cmax_planner_data", newSite);
      const newSiteBinsKey = getSiteStorageKey("cmax_planner_bins", newSite);
      const newSiteTidplanKey = getSiteStorageKey("tidplan", newSite);
      const newSiteTidplanZonesKey = getSiteStorageKey("tidplan_zones", newSite);
      const newSiteWarehouseKey = getSiteStorageKey("cmax_warehouse_data", newSite);
      const newSiteReportsKey = getSiteStorageKey("cmax_planner_reports", newSite);
      const newSiteNotificationsKey = getSiteStorageKey("cmax_planner_notifications", newSite);
      sites.push(newSite);
      localStorage.setItem(SITES_KEY, JSON.stringify(sites));
      initializeSiteStorage(newSite);
      populateSiteSelect();
      currentSite = newSite;
      localStorage.setItem(CURRENT_SITE_KEY, currentSite);
      document.getElementById("siteSelect").value = newSite;
      STORAGE_KEY = getStorageKey("cmax_planner_data");
      BINS_KEY = getStorageKey("cmax_planner_bins");
      REPORTS_KEY = getStorageKey("cmax_planner_reports");
      NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
      return syncServerState({ includeSites: true }).then((saved) => {
        if (!saved) {
          sites = previousSites;
          currentSite = previousCurrentSite;
          localStorage.setItem(SITES_KEY, JSON.stringify(sites));
          localStorage.setItem(CURRENT_SITE_KEY, currentSite);
          localStorage.removeItem(newSitePlannerKey);
          localStorage.removeItem(newSiteBinsKey);
          localStorage.removeItem(newSiteTidplanKey);
          localStorage.removeItem(newSiteTidplanZonesKey);
          localStorage.removeItem(newSiteWarehouseKey);
          localStorage.removeItem(newSiteReportsKey);
          localStorage.removeItem(newSiteNotificationsKey);
          populateSiteSelect();
          STORAGE_KEY = getStorageKey("cmax_planner_data");
          BINS_KEY = getStorageKey("cmax_planner_bins");
          REPORTS_KEY = getStorageKey("cmax_planner_reports");
          NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
          updateMainTitle();
          showToast("Spremanje gradilišta na server nije uspjelo.", "error");
          return;
        }
        return loadAllData().then(() => {
          updateTidplan();
          updateMainTitle();
          sendPresence(true).catch(() => {});
          refreshPresence().catch(() => {});
        });
      });
    });
  });
}

function removeSite() {
  if (sites.length <= 1) {
    showAlert("Ne možete ukloniti jedino gradilište.", "⚠️");
    return;
  }
  const siteToRemove = currentSite;
  showConfirm(
    `Jeste li sigurni da želite ukloniti gradilište "${siteToRemove}"? Svi podaci će biti izgubljeni.`,
    null,
    "⚠️",
    () => {
      withLoadingPromise("loadingSiteChange", () => {
        const previousSites = [...sites];
        const previousCurrentSite = currentSite;
        const removedPlannerData = localStorage.getItem(getSiteStorageKey("cmax_planner_data", siteToRemove));
        const removedTidplanData = localStorage.getItem(getSiteStorageKey("tidplan", siteToRemove));
        const removedBinsData = localStorage.getItem(getSiteStorageKey("cmax_planner_bins", siteToRemove));
        const removedWarehouseData = localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", siteToRemove));
        const removedReportsData = localStorage.getItem(getSiteStorageKey("cmax_planner_reports", siteToRemove));
        const removedNotificationsData = localStorage.getItem(getSiteStorageKey("cmax_planner_notifications", siteToRemove));
        sites = sites.filter((s) => s !== siteToRemove);
        localStorage.setItem(SITES_KEY, JSON.stringify(sites));
        localStorage.removeItem(getStorageKey("cmax_planner_data"));
        localStorage.removeItem(getStorageKey("tidplan"));
        localStorage.removeItem(getStorageKey("cmax_planner_bins"));
        localStorage.removeItem(getStorageKey("cmax_warehouse_data"));
        localStorage.removeItem(getStorageKey("cmax_planner_reports"));
        localStorage.removeItem(getStorageKey("cmax_planner_notifications"));
        currentSite = sites[0];
        localStorage.setItem(CURRENT_SITE_KEY, currentSite);
        populateSiteSelect();
        STORAGE_KEY = getStorageKey("cmax_planner_data");
        BINS_KEY = getStorageKey("cmax_planner_bins");
        REPORTS_KEY = getStorageKey("cmax_planner_reports");
        NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
        return syncServerState({ includeSites: true }).then((saved) => {
          if (!saved) {
            sites = previousSites;
            currentSite = previousCurrentSite;
            localStorage.setItem(SITES_KEY, JSON.stringify(sites));
            localStorage.setItem(CURRENT_SITE_KEY, currentSite);
            if (removedPlannerData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_data", siteToRemove), removedPlannerData);
            }
            if (removedTidplanData !== null) {
              localStorage.setItem(getSiteStorageKey("tidplan", siteToRemove), removedTidplanData);
            }
            if (removedBinsData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_bins", siteToRemove), removedBinsData);
            }
            if (removedWarehouseData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_warehouse_data", siteToRemove), removedWarehouseData);
            }
            if (removedReportsData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_reports", siteToRemove), removedReportsData);
            }
            if (removedNotificationsData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_notifications", siteToRemove), removedNotificationsData);
            }
            populateSiteSelect();
            STORAGE_KEY = getStorageKey("cmax_planner_data");
            BINS_KEY = getStorageKey("cmax_planner_bins");
            REPORTS_KEY = getStorageKey("cmax_planner_reports");
            NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
            updateMainTitle();
            showToast("Brisanje gradilišta na serveru nije uspjelo.", "error");
            return;
          }
          return loadAllData().then(() => {
            updateTidplan();
            updateMainTitle();
            sendPresence(true).catch(() => {});
            refreshPresence().catch(() => {});
          });
        });
      });
    }
  );
}

function updateMainTitle() {
  document.getElementById("mainTitle").textContent =
    `CMAX SCM - ${currentSite}`;
}

/* ==================== TIDPLAN FUNCTIONS ==================== */
function collectPlans() {
  const once = new Set();
  const onceM = new Set();
  const onceK = new Set();

  // Base lists from main planner state
  (appState.plans || []).forEach((p) => once.add(p));
  (appState.moments || []).forEach((m) => onceM.add(m));
  (appState.karnas || []).forEach((k) => onceK.add(k));

  // Also include anything defined directly in tidplan activity rows
  (tidplanData || []).forEach((row) => {
    if (row.plan) once.add(row.plan);
    if (row.moment) onceM.add(row.moment);
    if (row.karna) onceK.add(row.karna);
  });

  availablePlans = sortNaturally(Array.from(once));
  availableMoments = sortNaturally(Array.from(onceM));
  availableKarne = sortNaturally(Array.from(onceK));
}

function loadTidplanZones() {
  const storedZones = safeParseStoredJson(
    localStorage.getItem(getStorageKey("tidplan_zones")),
    null,
  );
  if (Array.isArray(storedZones) && storedZones.length) {
    tidplanZones = storedZones;
  } else {
    tidplanZones = [
      { name: "Zona A", color: "#8fbc8f" },
      { name: "Zona B", color: "#add8e6" },
      { name: "Zona C", color: "#f4a460" },
    ];
  }
}

function saveTidplanZones() {
  localStorage.setItem(
    getStorageKey("tidplan_zones"),
    JSON.stringify(tidplanZones),
  );
  syncServerState().catch(() => {});
}

function addTidplanZone() {
  showPromptDialog("Unesite naziv zone:", "✏️", "", (zoneName) => {
    if (!zoneName) return;

    const existing = tidplanZones.find(
      (z) => z.name.toLowerCase() === zoneName.toLowerCase(),
    );
    if (existing) {
      showAlert("Zona s tim nazivom već postoji.", "⚠️");
      return;
    }

    showPromptDialog(
      "Unesite HEX boju zone (npr. #FF0000):",
      "🎨",
      "#FF0000",
      (color) => {
        if (!color) return;

        tidplanZones.push({ name: zoneName, color });
        tidplanZones.sort((a, b) => compareNaturally(a.name, b.name));
        saveTidplanZones();
        updateTidplan();
      }
    );
  });
}

function removeTidplanZone() {
  showPromptDialog("Unesite naziv zone za ukloniti:", "✏️", "", (zoneName) => {
    if (!zoneName) return;
    const index = tidplanZones.findIndex(
      (z) => z.name.toLowerCase() === zoneName.toLowerCase(),
    );
    if (index === -1) {
      showAlert("Zona nije pronađena.", "⚠️");
      return;
    }
    tidplanZones.splice(index, 1);
    saveTidplanZones();
    updateTidplan();
  });
}

function addTidplanZoneFromInputs() {
  if (!canEditTidplan()) return;
  const nameInput = document.getElementById("newZoneName");
  const colorInput = document.getElementById("newZoneColor");
  if (!nameInput || !colorInput) return;
  const name = nameInput.value.trim();
  const color = colorInput.value;
  if (!name) {
    showAlert("Unesite naziv zone.", "⚠️");
    return;
  }
  if (
    tidplanZones.some((z) => z.name.toLowerCase() === name.toLowerCase())
  ) {
    showAlert("Zona s tim nazivom već postoji.", "⚠️");
    return;
  }
  tidplanZones.push({ name, color });
  tidplanZones.sort((a, b) => compareNaturally(a.name, b.name));
  saveTidplanZones();
  updateTidplan();
  renderZoneList();
  nameInput.value = "";
}

function clearAllTidplanZones() {
  if (!canEditTidplan()) return;
  showConfirm("Jeste li sigurni da želite obrisati sve zone?", null, "⚠️", () => {
    tidplanZones = [];
    saveTidplanZones();
    updateTidplan();
    renderZoneList();
  });
}

function renderZoneList() {
  const editableTidplan = canEditTidplan();
  const locale = getCurrentLocale();
  const zoneList = document.getElementById("zoneList");
  if (!zoneList) return;
  zoneList.innerHTML = "";
  tidplanZones
    .slice()
    .sort((a, b) => compareNaturally(a.name, b.name))
    .forEach((zone) => {
      const btn = document.createElement("button");
      btn.className = "zone-btn";
      btn.disabled = !editableTidplan;
      const colorDot = document.createElement("div");
      colorDot.className = "zone-btn-color";
      colorDot.style.backgroundColor = zone.color;
      const nameSpan = document.createElement("span");
      nameSpan.textContent = zone.name;
      btn.appendChild(colorDot);
      btn.appendChild(nameSpan);
      btn.onclick = () => {
        if (!editableTidplan) return;
        showConfirm(`Želite li ukloniti zonu '${zone.name}'?`, null, "⚠️", () => {
          tidplanZones = tidplanZones.filter((z) => z.name !== zone.name);
          saveTidplanZones();
          updateTidplan();
          renderZoneList();
        });
      };
      zoneList.appendChild(btn);
    });
}

function toggleZoneManager() {
  if (!canEditTidplan() || !hasPermission("canManageTidplanZones")) return;
  const panel = document.getElementById("zoneManagerPanel");
  if (!panel) return;
  panel.style.display =
    panel.style.display === "block" ? "none" : "block";
}

function getZonaColor(name) {
  const zone = tidplanZones.find((z) => z.name === name);
  if (zone) return zone.color;

  switch (name) {
    case "Zona A":
      return "#8fbc8f";
    case "Zona B":
      return "#add8e6";
    case "Zona C":
      return "#f4a460";
    default:
      return "#d3d3d3";
  }
}

function loadTidplanData() {
  tidplanData =
    safeParseStoredJson(localStorage.getItem(getStorageKey("tidplan")), []) || [];

  loadTidplanZones();

  // Use main planner data first; fall back to local storage defaults.
  availablePlans = getActiveResourceList("plans", appState.currentDate);
  availableMoments = getActiveResourceList("moments", appState.currentDate);
  availableKarne = getActiveResourceList("karnas", appState.currentDate);

  collectPlans();
}

function showTidplan() {
  if (!canAccessTidplanModule()) {
    showToast(t("accessTidplanDenied"), "error");
    return;
  }
  withLoading("loadingTidplan", () => {
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");
    const warehouseLogsSection = document.getElementById("warehouse-logs-section");
    const warehouseGraphSection = document.getElementById("warehouse-graph-section");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (currentView === "notifications") {
      currentView = "main";
      saveCurrentView("main");
    }
    document.getElementById("planner-section").style.display = "none";
    document.getElementById("tidplan-section").style.display = "block";
    currentView = "tidplan";
    saveCurrentView("tidplan");
    pushRouteForView("tidplan");
    updateTidplan();
    initTidplanResizer();
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  });
}

function showPlanner() {
  const notificationsSection = document.getElementById("notifications-section");
  const surveysSection = document.getElementById("surveys-section");
  const warehouseSection = document.getElementById("warehouse-section");
  const warehouseLogsSection = document.getElementById("warehouse-logs-section");
  const warehouseGraphSection = document.getElementById("warehouse-graph-section");
  const tidplanSection = document.getElementById("tidplan-section");
  const plannerSection = document.getElementById("planner-section");
  if (notificationsSection) notificationsSection.style.display = "none";
  if (surveysSection) surveysSection.style.display = "none";
  if (warehouseSection) warehouseSection.style.display = "none";
  if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
  if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  currentView = "main";
  if (tidplanSection) tidplanSection.style.display = "none";
  if (plannerSection) plannerSection.style.display = "block";
  applyPermissionVisibility();
  saveCurrentView("main");
  pushRouteForView("main");
  sendPresence(true).catch(() => {});
  refreshPresence().catch(() => {});
}

function updateTidplan() {
  collectPlans();
  const editableTidplan = canEditTidplan();
  const locale = getCurrentLocale();

  // Display total present and available workers
  const presentWorkersEl = document.getElementById("totalPresentWorkers");
  const totalWorkersEl = document.getElementById("totalWorkers");
  if (presentWorkersEl && totalWorkersEl) {
    const dayData = getCurrentDayData();
    const activeWorkers = getActiveResourceList("workers", appState.currentDate);
    const presentCount = activeWorkers.filter(
      (w) => dayData.workerAttendance[w] !== false
    ).length;
    presentWorkersEl.textContent = presentCount;
    totalWorkersEl.textContent = activeWorkers.length;
    const availableWorkersWrap = presentWorkersEl.parentElement;
    if (availableWorkersWrap) {
      availableWorkersWrap.childNodes[0].textContent = `${t("tidplanAvailableWorkers")} `;
    }
  }

  const saveBtn = document.getElementById("btnSaveTidplan");
  if (saveBtn) {
    saveBtn.disabled = !editableTidplan || !tidplanDataChanged;
    saveBtn.style.opacity = saveBtn.disabled ? "0.6" : "1";
    saveBtn.style.cursor = saveBtn.disabled ? "not-allowed" : "pointer";
  }

  const headerTitle = document.getElementById("tidplanTitle");
  if (headerTitle)
    headerTitle.textContent = `${t("tidplanTitle")} - ${currentSite}`;
  const tidplanSiteEl = document.getElementById("tidplanSite");
  if (tidplanSiteEl) tidplanSiteEl.textContent = currentSite;
  const tidplanSiteLabel = document.getElementById("tidplanSiteLabel");
  if (tidplanSiteLabel)
    tidplanSiteLabel.textContent = `${t("tidplanSiteLabel")} `;
  const tidplanDateLabel = document.getElementById("tidplanDateLabel");
  if (tidplanDateLabel)
    tidplanDateLabel.textContent = `${t("tidplanDateLabel")} `;
  const tidplanDateEl = document.getElementById("tidplanDate");
  if (tidplanDateEl)
    tidplanDateEl.textContent = new Date().toLocaleDateString(locale);

  const btnAdd = document.getElementById("btnAddTidplanActivity");
  if (btnAdd) {
    btnAdd.textContent = t("tidplanAddActivity");
    btnAdd.disabled = !editableTidplan || !hasPermission("canAddTidplanActivity");
  }
  const btnManageZones = document.getElementById("btnManageZones");
  if (btnManageZones) {
    btnManageZones.textContent = t("tidplanManageZones");
    btnManageZones.disabled =
      !editableTidplan || !hasPermission("canManageTidplanZones");
  }
  const btnPrint = document.getElementById("btnPrintTidplan");
  if (btnPrint) {
    btnPrint.textContent = t("tidplanPrint");
    btnPrint.disabled = !hasPermission("canPrintTidplan");
  }
  const btnBack = document.getElementById("btnBackToPlanner");
  if (btnBack) btnBack.textContent = t("tidplanBackToPlanner");
  const btnSort = document.getElementById("btnSortTidplan");
  if (btnSort) btnSort.textContent = t("tidplanSort");
  const btnClear = document.getElementById("btnClearTidplan");
  if (btnClear) btnClear.textContent = t("tidplanClearPlan");
  const btnSave = document.getElementById("btnSaveTidplan");
  if (btnSave) btnSave.textContent = t("tidplanSave");

  const btnTidplanExportPdf = document.getElementById("btnTidplanExportPdf");
  if (btnTidplanExportPdf) btnTidplanExportPdf.textContent = t("tidplanExportPdf");
  const btnTidplanImportPdf = document.getElementById("btnTidplanImportPdf");
  if (btnTidplanImportPdf) btnTidplanImportPdf.textContent = t("tidplanImportPdf");
  const sortPanelHeader = document.querySelector(
    "#tidplanSortOptions .sort-panel-header",
  );
  if (sortPanelHeader) sortPanelHeader.textContent = t("tidplanSortBy");

  const applySortBtn = document.querySelector(
    "#tidplanSortOptions .btn.btn-small",
  );
  if (applySortBtn) applySortBtn.textContent = t("tidplanApplySort");

  const zoneManagerTitle = document.querySelector("#zoneManagerPanel strong");
  if (zoneManagerTitle) {
    zoneManagerTitle.textContent = t("tidplanZoneManagerTitle");
  }

  const zoneManagerCloseBtn = document.querySelector(
    "#zoneManagerPanel .btn.btn-small",
  );
  if (zoneManagerCloseBtn) zoneManagerCloseBtn.textContent = t("tidplanClose");

  const zoneNameInput = document.getElementById("newZoneName");
  if (zoneNameInput) {
    zoneNameInput.placeholder = t("tidplanZoneNamePlaceholder");
  }

  const addZoneBtn = document.querySelector(".zone-input-group .btn.btn-small");
  if (addZoneBtn) addZoneBtn.textContent = t("tidplanAddZone");

  if (btnClear)
    btnClear.disabled = !editableTidplan || !hasPermission("canClearTidplan");

  const zoneManagerPanel = document.getElementById("zoneManagerPanel");
  if (zoneManagerPanel && !editableTidplan) {
    zoneManagerPanel.style.display = "none";
  }

  populateFilters();
  renderZoneList();
  renderTidplanTable();
  renderTidplanTimeline();

  // Initialize flatpickr for tidplan date inputs
  setTimeout(() => initTidplanDatePickers(), 10);

  // Setup scroll synchronization between left panel and timeline
  setTimeout(() => {
    syncTidplanScroll();
  }, 50);
}

function syncTidplanScroll() {
  const leftPanel = document.querySelector(".tidplan-left-panel");
  const timeline = document.getElementById("tidplanTimeline");

  if (!leftPanel || !timeline) return;

  let syncing = false;

  const syncFromLeft = () => {
    if (syncing) return;
    syncing = true;
    timeline.scrollTop = leftPanel.scrollTop;
    syncing = false;
  };

  const syncFromRight = () => {
    if (syncing) return;
    syncing = true;
    leftPanel.scrollTop = timeline.scrollTop;
    syncing = false;
  };

  leftPanel.onscroll = syncFromLeft;
  timeline.onscroll = syncFromRight;
  timeline.scrollTop = leftPanel.scrollTop;
}

let tidplanSortCriteria = [];

function openTidplanSortMenu() {
  const sortOptions = document.getElementById("tidplanSortOptions");
  if (!sortOptions) return;

  sortOptions.classList.add("show");
  sortOptions.style.right = "0";
  sortOptions.style.left = "auto";

  // Auto flip if left edge overflows viewport
  const rect = sortOptions.getBoundingClientRect();
  if (rect.left < 8) {
    sortOptions.style.left = "0";
    sortOptions.style.right = "auto";
    sortOptions.classList.add("flip-left");
  } else {
    sortOptions.classList.remove("flip-left");
  }
}

function closeTidplanSortMenu() {
  const sortOptions = document.getElementById("tidplanSortOptions");
  if (!sortOptions) return;

  sortOptions.classList.remove("show");
}

function toggleTidplanSortMenu() {
  const sortOptions = document.getElementById("tidplanSortOptions");
  if (!sortOptions) return;

  if (sortOptions.classList.contains("show")) {
    closeTidplanSortMenu();
  } else {
    openTidplanSortMenu();
  }
}

function applyTidplanSort() {
  const checkboxes = document.querySelectorAll(
    "#tidplanSortOptions input[type='checkbox']",
  );
  tidplanSortCriteria = Array.from(checkboxes)
    .filter((c) => c.checked)
    .map((c) => c.value);

  // Close the dropdown
  document.getElementById("tidplanSortOptions").classList.remove("show");

  // Refresh the table with new sorting
  updateTidplan();
}

function getFilteredTidplanData() {
  let filteredData = (tidplanData || []).slice();

  const filterPlan = (document.getElementById("filterPlan")?.value || "").trim();
  const filterZona = (document.getElementById("filterZona")?.value || "").trim();
  const filterMoment = (document.getElementById("filterMoment")?.value || "").trim();

  const normalize = (value) => (value || "").toString().trim().toLowerCase();
  const matchesFilter = (target, filter) => {
    if (!filter) return true;
    const t = normalize(target);
    const f = normalize(filter);
    return t === f;
  };

  if (filterPlan && filterPlan !== "-") {
    filteredData = filteredData.filter((d) => matchesFilter(d.plan, filterPlan));
  }

  if (filterZona && filterZona !== "-") {
    filteredData = filteredData.filter((d) => matchesFilter(d.zona, filterZona));
  }

  if (filterMoment && filterMoment !== "-") {
    filteredData = filteredData.filter((d) => matchesFilter(d.moment, filterMoment));
  }

  if (filterPlan || filterZona || filterMoment) {
    console.debug(
      "Tidplan filter:",
      { filterPlan, filterZona, filterMoment },
      " -> records:",
      filteredData.length,
    );
  }

  if (tidplanSortCriteria.length) {
    filteredData.sort((a, b) => {
      for (const key of tidplanSortCriteria) {
        const aVal = (a[key] || "").toString();
        const bVal = (b[key] || "").toString();
        if (key === "resursi") {
          const numA = Number(aVal) || 0;
          const numB = Number(bVal) || 0;
          if (numA !== numB) return numA - numB;
        } else if (key === "start" || key === "end") {
          const dA = aVal ? new Date(aVal) : new Date(0);
          const dB = bVal ? new Date(bVal) : new Date(0);
          if (dA - dB !== 0) return dA - dB;
        } else {
          const comp = compareNaturally(aVal, bVal);
          if (comp !== 0) return comp;
        }
      }
      return 0;
    });
  }

  return filteredData;
}

function isTidplanActivityInactive(activity) {
  return activity && activity.active === false;
}

function getWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getSaturdayBetween(year, startMonthIndex, startDay, endMonthIndex, endDay) {
  const date = new Date(year, startMonthIndex, startDay);
  const end = new Date(year, endMonthIndex, endDay);
  while (date <= end) {
    if (date.getDay() === 6) return new Date(date);
    date.setDate(date.getDate() + 1);
  }
  return null;
}

function getSwedishHolidayMap(year) {
  window.swedishHolidayCache = window.swedishHolidayCache || {};
  if (window.swedishHolidayCache[year]) {
    return window.swedishHolidayCache[year];
  }

  const holidays = new Map([
    [`${year}-01-01`, "Nyarsdagen"],
    [`${year}-01-06`, "Trettondedag jul"],
    [`${year}-05-01`, "Forsta maj"],
    [`${year}-06-06`, "Sveriges nationaldag"],
    [`${year}-12-25`, "Juldagen"],
    [`${year}-12-26`, "Annandag jul"],
  ]);

  const easterSunday = getEasterSunday(year);
  [
    [-2, "Langfredagen"],
    [0, "Paskdagen"],
    [1, "Annandag pask"],
    [39, "Kristi himmelsfards dag"],
  ].forEach(([offset, name]) => {
    const holiday = new Date(easterSunday);
    holiday.setDate(holiday.getDate() + offset);
    holidays.set(getDateKey(holiday), name);
  });

  const midsummerDay = getSaturdayBetween(year, 5, 20, 5, 26);
  if (midsummerDay) {
    holidays.set(getDateKey(midsummerDay), "Midsommardagen");
  }

  const allSaintsDay = getSaturdayBetween(year, 9, 31, 10, 6);
  if (allSaintsDay) {
    holidays.set(getDateKey(allSaintsDay), "Alla helgons dag");
  }

  window.swedishHolidayCache[year] = holidays;
  return holidays;
}

function getSwedishDayMeta(date) {
  const holidayName = getSwedishHolidayMap(date.getFullYear()).get(getDateKey(date)) || "";
  return {
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
    isHoliday: Boolean(holidayName),
    holidayName,
  };
}

function populateFilters() {
  const filterPlan = document.getElementById("filterPlan");
  const filterZona = document.getElementById("filterZona");
  const filterMoment = document.getElementById("filterMoment");

  const selectedPlan = filterPlan ? filterPlan.value : "";
  const selectedZona = filterZona ? filterZona.value : "";
  const selectedMoment = filterMoment ? filterMoment.value : "";

  if (filterPlan) {
    filterPlan.innerHTML = `<option value="">-</option>`;
    sortNaturally(availablePlans).forEach((plan) => {
      const option = document.createElement("option");
      option.value = plan;
      option.textContent = plan;
      filterPlan.appendChild(option);
    });
    if (selectedPlan) {
      filterPlan.value = selectedPlan;
    } else {
      filterPlan.value = "";
    }
  }

  if (filterZona) {
    filterZona.innerHTML = `<option value="">-</option>`;

    const zoneSet = new Set();
    (tidplanZones || []).forEach((zone) => {
      if (zone && zone.name) zoneSet.add(zone.name.toString().trim());
    });
    (tidplanData || []).forEach((row) => {
      if (row && row.zona && row.zona.toString().trim())
        zoneSet.add(row.zona.toString().trim());
    });

    Array.from(zoneSet)
      .sort((a, b) => compareNaturally(a, b))
      .forEach((zoneName) => {
        const option = document.createElement("option");
        option.value = zoneName;
        option.textContent = zoneName;
        filterZona.appendChild(option);
      });

    if (selectedZona) filterZona.value = selectedZona;
  }

  if (filterMoment) {
    filterMoment.innerHTML = `<option value="">-</option>`;
    sortNaturally(Array.from(new Set(tidplanData.map((d) => d.moment) || []))).forEach(
      (moment) => {
        const option = document.createElement("option");
        option.value = moment;
        option.textContent = moment;
        filterMoment.appendChild(option);
      }
    );
    if (selectedMoment) {
      filterMoment.value = selectedMoment;
    } else {
      filterMoment.value = "";
    }
  }
}

function renderTidplanTimeline() {
  const locale = getCurrentLocale();
  // Display total present and available workers
  const presentWorkersEl = document.getElementById("totalPresentWorkers");
  const totalWorkersEl = document.getElementById("totalWorkers");
  if (presentWorkersEl && totalWorkersEl) {
    const dayData = getCurrentDayData();
    const activeWorkers = getActiveResourceList("workers", appState.currentDate);
    const presentCount = activeWorkers.filter(
      (w) => dayData.workerAttendance[w] !== false
    ).length;
    presentWorkersEl.textContent = presentCount;
    totalWorkersEl.textContent = activeWorkers.length;
  }

  // Calculate date range including all activities
  let minDate = new Date();
  minDate.setDate(minDate.getDate() - 14);
  let maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 14);
  tidplanData.forEach((activity) => {
    if (activity.start) {
      const start = new Date(activity.start);
      if (start < minDate) minDate = new Date(start);
    }
    if (activity.end) {
      const end = new Date(activity.end);
      if (end > maxDate) maxDate = new Date(end);
    }
  });
  // Extend by 1 week on each side
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 7);

  const days = [];
  for (
    let d = new Date(minDate);
    d <= maxDate;
    d.setDate(d.getDate() + 1)
  ) {
    days.push(new Date(d));
  }

  const weeks = {};
  days.forEach((day) => {
    const weekNum = getWeekNumber(day);
    if (!weeks[weekNum]) weeks[weekNum] = [];
    weeks[weekNum].push(day);
  });

  // Render header
  const header = document.getElementById("timelineHeader");
  header.innerHTML = "";
  header.style.width = days.length * 40 + "px";
  Object.keys(weeks).forEach((week) => {
    const weekDiv = document.createElement("div");
    weekDiv.className = "week-header";
    weekDiv.style.width = weeks[week].length * 40 + "px";
    weekDiv.style.minWidth = weeks[week].length * 40 + "px";
    weekDiv.style.maxWidth = weeks[week].length * 40 + "px";
    const weekLabel = document.createElement("div");
    weekLabel.className = "week-label";
    weekLabel.textContent = "V" + week;
    weekDiv.appendChild(weekLabel);
    const dayHeaders = document.createElement("div");
    dayHeaders.className = "day-headers";
    weeks[week].forEach((day) => {
      const dayHeader = document.createElement("div");
      dayHeader.className = "day-header";
      const dayMeta = getSwedishDayMeta(day);
      const dayName = document.createElement("span");
      dayName.className = "day-header-name";
      dayName.textContent = day.toLocaleDateString(locale, {
        weekday: "short",
      }).replace(".", "");

      const dayDate = document.createElement("span");
      dayDate.className = "day-header-date";
      dayDate.textContent = day.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });

      dayHeader.appendChild(dayName);
      dayHeader.appendChild(dayDate);
      if (dayMeta.isHoliday) {
        dayHeader.classList.add("is-holiday");
      } else if (dayMeta.isWeekend) {
        dayHeader.classList.add("is-weekend");
      }
      dayHeader.title = dayMeta.isHoliday
        ? `${day.toLocaleDateString(locale)} - ${dayMeta.holidayName}`
        : dayMeta.isWeekend
          ? `${day.toLocaleDateString(locale)} - ${t("weekendLabel")}`
          : day.toLocaleDateString(locale);
      if (day.toDateString() === new Date().toDateString()) {
        dayHeader.classList.add("today");
      }
      dayHeaders.appendChild(dayHeader);
    });
    weekDiv.appendChild(dayHeaders);
    header.appendChild(weekDiv);
  });

  // Render body
  const body = document.getElementById("timelineBody");
  body.innerHTML = "";
  body.style.width = days.length * 40 + "px";
  const filteredData = getFilteredTidplanData();
  const todayStr = new Date().toDateString();
  const todayIndex = days.findIndex((day) => day.toDateString() === todayStr);
  const dayMetaList = days.map((day) => getSwedishDayMeta(day));

  const appendTodayLine = (target) => {
    if (todayIndex < 0) return;
    const todayLine = document.createElement("div");
    todayLine.className = "today-line";
    todayLine.style.left = todayIndex * 40 + "px";
    target.appendChild(todayLine);
  };

  const appendDayHighlights = (target) => {
    dayMetaList.forEach((meta, dayIndex) => {
      if (!meta.isWeekend && !meta.isHoliday) return;
      const highlight = document.createElement("div");
      highlight.className = `timeline-day-highlight ${meta.isHoliday ? "is-holiday" : "is-weekend"}`;
      highlight.style.left = dayIndex * 40 + "px";
      target.appendChild(highlight);
    });
  };

  filteredData.forEach((activity, index) => {
    const row = document.createElement("div");
    row.className = `timeline-row${isTidplanActivityInactive(activity) ? " timeline-row-inactive" : ""}`;
    // Keep background white for better readability
    row.style.backgroundColor = "var(--card-bg)";
    appendDayHighlights(row);
    appendTodayLine(row);

    // Calculate bar position first to position zone indicator
    if (activity.start && activity.end) {
      const start = new Date(activity.start);
      const end = new Date(activity.end);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      const startIndex = days.findIndex(
        (d) => d.toISOString().split("T")[0] === startStr,
      );
      const endIndex = days.findIndex(
        (d) => d.toISOString().split("T")[0] === endStr,
      );
      if (startIndex >= 0 && endIndex >= 0) {
        const left = startIndex * 40;
        const width = (endIndex - startIndex + 1) * 40;

        // Add zone indicator circle positioned 15px before the Gantt bar
        const zoneIndicator = document.createElement("div");
        zoneIndicator.className = "zone-indicator";
        zoneIndicator.style.backgroundColor = getZonaColor(activity.zona);
        zoneIndicator.style.left = (left - 15) + "px"; // 15px before Gantt bar start
        zoneIndicator.title = `Zona: ${activity.zona || "Nepoznata zona"}`;
        zoneIndicator.setAttribute("data-zone", activity.zona || "");
        row.appendChild(zoneIndicator);

        const bar = document.createElement("div");
        bar.className = `gantt-bar${isTidplanActivityInactive(activity) ? " gantt-bar-inactive" : ""}`;
        bar.style.left = left + "px";
        bar.style.width = width + "px";
        bar.style.backgroundColor = isTidplanActivityInactive(activity)
          ? "#98a2b3"
          : getActivityColor(
          activity.plan,
          activity.moment,
        );
        bar.textContent = activity.plan + " - " + activity.moment;
        bar.title = [
          `Plan: ${activity.plan || "-"}`,
          `Zona: ${activity.zona || "-"}`,
          `Karna: ${activity.karna || "-"}`,
          `Moment: ${activity.moment || "-"}`,
          `Resursi: ${activity.resursi || 0}`,
          `Komentar: ${activity.komentar || "-"}`,
        ].join("\n");
        row.appendChild(bar);

        const commentText = (activity.komentar || activity.comment || "").trim();
        if (commentText) {
          const commentEl = document.createElement("div");
          commentEl.className = "timeline-comment";
          commentEl.style.left = (left + width + 8) + "px";
          commentEl.textContent = commentText;
          commentEl.title = commentText;
          row.appendChild(commentEl);
        }
      } else {
        // No valid Gantt bar - place zone indicator at default position
        const zoneIndicator = document.createElement("div");
        zoneIndicator.className = "zone-indicator";
        zoneIndicator.style.backgroundColor = getZonaColor(activity.zona);
        zoneIndicator.style.left = "15px"; // Default position for rows without Gantt bars
        zoneIndicator.title = `Zona: ${activity.zona || "Nepoznata zona"}`;
        zoneIndicator.setAttribute("data-zone", activity.zona || "");
        row.appendChild(zoneIndicator);

        const commentText = (activity.komentar || activity.comment || "").trim();
        if (commentText) {
          const commentEl = document.createElement("div");
          commentEl.className = "timeline-comment";
          commentEl.style.left = "8px";
          commentEl.textContent = commentText;
          commentEl.title = commentText;
          row.appendChild(commentEl);
        }
      }
    } else {
      // No start/end dates - place zone indicator at default position
      const zoneIndicator = document.createElement("div");
      zoneIndicator.className = "zone-indicator";
      zoneIndicator.style.backgroundColor = getZonaColor(activity.zona);
      zoneIndicator.style.left = "15px"; // Default position for rows without dates
      zoneIndicator.title = `Zona: ${activity.zona || "Nepoznata zona"}`;
      zoneIndicator.setAttribute("data-zone", activity.zona || "");
      row.appendChild(zoneIndicator);
    }
    body.appendChild(row);
  });

  // Add resource summary footer using present workers on current date
  const dayData = getCurrentDayData();
  const presentWorkers = getActiveResourceList("workers", appState.currentDate).filter(
    (w) => dayData.workerAttendance[w] !== false
  ).length;
  
  const footerRow = document.createElement("div");
  footerRow.className = "timeline-row timeline-resources-footer";
  footerRow.style.backgroundColor = "var(--header-bg)";
  footerRow.style.fontWeight = "bold";
  footerRow.style.borderTop = "2px solid var(--border-color)";
  footerRow.style.display = "flex";
  footerRow.style.alignItems = "center";
  appendDayHighlights(footerRow);
  appendTodayLine(footerRow);

  // Calculate daily resources needed
  days.forEach((day, dayIndex) => {
    const dayStr = day.toISOString().split("T")[0];
    let dailyNeeded = 0;

    filteredData.forEach((activity) => {
      if (isTidplanActivityInactive(activity)) return;
      if (activity.start && activity.end) {
        const start = new Date(activity.start).toISOString().split("T")[0];
        const end = new Date(activity.end).toISOString().split("T")[0];
        if (start <= dayStr && dayStr <= end) {
          dailyNeeded += parseInt(activity.resursi) || 0;
        }
      }
    });

    const cellDiv = document.createElement("div");
    cellDiv.style.flex = "0 0 40px";
    cellDiv.style.width = "40px";
    cellDiv.style.height = "30px";
    cellDiv.style.minWidth = "40px";
    cellDiv.style.maxWidth = "40px";
    cellDiv.style.boxSizing = "border-box";
    cellDiv.style.display = "flex";
    cellDiv.style.alignItems = "center";
    cellDiv.style.justifyContent = "center";
    cellDiv.style.fontSize = "12px";
    cellDiv.style.fontWeight = "bold";
    cellDiv.style.color = "#fff";
    cellDiv.style.borderRight = "1px solid var(--border-color)";
    const surplus = Math.max(presentWorkers - dailyNeeded, 0);
    const shortage = Math.max(dailyNeeded - presentWorkers, 0);
    const dayLabel = day.toLocaleDateString(locale);

    if (shortage > 0) {
      cellDiv.style.backgroundColor = "#d85d6d";
    } else if (surplus > 0) {
      cellDiv.style.backgroundColor = "#3a7afe";
    } else {
      cellDiv.style.backgroundColor = "#39b86f";
    }

    cellDiv.title = [
      `Datum: ${dayLabel}`,
      `Potrebno resursa: ${dailyNeeded}`,
      `Dostupno resursa: ${presentWorkers}`,
      `Visak resursa: ${surplus}`,
      `Manjak resursa: ${shortage}`,
    ].join("\n");

    cellDiv.textContent = dailyNeeded > 0 ? dailyNeeded : "0";

    footerRow.appendChild(cellDiv);
  })

  body.appendChild(footerRow);

  // Store days for reference
  window.tidplanDays = days;
}

function renderTidplanTable() {
  const editableTidplan = canEditTidplan();
  const tbody = document.getElementById("tidplanTbody");
  tbody.innerHTML = "";

  const filteredData = getFilteredTidplanData();
  if (!filteredData.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td colspan='9' style='text-align:center;color:#777;'>Nema aktivnosti</td>";
    tbody.appendChild(tr);
    return;
  }

  filteredData.forEach((activity) => {
    const tr = document.createElement("tr");
    tr.dataset.activityIndex = String(tidplanData.indexOf(activity));
    tr.className = isTidplanActivityInactive(activity) ? "tidplan-row-inactive" : "";
    tr.style.backgroundColor = isTidplanActivityInactive(activity)
      ? "rgba(148, 163, 184, 0.2)"
      : getZonaColor(activity.zona);

    const tdPlan = document.createElement("td");
    tdPlan.className = "tidplan-cell-wide";
    const selectPlan = document.createElement("select");
    selectPlan.className = "tidplan-select";
    selectPlan.disabled = !editableTidplan;
    sortNaturally(availablePlans).forEach((plan) => {
      const option = document.createElement("option");
      option.value = plan;
      option.textContent = plan;
      if (plan === activity.plan) option.selected = true;
      selectPlan.appendChild(option);
    });
    selectPlan.onchange = () => {
      activity.plan = selectPlan.value;
      markTidplanChanged();
      updateTidplan();
    };
    tdPlan.appendChild(selectPlan);
    tr.appendChild(tdPlan);

    const tdZona = document.createElement("td");
    const selectZona = document.createElement("select");
    selectZona.className = "tidplan-select";
    selectZona.disabled = !editableTidplan;
    tidplanZones
      .slice()
      .sort((a, b) => compareNaturally(a.name, b.name))
      .forEach((zone) => {
        const option = document.createElement("option");
        option.value = zone.name;
        option.textContent = zone.name;
        if (zone.name === activity.zona) option.selected = true;
        selectZona.appendChild(option);
      });
    selectZona.onchange = () => {
      activity.zona = selectZona.value;
      markTidplanChanged();
      updateTidplan();
    };
    tdZona.appendChild(selectZona);
    tr.appendChild(tdZona);

    const tdKarna = document.createElement("td");
    tdKarna.className = "tidplan-cell-wide";
    const selectKarna = document.createElement("select");
    selectKarna.className = "tidplan-select";
    selectKarna.disabled = !editableTidplan;
    sortNaturally(availableKarne).forEach((karna) => {
      const option = document.createElement("option");
      option.value = karna;
      option.textContent = karna;
      if (karna === activity.karna) option.selected = true;
      selectKarna.appendChild(option);
    });
    selectKarna.onchange = () => {
      activity.karna = selectKarna.value;
      markTidplanChanged();
      updateTidplan();
    };
    tdKarna.appendChild(selectKarna);
    tr.appendChild(tdKarna);

    const tdMoment = document.createElement("td");
    tdMoment.className = "tidplan-cell-wide";
    const selectMoment = document.createElement("select");
    selectMoment.className = "tidplan-select";
    selectMoment.disabled = !editableTidplan;
    sortNaturally(availableMoments).forEach((moment) => {
      const option = document.createElement("option");
      option.value = moment;
      option.textContent = moment;
      if (moment === activity.moment) option.selected = true;
      selectMoment.appendChild(option);
    });
    selectMoment.onchange = () => {
      activity.moment = selectMoment.value;
      markTidplanChanged();
      updateTidplan();
    };
    tdMoment.appendChild(selectMoment);
    tr.appendChild(tdMoment);

    const tdResursi = document.createElement("td");
    const inputResursi = document.createElement("input");
    inputResursi.type = "number";
    inputResursi.value = activity.resursi || 1;
    inputResursi.min = 1;
    inputResursi.disabled = !editableTidplan;
    inputResursi.onchange = () => {
      activity.resursi = parseInt(inputResursi.value) || 1;
      markTidplanChanged();
      updateTidplan();
    };
    tdResursi.appendChild(inputResursi);
    tr.appendChild(tdResursi);

    const tdStart = document.createElement("td");
    const inputStart = document.createElement("input");
    inputStart.type = "date";
    inputStart.value = activity.start || "";
    inputStart.disabled = !editableTidplan;
    inputStart.onchange = () => {
      activity.start = inputStart.value;
      markTidplanChanged();
      updateTidplan();
    };
    tdStart.appendChild(inputStart);
    tr.appendChild(tdStart);

    const tdEnd = document.createElement("td");
    const inputEnd = document.createElement("input");
    inputEnd.type = "date";
    inputEnd.value = activity.end || "";
    inputEnd.disabled = !editableTidplan;
    inputEnd.onchange = () => {
      activity.end = inputEnd.value;
      markTidplanChanged();
      updateTidplan();
    };
    tdEnd.appendChild(inputEnd);
    tr.appendChild(tdEnd);

    const tdKomentar = document.createElement("td");
    const inputKomentar = document.createElement("input");
    inputKomentar.type = "text";
    inputKomentar.placeholder = "Komentar...";
    inputKomentar.className = "tidplan-comment-input";
    inputKomentar.value = activity.komentar || "";
    inputKomentar.disabled = !editableTidplan;
    inputKomentar.onchange = () => {
      activity.komentar = inputKomentar.value;
      markTidplanChanged();
      updateTidplan();
    };
    tdKomentar.appendChild(inputKomentar);
    tr.appendChild(tdKomentar);

    const tdActions = document.createElement("td");
    const btnToggleActive = document.createElement("button");
    btnToggleActive.className = `btn btn-small ${isTidplanActivityInactive(activity) ? "" : "btn-secondary"}`;
    btnToggleActive.disabled = !editableTidplan;
    btnToggleActive.textContent = isTidplanActivityInactive(activity) ? "Uključi" : "Isključi";
    btnToggleActive.onclick = () => toggleTidplanActivityActive(Number(tr.dataset.activityIndex));
    tdActions.appendChild(btnToggleActive);

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn btn-small btn-danger";
    btnDelete.disabled =
      !editableTidplan || !hasPermission("canDeleteTidplanActivity");
    btnDelete.textContent = "−";
    btnDelete.onclick = () => {
      const toDeleteIndex = Number(tr.dataset.activityIndex);
      if (toDeleteIndex >= 0) {
        tidplanData.splice(toDeleteIndex, 1);
        markTidplanChanged();
        updateTidplan();
      }
    };
    tdActions.appendChild(document.createTextNode(" "));
    tdActions.appendChild(btnDelete);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  // Initialize flatpickr for date inputs
  setTimeout(() => initTidplanDatePickers(), 10);
}

function getActivityColor(plan, moment) {
  // Generate color based on moment only (not plan+moment combination)
  const combined = moment || "none";
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // Increased saturation and lightness for stronger colors
  return `hsl(${hue}, 85%, 48%)`;
}

function addTidplanActivity() {
  if (!canEditTidplan() || !hasPermission("canAddTidplanActivity")) return;
  const defaultZone = tidplanZones[0] ? tidplanZones[0].name : "Zona A";
  const defaultKarna = availableKarne[0] || "Karna 1";
  tidplanData.push({
    plan: "",
    zona: defaultZone,
    karna: defaultKarna,
    moment: "",
    resursi: 1,
    start: "",
    end: "",
    komentar: "",
    active: true,
  });
  markTidplanChanged();
  updateTidplan();
}

function toggleTidplanActivityActive(activityIndex) {
  const activity = tidplanData[activityIndex];
  if (!activity || !canEditTidplan()) return;

  const nextActive = isTidplanActivityInactive(activity);
  const message = nextActive
    ? "Jeste li sigurni da zelite ponovno ukljuciti ovu aktivnost?"
    : "Jeste li sigurni da zelite iskljuciti ovu aktivnost? Vise se nece racunati u resurse i vrijeme.";

  showConfirm(message, null, "⚠️", () => {
    activity.active = nextActive;
    markTidplanChanged();
    updateTidplan();
  });
}

function syncTidplanTableToState() {
  const rows = document.querySelectorAll("#tidplanTbody tr[data-activity-index]");
  rows.forEach((row) => {
    const activityIndex = Number(row.dataset.activityIndex);
    if (!Number.isInteger(activityIndex) || activityIndex < 0 || !tidplanData[activityIndex]) {
      return;
    }

    const cells = row.querySelectorAll("td");
    const activity = tidplanData[activityIndex];
    const planSelect = cells[0]?.querySelector("select");
    const zonaSelect = cells[1]?.querySelector("select");
    const karnaSelect = cells[2]?.querySelector("select");
    const momentSelect = cells[3]?.querySelector("select");
    const resursiInput = cells[4]?.querySelector("input");
    const startInput = cells[5]?.querySelector("input");
    const endInput = cells[6]?.querySelector("input");
    const komentarInput = cells[7]?.querySelector("input");

    if (planSelect) activity.plan = planSelect.value;
    if (zonaSelect) activity.zona = zonaSelect.value;
    if (karnaSelect) activity.karna = karnaSelect.value;
    if (momentSelect) activity.moment = momentSelect.value;
    if (resursiInput) activity.resursi = parseInt(resursiInput.value, 10) || 1;
    if (startInput) activity.start = startInput.value;
    if (endInput) activity.end = endInput.value;
    if (komentarInput) activity.komentar = komentarInput.value;
    if (typeof activity.active !== "boolean") activity.active = true;
  });
}

function saveTidplanData() {
  if (!canEditTidplan()) return;
  syncTidplanTableToState();
  localStorage.setItem(
    getStorageKey("tidplan"),
    JSON.stringify(tidplanData),
  );
  saveTidplanZones();
  tidplanDataChanged = false;

  // Flash success state
  const saveBtn = document.getElementById("btnSaveTidplan");
  if (saveBtn) {
    const originalBg = saveBtn.style.background;
    const originalOpacity = saveBtn.style.opacity;
    saveBtn.style.background =
      "linear-gradient(135deg, #27ae60, #2ecc71)";
    saveBtn.style.opacity = "1";
    saveBtn.disabled = true;
    saveBtn.style.cursor = "not-allowed";

    setTimeout(() => {
      saveBtn.style.background = originalBg;
      saveBtn.style.opacity = originalOpacity;
    }, 2000);
  }

  syncServerState().catch(() => {});
  showToast("✅ Plan je uspješno spremljen!", "success");
}

function markTidplanChanged() {
  if (!canEditTidplan()) return;
  tidplanDataChanged = true;
  trackEditActivity();
  const saveBtn = document.getElementById("btnSaveTidplan");
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.style.opacity = "1";
    saveBtn.style.cursor = "pointer";
  }
}

function clearTidplan() {
  if (!canEditTidplan() || !hasPermission("canClearTidplan")) return;
  showConfirm(
    "Jeste li sigurni da želite očistiti sve aktivnosti u planu? Ova radnja se ne može poništiti!",
    null,
    "⚠️",
    () => {
      tidplanData = [];
      saveTidplanData();
      updateTidplan();
      showToast("🗑️ Plan je očišćen!", "success");
    },
  );
}

function printTidplan() {
  if (!hasPermission("canPrintTidplan")) {
    showToast(t("accessTidplanPrintDenied"), "error");
    return;
  }
  const controls = document.querySelector(".tidplan-controls");
  controls.style.display = "none";
  window.print();
  controls.style.display = "flex";
  document.getElementById("tidplanSite").textContent = currentSite;
  const today = new Date();
  document.getElementById("tidplanDate").textContent =
    today.toLocaleDateString(getCurrentLocale(), {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  populateFilters();
  renderTidplanTable();
  renderTidplanTimeline();
}

function managePlans() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2>Upravljaj Planovima</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div id="plansList"></div>
      <div style="margin-top: 20px;">
        <input type="text" id="newPlanName" placeholder="Novi plan">
        <button class="btn" onclick="addPlan()">Dodaj Plan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  updatePlansList();
}

function updatePlansList() {
  const list = document.getElementById("plansList");
  if (!list) return;
  list.innerHTML = "";
  availablePlans.forEach((plan) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.marginBottom = "10px";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = plan;
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-small btn-danger";
    removeBtn.textContent = "Ukloni";
    removeBtn.onclick = () => removePlan(plan);
    div.appendChild(nameSpan);
    div.appendChild(removeBtn);
    list.appendChild(div);
  });
}

function addPlan() {
  const name = document.getElementById("newPlanName").value.trim();
  if (name && !availablePlans.includes(name)) {
    availablePlans.push(name);
    saveAvailablePlans();
    updatePlansList();
    document.getElementById("newPlanName").value = "";
    updateTidplan(); // Refresh filters
  }
}

function removePlan(plan) {
  showConfirm(`Želite li ukloniti plan "${plan}"?`, null, "⚠️", () => {
    availablePlans = availablePlans.filter((p) => p !== plan);
    saveAvailablePlans();
    updatePlansList();
    updateTidplan();
  });
}

function saveAvailablePlans() {
  appState.plans = sortNaturally([...availablePlans]);
  saveData();
  collectPlans();
  syncServerState().catch(() => {});
}

function manageMoments() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2>Upravljaj Momentima</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div id="momentsList"></div>
      <div style="margin-top: 20px;">
        <input type="text" id="newMomentName" placeholder="Novi moment">
        <button class="btn" onclick="addMoment()">Dodaj Moment</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  updateMomentsList();
}

function updateMomentsList() {
  const list = document.getElementById("momentsList");
  if (!list) return;
  list.innerHTML = "";
  availableMoments.forEach((moment) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.marginBottom = "10px";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = moment;
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-small btn-danger";
    removeBtn.textContent = "Ukloni";
    removeBtn.onclick = () => removeMoment(moment);
    div.appendChild(nameSpan);
    div.appendChild(removeBtn);
    list.appendChild(div);
  });
}

function addMoment() {
  const name = document.getElementById("newMomentName").value.trim();
  if (name && !availableMoments.includes(name)) {
    availableMoments.push(name);
    saveAvailableMoments();
    updateMomentsList();
    document.getElementById("newMomentName").value = "";
    updateTidplan();
  }
}

function removeMoment(moment) {
  showConfirm(`Želite li ukloniti moment "${moment}"?`, null, "⚠️", () => {
    availableMoments = availableMoments.filter((m) => m !== moment);
    saveAvailableMoments();
    updateMomentsList();
    updateTidplan();
  });
}

function saveAvailableMoments() {
  appState.moments = sortNaturally([...availableMoments]);
  saveData();
  collectPlans();
  syncServerState().catch(() => {});
}

function manageKarne() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2>Upravljaj Karnama</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div id="karneList"></div>
      <div style="margin-top: 20px;">
        <input type="text" id="newKarnaName" placeholder="Nova karna">
        <button class="btn" onclick="addKarna()">Dodaj Karnu</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  updateKarneList();
}

function updateKarneList() {
  const list = document.getElementById("karneList");
  if (!list) return;
  list.innerHTML = "";
  availableKarne.forEach((karna) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.marginBottom = "10px";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = karna;
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-small btn-danger";
    removeBtn.textContent = "Ukloni";
    removeBtn.onclick = () => removeKarna(karna);
    div.appendChild(nameSpan);
    div.appendChild(removeBtn);
    list.appendChild(div);
  });
}

function addKarna() {
  const name = document.getElementById("newKarnaName").value.trim();
  if (name && !availableKarne.includes(name)) {
    availableKarne.push(name);
    saveAvailableKarne();
    updateKarneList();
    document.getElementById("newKarnaName").value = "";
    updateTidplan();
  }
}

function removeKarna(karna) {
  showConfirm(`Želite li ukloniti karnu "${karna}"?`, null, "⚠️", () => {
    availableKarne = availableKarne.filter((k) => k !== karna);
    saveAvailableKarne();
    updateKarneList();
    updateTidplan();
  });
}

function saveAvailableKarne() {
  appState.karnas = sortNaturally([...availableKarne]);
  saveData();
  collectPlans();
  syncServerState().catch(() => {});
}





/* ==================== APP START ==================== */
window.onerror = function (msg, url, lineNo, columnNo, error) {
  const message = `JavaScript greška: ${msg} (${url}:${lineNo}:${columnNo})`;
  console.error(message, error);
  document.body.innerHTML = `<div style="padding:20px;color:#b00;background:#fee;font-family:sans-serif;">
    <h2>Dogodila se pogreška</h2>
    <pre>${message}</pre>
    <p>Osvježite stranicu ili pogledajte konzolu za detalje.</p>
  </div>`;
  return false;
};

function initTidplanResizer() {
  const resizer = document.getElementById("tidplanResizer");
  const leftPanel = document.querySelector(".tidplan-left-panel");
  const container = document.querySelector(".tidplan-container");

  if (!resizer || !leftPanel || !container) return;

  // Load saved width
  const savedWidth = localStorage.getItem("tidplanLeftPanelWidth");
  if (savedWidth) {
    const width = parseInt(savedWidth);
    if (width >= 300 && width <= 800) {
      leftPanel.style.width = width + "px";
    }
  }

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = leftPanel.offsetWidth;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = Math.max(300, Math.min(800, startWidth + deltaX));
    leftPanel.style.width = newWidth + "px";
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Save width
      localStorage.setItem("tidplanLeftPanelWidth", leftPanel.offsetWidth);
    }
  });

  // Initialize panel controls
  initTidplanPanelControls();
  initTidplanFullscreenControls();
}

function initTidplanPanelControls() {
  const panelToggle = document.getElementById("tidplanPanelToggle");
  const panelToggleIcon = document.getElementById("panelToggleIcon");
  const leftPanel = document.querySelector(".tidplan-left-panel");
  const container = document.querySelector(".tidplan-container");
  const resizer = document.getElementById("tidplanResizer");

  if (!panelToggle || !leftPanel || !container) return;

  let panelMode = localStorage.getItem("tidplanPanelMode") || "normal"; // "hidden", "normal", "expanded"

  function updatePanelMode() {
    // Reset classes
    leftPanel.classList.remove("tidplan-left-panel-hidden", "tidplan-left-panel-expanded");
    container.classList.remove("tidplan-container-expanded");
    resizer.style.display = "flex";

    switch (panelMode) {
      case "hidden":
        leftPanel.classList.add("tidplan-left-panel-hidden");
        resizer.style.display = "none";
        panelToggleIcon.textContent = "◑";
        panelToggle.title = "Show Panel";
        break;
      case "normal":
        // Default state - no special classes needed
        panelToggleIcon.textContent = "◐";
        panelToggle.title = "Panel Mode";
        break;
      case "expanded":
        leftPanel.classList.add("tidplan-left-panel-expanded");
        container.classList.add("tidplan-container-expanded");
        resizer.style.display = "none";
        panelToggleIcon.textContent = "◒";
        panelToggle.title = "Work Mode";
        break;
    }

    localStorage.setItem("tidplanPanelMode", panelMode);
  }

  // Set initial mode
  updatePanelMode();

  panelToggle.addEventListener("click", () => {
    switch (panelMode) {
      case "normal":
        panelMode = "hidden";
        break;
      case "hidden":
        panelMode = "expanded";
        break;
      case "expanded":
        panelMode = "normal";
        break;
    }
    updatePanelMode();
  });
}

function initTidplanFullscreenControls() {
  const fullscreenToggle = document.getElementById("tidplanFullscreenToggle");
  const timeline = document.getElementById("tidplanTimeline");

  if (!fullscreenToggle || !timeline) return;

  let isFullscreen = false;

  fullscreenToggle.addEventListener("click", () => {
    if (isFullscreen) {
      // Exit fullscreen
      timeline.classList.remove("tidplan-timeline-fullscreen");
      fullscreenToggle.classList.remove("fullscreen-active");
      fullscreenToggle.textContent = "⛶";
      fullscreenToggle.title = "Fullscreen Gantt";
      isFullscreen = false;
    } else {
      // Enter fullscreen
      timeline.classList.add("tidplan-timeline-fullscreen");
      fullscreenToggle.classList.add("fullscreen-active");
      fullscreenToggle.textContent = "✕";
      fullscreenToggle.title = "Exit Fullscreen";
      isFullscreen = true;
    }
  });

  // Exit fullscreen on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isFullscreen) {
      timeline.classList.remove("tidplan-timeline-fullscreen");
      fullscreenToggle.classList.remove("fullscreen-active");
      fullscreenToggle.textContent = "⛶";
      fullscreenToggle.title = "Fullscreen Gantt";
      isFullscreen = false;
    }
  });
}

window.onload = function () {
  try {
    initApp();
    initSurveyDateTimePickers();
  } catch (err) {
    console.error("initApp failed", err);
    document.body.innerHTML = `<div style="padding:20px;color:#b00;background:#fee;font-family:sans-serif;">
      <h2>Neuspjela inicijalizacija</h2>
      <pre>${err.toString()}</pre>
    </div>`;
  }
};

window.addEventListener("popstate", () => {
  if (document.getElementById("mainContainer")?.style.display !== "none") {
    applyRouteFromPath(window.location.pathname);
  } else if (window.location.pathname !== "/login") {
    pushRouteForView("login", { path: "/login", replace: true });
  }
});

/* ==================== DYNAMIC UI INJECTION ==================== */
document.addEventListener("DOMContentLoaded", () => {
  return;
  // Inject Warehouse Export/Import buttons and modal
  const warehouseActionsBar = document.createElement("div");
  warehouseActionsBar.className = "warehouse-actions-bar";
  warehouseActionsBar.innerHTML = `
    <button id="btnWarehouseExportExcel" class="btn btn-primary">${t("warehouseExportExcel")}</button>
    <button id="btnWarehouseImportExcel" class="btn btn-secondary">${t("warehouseImportExcel")}</button>
  `;
  const warehouseTitleEl = document.getElementById("warehouseTitle");
  if (warehouseTitleEl) {
    warehouseTitleEl.parentNode.insertBefore(warehouseActionsBar, warehouseTitleEl.nextSibling);
  }

  const warehouseImportModal = document.createElement("div");
  warehouseImportModal.id = "warehouseImportModal";
  warehouseImportModal.className = "modal-overlay";
  warehouseImportModal.style.display = "none";
  warehouseImportModal.innerHTML = `
    <div class="modal-box">
        <div class="modal-header">
            <h2>${t("warehouseImportExcel")}</h2>
            <button class="close-btn" onclick="closeModal('warehouseImportModal')">×</button>
        </div>
        <div class="modal-body">
            <input type="file" id="warehouseImportFile" accept=".xlsx" />
            <button id="warehouseImportUploadBtn" class="btn">${t("btnPublishNotification")}</button>
        </div>
    </div>
  `;
  document.body.appendChild(warehouseImportModal);

  // Inject TidPlan Export/Import buttons and modal
  const tidplanControls = document.getElementById("tidplan-controls");
  if (tidplanControls) {
    const btnPrintTidplan = document.getElementById("btnPrintTidplan");
    if (btnPrintTidplan) {
      const exportBtn = document.createElement("button");
      exportBtn.id = "btnTidplanExportPdf";
      exportBtn.className = "btn";
      exportBtn.textContent = t("tidplanExportPdf");
      exportBtn.onclick = handleTidplanExportPdf;
      btnPrintTidplan.parentNode.insertBefore(exportBtn, btnPrintTidplan.nextSibling);

      const importBtn = document.createElement("button");
      importBtn.id = "btnTidplanImportPdf";
      importBtn.className = "btn";
      importBtn.textContent = t("tidplanImportPdf");
      importBtn.onclick = () => openModal('tidplanImportModal');
      exportBtn.parentNode.insertBefore(importBtn, exportBtn.nextSibling);
    }
  }

  const tidplanImportModal = document.createElement("div");
  tidplanImportModal.id = "tidplanImportModal";
  tidplanImportModal.className = "modal-overlay";
  tidplanImportModal.style.display = "none";
  tidplanImportModal.innerHTML = `
    <div class="modal-box">
        <div class="modal-header">
            <h2>${t("tidplanImportPdf")}</h2>
            <button class="close-btn" onclick="closeModal('tidplanImportModal')">×</button>
        </div>
        <div class="modal-body">
            <input type="file" id="tidplanImportFile" accept=".pdf" />
            <button id="tidplanImportUploadBtn" class="btn">${t("btnPublishNotification")}</button>
        </div>
    </div>
  `;
  document.body.appendChild(tidplanImportModal);

  // Inject Planner Export/Import buttons and modal
  const mainControls = document.getElementById("main-controls");
  if (mainControls) {
    const btnExport = document.getElementById("btnExport"); // Existing Export PDF button
    if (btnExport) {
      const plannerExportDropdown = document.createElement("div");
      plannerExportDropdown.id = "plannerExportDropdown";
      plannerExportDropdown.className = "dropdown";
      plannerExportDropdown.innerHTML = `
        <button id="plannerExportDropdownBtn" class="btn dropdown-toggle" onclick="toggleDropdown('plannerExportDropdownMenu')">${t("export")} <span class="arrow-down"></span></button>
        <div id="plannerExportDropdownMenu" class="dropdown-menu">
            <a href="#" id="btnPlannerExportExcel" onclick="exportPlannerToExcel(); return false;">${t("exportExcel")}</a>
            <a href="#" id="btnPlannerExportPdf" onclick="exportPlannerToPDF(); return false;">${t("exportPdf")}</a>
            <a href="#" id="btnPlannerExportWord" onclick="exportPlannerToWord(); return false;">${t("exportWord")}</a>
        </div>
      `;
      mainControls.insertBefore(plannerExportDropdown, btnExport);
      btnExport.style.display = "none"; // Hide old Export PDF button

      const plannerImportExcelBtn = document.createElement("button");
      plannerImportExcelBtn.id = "btnPlannerImportExcel";
      plannerImportExcelBtn.className = "btn";
      plannerImportExcelBtn.textContent = t("plannerImportExcel");
      plannerImportExcelBtn.onclick = () => openModal('plannerImportModal');
      mainControls.insertBefore(plannerImportExcelBtn, plannerExportDropdown.nextSibling);
    }
  }

  const plannerImportModal = document.createElement("div");
  plannerImportModal.id = "plannerImportModal";
  plannerImportModal.className = "modal-overlay";
  plannerImportModal.style.display = "none";
  plannerImportModal.innerHTML = `
    <div class="modal-box">
        <div class="modal-header">
            <h2>${t("plannerImportExcel")}</h2>
            <button class="close-btn" onclick="closeModal('plannerImportModal')">×</button>
        </div>
        <div class="modal-body">
            <input type="file" id="plannerImportFile" accept=".xlsx" />
            <button id="plannerImportUploadBtn" class="btn">${t("btnPublishNotification")}</button>
        </div>
    </div>
  `;
  document.body.appendChild(plannerImportModal);

  // Inject Admin Panel Backup Tab
  const adminTabs = document.getElementById("admin-tabs");
  if (adminTabs) {
    const tabBtnBackup = document.createElement("button");
    tabBtnBackup.id = "tabBtnBackup";
    tabBtnBackup.className = "tab-btn";
    tabBtnBackup.textContent = t("backupTabTitle");
    tabBtnBackup.onclick = () => switchTab('tabBackup');
    adminTabs.appendChild(tabBtnBackup);
  }

  const adminTabContent = document.getElementById("admin-tab-content");
  if (adminTabContent) {
    const tabBackup = document.createElement("div");
    tabBackup.id = "tabBackup";
    tabBackup.className = "tab-content";
    tabBackup.innerHTML = `
      <h3>${t("backupTabTitle")}</h3>
      <div class="admin-section">
          <h4>Manual Backup</h4>
          <button id="btnManualBackup" class="btn">${t("backupManualBtn")}</button>
      </div>
      <div class="admin-section">
          <h4>Backup List</h4>
          <button id="btnListBackups" class="btn">${t("backupListBtn")}</button>
          <div id="backupListContainer" class="admin-list-container"></div>
      </div>
      <div class="admin-section">
          <h4>Backup Info</h4>
          <button id="btnBackupInfo" class="btn">${t("backupInfoBtn")}</button>
          <div id="backupInfoContainer" class="admin-info-container"></div>
      </div>
    `;
    adminTabContent.appendChild(tabBackup);
  }

  // Attach event listeners for new backup buttons
  const btnManualBackup = document.getElementById("btnManualBackup");
  if (btnManualBackup) btnManualBackup.onclick = handleManualBackup;
  const btnListBackups = document.getElementById("btnListBackups");
  if (btnListBackups) btnListBackups.onclick = handleListBackups;
  const btnBackupInfo = document.getElementById("btnBackupInfo");
  if (btnBackupInfo) btnBackupInfo.onclick = handleBackupInfo;

  // Attach event listener for Planner Import Upload
  const plannerImportUploadBtn = document.getElementById("plannerImportUploadBtn");
  if (plannerImportUploadBtn) plannerImportUploadBtn.onclick = handlePlannerImportExcel;

  // Attach event listener for Tidplan Import Upload
  const tidplanImportUploadBtn = document.getElementById("tidplanImportUploadBtn");
  if (tidplanImportUploadBtn) tidplanImportUploadBtn.onclick = handleTidplanImportPdf;
});
