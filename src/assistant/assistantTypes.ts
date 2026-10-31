export type AssistantRole = 'user' | 'assistant';

export type AssistantMessage = {
  id: string;
  role: AssistantRole;
  text: string;
};

export type AssistantAction = {
  type: 'navigate' | 'demo_action';
  page?: string;
  operation?: string;
  intensity?: string;
  channel?: string;
  enabled?: boolean;
  link_id?: string;
};

export type AssistantChatResponse = {
  reply: string;
  tool_result?: Record<string, unknown> | null;
  requires_confirmation?: boolean;
  pending_action?: {
    id: string;
    tool_name: string;
    reason?: string;
    timestamp?: string;
  };
  frontend_action?: AssistantAction | null;
};

export type AssistantChatRequest = {
  message: string;
  page?: string;
  mode?: string;
  conversation?: AssistantMessage[];
};

export type AssistantConfirmationRequest = {
  action_id: string;
  confirmed: boolean;
};
