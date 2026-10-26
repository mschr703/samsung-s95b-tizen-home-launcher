(function () {
  "use strict";

  var STORAGE_KEY = "luma-pinned-v2";
  var DEFAULT_NAMES = ["youtube", "netflix", "spotify"];
  var GREETINGS = ["Hallo Alex", "Hallo Sam", "Willkommen zu Hause"];
  var SAMPLE_APPS = [
    { id: "demo.youtube", name: "YouTube", iconPath: "" },
    { id: "demo.netflix", name: "Netflix", iconPath: "" },
    { id: "demo.spotify", name: "Spotify", iconPath: "" }
  ];
  var demo = !window.tizen || !tizen.application;
  var apps = [];
  var catalogView = [];
  var pinned = readPinned();
  var focusBeforeModal = null;
  var toastTimer = null;
  var greetingIndex = 0;
  var catalogPage = 0;
  var CATALOG_PAGE_SIZE = 9;
  var catalogReadyAt = 0;
  var enterHeld = false;
  var lastToggleId = null;
  var lastToggleAt = 0;

  function el(id) { return document.getElementById(id); }
  function readPinned() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Object.prototype.toString.call(value) === "[object Array]" ? value : null;
    } catch (e) { return null; }
  }
  function savePinned() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned)); } catch (e) { showToast("Auswahl konnte nicht gespeichert werden."); }
  }
  function showToast(message) {
    var node = el("toast");
    node.textContent = message;
    node.className = "toast show";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.className = "toast"; }, 3600);
  }
  function initials(name) {
    var words = name.replace(/[^\w\sÄÖÜäöüß]/g, " ").split(/\s+/);
    var value = "";
    for (var i = 0; i < words.length && value.length < 2; i++) if (words[i]) value += words[i].charAt(0);
    return (value || "A").toUpperCase();
  }
  function color(name) {
    var n = 0;
    for (var i = 0; i < name.length; i++) n = (n * 31 + name.charCodeAt(i)) | 0;
    var palette = ["#eef1ff", "#ffeff2", "#e8fff6", "#fff6dc", "#e9f8ff", "#f2eaff"];
    return palette[Math.abs(n) % palette.length];
  }
  function createIcon(app) {
    var icon = document.createElement("span");
    icon.className = "app-icon";
    if (/^youtube(?:\s|$)/i.test(app.name)) {
      icon.className += " youtube-icon";
      return icon;
    }
    icon.style.background = color(app.name);
    icon.textContent = initials(app.name);
    if (app.iconPath) {
      var image = document.createElement("img");
      image.alt = "";
      image.onload = function () { icon.textContent = ""; icon.appendChild(image); };
      image.src = app.iconPath;
    }
    return icon;
  }
  function defaultPins() {
    var result = [];
    for (var i = 0; i < DEFAULT_NAMES.length; i++) {
      for (var j = 0; j < apps.length; j++) {
        var label = apps[j].name.toLocaleLowerCase();
        if (label.indexOf(DEFAULT_NAMES[i]) >= 0 && result.indexOf(apps[j].id) < 0) {
          result.push(apps[j].id);
          break;
        }
      }
    }
    return result;
  }
  function findApp(id) {
    for (var i = 0; i < apps.length; i++) if (apps[i].id === id) return apps[i];
    return null;
  }
  function isPinned(id) { return pinned.indexOf(id) >= 0; }
  function refreshCatalogView() {
    var query = el("catalog-search").value.toLocaleLowerCase().trim();
    var matched = [];
    for (var i = 0; i < apps.length; i++) {
      var app = apps[i];
      if (!query || app.name.toLocaleLowerCase().indexOf(query) >= 0 || app.id.toLocaleLowerCase().indexOf(query) >= 0) matched.push(app);
    }
    catalogView = [];
    for (var j = 0; j < pinned.length; j++) {
      for (var k = 0; k < matched.length; k++) if (matched[k].id === pinned[j]) { catalogView.push(matched[k]); break; }
    }
    for (var m = 0; m < matched.length; m++) if (!isPinned(matched[m].id)) catalogView.push(matched[m]);
  }
  function renderHome() {
    var grid = el("app-grid");
    grid.textContent = "";
    var count = 0;
    for (var i = 0; i < pinned.length; i++) {
      var app = findApp(pinned[i]);
      if (!app) continue;
      var button = document.createElement("button");
      button.className = "app-tile focusable";
      button.type = "button";
      button.setAttribute("aria-label", app.name + " öffnen");
      button.appendChild(createIcon(app));
      var name = document.createElement("span");
      name.className = "app-name";
      name.textContent = app.name;
      button.appendChild(name);
      (function (selected) { button.onclick = function () { launch(selected); }; })(app);
      grid.appendChild(button);
      count++;
    }
    var add = document.createElement("button");
    add.className = "app-tile add-tile focusable";
    add.type = "button";
    add.setAttribute("aria-label", "Apps auswählen");
    var plus = document.createElement("span");
    plus.className = "app-icon";
    plus.textContent = "+";
    add.appendChild(plus);
    var label = document.createElement("span");
    label.className = "app-name";
    label.textContent = "Apps auswählen";
    add.appendChild(label);
    add.onclick = openCatalog;
    grid.appendChild(add);
    el("app-count").textContent = count ? count + " Favoriten" : "Noch keine Favoriten";
  }
  function renderCatalog() {
    var catalog = el("catalog");
    catalog.textContent = "";
    if (!catalogView.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = apps.length ? "Keine passende App gefunden." : "Keine Apps gefunden. Bitte prüfe die Installation auf dem Fernseher.";
      catalog.appendChild(empty);
      el("catalog-page").textContent = "0 / 0";
      el("catalog-prev").disabled = true;
      el("catalog-next").disabled = true;
      return;
    }
    var pages = Math.ceil(catalogView.length / CATALOG_PAGE_SIZE);
    if (catalogPage >= pages) catalogPage = pages - 1;
    for (var i = catalogPage * CATALOG_PAGE_SIZE; i < Math.min(catalogView.length, (catalogPage + 1) * CATALOG_PAGE_SIZE); i++) {
      var app = catalogView[i];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "catalog-item focusable" + (isPinned(app.id) ? " selected" : "");
      button.setAttribute("data-app-id", app.id);
      var icon = document.createElement("span");
      icon.className = "app-icon";
      icon.style.background = color(app.name);
      icon.textContent = initials(app.name);
      button.appendChild(icon);
      var name = document.createElement("span");
      name.textContent = app.name;
      button.appendChild(name);
      var check = document.createElement("span");
      check.className = "check";
      check.textContent = "✓";
      button.appendChild(check);
      button.setAttribute("aria-label", app.name + (isPinned(app.id) ? " entfernen" : " hinzufügen"));
      (function (selected) { button.onclick = function () { togglePin(selected.id); }; })(app);
      catalog.appendChild(button);
    }
    el("catalog-page").textContent = (catalogPage + 1) + " / " + pages + " · " + catalogView.length + " Apps";
    el("catalog-prev").disabled = catalogPage === 0;
    el("catalog-next").disabled = catalogPage >= pages - 1;
  }
  function togglePin(id) {
    if (Date.now() < catalogReadyAt) return;
    if (id === lastToggleId && Date.now() - lastToggleAt < 400) return;
    lastToggleId = id;
    lastToggleAt = Date.now();
    var index = pinned.indexOf(id);
    if (index >= 0) pinned.splice(index, 1);
    else if (pinned.length >= 7) { showToast("Bis zu sieben Apps passen auf diese Startseite."); return; }
    else pinned.push(id);
    savePinned();
    renderHome();
    renderCatalog();
    var items = el("catalog").getElementsByTagName("button");
    for (var i = 0; i < items.length; i++) if (items[i].getAttribute("data-app-id") === id) { items[i].focus(); break; }
  }
  function launch(app) {
    if (demo) { showToast("Vorschau: App-Start funktioniert auf deinem Samsung-TV."); return; }
    try {
      tizen.application.launch(app.id, function () {}, function (error) {
        showToast(app.name + " konnte nicht geöffnet werden: " + (error.message || error.name));
      });
    } catch (error) { showToast(app.name + " konnte nicht geöffnet werden."); }
  }
  function openSamsungHome() {
    if (demo) { showToast("Vorschau: Samsung Home öffnet auf dem Fernseher."); return; }
    try {
      tizen.application.launch("com.samsung.tv.csfs", function () {}, function () {
        showToast("Samsung Home konnte nicht geöffnet werden.");
      });
    } catch (error) { showToast("Samsung Home konnte nicht geöffnet werden."); }
  }
  function openCatalog() {
    if (!el("modal").hidden) return;
    focusBeforeModal = document.activeElement;
    catalogPage = 0;
    catalogReadyAt = Date.now() + 500;
    el("catalog-search").value = "";
    el("catalog-search").hidden = true;
    el("catalog-search-button").hidden = false;
    el("catalog-search-button").textContent = "Name eingeben";
    refreshCatalogView();
    renderCatalog();
    el("screen").hidden = true;
    el("modal").hidden = false;
    var first = el("catalog").getElementsByTagName("button")[0];
    setTimeout(function () { if (!el("modal").hidden) (first || el("close-modal")).focus(); }, 0);
  }
  function openSearch() {
    el("catalog-search-button").hidden = true;
    el("catalog-search").hidden = false;
    el("catalog-search").focus();
  }
  function finishSearch() {
    var input = el("catalog-search");
    if (input.hidden) return;
    input.blur();
    input.hidden = true;
    var trigger = el("catalog-search-button");
    trigger.hidden = false;
    trigger.textContent = input.value.trim() ? "Suche: " + input.value.trim() : "Name eingeben";
    var first = el("catalog").getElementsByTagName("button")[0];
    (first || trigger).focus();
  }
  function closeCatalog() {
    if (!el("catalog-search").hidden) finishSearch();
    el("modal").hidden = true;
    el("screen").hidden = false;
    if (focusBeforeModal && document.body.contains(focusBeforeModal)) focusBeforeModal.focus();
    else focusFirst();
  }
  function openConfirm() { el("confirm").hidden = false; el("stay-button").focus(); }
  function closeConfirm() { el("confirm").hidden = true; focusFirst(); }
  function exitApp() {
    if (!demo) try { tizen.application.getCurrentApplication().exit(); return; } catch (e) {}
    closeConfirm();
  }
  function focusFirst() {
    var first = el("app-grid").getElementsByTagName("button")[0];
    if (first) first.focus();
  }
  function focusableInCurrentLayer() {
    var root = !el("confirm").hidden ? el("confirm") : (!el("modal").hidden ? el("modal") : el("screen"));
    return root.querySelectorAll(".focusable:not(:disabled)");
  }
  function moveFocus(direction) {
    var nodes = focusableInCurrentLayer();
    var current = document.activeElement;
    var rect = current.getBoundingClientRect();
    var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    var best = null, score = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node === current) continue;
      var r = node.getBoundingClientRect();
      var x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      var forward = direction === "left" ? -x : direction === "right" ? x : direction === "up" ? -y : y;
      if (forward <= 1) continue;
      var lateral = direction === "left" || direction === "right" ? Math.abs(y) : Math.abs(x);
      var s = forward + lateral * 2.6;
      if (s < score) { score = s; best = node; }
    }
    if (best) best.focus();
  }
  function handleKey(event) {
    var key = event.key || "";
    var code = event.keyCode;
    if (document.activeElement === el("catalog-search")) {
      if (code === 65376 || code === 65385 || code === 10009 || key === "Escape") finishSearch();
      return;
    }
    var direction = key === "ArrowLeft" || code === 37 ? "left" : key === "ArrowRight" || code === 39 ? "right" : key === "ArrowUp" || code === 38 ? "up" : key === "ArrowDown" || code === 40 ? "down" : null;
    if (direction) { event.preventDefault(); moveFocus(direction); return; }
    if (key === "Enter" || code === 13) {
      event.preventDefault();
      event.stopPropagation();
      if (enterHeld || event.repeat) return;
      enterHeld = true;
      if (document.activeElement && document.activeElement.click) document.activeElement.click();
      return;
    }
    if (key === "Escape" || key === "Backspace" || code === 10009) {
      event.preventDefault();
      if (!el("confirm").hidden) closeConfirm();
      else if (!el("modal").hidden) closeCatalog();
      else openConfirm();
    }
  }
  function handleKeyUp(event) {
    if (event.key === "Enter" || event.keyCode === 13) {
      if (document.activeElement === el("catalog-search")) { enterHeld = false; return; }
      event.preventDefault();
      event.stopPropagation();
      enterHeld = false;
    }
  }
  function tick() {
    var now = new Date();
    el("top-time").textContent = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);
    var days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    var months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    el("today").textContent = days[now.getDay()] + ", " + now.getDate() + ". " + months[now.getMonth()];
  }
  function nextGreeting() {
    var greeting = el("greeting");
    greeting.classList.add("changing");
    setTimeout(function () {
      greetingIndex = (greetingIndex + 1) % GREETINGS.length;
      greeting.textContent = GREETINGS[greetingIndex];
      greeting.classList.remove("changing");
    }, 220);
  }
  function loadApps() {
    if (demo) {
      apps = SAMPLE_APPS;
      if (pinned === null) pinned = defaultPins();
      renderHome();
      focusFirst();
      return;
    }
    try {
      tizen.application.getAppsInfo(function (results) {
        var ownId = "";
        try { ownId = tizen.application.getCurrentApplication().appInfo.id; } catch (e) {}
        apps = results.filter(function (app) { return app.show && app.id !== ownId && typeof app.name === "string" && app.name.trim().length > 0 && app.name.trim().toLocaleLowerCase() !== "app"; });
        apps.sort(function (a, b) { return a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()); });
        if (pinned === null) { pinned = defaultPins(); savePinned(); }
        else {
          var validPins = pinned.filter(function (id) { return !!findApp(id); });
          if (validPins.length !== pinned.length) { pinned = validPins; savePinned(); }
        }
        renderHome();
        focusFirst();
      }, function () { showToast("Installierte Apps konnten nicht gelesen werden."); renderHome(); focusFirst(); });
    } catch (error) { showToast("Installierte Apps konnten nicht gelesen werden."); renderHome(); focusFirst(); }
  }
  el("close-modal").onclick = closeCatalog;
  el("stay-button").onclick = closeConfirm;
  el("exit-button").onclick = exitApp;
  el("samsung-home").onclick = openSamsungHome;
  el("edit-apps").onclick = openCatalog;
  el("catalog-search-button").onclick = openSearch;
  el("catalog-search").oninput = function () { catalogPage = 0; refreshCatalogView(); renderCatalog(); };
  el("catalog-prev").onclick = function () { if (catalogPage > 0) { catalogPage--; renderCatalog(); el("catalog").getElementsByTagName("button")[0].focus(); } };
  el("catalog-next").onclick = function () { if ((catalogPage + 1) * CATALOG_PAGE_SIZE < catalogView.length) { catalogPage++; renderCatalog(); el("catalog").getElementsByTagName("button")[0].focus(); } };
  document.addEventListener("keydown", handleKey);
  document.addEventListener("keyup", handleKeyUp);
  tick();
  setInterval(tick, 30000);
  setInterval(nextGreeting, 6000);
  loadApps();
})();
