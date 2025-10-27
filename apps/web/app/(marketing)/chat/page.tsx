import { withI18n } from '~/lib/i18n/with-i18n';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { ChatInterface } from '~/components/chat-interface';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: 'AI Chat Assistant',
    description:
      'Chat with our AI assistant powered by OpenAI and LangChain. Get instant answers and have natural conversations.',
  };
};

function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          AI Chat Assistant
        </h1>
        <p className="text-lg text-muted-foreground">
          Have a conversation with our intelligent AI assistant. Ask questions,
          get help, or just chat!
        </p>
      </div>

      <ChatInterface />

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>
          Powered by OpenAI GPT-3.5 Turbo and LangChain. Conversation history
          is stored securely for 24 hours.
        </p>
      </div>
    </div>
  );
}

export default withI18n(ChatPage);


