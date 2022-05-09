console.info("Running...");

/* const toSchema = "https";
const toDomain = "qa.container-xchange.com";
const toPort = "";
const to = `${toSchema}://${toDomain}${toPort ? `:${toPort}` : ""}`;

const fromSchema = "http";
const fromDomain = "localhost";
const fromPort = "9001";
const from = `${fromSchema}://${fromDomain}:${fromPort ? `:${fromPort}` : ""}`;

const pathFilters = [
  "/api/*",
  "/insurance-api/*",
  "/concontrol/*",
  "/oauth/*",
  "/metrics/metrics/*",
  "/health/*",
  "/configprops/*",
  "/websocket/*",
  "/send/message/*",
  "/uploads/*",
  "/public/*",
  "/i18n/*",
]; */

let initiated = false;

let cookiesValue = "";
let updateCookieOnTabActivation = false;

let toSchema = null;
let toDomain = null;
let toPort = null;
let to = null;

let fromSchema = null;
let fromDomain = null;
let fromPort = null;
let from = null;

let pathFilters = null;
let requiredCookies = null;

function getUrlFilters() {
  return pathFilters.map((path) => [from, path].join(""));
}

function getUrlRedirectFilters() {
  return pathFilters.map((path) => [to, path].join(""));
}

function debugMatches() {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((o) => {
    console.debug("Rule matched:", o);
  });
}

async function fillCookies() {
  const cookies = await new Promise((resolve) => chrome.cookies.getAll({url: from}, resolve));
  cookiesValue = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
}

async function setRules() {
  const rulesToAdd = [];
  const urlsFilterRedirect = getUrlRedirectFilters();

  fillCookies();

  getUrlFilters().forEach((urlFilter, index) => {
    // Redirect
    rulesToAdd.push({
      id: rulesToAdd.length + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          transform: {
            scheme: toSchema,
            host: toDomain,
            port: toPort,
          },
        },
      },
      condition: {urlFilter},
    });

    // Add headers
    rulesToAdd.push({
      id: rulesToAdd.length + 1,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          // Cookies
          {
            header: "cookie",
            operation: "set",
            value: cookiesValue,
          },
        ],
        responseHeaders: [
          // Cors
          {
            header: "access-control-allow-origin",
            operation: "set",
            value: from,
          },
        ],
      },
      condition: {urlFilter: urlsFilterRedirect[index]},
    });
  });
  console.info("Updating rules...");
  const lastRules = await new Promise((resolve) =>
      chrome.declarativeNetRequest.getDynamicRules(resolve)
  );
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rulesToAdd,
    removeRuleIds: lastRules.map((rule) => rule.id),
  });

  const curRules = await new Promise((resolve) =>
      chrome.declarativeNetRequest.getDynamicRules(resolve)
  );
  console.info("Rules updated!", curRules);
}

async function removeRules() {
  const lastRules = await new Promise((resolve) =>
      chrome.declarativeNetRequest.getDynamicRules(resolve)
  );
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: lastRules.map((rule) => rule.id),
  });
}

async function cookieChange(tab) {
  setRules();
  chrome.tabs.reload(tab.id);
}

async function showCookieChangeAlert(tab) {
  updateCookieOnTabActivation = false;
  await new Promise((resolve) => chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ["confirm-alert.js"],
  }, resolve));
  chrome.tabs.sendMessage(
      tab.id,
      {
        type: "show-confirmation",
        payload: "Cache was changed! Wanna reload the page?",
      },
      async (response) => {
        if (!response) {
          return;
        }
        cookieChange(tab);
      }
  );
}

function addCookiesChanged() {
  let debounce = null;
  chrome.cookies.onChanged.addListener((change) => {
    if (
        change.cookie.domain !== fromDomain ||
        !requiredCookies[change.cookie.name]
    ) {
      return;
    }
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const prevCookiesValue = cookiesValue;
      await fillCookies();
      updateCookieOnTabActivation = prevCookiesValue !== cookiesValue;
      if (!updateCookieOnTabActivation) {
        return;
      }
      const tab = await getCurrentTab();
      if (!!tab.url.startsWith(from)) {
        showCookieChangeAlert(tab);
      }
    }, 500);
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await new Promise((resolve) => chrome.tabs.get(activeInfo.tabId, resolve));
    if (updateCookieOnTabActivation && !!tab.url.startsWith(from)) {
      showCookieChangeAlert(tab);
    }
  });
}

async function getCurrentTab() {
  let queryOptions = {active: true, currentWindow: true};
  let [tab] = await new Promise((resolve) => chrome.tabs.query(queryOptions, resolve));
  return tab;
}

function fillValues(value) {
  fromSchema = value.from.schema;
  fromDomain = value.from.host;
  fromPort = value.from.port;
  from = `${fromSchema}://${fromDomain}${fromPort ? `:${fromPort}` : ""}`;
  toSchema = value.to.schema;
  toDomain = value.to.host;
  toPort = value.to.port;
  to = `${toSchema}://${toDomain}${toPort ? `:${toPort}` : ""}`;
  pathFilters = value.rules;
  requiredCookies = value.cookies.reduce(
      (accum, cur) => ({...accum, [cur]: true}),
      {}
  );
}

function listenToConfigs() {
  chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    if (request.type === "reset-config") {
      sendResponse("reset");
      removeRules();
      return;
    }
    if (request.type !== "update-config") {
      return;
    }

    try {
      fillValues(request.payload[0]);
      sendResponse("updated");

      fillCookies().then(() => setRules());

      if (initiated) {
        return;
      }

      debugMatches();
      addCookiesChanged();

      initiated = true;
    } catch (e) {
      console.error(e);
      sendResponse({type: "error", payload: JSON.stringify(e)});
    }
  });
}

async function init() {
  setInterval(() => console.info("Alive!"), 10000);

  listenToConfigs();

  let retries = null;

  const loadInitialValues = async () => {
    try {
      await new Promise((resolve) => chrome.tabs.create({url: "popup/popup.html"}, resolve));
      console.info("Loaded initial values.");
    } catch (e) {
      console.error(e);
      console.info("Could not load initial values. Retrying...");
      clearTimeout(retries);
      retries = setTimeout(loadInitialValues, 2000);
    }
  };

  // Check whether new version is installed
  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install" || details.reason === "update") {
      removeRules();
      loadInitialValues();
    }
  });
}

init();
