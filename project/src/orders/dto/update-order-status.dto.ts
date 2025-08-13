import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ 
    enum: OrderStatus,
    example: OrderStatus.PAID,
    description: 'New status for the order'
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}