chrome.runtime.onMessage.addListener(function (request, _, sendResponse) {
  if (request.type !== "show-confirmation") {
    return;
  }
  sendResponse(confirm(request.payload));
});
