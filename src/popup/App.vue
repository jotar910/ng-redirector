<template>
  <form id="environmentForm" @submit.prevent="updateConfigs">
    <fieldset>
      <legend>Environments</legend>
      <section class="actions-container" :class="{'configuration-containers--disable': !isOn}">
        <button type="submit">Apply</button>
        <button type="button" @click="clearConfigs">Clear</button>
        <button type="button" @click="toggleOnOff">{{ isOn ? 'ON' : 'OFF' }}</button>
      </section>
      <section class="configurations-container" :class="{'configuration-containers--disable': !isOn}">
        <section class="configuration-container" v-for="(configuration, configIndex) in model.configurations">
          <div class="configuration-container__from-to">
            <article>
              <div class="form-group">
                <label class="required">Schema</label>
                <input type="text" required class="form-control" v-model="configuration.from.schema"/>
              </div>
              <div class="form-group">
                <label class="required">Host</label>
                <input type="text" required class="form-control" v-model="configuration.from.host"/>
              </div>
              <div class="form-group">
                <label>Port</label>
                <input type="text" class="form-control" v-model="configuration.from.port"/>
              </div>
            </article>
            <hr/>
            <article>
              <div class="form-group">
                <input type="text" required class="form-control" v-model="configuration.to.schema"/>
              </div>
              <div class="form-group">
                <input type="text" required class="form-control" v-model="configuration.to.host"/>
              </div>
              <div class="form-group">
                <input type="text" class="form-control" v-model="configuration.to.port"/>
              </div>
            </article>
          </div>
          <article class="configuration-container__rules">
            <div class="form-group">
              <label>
                <span>Rules</span>
                <button type="button" @click="toggleRulesView(configuration)">Toggle view</button>
              </label>
              <template v-if="configuration.rulesAsText">
                <textarea v-model="configuration.rulesText" rows="10" class="form-control"
                          @blur="fillRulesWithText(configuration)"></textarea>
              </template>
              <template v-else>
                <div class="input-group" v-for="(_, index) in configuration.rules">
                  <input type="text" class="form-control" v-model="configuration.rules[index]"/>
                  <button type="button" @click="deleteRule(configuration, index)">x</button>
                </div>
              </template>
            </div>
            <button v-if="!configuration.rulesAsText" type="button"
                    @click="configuration.rules.push(emptyRule())">Add
            </button>
          </article>
          <article class="configuration-container__cookies">
            <div class="form-group">
              <label>
                <span>Cookies</span>
                <button type="button" @click="toggleCookiesView(configuration)">Toggle view</button>
              </label>
              <template v-if="configuration.cookiesAsText">
                <textarea v-model="configuration.cookiesText" rows="10" class="form-control"
                          @blur="fillCookiesWithText(configuration)"></textarea>
              </template>
              <template v-else>
                <div class="input-group" v-for="(_, index) in configuration.cookies">
                  <input type="text" class="form-control" v-model="configuration.cookies[index]"/>
                  <button type="button" @click="deleteCookie(configuration, index)">x</button>
                </div>
              </template>
            </div>
            <button type="button" @click="configuration.cookies.push(emptyCookie())">Add</button>
          </article>
          <button type="button" v-if="model.configurations.length > 1"
                  @click="deleteConfig(configIndex)">
            Delete configuration
          </button>
          <hr/>
        </section>
        <button type="button" @click="model.configurations.push(emptyConfiguration())">Add configuration</button>
      </section>
    </fieldset>
  </form>
</template>

<script>

function emptyForm() {
  return {configurations: [emptyConfiguration()]};
}

function emptyConfiguration() {
  return {
    from: {
      schema: "",
      host: "",
      port: "",
    },
    to: {
      schema: "",
      host: "",
      port: "",
    },
    rules: [emptyRule()],
    cookies: [emptyCookie()],
    rulesText: "",
    rulesAsText: false,
    cookiesText: "",
    cookiesAsText: false
  };
}

function emptyRule() {
  return '';
}

function emptyCookie() {
  return '';
}

function mapSubmissionConfigs(configs) {
  return configs.map((config) => ({
    from: config.from,
    to: config.to,
    rules: config.rules,
    cookies: config.cookies,
  }))
}

