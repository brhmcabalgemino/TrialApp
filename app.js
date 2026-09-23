/* Wedding site — countdown, nav, RSVP handling. No build step, no dependencies. */

// Where RSVPs are sent. Left empty, they are only stored in the guest's own browser.
// For the Google Sheet, deploy apps-script/Code.gs as a web app and paste its /exec URL
// here (see README). Any endpoint that accepts a JSON POST also works.
var FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbyFRrujRi_pMigdoaBNWPqbLjxkFKkeS4nGzGtJwJ0FXaX5DzhjHJxy9Sc5wuM15BZl/exec";

var WEDDING_DATE = new Date("2027-06-12T15:00:00+02:00");
var STORAGE_KEY = "rsvp-entries";

/* ---------- countdown ---------- */
(function countdown() {
  var root = document.getElementById("countdown");
  if (!root) return;

  var units = {
    days: root.querySelector('[data-unit="days"]'),
    hours: root.querySelector('[data-unit="hours"]'),
    minutes: root.querySelector('[data-unit="minutes"]'),
    seconds: root.querySelector('[data-unit="seconds"]')
  };

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function tick() {
    var left = WEDDING_DATE.getTime() - Date.now();
    if (left <= 0) {
      root.innerHTML = "<p>Today is the day.</p>";
      clearInterval(timer);
      return;
    }
    var s = Math.floor(left / 1000);
    units.days.textContent = Math.floor(s / 86400);
    units.hours.textContent = pad(Math.floor(s / 3600) % 24);
    units.minutes.textContent = pad(Math.floor(s / 60) % 60);
    units.seconds.textContent = pad(s % 60);
  }

  tick();
  var timer = setInterval(tick, 1000);
})();

/* ---------- storage helpers ---------- */
function loadEntries() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveEntry(entry) {
  try {
    var entries = loadEntries();
    entries.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- RSVP form ---------- */
(function rsvp() {
  var form = document.getElementById("rsvp-form");
  if (!form) return;

  var status = document.getElementById("form-status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var attendingInputs = form.querySelectorAll('input[name="attending"]');
  var conditionals = form.querySelectorAll("[data-when-attending]");

  function isAttending() {
    return form.querySelector('input[name="attending"]:checked').value === "yes";
  }

  function syncConditionals() {
    var show = isAttending();
    for (var i = 0; i < conditionals.length; i++) {
      conditionals[i].classList.toggle("hidden", !show);
    }
    submitBtn.textContent = show ? "Send RSVP" : "Send regrets";
  }

  for (var i = 0; i < attendingInputs.length; i++) {
    attendingInputs[i].addEventListener("change", syncConditionals);
  }
  syncConditionals();

  function setError(name, message) {
    var slot = form.querySelector('[data-error-for="' + name + '"]');
    var field = form.querySelector("#" + name);
    if (slot) slot.textContent = message || "";
    if (field && field.parentElement) {
      field.parentElement.classList.toggle("invalid", Boolean(message));
      if (message) field.setAttribute("aria-invalid", "true");
      else field.removeAttribute("aria-invalid");
    }
  }

  function validate(data) {
    var errors = {};
    if (!data.name) errors.name = "Please tell us your name.";
    if (!data.email) errors.email = "We need an email to confirm.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "That email looks off.";
    if (data.attending === "yes") {
      var n = Number(data.guests);
      if (!Number.isInteger(n) || n < 1 || n > 6) errors.guests = "Enter a number between 1 and 6.";
    }
    return errors;
  }

  function readForm() {
    var fd = new FormData(form);
    var attending = fd.get("attending");
    return {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      attending: attending,
      guests: attending === "yes" ? String(fd.get("guests") || "1").trim() : "0",
      meal: attending === "yes" ? fd.get("meal") : "",
      diet: attending === "yes" ? String(fd.get("diet") || "").trim() : "",
      shuttle: attending === "yes" && fd.get("shuttle") === "yes" ? "yes" : "no",
      message: String(fd.get("message") || "").trim(),
      submittedAt: new Date().toISOString()
    };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.className = "form-status";
    status.textContent = "";

    var data = readForm();
    var errors = validate(data);

    ["name", "email", "guests"].forEach(function (key) {
      setError(key, errors[key]);
    });

    var firstError = Object.keys(errors)[0];
    if (firstError) {
      var el = form.querySelector("#" + firstError);
      if (el) el.focus();
      status.className = "form-status bad";
      status.textContent = "Please fix the highlighted fields.";
      return;
    }

    submitBtn.disabled = true;
    status.textContent = "Sending...";

    send(data).then(function (result) {
      submitBtn.disabled = false;
      if (!result.ok) {
        status.className = "form-status bad";
        status.textContent = "We could not save that. Please email us at hello@avaandnoah.example.";
        return;
      }
      status.className = "form-status ok";
      status.textContent = data.attending === "yes"
        ? "Thank you, " + data.name.split(" ")[0] + ". Your seat" + (Number(data.guests) > 1 ? "s are" : " is") + " reserved."
        : "Thank you for letting us know. You will be missed.";
      form.reset();
      syncConditionals();
    });
  });

  function send(data) {
    var stored = saveEntry(data);

    if (!FORM_ENDPOINT) {
      return Promise.resolve({ ok: stored });
    }

    // Apps Script web apps do not answer CORS preflight requests, so post the JSON
    // as text/plain there; doPost reads the raw body either way.
    var isAppsScript = /script\.google(usercontent)?\.com/.test(FORM_ENDPOINT);
    var contentType = isAppsScript ? "text/plain;charset=utf-8" : "application/json";

    return fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: JSON.stringify(data),
      redirect: "follow"
    })
      .then(function (res) {
        if (!res.ok) return { ok: false };
        return res.json().then(
          function (body) { return { ok: body.ok !== false }; },
          function () { return { ok: true }; }
        );
      })
      .catch(function () { return { ok: stored }; });
  }
})();

