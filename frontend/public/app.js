const menuButton = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const ikodiConfig = window.IKODI_CONFIG || { apiBaseUrl: "" };

window.IKODI = Object.freeze({
  config: ikodiConfig,
  apiUrl: (path) => `${ikodiConfig.apiBaseUrl}${path}`
});

if (menuButton && primaryNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = primaryNav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  primaryNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      primaryNav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

const scholarshipList = document.querySelector("#scholarship-list");
const scholarshipSearch = document.querySelector("#scholarship-search");
const resultsCount = document.querySelector("#results-count");
const applicationDialog = document.querySelector("#application-dialog");
const applicationForm = document.querySelector("#application-form");
const loginLink = document.querySelector(".login-link");
let scholarships = [];
let authMode = "register";

const formatAmount = (amount, currency) => new Intl.NumberFormat("en-KE", { style: "currency", currency: currency || "KES", maximumFractionDigits: 0 }).format(Number(amount));
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

const renderScholarships = (query = "") => {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleScholarships = scholarships.filter((scholarship) => `${scholarship.title} ${scholarship.description} ${scholarship.provider}`.toLowerCase().includes(normalizedQuery));
  resultsCount.textContent = `${visibleScholarships.length} ${visibleScholarships.length === 1 ? "opportunity" : "opportunities"}`;
  scholarshipList.innerHTML = visibleScholarships.length ? visibleScholarships.map((scholarship) => `<article class="scholarship-card"><div class="scholarship-card__top"><span class="scholarship-provider">${escapeHtml(scholarship.provider)}</span><span class="deadline">Closes ${new Date(scholarship.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div><h3>${escapeHtml(scholarship.title)}</h3><p>${escapeHtml(scholarship.description)}</p><div class="scholarship-card__bottom"><strong>${escapeHtml(formatAmount(scholarship.amount, scholarship.currency))}</strong><button class="button button--small button--primary apply-button" type="button" data-scholarship-id="${escapeHtml(scholarship.id)}" data-scholarship-title="${escapeHtml(scholarship.title)}">Apply <span aria-hidden="true">↗</span></button></div></article>`).join("") : `<div class="empty-state"><strong>No matching opportunities</strong><span>Try a different search term or check back soon.</span></div>`;
  scholarshipList.querySelectorAll(".apply-button").forEach((button) => button.addEventListener("click", () => { document.querySelector("#dialog-title").textContent = `Apply for ${button.dataset.scholarshipTitle}`; applicationDialog.dataset.scholarshipId = button.dataset.scholarshipId; applicationDialog.showModal(); }));
};

if (scholarshipList) {
  fetch(window.IKODI.apiUrl("/api/v1/scholarships")).then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load scholarships"))).then((payload) => { scholarships = payload.data || []; renderScholarships(); }).catch(() => { resultsCount.textContent = "Unable to connect"; scholarshipList.innerHTML = `<div class="empty-state"><strong>Scholarships are temporarily unavailable</strong><span>Please try again shortly.</span></div>`; });
  scholarshipSearch.addEventListener("input", (event) => renderScholarships(event.target.value));
}

document.querySelector(".dialog-close")?.addEventListener("click", () => applicationDialog.close());
loginLink?.addEventListener("click", (event) => { event.preventDefault(); authMode = "login"; applicationDialog.removeAttribute("data-scholarship-id"); document.querySelector("#dialog-title").textContent = "Welcome back"; document.querySelector("#application-form label:nth-child(3)").hidden = true; applicationDialog.showModal(); });
applicationDialog?.addEventListener("close", () => { authMode = "register"; document.querySelector("#application-form label:nth-child(3)").hidden = false; });
applicationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.querySelector("#form-message");
  const data = Object.fromEntries(new FormData(applicationForm));
  message.textContent = "Creating your application...";
  try {
    const response = await fetch(window.IKODI.apiUrl(`/api/v1/auth/${authMode}`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to create account");
    localStorage.setItem("ikodi_token", payload.token);
    if (applicationDialog.dataset.scholarshipId) {
      const applicationResponse = await fetch(window.IKODI.apiUrl("/api/v1/applications"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${payload.token}` }, body: JSON.stringify({ scholarshipId: applicationDialog.dataset.scholarshipId }) });
      if (!applicationResponse.ok) throw new Error("Account created, but the application could not be submitted");
      message.textContent = "Application submitted. We will keep you updated by email.";
    } else message.textContent = "You are signed in.";
    applicationForm.reset();
  } catch (error) { message.textContent = error.message; }
});
