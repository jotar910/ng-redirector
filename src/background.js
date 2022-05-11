console.info("Running...");

/**
 * @type {Config[]}
 */
const configs = [];

class Config {
  static ID_COUNT = 1;

  constructor(config) {
    this.cookiesValue = "";
    this.updateCookieOnTabActivation = false;
    this.cookiesChangeDebounce = null;

    this.toSchema = null;
    this.toDomain = null;
    this.toPort = null;
    this.to = null;

    this.fromSchema = null;
    this.fromDomain = null;
    this.fromPort = null;
    this.from = null;

    this.pathFilters = null;
    this.requiredCookies = null;

    this.curRules = [];

    if (config) {
      this.fillValues(config);
    }
  }

  getUrlFilters() {
    return this.pathFilters.map((path) => [this.from, path].join(""));
  }

  getUrlRedirectFilters() {
    return this.pathFilters.map((path) => [this.to, path].join(""));
  }

  async fillCookies() {
    const cookies = await new Promise((resolve) => chrome.cookies.getAll({url: this.from}, resolve));
    this.cookiesValue = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
  }

  async setRules() {
    const rulesToAdd = [];
    const urlsFilterRedirect = this.getUrlRedirectFilters();

    await this.fillCookies();

    this.getUrlFilters().forEach((urlFilter, index) => {
      // Redirect
      rulesToAdd.push({
        id: Config.ID_COUNT++,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            transform: {
              scheme: this.toSchema,
              host: this.toDomain,
              port: this.toPort,
            },
          },
        },
        condition: {urlFilter},
      });

      // Add headers
      rulesToAdd.push({
        id: Config.ID_COUNT++,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            // Cookies
            {
              header: "cookie",
              operation: "set",
              value: this.cookiesValue,
            }
          ],
          responseHeaders: [
            // Cors
            {
              header: "access-control-allow-origin",
              operation: "set",
              value: this.from,
            },
          ],
        },
        condition: {urlFilter: urlsFilterRedirect[index]},
      });
    });
    console.info("Updating rules...");
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rulesToAdd
    });
    this.curRules = await new Promise((resolve) =>
        chrome.declarativeNetRequest.getDynamicRules(resolve)
    );
    console.info("Rules updated!", this.curRules);
  }

  async removeRules() {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: this.curRules.map((rule) => rule.id),
    });
    this.curRules = [];
    const unchangedRules = await new Promise((resolve) =>
        chrome.declarativeNetRequest.getDynamicRules(resolve)
    );
    console.info("Rules removed!", unchangedRules);
  }

  async cookieChange(tab) {
    await this.removeRules();
    await this.setRules();
    chrome.tabs.reload(tab.id);
  }

  async showCookieChangeAlert(tab) {
    this.updateCookieOnTabActivation = false;
    await new Promise((resolve) => chrome.tabs.executeScript(tab.id, {
      file: "confirm-alert.js",
    }, resolve));
    chrome.tabs.sendMessage(
        tab.id,
        {
          type: "show-confirmation",
          payload: "Cache was changed! Wanna reload the page?",
        },
        (response) => {
          if (!response) {
            return;
          }
          this.cookieChange(tab);
        }
    );
  }


  /**
   * @param {CookieChangeInfo} change
   */
  cookiesChanged(change) {
    this.cookiesChangeDebounce = null;
    if (
        change.cookie.domain !== this.fromDomain ||
        !this.requiredCookies[change.cookie.name]
    ) {
      return;
    }
    clearTimeout(this.cookiesChangeDebounce);
    this.cookiesChangeDebounce = setTimeout(async () => {
      const prevCookiesValue = this.cookiesValue;
      await this.fillCookies();
      this.updateCookieOnTabActivation = prevCookiesValue !== this.cookiesValue;
      if (!this.updateCookieOnTabActivation) {
        return;
      }
      const tab = await getCurrentTab();
      if (!!tab.url.startsWith(this.from)) {
        this.showCookieChangeAlert(tab);
      }
    }, 500);
  }

  /**
   * @param {TabActiveInfo} activeInfo
   */
  async tabChanged(activeInfo) {
    const tab = await new Promise((resolve) => chrome.tabs.get(activeInfo.tabId, resolve));
    if (this.updateCookieOnTabActivation && !!tab.url.startsWith(this.from)) {
      this.showCookieChangeAlert(tab);
    }
  }

  fillValues(value) {
    this.fromSchema = value.from.schema;
    this.fromDomain = value.from.host;
    this.fromPort = value.from.port;
    this.from = `${this.fromSchema}://${this.fromDomain}${this.fromPort ? `:${this.fromPort}` : ""}`;
    this.toSchema = value.to.schema;
    this.toDomain = value.to.host;
    this.toPort = value.to.port;
    this.to = `${this.toSchema}://${this.toDomain}${this.toPort ? `:${this.toPort}` : ""}`;
    this.pathFilters = value.rules;
    this.requiredCookies = value.cookies.reduce(
        (accum, cur) => ({...accum, [cur]: true}),
        {}
    );
  }
}

async function getCurrentTab() {
  let queryOptions = {active: true, currentWindow: true};
  let [tab] = await new Promise((resolve) => chrome.tabs.query(queryOptions, resolve));
  return tab;
}

async function resetConfigurations() {
  for (const config of configs) {
    await config.removeRules();
  }
  configs.length = 0;
}

async function fillConfigurations(configurations) {
  await resetConfigurations();
  for (const configuration of configurations) {
    const config = new Config(configuration);
    await config.fillCookies();
    await config.setRules()
    configs.push(config);
  }
}

function debugMatches() {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((o) => {
    console.debug("Rule matched:", o);
  });
}

function listenOnInstall() {
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
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install" || details.reason === "update") {
      const lastRules = await new Promise((resolve) =>
          chrome.declarativeNetRequest.getDynamicRules(resolve)
      );
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: lastRules.map((rule) => rule.id),
      });
      await loadInitialValues();
    }
  });
}

function listenToConfigs() {
  chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    if (request.type === "reset-config") {
      resetConfigurations();
      sendResponse("reset");
      return;
    }
    if (request.type !== "update-config") {
      return;
    }

    try {
      fillConfigurations(request.payload);
      sendResponse("updated");
    } catch (e) {
      console.error(e);
      sendResponse({type: "error", payload: JSON.stringify(e)});
    }
  });
}

function listenToCookies() {
  chrome.cookies.onChanged.addListener((change) => {
    const trackDomain = {};
    configs.forEach((config) => {
      if (trackDomain[config.fromDomain]) {
        return;
      }
      trackDomain[config.fromDomain] = true;
      config.cookiesChanged(change);
    });
  });
}

function listenToTabChange() {
  chrome.tabs.onActivated.addListener((activeInfo) => {
    const trackUrl = {};
    configs.forEach((config) => {
      if (trackUrl[config.from]) {
        return;
      }
      trackUrl[config.from] = true;
      config.tabChanged(activeInfo);
    });
  });
}

async function init() {
  setInterval(() => console.info("Alive!"), 10000);

  debugMatches();
  listenOnInstall();
  listenToConfigs();
  listenToCookies();
  listenToTabChange();
}

init();
