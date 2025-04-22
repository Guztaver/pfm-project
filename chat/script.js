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
        "Você é um entrevistador de emprego experiente. Seu objetivo é realizar uma simulação de entrevista para avaliar o candidato. IMPORTANTE: Faça APENAS UMA pergunta por vez e aguarde a resposta do candidato antes de fazer a próxima pergunta. Nunca envie múltiplas perguntas em uma mesma mensagem. Faça perguntas relevantes sobre experiências profissionais, habilidades, comportamento em situações desafiadoras, e formação acadêmica. No final, após 5-7 perguntas individuais, forneça uma avaliação completa do desempenho do candidato, destacando pontos fortes e áreas para melhoria. Seja profissional, mas amigável. Sua primeira mensagem já foi enviada cumprimentando o candidato e pedindo que ele se apresente. Responda a pergunta em Português, Brasil, sem misturar as línguas",
    },
    {
      role: "assistant",
      content:
        "Olá! Sou seu entrevistador virtual. Vamos começar nossa simulação de entrevista. Por favor, comece se apresentando brevemente e falando sobre sua formação e experiência profissional.",
    },
  ];

  displayInitialMessage();

  function displayInitialMessage() {
    const initialMessage = messages[1].content;

    const containerElement = $(
      '<div class="message-container bot-container"></div>',
    );

    const profilePic = $('<div class="profile-pic bot-pic"></div>');
    containerElement.append(profilePic);

    const messageElement = $('<div class="message bot-message"></div>').text(
      initialMessage,
    );
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

  function sendMessage() {
    const userMessage = userInput.val().trim();
    if (!userMessage) return;

    userInput.val("");

    addMessage(userMessage, "user");

    messages.push({
      role: "user",
      content: userMessage,
    });

    const typingContainerElement = $(
      '<div class="message-container bot-container"></div>',
    );
    const typingProfilePic = $('<div class="profile-pic bot-pic"></div>');
    const typingIndicator = $('<div class="message bot-message typing">').html(
      '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>',
    );

    typingContainerElement.append(typingProfilePic);
    typingContainerElement.append(typingIndicator);
    chatMessages.append(typingContainerElement);
    scrollToBottom();

    const chatRequest = {
      model: MODEL_NAME,
      messages: JSON.parse(JSON.stringify(messages)),
      temperature: 0.7,
      max_tokens: -1,
      stream: true,
    };

    const requestPayload = JSON.stringify(chatRequest);

    const responseContainerElement = $(
      '<div class="message-container bot-container" style="display:none;"></div>',
    );
    const responseProfilePic = $('<div class="profile-pic bot-pic"></div>');
    const responseMessageElement = $('<div class="message bot-message"></div>');

    responseContainerElement.append(responseProfilePic);
    responseContainerElement.append(responseMessageElement);
    chatMessages.append(responseContainerElement);
    scrollToBottom();

    let fullResponse = "";
    let isThinking = false; // Controla se estamos dentro de um bloco <think>

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

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        function processStream({ done, value }) {
          if (done) {
            typingContainerElement.remove();

            const processedResponse = fullResponse
              .replace(/<think>[\s\S]*?<\/think>/g, "")
              .replace(/<think>[\s\S]*/g, "")
              .trim();

            responseContainerElement.show();
            responseMessageElement.text(processedResponse);

            messages.push({
              role: "assistant",
              content: processedResponse,
            });
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          lines.forEach((line) => {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);

              if (data === "[DONE]") return;

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0]) {
                  const delta = parsed.choices[0].delta;
                  if (delta && delta.content) {
                    const content = delta.content;
                    fullResponse += content;

                    if (content.includes("<think>")) {
                      isThinking = true;
                    }

                    if (content.includes("</think>")) {
                      isThinking = false;
                      const processedResponse = fullResponse.replace(
                        /<think>[\s\S]*?<\/think>/g,
                        "",
                      );
                      responseMessageElement.text(processedResponse.trim());
                    }

                    if (!isThinking) {
                      typingContainerElement.remove();
                      responseContainerElement.show();
                      const processedResponse = fullResponse.replace(
                        /<think>[\s\S]*?<\/think>/g,
                        "",
                      );
                      responseMessageElement.text(processedResponse.trim());
                    }

                    scrollToBottom();
                  }
                }
              } catch (e) {
                throw new Error(
                  `Erro na comunicação com LM Studio: ${e.message}`,
                );
              }
            }
          });

          return reader.read().then(processStream);
        }

        const result_4 = await reader.read();
        return processStream(result_4);
      })
      .catch(() => {
        responseMessageElement.text(`Erro na comunicação com LM Studio`);
        addMessage(
          `Verifique se o LM Studio está rodando em http://${API_BASE}`,
          "bot",
        );
      });
  }

  function addMessage(text, sender) {
    if (sender === "bot") {
      text = text.replace(/<think>[\s\S]*?<\/think>/g, "");
      text = text.replace(/<think>[\s\S]*?done/g, "");
      text = text.replace(/<think>.*/, "");
      text = text.trim();
    }

    const containerElement = $(
      '<div class="message-container"></div>',
    ).addClass(`${sender}-container`);

    const profilePic = $('<div class="profile-pic"></div>').addClass(
      `${sender}-pic`,
    );
    containerElement.append(profilePic);

    const messageElement = $('<div class="message"></div>')
      .addClass(`${sender}-message`)
      .text(text);
    containerElement.append(messageElement);

    chatMessages.append(containerElement);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessages.scrollTop(chatMessages[0].scrollHeight);
  }
});
