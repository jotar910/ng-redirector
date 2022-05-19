<template>
  <form id="environmentForm" @submit.prevent="updateConfigs">
    <fieldset>
      <legend>Environments</legend>
      <section class="actions-container actions-container--sticky"
               :class="{'configuration-containers--disable': !isOn}">
        <button type="submit">Apply</button>
        <button type="button" @click="clearConfigs">Clear</button>
        <button type="button" @click="toggleOnOff" class="ml-auto">{{ isOn ? 'ON' : 'OFF' }}</button>
      </section>
      <section class="actions-container" :class="{'configuration-containers--disable': !isOn}">
        <span>Angular Proxy:</span>
        <button type="button" @click="$refs.uploadInput.click()">Upload</button>
        <button type="button" @click="downloadFile">Download</button>
        <input type="file" accept="application/json" @change="uploadFile" ref="uploadInput" class="d-none">
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
          <article class="configuration-container__property">
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
          <article class="configuration-container__property">
            <div class="form-group">
              <label>
                <span>Headers</span>
                <button type="button" @click="toggleHeadersView(configuration)">Toggle view</button>
              </label>
              <template v-if="configuration.headersAsText">
                <textarea v-model="configuration.headersText" rows="10" class="form-control"
                          @blur="fillHeadersWithText(configuration)"></textarea>
              </template>
              <template v-else>
                <div class="input-group" v-for="(_, index) in configuration.headers">
                  <input type="text" class="form-control w-35 mr-2" v-model="configuration.headers[index].name"/>
                  <input type="text" class="form-control" v-model="configuration.headers[index].value"/>
                  <button type="button" @click="deleteHeader(configuration, index)">x</button>
                </div>
              </template>
            </div>
            <button v-if="!configuration.headersAsText" type="button"
                    @click="configuration.headers.push(emptyHeader())">Add
            </button>
          </article>
          <article class="configuration-container__property">
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
          <article class="configuration-container__property">
            <div class="form-group">
              <label>
                <span>Path Rewrite</span>
                <button type="button" @click="togglePathsRewriteView(configuration)">Toggle view</button>
              </label>
              <template v-if="configuration.pathRewriteAsText">
                <textarea v-model="configuration.pathRewriteText" rows="10" class="form-control"
                          @blur="fillPathsRewriteWithText(configuration)"></textarea>
              </template>
              <template v-else>
                <div class="input-group" v-for="(_, index) in configuration.pathsRewrite">
                  <input type="text" class="form-control w-35 mr-2" v-model="configuration.pathsRewrite[index].searchPattern"/>
                  <input type="text" class="form-control" v-model="configuration.pathsRewrite[index].replaceValue"/>
                  <button type="button" @click="deletePathRewrite(configuration, index)">x</button>
                </div>
              </template>
            </div>
            <button v-if="!configuration.pathRewriteAsText" type="button"
                    @click="configuration.pathsRewrite.push(emptyPathRewrite())">Add
            </button>
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
  return { configurations: [emptyConfiguration()] };
}

function emptyConfiguration() {
  return {
    from: {
      schema: '',
      host: '',
      port: ''
    },
    to: {
      schema: '',
      host: '',
      port: ''
    },
    rules: [emptyRule()],
    headers: [emptyHeader()],
    cookies: [emptyCookie()],
    pathsRewrite: [emptyPathRewrite()],
    rulesText: '',
    rulesAsText: false,
    headersText: '',
    headersAsText: false,
    cookiesText: '',
    cookiesAsText: false,
    pathRewriteText: '',
    pathRewriteAsText: false
  };
}

function emptyRule() {
  return '';
}

function emptyHeader() {
  return { name: '', value: '' };
}

function emptyCookie() {
  return '';
}

function emptyPathRewrite() {
  return { searchPattern: '', replaceValue: '' };
}

function mapSubmissionConfigs(configs) {
  return configs.map((config) => ({
    from: config.from,
    to: config.to,
    rules: config.rules.filter((rule) => !!rule),
    headers: config.headers.filter((header) => !!header.name),
    cookies: config.cookies.filter((cookie) => !!cookie),
    pathsRewrite: config.pathsRewrite.filter((path) => !!path.searchPattern)
  }));
}

