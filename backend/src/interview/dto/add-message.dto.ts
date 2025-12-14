import { MessageRole } from '../types/session.types';

export class AddMessageDto {
  role: MessageRole;
  text: string;
}
