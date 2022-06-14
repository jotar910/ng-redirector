# NG Redirector

[logo]: ./src/icons/icon_128.png "ng-redirector"

![ng-redirector][logo]

Chrome extension to *redirect requests* based on **Angular proxy files**. It allows you to dynamically change the environment you are working on for more flexibility and efficiency.

Redirect requests based on user-defined configurations, where its structure is based on Angular files.

> You can download it from [Chrome Web Store](https://chrome.google.com/webstore/detail/ng-redirector/akpnpfppmongkihcplkhmoahofihpaad) or you can run `npm run build` to build the project and load it yourself to the browser.

---

### Features:
- Redirect requests based on rules.
- Set custom headers.
- Smart reload on cookies change.
- Rewrite path based on patterns.
- Upload/download Angular proxy configurations.

### Advantages compared to angular proxy
1. No need to restart the server every time you change environments.
2. You can use this feature outside your angular apps.

### Drawbacks against angular proxy
1. You have two requests for each request made (always 1 for redirect).
2. Because it redirects the request, the extension needs to add headers for CORS and cookies.