export default {
  name: 'App',
  data: () => ({
    isOn: false,
    model: emptyForm()
  }),
  created() {
    const _this = this;
    let item = localStorage.getItem("chrome-extension::configurations");
    if (item) {
      _this.model.configurations = JSON.parse(item);
    }

    item = localStorage.getItem("chrome-extension::active");
    if (item) {
      _this.isOn = item === "true";
    } else {
      localStorage.setItem("chrome-extension::active", "false");
    }
  },
  methods: {
    toggleOnOff() {
      const _this = this;
      _this.isOn = !_this.isOn;
      localStorage.setItem("chrome-extension::active", `${_this.isOn}`);
      if (_this.isOn) {
        const item = localStorage.getItem("chrome-extension::configurations");
        if (item) {
          this.sendSetConfigs(JSON.parse(item));
        }
      } else {
        this.sendRemoveConfigs();
      }
    },
    toggleRulesView(configuration) {
      const _this = this;
      configuration.rulesAsText = !configuration.rulesAsText;

      if (configuration.rulesAsText) {
        configuration.rulesText = configuration.rules.join("\n");
      } else {
        _this.fillRulesWithText(configuration);
      }
      this.$forceUpdate();
    },
    toggleCookiesView(configuration) {
      const _this = this;
      configuration.cookiesAsText = !configuration.cookiesAsText;

      if (configuration.cookiesAsText) {
        configuration.cookiesText = configuration.cookies.join("\n");
      } else {
        _this.fillCookiesWithText(configuration);
      }
      this.$forceUpdate();
    },
    deleteRule(configuration, index) {
      if (configuration.rules.length < 2) {
        configuration.rules = configuration.rules.map(() => '');
        return false;
      }
      configuration.rules.splice(index, 1);
      return true;
    },
    deleteCookie(configuration, index) {
      if (configuration.cookies.length < 2) {
        configuration.cookies = configuration.cookies.map(() => '');
        return false;
      }
      configuration.cookies.splice(index, 1);
      return true;
    },
    deleteConfig(index) {
      const _this = this;
      if (_this.model.configurations.length < 2) {
        return false;
      }
      if (confirm("Are you sure you want to delete this rule?")) {
        _this.model.configurations.splice(index, 1);
        return true;
      }
      return false;
    },
    updateConfigs() {
      const _this = this;
      const configs = _this.model.configurations;
      this.sendSetConfigs(configs);
      if (configs) {
        localStorage.setItem(
            "chrome-extension::configurations",
            JSON.stringify(configs)
        );
      }
    },
    clearConfigs() {
      const _this = this;
      _this.model = emptyForm();
      this.sendRemoveConfigs();
      localStorage.removeItem(
          "chrome-extension::configurations"
      );
    },
    sendSetConfigs(configs) {
      chrome.runtime.sendMessage({type: "update-config", payload: mapSubmissionConfigs(configs)}, (response) => {
        console.debug("Form values sent", response);
      });
    },
    sendRemoveConfigs() {
      chrome.runtime.sendMessage({type: "reset-config"}, (response) => {
        console.debug("Form reset", response);
      });
    },
    fillRulesWithText(configuration) {
      configuration.rules = (configuration.rulesText ?? '').split("\n").filter(Boolean);
      if (!configuration.rules.length) {
        configuration.rules = [emptyRule()];
      }
    },
    fillCookiesWithText(configuration) {
      configuration.cookies = (configuration.cookiesText ?? '').split("\n").filter(Boolean);
      if (!configuration.cookies.length) {
        configuration.cookies = [emptyCookie()];
      }
    },
    emptyConfiguration: emptyConfiguration,
    emptyRule: emptyRule,
    emptyCookie: emptyCookie,
  }
}
</script>

<style>
body * {
  box-sizing: border-box;
}

#environmentForm {
  margin: auto;
  max-width: 500px;
}

.actions-container {
  display: flex;
  margin-bottom: 1rem;
}

.actions-container button:last-child {
  margin-left: auto;
}

.actions-container button:not(:last-child) {
  margin-right: 0.5rem;
}

.actions-container.configuration-containers--disable button:not(:last-child) {
  opacity: 0.5;
  pointer-events: none;
}

.configurations-container,
.configuration-container {
  display: flex;
  flex-direction: column;
}

.configurations-container.configuration-containers--disable {
  opacity: 0.5;
  pointer-events: none;
}

.configuration-container {
  min-width: 350px;
  padding: 0.5rem;
}

.configuration-container > :not(:last-child) {
  margin-bottom: 0.75rem;
  margin-top: 0.75rem;
}

.configuration-container > hr {
  margin: 1.5rem 0 1rem;
}

.configuration-container .configuration-container__from-to > article {
  column-gap: 0.75rem;
  display: grid;
  grid-template-columns: 1fr 3fr 1fr;
}

.configuration-container .configuration-container__from-to > hr {
  border-width: 10px;
  border-style: solid;
  border-color: lightgray transparent transparent;
  margin-bottom: calc(0.75rem - 10px);
  height: 0;
  width: 0;
}

.configuration-container .configuration-container__rules,
.configuration-container .configuration-container__cookies {
  display: flex;
  flex-direction: column;
}

.configuration-container .configuration-container__rules > button,
.configuration-container .configuration-container__cookies > button {
  margin: auto;
}

.configuration-container .configuration-container__rules label,
.configuration-container .configuration-container__cookies label {
  display: flex;
  justify-content: space-between;
}

.configuration-container .configuration-container__rules label > span,
.configuration-container .configuration-container__cookies label > span {
  margin-right: 0.5rem;
}

.configuration-container .configuration-container__rules > .form-group button,
.configuration-container .configuration-container__cookies > .form-group button {
  margin-bottom: 0.5rem;
}

.configuration-container .configuration-container__rules > .form-group textarea,
.configuration-container .configuration-container__cookies > .form-group textarea {
  display: block;
}

.configuration-container .configuration-container__rules .form-group .form-control:not(:last-child),
.configuration-container .configuration-container__cookies .form-group .form-control:not(:last-child) {
  margin-bottom: 0.25rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
}

.form-group label.required::after {
  color: brown;
  content: '*';
}

.form-group .form-control {
  border-radius: 3px;
  border-width: 1px;
  width: 100%;
}

.form-group textarea.form-control {
  resize: vertical;
}

.input-group {
  display: flex;
  position: relative;
}

.input-group > input {
  padding-right: 24px;
}

.input-group > button {
  padding: 0;
  height: 19px;
  width: 20px;
  margin-left: 10px;
  line-height: 14px;
  position: absolute;
  right: 0;
  border-radius: 0 3px 3px 0;
  border-width: 1px;
  cursor: pointer;
}

</style>
