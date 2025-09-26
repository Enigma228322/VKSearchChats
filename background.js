chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getChats') {
    (async () => {
      try {
        const accessToken = request.accessToken;

        if (!accessToken) {
          sendResponse({ error: 'VK access token not provided.' });
          return;
        }

        let allConversations = [];
        let offset = 0;
        const limit = 200; // VK API allows max 200 per request for getConversations
        let totalCount = Infinity;

        while (offset < totalCount) {
          const apiUrl = `https://api.vk.com/method/messages.getConversations?v=5.199&access_token=${accessToken}&count=${limit}&offset=${offset}&extended=1`;
          const response = await fetch(apiUrl);
          const data = await response.json();

          if (data.error) {
            sendResponse({ error: data.error.error_msg });
            return;
          }

          if (data.response && data.response.items) {
            allConversations = allConversations.concat(data.response.items.map(item => item.conversation));
            totalCount = data.response.count; // Update total count from the first response
            offset += limit;
          } else {
            break; // No more items or unexpected response structure
          }
        }

        sendResponse({ chats: allConversations });

      } catch (error) {
        sendResponse({ error: error.message });
        console.error('Background script error:', error);
      }
    })();
    return true; // Indicates an asynchronous response
  }

  if (request.action === 'redirectToChat') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const chatUrl = `https://vk.com/im/convo/${request.peerId}?entrypoint=list_all`;
          await chrome.tabs.update(tab.id, { url: chatUrl });
        }
      } catch (error) {
        console.error('Error redirecting to chat:', error);
      }
    })();
    return true;
  }
});