function mapToConfigsProxy(configs) {
  const result = {};
  for (const config of configs) {
    const secure = config.from.schema === 'https';
    const target = `${config.to.schema}://${config.to.host}${config.to.port ? `:${config.to.port}` : ''}`;
    const headers = config.headers
        .filter((header) => !!header.name);
    const cookies = config.cookies.filter(Boolean);

    for (const rule of config.rules) {
      if (result[rule]) {
        continue;
      }
      result[rule] = {
        target,
        secure
      };
      if (headers.length) {
        result[rule].headers = headers.reduce((accum, h) => ({ ...accum, [h.name]: h.value }), {});
      }
      if (cookies.length) {
        result[rule].cookies = cookies;
      }
    }
  }
  return result;
}

function mapFromConfigsProxy(data) {
  const map = {};
  const rules = Object.keys(data);
  let count = 0;

  const configurations = [];
  for (const rule of rules) {
    const config = data[rule];
    const url = new URL(config.target);
    const hash = hashConfigProxy(url, config);
    let index = map[hash];

    if (index !== undefined) {
      configurations[index].rules.push(rule);
      continue;
    }

    index = map[hash] = count++;
    configurations[index] = emptyConfiguration();

    configurations[index].from = {
      schema: data[rule].secure ? 'https' : 'http',
      host: 'localhost',
      port: '9001'
    };

    configurations[index].to = {
      schema: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port
    };

    configurations[index].rules = [rule];

    const headers = Object.keys(config.headers ?? {})
        .map((key) => ({ name: key, value: config.headers[key] }));
    configurations[index].headers = headers.length ? headers : [emptyHeader()];

    const cookies = config.cookies ?? [];
    configurations[index].cookies = cookies.length ? cookies : [emptyCookie()];
  }
  return configurations;
}

function hashConfigProxy(url, data) {
  const urlStr = url.toString();
  const headers = data.headers;
  const headersStr = JSON.stringify(headers);
  const cookies = data.cookies;
  const cookiesStr = JSON.stringify(cookies);
  return [urlStr, headersStr, cookiesStr].filter(Boolean).join('&&');
}

