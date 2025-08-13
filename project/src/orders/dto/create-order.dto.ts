import { IsArray, IsUUID, IsInt, Min, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class OrderItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @ApiProperty({ 
    type: [OrderItemDto],
    example: [
      { productId: '123e4567-e89b-12d3-a456-426614174000', qty: 2 },
      { productId: '223e4567-e89b-12d3-a456-426614174001', qty: 1 }
    ]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}