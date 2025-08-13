import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { OrderStatus, Role } from '@prisma/client';

interface OrderWithIdempotency {
  userId: string;
  items: any[];
  idempotencyKey?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly recentOrders = new Map<string, { timestamp: number; orderId: string }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    userId: string,
    idempotencyKey?: string,
  ) {
    // Check for idempotency
    if (idempotencyKey) {
      const cacheKey = `${userId}-${idempotencyKey}`;
      const recent = this.recentOrders.get(cacheKey);
      
      if (recent && Date.now() - recent.timestamp < 5000) {
        this.logger.log(`Duplicate order prevented for user ${userId}`);
        const existingOrder = await this.prisma.order.findUnique({
          where: { id: recent.orderId },
          include: { items: true },
        });
        return existingOrder;
      }
    }

    const { items } = createOrderDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Get product IDs
    const productIds = items.map(item => item.productId);
    const products = await this.productsService.findByIds(productIds);

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Create product map for easy lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate stock and calculate totals
    let totalFils = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      if (item.qty <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      if (product.stock < item.qty) {
        throw new BadRequestException(
          `Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${item.qty}`,
        );
      }

      const lineTotalFils = product.priceFils * item.qty;
      totalFils += lineTotalFils;

      orderItems.push({
        productId: item.productId,
        qty: item.qty,
        unitPriceFils: product.priceFils,
        lineTotalFils,
      });
    }

    // Create order with transaction to ensure consistency
    const order = await this.prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalFils,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  priceFils: true,
                },
              },
            },
          },
        },
      });

      // Decrement stock for each product
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.qty,
            },
          },
        });
      }

      return newOrder;
    });

    // Cache for idempotency
    if (idempotencyKey) {
      const cacheKey = `${userId}-${idempotencyKey}`;
      this.recentOrders.set(cacheKey, {
        timestamp: Date.now(),
        orderId: order.id,
      });

      // Clean up old entries after 10 seconds
      setTimeout(() => {
        this.recentOrders.delete(cacheKey);
      }, 10000);
    }

    this.logger.log(`Order created: ${order.id} for user ${userId}`);
    return order;
  }

  async findAll(paginationDto: PaginationDto, user: any) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where = user.role === Role.ADMIN ? {} : { userId: user.id };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  priceFils: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string, user: any) {
    const where = user.role === Role.ADMIN ? { id } : { id, userId: user.id };

    const order = await this.prisma.order.findUnique({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                description: true,
                priceFils: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    await this.findOne(id, { role: Role.ADMIN }); // Admin check

    const order = await this.prisma.order.update({
      where: { id },
      data: { status: updateOrderStatusDto.status },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                priceFils: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Order ${id} status updated to ${updateOrderStatusDto.status}`);
    return order;
  }
}