export default {
  name: 'App',
  data: () => ({
    isOn: false,
    model: emptyForm()
  }),
  created() {
    const _this = this;
    const configurationsState = localStorage.getItem('chrome-extension::configurations');
    if (configurationsState) {
      _this.model.configurations = JSON.parse(configurationsState);
    }

    const activeState = localStorage.getItem('chrome-extension::active');
    if (!activeState) {
      localStorage.setItem('chrome-extension::active', 'false');
      return;
    }

    _this.isOn = activeState === 'true';

    if (_this.isOn && configurationsState) {
      this.sendSetConfigs(_this.model.configurations);
    }
  },
  methods: {
    toggleOnOff() {
      const _this = this;
      _this.isOn = !_this.isOn;
      localStorage.setItem('chrome-extension::active', `${_this.isOn}`);
      if (_this.isOn) {
        const item = localStorage.getItem('chrome-extension::configurations');
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
        configuration.rulesText = configuration.rules
            .filter(Boolean)
            .join('\n');
      } else {
        _this.fillRulesWithText(configuration);
      }
      this.$forceUpdate();
    },
    toggleHeadersView(configuration) {
      const _this = this;
      configuration.headersAsText = !configuration.headersAsText;

      if (configuration.headersAsText) {
        configuration.headersText = configuration.headers
            .filter((header) => !!header.name)
            .map((header) => `"${header.name}": ${JSON.stringify(header.value)}`)
            .join('\n');
      } else {
        _this.fillHeadersWithText(configuration);
      }
      this.$forceUpdate();
    },
    toggleCookiesView(configuration) {
      const _this = this;
      configuration.cookiesAsText = !configuration.cookiesAsText;

      if (configuration.cookiesAsText) {
        configuration.cookiesText = configuration.cookies
            .filter(Boolean)
            .join('\n');
      } else {
        _this.fillCookiesWithText(configuration);
      }
      this.$forceUpdate();
    },
    togglePathsRewriteView(configuration) {
      const _this = this;
      configuration.pathRewriteAsText = !configuration.pathRewriteAsText;

      if (configuration.pathRewriteAsText) {
        configuration.pathRewriteText = configuration.pathsRewrite
            .filter((path) => !!path.searchPattern)
            .map((path) => `"${path.searchPattern}": ${JSON.stringify(path.replaceValue)}`)
            .join('\n');
      } else {
        _this.fillPathsRewriteWithText(configuration);
      }
      this.$forceUpdate();
    },
    deleteRule(configuration, index) {
      if (configuration.rules.length < 2) {
        configuration.rules = configuration.rules.map(() => emptyRule());
        return false;
      }
      configuration.rules.splice(index, 1);
      return true;
    },
    deleteHeader(configuration, index) {
      if (configuration.headers.length < 2) {
        configuration.headers = configuration.headers.map(() => emptyHeader());
        return false;
      }
      configuration.headers.splice(index, 1);
      return true;
    },
    deleteCookie(configuration, index) {
      if (configuration.cookies.length < 2) {
        configuration.cookies = configuration.cookies.map(() => emptyCookie());
        return false;
      }
      configuration.cookies.splice(index, 1);
      return true;
    },
    deletePathRewrite(configuration, index) {
      if (configuration.pathsRewrite.length < 2) {
        configuration.pathsRewrite = configuration.pathsRewrite.map(() => emptyPathRewrite());
        return false;
      }
      configuration.pathsRewrite.splice(index, 1);
      return true;
    },
    deleteConfig(index) {
      const _this = this;
      if (_this.model.configurations.length < 2) {
        return false;
      }
      if (confirm('Are you sure you want to delete this rule?')) {
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
            'chrome-extension::configurations',
            JSON.stringify(configs)
        );
      }
    },
    clearConfigs() {
      const _this = this;
      _this.model = emptyForm();
      this.sendRemoveConfigs();
      localStorage.removeItem(
          'chrome-extension::configurations'
      );
    },
    sendSetConfigs(configs) {
      chrome.runtime.sendMessage({ type: 'update-config', payload: mapSubmissionConfigs(configs) }, (response) => {
        console.debug('Form values sent', response);
      });
    },
    sendRemoveConfigs() {
      chrome.runtime.sendMessage({ type: 'reset-config' }, (response) => {
        console.debug('Form reset', response);
      });
    },
    fillRulesWithText(configuration) {
      configuration.rules = (configuration.rulesText ?? '').split('\n').filter(Boolean);
      if (!configuration.rules.length) {
        configuration.rules = [emptyRule()];
      }
    },
    fillHeadersWithText(configuration) {
      const headers = [];
      const headerRawEntries = (configuration.headersText ?? '').split('\n').filter(Boolean);
      for (const rawEntry of headerRawEntries) {
        try {
          const entryObj = JSON.parse(`{${rawEntry}}`);
          for (const key of Object.keys(entryObj)) {
            headers.push({ name: key, value: entryObj[key] });
          }
        } catch (error) {
          // Empty by design.
        }
      }
      configuration.headers = !headers.length ? [emptyHeader()] : headers;
    },
    fillCookiesWithText(configuration) {
      configuration.cookies = (configuration.cookiesText ?? '').split('\n').filter(Boolean);
      if (!configuration.cookies.length) {
        configuration.cookies = [emptyCookie()];
      }
    },
    fillPathsRewriteWithText(configuration) {
      const pathsRewrite = [];
      const pathsRewriteRawEntries = (configuration.pathRewriteText ?? '').split('\n').filter(Boolean);
      for (const rawEntry of pathsRewriteRawEntries) {
        try {
          const entryObj = JSON.parse(`{${rawEntry}}`);
          for (const key of Object.keys(entryObj)) {
            pathsRewrite.push({ searchPattern: key, replaceValue: entryObj[key] });
          }
        } catch (error) {
          // Empty by design.
        }
      }
      configuration.pathsRewrite = !pathsRewrite.length ? [emptyPathRewrite()] : pathsRewrite;
    },
    uploadFile(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = (evt) => {
          this.fillWithJsonContent(JSON.parse(evt.target.result.toString()));
          event.target.value = '';
        };
        reader.onerror = () => {
          alert('Error reading the file. Please try again!');
          event.target.value = '';
        };
      }
    },
    downloadFile() {
      const element = document.createElement('a');
      element.setAttribute('href', `data:text/plain;charset=utf-8, ${encodeURIComponent(JSON.stringify(mapToConfigsProxy(this.model.configurations)))}`);
      element.setAttribute('download', 'proxy-configs.json');
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    },
    fillWithJsonContent(data) {
      const configurations = mapFromConfigsProxy(data);
      this.model.configurations = configurations.length ? configurations : [emptyConfiguration()];
    },
    emptyConfiguration: emptyConfiguration,
    emptyRule: emptyRule,
    emptyHeader: emptyHeader,
    emptyCookie: emptyCookie,
    emptyPathRewrite: emptyPathRewrite
  }
};
</script>
