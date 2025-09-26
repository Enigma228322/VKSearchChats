chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getChats') {
    (async () => {
      try {
        const accessToken = request.accessToken;

        if (!accessToken) {
          sendResponse({ error: 'VK access token not provided.' });
          return;
        }

        const apiUrl = `https://api.vk.com/method/messages.getConversations?v=5.199&access_token=${accessToken}&count=200`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.error) {
          sendResponse({ error: data.error.error_msg });
          return;
        }

        const conversations = data.response.items;
        sendResponse({ chats: conversations.map(item => item.conversation) });

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
