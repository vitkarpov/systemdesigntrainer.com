import { ApiProperty } from '@nestjs/swagger';
import { MessageRole } from '../types/session.types';

export class AddMessageDto {
  @ApiProperty({
    description: 'Message role',
    enum: ['user', 'interviewer', 'candidate'],
    example: 'candidate',
  })
  role: MessageRole;

  @ApiProperty({
    description: 'Message content',
    example: 'I would start by identifying the functional requirements...',
  })
  text: string;
}
