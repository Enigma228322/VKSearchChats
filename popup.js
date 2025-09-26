document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const resultsDiv = document.getElementById('results');
  const accessTokenInput = document.getElementById('accessTokenInput');
  const saveTokenButton = document.getElementById('saveTokenButton');
  const tokenStatusMessage = document.getElementById('tokenStatusMessage');

  let allConversations = []; // To store all fetched conversations
  let fuse; // Fuse.js instance

  // Load saved token on popup open
  chrome.storage.sync.get(['vkAccessToken'], (result) => {
    if (result.vkAccessToken) {
      accessTokenInput.value = result.vkAccessToken;
      tokenStatusMessage.textContent = 'Token loaded.';
      tokenStatusMessage.style.color = 'green';
      // Automatically fetch chats if token is loaded
      fetchAndRenderChats(result.vkAccessToken);
    }
  });

  saveTokenButton.addEventListener('click', () => {
    const token = accessTokenInput.value.trim();
    if (token) {
      chrome.storage.sync.set({ vkAccessToken: token }, () => {
        tokenStatusMessage.textContent = 'Access Token saved!';
        tokenStatusMessage.style.color = 'green';
        fetchAndRenderChats(token); // Fetch chats immediately after saving token
      });
    } else {
      tokenStatusMessage.textContent = 'Please enter an Access Token.';
      tokenStatusMessage.style.color = 'red';
    }
  });

  // Function to fetch conversations and initialize Fuse.js
  async function fetchAndRenderChats(accessToken) {
    resultsDiv.innerHTML = 'Loading chats...';
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getChats', accessToken: accessToken });
      if (response.error) {
        resultsDiv.innerHTML = `Error loading chats: ${response.error}`;
        return;
      }
      allConversations = response.chats;
      const fuseOptions = {
        keys: [
          { name: 'chat_settings.title', weight: 0.7 },
          { name: 'peer.id', weight: 0.3 } // Search by peer.id as well
        ],
        threshold: 0.3, // Lower threshold for more matches
        ignoreLocation: true,
        findAllMatches: true
      };
      fuse = new Fuse(allConversations, fuseOptions);
      renderChats(allConversations); // Render all chats initially
    } catch (error) {
      resultsDiv.innerHTML = `Error loading chats: ${error.message}`;
      console.error(error);
    }
  }

  // Function to render chats (either all or filtered)
  function renderChats(chatsToRender) {
    resultsDiv.innerHTML = '';
    if (chatsToRender && chatsToRender.length > 0) {
      chatsToRender.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.style.cursor = 'pointer';
        chatItem.style.textDecoration = 'underline';
        const chatTitle = chat.chat_settings?.title;
        const peerId = chat.peer.id;
        if (chatTitle) {
          chatItem.textContent = `${chatTitle} (ID: ${peerId})`;
        } else {
          chatItem.textContent = `ID: ${peerId}`;
        }
        chatItem.addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: 'redirectToChat', peerId: peerId });
        });
        resultsDiv.appendChild(chatItem);
      });
    } else {
      resultsDiv.innerHTML = 'No chats found.';
    }
  }

  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      if (fuse) {
        const searchResult = fuse.search(searchTerm);
        renderChats(searchResult.map(result => result.item));
      } else {
        resultsDiv.innerHTML = 'Chats not loaded yet. Please wait or re-enter token.';
      }
    } else {
      renderChats(allConversations); // Show all chats if search term is empty
    }
  });

  // Initial load or search button click will trigger fuzzy search
  searchButton.addEventListener('click', () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      if (fuse) {
        const searchResult = fuse.search(searchTerm);
        renderChats(searchResult.map(result => result.item));
      } else {
        resultsDiv.innerHTML = 'Chats not loaded yet. Please wait or re-enter token.';
      }
    } else {
      renderChats(allConversations); // Show all chats if search term is empty
    }
  });
});