/* ---------- local admin view: open the page with ?admin ---------- */
(function admin() {
  if (!/(^|[?&])admin(=|&|$)/.test(location.search)) return;

  var entries = loadEntries();
  var section = document.createElement("section");
  section.className = "admin";

  var attending = entries.filter(function (e) { return e.attending === "yes"; });
  var seats = attending.reduce(function (sum, e) { return sum + (Number(e.guests) || 0); }, 0);

  var html = "<h2>RSVPs in this browser</h2>" +
    "<p>" + entries.length + " response(s) &middot; " + attending.length +
    " attending &middot; " + seats + " seat(s) reserved.</p>" +
    '<div class="admin-actions">' +
    '<button class="btn" id="admin-csv" type="button">Download CSV</button>' +
    '<button class="btn" id="admin-clear" type="button">Clear stored RSVPs</button>' +
    "</div>";

  if (entries.length) {
    var cols = ["submittedAt", "name", "email", "phone", "attending", "guests", "meal", "diet", "shuttle", "message"];
    html += '<div class="admin-wrap"><table><thead><tr>' + cols.map(function (c) {
      return "<th>" + c + "</th>";
    }).join("") + "</tr></thead><tbody>";
    entries.forEach(function (e) {
      html += "<tr>" + cols.map(function (c) {
        return "<td>" + escapeHtml(e[c] == null ? "" : String(e[c])) + "</td>";
      }).join("") + "</tr>";
    });
    html += "</tbody></table></div>";
  }

  section.innerHTML = html;
  document.querySelector("main").appendChild(section);

  section.querySelector("#admin-csv").addEventListener("click", function () {
    downloadCsv(entries);
  });

  section.querySelector("#admin-clear").addEventListener("click", function () {
    if (!confirm("Delete every RSVP stored in this browser? This cannot be undone.")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  });

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function downloadCsv(rows) {
    var cols = ["submittedAt", "name", "email", "phone", "attending", "guests", "meal", "diet", "shuttle", "message"];
    var lines = [cols.join(",")];
    rows.forEach(function (r) {
      lines.push(cols.map(function (c) {
        var v = r[c] == null ? "" : String(r[c]);
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(","));
    });
    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "rsvps.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
})();
