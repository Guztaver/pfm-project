$(document).ready(function () {
  const chatMessages = $("#chat-messages");
  const userInput = $("#user-input");
  const sendButton = $("#send-btn");

  const API_BASE = "http://localhost:1234";
  const MODEL_NAME = "deepseek-r1-distill-qwen-7b";

  const messages = [
    {
      role: "system",
      content:
        "Você é um entrevistador de emprego experiente. Seu objetivo é realizar uma simulação de entrevista para avaliar o candidato. IMPORTANTE: Faça APENAS UMA pergunta por vez e aguarde a resposta do candidato antes de fazer a próxima pergunta. Nunca envie múltiplas perguntas em uma mesma mensagem. Faça perguntas relevantes sobre experiências profissionais, habilidades, comportamento em situações desafiadoras, e formação acadêmica. Após cada resposta, forneça um breve feedback construtivo e somente então faça uma nova pergunta. No final, após 5-7 perguntas individuais, forneça uma avaliação completa do desempenho do candidato, destacando pontos fortes e áreas para melhoria. Seja profissional, mas amigável. Sua primeira mensagem já foi enviada cumprimentando o candidato e pedindo que ele se apresente.",
    },
    {
      role: "assistant",
      content:
        "Olá! Sou seu entrevistador virtual. Vamos começar nossa simulação de entrevista. Por favor, comece se apresentando brevemente e falando sobre sua formação e experiência profissional.",
    },
  ];

  // Display the initial message from history in the UI
  displayInitialMessage();

  function displayInitialMessage() {
    const initialMessage = messages[1].content;
    
    // Criar o contu00eainer da mensagem com a foto de perfil
    const containerElement = $('<div class="message-container bot-container"></div>');
    
    // Adicionar a foto de perfil
    const profilePic = $('<div class="profile-pic bot-pic"></div>');
    containerElement.append(profilePic);
    
    // Adicionar a mensagem
    const messageElement = $('<div class="message bot-message"></div>').text(initialMessage);
    containerElement.append(messageElement);
    
    chatMessages.append(containerElement);
    scrollToBottom();
  }

  sendButton.click(sendMessage);

  userInput.keydown(function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function testConnectionWithCurlFormat() {
    const payload = {
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "Say only pong when user sends 'ping', and only when they send 'ping'",
        },
        { role: "user", content: "ping" },
      ],
      temperature: 0.7,
      max_tokens: -1,
      stream: true,
    };

    // Prepare payload for sending
    const requestPayload = JSON.stringify(payload);

    // Add test message placeholder for streaming with profile pic
    const testContainerElement = $('<div class="message-container bot-container"></div>');
    const testProfilePic = $('<div class="profile-pic bot-pic"></div>');
    const testMessageElement = $('<div class="message bot-message"></div>');
    
    testContainerElement.append(testProfilePic);
    testContainerElement.append(testMessageElement);
    chatMessages.append(testContainerElement);
    scrollToBottom();

    let testResponse = "";

    // Use fetch API with streaming
    fetch(`${API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestPayload,
    })
      .then(async (response) => {
        if (!response.ok) {
          return await response.text().then((text) => {
            throw new Error(`Status: ${response.status}, Message: ${text}`);
          });
        }

        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        // Function to process stream chunks
        function processTestStream({ done, value }) {
          if (done) {
            addMessage(
              "Conexão com LM Studio estabelecida com sucesso!",
              "bot",
            );
            return;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });

          // Process each line in the chunk
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          lines.forEach((line) => {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);

              // Check if it's the [DONE] marker
              if (data === "[DONE]") return;

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0]) {
                  const delta = parsed.choices[0].delta;
                  if (delta && delta.content) {
                    testResponse += delta.content;
                    testMessageElement.text(testResponse);
                    scrollToBottom();
                  }
                }
              } catch (e) {
                // Silently handle parsing errors
              }
            }
          });

          // Continue reading
          return reader.read().then(processTestStream);
        }

        return reader.read().then(processTestStream);
      })
      .catch((error) => {
        testMessageElement.text(`Erro ao conectar com LM Studio`);
        addMessage(
          `Tentando conectar em: ${API_BASE}/v1/chat/completions`,
          "bot",
        );
        addMessage(
          "Verifique se o LM Studio está em execução corretamente",
          "bot",
        );
      });
  }

  // Send message function - with improved error handling and request formatting
  function sendMessage() {
    const userMessage = userInput.val().trim();
    if (!userMessage) return;

    // Clear input
    userInput.val("");

    // Add user message to UI
    addMessage(userMessage, "user");

    // Add user message to history
    messages.push({
      role: "user",
      content: userMessage,
    });

    // Show typing indicator with profile picture
    const typingContainerElement = $('<div class="message-container bot-container"></div>');
    const typingProfilePic = $('<div class="profile-pic bot-pic"></div>');
    const typingIndicator = $('<div class="message bot-message typing">').html(
      '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>',
    );
    
    typingContainerElement.append(typingProfilePic);
    typingContainerElement.append(typingIndicator);
    chatMessages.append(typingContainerElement);
    scrollToBottom();

    // Create request with streaming enabled
    const chatRequest = {
      model: MODEL_NAME,
      messages: JSON.parse(JSON.stringify(messages)), // Create a deep copy to ensure clean serialization
      temperature: 0.7,
      max_tokens: -1,
      stream: true, // Enable streaming
    };

    // Prepare payload for sending
    const requestPayload = JSON.stringify(chatRequest);

    // Manteremos o indicador de carregamento enquanto estiver processando <think>
    // Criar elemento de resposta com foto de perfil, mas só mostrar quando terminar o pensamento
    const responseContainerElement = $('<div class="message-container bot-container" style="display:none;"></div>');
    const responseProfilePic = $('<div class="profile-pic bot-pic"></div>');
    const responseMessageElement = $('<div class="message bot-message"></div>');
    
    responseContainerElement.append(responseProfilePic);
    responseContainerElement.append(responseMessageElement);
    chatMessages.append(responseContainerElement);
    scrollToBottom();

    let fullResponse = "";
    let isThinking = false; // Controla se estamos dentro de um bloco <think>

    // Use fetch API with streaming
    fetch(`${API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestPayload,
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Status: ${response.status}, Message: ${text}`);
        }

        // Setup stream reader
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        // Function to process stream chunks
        function processStream({ done, value }) {
          if (done) {
            // Processamento final quando o stream termina
            // Garantir que o indicador de carregamento seja removido
            typingContainerElement.remove();
            
            // Processar a resposta final para remover qualquer tag think restante
            const processedResponse = fullResponse
              .replace(/<think>[\s\S]*?<\/think>/g, "")
              .replace(/<think>[\s\S]*/g, "")
              .trim();
            
            // Exibir a resposta final processada
            responseContainerElement.show();
            responseMessageElement.text(processedResponse);
            
            // Add final response to chat history (versão processada)
            messages.push({
              role: "assistant",
              content: processedResponse,
            });
            return;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });

          // Process each line in the chunk
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          lines.forEach((line) => {
            // Lines usually start with "data: "
            if (line.startsWith("data: ")) {
              const data = line.substring(6);

              // Check if it's the [DONE] marker
              if (data === "[DONE]") return;

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0]) {
                  const delta = parsed.choices[0].delta;
                  if (delta && delta.content) {
                    const content = delta.content;
                    fullResponse += content;
                    
                    // Verificar se estamos iniciando ou terminando um bloco de pensamento
                    if (content.includes('<think>')) {
                      isThinking = true;
                    }
                    
                    if (content.includes('</think>')) {
                      isThinking = false;
                      // Processar a resposta para remover as tags think
                      const processedResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, "");
                      responseMessageElement.text(processedResponse.trim());
                    }
                    
                    // Se nu00e3o estiver pensando, mostrar o conteu00fado processado
                    if (!isThinking) {
                      // Remover o indicador de carregamento
                      typingContainerElement.remove();
                      // Exibir a mensagem processada
                      responseContainerElement.show();
                      // Processar a resposta para remover as tags think
                      const processedResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, "");
                      responseMessageElement.text(processedResponse.trim());
                    }
                    
                    scrollToBottom();
                  }
                }
              } catch (e) {
                // Silently handle parsing errors
              }
            }
          });

          // Continue reading
          return reader.read().then(processStream);
        }

        // Start reading the stream
        const result_4 = await reader.read();
        return processStream(result_4);
      })
      .catch((error) => {
        // Suppress detailed error logging
        responseMessageElement.text(`Erro na comunicação com LM Studio`);
        addMessage(
          `Verifique se o LM Studio está rodando em http://${API_BASE}`,
          "bot",
        );
      });
  }

  // Add a message to the chat UI with processing to hide thinking tags
  function addMessage(text, sender) {
    // Process message to remove thinking content
    if (sender === "bot") {
      // Remove content between <think> and </think> or until "done"
      text = text.replace(/<think>[\s\S]*?<\/think>/g, "");
      text = text.replace(/<think>[\s\S]*?done/g, "");
      // Additional check to remove any remaining think tags and their content
      text = text.replace(/<think>.*/, "");
      // Trim any excess whitespace that might be left over
      text = text.trim();
    }

    // Criar o contêiner da mensagem com a foto de perfil
    const containerElement = $('<div class="message-container"></div>').addClass(`${sender}-container`);
    
    // Adicionar a foto de perfil
    const profilePic = $('<div class="profile-pic"></div>').addClass(`${sender}-pic`);
    containerElement.append(profilePic);
    
    // Adicionar a mensagem
    const messageElement = $('<div class="message"></div>')
      .addClass(`${sender}-message`)
      .text(text);
    containerElement.append(messageElement);
    
    chatMessages.append(containerElement);
    scrollToBottom();
  }

  // Scroll to the bottom of the chat container
  function scrollToBottom() {
    chatMessages.scrollTop(chatMessages[0].scrollHeight);
  }
});
