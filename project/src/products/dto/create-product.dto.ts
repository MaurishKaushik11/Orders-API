import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Latest Apple iPhone with advanced features' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 399900, description: 'Price in fils (1 AED = 100 fils)' })
  @IsInt()
  @Min(0)
  priceFils: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}